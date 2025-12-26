(setting_section
  header: (setting_section_header) @name
  (#match? @name "^\\[[Rr]esource.+")) @definition.class

(commandlist_section
  header: (commandlist_section_header) @name
  (#match? @name "^\\[[Cc]ommand[Ll]ist.+")) @definition.function

(commandlist_section
  header: (commandlist_section_header) @name
  (#match? @name "^\\[[Cc]ustom[Ss]hader.+")) @definition.function

((callable_commandlist) @name) @reference.call

((callable_customshader) @name) @reference.call

((custom_resource) @name) @reference.class