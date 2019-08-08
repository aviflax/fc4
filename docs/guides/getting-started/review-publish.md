# FC4 Framework » [Getting Started](index.md) » Part 6: Review & Publish

<details>
<summary>Expand to skip:</summary>

<!-- TOC depthFrom:2 -->

- [Commit the Changes](#commit-the-changes)
- [Request Review](#request-review)
  - [Rough Workflow](#rough-workflow)
- [Revise](#revise)
- [Merge](#merge)
- [Publish](#publish)
- [Publicize](#publicize)
- [Maintain](#maintain)
- [The End!](#the-end)
- [Further Resources](#further-resources)

<!-- /TOC -->

</details>

## Commit the Changes

```shell
~/repos/docs/fc4 $ git add . \
                     && git commit -a -m 'Model + View for Spline Reticulator'
```

## Request Review

A key goal of FC4 is to make peer review of changes to architecture diagrams
just as easy and effective as it is for code changes. That’s one of the reasons
we’re using Git and a feature branch to manage the changesets.

This step is necessarily fuzzy because I can’t know what system your team uses
for code review.

But I can give you some general guidance that might be helpful if you use one of
the most popular code hosting services.

First, you’ll probably want to push your repository, and your branch, to your
team’s code hosting service.

Then, you’ll want to open/create some kind of pull request, merge request,
review request, etc.

### Rough Workflow

1. Create a remote repository
   ([GitHub](https://help.github.com/articles/creating-a-new-repository/),
   [GitLab](https://docs.gitlab.com/ee/gitlab-basics/create-project.html#push-to-create-a-new-project),
   [BitBucket](https://confluence.atlassian.com/get-started-with-bitbucket/create-a-repository-861178559.html))
1. Link the repositories
   ([GitHub](https://help.github.com/articles/adding-an-existing-project-to-github-using-the-command-line/),
   [GitLab](https://docs.gitlab.com/ee/gitlab-basics/create-project.html#push-to-create-a-new-project),
   [BitBucket](https://www.atlassian.com/git/tutorials/setting-up-a-repository))
1. Push your branch to the remote repo: `$ git push -u origin spline-reticulator`
1. Open a Pull/Merge Request
   ([GitHub](https://help.github.com/articles/creating-a-pull-request/),
   [GitLab](https://docs.gitlab.com/ee/user/project/merge_requests/index.html),
   [BitBucket](https://www.atlassian.com/git/tutorials/making-a-pull-request))
1. Bring the request to your colleague’s attention, however is customary in your
   team

If your team uses a different system and you’re not sure of the workflow, no
worries — just ask one of your teammates to point you towards the docs.

## Revise

Hopefully you’ll get some good feedback via peer review; if you’re lucky, it’ll
be clear feedback that you can act on. If so, run `fc4 edit`, revise your model,
view, and/or styles, and add one or more commits to your branch. (You’ll
probably want to push your new commits to the remote repository, depending on
your team’s process.)

## Merge

Once you’ve received sufficient feedback from your team, and acceptance of your
work if that’s required by your team, then go ahead and merge your changes into
the repository’s master branch — this is often done via the pull/merge/review
request, when applicable. (If you do the merge locally, don’t forget to push
the master branch to the remote repository.)

## Publish

When changing software, it’s [generally ideal](https://www.continuousdelivery.com)
to deploy or release a change as soon as it’s merged into master. In the case of
documentation, the equivalent is to _publish_ the change to wherever the docs
“live” — that is, their canonical location, the place where the audience looks
for and expects to find documentation on the subject
[landscape(s)](../../concepts.md#landscape).

Once again, this step is necessarily fuzzy because I can’t know what system your
team uses for hosting documentation.

That said, I can provide some tips:

* Consider publishing your FC4 corpus as a unit to a single place within your
  documentation hosting system. That can help build awareness that the corpus
  exists, and establish it as the place to go to find architecture diagrams.
* Consider automating the publication of your corpus, so that they’re
  automatically published whenever you merge changes to your master branch.
  * If your documentation isn’t sensitive, you might be interested in
    [GitHub Pages](https://pages.github.com),
    [GitLab Pages](https://docs.gitlab.com/ee/user/project/pages/), or
    [BitBucket’s static website hosting
    feature](https://confluence.atlassian.com/bitbucket/publishing-a-website-on-bitbucket-cloud-221449776.html)
    * A bonus benefit of using one of these systems is that your diagram images
      will be publicly available via a plain old URL, and therefore easily
      sharable and embeddable

## Publicize

Don’t forget to let people know that you’ve published your diagrams! Many teams
aren’t used to even _having_ a canonical set of architecture diagrams that are
useful and can be counted on to be up to date. (By the way, keep your diagrams
up to date 😅)

Whether via a chat post, an email, or a [Discourse](https://www.discourse.org)
thread, spread the word!

## Maintain

As mentioned above, publishing a new diagram for the first time is huge, but
it’s also a beginning. Just as software must be be actively maintained and kept
up-to-date to be relevant and useful, so to documentation. Content should be
[current](http://www.writethedocs.org/guide/writing/docs-principles/#current);
as per [the principles of the Write the Docs
community](http://www.writethedocs.org/guide/writing/docs-principles/#current):
<quote
  cite="http://www.writethedocs.org/guide/writing/docs-principles/#current">
    _Consider incorrect documentation to be worse than missing documentation._
</quote>

## The End!

That’s it, you’ve completed this _Getting Started_ guide — congratulations!

## Further Resources

After some well-earned chill time, you might find some of these resources
useful:

* [Methodology](../../methodology/)
* [FAQ](../../faq/)
* Reference
  * [Concepts](../../reference/concepts.md)
  * [DSL](../../reference/concepts.md)
