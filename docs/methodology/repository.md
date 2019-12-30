# 5. The Repository « The FC4 Methodology

## Summary

* Your diagrams — both the source files and the rendered image files — should be hosted in a
  [Git](https://git-scm.com) repository
* You should host a clone of your repository in a Git hosting service with collaboration features,
  such as [GitHub](https://github.com/home), [GitLab](https://about.gitlab.com), or
  [BitBucket](https://bitbucket.org).
  * The specific collaboration features that are needed are those that facilitate peer review, such
    as Pull Requests ([GitHub](https://help.github.com/articles/about-pull-requests/),
    [BitBucket](https://confluence.atlassian.com/bitbucket/work-with-pull-requests-223220593.html))
    or Merge Requests ([GitLab](https://docs.gitlab.com/ee/user/project/merge_requests/))

## Contents & Structure

### Cotenancy with Other Docs, Code, et cetera

This methodology does not specify, and is not concerned with, the question of how your organization
organizes its code and docs into one, a few, or many different repositories — only that all of your
diagrams should live together in the same repo.

There can be lots of other files in the same repo, or you could dedicate a repo to host only your
diagrams — it’s your call.

Some users of the tool host their diagrams in a `docs` repo that hosts cross-domain,
cross-system, or cross-team documentation. In such a case the diagrams might be in a root-level dir
with an imaginative name such as `diagrams`.

### On Storing the Images in the Repository

You may be wondering why the rendered image files are committed to the repo, rather than considered
akin to deployment artifacts that can always be regenerated from the diagram source files, and might
therefore be reasonably considered outside of the set of content that it’s important or advisable to
store in a _source_ control system.

Indeed, storing these files in the repository does tend to balloon the storage size of the
repository; a repository storing only the source for 100 diagrams might be ~10 MB, whereas a
repository storing the source and images for 100 diagrams might be 100 MB or more.

Despite the downsides, it’s still worthwhile to store the images in the repository. The main reason
is that doing so enables seeing the changes made to the diagrams, graphically, via image diffing
features of e.g.
[GitHub](https://help.github.com/articles/rendering-and-diffing-images/#viewing-differences) and
possibly other git hosting services. This can make peer review drastically more effective.

If you prefer to keep your Git repositories svelte, [Git Large File Storage
(LFS)](https://git-lfs.github.com/) should work well with this methodology.

### Directory Structure

* FC4 diagrams are grouped by “landscape”
  * As explained below, this grouping may be explicit or implict
* Each landscape includes:
  * a single [System Landscape](scheme.md) diagram depicting N systems
  * for each of those N systems, a [System Context](scheme.md) diagram and a [Container](scheme.md) diagram
  * optionally, one or more [Dynamic](scheme.md) diagrams
* Most organizations have only a single landscape
  * In this case the landscape directory may be named something general like `diagrams`
* An organization with multiple landscapes should create a directory for each one, grouping them
  together in the same parent directory, e.g. `diagrams`
* Within each landscape directory:
  * The System Landscape diagram is in the root
  * There’s a directory for each system that appears in the System Landscape diagram
  * Within each of those system directories, there’s a System Context Diagram, a Container diagram,
    and 0–N Dynamic diagrams
  * If you have Dynamic diagrams that involve multiple top-level systems, create one or more
    top-level directories to contain them, with names like `dataflow`, `workflow`, etc.
    * It is recommended to keep dataflow diagrams and workflow diagrams distinct; they’re not quite
      the same thing and they both come out better when they’re firmly and deliberately one thing.

### Files

* The above section [Directory Structure](#directory-structure) refers to the _location_ of
  diagrams, but doesn’t address the files themselves.
* Each diagram exists as a _pair_ of files: a YAML file containing its textual source and a PNG file
  containing an image of the diagram.

#### File Names

Here are some recommendations for file names:

<!-- You might be wondering why the table below uses HTML tags as opposed to Markdown. In a
nutshell, it’s because I couldn’t get the formatting quite right when using the table extension
that’s supported by GitHub Flavored Markdown: https://github.github.com/gfm/#tables-extension-

## Rant

If you don’t like seeing HTML tags in a Markdown document, please don’t @me. I believe this is a
correct and proper way to use Markdown.

Markdown is so widely used these days that many people don’t realize that it was never intended to
support tables et al:

> Markdown's syntax is intended for one purpose: to be used as a
> format for *writing* for the web.
>
> Markdown is not a replacement for HTML, or even close to it. Its
> syntax is very small, corresponding only to a very small subset of
> HTML tags. The idea is *not* to create a syntax that makes it easier
> to insert HTML tags. In my opinion, HTML tags are already easy to
> insert. The idea for Markdown is to make it easy to read, write, and
> edit prose. HTML is a *publishing* format; Markdown is a *writing*
> format. Thus, Markdown's formatting syntax only addresses issues that
> can be conveyed in plain text.
>
> For any markup that is not covered by Markdown's syntax, you simply
> use HTML itself. There's no need to preface it or delimit it to
> indicate that you're switching from Markdown to HTML; you just use
> the tags.

https://daringfireball.net/projects/markdown/syntax#html
-->

<table>
  <caption>File Name Recommendations</caption>
  <thead>
    <tr>
      <th>Diagram</th>
      <th>Recommended File Name Mask</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>System Landscape</td>
      <td><code>{landscape}_system_landscape.{yaml|png}</code></td>
    </tr>
    <tr>
      <td>System Context</td>
      <td><code>{system}_01_context.{yaml|png}</code></td>
    </tr>
    <tr>
      <td>Container</td>
      <td><code>{system}_02_container.{yaml|png}</code></td>
    </tr>
    <tr>
      <td>Intra-System Dynamic</td>
      <td><code>{system}_03_{dataflow|workflow}.{yaml|png}</code></td>
    </tr>
    <tr>
      <td>Inter-System Dynamic</td>
      <td><code>{case}_{dataflow|workflow}.{yaml|png}</code></td>
    </tr>
  </tbody>
</table>

* If the diagrams might be published externally, the file names should be prefixed with `{org}_`
* If the org has multiple landscapes, the names of the System Landscape files should be prefixed
  with `{landscape}_` — after the `{org}_` prefix, if present

### Examples

#### An Org with a Single Landscape

```text
$ tree diagrams
diagrams
└── fc4
   ├── README.md
   ├── some_app
   │   ├── some_app_01_system_context.png
   │   ├── some_app_01_system_context.yaml
   │   ├── some_app_02_container.png
   │   └── some_app_02_container.yaml
   │   └── some_app_03_dataflow.png
   │   └── some_app_03_dataflow.yaml
   ├── system_landscape.png
   └── system_landscape.yaml
```

* The `fc4` level in the above hierarchy is optional.

#### An Org with Multiple Landscapes

```text
$ tree diagrams
diagrams
└── fc4
    ├── README.md
    ├── some_landscape
    ├── some_other_landscape
    ├── third_landscape
    │   ├── some_app
    │   │   ├── some_app_01_system_context.png
    │   │   ├── some_app_01_system_context.yaml
    │   │   ├── some_app_02_container.png
    │   │   └── some_app_02_container.yaml
    │   │   ├── some_app_03_dataflow.png
    │   │   └── some_app_03_dataflow.yaml
    │   ├── third_landscape_system_landscape.png
    │   └── third_landscape_system_landscape.yaml
    └── us
```

* The `fc4` level in the above hierarchy is optional.

----

Please continue to [The Authoring Workflow](authoring_workflow.md) or go back to
[the top page](README.md).
