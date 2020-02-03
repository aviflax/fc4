# This Dockerfile is for running the tests via the script <project-root>/bin/docker-test-run
#
# It’s sub-optimal for _using_ fc4 because fc4 itself has fewer system-level requirements at runtime
# than the tests. Most meaningfully, it does not require Clojure to be installed, because
# it’s packaged as an überjar that includes Clojure. We do however require Clojure, and other
# additional testing libraries, when running the tests from source.

# This base image is documented here: https://circleci.com/docs/2.0/circleci-images/
FROM circleci/openjdk:11-stretch-browsers

# We need to create the working dir explicitly via mkdir, rather than just let WORKDIR create it
# (or it might actually be created lazily by e.g. COPY) because if we let WORKDIR (or maybe COPY)
# create it, it gets created via root with the wrong permissions and then the user that’s used for
# all the RUN commands (circleci) can’t write to it. This is *really* annoying.
USER root
RUN mkdir -p /home/circleci/project && chown -R circleci:circleci /home/circleci

# As long as we’re root, let’s install rlwrap. It’s needed to start an interactive repl via `clj`
RUN apt-get install -qqqyyy rlwrap

# Back to circleci! Why? For consistency with our CI jobs.
USER circleci

WORKDIR /home/circleci/project

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
