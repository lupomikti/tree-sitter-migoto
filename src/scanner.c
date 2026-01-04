#include "tree_sitter/parser.h"
#include "tree_sitter/alloc.h"
#include "tree_sitter/array.h"

#include <ctype.h>
#include <wctype.h>

#define strlwr _tolower_str

typedef enum {
    EXTERNAL_LINE,
    SECTION_HEADER_START,
    NAMESPACE_RESOLUTION_START,
    NAMESPACE_RESOLUTION_CONTENT,
    NAMESPACE_RESOLUTION_END,
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
    "textureoverride",
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
    "device",
    "stereo",
    "rendering",
    "hunting",
    "profile",
    "convergencemap",
    "resource",
    "key",
    "preset",
    "include",
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
        _Str[i] = tolower(_Str[i]);
        i++;
    }

    return _Str;
}

/// Determines if an element of search_arr is a substring of search_term
static inline bool is_terminating_section_name(const char *search_term, const char **search_arr)
{
    const char *lwr_term = strlwr(search_term);
    for(int i = 0; search_arr[i]; i++) {
        if(strstr(lwr_term, search_arr[i]) != NULL) {
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

    bool searching = false;

    if (!iswalpha(lexer->lookahead)) {
        return false;
    }
    else {
        searching = true;
    }

    while(searching) {
        array_push(&scanner->word, lexer->lookahead);
        consume(lexer);
        if (lexer->lookahead == ']' || lexer->lookahead == '\n') {
            searching = false;
        }
    }

    if (is_terminating_section_name(scanner->word.contents, SECTION_NAMES)) {
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
            // fprintf(stderr, "Lykare[LINE]: Next is the end of a line\n");
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
            // fprintf(stderr, "Lykare[LINE]: we have not seen text yet, but a comment start is next\n");
            // return zero-width true if this was looking for an external line
            // so the comment doesn't escape the whole section
            return valid_symbols[EXTERNAL_LINE];
        }
        else if (!saw_text && lexer->lookahead == '[') {
            // fprintf(stderr, "Lykare[LINE]: about to scan for a section header\n");
            lexer->mark_end(lexer); // tell the lexer to not add the next characters to the token
            if (scan_maybe_section_header(scanner, lexer, valid_symbols)) {
                // fprintf(stderr, "Lykare[LINE]: found a section header next\n");
                result = SECTION_HEADER_START;
                break;
            }

            // fprintf(stderr, "Lykare[LINE]: was not a section header, resuming line consumption\n");
            lexer->mark_end(lexer); // resume adding characters, adding in the ones consumed while scanning
            saw_text = true;
            consume(lexer);
        }
        else {
            // fprintf(stderr, "Lykare[LINE]: we have not seen a terminal, so check if we've seen text, then consume or skip\n");
            if (!is_wspace && !saw_text) {
                saw_text = true;
            }

            if (saw_text) consume(lexer);
            else { skip(lexer); }
        }
    }

    lexer->result_symbol = result;
    return valid_symbols[result];
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
            // fprintf(stderr, "Lykare[GEN]: entered general search branch\n");
            switch (lexer->lookahead)
            {
            case 'I':
            case 'i':
                // fprintf(stderr, "Lykare[GEN]: found an 'I' character, setting new search state\n");
                ss = INSSEARCH;
                array_push(&scanner->word, lexer->lookahead);
                consume(lexer);
                break;
            case 'P':
            case 'p':
                // fprintf(stderr, "Lykare[GEN]: found a 'P' character, setting new search state\n");
                ss = PATSEARCH;
                array_push(&scanner->word, lexer->lookahead);
                consume(lexer);
                break;
            default:
                // fprintf(stderr, "Lykare:[GEN] defaulting inside general search, returning to not searching state\n");
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

            // fprintf(stderr, "Lykare[INS/REP]: entered INS/REP search branch\n");

            switch (lexer->lookahead)
            {
            case ']':
            case '\n':
                // fprintf(stderr, "Lykare[INS/REP]: found terminal character\n");
                lexer->mark_end(lexer);

                array_push(&scanner->word, '\0'); // terminate the accumulated word

                strlwr(scanner->word.contents);
                // fprintf(stderr, "Lykare[INS/REP]: word is currently '%s' and search target is %s\n", scanner->word.contents, search_target);

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
                // fprintf(stderr, "Lykare[PAT]: found terminal character or period\n");
                lexer->mark_end(lexer);

                array_push(&scanner->word, '\0'); // terminate the accumulated word

                strlwr(scanner->word.contents);
                // fprintf(stderr, "Lykare[PAT]: word is currently '%s'\n", scanner->word.contents);
                // fprintf(stderr, "Lykare[PAT]: word after lowercasing is '%s'\n", tmp);
                
                if (!strcmp(scanner->word.contents, "pattern")) {
                    // fprintf(stderr, "Lykare[PAT]: word matched 'pattern', determining if replace search needed...\n");
                    if (lexer->lookahead == '.') {
                        // fprintf(stderr, "Lykare[PAT]: replace search needed, entering replace search state\n");
                        ss = REPSEARCH;
                        reset(scanner);
                        consume(lexer);
                    }
                    else {
                        // fprintf(stderr, "Lykare[PAT]: no replace search needed, checking that valid symbol is PATTERN...\n");
                        reset(scanner);
                        if (!valid_symbols[REGEX_PATTERN_HEADER]) {
                            // fprintf(stderr, "Lykare[PAT]: valid symbol was not PATTERN, returning false\n");
                            return false;
                        }
                        // fprintf(stderr, "Lykare[PAT]: setting result to pattern and returning true\n");
                        lexer->result_symbol = REGEX_PATTERN_HEADER;
                        return true;
                    }
                }
                else {
                    // fprintf(stderr, "Lykare[PAT]: word did not match 'pattern', returning to not searching state and setting result to commandlist\n");
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
                // fprintf(stderr, "Lykare[NOT]: found a terminal character, returning commandlist true\n");
                lexer->mark_end(lexer);
                lexer->result_symbol = REGEX_COMMANDLIST_HEADER;
                return true;
            case '.':
                // fprintf(stderr, "Lykare[NOT]: found a period, entering general search state\n");
                lexer->mark_end(lexer);
                ss = GENSEARCH;
                consume(lexer);
                break;
            default:
                // fprintf(stderr, "Lykare[NOT]: default consumption, continue\n");
                consume(lexer);
                break;
            }
            break;
        }
    }
}

bool tree_sitter_migoto_external_scanner_scan(void *payload, TSLexer *lexer, const bool *valid_symbols) {
    if (valid_symbols[ERROR_SENTINEL]) {
        // fprintf(stderr, "Lykare[ERR]: tree-sitter decided to enter an error state\n");
        return false;
    }

    Scanner *scanner = (Scanner*) payload;

    if (valid_symbols[REGEX_COMMANDLIST_HEADER] || valid_symbols[REGEX_DECLARATIONS_HEADER] ||
        valid_symbols[REGEX_PATTERN_HEADER] || valid_symbols[REGEX_REPLACE_HEADER])
    {
        // if (getenv("TREE_SITTER_DEBUG")) {
            // fprintf(stderr, "Lykare[START]: scanning for a valid regex header\n");
        // }
        return scan_for_regex_suffix(scanner, lexer, valid_symbols);
    }

    if (valid_symbols[EXTERNAL_LINE] || valid_symbols[SECTION_HEADER_START]) {
        // fprintf(stderr, "Lykare[START]: scanning an external line or checking for section header start\n");
        return scan_line(scanner, lexer, valid_symbols);
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

    return false;
}
