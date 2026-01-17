; Keywords
(global_declaration
  [
    "global"
    "persist"
  ] @keyword.storage.type)

(global_initialisation
  [
    "global"
    "persist"
  ] @keyword.storage.type)

(local_declaration
  "local" @keyword.storage.type)

(local_initialisation
  "local" @keyword.storage.type)

(execution_modifier) @keyword.control

(resource_usage_expression
  (resource_modifier) @keyword.control)

[
  "if"
  "elif"
  "else if"
  "else"
  "endif"
] @keyword.control.conditional

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
    (namespace_key) @variable.other.member
    (namespace) @namespace
  ])

(conditional_include_statement
  (condition_key) @variable.other.member)

; Header
(_
  header: (_) @label)

(commandlist_section
  header: _ @function
  (#match? @function "(?i)^\\[\\s*c(ommandlist|ustomshader).+"))

; Keys
(_
  key: (_) @variable.other.member)

; Key Expression Values
(field_expression
  field_name: (field) @variable.other.member)

; Variables
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

(regex_replacement) @variable.parameter

; Constants and Terminals
(_
  fixed_value: (_) @constant.builtin)

(key_binding_modifier) @keyword.control

(resource_type) @type.builtin

(resource_format) @type.enum.variant

(blend_factor) @keyword

(frame_analysis_option) @constant.builtin

(boolean_value) @constant.builtin.boolean

(null) @constant.builtin

(string) @string

[
  (path_key_value)
  (file_key_value)
] @string.special.path

(numeric_constant) @constant.numeric

(language_constant) @constant.builtin

(override_parameter) @constant.builtin

(integer) @constant.numeric.integer

(character_escape) @constant.character.escape

; Functions
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
(comment) @comment.line

(ERROR) @error
