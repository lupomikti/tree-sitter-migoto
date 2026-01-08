#include "tree_sitter/parser.h"
#include "tree_sitter/alloc.h"
#include "tree_sitter/array.h"

#include <ctype.h>
#include <wctype.h>
#include <string.h>

#define strlwr _tolower_str

typedef enum {
    EXTERNAL_LINE,
    SECTION_HEADER_START,
    NAMESPACE_RESOLUTION_START,
    NAMESPACE_RESOLUTION_CONTENT,
    NAMESPACE_RESOLUTION_END,
    SUFFIXED_KEY_HEADER,
    SUFFIXED_PRESET_HEADER,
    // Resource[^\]]+
    SUFFIXED_RESOURCE_HEADER,
    // Include[^\]]*
    SUFFIXED_INCLUDE_HEADER,
    // (?:ShaderOverride|TextureOverride|(?:BuiltIn)?(?:CommandList|CustomShader))[^\]]+
    SUFFIXED_COMMANDLIST_HEADER,
    REGEX_COMMANDLIST_HEADER,
    REGEX_DECLARATIONS_HEADER,
    REGEX_PATTERN_HEADER,
    REGEX_REPLACE_HEADER,
    NEWLINE,
    ERROR_SENTINEL,
} TokenType;

const char *SECTION_NAMES[] = {
    "shaderoverride",
    "shaderregex",
    "customshader",
    "commandlist",
    "builtincustomshader",
    "builtincommandlist",
    "present",
    "clearrendertargetview",
    "cleardepthstencilview",
    "clearunorderedaccessviewuint",
    "clearunorderedaccessviewfloat",
    "constants",
    "logging",
    "system",
    "stereo",
    "rendering",
    "profile",
    "convergencemap",
    "resource",
    "preset",
    "loader",
    0
};

typedef enum {
    NOTSEARCHING,
    GENSEARCH = 4,
    INSSEARCH,
    PATSEARCH,
    REPSEARCH,
} SearchState;

typedef Array(char) String;

typedef struct {
    String word;
} Scanner;

static inline void reset(Scanner *scanner) {
    array_delete(&scanner->word);
    array_init(&scanner->word);
}

void *tree_sitter_migoto_external_scanner_create() {
    Scanner *scanner = ts_calloc(1, sizeof(Scanner));
    array_reserve(&scanner->word, 256);
    return scanner;
}

void tree_sitter_migoto_external_scanner_destroy(void *payload) {
    Scanner *scanner = (Scanner*) payload;
    array_delete(&scanner->word);
    ts_free(scanner);
}

unsigned tree_sitter_migoto_external_scanner_serialize(void *payload, char *buffer) {
    unsigned size = 0;
    Scanner *scanner = (Scanner*) payload;

    if (scanner->word.size * sizeof(char) + 1 >= TREE_SITTER_SERIALIZATION_BUFFER_SIZE) {
        return 0;
    }

    buffer[size++] = (char) scanner->word.size;
    memcpy(&buffer[size], scanner->word.contents, scanner->word.size);
    size += scanner->word.size;
    return size;
}

void tree_sitter_migoto_external_scanner_deserialize(void *payload, const char *buffer, unsigned length) {
    unsigned size = 0;
    Scanner *scanner = (Scanner*) payload;

    reset(scanner);

    if (length == 0) return;

    scanner->word = (String)array_new();
    uint8_t word_length = buffer[size++];
    array_reserve(&scanner->word, word_length);
    memcpy(scanner->word.contents, &buffer[size], word_length);
    scanner->word.size = word_length;
    size += word_length;
    
    assert(size == length);
}

static inline void consume(TSLexer *lexer) { lexer->advance(lexer, false); }

static inline void skip(TSLexer *lexer) { lexer->advance(lexer, true); }

/// Lowercase a string
static inline char *_tolower_str(char *_Str) {
    size_t i = 0;

    while (_Str[i] != '\0') {
        _Str[i] = towlower(_Str[i]);
        i++;
    }

    return _Str;
}

/// Determines if search_term exactly matches one of the section names in search_arr
static inline bool is_terminating_section_name(char *search_term, const char **search_arr) {
    const char *lwr_term = strlwr(search_term);
    for(int i = 0; search_arr[i]; i++) {
        if(!strcmp(lwr_term, search_arr[i])) {
            return true;
        }
    }
    return false;
}

