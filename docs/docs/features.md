# Features of FC4

FC4 has three main features:

## Formatting

When used to create or edit a diagram, [Structurizr Express][structurizr-express] (re)generates the
diagram source YAML in such a way that the YAML becomes noisy and the sorting can change
unpredictably. This makes the source harder to work with in a text editor and impossible to usefully
diff from revision to revision — and without useful diffing it’s very difficult to do effective peer
review. And peer review is a crucial element of the [Docs as Code][docs-as-code] philosophy.

So this feature rewrites diagram YAML files:

* Removes properties with empty/blank values
* Removes extraneous quotes around values that are obviously strings
* Sorts properties and elements using a known and stable sort order

…thereby facilitating the authoring, editing, and reviewing of revisions to the diagrams.

## Snapping

Improves the layout of [Structurizr Express][structurizr-express] diagrams:

* “Snaps” the elements and vertices to a virtual grid
  * i.e. rounds their coordinates
* Adjusts element coordinates if necessary so as to create top and left margins in the diagram
  * i.e. ensures that all elements are at least 50px away from the top/left edges of the canvas
* Offsets the positions of `People` elements so they’ll align properly with other kinds of elements
  (working around a rendering quirk of Structurizr Express)

## Rendering

Given [Structurizr Express][structurizr-express] diagram YAML files, creates image files that
contain the visualization of the diagram.

* The resulting image files are created in the same directory as the YAML file, with the same base
  filename and the appropriate extensions
  * E.G. `docs/spline_reticulator_01_context.yaml` may yield
    `docs/spline_reticulator_01_context.png` and/or `docs/spline_reticulator_01_context.svg`
  * The default output format is PNG but users may specify which format(s) should be rendered
* If an image file already exists it will be overwritten


[docs-as-code]: https://www.writethedocs.org/guide/docs-as-code/
[structurizr-express]: https://structurizr.com/help/express
