# PPT Tagging Standard for Quasar UI Tool

This guide defines how to prepare PowerPoint screen designs so Quasar UI Tool can convert them into page JSON without AI.

## Goal

The converter reads PowerPoint shapes, tables, text, and layout metadata. It produces a Quasar UI Tool page-definition JSON file using deterministic rules. For reliable output, add `qt:` tags to important shapes.

## Where to Put Tags

Use one of these PowerPoint fields:

- Alt Text / Alternative Text
- Shape title, if available
- Shape name, if editing names is easier
- First text line of a shape, only when the tag is not meant to be visible

Recommended field: Alt Text.

## Tag Format

Use semicolon-separated key-value pairs.

```text
qt:type=Input;id=customerName;label=Customer Name;model=search.customerName
```

Short form is also supported:

```text
qt:Input;id=customerName;label=Customer Name
```

Values are parsed as strings by default. `true`, `false`, and numbers are converted automatically.

Exporter-generated PPT files also include hidden round-trip metadata shapes.

```text
qt:meta;kind=pageJson;encoding=base64;chunk=1;chunks=3;data=...
```

Keep these hidden metadata shapes if you want the richest possible round trip (table row data, script logic, store/data bindings) - but they are a *backfill* source only, not a source of truth for structure. The reverse converter always rebuilds the component tree from whichever shapes and `qt:type=...` tags currently exist on the slide: delete a shape in PowerPoint and it disappears from the JSON, edit a shape's visible text/label/position and that edit is what gets converted, even if the hidden metadata still remembers the old value. The hidden metadata only fills in fields that have no visible PPT representation at all (e.g. a table's actual row data, since only column headers are drawn on the slide) for components that are still present on the slide.

## Common Tags

```text
qt:type=HtmlElement;id=title;text=Order Search;tag=h1
qt:type=Card;id=searchArea
qt:type=CardSection;id=searchFields;parent=searchArea
qt:type=Input;id=customerName;label=Customer Name;parent=searchFields;model=search.customerName
qt:type=Select;id=status;label=Status;parent=searchFields;model=search.status
qt:type=Button;id=searchButton;label=Search;parent=searchArea;event.click=onSearch;color=primary
qt:type=Table;id=resultTable;parent=page1;columns=orderNo:Order No,customer:Customer,status:Status
```

## Supported Component Types

- `Page`
- `Button`
- `Input`
- `Select`
- `Toggle`
- `Card`
- `CardSection`
- `Table`
- `List`
- `ListItem`
- `ListItemSection`
- `Separator`
- `HtmlElement`
- `FormTemplate`

Quasar names such as `QBtn`, `QInput`, and `QTable` are also accepted and converted to neutral types.

## Supported Keys

| Key | Meaning |
| --- | --- |
| `type` | Neutral component type. Required for tagged shapes except `qt:ignore`. |
| `id` | Stable component id. Recommended. |
| `parent` | Parent component id. If omitted, the converter uses containment rules or the page root. |
| `order` | Sort order inside the parent. Lower values appear first. |
| `label` | Component label. Used for Button/Input/Select/Toggle/Table title. |
| `text` | Text for HtmlElement. |
| `tag` | HTML tag for HtmlElement, such as `h1`, `h2`, `div`, `span`, `p`. |
| `model` | Creates `v-model`. |
| `event.click` | Creates click event handler. |
| `class` | CSS class. |
| `style` | Inline style. |
| `color` | Shortcut for `props.color`. |
| `icon` | Shortcut for `props.icon`. |
| `columns` | Table columns in `field:Label,field2:Label 2` format. |
| `prop.NAME` | Adds a static prop. Example: `prop.outlined=true`. |
| `dynamic.NAME` | Adds a dynamic prop expression. |
| `ignore=true` | Skips the shape. |

## Table Rules

For PowerPoint table objects:

```text
qt:type=Table;id=resultTable;label=Search Result
```

The first row is used as table headers when `columns` is not supplied.

For drawn table-like layouts, prefer explicit `columns`.

```text
qt:type=Table;id=resultTable;columns=courseCode:Course Code,courseName:Course Name,useYn:Use
```

## Container Rules

Use containers for predictable structure.

```text
qt:type=Card;id=searchCard
qt:type=CardSection;id=searchCardBody;parent=searchCard
```

If `parent` is omitted, the converter tries to place a shape inside the smallest tagged container that visually contains it.

## Recommended PPT Authoring Rules

1. Tag every interactive control.
2. Use explicit `id` values for all tagged shapes.
3. Use `parent` for important containers and fields.
4. Keep visible UI text separate from tag text by using Alt Text.
5. Use real PowerPoint tables for grids when possible.
6. Avoid converting pasted screenshots into JSON. Screenshots have no usable component structure.
7. Use `qt:ignore=true` on decorative images, guide lines, and background shapes.

