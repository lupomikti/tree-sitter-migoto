package tree_sitter_migoto_test

import (
	"testing"

	tree_sitter "github.com/tree-sitter/go-tree-sitter"
	tree_sitter_migoto "github.com/lupomikti/tree-sitter-migoto/bindings/go"
)

func TestCanLoadGrammar(t *testing.T) {
	language := tree_sitter.NewLanguage(tree_sitter_migoto.Language())
	if language == nil {
		t.Errorf("Error loading Migoto grammar")
	}
}
