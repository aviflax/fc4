---
# Cool URLs don’t change: https://www.w3.org/Provider/Style/URI.html
redirect_from:
  - /methodology/authoring_workflow
  - /methodology/authoring_workflow.html
---
# 7. The Authoring Workflow « FC4 User Manual


## Summarized Workflow

1. Run `fc4 -fsrw path/to/repo` to start fc4 watching for changes
1. Create and/or edit diagram YAML files
1. fc4 will automatically [format][formatting], [snap][snapping], and [render][rendering] the
   diagrams
1. Run `git commit` to commit the new/changed files


## Full Workflow

1. Create a new git branch in your local instance of [the diagram repository][repo]
1. In your text editor: either create a new diagram source file or open an existing diagram source
   file
1. In your terminal, run `fc4 -fsrw path/to/repo`
   1. This starts FC4 watching your repository for changes to any diagram source YAML file (or new
      files)
   1. Each file will be [formatted][formatting], [snapped][snapping], and [rendered][rendering] when
      it changes or is created
      1. A future release of the tool will enable users to specify which actions should be performed
1. In your text editor, open a diagram YAML file in one pane and its rendered PNG file in an
   adjacent pane
   1. If the diagram is new then the PNG file won’t exist until you’ve saved the YAML file and
      fc4 has successfully rendered the diagram
1. Edit the diagram YAML by adding/changing elements, relationships, etc, then save the file
   1. This will cause fc4 to [format][formatting], [snap][snapping], and [render][rendering]
      the diagram
   1. Ideally your editor will see the changes the open files and automatically refresh your open
      buffers/windows/tabs so you can immediately see the changes
   1. Continue to edit the YAML, save the file, and observe the changes to the PNG until you’re
      happy with the changes
1. In your terminal, hit `ctrl-c` to stop fc4
1. Use your git UI of choice to commit your changes
1. Push your local changes to the remote repository regularly
1. When you’re ready to submit your changes for review, open a
   [Merge Request](https://docs.gitlab.com/ee/user/project/merge_requests/index.html) or
   [Pull Request](https://help.github.com/articles/about-pull-requests/) to get your changes
   reviewed and then merged into master

Here’s a screenshot of an editor with a diagram open in two panes:

![Screenshot of an editor with a diagram open in two
panes](images/screenshot of an editor with a diagram open in two panes.png)


## Optional: Using Structurizr Express for Graphical Editing

This is optional, but can be very helpful when you need to make broad layout changes, or experiment
quickly with various changes to a layout.

During an editing session as described above, when you have both files of a diagram open in your
editor, you can use [Structurizr Express](https://structurizr.com/help/express) (SE) like so:

1. Select the entire contents of the YAML file in your text editor and cut it into your clipboard
1. Switch to your Web browser and open SE
1. Once SE has loaded, click the YAML tab on the left-hand side of the UI
1. Paste the diagram source into the YAML textarea
1. Press tab to blur the textarea
1. SE will either render the diagram, or display a red error indicator in its toolbar
   1. If SE shows its red error indicator, click the indicator button to bring up a dialog listing
      the errors
1. Use the right-hand side of SE to arrange the elements and edges as desired
   1. Don’t worry about aligning elements precisely; fc4 will take care of this for you
1. Cut the diagram source from the SE YAML textarea into your clipboard
1. Switch back to your editor, paste the diagram source into the YAML file buffer, and save the file
1. fc4 will see that the YAML file has changed, and will process it as described above
   1. NB: the processing includes [snapping][snapping] the elements and vertices of a diagram to a
      virtual grid, which has the effect of precisely aligning elements that had been only roughly
      aligned

Here’s a screenshot of Structurizr Express:

![Screenshot of Structurizr Express](images/screenshot of structurizr express.png)

----

Please continue to [Publishing](/docs/manual/publishing) or go back to [the top page of the manual](/docs/manual).

[formatting]: /docs/features#formatting
[snapping]: /docs/features#snapping
[rendering]: /docs/features#rendering
[repo]: /docs/manual/repository
