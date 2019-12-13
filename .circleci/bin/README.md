OK, what scripts do we need? What are our situations?

Scenario         | Clojure? | Java 11? | Chromium?
---------------- | -------- | -------- | ---------
Testing from src | ✓        | ✓        | ✓
Linting          | ✓        | ✓        |
Running dist pkg |          |          | ✓

In this context, Java 11 means, as opposed to Java 8, which is what’s installed on the CircleCI
MacOS machines. Where this is unchecked, it means Java 8 is OK and we don’t need to install Java 11.
