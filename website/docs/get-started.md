# Get started with FC4

## Installing FC4

Using [Homebrew][homebrew]:

```shell
brew cask install adoptopenjdk11-jre chromium
brew install fundingcircle/floss/fc4
```

For other methods, please see [the full installation instructions][installation].


## Authoring Diagrams

Abridged workflow:

1. Run in your terminal: `fc4 -fsrw path/to/diagram.yaml/or/dir`
1. Open a YAML file in your text editor and edit it
   1. Either a YAML file specified directly or one in or under a specified directory
1. Whenever you save the file, fc4-tool will see the change, clean up the file (overwriting it) and
   render the diagram to a PNG file (overwriting that file, if it already existed)
1. When you’d like to wrap up your session:
   1. Save the file one last time and wait for fc4-tool to format, snap, and render it
   1. Hit ctrl-c to exit fc4-tool
   1. Run `git status` and you should see that the YAML file has been created/changed and its
      corresponding PNG file has also been created/changed
   1. Commit both files

For the full workflow, please see [The Authoring Workflow][authoring-workflow].


## Next steps

We recommend you review the [user manual][manual].


## Help & Feedback

If you have any questions or feedback please [create an issue][new-issue] and one of the maintainers
will get back to you shortly.


[authoring-workflow]: manual/authoring-workflow
[homebrew]: https://brew.sh/
[installation]: manual/installation
[manual]: manual/index
[new-issue]: https://github.com/FundingCircle/fc4-framework/issues/new