static inline bool scan_end_of_line(TSLexer *lexer) {
    bool found_end_of_line = false;

    for (;;) {
        if (lexer->lookahead == '\n') {
            found_end_of_line = true;
            skip(lexer);
        }
        else if (iswspace(lexer->lookahead) && lexer->lookahead != '\n') {
            skip(lexer);
        }
        else if (lexer->eof(lexer)) {
            found_end_of_line = true;
            break;
        }
        else {
            break;
        }
    }

    if (found_end_of_line) {
        lexer->result_symbol = NEWLINE;
        return true;
    }

    return false;
}

static inline bool scan_namespace_res_start_end(TSLexer *lexer, unsigned position) {
    if (lexer->lookahead != '\\') {
        return false;
    }

    consume(lexer);
    lexer->result_symbol = position;
    return true;
}

static inline bool scan_namespace_res_content(TSLexer *lexer) {
    for (;;) {
        if (lexer->eof(lexer)) {
            return false;
        }

        switch (lexer->lookahead) {
        case '$':
            consume(lexer);
            if (lexer->lookahead != '\\')
                continue;
            else
                return false;
            break;
        case '\\':
            lexer->mark_end(lexer);
            consume(lexer);
            break;
        case '=':
        case '&':
        case '|':
        case '+':
        case '-':
        case '/':
        case '*':
        case '<':
        case '>':
        case '%':
        case '!':
        case '\n':
            lexer->result_symbol = NAMESPACE_RESOLUTION_CONTENT;
            consume(lexer);
            return true;        
        default:
            consume(lexer);
            break;
        }
    }
}

static inline bool scan_maybe_section_header(Scanner *scanner, TSLexer *lexer, const bool *valid_symbols) {
    consume(lexer); // consume the '[' that starts

    // consume all the leading whitespace
    while (iswspace(lexer->lookahead) && lexer->lookahead != ']' && lexer->lookahead != '\n' && !lexer->eof(lexer)) {
        consume(lexer);
    }

    // if after consuming whitespace we're at a terminal or eof, return false
    if (lexer->lookahead == ']' || lexer->lookahead == '\n' || lexer->eof(lexer)) {
        return false;
    }

    // if instead the next character is not alphabetical, return false
    // if it is alphabetical, but not the first character of a section name, return false
    // otherwise we can start searching
    if (!iswalpha(lexer->lookahead)) {
        return false;
    }
    // would love to just use strchr here, but wasm doesn't have support for it
    else if (memchr("stcbplrhki", towlower(lexer->lookahead), 11)) {
        return false;
    }

    uint8_t search_length = 0;
    char *target_term; // undefined

    // choose the search length or set target term based on first character
    switch (towlower(lexer->lookahead)) {
    case 's':
        search_length = 14;
        break;
    case 't':
        target_term = "textureoverride";
        search_length = 15;
        break;
    case 'c':
        search_length = 29;
        break;
    case 'b':
        search_length = 19;
        break;
    case 'p':
    case 'l':
        search_length = 7;
        break;
    case 'd':
        target_term = "device";
        search_length = 6;
        break;
    case 'r':
        search_length = 9;
        break;
    case 'h':
        target_term = "hunting";
        search_length = 7;
        break;
    case 'k':
        target_term = "key";
        search_length = 3;
        break;
    case 'i':
        target_term = "include";
        search_length = 7;
        break;
    default:
        return false;
    }

    char lookahead = lexer->lookahead;

    do {
        array_push(&scanner->word, lookahead);
        consume(lexer);
        lookahead = lexer->lookahead;

        // if we hit whitespace or non-alphabetical before collecting the correct number of characters
        // if we see a terminal before collecting the correct number of characters
        if (iswspace(lookahead) || !iswalpha(lookahead) ||
            lookahead == ']' || lookahead == '\n' || lexer->eof(lexer))
        {
            return false;
        }
    } while (scanner->word.size < search_length);

    array_push(&scanner->word, '\0'); // NUL term char array before comparison

    if ((target_term && !strcmp(strlwr(scanner->word.contents), target_term)) ||
        is_terminating_section_name(scanner->word.contents, SECTION_NAMES))
    {
        reset(scanner);
        return true;
    }

    return false;
}

