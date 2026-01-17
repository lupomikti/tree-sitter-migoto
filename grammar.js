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
  RELATION: 4, // @not-implemented (e.g. `in` or `instanceof` in javascript) ~
  EQUALITY: 5, // == === != !==
  BIT_OR: 6, // @not-implemented |
  BIT_NOT: 7, // @not-implemented ^
  BIT_AND: 8, // @not-implemented &
  BIT_SHIFT: 9, // @not-implemented >> <<
  CONCAT: 10, // @not-implemented ..
  PLUS: 11, // + -
  MULTI: 12, // * / // %
  UNARY: 13, // ! - +
  POWER: 14, // **
}

const custom_section_name = /[^\-+*\/&% !>|<=$,\r\n]+/i
const custom_resource_section_name = /[^\/& !>|<=$,\r\n]+/i
const namespace_regex = /[^\s>\\|\/<?:*="$][^>\\|\/<?:*=$\r\n]+(?:[\\\/][^>\\|\/<?:*=$\r\n]+)*/i
const path_regex = /(?:(?:(?:[a-z]:|\.[\.]?)[\\\/])?(?:\.\.|[^\s>\\|\/<?:*="$][^>\\|\/<?:*="$\r\n]+)(?:[\\\/](?:\.\.|[^\s>\\|\/<?:*="$][^>\\|\/<?:*="$\r\n]+))+)/i
const file_regex = /[^\s>\\|\/<?:*="$\r\n][^>\\|\/<?:*="$\r\n]*\.[a-z\-]+/i // intentionally choosing to not support numerals in file extensions

const custom_shader_state_keys = new RustRegex(`(?xi)(
  blend_factor\\[[0-3]\\]|(?:blend|alpha|mask)(?:\\[[0-7]\\])?|alpha_to_coverage|sample_mask|blend_state_merge|
  depth_(?:enable|write_mask|func|stencil_state_merge)|stencil_(?:enable|(?:read|write)_mask|front|back|ref)|
  fill|cull|front|depth_(?:bias(?:_clamp)?|clip_enable)|slope_scaled_depth_bias|(?:scissor|multisample|antialiased_line)_enable|rasterizer_state_merge
)`)

const custom_shader_keys_with_brackets = new RustRegex(`(?xi)(blend_factor\\[[0-3]\\]|(?:blend|alpha|mask)(?:\\[[0-7]\\])?)`)

const custom_shader_key_values = new RustRegex(`(?xi)(
  front|back|wireframe|solid|
  undefined|(point|line|triangle)_list|(line|triangle)_strip|(line|triangle)_(list|strip)_adj|[123]?\d_control_point_patch_list|
  debug|skip_(validation|optimization)|pack_matrix_(row_major|column_major)|partial_precision|force_[vp]s_software_no_opt|no_preshader|(avoid|prefer)_flow_control|enable_(strictness|backwards_compatibility|unbounded_descriptor_tables)|ieee_strictness|optimization_level[0123]|warnings_are_errors|resources_may_alias|all_resources_bound
)`)

const setting_section_key_binding_keys = /((?:done_|toggle_)hunting|next_marking_mode|mark_snapshot|(?:previous|next|mark)_(?:pixel|vertex|compute|geometry|domain|hull)shader|(?:previous|next|mark)_(?:index|vertex)buffer|(?:previous|next|mark)_rendertarget|take_screenshot|reload_fixes|(?:reload|wipe_user)_config|show_original|monitor_performance|freeze_performance_monitor|tune[123]_(?:up|down)|analyse_frame|toggle_full_screen|force_full_screen_on_key)/i
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
 * Adapted from tree-sitter-lua, this returns a sequence of rules separated by a given delimiter
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
      // ['~', PREC.RELATION],
      ['===', PREC.EQUALITY],
      ['==', PREC.EQUALITY],
      ['!==', PREC.EQUALITY],
      ['!=', PREC.EQUALITY],
      ['>=', PREC.COMPARE],
      ['>', PREC.COMPARE],
      // ['|', PREC.BIT_OR],
      // ['^', PREC.BIT_NOT],
      // ['&', PREC.BIT_AND],
      // ['>>', PREC.BIT_SHIFT],
      // ['<<', PREC.BIT_SHIFT],
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

export default grammar({
  name: 'migoto',

  extras: $ => [/[\s\f\uFEFF\u2060\u200B]|\r?\n/, $.comment],

  word: $ => $.fixed_value,

  inline: $ => [
    $._key_section_key,
    $._preset_section_key,
    $._setting_statement_key
  ],

  externals: $ => [
    $._external_line,
    $._section_header_start,
    $._section_header_guard,
    $._key_header_prefix,
    $._regex_header_prefix,
    $._preset_header_prefix,
    $._include_header_prefix,
    $._commandlist_header_prefix,
    $._commandlist_callable_prefix,
    $._customshader_callable_prefix,
    $._customresource_header_prefix,
    $._namespace_resolution_start,
    $._namespace_resolution_content,
    $._namespace_resolution_end,
    $._suffixed_key_header,
    $._suffixed_preset_header,
    $._suffixed_resource_header,
    $._suffixed_include_header,
    $._suffixed_commandlist_header,
    $._regex_commandlist_header,
    $._regex_declarations_header,
    $._regex_pattern_header,
    $._regex_replace_header,
    $._newline,
    $.error_sentinel
  ],

  supertypes: $ => [
    $.section,
    $.primary_statement,
    $.instruction_statement,
    $.list_expression,
    // $.resource_operational_expression,
    $.operational_expression,
    $.static_operational_expression,
    $.identifier,
  ],

  rules: {
    document: $ => seq(
      optional($.preamble),
      repeat($.section)
    ),

    preamble: $ => choice(
      $.namespace_declaration,
      $.conditional_include_statement,
      seq($.namespace_declaration, $.conditional_include_statement),
      seq($.conditional_include_statement, $.namespace_declaration)
    ),

    namespace_declaration: $ => seq(
      alias(/namespace/i, $.namespace_key),
      '=',
      optional(alias(namespace_regex, $.namespace)),
      $._newline
    ),

    conditional_include_statement: $ => seq(
      alias(/condition/i, $.condition_key),
      '=',
      $.static_operational_expression,
      $._newline
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

    constants_section_header: $ => seq(
      '[',
      alias(/Constants/i, $.header_identifier),
      optional(']'),
      $._newline
    ),

    constants_section_body: $ => repeat1(choice(
      $.global_declaration,
      $.global_initialisation,
      $.primary_statement
    )),

    constants_section: $ => seq(
      field('header', $.constants_section_header),
      optional(field('body', $.constants_section_body))
    ),

    /***********************
     *     KEY SECTION     *
     **********************/

    key_section_header: $ => seq(
      '[',
      // alias(/Key/i, $.header_prefix),
      alias($._key_header_prefix, $.header_prefix),
      alias($._suffixed_key_header, $.header_identifier),
      optional(']'),
      $._newline
    ),

    key_section_body: $ => repeat1(choice(
      $.key_setting_statement,
      $.key_run_instruction,
      $.key_condition_statement,
      $.key_assignment_statement
    )),

    key_section: $ => seq(
      field('header', $.key_section_header),
      optional(field('body', $.key_section_body))
    ),

    key_setting_statement: $ => choice(
      seq(
        field('key', $._key_section_key),
        '=',
        field('value', $.key_section_value),
        $._newline
      ),
      seq(
        field('key', alias($._key_section_key_binding_key, $.key_section_key)),
        "=",
        field('value', choice($.free_text, $._exception_character, $.key_binding_expression)),
        $._newline
      )
    ),

    _key_section_key: $ => alias($.fixed_value, $.key_section_key),

    _key_section_key_binding_key: _ => token(/key|back/i),

    key_section_value: $ => choice(
      field('fixed_value', alias($.fixed_value, $.fixed_key_key_value)),
      $.boolean_value,
      $._static_value
    ),

    // key_fixed_key_value: $ => choice(
    //   alias(/(hold|activate|toggle|cycle)/i, $.key_key_value),
    //   alias(/(linear|cosine)/i, $.transition_type_key_value),
    // ),

    key_run_instruction: $ => seq(
      alias(/run/i, $.instruction),
      '=',
      list_seq($.callable_commandlist, ','),
      $._newline
    ),

    key_condition_statement: $ => seq(
      field('key', alias(/condition/i, $.condition_key)),
      '=',
      list_seq($.operational_expression, ','),
      $._newline
    ),

    key_assignment_statement: $ => seq(
      field('name', choice(
        $.ini_parameter,
        $.named_variable
      )),
      "=",
      field('expression', $.static_list_expression),
      $._newline
    ),

    /***************************
     *     PRESET SECTION      *
     **************************/

    preset_section_header: $ => seq(
      '[',
      // alias(/Preset/i, $.header_prefix),
      alias($._preset_header_prefix, $.header_prefix),
      alias($._suffixed_preset_header, $.header_identifier),
      optional(']'),
      $._newline
    ),

    preset_section_body: $ => repeat1(choice(
      $.preset_setting_statement,
      $.preset_run_instruction,
      $.preset_condition_statement,
      $.preset_assignment_statement
    )),

    preset_section: $ => seq(
      field('header', $.preset_section_header),
      optional(field('body', $.preset_section_body))
    ),

    preset_setting_statement: $ => seq(
      field('key', $._preset_section_key),
      '=',
      field('value', $.preset_section_value),
      $._newline
    ),

    _preset_section_key: $ => alias($.fixed_value, $.preset_section_key),

    // preset_section_key: _ => token(
    //   /(separation|convergence|(?:release_)?transition|(?:release_)?transition_type|unique_triggers_required)/i
    // ),

    preset_section_value: $ => choice(
      field('fixed_value', alias($.fixed_value, $.fixed_preset_key_value)),
      $.boolean_value,
      $._static_value
    ),

    preset_run_instruction: $ => seq(
      alias(/run/i, $.instruction),
      '=',
      $.callable_commandlist,
      $._newline
    ),

    preset_condition_statement: $ => seq(
      alias(/condition/i, $.condition_key),
      '=',
      $.operational_expression,
      $._newline
    ),

    preset_assignment_statement: $ => seq(
      field('name', choice(
        $.ini_parameter,
        $.named_variable
      )),
      "=",
      field('expression', $._static_value),
      $._newline
    ),

    /**********************************
     *     SHADER REGEX SECTIONS      *
     *********************************/

    _shader_regex_section: $ => choice(
      $.shader_regex_replace_section,
      $.shader_regex_pattern_section,
      $.shader_regex_declarations_section,
      $.shader_regex_commandlist_section,
    ),

    shader_regex_pattern_header: $ => seq(
      '[',
      seq(
        // alias(/ShaderRegex/i, $.header_prefix),
        alias($._regex_header_prefix, $.header_prefix),
        alias($._regex_pattern_header, $.header_identifier)
      ),
      optional(']')
    ),

    shader_regex_pattern_body: $ => repeat1(seq(
      alias($._external_line, $.regex_pattern),
      $._newline,
      optional($._section_header_start)
    )),

    shader_regex_pattern_section: $ => seq(
      field('header', $.shader_regex_pattern_header),
      $._newline,
      optional(field('body', $.shader_regex_pattern_body))
    ),

    shader_regex_replace_header: $ => seq(
      '[',
      seq(
        // alias(/ShaderRegex/i, $.header_prefix),
        alias($._regex_header_prefix, $.header_prefix),
        alias($._regex_replace_header, $.header_identifier)
      ),
      optional(']')
    ),

    shader_regex_replace_body: $ => repeat1(seq(
      $._section_header_guard,
      alias(repeat1(choice($.regex_replacement, $.character_escape, $.free_text)), $.regex_replace_line),
      $._newline,
      optional($._section_header_start)
    )),

    shader_regex_replace_section: $ => seq(
      field('header', $.shader_regex_replace_header),
      $._newline,
      optional(field('body', $.shader_regex_replace_body))
    ),

    shader_regex_declarations_header: $ => seq(
      '[',
      seq(
        // alias(/ShaderRegex/i, $.header_prefix),
        alias($._regex_header_prefix, $.header_prefix),
        alias($._regex_declarations_header, $.header_identifier)
      ),
      optional(']')
    ),

    shader_regex_declarations_body: $ => repeat1(seq(
      alias($._external_line, $.dxbc_declaration),
      $._newline,
      optional($._section_header_start)
    )),

    shader_regex_declarations_section: $ => seq(
      field('header', $.shader_regex_declarations_header),
      $._newline,
      optional(field('body', $.shader_regex_declarations_body))
    ),

    shader_regex_commandlist_header: $ => seq(
      '[',
      seq(
        // alias(/ShaderRegex/i, $.header_prefix),
        alias($._regex_header_prefix, $.header_prefix),
        alias($._regex_commandlist_header, $.header_identifier)
      ),
      optional(']')
    ),

    shader_regex_commandlist_body: $ => repeat1(choice(
      $.shader_regex_setting_statement,
      $.primary_statement
    )),

    shader_regex_commandlist_section: $ => seq(
      field('header', $.shader_regex_commandlist_header),
      $._newline,
      optional(field('body', $.shader_regex_commandlist_body))
    ),

    shader_regex_setting_statement: $ => seq(
      choice(
        seq(
          field('key', alias(/(shader_model|temps)/i, $.shader_regex_key)),
          '=',
          field('value', repeat1($.free_text))
        ),
        seq(
          field('key', alias(/filter_index/i, $.shader_regex_key)),
          '=',
          field('value', $.numeric_constant)
        ),
      ),
      $._newline
    ),

    /*************************************
     *     NON-COMMANDLIST SECTIONS      *
     ************************************/

    setting_section_header: $ => seq(
      '[',
      choice(
        alias(/(Logging|System|Device|Stereo|Rendering|Hunting|Profile|ConvergenceMap|Loader)/i, $.header_identifier),
        // seq(alias(/Resource/i, $.header_prefix), alias($._suffixed_resource_header, $.header_identifier)),
        // seq(alias(/Include/i, $.header_prefix), alias($._suffixed_include_header, $.header_identifier)),
        choice(
          seq(
            alias($._customresource_header_prefix, $.header_prefix),
            alias($._suffixed_resource_header, $.header_identifier)
          ),
          seq(
            alias($._include_header_prefix, $.header_prefix),
            alias($._suffixed_include_header, $.header_identifier)
          ),
        )
      ),
      optional(']'),
      $._newline
    ),

    setting_section_body: $ => repeat1($.setting_statement),

    setting_section: $ => seq(
      field('header', $.setting_section_header),
      optional(field('body', $.setting_section_body))
    ),

    setting_statement: $ => choice(
      // general setting keys that don't need special handling
      seq(
        field('key', choice($._setting_statement_key, $._bracketed_setting_statement_key)),
        '=',
        field('value', $.setting_statement_value),
        $._newline
      ),
      // the shader name keys used in custom shader sections which can be a path or null
      seq(
        field('key', alias(/[vhdgpc]s/i, $.setting_statement_key)),
        '=',
        field('value', alias($._specific_custom_shader_value, $.setting_statement_value)),
        $._newline
      ),
      // any keys that take KeyBindings, which can also be a single free_text node or single exception_character node
      seq(
        field('key', alias(setting_section_key_binding_keys, $.setting_statement_key)),
        '=',
        field('value', alias($._specific_key_binding_value, $.setting_statement_value)),
        $._newline
      ),
      // remaining keys that can take paths/files so a value that would have a conflict btwn fixed_value and free_text is always treated as a path
      seq(
        field('key', $._directory_setting_statement_key),
        '=',
        field('value', alias($._specific_directory_value, $.setting_statement_value)),
        $._newline
      )
    ),

    _specific_custom_shader_value: $ => choice($.null, $._path_value),

    _specific_key_binding_value: $ => choice($.free_text, $._exception_character, $.key_binding_expression),

    _specific_directory_value: $ => choice(alias($.free_text, $.path_key_value), $._path_value),

    _directory_setting_statement_key: $ =>
      // path/file only keys:
      alias(token(prec(-1, /(override|cache|storage)_directory|include(_recursive)?|exclude_recursive/i)), $.setting_statement_key),

    _bracketed_setting_statement_key: $ => alias(custom_shader_keys_with_brackets, $.setting_statement_key),

    _setting_statement_key: $ => alias($.fixed_value, $.setting_statement_key),

    // setting_statement_key: $ => choice(
    //   alias(/(hash|filter_index|match_priority|format|(?:width|height)(?:_multiply)?)/i, $.multi_section_key),
    //   alias(/(type|filename|data|max_copies_per_frame|mode|(?:bind|misc)_flags|depth|mips|array|msaa(?:_quality)?|byte_width|stride)/i, $.resource_section_key),
    //   alias(/(stereomode|expand_region_copy|deny_cpu_read|iteration)/i, $.texov_resouce_match_key),
    //   alias(/((?:override_|uav_)?byte_stride|override_vertex_count)/i, $.texov_vertex_limit_key),
    //   alias(/(match_(?:first_(?:vertex|index|instance)|(?:vertex_|index_|instance_)count))/i, $.texov_draw_match_key),
    //   alias(/(match_(?:type|usage|(?:bind|cpu_access|misc)_flags|(?:byte_)?width|height|stride|mips|format|depth|array|msaa(?:_quality)?))/i, $.texov_fuzzy_match_key),
    //   alias(/(flags|max_executions_per_frame|topology|sampler)/i, $.custom_shader_key),
    //   alias(custom_shader_state_keys, $.custom_shader_state_key),
    //   alias(/(allow_duplicate_hash|depth_filter|partner|model|disable_scissor)/i, $.shader_override_key),
    //   alias(/((?:in|ex)clude(?:_recursive)?|user_config)/i, $.include_section_key),
    //   alias(/(separation|convergence|calls|input|debug(?:_locks)?|unbuffered|force_cpu_affinity|wait_for_debugger|crash|dump_all_profiles|show_warnings)/i, $.logging_section_key),
    //   alias(hunting_section_keys, $.hunting_section_key),
    //   alias(system_section_keys, $.system_section_key),
    //   alias(/(target|module|require_admin|launch|delay|loader|check_version|entry_point|hook_proc|wait_for_target)/i, $.loader_section_key),
    //   alias(device_section_keys, $.device_section_key),
    //   alias(/(automatic_mode|unlock_(?:separation|convergence)|create_profile|surface(?:_square)?_createmode|force_no_nvapi)/i, $.stereo_section_key),
    //   alias(rendering_section_keys, $.rendering_section_key)
    // ),

    setting_statement_value: $ => choice(
      alias(dxgi_types_regex, $.resource_format),
      alias(resource_type_values, $.resource_type),
      field('fixed_value', alias($.fixed_value, $.fixed_setting_key_value)),
      $.numeric_constant,
      $.boolean_value,
      $.string,
      $._path_value,
      $.fuzzy_match_expression,
      $.list_expression,
    ),

    // fixed_setting_key_value: $ => choice(
    //   alias(/(mono|none)/i, $.multi_key_value),
    //   alias(/(overrule|depth_(?:(?:in)?active))/i, $.override_key_value),
    //   alias(custom_shader_key_values, $.custom_shader_key_value),
    //   alias(/(default|immutable|dynamic|staging)/i, $.fuzzy_match_key_value),
    //   alias(resource_type_values, $.resource_type),
    //   alias(resource_key_values, $.resource_key_value),
    //   alias(dxgi_types_regex, $.resource_format),
    //   alias(/(deferred_contexts|(?:immediate_)?context|device|all|recommended|except_set_(?:shader_resources|sampler|rasterizer_state)|skip_dxgi_(?:factory|device))/i, $.system_key_value),
    //   alias(/(depth_stencil|swap_chain)/i, $.device_key_value),
    //   alias(/(3dmigoto|embedded|bytecode)/i, $.rendering_key_value),
    //   alias(/(skip|original|pink|hlsl|asm|assembly|regex|ShaderRegex|clipboard|mono_snapshot|stereo_snapshot|snapshot_if_pink)/i, $.hunting_key_value),
    //   alias(/(?:(?:no_)?(?:vk_)?(?:ctrl|alt|shift|windows)|no_modifiers)/i, $.key_binding_modifier)
    // ),

    commandlist_section_header: $ => seq(
      '[',
      choice(
        alias(/(Present|Clear(?:RenderTarget|DepthStencil)View|ClearUnorderedAccessView(?:Uint|Float))/i, $.header_identifier),
        seq(
          // alias(/(ShaderOverride|TextureOverride|(?:BuiltIn)?(?:CommandList|CustomShader))/i, $.header_prefix),
          alias($._commandlist_header_prefix, $.header_prefix),
          alias($._suffixed_commandlist_header, $.header_identifier)
        ),
      ),
      optional(']'),
      $._newline
    ),

    commandlist_section: $ => seq(
      field('header', $.commandlist_section_header),
      optional(field('body', alias($._block, $.commandlist_section_body)))
    ),

    primary_statement: $ => choice(
      $.local_declaration,
      $.local_initialisation,
      $.assignment_statement,
      $.instruction_statement,
      $.conditional_statement
    ),

    local_declaration: $ => seq(
      alias($._local, 'local'),
      field('variable', $.named_variable),
      $._newline
    ),

    local_initialisation: $ => seq(
      alias($._local, 'local'),
      field('variable', $.named_variable),
      '=',
      field('expression', $.operational_expression),
      $._newline
    ),

    global_declaration: $ => choice(
      $._global_transient_declaration,
      $._global_persist_declaration
    ),

    global_initialisation: $ => choice(
      $._global_transient_initialisation,
      $._global_persist_initialisation
    ),

    _global_transient_declaration: $ => seq(
      alias($._global, 'global'),
      field('variable', $.named_variable),
      $._newline
    ),

    _global_persist_declaration: $ => seq(
      choice(
        seq(alias($._global, 'global'), alias($._persist, 'persist')),
        seq(alias($._persist, 'persist'), alias($._global, 'global'))
      ),
      field('variable', $.named_variable),
      $._newline
    ),

    _global_transient_initialisation: $ => seq(
      alias($._global, 'global'),
      $._static_initialisation,
      $._newline
    ),

    _global_persist_initialisation: $ => seq(
      choice(
        seq(alias($._global, 'global'), alias($._persist, 'persist')),
        seq(alias($._persist, 'persist'), alias($._global, 'global'))
      ),
      $._static_initialisation,
      $._newline
    ),

    _static_initialisation: $ => seq(
      field('variable', $.named_variable),
      '=',
      field('value', $._static_value)
    ),

    assignment_statement: $ => seq(
      optional($.execution_modifier),
      choice(
        seq(
          field('name', choice(
            $.ini_parameter,
            $.named_variable
          )),
          "=",
          field('expression', $.operational_expression),
          $._newline
        ),
        seq(
          field('name', $._limited_resource_operand),
          '=',
          field('expression', $.resource_usage_expression),
          $._newline
        )
      )
    ),

    // adapted from tree-sitter-lua
    _block: ($) => repeat1(choice(
      $.setting_statement,
      $.primary_statement
    )),

    // adapted from tree-sitter-lua
    conditional_statement: $ => seq(
      $.if_statement,
      repeat(field('alternative', $.elseif_statement)),
      optional(field('alternative', $.else_statement)),
      alias($._endif, 'endif'),
      $._newline
    ),

    if_statement: $ => seq(
      alias($._if, 'if'),
      field('condition', $.operational_expression),
      $._newline,
      field('consequence', alias(optional($._block), $.block))
    ),

    // adapted from tree-sitter-lua
    elseif_statement: $ => seq(
      choice(alias($._elif, 'elif'), alias($._elseif, 'else if')),
      field('condition', $.operational_expression),
      $._newline,
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

    execution_modifier: $ => choice(
      alias($._pre, 'pre'),
      alias($._post, 'post')
    ),

    run_instruction: $ => seq(
      optional($.execution_modifier),
      alias(/run/i, $.instruction),
      '=',
      $._callable_section,
      $._newline
    ),

    check_texture_override_instruction: $ => seq(
      optional($.execution_modifier),
      alias(/checktextureoverride/i, $.instruction),
      '=',
      $._resource_operand,
      $._newline
    ),

    preset_instruction: $ => seq(
      optional($.execution_modifier),
      alias(/(?:exclude_)?preset/i, $.instruction),
      '=',
      choice(
        alias($._useable_section_identifier, $.preset_section_identifier),
        $.preset_section_identifier
      ),
      $._newline
    ),

    handling_instruction: $ => seq(
      optional($.execution_modifier),
      alias(/handling/i, $.instruction),
      '=',
      // field('fixed_value', alias(/(skip|abort)/i, $.handling_key_value)),
      field('fixed_value', alias($.fixed_value, $.handling_key_value)),
      $._newline
    ),

    reset_instruction: $ => seq(
      optional($.execution_modifier),
      alias(/reset_per_frame_limits/i, $.instruction),
      '=',
      repeat1(choice(
        $._resource_operand,
        $.callable_customshader
      )),
      $._newline
    ),

    clear_instruction: $ => seq(
      optional($.execution_modifier),
      alias(/clear/i, $.instruction),
      '=',
      repeat1(choice(
        $._resource_operand,
        alias(/0x[a-f0-9]+/i, $.hex_integer),
        $._static_value, // numeric constant + inf and NaN
        // field('fixed_value', alias(/(int|depth|stencil)/i, $.clear_instruction_key_value))
        field('fixed_value', alias($.fixed_value, $.clear_instruction_key_value))
      )),
      $._newline
    ),

    stereo_instruction: $ => seq(
      optional($.execution_modifier),
      alias(/(?:separation|convergence)/i, $.instruction),
      '=',
      $._static_value, // numeric constant + inf and NaN
      $._newline
    ),

    dme_instruction: $ => seq(
      optional($.execution_modifier),
      alias(/direct_mode_eye/i, $.instruction),
      '=',
      // field('fixed_value', alias(/(mono|left|right)/i, $.dme_instruction_key_value)),
      field('fixed_value', alias($.fixed_value, $.dme_instruction_key_value)),
      $._newline
    ),

    analysis_instruction: $ => seq(
      optional($.execution_modifier),
      alias(/analyse_options/i, $.instruction),
      '=',
      $.frame_analysis_option_list,
      $._newline
    ),

    dump_instruction: $ => seq(
      optional($.execution_modifier),
      alias(/dump/i, $.instruction),
      '=',
      $.dump_instruction_value_list,
      $._newline
    ),

    special_instruction: $ => seq(
      optional($.execution_modifier),
      alias(/special/i, $.instruction),
      '=',
      // field('fixed_value', alias(
      //   /(upscaling_switch_bb|draw_3dmigoto_overlay)/i,
      //   $.special_instruction_key_value
      // )),
      field('fixed_value', alias($.fixed_value, $.special_instruction_key_value)),
      $._newline
    ),

    store_instruction: $ => seq(
      optional($.execution_modifier),
      alias(/store/i, $.instruction),
      '=',
      $.named_variable,
      ',',
      $.resource_usage_expression,
      ',',
      $.integer,
      $._newline
    ),

    draw_instruction: $ => seq(
      optional($.execution_modifier),
      alias(/draw/i, $.instruction),
      '=',
      choice(
        // field('fixed_value', alias(/(auto|from_caller)/i, $.draw_instruction_key_value)),
        field('fixed_value', alias($.fixed_value, $.draw_instruction_key_value)),
        list_seq($.operational_expression, ',')
      ),
      $._newline
    ),

    drawindexed_instruction: $ => seq(
      optional($.execution_modifier),
      alias(/drawindexed(?:instanced)?/i, $.instruction),
      '=',
      choice(
        // field('fixed_value', alias(/auto/i, $.draw_instruction_key_value)),
        field('fixed_value', alias($.fixed_value, $.draw_instruction_key_value)),
        list_seq($.operational_expression, ',')
      ),
      $._newline
    ),

    drawinstanced_dispatch_instruction: $ => seq(
      optional($.execution_modifier),
      alias(/(?:drawinstanced|dispatch)/i, $.instruction),
      '=',
      list_seq($.operational_expression, ','),
      $._newline
    ),

    drawindirect_instruction: $ => seq(
      optional($.execution_modifier),
      alias(/(?:drawinstanced|drawindexedinstanced|dispatch)indirect/i, $.instruction),
      '=',
      alias(seq($._resource_operand, ',', $.integer), $.resource_offset_expression),
      $._newline
    ),

    drawauto_instruction: $ => seq(
      optional($.execution_modifier),
      alias(/drawauto/i, $.instruction),
      $._newline
    ),

    // EXPRESSIONS

    list_expression: $ => choice(
      $.resource_usage_expression,
      $.resource_data_array_expression,
      $.blend_expression,
      $.frame_analysis_option_list
    ),

    // written to guarantee 2 or more desired nodes
    key_binding_expression: $ => seq(
      choice(
        $.key_binding_modifier,
        $._exception_character,
        $.free_text
      ),
      repeat1(
        choice(
          $.key_binding_modifier,
          $._exception_character,
          $.free_text
        )
      )
    ),

    _exception_character: $ => alias(token(prec(1, choice(';', '=', '/', '\\'))), $.exception_character),

    key_binding_modifier: _ => /(?:(?:no_)?(?:vk_)?(?:ctrl|alt|shift|windows)|no_modifiers)/i,

    resource_data_array_expression: $ => seq(
      optional(alias(dxgi_types_regex, $.resource_format)),
      $.numeric_constant,
      repeat1($.numeric_constant)
    ),

    // resource_operational_expression: $ => choice(
    //   prec(2, $.numeric_constant),
    //   $._resource_operand,
    //   $.resource_comparison_expression,
    //   $.parenthesized_resource_comparison_expression
    // ),

    resource_usage_expression: $ => seq(
      repeat($.resource_modifier),
      $._resource_operand,
      repeat($.resource_modifier)
    ),

    // resource_comparison_expression: $ => choice(
    //   ...[
    //     ['||', PREC.OR],
    //     ['&&', PREC.AND],
    //     ['<', PREC.COMPARE],
    //     ['<=', PREC.COMPARE],
    //     ['>=', PREC.COMPARE],
    //     ['>', PREC.COMPARE],
    //     ['===', PREC.EQUALITY],
    //     ['==', PREC.EQUALITY],
    //     ['!==', PREC.EQUALITY],
    //     ['!=', PREC.EQUALITY],
    //   ].map(([operator, precedence]) =>
    //     prec.left(
    //       precedence,
    //       seq(
    //         field('left', $.resource_operational_expression),
    //         // @ts-ignore
    //         field('operator', operator),
    //         field('right', $.resource_operational_expression)
    //       )
    //     )
    //   )
    // ),

    // parenthesized_resource_comparison_expression: $ => seq(
    //   '(',
    //   $.resource_operational_expression,
    //   ')'
    // ),

    resource_modifier: _ => /(copy(?:_desc(?:ription)?)?|ref(?:erence)?|raw|stereo|mono|stereo2mono|set_viewport|no_view_cache|resolve_msaa|unless_null)/i,

    _resource_operand: $ => choice(
      $._language_variable,
      $.resource_identifier,
      $.custom_resource
    ),

    _limited_resource_operand: $ => choice(
      $._limited_language_variable,
      $.resource_identifier,
      $.custom_resource
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

    blend_expression: $ => choice(
      field('operator', alias(/disable/i, $.blend_operator)),
      seq(
        field('operator', alias(/(add|(?:rev_)?subtract|min|max)/i, $.blend_operator)),
        $.blend_factor,
        $.blend_factor
      )
    ),

    blend_factor: _ => /(zero|one|(?:inv_)?(?:src1?|dest)_(?:color|alpha)|src_alpha_sat|(?:inv_)?blend_factor)/i,

    frame_analysis_option_list: $ => repeat1($.frame_analysis_option),

    dump_instruction_value_list: $ => repeat1(choice($._resource_operand, $.frame_analysis_option)),

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

    static_list_expression: $ => list_seq($._static_value, ','),

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
      $._limited_resource_operand,
      $.shader_identifier,
      $.scissor_rectangle,
      $.override_parameter
    ),

    _language_variable: $ => choice(
      alias(/(?:[vhdgpc]s-cb\d\d?|vb\d|ib|(?:[rf]_)?bb)/i, $.buffer_variable),
      alias(/(?:[pc]s-u\d|s?o\d|od|[vhdgpc]s(?:-t\d\d?\d?))/i, $.shader_variable),
      prec(1, $.shader_identifier)
    ),

    _limited_language_variable: $ => choice(
      alias(/(?:[vhdgpc]s-cb\d\d?|vb\d|ib|(?:[rf]_)?bb)/i, $.buffer_variable),
      alias(/(?:[pc]s-u\d|s?o\d|od|[vhdgpc]s(?:-t\d\d?\d?))/i, $.shader_variable)
    ),

    resource_identifier: $ => choice(
      token(/(?:this|(?:ini|stereo)params|cursor_(?:mask|color))/i),
      $.null
    ),

    custom_resource: $ => seq(
      // alias(/Resource/i, $.resource_prefix),
      alias($._customresource_header_prefix, $.resource_prefix),
      seq(
        optional(seq(
          alias($._namespace_resolution_start, '\\'),
          alias($._namespace_resolution_content, $.namespace),
          alias($._namespace_resolution_end, '\\')
        )),
        alias(custom_resource_section_name, $.section_identifier)
      )
    ),

    named_variable: $ => seq(
      '$',
      optional(seq(
        alias($._namespace_resolution_start, '\\'),
        alias($._namespace_resolution_content, $.namespace),
        alias($._namespace_resolution_end, '\\')
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

    static_override_parameter: _ => /(sli|hunting|frame_analysis|stereo_(?:active|available))/i,
    
    _callable_section: $ => choice(
      $.callable_commandlist,
      $.callable_customshader
    ),

    callable_commandlist: $ => seq(
      // alias(/(?:BuiltIn)?CommandList/i, $.callable_prefix),
      alias($._commandlist_callable_prefix, $.callable_prefix),
      $._useable_section_identifier
    ),

    callable_customshader: $ => seq(
      // alias(/(?:BuiltIn)?CustomShader/i, $.callable_prefix),
      alias($._customshader_callable_prefix, $.callable_prefix),
      $._useable_section_identifier
    ),

    preset_section_identifier: $ => seq(
      // alias(/Preset/i, $.preset_prefix),
      alias($._preset_header_prefix, $.preset_prefix),
      $._useable_section_identifier
    ),

    _useable_section_identifier: $ => seq(
      optional(seq(
        alias($._namespace_resolution_start, '\\'),
        alias($._namespace_resolution_content, $.namespace),
        alias($._namespace_resolution_end, '\\')
      )),
      alias(custom_section_name, $.section_identifier)
    ),

    _static_value: $ => choice(
      alias($.static_override_parameter, $.override_parameter),
      alias(/[+-]?(inf|NaN)/i, $.language_constant),
      $.numeric_constant
    ),

    numeric_constant: _ => choice(
      token(/[+-]?\d+(\.\d+)?/i),
      token(/-\.\d+/i), // apparently 3dmigoto allows floats of the form -.56 and the like
    ),

    integer: _ => token(/\d+/i),

    string: _ => seq(
      '"',
      token.immediate(repeat(/[^\x00-\x08\x0a-\x1f\x22\x7f]/)), // exclude: from null to backspace, from \n to unit separator, ", delete
      token.immediate('"')
    ),

    boolean_value: _ => /(?:true|false|yes|no|on|off)/i,

    _path_value: $ => choice(
      alias(path_regex, $.path_key_value),
      alias(file_regex, $.file_key_value)
    ),

    frame_analysis_option: _ => new RustRegex(`(?xi)(
      hold|stereo|mono|
      dump_(?:rt|depth|tex|[cvi]b)|jp(?:s|e?g)|(?:jp(?:s|e?g)_)?dds|buf|txt|desc|clear_rt|persist|
      filename_(?:reg|handle)|log|dump_on_(?:unmap|update)|deferred_ctx_(?:immediate|accurate)|
      share_dupes|symlink|dump_(?:rt|depth|tex)_(?:jps|dds)|dump_[cvi]b_txt)`
    ),

    regex_replacement: _ => choice(
      seq('${', /\w+/i, '}'), // ${identifier}
      seq('$', token.immediate(/\d+/)) // $1, $2, ...
    ),

    character_escape: _ => /\\[a-z\(\)\[\]${}]/i,

    free_text: _ => /[^\\\/="${}\s]+/i,

    fixed_value: _ => token(prec(-1, /[a-z0-9][a-z0-9_]+/i)),

    comment: $ => token(seq(
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
  }
});
