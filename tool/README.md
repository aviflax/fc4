# fc4-tool Development and Testing

fc4-tool is a [command-line][cli] tool that supports and facilitates working with
[FC4][fc4-framework] diagrams.

[![CircleCI](https://circleci.com/gh/FundingCircle/fc4-framework.svg?style=shield)](https://circleci.com/gh/FundingCircle/fc4-framework)
[![codecov](https://codecov.io/gh/FundingCircle/fc4-framework/branch/master/graph/badge.svg)](https://codecov.io/gh/FundingCircle/fc4-framework)

This page contains docs for those wishing to work on the tool itself.

For background, installation, and usage of the tool, see [the FC4 website][fc4-tool].


[cli]: https://en.wikipedia.org/wiki/Command-line_interface
[fc4-framework]: https://fundingcircle.github.io/fc4-framework/
[fc4-tool]: https://fundingcircle.github.io/fc4-framework/tool/


## Requirements and Prerequisites

### Required

* Java 11
* Clojure 1.10

### Recommended

* [Docker](https://www.docker.com/)
  * For [running the tests](#running-the-tests)

## Running the Tests

1. Use CI
1. No, seriously, use CI!
1. Just kidding, I know sometimes you need to run the tests locally ;)

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
   1. `bin/download-test-deps`
   1. `bin/tests`

## Starting a REPL for Dev/Test

You _could_ just run `clj` but you’re likely to want the test deps and dev utils to be accessible.
So you’ll probably want to run `clj -A:dev:test`

### Running the tests in a REPL

```shell
$ clj -A:dev:test
Clojure 1.10.0
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
