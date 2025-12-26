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

    while (_Str[i] != L'\0') {
        _Str[i] = tolower(_Str[i]);
        i++;
    }

    return _Str;
}

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

static inline bool scan_line(Scanner *scanner, TSLexer *lexer) {
    bool search_flag = false;
    bool is_start = true;
    char *target;
    
    for (;;) {
        if (lexer->eof(lexer)) {
            lexer->result_symbol = EXTERNAL_LINE;
            reset(scanner);
            return true;
        }

        if (lexer->lookahead == '\n' && !search_flag) {
            is_start = false;
            lexer->mark_end(lexer);
            consume(lexer);
            if (lexer->lookahead == '[') {
                consume(lexer);
                if (!iswalpha(lexer->lookahead)) {
                    lexer->result_symbol = EXTERNAL_LINE;
                    reset(scanner);
                    return true;
                } else {
                    search_flag = true;
                }
            } else {
                lexer->result_symbol = EXTERNAL_LINE;
                reset(scanner);
                return true;
            }
        } else if (lexer->lookahead == '\n' && search_flag) {
            is_start = false;
            search_flag = false;
            lexer->result_symbol = EXTERNAL_LINE;
            reset(scanner);
            return true;
        } else if (search_flag) {
            if (lexer->lookahead != ']') {
                is_start = false;
                array_push(&scanner->word, lexer->lookahead);
                consume(lexer);
            } else {
                is_start = false;
                search_flag = false;
                target = scanner->word.contents;
                if (is_terminating_section_name(target, SECTION_NAMES)) {
                    lexer->result_symbol = SECTION_HEADER_START;
                    reset(scanner);
                    return true;
                }
            }
        } else {
            if (lexer->lookahead == '[' && is_start) {
                is_start = false;
                lexer->mark_end(lexer);
                consume(lexer);
                if (iswalpha(lexer->lookahead)) {
                    search_flag = true;
                }
            } else if (lexer->lookahead == ';' && is_start) {
                lexer->result_symbol = EXTERNAL_LINE;
                return false;
            }
            else {
                is_start = false;
                consume(lexer);
            }
        }
    }
}

static inline bool scan_for_regex_suffix(Scanner *scanner, TSLexer *lexer, const bool *valid_symbols) {
    SearchState ss = NOTSEARCHING;
    TokenType result;
    char *search_target;
    char *tmp;
    char c;

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
                c = lexer->lookahead;
                array_push(&scanner->word, c);
                consume(lexer);
                break;
            case 'P':
            case 'p':
                ss = PATSEARCH;
                c = lexer->lookahead;
                array_push(&scanner->word, c);
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

                tmp = strlwr(scanner->word.contents);

                if (!strcmp(tmp, search_target)) {
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
                c = lexer->lookahead;
                array_push(&scanner->word, c);
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

                tmp = strlwr(scanner->word.contents);
                
                if (!strcmp(tmp, "pattern")) {
                    if (lexer->lookahead == '.') {
                        ss = REPSEARCH;
                        reset(scanner);
                        consume(lexer);
                    }
                    else {
                        reset(scanner);
                        if (!valid_symbols[REGEX_PATTERN_HEADER]) return false;
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
                c = lexer->lookahead;
                array_push(&scanner->word, c);
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

    Scanner *scanner = (Scanner*) payload;

    if (valid_symbols[REGEX_COMMANDLIST_HEADER] || valid_symbols[REGEX_DECLARATIONS_HEADER] ||
        valid_symbols[REGEX_PATTERN_HEADER] || valid_symbols[REGEX_REPLACE_HEADER]) {
        return scan_for_regex_suffix(scanner, lexer, valid_symbols);
    }

    if (valid_symbols[EXTERNAL_LINE] || valid_symbols[SECTION_HEADER_START]) {
        return scan_line(scanner, lexer);
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
