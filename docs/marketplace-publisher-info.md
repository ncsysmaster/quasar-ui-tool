# Visual Studio Marketplace Publisher Info

Use this information when creating a Visual Studio Marketplace publisher and publishing the Quasar UI Tool VS Code extension.

## Publisher Profile

Recommended values:

| Field | Value |
| --- | --- |
| Publisher ID | `ORUM` |
| Publisher display name | `Quasar UI TOOL` |
| Short description | `Developer tools for Quasar UI screen design and JSON-based page generation.` |
| Website URL | Leave blank until a public product or GitHub page is ready. |
| Support URL | Leave blank until a public issue tracker or support page is ready. |

Important: the Publisher ID becomes part of the extension identifier and URL, so choose a stable value before publishing.

## Extension Listing

| Field | Value |
| --- | --- |
| Extension name | `quasar-tool-vscode` |
| Display name | `Quasar UI Tool` |
| Marketplace ID | `<publisher-id>.quasar-tool-vscode` |
| Category | `Other` |
| Pricing | `Free` |
| Icon | `vscode-extension/media/quasar-tool.png` |
| Short description | `Visual editor for Quasar UI page JSON files with rule-based PowerPoint design sheet import/export.` |

## Marketplace Summary

Quasar UI Tool is a VS Code extension for editing Quasar UI page definition JSON files through a visual Screen editor. It helps teams design, inspect, and generate Quasar-based UI screens from structured JSON, and supports rule-based PowerPoint design sheet import/export without relying on AI.

## Feature Bullets

- Visual Screen editor for `.src/pages/*.json` page definitions
- Component palette, page tree, properties, dataset, and script editing views
- Vue + Quasar runtime preview inside VS Code
- JSON to Vue generation workflow support
- Rule-based PowerPoint design sheet to JSON conversion
- Screen JSON to PowerPoint design sheet export with round-trip metadata
- Pinia store definition helpers

## Requirements

- VS Code 1.90.0 or later
- Node.js dependencies bundled with the extension package
- Windows and Microsoft PowerPoint are required for PowerPoint import/export features
- Quasar UI Tool page JSON files under `.src/pages/*.json`

## Suggested README Opening

Quasar UI Tool provides a visual editor for Quasar UI page JSON files in VS Code. It renders page definitions with the local Vue + Quasar runtime, provides editing panels for components and properties, and supports a rule-based PowerPoint design sheet workflow for importing and exporting screen definitions.

## Suggested Tags

- `quasar`
- `vue`
- `ui builder`
- `json editor`
- `powerpoint`

## Package Manifest Update

After creating the publisher, update `vscode-extension/package.json`.

```json
{
  "publisher": "ORUM",
  "icon": "media/quasar-tool.png",
  "pricing": "Free"
}
```

If a different Publisher ID is used later, replace `ORUM` with that exact ID.
