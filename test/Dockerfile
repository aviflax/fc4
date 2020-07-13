# This Dockerfile is for running the tests via the script <project-root>/bin/docker-test-run
#
# It’s sub-optimal for _using_ fc4 because fc4 itself has fewer system-level requirements at runtime
# than the tests. Most meaningfully, it does not require Clojure to be installed, because
# it’s packaged as an überjar that includes Clojure. We do however require Clojure, and other
# additional testing libraries, when running the tests from source.

# This base image is documented here: https://circleci.com/docs/2.0/circleci-images/
FROM circleci/openjdk:11-stretch-browsers

WORKDIR /home/circleci/project

USER root

# Work around some bizarre permissions issue.
RUN chown -R circleci:circleci /home/circleci

# rlwrap is needed to start an interactive repl via `clj`
RUN apt-get install -qqqyyy rlwrap

# Back to circleci! Why? For consistency with our CI jobs.
USER circleci

# Install Clojure
COPY bin/install-clojure-linux /home/circleci/
RUN /home/circleci/install-clojure-linux

# Download the deps separately from and prior to copying the app code so that we don’t have to
# re-download deps every time the app code changes.
COPY --chown=circleci:circleci deps.edn ./
COPY --chown=circleci:circleci bin/download-test-deps bin/
RUN bin/download-test-deps

# We used to copy *all* the code into the image, as the final build step, but then we realized that
# it’d be better to make the code available to containers by “bind mounting a volume” — i.e. mapping
# the project root dir using `docker run -v ...` — this is handled by the script docker-test-run.
#
# This way, we can make changes to the code on the host machine, and those changes are immediately
# “seen” in running containers, without having to restart them, rebuild them, etc. This also means
# we shouldn’t need to rebuild the image nearly as often.
#
# Note, however, that the contents of the working dir may be shadowed by the mounted volume, so e.g.
# the .cpcache dir created by Clojure CLI tools may not be present, e.g. with a fresh clone of the
# project repo. This is mostly OK, because that ephemeral stuff should be fairly easy to recompute;
# and the deps downloaded in the prior step were downloaded to ~/.m2 and ~/.gitlibs so they
# shouldn’t be shadowed.
