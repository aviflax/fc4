# fc4-tool

fc4-tool is a [command-line][cli] tool that supports and facilitates working with [FC4](/) diagrams.

While it was initially created to clean up the formatting of diagram source YAML files, its feature
set has expanded over time; it now also “snaps” the elements and vertices in a diagram to a virtual
grid and renders diagrams.

For the backstory of the creation of the framework and tool, see [this blog post][fc4-blog-post].


## Features

The tool has three main features:

### Formatting

When used to create or edit a diagram, [Structurizr Express][structurizr-express] (re)generates the
diagram source YAML in such a way that the YAML becomes noisy and the sorting can change
unpredictably. This makes the source harder to work with in a text editor and impossible to usefully
diff from revision to revision — and without useful diffing it’s very difficult to do effective peer
review. And peer review is a crucial element of the [Docs as Code][docs-as-code] philosophy.

So this feature rewrites diagram YAML files:

* Removes properties with empty/blank values
* Removes extraneous quotes around values that are obviously strings
* Sorts properties and elements using a known and stable sort order

…thereby facilitating the authoring, editing, and reviewing of revisions to the diagrams.

### Snapping

Improves the layout of [Structurizr Express][structurizr-express] diagrams:

* “Snaps” the elements and vertices to a virtual grid
  * i.e. rounds their coordinates
* Adjusts element coordinates if necessary so as to create top and left margins in the diagram
  * i.e. ensures that all elements are at least 50px away from the top/left edges of the canvas
* Offsets the positions of `People` elements so they’ll align properly with other kinds of elements
  (working around a rendering quirk of Structurizr Express)

### Rendering

Given [Structurizr Express][structurizr-express] diagram YAML files, creates image files that
contain the visualization of the diagram.

* The resulting image files are created in the same directory as the YAML file, with the same base
  filename and the appropriate extensions
  * E.G. `docs/spline_reticulator_01_context.yaml` may yield
    `docs/spline_reticulator_01_context.png` and/or `docs/spline_reticulator_01_context.svg`
  * The default output format is PNG but users may specify which format(s) should be rendered
* If an image file already exists it will be overwritten


## Setup

### Quick start for Homebrew users

If you already use [Homebrew][homebrew], one or both of these commands might be  all you need to get
started:

```shell
# If you’re using MacOS and you don’t already have Chromium or Chrome installed:
brew cask install chromium
# If you’re using a different OS and you don’t already have Chromium or Chrome installed
# then install Chromium or Chrome however you generally install such software on your system.

# The main event (should work on any OS that supports Homebrew)
brew install fundingcircle/floss/fc4
```


### Requirements

