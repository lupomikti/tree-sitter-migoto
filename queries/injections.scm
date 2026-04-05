((regex_pattern) @injection.content
  (#set! injection.language "regex"))

((comment) @injection.content
  (#set! injection.language "comment"))

((doc_comment_content) @injection.content
  (#set! injection.language "markdown")
  (#set! injection.combined))
