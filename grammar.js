/**
 * @file tree-sitter grammar for the DSL of the INI files used by 3Dmigoto
 * @author LupoMikti lykare@proton.me
 * @author AGMG
 * @license MIT
 */

/// <reference types='tree-sitter-cli/dsl' />
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
const path_regex = /(?:(?:(?:[a-z]:|\.\.?)[\\\/])?(?:\.\.|[^>\\|\/<?:*=$\r\n]+)(?:(?:\\|\/)(?:\.\.|[^>\\|\/<?:*=$\r\n]+))+)/i
const file_regex = /[^>\\|/<?:*=$\r\n]+\.[a-z0-9\-]+/i

const custom_shader_key_values = new RustRegex(`(?xi)(
  front|back|wireframe|solid|
  undefined|(point|line|triangle)_list|(line|triangle)_strip|(line|triangle)_(list|strip)_adj|[123]?\d_control_point_patch_list|
  debug|skip_(validation|optimization)|pack_matrix_(row_major|column_major)|partial_precision|force_[vp]s_software_no_opt|no_preshader|(avoid|prefer)_flow_control|enable_(strictness|backwards_compatibility|unbounded_descriptor_tables)|ieee_strictness|optimization_level[0123]|warnings_are_errors|resources_may_alias|all_resources_bound
)`)

const resource_key_values = new RustRegex(`(?xi)(
  auto|stereo|
  (?:RW)?(?:Append|Consume)?StructuredBuffer|(?:RW)?(?:ByteAddress)?Buffer|(?:RW)?Texture[123]D|TextureCube|
  (?:vertex|index|constant)_buffer|shader_resource|stream_output|render_target|unordered_access|decoder|video_encoder|
  texturecube|generate_mips|shared|drawindirect_args|buffer_(?:allow_raw_views|structured)|resource_clamp|shared_(?:keymutex|nthandle)|gdi_compatible|restricted_content|restrict_shared_resource(?:_driver)?|guarded|tile_pool|tiled|hw_protected
)`)

const dxgi_types_regex = new RustRegex(`(?xi)(?:DXGI_FORMAT_)?(UNKNOWN|R32G32B32A32_TYPELESS|R32G32B32A32_FLOAT|R32G32B32A32_UINT|R32G32B32A32_SINT|R32G32B32_TYPELESS|R32G32B32_FLOAT|R32G32B32_UINT|R32G32B32_SINT|R16G16B16A16_TYPELESS|R16G16B16A16_FLOAT|R16G16B16A16_UNORM|R16G16B16A16_UINT|R16G16B16A16_SNORM|R16G16B16A16_SINT
|R32G32_TYPELESS|R32G32_FLOAT|R32G32_UINT|R32G32_SINT|R32G8X24_TYPELESS|D32_FLOAT_S8X24_UINT|R32_FLOAT_X8X24_TYPELESS|X32_TYPELESS_G8X24_UINT|R10G10B10A2_TYPELESS|R10G10B10A2_UNORM|R10G10B10A2_UINT|R11G11B10_FLOAT|R8G8B8A8_TYPELESS|R8G8B8A8_UNORM|R8G8B8A8_UNORM_SRGB
|R8G8B8A8_UINT|R8G8B8A8_SNORM|R8G8B8A8_SINT|R16G16_TYPELESS|R16G16_FLOAT|R16G16_UNORM|R16G16_UINT|R16G16_SNORM|R16G16_SINT|R32_TYPELESS|D32_FLOAT|R32_FLOAT|R32_UINT|R32_SINT|R24G8_TYPELESS|D24_UNORM_S8_UINT|R24_UNORM_X8_TYPELESS|X24_TYPELESS_G8_UINT|R8G8_TYPELESS
|R8G8_UNORM|R8G8_UINT|R8G8_SNORM|R8G8_SINT|R16_TYPELESS|R16_FLOAT|D16_UNORM|R16_UNORM|R16_UINT|R16_SNORM|R16_SINT|R8_TYPELESS|R8_UNORM|R8_UINT|R8_SNORM|R8_SINT|A8_UNORM|R1_UNORM|R9G9B9E5_SHAREDEXP|R8G8_B8G8_UNORM|G8R8_G8B8_UNORM|BC1_TYPELESS|BC1_UNORM|BC1_UNORM_SRGB
|BC2_TYPELESS|BC2_UNORM|BC2_UNORM_SRGB|BC3_TYPELESS|BC3_UNORM|BC3_UNORM_SRGB|BC4_TYPELESS|BC4_UNORM|BC4_SNORM|BC5_TYPELESS|BC5_UNORM|BC5_SNORM|B5G6R5_UNORM|B5G5R5A1_UNORM|B8G8R8A8_UNORM|B8G8R8X8_UNORM|R10G10B10_XR_BIAS_A2_UNORM|B8G8R8A8_TYPELESS|B8G8R8A8_UNORM_SRGB
|B8G8R8X8_TYPELESS|B8G8R8X8_UNORM_SRGB|BC6H_TYPELESS|BC6H_UF16|BC6H_SF16|BC7_TYPELESS|BC7_UNORM|BC7_UNORM_SRGB|AYUV|Y410|Y416|NV12|P010|P016|420_OPAQUE|YUY2|Y210|Y216|NV11|AI44|IA44|P8|A8P8|B4G4R4A4_UNORM)`)

