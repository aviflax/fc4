# This Dockerfile is intended for running the tests.
#
# It isn’t useful for _using_ the tool because:
#
# * the tool itself has fewer system-level requirements at runtime than the tests
#   * most meaningfully it does not require a JRE or Clojure to be installed
# * but it does requires access to your files.

# This base image is documented here: https://circleci.com/docs/2.0/circleci-images/
FROM circleci/openjdk:11-stretch-browsers

# We need to create the working dir explicitly via mkdir, rather than just let WORKDIR create it
# (or it might actually be created lazily by e.g. COPY) because if we let WORKDIR (or maybe COPY)
# create it, it gets created via root with the wrong permissions and then the user that’s used for
# all the RUN commands (circleci) can’t write to it. This is *really* annoying.
USER root
RUN mkdir -p /home/circleci/tool && chown -R circleci:circleci /home/circleci
USER circleci

WORKDIR /home/circleci/tool

# Install Clojure
COPY bin/install-clojure-linux /home/circleci/
RUN /home/circleci/install-clojure-linux

# Download the deps separately from and prior to copying the app code so that we don’t have to
# re-download deps every time the app code changes.
COPY --chown=circleci:circleci deps.edn ./
COPY --chown=circleci:circleci bin/download-test-deps bin/
RUN bin/download-test-deps

# Now copy *all* the code.
COPY --chown=circleci:circleci . ./
