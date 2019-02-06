# FC4 Framework » [Getting Started](index.md) » Part 4: A System View

Now that we [have a model](modeling.md) defining two systems, one user, and
the connections between them, we can create a [System
View](../../concepts.md#system-view) of our subject system, _Spline
Reticulator_.

<details>
<summary>Expand to skip:</summary>

<!-- TOC depthFrom:2 -->

- [Create the File](#create-the-file)
- [Initial Render: Context Diagram](#initial-render-context-diagram)
- [Container Diagram](#container-diagram)

<!-- /TOC -->

</details>

## Create the File

Create a new file to contain the _System View_ of Spline Reticulator:

```shell
~/repos/docs/fc4 $ touch views/spline-reticulator.yaml
```

Then open that file in your editor of choice, and paste in this YAML:

```yaml
system: Spline Reticulator
elements:
  users:
    Grace Hopper: [100, 900]
  other-systems:
    SplineCheck API: [700, 100]
size: A5_Landscape
```

<aside>

* You might be wondering why the above view YAML doesn’t include coordinates
  for the subject system, _Spline Reticulator_. It’s because in the diagrams
  rendered from System Views, the subject system is always automatically placed
  in the center of the diagram.

</aside>

## Initial Render: Context Diagram

Save the file then switch back to the terminal tab in which fc4-tool is running.
You should see output like this:

```
18:19:20 » views/spline-reticulator.yaml » valid; rendering...
  Warning: styles.yaml not found; using default styles.
  » views/spline-reticulator-01-context.png
  ...done.
```

This tells us that fc4-tool has noticed the changes to the file, validated its
contents, and rendered a [Context diagram](../../concepts.md#context-diagram) as
a PNG file.

Open that diagram file with the image viewer of your choice; it should look like
this:

**TODO**

## Container Diagram

The Context diagram can be very useful on its own, but it’s quite high-level,
and it’s often best to pair a Context diagram with a [Container
diagram](../../concepts.md#container-diagram).

So let’s add some containers to our view:

<!-- TEST FILE: views/spline-reticulator.yaml -->
```yaml
system: Spline Reticulator
elements:
  users:
    Grace Hopper: [100, 900](
  ### ------ this property is new ------
  containers:
    Flux Capacitor: [500, 500](
    Job Queue: [500, 900]
    Main Brain: [500, 1300]
  other-systems:
    SplineCheck API: [700, 100]
size: A5_Landscape
```

Save the file then switch back to the terminal tab in which fc4-tool is running.
You should see output like this:

```
19:20:21 » views/spline-reticulator.yaml » valid; rendering...
  Warning: styles.yaml not found; using default styles.
  » views/spline-reticulator-01-context.png
  » views/spline-reticulator-02-container.png
  ...done.
```

This tells us that fc4-tool has noticed the changes to the file, validated its
contents, and rendered _two_ diagrams as PNG files: the same Context diagram as
before, and a new Container diagram.

Open the Container diagram with the image viewer of your choice; it should look
like this:

**TODO**

----

We now have a pair of diagrams that together provide a comprehensive
introduction to and reference for _Spline Reticulator_.

However, these diagrams are using the default styles, so while they’re minimally
clear and legible, they’re certainly not attractive nor visually welcoming. So
let’s fix this!

Next up: Part 4, [Styles](styles.md)