## Conversion Process

1. Select PPT file.
2. Select slide.
3. Select output `.json` path.
4. Converter extracts slide shapes and tags.
5. Tagged shapes become components.
6. Untagged PowerPoint tables and visible text are converted conservatively.
7. JSON is saved to `.src/pages`.
8. The generated JSON can be opened in Quasar UI Tool and edited.

## Reverse Conversion Process

Use this when the current Quasar UI Tool screen must be shared or reviewed as a PowerPoint design document.

1. Open a page JSON in Quasar UI Tool.
2. Go to the Screen view.
3. Right-click the screen canvas.
4. Select `PPT 파일 생성`.
5. Select the output `.pptx` path.
6. The exporter creates PowerPoint shapes from the current component tree and designer bounds.
7. Each exported shape stores the same `qt:` metadata in PowerPoint Alt Text and Title.
8. The generated PPT can be edited and converted back to JSON with the tagged PPT converter.

The exporter uses an enlarged `1200`-point slide width (vs. PowerPoint's default 960) and always scales the captured screen to fill that full width; the slide height is derived from the content's actual extent (trailing empty preview space is trimmed), so components stay as large as possible and the readability-boosted font sizes fit inside them. Requires Microsoft PowerPoint on Windows.
When the export is launched from the Screen view, the exporter uses the actual rendered screen bounds so the PPT design sheet matches the current screen more closely. It also embeds the full page JSON as hidden metadata; converting the generated PPT back to JSON uses that metadata to backfill data with no visible PPT representation (table rows, script logic, bindings), but the component tree itself, and any text/label/position edits, are always read fresh from the PPT's current shapes and tags - not from the hidden metadata. Delete a shape in PowerPoint and the reverse conversion drops it too.

### Visual fidelity: DOM render capture applied to native PPT shapes

The page JSON model does not carry the actual rendered look of a screen (Quasar theme colors, fonts, AG Grid multi-row headers, table toolbar buttons, etc.), so drawing generic PowerPoint shapes from the model alone only ever produced a rough wireframe. Rasterizing the screen into a flat screenshot image was tried and rejected: the exported shapes must stay real, editable PowerPoint shapes, not a picture pasted behind invisible hit-boxes. Instead, the exporter reads the **webview's rendered DOM** and redraws it as native shapes. Because it works from the rendered DOM rather than framework-specific knowledge, the same exporter will keep working when the JSON is rendered with a different framework (e.g. React) later.

1. On export, `collectExportRenderShapes()` in the webview walks the rendered `#quasar-preview` DOM. Every visible element with a real background or border becomes a `box` primitive (position, size, fill, border color/width, rounded/circle); every visible text node becomes a `text` primitive at its exact rendered rectangle (via `Range.getBoundingClientRect()`), with computed font family/size/weight/color. Form control values/placeholders and multi-row AG Grid headers, table toolbar buttons, and pagination bars all fall out of this naturally, because they are just DOM.
2. Designer-only chrome is excluded: the `col-*` metric badges (`qt-grid-metric-badge`), selection outlines/box-shadows (never captured, since only real borders are read), context menus, and `<svg>`/`<script>`/`<style>` subtrees. Material icon ligature text (`arrow_drop_down` …) is mapped to real glyphs (▼ ▲ ‹ › « » ✕ ✓ …) or omitted, never exported as literal words. Semi-transparent colors are alpha-blended onto the page background so PPT's opaque fills match what the eye sees.
3. In `pptExportCommand.js`, `createDomDrivenInstructions()` scales the primitives into slide coordinates (same transform as component bounds, fonts scaled by the same factor) and assigns tags: the **first** captured shape of each model component carries that component's full `qt:` tag; every other captured shape is tagged `qt:ignore=true` so the reverse converter treats it as pure decoration and never creates phantom components from grid header cells or text fragments. Any model component whose element produced no captured shape still gets an invisible tagged anchor shape, so tag-only round trips (without the hidden metadata) stay complete.
4. The hidden page-JSON metadata shapes are unchanged and still carry the full round-trip data.
5. Structural wrappers (Card, CardSection, layout `div`s) and Input/Select fields never show their internal ids as text — they export exactly as they look in the webview (a bordered box, a field with its value/placeholder), matching how a person reads the screen.
6. If no render capture is available (the Screen tab was never rendered), the exporter falls back to the older model-driven wireframe drawing so the export never fails outright.

Because every shape stays a native PowerPoint rectangle, oval, line, or textbox (never a picture), the generated PPT is fully editable with PowerPoint's own drawing tools while looking near-identical to the webview rendering.
