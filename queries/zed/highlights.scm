; Keywords
(global_declaration
  [
    "global"
    "persist"
  ] @keyword)

(local_declaration
  "local" @keyword)

(local_initialisation
  "local" @keyword)

[
  "pre"
  "post"
] @keyword

(resource_usage_expression
  (resource_modifier) @keyword)

[
  "if"
  "elif"
  "else if"
  "else"
  "endif"
] @keyword

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
    (namespace) @variant
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
    (namespace) @variant
    (section_identifier) @variable
  ])

(preset_section_identifier
  [
    (preset_prefix)? @label
    "\\" @punctuation.delimiter
    (namespace) @variant
    (section_identifier) @variable
  ])

(_
  variable: (named_variable) @variable)

(_
  name: (named_variable) @variable)

(named_variable
  [
    "$" @variable
    (namespace) @variant
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
] @variable.special

(ini_parameter) @variable.special

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
    ] @constant))

(_
  fixed_value: (fixed_key_value
    [
      (key_binding_modifier) @keyword
      (resource_type) @type
      (resource_format) @enum
    ]))

(key_section_value
  fixed_value: (key_fixed_key_value
    [
      (key_key_value) @constant
      (transition_type_key_value) @constant
    ]))

(key_section_value
  fixed_value: (key_binding_modifier) @keyword)

(preset_section_value
  fixed_value: (transition_type_key_value) @constant)

(handling_instruction
  fixed_value: (handling_key_value) @constant)

(_
  fixed_value: (draw_instruction_key_value) @constant)

(blend_factor) @keyword

(frame_analysis_option) @constant

(boolean_value) @boolean

(null) @constant

(string) @string

(path_value) @string.special

(numeric_constant) @number

(language_constant) @constant

(override_parameter) @constant

(integer) @number

(character_escape) @string.escape

; Functions
(instruction) @preproc

(callable_commandlist
  [
    (callable_prefix) @function
    "\\" @punctuation.delimiter
    (namespace) @variant
    (section_identifier) @function
  ])

(callable_customshader
  [
    (callable_prefix) @function
    "\\" @punctuation.delimiter
    (namespace) @variant
    (section_identifier) @function
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
