/**
 * @file DSL for the INI files used by 3Dmigoto
 * @author AGMG
 * @license MIT
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

module.exports = grammar({
  name: "migoto",

  rules: {
    // TODO: add the actual grammar rules
    source_file: $ => "hello"
  }
});
