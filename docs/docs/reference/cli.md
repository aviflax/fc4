# Command Line Interface (CLI) Reference

Basic usage: `fc4 OPTIONS PATH [PATH...]`

* At least one option and at least one path must be specified
* Paths can be either YAML files or directories (which the tool recursively searches for YAML files)
* Each YAML file is processed according to the [feature options](#feature-options) specified
  * Any combination of `-f | --format`, `-s | --snap`, and `-r | --render` may be specified (at
    least one is required)
* When processing, the tool overwrites files in place:
  * If the [formatting][formatting] or [snapping][snapping] features are specified, the YAML file
    will be overwritten in place
  * If the [rendering][rendering] feature is specified, the image files, if they already exist,
    will be overwritten in place

When invoked with the `-w | --watch` option, instead of immediately processing the diagrams and
exiting, the tool will start up in a persistent mode, watching the YAML files and processing them
when they’re changed. To exit, press ctrl-c on your keyboard.

## Options

### Feature Options

* The tool has three feature options, one for each of its [major features][features]
* At least one of these options _must_ be specified with every invocation of the program
  * Any of the feature options may be specified together
* These options may be specified in either long or short form
  * e.g. `fc4 -r my-diagram.yaml` or `fc4 --render my-diagram.yaml` would [render][rendering] the
    specified diagram
* When specified in short form, the options may be “bundled” together
  * e.g. `fc4 -fsr *.yaml` would [format][formatting], [snap][snapping], and [render][rendering]
    the specified diagrams

#### `-f | --format`

Reformats each specified Structurizr Express YAML file as described [above][formatting].

#### `-r | --render`

Renders each specified Structurizr Express YAML file as described [above][rendering].

* The resulting image files are created in the same directory as their corresponding YAML files,
  with the same base filename and, by default, the `png` extension
  * e.g. `docs/spline_reticulator_01_context.yaml` yields `docs/spline_reticulator_01_context.png`
  * Output formats may be specified via `-o | --output-formats`
* If an image file already exists it will be overwritten

#### `-s | --snap`

If specified, elements in diagrams will be [snapped][snapping] to a virtual grid.

### Output Formats

#### `-o FORMATS | --output-formats FORMATS`

Specifies the output format(s) for rendering diagrams.

* Allowed only when `-r | --render` is specified
* Value must be a character-delimited list of output formats
  * The formats allowed are `png` and `svg`
  * The delimiters allowed are `+` (plus sign) and `,` (comma)
* If not specified, the default is `png`

Here are some examples of valid ways to use this option:

* `-o png`
* `-o svg`
* `-o png+svg`
* `-o svg,png`
* `--output-formats=svg+png`
* `--output-formats png,svg`

### Watching

#### `-w | --watch`

If specified, the tool will start up in a persistent mode and watch the YAML files in/under the
specified paths for changes. When a file is changed, the tool will process it according to the
feature options, at least one of which is required. In this mode, the tool does not process any
files when first invoked.

E.g. `fc4 -fsrw .` would watch the current directory and all sub-directories, recursively, for
changes to diagram files; when a change is observed the diagrams, would be [formatted][formatting],
[snapped][snapping], and [rendered][rendering].

### Other Options

#### `-h | --help`

Prints out usage information and exits.

#### `-d | --debug`

Enables a debug mode of dubious utility.


[features]: /docs/features
[formatting]: /docs/features#formatting
[rendering]: /docs/features#rendering
[snapping]: /docs/features#snapping
