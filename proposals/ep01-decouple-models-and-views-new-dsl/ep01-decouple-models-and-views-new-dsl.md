# FC4 Enhancement Proposal EP01: Decoupling Models and Views with a New DSL

<table>
  <tr>
    <th>EP</th>
    <td>1</td>
  </tr>
  <tr>
    <th>Title</th>
    <td>Decoupling Models and Views with a New DSL</td>
  </tr>
  <tr>
    <th>Author</th>
    <td><a href="https://github.com/aviflax">Avi Flax</a></td>
  </tr>
  <tr>
    <th>Status</th>
    <td>Accepted</td>
  </tr>
  <tr>
    <th>Created</th>
    <td>2018-10-04</td>
  </tr>
  <tr>
    <th>Note</th>
    <td>Part of <a href="https://github.com/FundingCircle/fc4-framework/issues/72">a batch of proposals</a> being discussed and considered (initially) in October 2018</td>
  </tr>
</table>


<details>
<summary>Expand to skip:</summary>

<!-- TOC depthFrom:2 -->

- [Intro](#intro)
- [The Current Data Scheme and DSL](#the-current-data-scheme-and-dsl)
- [The New Data Scheme and DSL](#the-new-data-scheme-and-dsl)
  - [Landscapes](#landscapes)
  - [Models](#models)
    - [Systems](#systems)
    - [Datastores](#datastores)
    - [Users](#users)
    - [Relationships](#relationships)
      - [Keys](#keys)
    - [Files and Directories](#files-and-directories)
    - [Naming Constraints](#naming-constraints)
  - [Views](#views)
    - [System Views](#system-views)
- [Specification](#specification)
  - [DSL](#dsl)
    - [Model](#model)
      - [Root-Level Keys](#root-level-keys)
      - [Common Properties](#common-properties)
      - [Systems](#systems-1)
      - [Users](#users-1)
      - [Datatypes](#datatypes)
      - [Datastores](#datastores-1)
- [Usage](#usage)
  - [Authoring Workflow](#authoring-workflow)
- [Request for Feedback](#request-for-feedback)

<!-- /TOC -->

</details>

## Intro

I explained in [the FC4 story](https://engineering.fundingcircle.com/blog/2018/09/07/the-fc4-framework/)  why I started with [Structurizr Express](https://structurizr.com/express), which tightly couples model and view, rather than [Structurizr](https://structurizr.com/), in which they’re decoupled. An additional nuance has come to mind since I wrote that: that approach was sufficiently familiar to me to dive right into it. Those general-purpose GUI-driven diagramming tools with which I had plateaued were document-oriented: in general, each diagram was a single document.

Those diagrams were, in essence, sets of “boxes and lines” — all view, no model. Those tools supported creating only an implicit model, rather than explicit. But [explicit is better than implicit](https://www.python.org/dev/peps/pep-0020/#the-zen-of-python). Not only that, but over time I’ve come to believe that [modeling is fundamental](http://www.chris-granger.com/2015/01/26/coding-is-not-the-new-literacy/). With apologies to [Alan Perlis](http://www.cs.yale.edu/homes/perlis-alan/quotes.html), it is better to have 100 views of one model than 10 views of 10 models.

So now that FC4 is bootstrapped, and we have some experience using it and feeling the pain of multiple redundant implicit models, I’ve finally come around on the idea that we should define a single instance of our model — the “content” — independently of the “presentation” — the views (diagrams).

To give credit where credit is due: when I first demoed the inchoate FC4 framework within Funding Circle multiple people asked why the content and presentation were so closely coupled, or suggested that they shouldn’t be. My response at the time amounted to “maybe, but not now”, and may have been a bit defensive. I think I might have found it a bit deflating, or maybe I protested too much because in my heart I knew it was a really important question and I was just not ready to deal with it.

Now, however, after having worked on fifteen diagrams across two [landscapes](https://fundingcircle.github.io/fc4-framework/methodology/repository.html#directory-structure), and having seen multiple cases of data discrepancies across even that relatively small set of diagrams, and the distractions and friction they cause — well, I’m ready to admit that this improvement is probably overdue.

I actually came to this conclusion on my own, in my gut, a few months ago, and started [a spike](https://github.com/FundingCircle/fc4-framework/pulls?utf8=%E2%9C%93&q=is%3Apr+label%3AEP01+) on a new decoupled data scheme. The spike yielded results that I think are promising, so I’ll describe the approach I took, what’s already working, and what’s left.

To be clear, I’m just describing what I happened to come up with for the spike, without much up-front design on my part. So I’m assuming many of the ideas are flawed, and I’d love some help in identifying and fixing those flaws. Any and all feedback will be greatly appreciated!

## The Current Data Scheme and DSL

In the current version of FC4, each diagram exists in [the repository](https://fundingcircle.github.io/fc4-framework/methodology/repository.html) as a pair of files: the YAML source file and the PNG image file. The data within each YAML file is completely self-contained and independent of any other data; if a system or a user is included in multiple diagrams, then they must be defined repeatedly and redundantly, which is onerous and tends to lead to data drift and inconsistencies.

## The New Data Scheme and DSL

In this new decoupled data scheme that I’ve been working on, a repo consists of three sets of files:

* a set of YAML files that _together_ define the static model of the subject systems and landscapes
* a set of YAML files that define and express views of those systems
* a set of PNG image files that are the diagrams derived and rendered from the views

An illustration might be better:

```shell
fc4 $ tree -L 1
.
├── model
└── views
```

Not much to see there, but I wanted to emphasize that in this new scheme, the top level of any FC4 corpus would be divided into these two discrete sections.

Let’s take a deeper look:

```shell
$ tree --dirsfirst
.
├── model
│   ├── global
│   │   ├── marketplace
│   │   │   ├── accounting.yaml
│   │   │   ├── money-movements.yaml
│   │   │   ├── loan-manager.yaml
│   │   │   ├── marketplace-allocator.yaml
│   │   │   └── puma.yaml
│   │   ├── external.yaml
│   │   └── users.yaml
│   └── uk
│       ├── alpaca.yaml
│       ├── bank-pool.yaml
│       ├── bilcas-uk.yaml
│       ├── codas.yaml
│       ├── external.yaml
│       └── users.yaml
├── views
│   ├── global
│   │   ├── global_investor_api
│   │   │   ├── global_investor_api.yaml
│   │   │   ├── global_investor_api_01_context.png
│   │   │   ├── global_investor_api_02_container.png
│   │   └── marketplace
│   │       ├── accounting
│   │       │   ├── bilcas-bridge.yaml
│   │       │   └── ledger.yaml
│   │       ├── money-movements
│   │       │   └── finops-kstreams.yaml
│   │       ├── loan-manager.yaml
│   │       ├── marketplace-allocator.yaml
│   │       └── puma.yaml
│   ├── uk
│   │   ├── funding_circle_app
│   │   │   ├── funding_circle_app.yaml
│   │   │   ├── funding_circle_app_01_system_context.png
│   │   │   ├── funding_circle_app_02_container.png
│   │   ├── uk_system_landscape.png
│   │   └── uk_system_landscape.yaml
│   └── us
│       ├── us_system_landscape.png
│       └── us_system_landscape.yaml
└── styles.yaml
```

### Landscapes

* If a repo includes multiple landscapes, they are no longer organized into completely separate directory trees. Instead, because a system might be employed in more than one landscape (which is the case at Funding Circle), each landscape is defined within subdirectories of `model` and `views`, which both support arbitrary hierarchies, see below.

### Models

* Each YAML file under `model` defines one or more systems, users, datatypes, and/or datastores
* `model`  may contain any number of directories and files, nested to any depth
	* Whatever directory hierarchy is used is not meaningful to the framework or any related tools;
	  it’s for the convenience of humans browsing and editing the files.
  * Basically, FC4 tools read all the YAMl files under `model` into memory more or less as if their
    contents were all in a single file.

The DSL allows for defining systems:

```yaml
system:
  Marketplace Allocator:
    description: Allocates the Marketplace
    links:
      docs: https://wiki.internal/path/to/docs
    repos: [marketplace-allocator]
    tags:
      region: global
      domain: marketplace
    uses:
      Funding Circle App:
        to: Double-check positions
    reads-from:
      customers:
        to: look up customer shipping addresses
    writes-to:
      orders:
        to: publish order events
    depends-on:
      Customer Manager:
        via: customers
```

…users:

```yaml
user:
  Checking Account Holders:
    description: Holders of checking accounts with commercial banks.
    links:
      docs: https://wiki.internal/path/to/docs
    tags:
      region: global
```

…datatypes:

```yaml
datatypes:
  customer-profile-update-event:
    description: Updates to Customer profiles, including creation (initial state)
    tags:
      event: true
      shape: record
    links:
      spec: https://github.com/OurOrg/ThisRepo/path/to/spec.clj
      schema: https://schema.registry/events/customer-profile-update
      docs: https://wiki.internal/path/to/docs
    datastore: customer-events
    publishers: [web, mobile]
    subscribers: [analytics]
```

…and datastores:

```yaml
datastores:
  customer-events:
    description: Conveys any and all events that change the state of a customer
    links:
      docs: https://wiki.internal/path/to/docs
    tags:
      type: stream
      tech: Kafka
  customers:
    description: Materialized view providing current state of all customers
    links:
      docs: https://wiki.internal/path/to/docs
    tags:
      type: table
      tech: PostgreSQL
      database: views
    read-by:
      Marketplace Allocator:
        to: look up customer shipping addresses
      Funding Circle App:
        to: look up customer history
    written-by:
      Finops Controller:
        to: update customer profiles
      Customer Portal
        to: log logins
```

Each element is defined **once**, even if it will be used in multiple views.

#### Systems

The above are simplified examples; e.g. a real system definition would include definitions of its
containers:

```yaml
system:
  Funding Circle App:
    description: The original monolith, including customer-facing and internal Web UIs and Web APIs
    tags:
      region: uk
      tech: [Ruby, Rails]
    uses:
      Marketplace Allocator:
        to: Triple-check positions
    containers:
      Deferred Job Workers:
        description: Executes asynchronous jobs.
        uses:
          In-Memory Database:
            protocol: tcip/ip
          Primary Database:
            protocol: pg
        tags:
          tech: [Ruby, Sidekiq]
      HTTP Cache for API:
        description: Caches request/response pairs.
        uses:
          Request Router:
            to: routes traffic to
            protocol: http
        tags:
          tech: Varnish
    datastores:
      In-Memory Cache:
        description: Helps prevent duplicative work. Maybe used as a session store?
        tags:
          tech: memcached
      In-Memory Database:
        description: For low-durability data accessed very frequently.
        tags:
          tech: Redis
```

and as shown above, each of those containers may also have dependencies on other containers or
systems, and can also have their own tags, descriptions, etc.

Systems may also define child datastores and systems under the keys `datastores` and `systems`.
In those cases, the tags of the root-level system are applied to all its child datastores and
systems and all their descendants.

#### Datastores

Many systems include datastores within their boundaries; those should be defined using the
`datastores` property in a system mapping, as in the example above.

Some landscapes also include datastores that exist outside of the boundaries of a system. Some
examples include Kafka topics, Kinesis streams, RDBMS tables, etc.

For these cases, FC4 supports describing datastores as first-class elements using the root-level
model keys `datastore` and `datastores`:

```yaml
datastores:
  customer-events:
    description: Conveys any and all events that change the state of a customer
    tags:
      type: stream
      tech: Kafka
  customers:
    description: Materialized view providing current state of all customers
    tags:
      type: table
      tech: PostgreSQL
      database: views
```

These datastores can then be referenced by system, containers, and datatypes.

#### Users

```yaml
users:
  UK Underwriters:
    description: Sundry analysts, associates, and assistants
    use:
      Loan Master:
        to: View and change loan details
    tags:
      region: uk
      domain: risk
```

#### Relationships

As illustrated above, elements can (and should) have relationships to other elements. When possible,
it’s useful to be specify relationships between systems as being between _containers_ of those
systems; this enables [Container diagrams](#system-views) to depict relationships with useful detail
and specificity.

##### Keys

Relationships may be defined using any of a set of element keys, each of which has slightly
different semantics.

Each of these keys has a singular form and a plural form; the singular form should be used when
defining systems, containers, and datastores; the plural when defining users.

<dl>
  <dt><code>uses</code> / <code>use</code>
  <dd>Implies that the element being defined actively and directly makes use of the target element;
      in general this implies that the interactions are initiated by the element being defined.

  <dt><code>depends-on</code> / <code>depend-on</code>
  <dd>Implies that the element being defined has an _indirect_ dependency on another system — in
      other words, that while the system being defined does not actively initiate direct
      interactions with the target element, the system being defined does depend on the target to
      perform some activity in order for the system being defined to function successfully.

  <dt><code>reads-from</code> / <code>read-from</code>
  <dd>Specifies that the element being defined actively and directly reads from the target element.

  <dt><code>writes-to</code> / <code>write-to</code>
  <dd>Specifies that the element being defined actively and directly writes to the target element.

  <dt><code>read-by</code>
  <dd>Specifies that the element being defined (usually a datastore) is read from by the target
      element(s)

  <dt><code>written-by</code>
  <dd>Specifies that the element being defined (usually a datastore) is written to by the target
      element(s)

  <dt><code>subscribers</code>
  <dd>Specifies that the element being defined (usually a datastore or datatype) is subscribed to by
      the target element(s)

  <dt><code>publishers</code>
  <dd>Specifies that the element being defined (usually a datastore or datatype) is published
      (to) by the target element(s)
</dl>

#### Files and Directories

* Any YAML file under `model` could have a singular [root key](#root-level-keys) and define a single
element, or have a plural root key and define multiple elements.
  * In other words, a model may define 1+ elements in 1+ YAML files.
    * One team may choose to define each element in its own dedicated file, in which case if they
      have 100 elements then they’d have 100 corresponding YAML files under `model`.
    * Another team may choose to define all 100 elements in a single file.
* Teams may also choose to group element files using directory trees according to some scheme
  that’s meaningful to them, e.g. by business unit, business domain, or region.
* Regardless of how many files the systems and users are distributed across, all the files in the
  model are evaluated together; they exist in a single shared namespace and any entity in any file
  can refer to any entity in any other file.
* The definition of an element can also be split across multiple files.
  * This can be helpful when an element (generally a system) has many children, i.e. it contains
    many datatypes, datastores, and/or systems.
  * This is accomplished by starting each file with the usual mapping structure (`system: {name}: {some property}: {its value}`) — each file must contain the root-level `system` key, the value
    of which is a mapping, and that mapping must contain a key that is the name of the system and
    the value being another mapping, with any of the keys that are supported for that kind of
    element.
    * When fc4-tool reads the model it will merge the data from all the files into a single in-memory data structure

#### Naming Constraints

* Because all the elements in a model are defined in a single shared namespace, every element must
  have a unique name
* Containers, however, are named within the context of their systems, and their names must be
  unique only within their system
  * e.g. two systems could each have a container named “cache”

### Views

The whole point of FC4 is to produce diagram images, but some of those diagrams overlap to a large degree, and need to be kept consistent with each other. In order to ensure that such cases are supported with a minimum of duplication, while preventing errors and drift, we’ll introduce an abstraction called a _View_. A view provides the specifications for _one or more_ diagrams; diagrams are derived from, i.e. rendered from, views. Conversely, views yield diagrams.

#### System Views

Context diagrams and Container diagrams are the two diagram types that overlap greatly: they (should) depict the same external systems, in the same positions. A Context diagram could be thought of as the collapsed version of a Container diagram, or vice-versa.

Another way to put that might be to say that one can straightforwardly derive a Context diagram from a Container diagram, but the inverse is not true.  Therefore the information in a Context diagram could be thought of as a subset of the information in its corresponding Container diagram; and part of what we’re trying to accomplish here is to avoid duplication of data that leads to fragmentation and drift.

We’ll call the view that yields these diagrams a _System view_.

Here’s an example of a System view:

```yaml
system: Funding Circle App
size: A3_Landscape

# This key defines which users, systems, and containers are included in the view and the diagrams it
# yields (System Context and Container), and their positions in those diagrams. It does not include
# the subject system because the subject is always in the center.
elements:
  users:
    Customers and Partners: [2225, 50]
  containers:
    Deferred Job Workers: [3600, 3100]
    HTTP Cache for API: [1900, 1000]
    In-Memory Cache: [1500, 2400]
    In-Memory Database: [2900, 2400]
    Investor API: [2900, 1700]
  datastores:
    customers: [5000,5000]
  other-systems:
    Alpaca: [700, 100]
    BILCAS-UK: [100, 1300]
    Bank Pool: [100, 100]
    CODAS: [100, 1700]
    CRM Service Layer: [100, 500]

control-points: # by diagram type
  context:
    BILCAS-UK: [[1150, 1700]]
    CRM Service Layer: [[1200, 1250]]
    Customers and Partners: [[2600, 1100], [2300, 1100]]
    Investor API: [[2500, 2250]]
  container:
    BILCAS-UK:
      Ruby Middle Tier: [[1150, 1700]]
    CRM Service Layer:
      Ruby Middle Tier: [[1200, 1250]]
    Customers and Partners:
      Ruby Middle Tier: [[2600, 1100], [2300, 1100]]
```

I’ve tried to make this as lean as possible:

* Relationships do not need to be specified in the view, as they’re already declared within the model
* Likewise, descriptions, labels, etc are all retrieved from the model
* Styles are not included, as they’re defined (once) in a (single) separate file

Landscape views would be slightly simpler; under `elements` there’d be no `containers`
and under `control-points` there’d be a single set of control points, since only one diagram is
generated from a landscape view.

## Specification

### DSL

#### Model

* A model may consist of 1–N YAML files
* The “root value” of each YAML file must be a YAML “mapping”
  * i.e. a “map”, “hash”, or “dictionary”
* Each YAML file may define 0–N systems, users, datatypes, or datastores
  * Each file must define _at least one_ system, user, datatype, or datastore
  * i.e. each file must define at least 1 element, of any kind

##### Root-Level Keys

The value of each root-level key is a mapping defining one or more elements; each k/v pair is a
mapping from the name of an element to a mapping defining the attributes of the element.

Supported root-level keys are:

<dl>
  <dt><code>system</code></dt>
  <dd>Used to describe a single system. Should contain a single key-value pair.</dd>

  <dt><code>systems</code></dt>
  <dd>Used to describe two or more systems. Should contain at least two key-value pairs.</dd>

  <dt><code>user</code></dt>
  <dd>Used to describe a single user. Should contain a single key-value pair.</dd>

  <dt><code>users</code></dt>
  <dd>Used to describe two or more users. Should contain at least two key-value pairs.</dd>

  <dt><code>datatype</code></dt>
  <dd>Used to describe a single datatype. Should contain a single key-value pair.</dd>

  <dt><code>datatypes</code></dt>
  <dd>Used to describe two or more datatypes. Should contain at least two key-value pairs.</dd>

  <dt><code>datastore</code></dt>
  <dd>Used to describe a single datastore. Should contain a single key-value pair.</dd>

  <dt><code>datastores</code></dt>
  <dd>Used to describe two or more datastores. Should contain at least two key-value pairs.</dd>
</dl>

##### Common Properties

These properties may be used in any element (system, user, or datastore):

<dl>
  <dt><code>description</code></dt>
  <dd>
      String description of the element. May be a sentence fragment, a sentence, or a paragraph.
      Shorter is better.
  </dd>

  <dt><code>tags</code></dt>
  <dd>
    Mapping of tags. Keys must be strings; values may be strings, sequences of strings, or booleans
    (<code>true/false</code>).
  </dd>
</dl>

##### Systems

<big><strong><marquee>TODO</marquee></strong></big>

##### Users

<big><strong><marquee>TODO</marquee></strong></big>

##### Datatypes

<big><strong><marquee>TODO</marquee></strong></big>

##### Datastores

Datastores may be included in views, and are used to derive indirect relationships between systems
and/or components; those relationships _may_ be depicted in diagrams. (The specifics of how and when
that will work are TBD; we may be able to come up with heuristics that enable fc4-tool to do so
automatically, or we may need to add some mechanism to specify this in a view’s YAML definition.)

```yaml
datastores:
  customer-events:
    description: Conveys any and all events that change the state of a customer
    links:
      docs: https://wiki.internal/path/to/docs
    tags:
      type: stream
      tech: Kafka
  customers:
    description: Materialized view providing current state of all customers
    links:
      docs: https://wiki.internal/path/to/docs
    tags:
      type: table
      tech: PostgreSQL
      database: views
```

## Usage

As we use [Structurizr Express](http://structurizr.com/express) (SE) for image rendering, we’ll
need a way to transform these new views into SE YAML diagram definitions so we can use SE to render
diagram images.

This is exactly the kind of thing that
[fc4-tool](https://github.com/FundingCircle/fc4-framework/blob/master/tool/README.md) is for, and
in fact as part of my spike I’ve already implemented part of this: an
[export command](https://github.com/FundingCircle/fc4-framework/blob/master/tool/src/cli/fc4/cli/export.clj)
that exports (converts) an FC4 view to a Structurizr Express System Context diagram. That’s a
one-way export, so it wouldn’t support making changes to a diagram definition in SE and then
importing the definition back into the repo, but as a proof-of-concept I’m pretty happy with it.

### Authoring Workflow

The basic authoring workflow I have in mind is:

1. The [documentarian](http://www.writethedocs.org/documentarians/) runs a command like
   `fc4 edit /path/to/repo`
1. fc4-tool starts watching all the files in the repo for changes (and for new files as well)
1. The documentarian opens a YAML file in their editor, makes changes, and saves the file
1. fc4-tool notices that the file has changed, and:
   1. “cleans up” the YAML file to facilitate peer review, to snap elements to a grid, etc
   1. Re-renders any diagram files that have been invalidated by the change
      1. If a view was changed, then either one or two diagrams will be re-rendered
      1. If a model file was changed, or the styles file, then it’s possible that many, most, or all
         of the diagrams will be re-rendered
1. The documentarian reviews the re-rendered diagrams
1. The documentarian uses Git to commit the changes

The only use case not accounted for here is if/when a user wishes to switch to Structurizr Express
for graphical editing, such as to make many layout changes quickly. We may have to figure out how
to support that.

## Request for Feedback

I feel pretty good about this proposal in its current form, but I’m _sure_ there are ways in which it could be streamlined, simplified, or otherwise significantly improved. Whatever you have in mind, whatever has popped up for you while reading this — please share! FC4 will only be the better for it.

Thank you!
