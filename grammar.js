/**
 * @file tree-sitter grammar for the DSL of the INI files used by 3Dmigoto
 * @author LupoMikti <lykare@proton.me>
 * @author AGMG
 * @license MIT
 */

/// <reference types='tree-sitter-cli/dsl' />
// @ts-check

const PREC = {
  OR: 1, // ||
  AND: 2, // &&
  COMPARE: 3, // < > <= >=
  RELATION: 4, // @not-implemented (e.g. `in` or `instanceof` in javascript)
  EQUALITY: 5, // == === != !==
  BIT_OR: 6, // @not-implemented
  BIT_NOT: 7, // @not-implemented
  BIT_AND: 8, // @not-implemented
  BIT_SHIFT: 9, // @not-implemented
  CONCAT: 10, // @not-implemented
  PLUS: 11, // + -
  MULTI: 12, // * / // %
  UNARY: 13, // ! - +
  POWER: 14, // **
}

const newline = /\r?\n/
const custom_section_name = /[^\-+*\/&% !>|<=$\r\n]+/i
const custom_resource_section_name = /[^\/& !>|<=$\r\n]+/i
const namespace_regex = /[^>\\|\/<?:*=$\r\n]+(?:[\\\/][^>\\|\/<?:*=$\r\n]+)*/i
const path_regex = /(?:(?:(?:[a-z]:|\.[\.]?)[\\\/])?(?:\.\.|[^>\\|\/<?:*="$\r\n]+)(?:[\\\/](?:\.\.|[^>\\|\/<?:*="$\r\n]+))+)/i
const file_regex = /[^>\\|\/<?:*="$\r\n]+\.[a-z\-]+/i // intentionally choosing to not support numerals in file extensions

const custom_shader_state_keys = new RustRegex(`(?xi)(
  blend_factor\\[[0-3]\\]|(?:blend|alpha|mask)(?:\\[[0-7]\\])?|alpha_to_coverage|sample_mask|blend_state_merge|
  depth_(?:enable|write_mask|func|stencil_state_merge)|stencil_(?:enable|(?:read|write)_mask|front|back|ref)|
  fill|cull|front|depth_(?:bias(?:_clamp)?|clip_enable)|slope_scaled_depth_bias|(?:scissor|multisample|antialiased_line)_enable|rasterizer_state_merge
)`)

const custom_shader_key_values = new RustRegex(`(?xi)(
  null|front|back|wireframe|solid|
  undefined|(point|line|triangle)_list|(line|triangle)_strip|(line|triangle)_(list|strip)_adj|[123]?\d_control_point_patch_list|
  debug|skip_(validation|optimization)|pack_matrix_(row_major|column_major)|partial_precision|force_[vp]s_software_no_opt|no_preshader|(avoid|prefer)_flow_control|enable_(strictness|backwards_compatibility|unbounded_descriptor_tables)|ieee_strictness|optimization_level[0123]|warnings_are_errors|resources_may_alias|all_resources_bound
)`)

const hunting_section_keys = /((?:done_|toggle_)?hunting|(?:next_)?marking_mode|marking_actions|mark_snapshot|(?:previous|next|mark)_(?:pixel|vertex|compute|geometry|domain|hull)shader|(?:previous|next|mark)_(?:index|vertex)buffer|(?:previous|next|mark)_rendertarget|take_screenshot|reload_fixes|(?:reload|wipe_user)_config|show_original|monitor_performance(?:_interval)?|repeat_rate|freeze_performance_monitor|verbose_overlay|tune_(?:enable|step)|tune[123]_(?:up|down)|analyse_frame|analyse_options|kill_deferred)/i
const system_section_keys = /(proxy_d3d(?:9|11)|load_library_redirect|check_foreground_window|hook|allow_(?:check_interface|create_device|platform_update)|skip_early_includes_load|config_initialization_delay|settings_auto_save_interval|dll_initialization_delay|screen_(?:width|height)|dump_path)/i
const device_section_keys = /(upscaling|upscale_mode|(?:filter_)?refresh_rate|(?:toggle_)?full_screen|force_full_screen_on_key|force_stereo|allow_windowcommands|get_resolution_from|hide_cursor|cursor_upscaling_bypass)/i
const rendering_section_keys = /(shader_hash|texture_hash|(?:override|cache|storage)_directory|cache_shaders|rasterizer_disable_scissor|track_texture_updates|(?:stereo|ini)_params|assemble_signature_comments|disassemble_undecipherable_custom_data|patch_assembly_cb_offsets|recursive_include|export_(?:fixed|shaders|hlsl|binary)|dump_usage|fix_(?:sv_position|ZRepair_.+|BackProjectionTransform\d|ObjectPosition\d(?:Multiplier)?|MatrixOperand\d(?:Multiplier)?)|recompile_all_vs)/i

const resource_type_values = new RustRegex(`(?xi)(
  (?:RW)?(?:Append|Consume)?StructuredBuffer|(?:RW)?(?:ByteAddress)?Buffer|(?:RW)?Texture[123]D|TextureCube
)`)

const resource_key_values = new RustRegex(`(?xi)(
  auto|stereo|
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
 * @param {string|RegExp} section_name 
 * @returns {SeqRule}
 */
const _create_section_header = (section_name) => seq(
  '[',
  token.immediate(section_name),
  optional(']')
)

// from tree-sitter-lua
/**
 * 
 * @param {RuleOrLiteral} rule 
 * @param {string} separator 
 * @param {boolean} trailing_separator 
 * @returns {SeqRule}
 */
const list_seq = (rule, separator, trailing_separator = false) =>
  trailing_separator
    ? seq(rule, repeat(seq(separator, rule)), optional(separator))
    : seq(rule, repeat(seq(separator, rule)));

/**
 * Adapted from tree-sitter-lua, this function returns the rule for defining a binary expression
 * @param {RuleOrLiteral} rule 
 * @returns {ChoiceRule}
 */
const _generate_binary_expr_rule = (rule) => choice(
  ...[
      ['||', PREC.OR],
      ['&&', PREC.AND],
      ['<', PREC.COMPARE],
      ['<=', PREC.COMPARE],
      ['===', PREC.EQUALITY],
      ['==', PREC.EQUALITY],
      ['!==', PREC.EQUALITY],
      ['!=', PREC.EQUALITY],
      ['>=', PREC.COMPARE],
      ['>', PREC.COMPARE],
      // ['', PREC.BIT_OR],
      // ['', PREC.BIT_NOT],
      // ['', PREC.BIT_AND],
      // ['', PREC.BIT_SHIFT],
      // ['', PREC.BIT_SHIFT],
      ['+', PREC.PLUS],
      ['-', PREC.PLUS],
      ['*', PREC.MULTI],
      ['/', PREC.MULTI],
      ['//', PREC.MULTI],
      ['%', PREC.MULTI],
    ].map(([operator, precedence]) =>
      prec.left(
        precedence,
        seq(
          field('left', rule),
          // @ts-ignore
          field('operator', operator),
          field('right', rule)
        )
      )
    ),
    ...[
      ['**', PREC.POWER],
    ].map(([operator, precedence]) =>
      prec.right(
        precedence,
        seq(
          field('left', rule),
          // @ts-ignore
          field('operator', operator),
          field('right', rule)
        )
      )
    )
)

module.exports = grammar({
  name: 'migoto',

  extras: $ => [/\s/, $.comment],

  externals: $ => [
    $._external_line,
    $._section_header_start,
    $.namespace_resolution_start,
    $.namespace_resolution_content,
    $.namespace_resolution_end,
    $._regex_commandlist_header,
    $._regex_declarations_header,
    $._regex_pattern_header,
    $._regex_replace_header,
    $._newline_or_eof,
    $.error_sentinel
  ],

  supertypes: $ => [
    $.section,
    $.primary_statement,
    $.instruction_statement,
    $.resource_operational_expression,
    $.operational_expression
  ],

  rules: {
    document: $ => seq(
      repeat(newline), // consume blank lines at the start of the document
      optional($.initial_comment), // potential comment with no newline before it
      optional($._preamble),
      repeat1($.section),
      optional($.comment),
      optional($._newline_or_eof)
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
      newline,
      optional($.initial_comment)
    ),

    conditional_include_statement: $ => seq(
      alias('condition', $.condition_key),
      '=',
      $.static_operational_expression,
      newline,
      optional($.initial_comment)
    ),

    section: $ => choice(
      $._special_section,
      $.setting_section,
      $.commandlist_section
    ),

    _special_section: $ => choice(
      $.constants_section,
      $.key_section,
      $.preset_section,
      $._shader_regex_section
    ),

    constants_section_header: _ => _create_section_header('Constants'),

    constants_section: $ => seq(
      field('header', $.constants_section_header),
      newline,
      optional($.initial_comment),
      repeat(choice(
        $.global_declaration,
        $.primary_statement
      ))
    ),

    key_section_header: _ => _create_section_header(/Key[^\]]+/i),

    key_section: $ => seq(
      field('header', $.key_section_header),
      newline,
      optional($.initial_comment),
      repeat(choice(
        $.key_setting_statement,
        $.key_run_instruction,
        $.key_condition_statement,
        $.key_assignment_statement
      ))
    ),

    key_setting_statement: $ => seq(
      field('key', $.key_section_key),
      '=',
      field('value', $.key_section_value),
      newline,
      optional($.initial_comment)
    ),

    key_section_key: _ => token(
      /(type|key|back|(?:release_)?delay|wrap|smart|separation|convergence|(?:release_)?transition|(?:release_)?transition_type)/i
    ),

    key_section_value: $ => repeat1(
      choice(
        field('fixed_value', $.key_fixed_key_value),
        $.boolean_value,
        $._static_value,
        alias(';', $.special_semicolon),
        $.free_text
      )
    ),

    key_fixed_key_value: $ => choice(
      alias(/(hold|activate|toggle|cycle)/i, $.key_key_value),
      alias(/(linear|cosine)/i, $.transition_type_key_value),
      alias(/(?:(?:no_)?(?:vk_)?(?:ctrl|alt|shift|windows)|no_modifiers)/i, $.key_binding_modifier)
    ),

    key_condition_statement: $ => seq(
      field('key', alias('condition', $.condition_key)),
      '=',
      list_seq($.operational_expression, ','),
      newline,
      optional($.initial_comment)
    ),

    preset_section_header: _ => _create_section_header(/Preset[^\]]+/i),

    preset_section: $ => seq(
      field('header', $.preset_section_header),
      newline,
      optional($.initial_comment),
      repeat(choice(
        $.preset_setting_statement,
        $.preset_run_instruction,
        $.preset_condition_statement,
        $.preset_assignment_statement
      ))
    ),

    preset_setting_statement: $ => seq(
      field('key', $.preset_section_key),
      '=',
      field('value', $.preset_section_value),
      newline,
      optional($.initial_comment)
    ),

    preset_section_key: _ => token(
      /(separation|convergence|(?:release_)?transition|(?:release_)?transition_type|unique_triggers_required)/i
    ),

    preset_section_value: $ => repeat1(
      choice(
        field('fixed_value', alias(/(linear|cosine)/i, $.transition_type_key_value)),
        $.boolean_value,
        $._static_value,
        $.free_text
      )
    ),

    preset_condition_statement: $ => seq(
      alias('condition', $.condition_key),
      '=',
      $.operational_expression,
      newline,
      optional($.initial_comment)
    ),

    _shader_regex_section: $ => choice(
      $.shader_regex_replace_section,
      $.shader_regex_pattern_section,
      $.shader_regex_declarations_section,
      $.shader_regex_commandlist_section,
    ),

    shader_regex_pattern_header: $ => seq(
      '[',
      token.immediate(/ShaderRegex/i),
      $._regex_pattern_header,
      optional(']')
    ),

    shader_regex_pattern_section: $ => seq(
      field('header', $.shader_regex_pattern_header),
      newline,
      repeat(seq(
        choice(
          seq($.initial_comment, newline),
          seq(alias($._external_line, $.regex_pattern), choice(newline, $._section_header_start))
        )
      ))
    ),

    shader_regex_replace_header: $ => seq(
      '[',
      token.immediate(/ShaderRegex/i),
      $._regex_replace_header,
      optional(']')
    ),

    shader_regex_replace_section: $ => seq(
      field('header', $.shader_regex_replace_header),
      newline,
      repeat(seq(
        choice(
          seq($.initial_comment, newline),
          // seq(alias($._external_line, $.regex_replacement), choice(newline, $._section_header_start))
          seq(alias(repeat(choice($.regex_replacement, $.character_escape, $.free_text)), $.regex_replace_line), choice(newline, $._section_header_start))
        )
      ))
    ),

    shader_regex_declarations_header: $ => seq(
      '[',
      token.immediate(/ShaderRegex/i),
      $._regex_declarations_header,
      optional(']')
    ),

    shader_regex_declarations_section: $ => seq(
      field('header', $.shader_regex_declarations_header),
      newline,
      repeat(seq(
        choice(
          seq($.initial_comment, newline),
          seq(alias($._external_line, $.dxbc_declaration), choice(newline, $._section_header_start))
        )
      ))
    ),

    shader_regex_commandlist_header: $ => seq(
      '[',
      token.immediate(/ShaderRegex/i),
      $._regex_commandlist_header,
      optional(']')
    ),

    shader_regex_commandlist_section: $ => seq(
      field('header', $.shader_regex_commandlist_header),
      newline,
      optional($.initial_comment),
      repeat(choice(
        $.shader_regex_setting_statement,
        $.primary_statement
      ))
    ),

    shader_regex_setting_statement: $ => seq(
      choice(
        seq(
          field('key', alias(/(shader_model|temps|filter_index)/i, $.shader_regex_key)),
          '=',
          field('value', repeat1($.free_text))
        ),
        seq(
          field('key', alias(/filter_index/i, $.shader_regex_key)),
          '=',
          field('value', $.numeric_constant)
        ),
      ),
      newline,
      optional($.initial_comment)
    ),

    // _space_sep_free_text: $ => repeat1($.free_text),

    setting_section_header: _ => _create_section_header(
      /(Logging|System|Device|Stereo|Rendering|Hunting|Profile|ConvergenceMap|Loader|Resource[^\]]+|Include[^\]]*)/i
    ),

    setting_section: $ => seq(
      field('header', $.setting_section_header),
      newline,
      optional($.initial_comment),
      repeat($.setting_statement)
    ),

    setting_statement: $ => seq(
      field('key', $.setting_section_key),
      '=',
      field('value', $.setting_section_value),
      newline,
      optional($.initial_comment)
    ),

    setting_section_key: $ => choice(
      alias(/(hash|filter_index|match_priority|format|(?:width|height)(?:_multiply)?)/i, $.multi_section_key),
      alias(/(type|filename|data|max_copies_per_frame|mode|(?:bind|misc)_flags|depth|mips|array|msaa(?:_quality)?|byte_width|stride)/i, $.resource_section_key),
      alias(/(stereomode|expand_region_copy|deny_cpu_read|iteration)/i, $.texov_resouce_match_key),
      alias(/((?:override_|uav_)?byte_stride|override_vertex_count)/i, $.texov_vertex_limit_key),
      alias(/(match_(?:first_(?:vertex|index|instance)|(?:vertex_|index_|instance_)count))/i, $.texov_draw_match_key),
      alias(/(match_(?:type|usage|(?:bind|cpu_access|misc)_flags|(?:byte_)?width|height|stride|mips|format|depth|array|msaa(?:_quality)?))/i, $.texov_fuzzy_match_key),
      alias(/([vhdgpc]s|flags|max_executions_per_frame|topology|sampler)/i, $.custom_shader_key),
      alias(token.immediate(custom_shader_state_keys), $.custom_shader_state_key),
      alias(/(allow_duplicate_hash|depth_filter|partner|model|disable_scissor)/i, $.shader_override_key),
      alias(/((?:in|ex)clude(?:_recursive)?|user_config)/i, $.include_section_key),
      alias(/(separation|convergence|calls|input|debug(?:_locks)?|unbuffered|force_cpu_affinity|wait_for_debugger|crash|dump_all_profiles|show_warnings)/i, $.logging_section_key),
      alias(hunting_section_keys, $.hunting_section_key),
      alias(system_section_keys, $.system_section_key),
      alias(/(target|module|require_admin|launch|delay|loader|check_version|entry_point|hook_proc|wait_for_target)/i, $.loader_section_key),
      alias(device_section_keys, $.device_section_key),
      alias(/(automatic_mode|unlock_(?:separation|convergence)|create_profile|surface(?:_square)?_createmode|force_no_nvapi)/i, $.stereo_section_key),
      alias(rendering_section_keys, $.rendering_section_key)
    ),

    setting_section_value: $ => repeat1(
      choice(
        field('fixed_value', $.fixed_key_value),
        $.frame_analysis_option,
        $.boolean_value,
        $.null,
        $.string,
        $.path_value,
        $.numeric_constant,
        $.fuzzy_match_expression,
        alias(';', $.special_semicolon),
        $.free_text
      )
    ),

    fixed_key_value: $ => choice(
      alias(/(mono|none)/i, $.multi_key_value),
      alias(/(overrule|depth_(?:(?:in)?active))/i, $.override_key_value),
      alias(custom_shader_key_values, $.custom_shader_key_value),
      alias(/(default|immutable|dynamic|staging)/i, $.fuzzy_match_key_value),
      alias(resource_type_values, $.resource_type),
      alias(resource_key_values, $.resource_key_value),
      alias(dxgi_types_regex, $.resource_format),
      alias(/(add|(?:rev_)?subtract|min|max|disable)/i, $.blend_operator),
      alias(/(zero|one|(?:inv_)?(?:src1?|dest)_(?:color|alpha)|src_alpha_sat|(?:inv_)?blend_factor)/i, $.blend_factor),
      alias(/(deferred_contexts|(?:immediate_)?context|device|all|recommended|except_set_(?:shader_resources|sampler|rasterizer_state)|skip_dxgi_(?:factory|device))/i, $.system_key_value),
      alias(/(depth_stencil|swap_chain)/i, $.device_key_value),
      alias(/(3dmigoto|embedded|bytecode)/i, $.rendering_key_value),
      alias(/(skip|original|pink|hlsl|asm|assembly|regex|ShaderRegex|clipboard|mono_snapshot|stereo_snapshot|snapshot_if_pink)/i, $.hunting_key_value),
      alias(/(?:(?:no_)?(?:vk_)?(?:ctrl|alt|shift|windows)|no_modifiers)/i, $.key_binding_modifier)
    ),

    boolean_value: _ => /(?:true|false|yes|no|on|off)/i,

    path_value: $ => choice(
      alias(path_regex, $.path_key_value),
      alias(file_regex, $.file_key_value)
    ),

    fuzzy_match_expression: $ => seq(
      optional(field('operator', alias(/([><]=?|[!=])/, $.fuzzy_operator))),
      choice(
        $.integer,
        $.field_expression
      )
    ),

    field_expression: $ => seq(
      field('field_name', alias(/((?:res_)?(?:width|height)|depth|array)/i, $.field)),
      optional(seq('*', $.integer)),
      optional(seq('/', $.integer))
    ),

    commandlist_section_header: _ => _create_section_header(
      /(Present|Clear(?:RenderTarget|DepthStencil)View|ClearUnorderedAccessView(?:Uint|Float)|(?:ShaderOverride|TextureOverride|(?:BuiltIn)?(?:CommandList|CustomShader))[^\]]+)/i
    ),

    commandlist_section: $ => seq(
      field('header', $.commandlist_section_header),
      newline,
      optional($.initial_comment),
      repeat(choice(
        $.setting_statement,
        $.primary_statement
      ))
    ),

    primary_statement: $ => choice(
      $.local_declaration,
      $.local_initialisation,
      $._general_statement,
      $.conditional_statement
    ),

    local_declaration: $ => seq(
      alias($._local, 'local'),
      field('variable', $.named_variable),
      newline,
      optional($.initial_comment)
    ),

    local_initialisation: $ => seq(
      seq(
        alias($._local, 'local'),
        field('variable', $.named_variable)
      ),
      '=',
      field('expression', $.operational_expression),
      newline,
      optional($.initial_comment)
    ),

    _general_statement: $ => choice(
      $.assignment_statement,
      $.instruction_statement
    ),

    // global [persist] NamedVar ['=' StaticValue]
    // [presist] global NamedVar ['=' StaticValue]
    global_declaration: $ => choice(
      $._global_transient_declaration,
      $._global_persist_declaration
    ),

    _global_transient_declaration: $ => seq(
      alias($._global, 'global'),
      choice(
        field('variable', $.named_variable),
        alias($._global_initialisation, $.assignment_statement)
      ),
      newline,
      optional($.initial_comment)
    ),

    _global_persist_declaration: $ => seq(
      choice(
        seq(alias($._global, 'global'), alias($._persist, 'persist')),
        seq(alias($._persist, 'persist'),alias($._global, 'global'))
      ),
      choice(
        field('variable', $.named_variable),
        alias($._global_initialisation, $.assignment_statement)
      ),
      newline,
      optional($.initial_comment)
    ),

    _global_initialisation: $ => seq(
      field('variable', $.named_variable),
      '=',
      field('value', $._static_value)
    ),

    assignment_statement: $ => seq(
      optional(choice(alias($._pre, 'pre'), alias($._post, 'post'))),
      choice(
        seq(
          field('name', choice(
            $.ini_parameter,
            $.named_variable
          )),
          "=",
          field('expression', $.operational_expression),
          newline,
          optional($.initial_comment)
        ),
        seq(
          field('name', $.resource_operand),
          '=',
          field('expression', $.resource_usage_expression),
          newline,
          optional($.initial_comment)
        )
      )
    ),

    key_assignment_statement: $ => seq(
      field('name', choice(
        $.ini_parameter,
        $.named_variable
      )),
      "=",
      field('expression', list_seq($._static_value, ',')),
      newline,
      optional($.initial_comment)
    ),

    preset_assignment_statement: $ => seq(
      field('name', choice(
        $.ini_parameter,
        $.named_variable
      )),
      "=",
      field('expression', $._static_value),
      newline,
      optional($.initial_comment)
    ),

    // adapted from tree-sitter-lua
    _block: ($) => repeat1($.primary_statement),

    // adapted from tree-sitter-lua
    conditional_statement: $ => seq(
      alias($._if, 'if'),
      field('condition', choice($.operational_expression, $.resource_operational_expression)),
      newline,
      optional($.initial_comment),
      field('consequence', alias(optional($._block), $.block)),
      repeat(field('alternative', $.elseif_statement)),
      optional(field('alternative', $.else_statement)),
      alias($._endif, 'endif'),
      newline,
      optional($.initial_comment),
    ),

    // adapted from tree-sitter-lua
    elseif_statement: $ => seq(
      choice(alias($._elif, 'elif'), alias($._elseif, 'else if')),
      field('condition', choice($.operational_expression, $.resource_operational_expression)),
      newline,
      optional($.initial_comment),
      field('consequence', alias(optional($._block), $.block))
    ),

    // adapted from tree-sitter-lua
    else_statement: $ => seq(
      alias($._else, 'else'),
      field('body', alias(optional($._block), $.block))
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
      $.drawauto_instruction,
    ),

    _execution_modifier: $ => choice(
      alias($._pre, 'pre'),
      alias($._post, 'post')
    ),

    run_instruction: $ => seq(
      field('modifier', optional($._execution_modifier)),
      alias(/run/i, $.instruction),
      '=',
      $._callable_section,
      newline,
      optional($.initial_comment)
    ),

    key_run_instruction: $ => seq(
      alias(/run/i, $.instruction),
      '=',
      list_seq($.callable_commandlist, ','),
      newline,
      optional($.initial_comment)
    ),

    preset_run_instruction: $ => seq(
      alias(/run/i, $.instruction),
      '=',
      $.callable_commandlist,
      newline,
      optional($.initial_comment)
    ),

    check_texture_override_instruction: $ => seq(
      field('modifier', optional($._execution_modifier)),
      alias(/checktextureoverride/i, $.instruction),
      '=',
      $.resource_operand,
      newline,
      optional($.initial_comment)
    ),

    preset_instruction: $ => seq(
      field('modifier', optional($._execution_modifier)),
      alias(/(?:exclude_)?preset/i, $.instruction),
      '=',
      choice(
        alias($._useable_section_identifier, $.preset_section_identifier),
        $.preset_section_identifier
      ),
      newline,
      optional($.initial_comment)
    ),

    handling_instruction: $ => seq(
      field('modifier', optional($._execution_modifier)),
      alias(/handling/i, $.instruction),
      '=',
      field('fixed_value', alias(/(skip|abort)/i, $.handling_key_value)),
      newline,
      optional($.initial_comment)
    ),

    reset_instruction: $ => seq(
      field('modifier', optional($._execution_modifier)),
      alias(/reset_per_frame_limits/i, $.instruction),
      '=',
      repeat1(choice(
        $.resource_operand,
        $.callable_customshader
      )),
      newline,
      optional($.initial_comment)
    ),

    clear_instruction: $ => seq(
      field('modifier', optional($._execution_modifier)),
      alias(/clear/i, $.instruction),
      '=',
      repeat1(choice(
        $.resource_operand,
        alias(/0x[a-f0-9]+/i, $.hex_integer),
        $._static_value, // numeric constant + inf and NaN
        field('fixed_value', alias(/(int|depth|stencil)/i, $.clear_instruction_key_value))
      )),
      newline,
      optional($.initial_comment)
    ),

    stereo_instruction: $ => seq(
      field('modifier', optional($._execution_modifier)),
      alias(/(?:separation|convergence)/i, $.instruction),
      '=',
      $._static_value, // numeric constant + inf and NaN
      newline,
      optional($.initial_comment)
    ),

    dme_instruction: $ => seq(
      field('modifier', optional($._execution_modifier)),
      alias(/direct_mode_eye/i, $.instruction),
      '=',
      field('fixed_value', alias(/(mono|left|right)/i, $.dme_instruction_key_value)),
      newline,
      optional($.initial_comment)
    ),

    analysis_instruction: $ => seq(
      field('modifier', optional($._execution_modifier)),
      alias(/analyse_options/i, $.instruction),
      '=',
      field('fixed_value', repeat1($.frame_analysis_option)),
      newline,
      optional($.initial_comment)
    ),

    dump_instruction: $ => seq(
      field('modifier', optional($._execution_modifier)),
      alias(/dump/i, $.instruction),
      '=',
      repeat1(choice(
        $.resource_operand,
        $.frame_analysis_option
      )),
      newline,
      optional($.initial_comment)
    ),

    special_instruction: $ => seq(
      field('modifier', optional($._execution_modifier)),
      alias(/special/i, $.instruction),
      '=',
      field('fixed_value', alias(
        /(upscaling_switch_bb|draw_3dmigoto_overlay)/i,
        $.special_instruction_key_value
      )),
      newline,
      optional($.initial_comment)
    ),

    store_instruction: $ => seq(
      field('modifier', optional($._execution_modifier)),
      alias(/store/i, $.instruction),
      '=',
      $.named_variable,
      ',',
      $.resource_usage_expression,
      ',',
      $.integer,
      newline,
      optional($.initial_comment)
    ),

    draw_instruction: $ => seq(
      field('modifier', optional($._execution_modifier)),
      alias(/draw/i, $.instruction),
      '=',
      choice(
        field('fixed_value', alias(/(auto|from_caller)/i, $.draw_instruction_key_value)),
        list_seq($.operational_expression, ',')
      ),
      newline,
      optional($.initial_comment)
    ),

    drawindexed_instruction: $ => seq(
      field('modifier', optional($._execution_modifier)),
      alias(/drawindexed(?:instanced)?/i, $.instruction),
      '=',
      choice(
        field('fixed_value', alias(/auto/i, $.draw_instruction_key_value)),
        list_seq($.operational_expression, ',')
      ),
      newline,
      optional($.initial_comment)
    ),

    drawinstanced_dispatch_instruction: $ => seq(
      field('modifier', optional($._execution_modifier)),
      alias(/(?:drawinstanced|dispatch)/i, $.instruction),
      '=',
      list_seq($.operational_expression, ','),
      newline,
      optional($.initial_comment)
    ),

    drawindirect_instruction: $ => seq(
      field('modifier', optional($._execution_modifier)),
      alias(/(?:drawinstanced|drawindexedinstanced|dispatch)indirect/i, $.instruction),
      '=',
      alias(
        seq($.resource_operand, ',', $.integer),
        $.resource_offset_expression
      ),
      newline,
      optional($.initial_comment)
    ),

    drawauto_instruction: $ => seq(
      field('modifier', optional($._execution_modifier)),
      alias(/drawauto/i, $.instruction),
      newline,
      optional($.initial_comment)
    ),

    resource_operational_expression: $ => choice(
      $.resource_comparison_expression,
      $.parenthesized_resource_comparison_expression
    ),

    resource_usage_expression: $ => seq(
      repeat($.resource_modifier),
      $.resource_operand,
      repeat($.resource_modifier)
    ),

    resource_comparison_expression: $ => choice(
      ...[
        ['<', PREC.COMPARE],
        ['<=', PREC.COMPARE],
        ['>=', PREC.COMPARE],
        ['>', PREC.COMPARE],
        ['===', PREC.EQUALITY],
        ['==', PREC.EQUALITY],
        ['!==', PREC.EQUALITY],
        ['!=', PREC.EQUALITY],
      ].map(([operator, precedence]) =>
        prec.left(
          precedence,
          seq(
            field('left', choice($.resource_operand, $.numeric_constant)),
            // @ts-ignore
            field('operator', operator),
            field('right', choice($.resource_operand, $.numeric_constant))
          )
        )
      )
    ),

    parenthesized_resource_comparison_expression: $ => seq(
      '(',
      $.resource_comparison_expression,
      ')'
    ),

    resource_modifier: _ => /(copy(?:_desc(?:ription)?)?|ref(?:erence)?|raw|stereo|mono|stereo2mono|set_viewport|no_view_cache|resolve_msaa|unless_null)/i,

    resource_operand: $ => choice(
      $._language_variable,
      $.resource_identifier,
      $.custom_resource
    ),

    static_operational_expression: $ => choice(
      $._static_value,
      $.static_parenthesized_expression,
      $.static_binary_expression,
      $.static_unary_expression
    ),

    static_parenthesized_expression: $ => seq(
      '(',
      $.static_operational_expression,
      ')'
    ),

    static_binary_expression: $ => _generate_binary_expr_rule($.static_operational_expression),

    static_unary_expression: $ => prec.left(
      PREC.UNARY,
      seq(choice('-', '+', '!'), field('operand', $.static_operational_expression))
    ),

    operational_expression: $ => choice(
      $._static_value,
      $.identifier,
      $.parenthesized_expression,
      $.binary_expression,
      $.unary_expression
    ),

    parenthesized_expression: $ => seq(
      '(',
      $.operational_expression,
      ')'
    ),

    binary_expression: $ => _generate_binary_expr_rule($.operational_expression),

    // adapted from tree-sitter-lua
    unary_expression: $ => prec.left(
      PREC.UNARY,
      seq(field('operator', choice('-', '+', '!')), field('operand', $.operational_expression))
    ),

    identifier: $ => choice(
      $.named_variable,
      $.ini_parameter,
      $.shader_identifier,
      $.scissor_rectangle,
      $.override_parameter
    ),

    _language_variable: $ => choice(
      alias(/(?:[vhdgpc]s-cb\d\d?|vb\d|ib|(?:[rf]_)?bb)/i, $.buffer_variable),
      alias(/(?:[pc]s-u\d|s?o\d|od|[vhdgpc]s(?:-t\d\d?\d?))/i, $.shader_variable),
      prec(1,$.shader_identifier)
    ),

    resource_identifier: $ => choice(
      token(/(?:this|(?:ini|stereo)params|cursor_(?:mask|color))/i),
      $.null
    ),

    custom_resource: $ => seq(
      alias(/Resource/i, $.resource_prefix),
      seq(
        optional(seq(
          alias($.namespace_resolution_start, '\\'),
          alias($.namespace_resolution_content, $.namespace),
          alias($.namespace_resolution_end, '\\')
        )),
        alias(custom_resource_section_name, $.section_identifier)
      )
    ),

    named_variable: $ => seq(
      '$',
      optional(seq(
        alias($.namespace_resolution_start, '\\'),
        alias($.namespace_resolution_content, $.namespace),
        alias($.namespace_resolution_end, '\\')
      )),
      alias(/[a-z_]\w+|[a-z]/i, $.variable_identifier)
    ),

    // Oh the BS I have to do to deal with tree-sitter's regex restrictions
    ini_parameter: _ => choice(
      /[xyzw]/i,
      /[xyzw]\d/i,
      /[xyzw]\d\d/i,
      /[xyzw]\d\d\d/i,
    ),

    shader_identifier: _ => /[vhdgpc]s/i,

    scissor_rectangle: _ => /(scissor\d+_(?:left|top|right|bottom))/i,

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
      $._useable_section_identifier
    ),

    callable_customshader: $ => seq(
      alias(/(?:BuiltIn)?CustomShader/i, $.callable_prefix),
      $._useable_section_identifier
    ),

    preset_section_identifier: $ => seq(
      alias(/Preset/i, $.preset_prefix),
      $._useable_section_identifier
    ),

    _useable_section_identifier: $ => seq(
      optional(seq(
        alias($.namespace_resolution_start, '\\'),
        alias($.namespace_resolution_content, $.namespace),
        alias($.namespace_resolution_end, '\\')
      )),
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
      token.immediate(repeat(/[^\x00-\x08\x0a-\x1f\x22\x7f]/)), // from null to backspace, from \n to unit separator, ", delete
      token.immediate('"')
    ),

    frame_analysis_option: _ => new RustRegex(`(?xi)(
      hold|stereo|mono|
      dump_(?:rt|depth|tex|[cvi]b)|jp(?:s|e?g)|(?:jp(?:s|e?g)_)?dds|buf|txt|desc|clear_rt|persist|
      filename_(?:reg|handle)|log|dump_on_(?:unmap|update)|deferred_ctx_(?:immediate|accurate)|
      share_dupes|symlink|dump_(?:rt|depth|tex)_(?:jps|dds)|dump_[cvi]b_txt)`
    ),

    regex_replacement: _ => seq(
      '${',
      /\w+/i,
      '}'
    ),

    character_escape: _ => token.immediate(/\\[a-z]/i),

    free_text: _ => /[^\\\/="${}\s]+/i,

    comment: $ => token(seq(
      field('start', seq(newline, ';')),
      field('content', alias(/[^\r\n]*/, $.comment_content))
    )),

    initial_comment: $ => token(seq(
      field('start', ';'),
      field('content', alias(/[^\r\n]*/, $.comment_content))
    )),

    null: _ => /null/i,

    _global: _ => /global/i,

    _persist: _ => /persist/i,

    _local: _ => /local/i,

    _if: _ => /if/i,

    _elif: _ => /elif/i,

    _elseif: _ => /else if/i,

    _else: _ => /else/i,

    _endif: _ => /endif/i,

    _pre: _ => /pre/i,

    _post: _ => /post/i,

    // _blank: _ => newline
  }
});
