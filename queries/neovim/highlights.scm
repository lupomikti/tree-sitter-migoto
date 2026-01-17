; Keywords
(global_declaration
  [
    "global"
    "persist"
  ] @keyword.type)

(global_initialisation
  [
    "global"
    "persist"
  ] @keyword.type)

(local_declaration
  "local" @keyword.type)

(local_initialisation
  "local" @keyword.type)

(execution_modifier) @keyword.modifier

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
  (#match? @function "^\\[\\s*[Cc]([Oo][Mm][Mm][Aa][Nn][Dd][Ll][Ii][Ss][Tt]|[Uu][Ss][Tt][Oo][Mm][Ss][Hh][Aa][Dd][Ee][Rr]).+"))

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

(regex_replacement) @variable.parameter

; Constants and Terminals
(_
  fixed_value: (_) @constant.builtin)

(key_binding_modifier) @keyword.modifier

(resource_type) @type.builtin

(resource_format) @variable.member

(blend_factor) @keyword

(frame_analysis_option) @constant.builtin

(boolean_value) @boolean

(null) @constant.builtin

(string) @string

[
  (path_key_value)
  (file_key_value)
] @string.special.path

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
