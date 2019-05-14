# 4. The Toolset « The FC4 Methodology

The current toolset for authoring and editing FC4 diagrams is:

<table>
  <thead>
    <tr>
      <th align="left">Tool</th>
      <th align="left">Description</th>
      <th align="left">Uses</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th align="left">Any text editor</th>
      <td>The diagrams are just <a href="https://yaml.org/">YAML</a> files, so they’re just
          text!</td>
      <td>
        <ul>
          <li>Creating the diagram files</li>
          <li>Authoring/editing the semantic contents of the diagrams: the elements, relationships, etc</li>
        </ul>
      </td>
    </tr>
    <tr>
      <th align="left"><a href="../tool/">fc4-tool</a></th>
      <td>A <a href="https://en.wikipedia.org/wiki/Command-line_interface">command-line</a> tool
          that supports and facilitates working with FC4 diagrams.</td>
      <td>
        <ul>
          <li><a href="../tool/#formatting">Formatting</a> the YAML source of the diagrams so
              they’re diffable, reviewable, and easier to edit</li>
          <li><a href="../tool/#snapping">Snapping</a> elements and vertices to a virtual grid</li>
          <li><a href="../tool/#rendering">Rendering</a> the diagrams</li>
        </ul>
      </td>
    </tr>
    <tr>
      <th align="left"><a href="https://structurizr.com/help/express">Structurizr Express</a></th>
      <td>A <a href="https://en.wikipedia.org/wiki/Web_application">Web app</a> for authoring and
          rendering <a href="https://c4model.com/">C4</a> diagrams. Provided gratis by
          <a href="https://structurizr.com/">Structurizr</a>.</td>
      <td>
        <ul>
          <li>Graphical authoring/editing the diagrams</li>
          <li>Rendering the diagrams</li>
        </ul>
      </td>
    </tr>
  </tbody>
</table>

----

Please continue to [The Repository](repository.md) or go back to [the top page](README.md).
