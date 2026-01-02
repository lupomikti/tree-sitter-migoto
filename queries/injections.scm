((regex_pattern) @injection.content
  (#set! injection.language "regex"))

([
  (comment)
  (initial_comment)
] @injection.content
  (#set! injection.language "comment"))
