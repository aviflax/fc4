# FC4 Enhancement Proposal EP01: Decoupling the Models and Views

This Enhancement Proposal is:

* By [Avi Flax](https://github.com/aviflax/)
* Part of [a batch of proposals](https://github.com/FundingCircle/fc4-framework/issues/72) being discussed and considered (initially) in October 2018

## Intro

I explained in [the FC4 story](https://engineering.fundingcircle.com/blog/2018/09/07/the-fc4-framework/)  why I started with [Structurizr Express](https://structurizr.com/express), which tightly couples model and view, rather than [Structurizr](https://structurizr.com/), in which they’re decoupled. An additional nuance has come to mind since I wrote that: that approach was sufficiently familiar to me to dive right into it. Those general-purpose GUI-driven diagramming tools with which I had plateaued were document-oriented: in general, each diagram was a single document.

Those diagrams were, in essence, sets of “boxes and lines” — all view, no model. Those tools supported creating only an implicit model, rather than explicit. But [explicit is better than implicit](https://www.python.org/dev/peps/pep-0020/#the-zen-of-python). Not only that, but over time I’ve come to believe that [modeling is fundamental](http://www.chris-granger.com/2015/01/26/coding-is-not-the-new-literacy/). With apologies to [Alan Perlis](http://www.cs.yale.edu/homes/perlis-alan/quotes.html), it is better to have 100 views of one model than 10 views of 10 models.

So now that FC4 is bootstrapped, and we have some experience using it and feeling the pain of multiple redundant implicit models, I’ve finally come around on the idea that we should define a single instance of our model — the “content” — independently of the “presentation” — the views (diagrams).

To give credit where credit is due: when I first demoed the inchoate FC4 framework within Funding Circle multiple people asked why the content and presentation were so closely coupled, or suggested that they shouldn’t be. My response at the time amounted to “maybe, but not now”, and may have been a bit defensive. I think I might have found it a bit deflating, or maybe I protested too much because in my heart I knew it was a really important question and I was just not ready to deal with it.

Now, however, after having worked on fifteen diagrams across two [landscapes](https://fundingcircle.github.io/fc4-framework/methodology/repository.html#directory-structure), and having seen multiple cases of data discrepancies across even that relatively small set of diagrams, and the distractions and friction they cause — well, I’m ready to admit that this improvement is probably overdue.

I actually came to this conclusion on my own, in my gut, a few months ago, and started [a spike](https://github.com/FundingCircle/fc4-framework/pulls?utf8=%E2%9C%93&q=is%3Apr+label%3AEP01+) on a new decoupled data scheme. The spike yielded results that I think are promising, so I’ll describe the approach I took, what’s already working, and what’s left.

To be clear, I’m just describing what I happened to come up with for the spike, without much up-front design on my part. So I’m assuming many of the ideas are flawed, and I’d love some help in identifying and fixing those flaws. Any and all feedback will be greatly appreciated!

## The Current Data Scheme

In the current version of FC4, each diagram exists in [the repository](https://fundingcircle.github.io/fc4-framework/methodology/repository.html) as a pair of files: the YAML source file and the PNG image file. The data within each YAML file is completely self-contained and independent of any other data; as of this moment an FC4 Landscape is a concept only; it isn’t modeled by or represented in any of the data.

## The Decoupled Data Scheme

In this new decoupled data scheme that I’ve been working on, a Landscape consists of two sets of files: a set of YAML files that _together_ define the static model of the systems that make up the landscape, and a set of YAML+PNG files that define and express independent views of the landscape and its systems.

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
fc4 $ tree -L 4
.
├── README.md
├── model
│   ├── systems
│   │   ├── global
│   │   │   ├── external.yaml
│   │   │   └── marketplace-allocator.yaml
│   │   └── uk
│   │       ├── alpaca.yaml
│   │       ├── bank-pool.yaml
│   │       ├── bilcas-uk.yaml
│   │       ├── codas.yaml
│   └── users
│       └── uk
│           ├── external.yaml
│           └── users.yaml
└── views
    ├── global
    │   └── global_investor_api
    │       ├── global_investor_api.yaml
    │       ├── global_investor_api_01_context.png
    │       ├── global_investor_api_02_container.png
    ├── uk
    │   ├── funding_circle_app
    │   │   ├── funding_circle_app.yaml
    │   │   ├── funding_circle_app_01_system_context.png
    │   │   ├── funding_circle_app_02_container.png
    │   ├── uk_system_landscape.png
    │   └── uk_system_landscape.yaml
    └── us
        ├── us_system_landscape.png
        └── us_system_landscape.yaml
```

### Landscapes

* If a repo includes multiple landscapes, they are no longer organized into completely separate directory trees. Instead, because a system might be employed in more than one landscape (which is the case at Funding Circle), each landscape is defined within subdirectories of `model` and `views`, which both support arbitrary hierarchies, see below.

### Models

* Each YAML file under `model` defines one or more systems and/or users
* The directories  `systems`  and `users`  may contain any number of directories and files, nested to any depth.
* Each directory name is applied to the systems and/or users defined within it or any of its ancestors.
	* eg: a system defined in `model/systems/us/accounting/ledger/scheduler.yaml` would automatically have the tags `us`, `accounting`, and `ledger`

Systems are defined with a YAML DSL:

```yaml
name: Marketplace Allocator
description: Allocates the Marketplace
uses:
  Funding Circle App:
    how: consumes from
    via: Kafka topic
```

Each system is defined **once** and each system declares its dependencies.

The above is a simplified example; a real system definition would include definitions of its containers:

```yaml
name: Funding Circle App
description: The original monolith, including customer-facing and internal Web UIs and Web APIs

containers:
  Deferred Job Workers:
    tech: Ruby, Sidekiq
    uses:
      In-Memory Database:
        via: tcip/ip
      Primary Database:
        via: pg
  HTTP Cache for API:
    description: Caches request/response pairs
    tech: Varnish
    uses:
      Request Router:
        how: routes traffic to
        technology: http
  In-Memory Cache:
    description: Helps prevent duplicative work. Maybe used as a session store?
    tech: memcached
    tags: [database]
  In-Memory Database:
    how: For low-durability data accessed very frequently.
    tech: Redis
    tags: [database]
```

and as shown above, each of those containers may also have dependencies  on other containers or systems, and can also have their own tags, descriptions, etc.

Users would be described using a similar DSL.

While it’ll be supported to define all systems in a single file, and all users in a single file, most FC4 models will need to scale beyond two files; all but the smallest models will be recommended to make the files more fine-grained; the standard recommendation will be one entity (system or user) per file, with the exception of external entities.

That said, while most systems and users will be defined in individual files, all the files in the model are evaluated together; they exist in a single shared namespace and any entity in any file can refer to any entity in any other file.

### Views

Every YAML file under `views` defines either one or two views.

I’m thinking that System Context diagrams and Container diagrams should be defined together in a single file, because these two diagrams are not completely independent: they ideally should depict the same external systems, in the same positions. A System Context diagram could be thought of as the collapsed version of a Container diagram, or vice-versa.

Another way to put that might be to say that one can straightforwardly derive a Context diagram from a Container diagram, but the inverse is not true.  Therefore the information in a Context diagram could be thought of as a subset of the information in its corresponding Container diagram; and part of what we’re trying to accomplish here is to avoid duplication of data that leads to fragmentation and drift.

Here’s an example of a System view:

```yaml
system: Funding Circle App

entities: # does not include subject because subject is always in the center
  users:
    Customers and Partners: [2225, 50]
  containers:
    Deferred Job Workers: [3600, 3100]
    HTTP Cache for API: [1900, 1000]
    In-Memory Cache: [1500, 2400]
    In-Memory Database: [2900, 2400]
    Investor API: [2900, 1700]
    Message Processor: [1500, 3100]
    PHP Middle Tier: [3600, 1700]
    Primary Database: [2200, 2400]
    Request Router: [2700, 1000]
    Ruby Middle Tier: [2200, 1700]
    Scheduled Jobs: [2500, 3100]
    Search Database: [3600, 2400]
  other-systems:
    Alpaca: [700, 100]
    BILCAS-UK: [100, 1300]
    Bank Pool: [100, 100]
    CODAS: [100, 1700]
    CRM Service Layer: [100, 500]
    Dispatcher: [100, 2500]
    Equifax API: [4400, 500]
    Experian API: [4400, 900]
    Marketplace: [100, 900]
    Mobile Apps: [1500, 200]
    RabbitMQ: [100, 2900]
    Transfers: [100, 2100]
    Front-End Web UI: [2900, 200]

control-points: # by view type
  system-context:
    BILCAS-UK: [[1150, 1700]]
    CRM Service Layer: [[1200, 1250]]
    Customers and Partners: [[2600, 1100], [2300, 1100]]
    Investor API: [[2500, 2250]]
    Marketplace: [[1100, 1450]]
    Mobile Apps: [[1750, 750], [1800, 700]]
    PHP Middle Tier: [[3400, 2200]]
    Ruby Middle Tier: [[2850, 2200]]
    Alpaca: [[1500, 1050]]
  container:
    BILCAS-UK:
      Ruby Middle Tier: [[1150, 1700]]
    CRM Service Layer:
      Ruby Middle Tier: [[1200, 1250]]
    Customers and Partners:
      Ruby Middle Tier: [[2600, 1100], [2300, 1100]]
    Investor API:
      Primary Database: [[2500, 2250]]
    Marketplace:
      Ruby Middle Tier: [[1100, 1450]]
    Mobile Apps:
      HTTP Cache for API: [[1750, 750]]
      Request Router: [[1800, 700]]
    PHP Middle Tier:
      Primary Database: [[3400, 2200]]
    Ruby Middle Tier:
      Search Database: [[2850, 2200]]

size: A3_Landscape
```

I’ve tried to make this as lean as possible:

* Relationships do not need to be specified in the view, as they’re already declared within the model (in the `uses` properties)
* Likewise, descriptions, labels, etc are all retrieved from the model
* Styles are not included, as they’re defined (once) in a (single) separate file

Landscape views would be slightly simpler; under `entities` they’d have only `systems` and `users`.

## Usage

If we implement this enhancement while we’re still using Structurizr Express (SE) for graphical editing and image rendering (see the concurrent Enhancement Proposal to implement automated rendering (link coming soon)) then we’ll need a way to transform these new views into SE YAML diagram definitions and then back again, so we can round-trip to and from SE.

This is exactly the kind of thing that [fc4-tool](https://github.com/FundingCircle/fc4-framework/blob/master/tool/README.md) is for, and in fact as part of my spike I’ve already implemented part of this: an [export command](https://github.com/FundingCircle/fc4-framework/blob/master/tool/src/cli/fc4/cli/export.clj) that exports (converts) an FC4 view to a Structurizr Express System Context diagram. That’s obviously only one way, so it wouldn’t support the full workflow, but as a proof-of-concept I’m pretty happy with it.

### Workflow

Since the files developers would be working with would no long be using SE’s native format, the workflow for getting the diagram’s source to and from SE would have to change significantly.

Here’s what I have in mind for the workflows:

#### Editing a View

1. The dev runs a command like `fc4 edit views/us/us_system_landscape.yaml`
2. fc4-tool starts watching that file, and all the model files (assumed by default to be in `./model/`), and the clipboard for changes
3. Assuming the file already contained a valid view, fc4-tool kicks things off by converting it into an SE diagram _and_ copying that into the clipboard
4. The dev:
	1. Opens SE in their browser
	2. Pastes in the diagram YAML
	3. Uses SE to graphically edit the diagram
	4. Copies the updated diagram YAML from SE into their clipboard
5. fc4-tool:
	1. Notices that the contents of the clipboard have changed, and that they contain a valid SE diagram
	2. Converts the SE diagram back into an FC4 view
	3. Writes the updated FC4 view back to the source file being edited
6. The dev:
	1. Exports a PNG image from SE
	2. Saves it next to the view’s YAML file
	3. Commit the changes to the two files with Git

#### Editing the Model

A dev will often find that they need to make changes to the model while they’re working on a view. Or they might make changes to the model and then need to re-render a view’s image files.

This workflow is almost the same as the prior workflow:

1. The dev runs a command like `fc4 edit views/us/us_system_landscape.yaml`
2. fc4-tool starts watching that file, and all the model files (assumed by default to be in `./model/`), and the clipboard for changes
3. Assuming the file already contained a valid view, fc4-tool kicks things off by converting it into an SE diagram _and_ copying that into the clipboard
4. The dev modifies one or more files in the model
5. fc4-tool:
	1. Notices that the model has changed
	2. Updates its in-memory version of the model
	3. Using the updated model, again converts the specified view into an SE diagram and copies that into the clipboard
6. The dev:
	1. Opens SE in their browser
	2. Pastes in the diagram YAML
	3. Uses SE to graphically edit the diagram
	4. Copies the updated diagram YAML from SE into their clipboard
7. fc4-tool:
	1. Notices that the contents of the clipboard have changed, and that they contain a valid SE diagram
	2. Converts the SE diagram back into an FC4 view
	3. Writes the updated FC4 view back to the source file being edited
8. The dev:
	1. Exports a PNG image from SE
	2. Saves it next to the view’s YAML file
	3. Commit the changes to the two files with Git

## Request for Feedback

I feel pretty good about this proposal in its current form, but I’m _sure_ there are ways in which it could be streamlined, simplified, or otherwise significantly improved. Whatever you have in mind, whatever has popped up for you while reading this — please share! FC4 will only be the better for it.

Thank you!
