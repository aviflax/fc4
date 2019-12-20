# Test Scripts

This directory contains shell scripts that run tests that can’t be implemented as part of our main
test suite. For example, it’s very tricky to make assertions on the behavior of JVM shutdown hooks
when the assertions are running within the same JVM that’s being shut down.

More details on each script should be included as comments at the top of each script file.
