# This is a style file for markdownlint.
# The format is documented here:
#   https://github.com/markdownlint/markdownlint/blob/master/docs/creating_styles.md
#
# The reference docs for the rules themselves are here:
#   https://github.com/markdownlint/markdownlint/blob/master/docs/RULES.md

all

## Disable ("exclude") some rules

exclude_rule 'MD005' # has issues with ordered lists e.g. https://github.com/markdownlint/markdownlint/issues/139
exclude_rule 'MD012' # I like two blank lines before H2s.
exclude_rule 'MD033' # Inline HTML is fine, IMHO, and sometimes necessary.
exclude_rule 'MD034' # Seems buggy; bunch of false positives.

## Configure some specific rules

# Set max line length to 100, with no max for tables
rule 'MD013', line_length: 100, tables: false

# Allow question marks, colons, and exclamation marks in headers
rule 'MD026', punctuation: '.,;'
