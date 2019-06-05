# 1. The Scheme « The FC4 Methodology

Before we can start creating diagrams, we need a scheme that guides _what_ we diagram, and _how_ —
e.g. what _set_ of diagrams do we need, how do they fit together, and what should be included in
each one — and what should be left out.

Such a scheme also needs to define a specific set of concepts that will be employed to describe the
subjects.

## The Foundation

This methodology uses [The C4 Model](https://c4model.com), created by [Simon
Brown](http://simonbrown.je), as its foundation.

The [C4 Model website](https://c4model.com) has very detailed definitions, explanations, and
examples; it is the canonical definition of the model. We’ll continue to summarize it here for
convenience, but any errors or ommissions here are our own and the information on the website takes
precedence.

In a nutshell, the C4 Model defines two sets of diagrams: [the core
set](https://c4model.com/#coreDiagrams) and [a supplementary
set](https://c4model.com/#supplementaryDiagrams). FC4 currently includes two of those core diagrams
and two of those supplementary diagrams.

### The Diagrams

The diagrams build on each other, with each successive diagram “zooming in” to a specific element in
the prior diagram.

They are, from the highest level (most zoomed out) to the lowest level (most zoomed in):

| Type          | C4 Category | Description                                                  |
| ------------- | ----------- | ------------------------------------------------------------ |
| System Landscape | [supplementary](https://c4model.com/#supplementaryDiagrams) | “…a high-level map of the software systems at the enterprise level…” Not focused on any specific system; shows the overall landscape of systems within the business. This is the highest possible “zoom level”. |
| Context   | [core](https://c4model.com/#coreDiagrams) | Focuses on a specific system, showing it as a box in the centre, surrounded by its users and the other systems that it interacts with. |
| Container | [core](https://c4model.com/#coreDiagrams) | Shows the separately deployable units that make up a system, the technologies they employ, and how they interact. A "container" is something like a web application, desktop application, mobile app, database, file system, etc. |
| Dynamic          | [supplementary](https://c4model.com/#supplementaryDiagrams) | “…show[s] how elements in a static model collaborate at runtime to implement a user story, use case, feature, etc.” Seems promising for illustrating workflow or dataflow diagrams. |

For the full definitions please see [Core Diagrams](https://c4model.com/#coreDiagrams) and
[Supplementary Diagrams](https://c4model.com/#supplementaryDiagrams).

Anyone using this methodology is of course free to use or not use whichever diagrams they see fit.

----

Please continue to [The Textual Notation](textual_notation.md) or go back to [the top page](README.md).
