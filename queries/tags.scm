(setting_section
  header: (setting_section_header) @name
  (#not-match? @name "(?i)^\\[\\s*resource.+")) @definition.section

(setting_section
  header: (setting_section_header) @name
  (#match? @name "(?i)^\\[\\s*resource.+")) @definition.class

(commandlist_section
  header: (commandlist_section_header) @name
  (#not-match? @name "(?i)^\\[\\s*(commandlist|customshader).+")) @definition.section

(commandlist_section
  header: (commandlist_section_header) @name
  (#match? @name "(?i)^\\[\\s*(commandlist|customshader).+")) @definition.function

[
  (constants_section)
  (key_section)
  (preset_section)
  (shader_regex_pattern_section)
  (shader_regex_replace_section)
  (shader_regex_declarations_section)
  (shader_regex_commandlist_section)
] @definition.section

((callable_commandlist) @name) @reference.call

((callable_customshader) @name) @reference.call

((custom_resource) @name) @reference.class
