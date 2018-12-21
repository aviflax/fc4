# FC4 Framework » [Getting Started](index.md) » Part 4: Styles

Now that we [have a System View](view.md) that’s yielding two diagrams, we
can adjust the styles used in those diagrams to improve the semantics and
aesthetics of those diagrams.

## Create the File

Create a new file to contain your styles:

```shell
~/repos/docs/fc4 $ touch styles.yaml
```

Then open that file in your editor of choice, and paste in this YAML:

```yaml
- type: elements
  tag: internal
  background: '#ad42f4'
- type: relationship
  tag: relationship
  dashed: 'false'
```

## Re-render the Diagrams

Save the file then switch back to the terminal tab in which fc4-tool is running.
You should see output like this:

```
18:19:20 » styles.yaml » valid; re-rendering views...
  » views/spline-reticulator-01-context.png
  » views/spline-reticulator-02-container.png
  ...done.
```

This tells us that fc4-tool has noticed the changes to the file, validated its
contents, and re-rendered all the views in our corpus.

Open `views/spline-reticulator-01-context.png` with the image viewer of your
choice; it should look like this:

**TODO**

As you can see, the diagrams have been re-rendered, and the external system is
now made visually distinct by use of a different color.

----

While there are [more stylistic properties](../../reference/styles.yaml) you can
specify in your `styles.yaml`, there’s not much more to _applying_ styles in
FC4.

Next up: Part 5, [Review and Publish](review-publish.md)