static inline bool scan_line(Scanner *scanner, TSLexer *lexer, const bool *valid_symbols) {    
    bool saw_text = false;
    TokenType result = ERROR_SENTINEL;

    // IF we see any non-whitespace text before a newline
    // OR we see only non-newline whitespace text before a newline
    // THEN we will return true for EXTERNAL_LINE,
    //      with a zero-width token for the 2nd case
    // IF we see a '[' and saw_text is false
    // THEN we need to check if the line contains a valid section header
    // IF the line contains a valid section header
    // THEN we will return true for SECTION_HEADER_START with a zero-width token

    while (!lexer->eof(lexer)) {
        bool is_wspace = iswspace(lexer->lookahead);
        if (lexer->lookahead == '\r' || lexer->lookahead == '\n') {
            result = EXTERNAL_LINE;
            if (saw_text) {
                lexer->mark_end(lexer);
                break;
            }
            else {
                lexer->result_symbol = result;
                return false;
            }
        }
        else if (!saw_text && lexer->lookahead == ';') {
            // if we haven't seen any text yet, the first we see is a semicolon
            // this is not an external line, it's a comment

            // return zero-width true if this was looking for an external line
            // so the comment doesn't escape the whole section
            return valid_symbols[EXTERNAL_LINE];
        }
        else if (!saw_text && lexer->lookahead == '[') {
            lexer->mark_end(lexer); // tell the lexer to not add the next characters to the token
            if (scan_maybe_section_header(scanner, lexer, valid_symbols)) {
                result = SECTION_HEADER_START;
                break;
            }

            lexer->mark_end(lexer); // resume adding characters, adding in the ones consumed while scanning
            saw_text = true;
            consume(lexer);
        }
        else {
            if (!is_wspace && !saw_text) {
                saw_text = true;
            }

            if (saw_text) {
                consume(lexer);
            }
            else {
                skip(lexer);
            }
        }
    }

    lexer->result_symbol = result;
    return valid_symbols[result];
}

static inline bool scan_suffixed_section_header(TSLexer *lexer, TokenType current_symbol , const bool *valid_symbols) {
    bool saw_text = false, on_ws = true, is_start = true, not_error = (current_symbol != ERROR_SENTINEL);
    for (;;) {
        if (lexer->lookahead == ']' || lexer->lookahead == '\r' || lexer->lookahead == '\n' || lexer->eof(lexer)) {
            if (not_error) lexer->result_symbol = current_symbol;

            // if we see a terminal but have not seen any text yet
            // only the Include header can be valid, as it is the only one allowed a null suffix
            if (!saw_text) {
                return (not_error && valid_symbols[SUFFIXED_INCLUDE_HEADER]);
            }

            return not_error; // return captured text excluding the trailing whitespace
        }
        else if (iswspace(lexer->lookahead)) {
            if (is_start) is_start = false;
            if (!on_ws) {
                on_ws = true;
                if (saw_text) {
                    lexer->mark_end(lexer);
                }
            }
            consume(lexer);
        }
        else {
            if (on_ws) {
                on_ws = false;
                if (!saw_text) {
                    saw_text = true;
                    if (is_start) {
                        consume(lexer);
                        is_start = false;
                        continue;
                    }
                    lexer->mark_end(lexer); // mark all leading whitespace as part of the token
                }
            }
            consume(lexer);
        }
    }
}

