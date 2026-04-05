; Keywords
(global_declaration
  [
    "global"
    "persist"
  ] @keyword.modifier)

(global_initialisation
  [
    "global"
    "persist"
  ] @keyword.modifier)

(local_declaration
  "local" @keyword.modifier)

(local_initialisation
  "local" @keyword.modifier)

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
  expression: (_
    "," @punctuation.delimiter))

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
  (#match? @function
    "^\\[\\s*[Cc]([Oo][Mm][Mm][Aa][Nn][Dd][Ll][Ii][Ss][Tt]|[Uu][Ss][Tt][Oo][Mm][Ss][Hh][Aa][Dd][Ee][Rr]).+"))

; Keys
(_
  key: (_) @property)

; Key Expression Values
; apparently nvim doesn't have a specific enum variant highlight and @constant gets used instead
(field_expression
  (match_expression_field) @constant)

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

(regex_replacement_conditional
  "${" @punctuation.special
  (replacement_identifier) @label
  [
    ":-"
    ":+"
  ] @operator
  ":"? @operator
  "}" @punctuation.special)

; Constants and Terminals
; I'd rather this be enum colored like with helix, but no enum capture exists yet
(_
  fixed_value: (_) @constant)

(key_binding_modifier) @keyword.modifier

(resource_type) @type.builtin

(resource_format) @variable.member

(blend_factor) @keyword

; same note here about enum highlights
[
  (frame_analysis_option)
  (marking_actions_option)
] @constant

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

(doc_comment) @comment.documentation

(ERROR) @error
