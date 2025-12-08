/**
 * @file tree-sitter grammar for the DSL of the INI files used by 3Dmigoto
 * @author LupoMikti lykare@proton.me
 * @author AGMG
 * @license MIT
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

const PREC = {
  OR: 1, // ||
  AND: 2, // &&
  COMPARE: 3, // < > <= >= != == !== ===
  BIT_OR: 4, // @not-implemented
  BIT_NOT: 5, // @not-implemented
  BIT_AND: 6, // @not-implemented
  BIT_SHIFT: 7, // @not-implemented
  CONCAT: 8, // @not-implemented
  PLUS: 9, // + -
  MULTI: 10, // * / // %
  UNARY: 11, // ! - +
  POWER: 12, // **
}

const newline = /\r?\n/
const custom_section_name = /[^\-+*/&% !>|<=$\r\n]+/i
const namespace_regex = /[^>\\|/<?:*=$\r\n]+(?:[\\/][^>\\|/<?:*=$\r\n]+)*/i

module.exports = grammar({
  name: "migoto",

  extras: $ => [$.comment, $._blank, /[ \t]/],

  // supertypes: $ => [$.statement, $.expression, $.declaration, $.variable],

  // word: $ => $.identifier,

  rules: {
    document: $ => seq(
      repeat(newline), // consume blank lines at the start of the document
      optional($._preamble),
      repeat($._section)
    ),

    _preamble: $ => choice(
      $.namespace_declaration,
      $.conditional_include_statement,
      seq($.namespace_declaration,$.conditional_include_statement),
      seq($.conditional_include_statement,$.namespace_declaration)
    ),

    namespace_declaration: $ => seq(
      alias('namespace', $.namespace_key),
      '=',
      optional(alias(namespace_regex, $.namespace)),
      newline
    ),

    conditional_include_statement: $ => seq(
      alias('condition', $.condition_key),
      '=',
      // $.static_operational_expression, // TODO
      newline
    ),

    _section: $ => choice(
      $._special_section,
      // $._setting_section, // TODO
      // $._command_list_section // TODO
    ),

    _special_section: $ => choice(
      $.constants_section,
      // $.key_section, // TODO
      // $.preset_section, // TODO
      // $._shader_regex_section // TODO
    ),

    constants_section: $ => seq(
      field('header', alias("[Constants]", $.constants_header)),
      newline,
      $._constants_body
    ),

    _constants_body: $ => repeat1(choice(
      $.global_declaration,
      // $.primary_statement // TODO
    )),

    // global [persist] NamedVar ['=' StaticValue]
    // [presist] global NamedVar ['=' StaticValue]
    global_declaration: $ => choice(
        field('global_declaration', alias($._global_declaration, $.variable_declaration)),
        field('persistant_declaration', alias($._global_persist_declaration, $.variable_declaration))
      ),

    _global_declaration: $ => seq(
      'global',
      choice(
        field('variable', $._named_variable),
        alias($._global_initialisation, $.assignment_statement)
      )
    ),

    _global_persist_declaration: $ => seq(
      choice(seq('global','persist'), seq('persist','global')),
      choice(
        field('variable', $._named_variable),
        alias($._global_initialisation, $.assignment_statement)
      )
    ),

    _global_initialisation: $ => seq(
      field('variable', $._named_variable),
      '=',
      field('right', $.string) // TODO: will actually just be $._static_value
    ),

    local_declaration: $ => seq(
      'local',
      field('variable', $._named_variable)
    ),

    local_initialisation: $ => seq(
      field('left', $.local_declaration),
      '=',
      field('right',$.string) // TODO: will actually just be $._operational_expression
    ),

    _instruction: $ => choice($.general_instruction, $.draw_instruction),
    general_instruction: _ => /(?:run|checktextureoverride|(?:exclude_)?preset|handling|reset_per_frame_limits|clear|direct_mode_eye|analyse_options|dump|special|store)/i,
    draw_instruction: _ => /(?:draw(?:indexed|instanced|indexedinstanced|instancedindirect|indexedinstancedindirect)?|dispatch(?:indirect)?)/i,

    identifier: $ => choice(
      // resource operands
      $._language_variable,
      $.ini_parameter,
      $.resource_identifier,
      $.custom_resource,
      // normal operands
      $.override_parameter,
      $._named_variable,
      $._callable_section
    ),

    _language_variable: $ => choice(
      alias(/(?:[vhdgpc]s-cb\d{1,2}|vb\d|ib|(?:[rf]_)?bb)/i, $.buffer_variable),
      alias(/(?:[pc]s-u\d|s?o\d|od|[vhdgpc]s(?:-t\d{1,3})?)/i, $.shader_variable)
    ),
    resource_identifier: _ => /(?:this|(?:ini|stereo)params|cursor_(?:mask|color))/i,
    custom_resource: $ => seq(
      alias(/Resource/i, $.resource_prefix),
      token.immediate($._useable_section_identifier)
    ),

    _named_variable: $ => seq(
      '$',
      token.immediate(seq(
        optional(token(seq('\\', token.immediate(alias(namespace_regex, $.namespace)), token.immediate('\\')))),
        /[a-z_]\w+|[a-z]/i
      ))
    ),

    ini_parameter: _ => token.immediate(/[xyzw]\d{0,3}/i),

    override_parameter: _ => new RustRegex(`(?xi)(
      (?:rt|res|window)_(?:width|height) | (?:vertex|index|instance)_count | first_(?:vertex|index|instance) |
      thread_group_count_[xyz] | indirect_offset | draw_type | cursor_(?: showing | (?:screen_|window_|hotspot_)?[xy] ) |
      time | hunting | sli | frame_analysis | effective_dpi | (?:raw_|eye_)?separation | convergence |
      stereo_(?:active|available) | scissor_(?:left|top|right|bottom) )`),
    
    _callable_section: $ => seq(
      alias(/(?:BuiltIn)?(?:CommandList|CustomShader)/i, $.callable_prefix),
      token.immediate($._useable_section_identifier)
    ),

    _useable_section_identifier: $ => seq(
      optional(token(seq('\\', token.immediate(alias(namespace_regex,$.namespace)), token.immediate('\\')))),
      alias(custom_section_name, $.section_identifier)
    ),

    string: _ => seq(
      '"',
      token.immediate(repeat(/[^\x00-\x08\x0a-\x1f\x22\x5c\x7f]/)),
      token.immediate('"')
    ),

    comment: $ => token(seq(
      field('start', ';'),
      field('content', alias(/[^\r\n]*/, $.comment_content)),
      newline
    )),

    _blank: _ => field('blank', newline)
  }
});
