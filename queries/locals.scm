(section) @local.scope

(block) @local.scope

(local_declaration
  variable: (named_variable) @local.definition.variable)

(local_initialisation
  variable: (named_variable) @local.definition.variable)

(named_variable) @local.reference