1. A [Java Runtime Environment (JRE)][adoptopenjdk] or [Java Development Kit (JDK)][adoptopenjdk]
  1. On MacOS if you have [Homebrew](https://brew.sh/) you can run
       `brew cask install adoptopenjdk11-jre`
1. An installation of [Chrome][chrome] or [Chromium][chromium] **70–77** (inclusive)
   1. On MacOS:
      1. If you have [Homebrew](https://brew.sh/) you can run `brew cask install chromium`
      1. Chromium/Chrome must be at either `/Applications/Chromium.app` or
         `/Applications/Google Chrome.app`



### Download and Install

#### With Homebrew

[Homebrew][homebrew] is the recommended installation method for anyone using Linux, MacOS, or
[Windows Subsystem for Linux][wsl]. Please see [Quick start for Homebrew
users](#quick-start-for-homebrew-users) above.

If you don’t already use Homebrew, we recommend you install it and then see [Quick start for
Homebrew users](#quick-start-for-homebrew-users) above.

If you cannot use Homebrew, or would prefer not to, you can [manually](#manually) download and
install the tool:

#### Manually

1. Download the archive for your platform from [the latest release][latest-release]
1. Expand the archive
1. Optional: move the extracted files to somewhere on your `$PATH`
   1. e.g. `mv ~/Downloads/fc4/fc4* ~/bin/`


## Authoring Diagrams

### Abridged Workflow

1. Run in your terminal: `fc4 -fsrw path/to/diagram.yaml/or/dir`
1. Open a YAML file in your text editor and edit it
   1. Either a YAML file specified directly or one in or under a specified directory
1. Whenever you save the file, fc4-tool will see the change, clean up the file (overwriting it) and
   render the diagram to a PNG file (overwriting that file, if it already existed)
1. When you’d like to wrap up your session:
   1. Save the file one last time and wait for fc4-tool to format, snap, and render it
   1. Hit ctrl-c to exit fc4-tool
   1. Run `git status` and you should see that the YAML file has been created/changed and its
      corresponding PNG file has also been created/changed
   1. Commit both files

### Full Workflow

Please see [The Authoring Workflow](../methodology/authoring_workflow.html) section of
[the FC4 Methodology](../methodology/).


## Command Line Interface Reference

Basic usage: `fc4 OPTIONS PATH [PATH...]`

* At least one option and at least one path must be specified
* Paths can be either YAML files or directories (which the tool recursively searches for YAML files)
* Each YAML file is processed according to the [feature options](#feature-options) specified
  * Any combination of `-f | --format`, `-s | --snap`, and `-r | --render` may be specified (at
    least one is required)
* When processing, the tool overwrites files in place:
  * If the [formatting](#formatting) or [snapping](#snapping) features are specified, the YAML file
    will be overwritten in place
  * If the [rendering](#rendering) feature is specified, the image files, if they already exist,
    will be overwritten in place

When invoked with the `-w | --watch` option, instead of immediately processing the diagrams and
exiting, the tool will start up in a persistent mode, watching the YAML files and processing them
when they’re changed. To exit, press ctrl-c on your keyboard.

### Options

#### Feature Options

* The tool has three feature options, one for each of its [major features](#features)
* At least one of these options _must_ be specified with every invocation of the program
  * Any of the feature options may be specified together
* These options may be specified in either long or short form
  * e.g. `fc4 -r my-diagram.yaml` or `fc4 --render my-diagram.yaml` would [render](#rendering) the
    specified diagram
* When specified in short form, the options may be “bundled” together
  * e.g. `fc4 -fsr *.yaml` would [format](#formatting), [snap](#snapping), and [render](#rendering)
    the specified diagrams

##### `-f | --format`

Reformats each specified Structurizr Express YAML file as described [above](#formatting).

##### `-r | --render`

Renders each specified Structurizr Express YAML file as described [above](#rendering).

* The resulting image files are created in the same directory as their corresponding YAML files,
  with the same base filename and, by default, the `png` extension
  * e.g. `docs/spline_reticulator_01_context.yaml` yields `docs/spline_reticulator_01_context.png`
  * Output formats may be specified via `-o | --output-formats`
* If an image file already exists it will be overwritten

##### `-s | --snap`

If specified, elements in diagrams will be [snapped](#snapping) to a virtual grid.

#### Output Formats

##### `-o FORMATS | --output-formats FORMATS`

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

#### Watching

##### `-w | --watch`

If specified, the tool will start up in a persistent mode and watch the YAML files in/under the
specified paths for changes. When a file is changed, the tool will process it according to the
feature options, at least one of which is required. In this mode, the tool does not process any
files when first invoked.

E.g. `fc4 -fsrw .` would watch the current directory and all sub-directories, recursively, for
changes to diagram files; when a change is observed the diagrams, would be [formatted](#formatting),
[snapped](#snapping), and [rendered](#rendering).

#### Other Options

##### `-h | --help`

Prints out usage information and exits.

##### `-d | --debug`

Enables a debug mode of dubious utility.


## Source Code

Like the entire framework, the tool is [Free and Libre Open Source Software (FLOSS)][floss] so its
source code is readily available for review or modification via [its GitHub repository][repo].


[adoptopenjdk]: https://adoptopenjdk.net/installation.html?variant=openjdk11&jvmVariant=hotspot
[chrome]: https://www.google.com/chrome/browser/
[chromium]: https://www.chromium.org/Home
[cli]: https://en.wikipedia.org/wiki/Command-line_interface
[docs-as-code]: https://www.writethedocs.org/guide/docs-as-code/
[fc4-blog-post]: https://engineering.fundingcircle.com/blog/2018/09/07/the-fc4-framework/
[floss]: https://en.wikipedia.org/wiki/Free_and_open-source_software
[homebrew]: https://brew.sh/
[latest-release]: https://github.com/FundingCircle/fc4-framework/releases/latest
[repo]: https://github.com/FundingCircle/fc4-framework
[structurizr-express]: https://structurizr.com/help/express
[wsl]: https://docs.microsoft.com/en-us/windows/wsl/about
