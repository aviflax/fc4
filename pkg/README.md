# `pkg` directory

This directory contains files and resources related to packaging FC4.

Of particular note:

* `dist` contains files that will be included in the FC4 distribution artifacts (packages) that are
  built by `/bin/build-package` — these files are not meant to be run outside of that context!
* `Dockerfile` is intended to simulate fairly closely the CI environment that’s used to build those
  distribution artifacts (as defined in `/.circleci/config.yml`)
  * You can make use of this `Dockerfile` via the script `/bin/docker-pkg-run`
