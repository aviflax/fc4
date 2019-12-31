# Enhancement Proposal EP00: Enhancement Proposals

<table>
  <tr>
    <th>EP:</th>
    <td>0</td>
  </tr>
  <tr>
    <th>Title:</th>
    <td>Enhancement Proposals</td>
  </tr>
  <tr>
    <th>Author:</th>
    <td><a href="https://github.com/aviflax">Avi Flax</a></td>
  </tr>
  <tr>
    <th>Status:</th>
    <td>Accepted</td>
  </tr>
  <tr>
    <th>Created:</th>
    <td>2018-12-11</td>
  </tr>
  <tr>
    <th>Note:</th>
    <td></td>
  </tr>
</table>


## Summary

We need a clear, well-documented, and effective process for considering, improving, and deciding on
proposed changes to the framework. We propose a simple process inspired by the Python community’s
[Python Enhancement Proposal (PEP) process](https://www.python.org/dev/peps/pep-0001/).

## Workflow

This proposed workflow is a simplified version of that defined in [PEP 1](https://www.python.org/dev/peps/pep-0001/).

### Starting an Enhancement Proposal (EP)

An author should:

1. Determine the ID number of the EP:
   1. Check this GitHub repository for [open Pull Requests (PRs) with the label `Enhancement
      Proposal`](https://github.com/FundingCircle/fc4-framework/pulls?q=is%3Aopen+is%3Apr+label%3A%22Enhancement+Proposal%22)
      and if any are open, find the highest ID and increment that
   1. If no EP PRs are open, the author can scan the contents of the directory `proposals` to find
      the ID of the most recently published EP and increment that
1. Create a new feature branch off of the latest master
   1. The branch should be named `epXX-shortened-title`, e.g. `ep02-automated-rendering`
1. Create a new directory under `proposals`, e.g. `proposals/ep02-automated-rendering`
1. Create a new file in that directory, e.g.
   `proposals/ep02-automated-rendering/ep02-automated-rendering.html`
   1. Its initial contents should be those of the template below in [Appendix 1](#appendix-1-ep-template),
      with the `$VARIABLES` replaced with actual values
1. Commit the new file
1. Push the branch to the GitHub repo
1. Open a new Pull Request with the label _Enhancement Proposal_
   1. It’s useful to do this now at this point, even though the EP isn’t
      yet ready for review or discussion, in order to reserve the ID number
   1. This may also help by making others aware that you’re working on this EP
   1. Because the PR is not yet ready for review, include the prefix `WIP` in its title
1. Add details to the EP, e.g. exactly what you’re proposing and why, the risks and tradeoffs, etc.

### Discussing and Merging an EP PR

1. Once the EP is ready for review and discussion, remove `WIP` from title of the PR and request
   review from one or more
   [project committers](https://github.com/FundingCircle/fc4-framework/graphs/contributors) and,
   optionally, anyone else you think might have useful feedback
1. If a rough consensus develops around an EP that it should proceed, then:
   1. If it is likely to be implemented shortly then:
      1. The corresponding PR should be kept open until the implementation is merged
      1. Just after the implementation is merged, the EP’s status should be changed to `final` and
         it should be merged
   1. If it’s likely that the implementation will take awhile then:
      1. The EP’s status should be changed to `accepted` and it should be merged at that time,
         before the implementation is completed
      1. The EP’s status should be changed to `final` in a subsequent follow-up PR, after the
         implementation is completed
1. If no rough consensus can be reached, or the rough consensus is that the proposed changes should
   not be implemented, then the status of the EP should be changed to `withdrawn` and it should be
   merged.


## FAQ

### Why use Pull Requests and include the EPs in the repo files?

As opposed to using e.g. GitHub Issues or the repo wiki instead?

Because:

1. Even years after the changes they propose have been implemented, they’ll still have value as
   historical documents; they might prove a fascinating record of the various stages of the
   framework’s evolution and the steps by which it evolved over time.
1. Since they’re Markdown files, they could easily be published in the framework’s website, if we
   choose to do so.
1. Using PRs means that reviewers can comment on individual lines, and in fact entire discussions
   can be conducted within the context of an individual line or (as with issues) on the overall
   entity.
   1. As opposed to GitHub Issues and the repo wiki, neither of which support such detailed and
      specific discussions.

### Appendix 1: EP Template

```markdown
# Enhancement Proposal EPXX: $TITLE

<table>
  <tr>
    <th>EP:</th>
    <td>$ID</td>
  </tr>
  <tr>
    <th>Title:</th>
    <td>$TITLE</td>
  </tr>
  <tr>
    <th>Author:</th>
    <td><a href="$AUTHOR_URL">$AUTHOR_NAME</a></td>
  </tr>
  <tr>
    <th>Status:</th>
    <td>Draft</td>
  </tr>
  <tr>
    <th>Created:</th>
    <td>$CURRENT_DATE</td>
  </tr>
  <tr>
    <th>Note:</th>
    <td></td>
  </tr>
</table>

## Summary

$SUMMARY
```
