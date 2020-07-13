# Developing and Testing FC4

This page contains docs for those wishing to work on the tool itself.

For background, installation, and usage of the tool, see [the home page](../).


## Requirements

* [Docker][docker] 19.03+
* The environment variable STRUCTURIZR_LICENSE_KEY containing a license key for the
  [on-premisis version of Structurizr][s9r-on-prem] (the free version is sufficient)


## Running the Tests

1. Ensure that Docker is running
1. Ensure that your connection to the Internet is working well
   1. (The first time you run the tests, the Docker containers will be built; this requires
      downloading the Internet.)
1. Run: `STRUCTURIZR_LICENSE_KEY=<REPLACE_ME> bin/tests`


## Starting a REPL for Dev/Test

1. Ensure that Docker is running
1. Ensure that your connection to the Internet is working well
   1. (The first time you run the tests, the Docker containers will be built; this requires
      downloading the Internet.)
1. Run: `STRUCTURIZR_LICENSE_KEY=<REPLACE_ME> bin/repl`


### Running the tests in the REPL

```shell
=> (require '[eftest.runner :refer [find-tests run-tests]])
=> (defn beep [] (print (char 7))) ; to get your attention
=> (do (run-tests (find-tests "test") {:fail-fast? true}) beep)
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


[docker]: https://docker.com/
[s9r-on-prem]: https://structurizr.com/help/on-premises
