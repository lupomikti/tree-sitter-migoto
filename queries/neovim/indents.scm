(if_statement) @indent.begin

"endif" @indent.end

[
  "endif"
  "elif"
  "else if"
  (elseif_statement)
  "else"
  (else_statement)
] @indent.branch

(comment) @indent.auto

(string) @indent.auto