static inline bool scan_for_regex_suffix(Scanner *scanner, TSLexer *lexer, const bool *valid_symbols) {
    SearchState ss = NOTSEARCHING;
    TokenType result;
    char *search_target;

    for (;;) {
        if (lexer->eof(lexer)) {
            lexer->mark_end(lexer);
            lexer->result_symbol = REGEX_COMMANDLIST_HEADER;
            reset(scanner);
            return true;
        }
        switch (ss)
        {
        case GENSEARCH:
            switch (lexer->lookahead)
            {
            case 'I':
            case 'i':
                ss = INSSEARCH;
                array_push(&scanner->word, lexer->lookahead);
                consume(lexer);
                break;
            case 'P':
            case 'p':
                ss = PATSEARCH;
                array_push(&scanner->word, lexer->lookahead);
                consume(lexer);
                break;
            default:
                ss = NOTSEARCHING;
                consume(lexer);
                break;
            }
            break;
        case INSSEARCH:
        case REPSEARCH:
            if (ss & 0x2) {
                search_target = "replace";
                result = REGEX_REPLACE_HEADER;
            }
            else {
                search_target = "insertdeclarations";
                result = REGEX_DECLARATIONS_HEADER;
            }


            switch (lexer->lookahead)
            {
            case ']':
            case '\n':
                lexer->mark_end(lexer);

                array_push(&scanner->word, '\0'); // terminate the accumulated word

                strlwr(scanner->word.contents);

                if (!strcmp(scanner->word.contents, search_target)) {
                    reset(scanner);
                    if (!valid_symbols[result]) return false;
                    lexer->result_symbol = result;
                    return true;
                }

                ss = NOTSEARCHING;
                reset(scanner);
                break;
            case '.':
                lexer->mark_end(lexer);
                ss = NOTSEARCHING;
                reset(scanner);
                break;
            default:
                array_push(&scanner->word, lexer->lookahead);
                consume(lexer);
                break;
            }
            break;
        case PATSEARCH:
            switch (lexer->lookahead)
            {
            case '.':
            case ']':
            case '\n':
                lexer->mark_end(lexer);

                array_push(&scanner->word, '\0'); // terminate the accumulated word

                strlwr(scanner->word.contents);
                
                if (!strcmp(scanner->word.contents, "pattern")) {
                    if (lexer->lookahead == '.') {
                        ss = REPSEARCH;
                        reset(scanner);
                        consume(lexer);
                    }
                    else {
                        reset(scanner);
                        if (!valid_symbols[REGEX_PATTERN_HEADER]) {
                            return false;
                        }
                        lexer->result_symbol = REGEX_PATTERN_HEADER;
                        return true;
                    }
                }
                else {
                    lexer->result_symbol = REGEX_COMMANDLIST_HEADER;
                    ss = NOTSEARCHING;
                    reset(scanner);
                }
                break;
            default:
                array_push(&scanner->word, lexer->lookahead);
                consume(lexer);
                break;
            }
            break;
        case NOTSEARCHING:
        default:
            switch (lexer->lookahead)
            {
            case ']':
            case '\n':
                lexer->mark_end(lexer);
                lexer->result_symbol = REGEX_COMMANDLIST_HEADER;
                return true;
            case '.':
                lexer->mark_end(lexer);
                ss = GENSEARCH;
                consume(lexer);
                break;
            default:
                consume(lexer);
                break;
            }
            break;
        }
    }
}

bool tree_sitter_migoto_external_scanner_scan(void *payload, TSLexer *lexer, const bool *valid_symbols) {
    if (valid_symbols[ERROR_SENTINEL]) {
        return false;
    }

    if (valid_symbols[NEWLINE]) {
        return scan_end_of_line(lexer);
    }

    if (valid_symbols[NAMESPACE_RESOLUTION_START]) {
        return scan_namespace_res_start_end(lexer, NAMESPACE_RESOLUTION_START);
    }

    if (valid_symbols[NAMESPACE_RESOLUTION_CONTENT]) {
        return scan_namespace_res_content(lexer);
    }

    if (valid_symbols[NAMESPACE_RESOLUTION_END]) {
        return scan_namespace_res_start_end(lexer, NAMESPACE_RESOLUTION_END);
    }

    if (valid_symbols[SUFFIXED_KEY_HEADER] || valid_symbols[SUFFIXED_PRESET_HEADER] ||
        valid_symbols[SUFFIXED_RESOURCE_HEADER] || valid_symbols[SUFFIXED_INCLUDE_HEADER] ||
        valid_symbols[SUFFIXED_COMMANDLIST_HEADER])
    {
        TokenType t = ERROR_SENTINEL;

        if (valid_symbols[SUFFIXED_KEY_HEADER])
            t = SUFFIXED_KEY_HEADER;
        else if (valid_symbols[SUFFIXED_PRESET_HEADER])
            t = SUFFIXED_PRESET_HEADER;
        else if (valid_symbols[SUFFIXED_RESOURCE_HEADER])
            t = SUFFIXED_RESOURCE_HEADER;
        else if (valid_symbols[SUFFIXED_INCLUDE_HEADER])
            t = SUFFIXED_INCLUDE_HEADER;
        else if (valid_symbols[SUFFIXED_COMMANDLIST_HEADER])
            t = SUFFIXED_COMMANDLIST_HEADER;

        return scan_suffixed_section_header(lexer, t, valid_symbols);
    }

    Scanner *scanner = (Scanner*) payload;

    if (valid_symbols[REGEX_COMMANDLIST_HEADER] || valid_symbols[REGEX_DECLARATIONS_HEADER] ||
        valid_symbols[REGEX_PATTERN_HEADER] || valid_symbols[REGEX_REPLACE_HEADER])
    {
        return scan_for_regex_suffix(scanner, lexer, valid_symbols);
    }

    if (valid_symbols[EXTERNAL_LINE] || valid_symbols[SECTION_HEADER_START]) {
        return scan_line(scanner, lexer, valid_symbols);
    }

    return false;
}
