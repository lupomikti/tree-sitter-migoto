; header
(_
  header: (_
    (_) @prepend_antispace @append_antispace) @prepend_antispace @append_antispace)

; sections
((section) @prepend_delimiter
  (_)
  .
  (#delimiter! "\n\n"))

(
  (preamble)
  .
  (section) @prepend_delimiter
  (#delimiter! "\n\n")
)

; statements
[
  (setting_statement)
  (primary_statement)
  (global_declaration)
  (key_setting_statement)
  (key_assignment_statement)
  (preset_setting_statement)
  (preset_assignment_statement)
  (instruction_statement)
  (if_statement)
  (elseif_statement)
  (else_statement)
  (namespace_declaration)
] @prepend_empty_softline

(key_setting_statement
  value: (key_section_value
    (_) @append_space
    .
    (_)))

(setting_statement_value
  [(free_text) (key_binding_modifier)] @append_space
  .
  [(free_text) (key_binding_modifier)])

(setting_statement_value
  .
  fixed_value: (_
    (resource_format) @append_space)
  (numeric_constant)
  .
  (numeric_constant)) @leaf

; modifier keywords

(global_declaration
  [
    "global"
    "persist"
  ] @append_space)

(local_declaration
  "local" @append_space)

(local_initialisation
  "local" @append_space)

[
  "pre"
  "post"
] @append_space

; operators

(_
  "=" @prepend_space @append_space)

; (_
;   (named_variable) @prepend_space @append_space)

(binary_expression
  operator: _ @prepend_space @append_space)

(unary_expression
  operator: _ @prepend_space)

; indents

"if" @lower_case @append_indent_start @append_space

[
  "elif"
  "else if"
] @lower_case @append_indent_start @prepend_indent_end @append_space

"else" @lower_case @append_indent_start @prepend_indent_end

"endif" @lower_case @prepend_indent_end @prepend_empty_softline

; extras

(comment) @leaf @prepend_empty_softline

(string) @leaf

(
  "," @append_space
  .
  (_)
)