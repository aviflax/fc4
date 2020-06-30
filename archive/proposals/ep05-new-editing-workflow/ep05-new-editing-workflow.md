# Enhancement Proposal EP05: Unified Authoring Workflow

<table>
  <tr>
    <th>EP:</th>
    <td>5</td>
  </tr>
  <tr>
    <th>Title:</th>
    <td>Unified Authoring Workflow</td>
  </tr>
  <tr>
    <th>Author:</th>
    <td><a href="https://github.com/aviflax">Avi Flax</a></td>
  </tr>
  <tr>
    <th>Status:</th>
    <td>Final</td>
  </tr>
  <tr>
    <th>Created:</th>
    <td>2018-11-26</td>
  </tr>
  <tr>
    <th>Note:</th>
    <td></td>
  </tr>
</table>


## Summary

The [current authoring workflow](https://fundingcircle.github.io/fc4-framework/methodology/authoring_workflow.html)
is slow, awkward, disjointed, inefficient, and hard to learn:

1. Run `fc4 wcb` to move diagram YAML back-and-forth between YAML file(s) open in your text editor
   and Structurizr Express, using the system clipboard, and clean the file(s) up while doing so.
1. Run `fc4 render path/to/yaml/file(s)` to render the diagram as PNG file(s).
1. Run `git commit` to commit the changes to the YAML and PNG files together.

Now that we’ve recently added automated rendering (see
[EP02](https://github.com/FundingCircle/fc4-framework/pull/74)), we were able to simplify the above
workflow by replacing the manual rendering in step 2 with much simpler automated rendering. In doing
so, implementing `render` as a standalone command that does _only_ rendering was a smart move, but
now that we have it, it’s opened the door to a new
[adjacent possible](https://medium.com/@SeloSlav/what-is-the-adjacent-possible-17680e4d1198): a new
authoring workflow with a single command that integrates the above steps _and_ makes usage of the
clipboard optional rather than required.


## New User Experience (Workflow)

1. The documentarian runs the new `edit` command like so:
   1. `fc4 edit path/to/my_diagram.yaml`
   1. or `fc4 edit all/the/diagrams/in/this/dir also/this/diagram.yaml also/these/*.yaml`
      1. 1–N paths to files or directories may be supplied
      1. Each specified directory will be watched for new or changed YAML files, recursively
1. fc4-tool starts up in a persistent mode, watching those files for changes
1. Whenever one of the watched files is changed, fc4-tool automatically:
   1. Cleans up the YAML in the file
   1. Renders the diagram to a PNG file
      1. In the same directory and with the same name except for the extension
1. When the documentarian is done editing the diagrams, they:
   1. Wait for the last rendering step to complete, if it hasn’t already
   1. Hit ctrl-c in their terminal to shut down fc4-tool
   1. Run `git commit` to commit their changes to the diagrams


## Implementation Status

* I’ve got the new workflow mostly working in the branch
  [ep05-spike](https://github.com/FundingCircle/fc4-framework/tree/ep05-spike)
* I’ve demoed it for a few people and the response has been positive
* Remaining work:
  * More error-handling
  * More automated testing
  * Code cleanup
  * Solicit and incorporate feedback from documentarians based on both this enhancement proposal and
    on the spike
