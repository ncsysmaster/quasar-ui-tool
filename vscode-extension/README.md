# Quasar UI Tool VS Code Extension

This extension opens `.src/pages/*.json` files with a visual editor inside VS Code and provides a `Quasar Tool` Activity Bar container.

## Run In Development

1. Open this repository in VS Code.
2. Run the `Run Quasar UI Tool Extension` launch configuration.
3. In the Extension Development Host, open `.src/pages/IndexPage.json`.
4. Choose `Open With...` -> `Quasar UI Tool Editor` if the visual editor is not selected automatically.
5. Open the `Quasar Tool` Activity Bar item to use Component Palette, Properties, Page Tree, and DataSet views.

## Editor Areas

- Editor Area:
  - Screen: renders page JSON with the local Vue + Quasar runtime, Quasar CSS, and Material Icons inside the custom editor.
  - Script: edits the matching `.src/pages/<PageName>.js` file. Missing script files are created automatically.
  - DataSet: shows the active DataSet summary.
- Quasar Tool Activity Bar:
  - Component Palette
  - Properties
  - Page Tree
  - DataSet

The side views operate on the currently opened Quasar UI Tool JSON document.

## Packaged Generator

The JSON/Vue generators are stored in `generator/` and included in the
Extension package. Runtime generation resolves these files relative to the
installed Extension, so a workspace does not need its own generator copy.

## Preview Rule

The visual editor should not use abstract placeholder boxes or iframe previews for page components. It should render the JSON through the same Vue + Quasar runtime rules used by the generated Vue file, adding only minimal editor affordances such as the selected component highlight.
