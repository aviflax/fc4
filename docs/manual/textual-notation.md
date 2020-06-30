---
# Cool URLs don’t change: https://www.w3.org/Provider/Style/URI.html
redirect_from:
  - ../../methodology/textual_notation.html
---
# 2. The Textual Notation « FC4 User Manual

We have a few key requirements for our textual notation:

| We need…                                             | so that…                                                     |
| ---------------------------------------------------- | ------------------------------------------------------------ |
| the _source_ of our diagrams to be textual in nature | we can use Git and GitHub to usefully track the revision history of the diagrams and to conduct effective peer reviews of changes. |
| the source of our diagrams to be _structured data_   | the information of a diagram can be machine-readable and machine-writeable — i.e. so that software tooling can consume and/or generate the information. |
| the source to be human readable and writeable        | people can efficiently and effectively author and review the source of the diagrams. |

For now we are using a [YAML](http://yaml.org) format that meets these requirements. It comes from,
and is supported by, [Structurizr Express](https://structurizr.com/help/express), a tool described
in [The Toolset](./toolset).

The format supports describing:

* The type of the diagram
* The scope (subject) of the diagram
* The elements (vertices) that appear on the diagram
* The relationships (edges) that connect the elements
* Custom styles

Each diagram is manifested as a single YAML file using this format.

You can find a detailed description of the format in [the Structurizr Express
help](https://structurizr.com/help/express).

We don’t currently have a specification for this format, but if we continue using it much longer
we’ll create one.

## Considering the Possible Separation of Content and Presentation

The format we’re currently using is not limited to the semantic definitions of our elements and
their relationships; it also requires that the position of each element be specified, and supports
limited styling directives.

One idea comes up frequently when technical folks see this: maybe we should keep semantic
information (content) separate from presentation information (positions and styles) — e.g. maybe in
two separate files, rather than in a single file.

We have decided not to pursue such an approach *for now*, because:

1. It’d be more complicated.
1. The whole point of this approach is to produce diagrams, which are _visual_ artifacts.
   1. We are producing these visual artifacts because they can be an extremely efficient and
      effective way for people to learn a large amount of high-quality information about systems.
   1. The degree to which these learning experiences are successful — efficient and effective — is
      highly dependent on the expressiveness of the visual elements. In other words, the layout and
      the other visual aspects of a diagram are both critical to the value of the diagram.
   1. Therefore, the presentation-related information is integral and crucial to these diagrams, and
      should not be considered ancillary or secondary.

This is not to rule out the possibility of eventually moving to a different format which might
separate the graph information and presentation information that make up a diagram. We’re just not
going to do so _right now_.

## An Example

This example is by [Simon Brown](http://simonbrown.je/):

```yaml
link__for_use_with: https://structurizr.com/express
link__diagram_scheme_description: https://c4model.com/
---
type: Container
scope: Internet Banking System
description: The container diagram for the Internet Banking System.

elements:
- type: Person
  name: Customer
  description: A customer of the bank.
  position: '525,50'
- type: Software System
  name: Internet Banking System
  description: Allows customers to view information about their bank accounts and make payments.
  tags: Internal
  containers:
  - type: Container
    name: Database
    description: Stores interesting data.
    technology: Relational Database Schema
    tags: Database
    position: '400,1200'
  - type: Container
    name: Web Application
    description: Provides all of the Internet banking functionality to customers.
    technology: Java and Spring MVC
    position: '400,700'
- type: Software System
  name: Mainframe Banking System
  description: Stores all of the core banking information about customers, accounts, transactions, etc.
  tags: Internal
  position: '1600,700'

relationships:
- source: Customer
  description: uses
  destination: Web Application
  technology: HTTPS
- source: Web Application
  description: Reads from and writes to
  destination: Database
  technology: JDBC
- source: Web Application
  description: uses
  destination: Mainframe Banking System
  technology: XML/HTTPS

styles:
- type: element
  tag: Container
  background: '#438dd5'
- type: element
  tag: Database
  shape: Cylinder
- type: element
  tag: Element
  color: '#ffffff'
- type: element
  tag: Person
  background: '#08427b'
  shape: Person
- type: element
  tag: Software System
  background: '#1168bd'

size: A5_Landscape
```

----

Please continue to [The Graphical Notation](./graphical-notation) or go back to
[the top page of the manual](./).
