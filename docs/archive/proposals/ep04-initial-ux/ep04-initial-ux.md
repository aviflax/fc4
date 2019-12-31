# FC4 Enhancement Proposal EP04: Improve the Initial UX of fc4-tool

<table>
  <tr>
    <th>EP:</th>
    <td>4</td>
  </tr>
  <tr>
    <th>Title:</th>
    <td>Improve the Initial UX of fc4-tool</td>
  </tr>
  <tr>
    <th>Author:</th>
    <td><a href="https://github.com/aviflax">Avi Flax</a></td>
  </tr>
  <tr>
    <th>Status:</th>
    <td>Final</td>
  </tr>
  <tr>
    <th>Created:</th>
    <td>2018-10-11</td>
  </tr>
  <tr>
    <th>Note:</th>
    <td>Part of <a href="https://github.com/FundingCircle/fc4-framework/issues/72">a batch of
        proposals</a> being discussed and considered (initially) in October 2018</td>
  </tr>
</table>


## Summary

The get-up-and-running experience with fc4-tool is onerous, imposing, and brittle — there are lots
of ways it can go wrong. So let’s make it easier, simpler, friendly, and more robust.

## The Problem

Right now in order to get set up and running with fc4-tool, a user has to install
[Clojure](https://clojure.org/) — via [the new (ish) official
installer](https://clojure.org/guides/getting_started#_clojure_installer_and_cli_tools), rather than
the more popular [Leiningen](https://leiningen.org/) — use [git](https://git-scm.com/) to clone [the
FC4 repository](https://github.com/FundingCircle/fc4-framework), then run an obscure command to
install the dependencies. ([Full
instructions](https://fundingcircle.github.io/fc4-framework/tool/#setup)) This is a lot of hoops to
jump through, and way too big a burden on new users. It’s a clear barrier to entry.

Then there’s speed — or the lack thereof. Installing the dependencies is slow, and then running the
tool is slow — every time.

On my Mac it takes almost 8 seconds just to print out the help for one of the CLI commands:

```shell
tool $ time ./export --help
  -v, --view PATH    Path to FC4 view file (required)
  -m, --model PATH   Path to FC4 model directory (required)
  -s, --styles PATH  Path to FC4 styles file (required)
  -d, --debug        Print out lots of debugging data to stderr (optional)
  -h, --help         Print this summary (optional)

real  0m7.828s
```

…which is just terrible.


## Goals

Let’s make getting up and running with fc4-tool way better:

* New users should be able to download, install, and set up fc4-tool via a single command
* Running fc4-tool should be fast


## Recommended Approach

Build and publish a JAR artifact (an
[UberJAR](https://stackoverflow.com/questions/11947037/what-is-an-uber-jar)) that’d contain
fc4-tool’s code, and all the libraries it depends on, and Clojure, and with all the Clojure code
AOT-compiled.


## Implementation Status

* As of 7 November 2018, the recommended approach has been implemented
* Downloading, installing, and setting up fc4-tool can now be done quickly and fairly easily with 3
  simple commands:

  ```shell
  URL="https://github.com/FundingCircle/fc4-framework/releases/download/master_2018-11-27_678/fc4-linux.tar.gz"
  curl -L -s $URL | tar xzv
  export PATH=$PATH:$PWD/fc4
  ```

  * Users can then run fc4-tool by simply running `fc4 <command>` from any directory
  * Of particular note is that users no longer need to clone the git repository
* Once installed, fc4-tool starts up notably faster than it did before: roughly 6 seconds on my
  system as opposed to the ~8 it generally takes to run from source
* The main pull request that implemented the changes was [#87](https://github.com/FundingCircle/fc4-framework/pull/87)


## Alternative Approaches

Other possible approaches:

* Build and publish native binary fully self-contained executable artifacts using [GraalVM](https://www.graalvm.org/)
  * I tried this but ran into some dead-ends
* Migrate fc4-tool to ClojureScipt and [Node.js](https://nodejs.org/) (as
  [mentioned](https://github.com/FundingCircle/fc4-framework/blob/ep02/proposals/ep02-automated-rendering/ep02-automated-rendering.md#on-clojurescript)
  in [EP02](https://github.com/FundingCircle/fc4-framework/pull/74))
* Publish and maintain a [Homebrew](https://brew.sh/) formula that would download, install, and set
  up a packaged version of fc4-tool
    * After first ensuring that whatever system dependencies are required are installed, such as
      Java, Clojure, Node, ClojureScript, etc
    * Or alternatively perhaps an [npm](https://www.npmjs.com/) package
