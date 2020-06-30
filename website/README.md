# FC4 Website

This directory hosts [the FC4 website][website]. The site is published via
[GitHub Pages][github-pages] and [Jekyll][jekyll].


## Working On The Site

To make changes to the site we use a common GitHub workflow:

1. Create a feature branch in your local repo, from the current tip of the default branch (e.g.
   `main`)
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
   1. Merge it to `main` with the button on the PR page
   1. Delete the feature branch from the GitHub repo
1. At this point someone will have to manually copy the changes over to the `gh-pages` branch, at
   least until we’ve automated that step. Hopefully soon!

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


[fc4-contributors]: https://github.com/FundingCircle/fc4-framework/graphs/contributors
[ghp-config-source]: https://help.github.com/articles/configuring-a-publishing-source-for-github-pages/
[github]: https://github.com/home
[github-pages]: https://pages.github.com
[hello-world-guide]: https://guides.github.com/activities/hello-world/
[homebrew]: https://brew.sh
[jekyll]: https://jekyllrb.com
[jekyll-installation]: https://jekyllrb.com/docs/installation/
[lint-wiki]: https://en.wikipedia.org/wiki/Lint_(software)
[vale]: https://errata-ai.github.io/vale/
[vale-installation]: https://errata-ai.github.io/vale/#installation
[website]: https://fundingcircle.github.io/fc4-framework/
