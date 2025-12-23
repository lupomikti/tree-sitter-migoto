#include "tree_sitter/parser.h"

#include <wctype.h>

enum TokenType {
    NAMESPACE_RESOLUTION_START,
    NAMESPACE_RESOLUTION_CONTENT,
    NAMESPACE_RESOLUTION_END,
    ERROR_SENTINEL
};

void *tree_sitter_migoto_external_scanner_create() { return NULL; }

void tree_sitter_migoto_external_scanner_destroy(void *p) {}

unsigned tree_sitter_migoto_external_scanner_serialize(void *payload, char *buffer) { return 0; }

void tree_sitter_migoto_external_scanner_deserialize(void *p, const char *b, unsigned n) {}

static inline void advance(TSLexer *lexer) { lexer->advance(lexer, false); }

static inline void skip(TSLexer *lexer) { lexer->advance(lexer, true); }

static inline bool scan_namespace_res_start_end(TSLexer *lexer, unsigned position) {
    if (lexer->lookahead != '\\') {
        return false;
    }

    advance(lexer);
    lexer->result_symbol = position;
    return true;
}

static inline bool scan_namespace_res_content(TSLexer *lexer) {
    for (;;) {
        if (lexer->eof(lexer)) {
            return false;
        }

        if (lexer->lookahead == '$') {
            advance(lexer);
            if (lexer->lookahead != '\\') {
                continue;
            }
            else {
                return false;
            }
        }

        if (lexer->lookahead == '\\') {
            lexer->mark_end(lexer);
            advance(lexer);
            continue;
        }

        switch (lexer->lookahead) {
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
                advance(lexer);
                return true;        
            default:
                advance(lexer);
        }

    }
}

bool tree_sitter_migoto_external_scanner_scan(void *payload, TSLexer *lexer, const bool *valid_symbols) {
    if (valid_symbols[ERROR_SENTINEL]) {
        return false;
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