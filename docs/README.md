# FC4 Website

This directory (`docs`) hosts [the FC4 website][website]. The site is published via
[GitHub Pages][github-pages] and as such is a [Jekyll][jekyll] site.


## Directories

It can be a little confusing that this dir is named `docs` and also contains a dir named `docs`.
I’ll try to explain.

### _This_ directory

This directory is named `docs` because that’s [the only subdirectory name][ghp-config-source] that
GitHub Pages supports when one wants to publish _part_ of a [GitHub][github] repository via GitHub
Pages.

If it were up to me, this dir would be called something like `site` or `gh-pages`, etc.

### The `docs` subdirectory

Most of the pages in the site are in this subdirectory. I did so because the root of the site,
_this_ dir, was getting pretty crowded, what with all the Jekyll [administrative
debris][admin-debris] — it was getting difficult to scan the dir and get a sense of the _content_ of
the site. So I decided to collect most of it into a single directory — this is more or less the
whole point of directories.

Unfortunately, I couldn’t figure out how to get Jekyll to _automatically_ (using
[jekyll-optional-front-matter][jekyll-optional-front-matter]) render the pages _and_ omit the name
of that dir from the URLs. I tried using [Jekyll Collections][jekyll-collections] for this, but
[jekyll-optional-front-matter][jekyll-optional-front-matter] doesn’t support Collections, and I’d
rather not add [Front Matter][jekyll-front-matter] to the top of every `.md` file. So I decided
against using Collections. In the end I decided on a hybrid approach:

* Have most pages in a `docs` subdirectory, have them rendered automatically via
  [jekyll-optional-front-matter][jekyll-optional-front-matter], and have `docs` be the first segment
  in their URL, in the cases where that makes sense
  * Yeah, it’s awkward and confusing to have a `docs/docs` dir, but it seems like the best solution
    to balance all these various priorities/needs. I’m open to suggestions to improve this
    situation!
* Have a few pages/files in the root of this dir (`docs`) if it doesn’t make sense for them to have
  `docs` as the first segment in their URL paths

One exception is `contributing.md` which is a special case; it’s in the root of this dir so that
GitHub will pick up on the file (it has special implications in the context of GitHub). I could have
set a `permalink` property in its front matter to prefix its url with `/docs/` but I chose not to
as it didn’t seem really necessary.


## Working On The Site

To make changes to the site we use a common GitHub workflow:

1. Create a feature branch in your local repo
1. Make some changes to your local repo, [testing them](#testing-changes) **frequently**
1. [Test the changes](#testing-changes)
1. Commit the changes to the local repo
1. [Test the changes](#testing-changes)
1. Push the branch to the GitHub repo
1. Open a Pull Request (PR)
1. Request review of the PR, or wait for it to be reviewed
   1. Most [FC4 committers][fc4-contributors] will be notified automatically that you’ve opened the
      PR
1. Once the PR is approved, you should:
   1. Merge it to master (with the button on the PR page)
   1. Delete the feature branch from the GitHub repo

Most of these steps are described in more detail in GitHub’s [Hello World Guide][hello-world-guide].

### Testing Changes

We have two prongs to our testing strategy: previewing and linting.

#### Previewing the Site

* We use [Jekyll][jekyll] to preview the site locally
* Their [installation instructions][jekyll-installation] are excellent
* From this dir (`docs`) run `bundle exec jekyll serve` then open
  [http://localhost:4000/](http://localhost:4000/)

#### Linting the Prose with Vale

* We use [Vale][vale] to [lint][lint-wiki] our prose
* We run the tool from the root of the repo, rather than the directory `docs`, because there are a
  few other files in the repo that we lint with Vale

##### Installing Vale

* If you’re on MacOS and use [Homebrew][homebrew] you can install Vale by running `brew install vale`
* Otherwise, see [Vale’s installation instructions][vale-installation]

##### Running Vale

1. From the root of the repo, run `bin/lint/lint-prose`


[admin-debris]: https://tomayko.com/blog/2008/administrative-debris
[fc4-contributors]: https://github.com/FundingCircle/fc4-framework/graphs/contributors
[ghp-config-source]: https://help.github.com/articles/configuring-a-publishing-source-for-github-pages/
[github]: https://github.com/home
[github-pages]: https://pages.github.com
[hello-world-guide]: https://guides.github.com/activities/hello-world/
[homebrew]: https://brew.sh
[jekyll]: https://jekyllrb.com
[jekyll-collections]: https://jekyllrb.com/docs/collections/
[jekyll-front-matter]: https://jekyllrb.com/docs/front-matter/
[jekyll-installation]: https://jekyllrb.com/docs/installation/
[jekyll-issue-920]: https://github.com/jekyll/jekyll/issues/920
[jekyll-optional-front-matter]: https://github.com/benbalter/jekyll-optional-front-matter/
[lint-wiki]: https://en.wikipedia.org/wiki/Lint_(software)
[vale]: https://errata-ai.github.io/vale/
[vale-installation]: https://errata-ai.github.io/vale/#installation
[website]: https://fundingcircle.github.io/fc4-framework/
