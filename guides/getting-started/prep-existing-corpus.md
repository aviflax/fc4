# FC4 Framework » [Getting Started](index.md) » Part 1b: Prep (Existing Corpus)

This page is for [documentarians](http://www.writethedocs.org/documentarians/)
who want to learn how to work on an existing FC4
[corpus](../../concepts.md#corpus). Maybe you’ve joined a new team or
organization, or maybe this is just your first opportunity to work on the
corpus. Either way, you’re in the right place.

(If you need to create a new corpus, please switch to
[Prep (Starting from Scratch)](1a-prep-starting-from-scratch.md).)

## Choose a Subject

Decide which system you want to document.

For the purposes of this guide, we’ll document a system named _Spline
Reticulator_.

<aside>
To get started, you mainly need to be clear on the name of the system. If other
aspects of the system are a little fuzzy — its boundaries, for example — don’t
worry about that; those tend to come into focus through the work of documenting
the subject.
</aside>

## Prep the Repository

As described in [The Repository](../../methodology/repository.md) FC4 diagrams
should be part of a [Git](https://git-scm.com) repository.

Since your team or organization already has an FC4 repository, you’ll need to
make sure you have a local clone of that repo, and that its `master` branch is
up to date

```shell
# If you need to clone the existing repo:
$ git clone https://our-git-host.com/docs.git

# Or if you need to update master branch of a repo you already have a clone of:
$ cd docs && git checkout master && git pull
```

<aside>

* Throughout this guide, we’ll show shell commands with a prompt (`PS1`) set to
  `\w $` which means that the current working directory — the context from
  within which the command is run — is shown to the left of the dollar sign ($)
  while the command itself is to the right of the dollar sign. If you wish to
  copy-and-paste a command into your shell, select the text to the right of the
  dollar sign, and don’t include the dollar sign.

</aside>

### Create a New Git Branch

The [FC4 Authoring Workflow](../../methodology/authoring_workflow.md) uses Git
“feature branches” to prepare, review, and ship changes to the corpus.

```shell
$ git checkout -b spline-reticulator
```

## Identify the Corpus Directory

Determine whether your FC4 corpus directory the root of the Git repo or a
subdirectory within the repo.

For the purposes of this guide, we’ll assume that the corpus directory is a
root-level directory named `fc4`:

```shell
$ cd fc4
```

## fc4-tool

[fc4-tool](../../methodology/toolset.md) performs a variety of functions that
support working with an FC4 corpus.

### Download and Install

1. Download the archive for your platform from the latest release on [the
   releases page](https://github.com/FundingCircle/fc4-framework/releases)
1. Expand the archive
1. Optional but recommended: move the extracted files to somewhere on your $PATH
   1. e.g. `mv ~/Downloads/fc4/fc4* ~/bin/`

### Start

Start fc4-tool:

```shell
~/repos/docs/fc4 $ fc4 edit
```

<aside>

* The tool will check that its working directory is an FC4 corpus and will warn
  if it isn’t
* If you haven’t moved the tool’s files to a directory that’s included in your
  shell’s PATH environment variable, then you’ll need to specify the full path
  to the `fc4` executable

</aside>

----

OK, you’re prepped!

Next up: Part 2, [Model the System](modeling.md)
