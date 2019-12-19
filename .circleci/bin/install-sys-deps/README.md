# These scripts

The scripts in this dir install the system dependencies that are needed for a given os, for a given
scenario.

## System deps needed by scenario

Scenario | Description                       | Clojure? | Java?    | Chrome/Chromium?
-------- | --------------------------------- | -------- | -------- | ----------------
`build`  | Building the distribition package | ✓        | ✓ (11+)  |
`lint`   | Linting Clojure code              | ✓        | ✓ (11+)  |
`run`    | Running dist pkg                  |          | ✓ (8+)   | ✓
`test`   | Testing from src                  | ✓        | ✓ (11+)  | ✓
