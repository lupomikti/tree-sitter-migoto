;; Keywords

(global_declaration
  [
    "global"
    "persist"
  ] @keyword.storage.type)

(local_declaration
  "local" @keyword.storage.type)

(local_initialisation
  "local" @keyword.storage.type)

[
  "pre"
  "post"
] @keyword.control

(resource_usage_expression
  (resource_modifier) @keyword.control)

[
  "if"
  "elif"
  "else if"
  "else"
  "endif"
] @keyword.control.conditional

;; Punctuation

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
  expression: "," @punctuation.delimiter)

;; Preamble

(namespace_declaration
[
  (namespace_key) @variable.other.member
  (namespace) @namespace
])

(conditional_include_statement
  (condition_key) @variable.other.member)

;; Header

(_
  header: (_) @label)

(commandlist_section
  header: _ @function
  (#match? @function "^\\[[Cc](ommand[Ll]ist|ustom[Ss]hader).+"))

;; Keys

(_
  key: (_) @variable.other.member)

;; Key Expression Values

(field_expression
  field_name: (field) @variable.other.member)

;; Variables

(custom_resource
[
  (resource_prefix) @label
  "\\" @punctuation.delimiter
  (namespace) @namespace
  (section_identifier) @variable
])

(preset_section_identifier
[
  (preset_prefix)? @label
  "\\" @punctuation.delimiter
  (namespace) @namespace
  (section_identifier) @variable
])

(_
  variable: (named_variable) @variable)

(_
  name: (named_variable) @variable)

(named_variable
[
  "$" @variable
  (namespace) @namespace
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

;; Constants and Terminals

(_
  fixed_value: (fixed_key_value [
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
  fixed_value: (fixed_key_value [
    (blend_operator) @operator
    (blend_factor) @keyword
    (key_binding_modifier) @keyword.control
    (resource_type) @type.builtin
    (resource_format) @type.enum.variant
  ]))

(_
  fixed_value: (key_fixed_key_value [
    (key_key_value) @constant.builtin
    (transition_type_key_value) @constant.builtin
    (key_binding_modifier) @keyword.control
  ]))

(preset_section_value
  fixed_value: (transition_type_key_value) @constant.builtin)

(handling_instruction
  fixed_value: (handling_key_value) @constant.builtin)

(draw_instruction
  fixed_value: (draw_instruction_key_value) @constant.builtin)

(frame_analysis_option) @constant.builtin

(boolean_value) @constant.builtin.boolean

(null) @constant.builtin

(string) @string

(path_value) @string.special.path

(numeric_constant) @constant.numeric

(language_constant) @constant.builtin

(override_parameter) @constant.builtin

(integer) @constant.numeric.integer

;; Functions

(instruction) @function.macro ; just for fun

(callable_commandlist
[
  (callable_prefix) @function.call
  "\\" @punctuation.delimiter
  (namespace) @namespace
  (section_identifier) @function.call
])

(callable_customshader
[
  (callable_prefix) @function.call
  "\\" @punctuation.delimiter
  (namespace) @namespace
  (section_identifier) @function.call
])

;; Operators

"=" @operator

(_ operator: _ @operator)

(field_expression
[
  "*"
  "/"
] @operator)

;; Extras

(comment) @comment.line

(initial_comment) @comment.line

(ERROR) @error
