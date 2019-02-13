# fc4-tool

A tool for reorganizing, restructuring, reformatting, and rendering
[FC4](https://fundingcircle.github.io/fc4-framework/) diagrams.

[![CircleCI](https://circleci.com/gh/FundingCircle/fc4-framework.svg?style=shield)](https://circleci.com/gh/FundingCircle/fc4-framework)
[![codecov](https://codecov.io/gh/FundingCircle/fc4-framework/branch/master/graph/badge.svg)](https://codecov.io/gh/FundingCircle/fc4-framework)

## Purpose

As explained in
[The Toolset](https://fundingcircle.github.io/fc4-framework/methodology/toolset.html) section of
[the FC4 Methodology](https://fundingcircle.github.io/fc4-framework/methodology/):

> This tool was created because when one uses Structurizr Express (SE) to position the elements of a diagram, SE regenerates the diagram source YAML in such a way that the YAML becomes noisy and the sorting can change. This makes the source harder to work with in a text editor and impossible to usefully diff from revision to revision — and without useful diffing it’s very difficult to do effective peer review.
>
> So fc4-tool processes the YAML: cleans it up, applies a stable sort to all properties, removes empty properties, etc — so as to ensure that the changes applied in each revision are very small and specific and all extraneous changes are filtered out. This will hopefully enable effective peer review of revisions to the diagrams.
>
> fc4-tool also:
>
> * “Snaps” the elements and vertices in a diagram to a virtual grid
> * Renders diagrams


## Setup

### Requirements

1. A [Java Runtime Environment (JRE)](https://www.oracle.com/technetwork/java/javase/downloads/jre8-downloads-2133155.html) or [Java Development Kit (JDK)](https://adoptopenjdk.net/)
   1. On MacOS if you have [Homebrew](https://brew.sh/) you can run `brew cask install adoptopenjdk`
1. An installation of [Chrome](https://www.google.com/chrome/browser/) or [Chromium](https://www.chromium.org/Home) **70–72** (inclusive)
   1. On MacOS:
      1. If you have [Homebrew](https://brew.sh/) you can run `brew cask install chromium`
      1. Chromium/Chrome must be at either `/Applications/Chromium.app` or `/Applications/Google Chrome.app`

MacOS quick-start for [Homebrew](https://brew.sh/) users: `brew cask install adoptopenjdk chromium`


### Download and Install

1. Download the archive for your platform from the latest release on [the releases page](https://github.com/FundingCircle/fc4-framework/releases)
1. Expand the archive
1. Optional: move the extracted files to somewhere on your $PATH
   1. e.g. `mv ~/Downloads/fc4/fc4* ~/bin/`


## Authoring Diagrams

### Abridged Workflow

1. Run in your terminal: `fc4 edit path/to/diagram.yaml/or/dir`
1. Open a YAML file in your text editor and edit it
   1. Either a YAML file specified directly or one in or under a specified directory
1. Whenever you save the file, fc4-tool will see the change, clean up the file (overwriting it) and
   render the diagram to a PNG file (overwriting that file, if it already existed)
1. When you’d like to wrap up your session:
   1. Save the file one last time and wait for fc4-tool to process and render it
   1. Hit ctrl-c to exit fc4-tool
   1. Run `git status` and you should see that the YAML file has been created/changed and its
      corresponding PNG file has also been created/changed
   1. Commit both files

## Full Workflow

Please see [The Authoring Workflow](https://fundingcircle.github.io/fc4-framework/methodology/authoring_workflow.html) section of
[the FC4 Methodology](https://fundingcircle.github.io/fc4-framework/methodology/).


## Requirements and Prerequisites for Development and Testing

### Required

* Java 8/9/10
  * The tool cannot currently compile on Java 11 due to [an incompatibility](https://github.com/circleci/clj-yaml/issues/22) in a dependency of a dependency. Therefore you are recommended to use Java 8, 9, or 10 to develop and/or test the tool.

### Recommended

* [Docker](https://www.docker.com/)
  * For [running the tests](#running-the-tests)

## Running the Tests

1. Use CI
2. No, seriously, use CI!
3. Just kidding, I know sometimes you need to run the tests locally ;)

### With Docker

Run this in your shell:

```bash
bin/docker-test-run bin/tests
```

### Without Docker

If you’re old-school and prefer to run tests on bare metal:

1. Ensure that Clojure, Node, and Chromium/Chrome are installed
   1. On Macos with Homebrew: `brew cask install adoptopenjdk chromium && brew install clojure npm`
1. Run:
   1. `bin/download-all-deps`
   1. `bin/tests`

## Starting a REPL for Dev/Test

You _could_ just run `clj` but you’re likely to want the test deps and dev utils to be accessible.
So you’ll probably want to run `clj -A:dev:test`

### Running the tests in a REPL

```
$ clj -A:dev:test
Clojure 1.9.0
=> (do
     (require '[eftest.runner :refer [find-tests run-tests]])
     (run-tests (find-tests "test") {:fail-fast? true})
     (print (char 7))) ; beep to get your attention
...
```

## Running the Linter

For linting, this project uses [cljfmt](https://github.com/weavejester/cljfmt),
via [cljfmt-runner](https://github.com/JamesLaverack/cljfmt-runner).

* To lint the entire project, run `clojure -A:lint`
* To lint the entire project **and automatically fix any problems found** run
  `clojure -A:lint:lint/fix`
  * This will change the files on disk but will not commit the changes nor stage
    them into the git index. This way you can review the changes that were
    applied and decide which to keep and which to discard.

## Contributors

* [99-not-out](https://github.com/99-not-out)
* [arrdem](https://github.com/arrdem)
* [matthias-margush](https://github.com/matthias-margush)
* [sgerrand](https://github.com/sgerrand)
* [sldblog](https://github.com/sldblog)
* [timgilbert](https://github.com/timgilbert)

Thank you all!

(If you notice that anyone is missing from this list, please open an issue or a PR — thank you!)
