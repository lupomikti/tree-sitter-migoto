; Keywords
(global_declaration
  [
    "global"
    "persist"
  ] @keyword.type)

(local_declaration
  "local" @keyword.type)

(local_initialisation
  "local" @keyword.type)

[
  "pre"
  "post"
] @keyword.modifier

(resource_usage_expression
  (resource_modifier) @keyword.modifier)

[
  "if"
  "elif"
  "else if"
  "else"
  "endif"
] @keyword.conditional

; Punctuation
[
  "["
  "]"
  "("
  ")"
] @punctuation.bracket

(key_condition_statement
  "," @punctuation.delimiter)

(key_run_instruction
  "," @punctuation.delimiter)

(draw_instruction
  "," @punctuation.delimiter)

(drawindexed_instruction
  "," @punctuation.delimiter)

(drawinstanced_dispatch_instruction
  "," @punctuation.delimiter)

(key_assignment_statement
  expression: (_ "," @punctuation.delimiter))

; Preamble
(namespace_declaration
  [
    (namespace_key) @property
    (namespace) @module
  ])

(conditional_include_statement
  (condition_key) @property)

; Header
(_
  header: (_) @label)

(commandlist_section
  header: _ @function
  (#match? @function "(?i)^\\[c(ommandlist|ustomshader).+"))

; Keys
(_
  key: (_) @property)

; Key Expression Values
(field_expression
  field_name: (field) @property)

; Variables
(custom_resource
  [
    (resource_prefix) @label
    "\\" @punctuation.delimiter
    (namespace) @module
    (section_identifier) @variable
  ])

(preset_section_identifier
  [
    (preset_prefix)? @label
    "\\" @punctuation.delimiter
    (namespace) @module
    (section_identifier) @variable
  ])

(_
  variable: (named_variable) @variable)

(_
  name: (named_variable) @variable)

(named_variable
  [
    "$" @variable
    (namespace) @module
    (variable_identifier) @variable
  ])

(named_variable
  "\\" @punctuation.delimiter)

[
  (buffer_variable)
  (shader_variable)
  (resource_identifier)
  (shader_identifier)
  (scissor_rectangle)
] @variable.builtin

(ini_parameter) @variable.parameter.builtin

(regex_replacement) @variable

; Constants and Terminals
(_
  fixed_value: (fixed_key_value
    [
      (multi_key_value)
      (override_key_value)
      (fuzzy_match_key_value)
      (resource_key_value)
      (system_key_value)
      (device_key_value)
      (rendering_key_value)
      (hunting_key_value)
      (transition_type_key_value)
      (custom_shader_key_value)
    ] @constant.builtin))

(_
  fixed_value: (fixed_key_value
    [
      (blend_operator) @operator
      (blend_factor) @keyword
      (key_binding_modifier) @keyword.modifier
      (resource_type) @type.builtin
      (resource_format) @variable.member
    ]))

(key_section_value
  fixed_value: (key_fixed_key_value
    [
      (key_key_value) @constant.builtin
      (transition_type_key_value) @constant.builtin
    ]))

(key_section_value
  fixed_value: (key_binding_modifier) @keyword.modifier)

(preset_section_value
  fixed_value: (transition_type_key_value) @constant.builtin)

(handling_instruction
  fixed_value: (handling_key_value) @constant.builtin)

(_
  fixed_value: (draw_instruction_key_value) @constant.builtin)

(frame_analysis_option) @constant.builtin

(boolean_value) @boolean

(null) @constant.builtin

(string) @string

(path_value) @string.special.path

(numeric_constant) @number.float

(language_constant) @constant.builtin

(override_parameter) @constant.builtin

(integer) @number

(character_escape) @string.escape

; Functions
(instruction) @function.macro ; just for fun

(callable_commandlist
  [
    (callable_prefix) @function.call
    "\\" @punctuation.delimiter
    (namespace) @module
    (section_identifier) @function.call
  ])

(callable_customshader
  [
    (callable_prefix) @function.call
    "\\" @punctuation.delimiter
    (namespace) @module
    (section_identifier) @function.call
  ])

; Operators
"=" @operator

(_
  operator: _ @operator)

(field_expression
  [
    "*"
    "/"
  ] @operator)

; Extras
(comment) @comment

(ERROR) @error
