(setting_section
  header: (setting_section_header) @name
  (#match? @name "(?i)^\\[resource.+")) @definition.class

(commandlist_section
  header: (commandlist_section_header) @name
  (#match? @name "(?i)^\\[commandlist.+")) @definition.function

(commandlist_section
  header: (commandlist_section_header) @name
  (#match? @name "(?i)^\\[customshader.+")) @definition.function

((callable_commandlist) @name) @reference.call

((callable_customshader) @name) @reference.call

((custom_resource) @name) @reference.class