/**
 * 
 * @param {string|RegExp} builtin_name 
 * @returns {SeqRule}
 */
const _create_section_header = (builtin_name) => seq(
  '[',
  token.immediate(builtin_name),
  optional(']')
)

/**
 * 
 * @param {GrammarSymbols<any>} $ 
 * @returns {SeqRule}
 */
const useable_section_identifier_rule = $ => seq(
  optional(token(seq('\\', token.immediate(alias(namespace_regex, $.namespace)), token.immediate('\\')))),
  alias(custom_section_name, $.section_identifier)
)

// from tree-sitter-lua
/**
 * 
 * @param {Rule} rule 
 * @param {string} separator 
 * @param {boolean} trailing_separator 
 * @returns {SeqRule}
 */
const list_seq = (rule, separator, trailing_separator = false) =>
  trailing_separator
    ? seq(rule, repeat(seq(separator, rule)), optional(separator))
    : seq(rule, repeat(seq(separator, rule)));

module.exports = grammar({
  name: 'migoto',

  extras: $ => [$.comment, $._blank, /[ \t]/],

  supertypes: $ => [$.section, $.primary_statement],

  // word: $ => $.identifier,

  rules: {
    document: $ => seq(
      repeat(newline), // consume blank lines at the start of the document
      optional($._preamble),
      repeat($.section)
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

    section: $ => choice(
      $._special_section,
      $.setting_section,
      // $._command_list_section // TODO
    ),

    _special_section: $ => choice(
      $.constants_section,
      // $.key_section, // TODO
      // $.preset_section, // TODO
      // $._shader_regex_section // TODO
    ),

    constants_header: _ => _create_section_header('Constants'),

    constants_section: $ => seq(
      field('header', $.constants_header),
      newline,
      repeat(choice(
        $.global_declaration,
        $.primary_statement
      ))
    ),

    setting_section_header: _ => _create_section_header(
      /(Logging|System|Device|Stereo|Rendering|Hunting|Profile|ConvergenceMap|Loader|Resource.+|Include.*)/i
    ),

    setting_section: $ => seq(
      field('header', $.setting_section_header),
      newline,
      repeat($.setting_statement)
    ),

    setting_statement: $ => seq(
      field('key', $.setting_section_key),
      '=',
      field('value', $.setting_section_value),
      newline
    ),

    // no, apparently I cannot use \w{2,} it causes an error
    setting_section_key: _ => /\w\w+/i,

    setting_section_value: $ => repeat1(
      choice(
        field('fixed_value', $.fixed_key_value),
        $.frame_analysis_option,
        $.boolean_value,
        'null',
        $.string,
        $.path_value,
        $.numeric_constant,
        $.fuzzy_match_expression,
        $.free_text
      )
    ),

    fixed_key_value: $ => choice(
      alias('mono', $.multi_key_value),
      alias(/(none|overrule|depth_(?:(?:in)?active))/i, $.override_key_value),
      alias(custom_shader_key_values, $.custom_shader_key_value),
      alias(/(default|immutable|dynamic|staging)/i, $.fuzzy_match_key_value),
      alias(resource_key_values, $.resource_key_value),
      alias(dxgi_types_regex, $.resource_type),
      alias(/(add|(?:rev_)?subtract|min|max|disable)/i, $.blend_operator),
      alias(/(zero|one|(?:inv_)?(?:src1?|dest)_(?:color|alpha)|src_alpha_sat|(?:inv_)?blend_factor)/i, $.blend_factor),
      alias(/(deferred_contexts|(?:immediate_)?context|device|all|recommended|except_set_(?:shader_resources|sampler|rasterizer_state)|skip_dxgi_(?:factory|device))/i, $.system_key_value),
      alias(/(depth_stencil|swap_chain)/i, $.device_key_value),
      alias(/(3dmigoto|embedded|bytecode)/i, $.rendering_key_value),
      alias(/(skip|original|pink|hlsl|asm|assembly|regex|ShaderRegex|clipboard|mono_snapshot|stereo_snapshot|snapshot_if_pink)/i, $.hunting_key_value),
      alias(/(?:(?:no_)?(?:ctrl|alt|shift|windows)|no_modifiers)/i, $.key_binding_modifier)
    ),

    boolean_value: _ => /(?:true|false|yes|no|on|off)/i,

    path_value: $ => choice(
      alias(path_regex, $.path_key_value),
      alias(file_regex, $.file_key_value)
    ),

    fuzzy_match_expression: $ => seq(
      optional(field('operator', /([><]=?|[!=])/)),
      choice(
        $.integer,
        $.field_expression
      )
    ),

    field_expression: $ => seq(
      field('field_name', /((?:res_)?(?:width|height)|depth|array)/i),
      optional(seq('*', $.integer)),
      optional(seq('/', $.integer))
    ),

    primary_statement: $ => choice(
      $.local_declaration,
      $._general_statement,
      // $.conditional_statement // TODO
    ),

    _general_statement: $ => choice(
      // $.assignment_statement, // TODO
      $.instruction_statement
    ),

    // global [persist] NamedVar ['=' StaticValue]
    // [presist] global NamedVar ['=' StaticValue]
    global_declaration: $ => choice(
      $._global_transient_declaration,
      $._global_persist_declaration
    ),

    _global_transient_declaration: $ => seq(
      'global',
      choice(
        field('variable', $.named_variable),
        alias($._global_initialisation, $.assignment_statement)
      ),
      newline
    ),

    _global_persist_declaration: $ => seq(
      choice(seq('global','persist'), seq('persist','global')),
      choice(
        field('variable', $.named_variable),
        alias($._global_initialisation, $.assignment_statement)
      ),
      newline
    ),

    _global_initialisation: $ => seq(
      field('variable', $.named_variable),
      '=',
      field('value', $._static_value)
    ),

    local_declaration: $ => seq(
      'local',
      field('variable', $.named_variable),
      newline
    ),

    local_initialisation: $ => seq(
      seq('local', field('variable', $.named_variable)),
      '=',
      field('expression', $.string), // TODO: will actually just be $._operational_expression
      newline
    ),

    instruction_statement: $ => choice(
      $.run_instruction,
      $.check_texture_override_instruction,
      $.preset_instruction,
      $.handling_instruction,
      $.reset_instruction,
      $.clear_instruction,
      $.stereo_instruction,
      $.dme_instruction,
      $.analysis_instruction,
      $.dump_instruction,
      $.special_instruction,
      $.store_instruction,
      // draw instructions
      $.draw_instruction,
      $.drawindexed_instruction,
      $.drawinstanced_dispatch_instruction,
      $.drawindirect_instruction,
      field('instruction', seq(/drawauto/i, newline))
    ),

    run_instruction: $ => seq(
      field('instruction', /run/i),
      '=',
      $._callable_section,
      newline
    ),

    check_texture_override_instruction: $ => seq(
      field('instruction', /checktextureoverride/i),
      '=',
      $.resource_operand,
      newline
    ),

    preset_instruction: $ => seq(
      field('instruction', /(?:exclude_)?preset/i),
      '=',
      choice(
        $._useable_section_identifier,
        // $.preset_section_identifier
      ),
      newline
    ),

    handling_instruction: $ => seq(
      field('instruction', /handling/i),
      '=',
      field('fixed_value', choice(
        'skip',
        'abort'
      )),
      newline
    ),

    reset_instruction: $ => seq(
      field('instruction', /reset_per_frame_limits/i),
      '=',
      repeat1(choice(
        $.resource_operand,
        $.callable_customshader
      )),
      newline
    ),

    clear_instruction: $ => seq(
      field('instruction', /clear/i),
      '=',
      repeat1(choice(
        $.resource_operand,
        alias(/0x[a-f0-9]+/i, $.hex_integer),
        $._static_value, // numeric constant + inf and NaN
        field('fixed_value', choice('int', 'depth', 'stencil'))
      )),
      newline
    ),

    stereo_instruction: $ => seq(
      field('instruction', /(?:separation|convergence)/i),
      '=',
      $._static_value, // numeric constant + inf and NaN
      newline
    ),

    dme_instruction: $ => seq(
      field('instruction', /direct_mode_eye/i),
      '=',
      field('fixed_value', choice(
        'mono',
        'left',
        'right'
      )),
      newline
    ),

    analysis_instruction: $ => seq(
      field('instruction', /analyse_options/i),
      '=',
      repeat1($.frame_analysis_option),
      newline
    ),

    dump_instruction: $ => seq(
      field('instruction', /dump/i),
      '=',
      repeat1(choice(
        $.resource_operand,
        $.frame_analysis_option
      )),
      newline
    ),

    special_instruction: $ => seq(
      field('instruction', /special/i),
      '=',
      field('fixed_value', choice(
        'upscaling_switch_bb',
        'draw_3dmigoto_overlay'
      )),
      newline
    ),

    store_instruction: $ => seq(
      field('instruction', /store/i),
      '=',
      $.named_variable,
      ',',
      $.resource_usage_expression,
      ',',
      $.integer,
      newline
    ),

    draw_instruction: $ => seq(
      field('instruction', /draw/i),
      '=',
      choice(
        field('fixed_value', choice('auto', 'from_caller')),
        list_seq($.integer, ',')
      ),
      newline
    ),

    drawindexed_instruction: $ => seq(
      field('instruction', /drawindexed(?:instanced)?/i),
      '=',
      choice(
        field('fixed_value', /auto/i),
        list_seq($.integer, ',')
      ),
      newline
    ),

    drawinstanced_dispatch_instruction: $ => seq(
      field('instruction', /(?:drawinstanced|dispatch)/i),
      '=',
      list_seq($.integer, ','),
      newline
    ),

    drawindirect_instruction: $ => seq(
      field('instruction', /(?:drawinstanced|drawindexedinstanced|dispatch)indirect/i),
      '=',
      alias(
        seq($.resource_operand, ',', $.integer),
        $.resource_offset_expression
      ),
      newline
    ),

    resource_usage_expression: $ => seq(
      repeat($.resource_modifier),
      $.resource_operand,
      repeat($.resource_modifier)
    ),

    resource_modifier: _ => /(copy(?:_desc(?:ription)?)?|ref(?:erence)?|raw|stereo|mono|stereo2mono|set_viewport|no_view_cache|resolve_msaa|unless_null)/i,

    resource_operand: $ => choice(
      $._language_variable,
      $.ini_parameter,
      $.resource_identifier,
      $.custom_resource
    ),

    identifier: $ => choice(
      $.resource_operand,
      // normal operands
      $.override_parameter,
      $.named_variable,
      $._callable_section
    ),

    _language_variable: $ => choice(
      alias(/(?:[vhdgpc]s-cb\d{1,2}|vb\d|ib|(?:[rf]_)?bb)/i, $.buffer_variable),
      alias(/(?:[pc]s-u\d|s?o\d|od|[vhdgpc]s(?:-t\d{1,3})?)/i, $.shader_variable)
    ),
    resource_identifier: _ => token(/(?:this|(?:ini|stereo)params|cursor_(?:mask|color))/i),
    custom_resource: $ => seq(
      alias(/Resource/i, $.resource_prefix),
      token.immediate(useable_section_identifier_rule($))
    ),

    named_variable: $ => seq(
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
      stereo_(?:active|available) | scissor_(?:left|top|right|bottom) )`
    ),
    
    _callable_section: $ => choice(
      $.callable_commandlist,
      $.callable_customshader
    ),

    callable_commandlist: $ => seq(
      alias(/(?:BuiltIn)?CommandList/i, $.callable_prefix),
      token.immediate(useable_section_identifier_rule($))
    ),

    callable_customshader: $ => seq(
      alias(/(?:BuiltIn)?CustomShader/i, $.callable_prefix),
      token.immediate(useable_section_identifier_rule($))
    ),

    _useable_section_identifier: $ => seq(
      optional(token(seq('\\', token.immediate(alias(namespace_regex, $.namespace)), token.immediate('\\')))),
      alias(custom_section_name, $.section_identifier)
    ),

    _static_value: $ => choice(
      alias(/[+-]?(inf|NaN)/i, $.language_constant),
      $.numeric_constant
    ),

    numeric_constant: _ => token(/[+-]?\d+(\.\d+)?/i),

    integer: _ => token(/\d+/i),

    string: _ => seq(
      '"',
      token.immediate(repeat(/[^\x00-\x08\x0a-\x1f\x22\x5c\x7f]/)),
      token.immediate('"')
    ),

    frame_analysis_option: _ => new RustRegex(`(?xi)(
      hold|stereo|mono|
      dump_(?:rt|depth|tex|[cvi]b)|jp(?:s|e?g)|(?:jp(?:s|e?g)_)?dds|buf|txt|desc|clear_rt|persist|
      filename_(?:reg|handle)|log|dump_on_(?:unmap|update)|deferred_ctx_(?:immediate|accurate)|
      share_dupes|symlink|dump_(?:rt|depth|tex)_(?:jps|dds)|dump_[cvi]b_txt)`
    ),

    free_text: _ => /[^\\/= \t\r\n]+/i,

    comment: $ => token(seq(
      field('start', ';'),
      field('content', alias(/[^\r\n]*/, $.comment_content)),
      newline
    )),

    _blank: _ => field('blank', newline)
  }
});
