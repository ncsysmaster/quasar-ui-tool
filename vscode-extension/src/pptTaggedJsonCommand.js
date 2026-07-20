const vscode = require("vscode");
const { execFile } = require("child_process");
const { existsSync } = require("fs");
const { mkdir, writeFile } = require("fs/promises");
const { basename, dirname, extname, relative } = require("path");
const { TextEncoder } = require("util");
const { toNeutralType } = require("./componentTypes");
const { findProjectFolder, toProjectRelativePath } = require("./projectRoot");

const CREATE_JSON_FROM_TAGGED_PPT_COMMAND =
  "quasarTool.createJsonFromTaggedPpt";

const CONTAINER_TYPES = new Set([
  "Page",
  "Card",
  "CardSection",
  "List",
  "ListItem",
  "ListItemSection",
  "FormTemplate",
]);

// Types that may hold children when rebuilding the tree from shape tags.
// Layout div wrappers (HtmlElement with row/col classes) are how FormTemplate
// grids nest their fields, so they must be accepted as parents - otherwise
// every field collapses to the page root and the layout stacks vertically.
const PARENT_TYPES = new Set([...CONTAINER_TYPES, "HtmlElement"]);

const ALLOWED_TYPES = new Set([
  "Page",
  "Button",
  "Input",
  "Select",
  "Toggle",
  "Card",
  "CardSection",
  "Table",
  "List",
  "ListItem",
  "ListItemSection",
  "Separator",
  "HtmlElement",
  "FormTemplate",
]);

function registerPptTaggedJsonCommands(context) {
  context.subscriptions.push(
    vscode.commands.registerCommand(CREATE_JSON_FROM_TAGGED_PPT_COMMAND, (uri) =>
      createJsonFromTaggedPpt(uri),
    ),
  );
}

async function createJsonFromTaggedPpt(uri) {
  const projectFolder = findProjectFolder(uri);
  if (!projectFolder) {
    vscode.window.showWarningMessage("Open the Quasar project folder first.");
    return;
  }

  const pptUri = await pickPowerPointFile(projectFolder);
  if (!pptUri) return;

  let slideCount = 0;
  try {
    slideCount = await getPowerPointSlideCount(pptUri.fsPath);
  } catch (error) {
    vscode.window.showErrorMessage(
      `Cannot read PPT slides. Check Microsoft PowerPoint installation. (${error.message})`,
    );
    return;
  }

  const slideNumber = await pickSlideNumber(slideCount);
  if (!slideNumber) return;

  const outputUri = await pickOutputFile(projectFolder, pptUri, slideNumber);
  if (!outputUri) return;

  try {
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: "Quasar Tool: creating JSON from tagged PPT",
        cancellable: false,
      },
      async (progress) => {
        progress.report({ message: "Extracting PowerPoint slide..." });
        const layout = await extractPowerPointSlideLayout(
          pptUri.fsPath,
          slideNumber,
        );

        progress.report({ message: "Converting PPT tags to JSON..." });
        const { definition, scriptSetup } = createDefinitionFromLayout({
          projectFolder,
          layout,
          outputUri,
          pptUri,
          slideNumber,
        });

        await vscode.workspace.fs.createDirectory(
          vscode.Uri.file(dirname(outputUri.fsPath)),
        );
        await vscode.workspace.fs.writeFile(
          outputUri,
          new TextEncoder().encode(`${JSON.stringify(definition, null, 2)}\n`),
        );
        await ensureScriptFile(outputUri.fsPath, scriptSetup);

        const document = await vscode.workspace.openTextDocument(outputUri);
        await vscode.window.showTextDocument(document, { preview: false });
        vscode.window.showInformationMessage(
          `Tagged PPT JSON created: ${toProjectRelativePath(projectFolder, outputUri)}`,
        );
      },
    );
  } catch (error) {
    vscode.window.showErrorMessage(
      `Create JSON from tagged PPT failed: ${error.message}`,
    );
  }
}

async function pickPowerPointFile(projectFolder) {
  const selected = await vscode.window.showOpenDialog({
    title: "Create JSON from Tagged PPT (1/3): Select PPT file",
    defaultUri: projectFolder.uri,
    openLabel: "Select PPT",
    canSelectFiles: true,
    canSelectFolders: false,
    canSelectMany: false,
    filters: { "PowerPoint files": ["pptx", "ppt"] },
  });
  return selected?.[0] || null;
}

async function pickSlideNumber(slideCount) {
  const items = Array.from({ length: slideCount }, (_, index) => {
    const page = index + 1;
    return {
      label: `Slide ${page}`,
      description: `${page} / ${slideCount}`,
      value: page,
    };
  });
  const selected = await vscode.window.showQuickPick(items, {
    title: "Create JSON from Tagged PPT (2/3): Select slide",
    placeHolder: "Select the slide to convert into Quasar UI Tool JSON",
  });
  return selected?.value || null;
}

async function pickOutputFile(projectFolder, pptUri, slideNumber) {
  const baseName = sanitizeFileName(basename(pptUri.fsPath, extname(pptUri.fsPath)));
  const defaultFileName = `${toPascalCase(baseName)}Slide${slideNumber}.json`;
  return vscode.window.showSaveDialog({
    title: "Create JSON from Tagged PPT (3/3): Save JSON file",
    defaultUri: vscode.Uri.joinPath(
      projectFolder.uri,
      ".src",
      "pages",
      defaultFileName,
    ),
    saveLabel: "Create JSON",
    filters: { "Quasar UI Tool JSON": ["json"] },
  });
}

function createDefinitionFromLayout({
  projectFolder,
  layout,
  outputUri,
  pptUri,
  slideNumber,
}) {
  const outputBaseName = basename(outputUri.fsPath, extname(outputUri.fsPath));
  const pageId = toIdentifier(outputBaseName) || "GeneratedPage";
  const sourcePath = toProjectRelativePath(projectFolder, outputUri);
  const targetVuePath = sourcePath
    .replace(/^\.src\/pages\//i, "src/pages/")
    .replace(/\.json$/i, ".vue");

  // The current PPT slide's shapes/tags are always the ground truth for what
  // components exist, their text, position, and visible props: this is what
  // makes the round trip actually reflect edits (or deletions) made directly
  // in PowerPoint. Embedded whole-page JSON metadata (written by our own
  // exporter) is only used to backfill fields that have no visible PPT
  // representation at all (table row data, script logic, rich bindings) for
  // components that are still present on the slide - never to resurrect a
  // component whose shape/tag was removed from the PPT.
  const embeddedPage = readEmbeddedPageDefinition(layout);
  const embeddedById = indexEmbeddedComponents(embeddedPage);

  const tagged = buildTaggedComponents(layout, embeddedById);
  const generated = buildUntaggedComponents(layout, tagged.usedShapeIds);
  const components = attachComponentHierarchy([...tagged.components, ...generated]);
  const embeddedRoot = Array.isArray(embeddedPage?.components)
    ? embeddedPage.components.find((node) => node?.type === "Page")
    : null;

  return {
    definition: {
      schemaVersion: embeddedPage?.schemaVersion || "0.1.0",
      tool: embeddedPage?.tool || {
        name: "quasar-tool",
        artifactType: "page-definition",
        description: "Generated from tagged PowerPoint screen design.",
      },
      page: {
        id: pageId,
        name: outputBaseName,
        route: `/${pageId}`,
        framework: embeddedPage?.page?.framework || "quasar",
        component: embeddedPage?.page?.component || "Page",
        sourceVuePath: targetVuePath,
        targetVuePath,
      },
      data: embeddedPage?.data || {},
      components: [
        {
          id: embeddedRoot?.id || "page1",
          type: "Page",
          props: embeddedRoot?.props || { padding: true },
          children: components,
        },
      ],
      script: { src: `${outputBaseName}.js` },
      datasets: embeddedPage?.datasets || [{ name: "defaultDataset", fields: [] }],
      generation: {
        source: {
          pptPath: toProjectRelativePath(projectFolder, pptUri),
          slideNumber,
          converter: embeddedPage ? "ppt-tagged-rules+embedded-backfill" : "ppt-tagged-rules",
          embeddedPageJsonAvailable: Boolean(embeddedPage),
          outputPath: sourcePath,
          shapeCount: Array.isArray(layout.shapes) ? layout.shapes.length : 0,
          taggedShapeCount: tagged.components.length,
          generatedShapeCount: generated.length,
        },
        notes: [
          "Components are always reconstructed from the shapes currently on the PPT slide: shapes deleted in PowerPoint are dropped, and text/position/label edits made in PowerPoint are read fresh from the slide.",
          "When present, embedded page-JSON metadata only backfills fields with no visible PPT representation (table row data, script logic, rich bindings) for components that still exist on the slide.",
        ],
      },
    },
    scriptSetup: embeddedPage?.script?.setup || "",
  };
}

function indexEmbeddedComponents(definition) {
  const byId = new Map();
  const walk = (nodes) => {
    if (!Array.isArray(nodes)) return;
    for (const node of nodes) {
      if (node && typeof node === "object" && node.id) byId.set(String(node.id), node);
      if (Array.isArray(node?.children)) walk(node.children);
    }
  };
  walk(definition?.components);
  return byId;
}

function readEmbeddedPageDefinition(layout) {
  const chunks = [];
  let expectedChunks = 0;

  for (const shape of Array.isArray(layout?.shapes) ? layout.shapes : []) {
    const tag = parseQtTag(shape.tagText);
    if (!tag || !isMetaTag(tag)) continue;
    if (String(tag.kind || "").toLowerCase() !== "pagejson") continue;
    if (String(tag.encoding || "").toLowerCase() !== "base64") continue;

    const index = Math.max(1, Math.round(Number(tag.chunk) || 1));
    expectedChunks = Math.max(expectedChunks, Math.round(Number(tag.chunks) || 0));
    chunks[index - 1] = String(tag.data || "");
  }

  const presentChunks = chunks.filter(Boolean);
  if (presentChunks.length === 0) return null;
  if (expectedChunks > 0 && presentChunks.length < expectedChunks) {
    throw new Error(
      `Embedded page JSON metadata is incomplete (${presentChunks.length}/${expectedChunks}).`,
    );
  }

  try {
    const encoded = chunks.join("");
    const jsonText = Buffer.from(encoded, "base64").toString("utf8");
    const parsed = JSON.parse(jsonText);
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch (error) {
    throw new Error(`Cannot restore embedded page JSON metadata: ${error.message}`);
  }
}

function isMetaTag(tag) {
  return String(tag._type || tag.type || "").toLowerCase() === "meta";
}

function buildTaggedComponents(layout, embeddedById) {
  const usedShapeIds = new Set();
  const components = [];

  for (const shape of sortedShapes(layout.shapes)) {
    const tag = parseQtTag(shape.tagText);
    if (!tag) continue;
    usedShapeIds.add(shape.key);
    if (isMetaTag(tag)) continue;
    if (isTruthy(tag.ignore)) continue;

    const component = createTaggedComponent(shape, tag, embeddedById);
    if (component) components.push(component);
  }

  return { components, usedShapeIds };
}

function buildUntaggedComponents(layout, usedShapeIds) {
  const components = [];

  for (const shape of sortedShapes(layout.shapes)) {
    if (usedShapeIds.has(shape.key)) continue;
    if (shape.table) {
      components.push(createTableComponent(shape, {}, components.length));
      continue;
    }

    const text = cleanVisibleText(shape.text);
    if (!text || text.startsWith("qt:")) continue;
    if (isLikelyDecorative(shape)) continue;
    components.push(createTextComponent(shape, text, components.length));
  }

  return components;
}

function createTaggedComponent(shape, tag, embeddedById) {
  const type = normalizeComponentType(tag.type || tag._type || "HtmlElement");
  if (!ALLOWED_TYPES.has(type) || type === "Page") return null;

  const id = sanitizeId(tag.id) || createComponentId(type, shape, tag);
  const component = {
    id,
    type,
    designer: createDesigner(shape, tag.role),
    _ppt: {
      parent: sanitizeId(tag.parent),
      order: toNumber(tag.order),
      left: toNumber(shape.left),
      top: toNumber(shape.top),
      width: toNumber(shape.width),
      height: toNumber(shape.height),
    },
  };

  // Backfill from the whole-page metadata first (richest, never truncated),
  // then the shape's own inline data as a fallback when that metadata is
  // missing - both hold the same snapshot for our own exports, so order only
  // matters when one of the two sources isn't available.
  mergeEmbeddedComponentData(component, embeddedById?.get(id));
  applyEmbeddedComponentData(component, tag);
  // Visible PPT state always wins last: this is what makes edits made
  // directly in PowerPoint (new text, moved/resized shapes, changed labels)
  // actually show up in the converted JSON instead of the stale backfill.
  applyCommonTagValues(component, shape, tag);
  if (type === "Table") applyTableValues(component, shape, tag);
  if (CONTAINER_TYPES.has(type)) component.children = [];
  return component;
}

function applyEmbeddedComponentData(component, tag) {
  mergeEmbeddedComponentData(component, decodeBase64Json(tag.data));
}

function mergeEmbeddedComponentData(component, embedded) {
  if (!embedded || typeof embedded !== "object" || Array.isArray(embedded)) return;

  for (const [key, value] of Object.entries(embedded)) {
    if (["id", "type", "children", "designer", "_ppt"].includes(key)) continue;
    component[key] = cloneJsonValue(value);
  }
  if (embedded.designer?.storeBinding) {
    component.designer ||= {};
    component.designer.storeBinding = cloneJsonValue(embedded.designer.storeBinding);
  }
}

function applyCommonTagValues(component, shape, tag) {
  const type = component.type;
  const visibleText = cleanVisibleText(shape.text);
  const label = tag.label || (type !== "HtmlElement" ? visibleText : "");
  const text = tag.text || (type === "HtmlElement" ? visibleText : "");

  if (type === "HtmlElement") {
    component.tag = tag.tag || inferHtmlTag(shape, text);
    if (text) component.text = text;
  } else if (label) {
    component.props = { ...(component.props || {}), label };
  }

  if (tag.class) component.class = tag.class;
  if (tag.style) component.style = tag.style;
  if (tag.model) component.models = { ...(component.models || {}), modelValue: tag.model };
  if (tag.textBinding) component.textBinding = tag.textBinding;

  const props = extractPrefixed(tag, "prop.");
  const dynamicProps = extractPrefixed(tag, "dynamic.");
  const events = extractPrefixed(tag, "event.");
  component.props = { ...(component.props || {}), ...props };
  if (tag.color) component.props.color = tag.color;
  if (tag.icon) component.props.icon = tag.icon;
  if (type === "Input" || type === "Select") {
    component.props.outlined ??= true;
    component.props.dense ??= true;
  }
  if (type === "Button") {
    component.props.color ??= "primary";
  }
  if (Object.keys(dynamicProps).length > 0) component.dynamicProps = dynamicProps;
  if (Object.keys(events).length > 0) component.events = events;
}

function applyTableValues(component, shape, tag) {
  component.props ||= {};
  const visibleColumns = parseColumns(tag.columns) ||
    parseColumns(tag.cols) ||
    tableColumnsFromShape(shape);
  const embeddedColumns = Array.isArray(component.props.columns) ? component.props.columns : null;

  if (embeddedColumns && visibleColumns.length === embeddedColumns.length) {
    // Same column count as the backfilled snapshot: keep the richer embedded
    // column definitions (format, align, etc.) but sync the label to
    // whatever text is now actually written in the PPT table header, since
    // that's the part the user can see and edit directly in PowerPoint.
    component.props.columns = embeddedColumns.map((column, index) => ({
      ...column,
      label: visibleColumns[index].label,
    }));
  } else if (visibleColumns.length > 0) {
    // Column count differs from the backfill (or there was none) - the user
    // added/removed a header in PowerPoint, so rebuild from what's visible.
    component.props.columns = visibleColumns;
  } else if (!embeddedColumns) {
    component.props.columns = [];
  }

  component.props.rowKey ||= tag.rowKey || "id";
  if (tag.label && !component.props.title) component.props.title = tag.label;
  component.props.rows ||= [];
}

function createTableComponent(shape, tag, index) {
  const component = {
    id: sanitizeId(tag.id) || createComponentId("Table", shape, { id: `table${index + 1}` }),
    type: "Table",
    props: {
      rowKey: "id",
      columns: tableColumnsFromShape(shape),
      rows: [],
    },
    designer: createDesigner(shape, "table"),
    _ppt: {
      parent: sanitizeId(tag.parent),
      order: toNumber(tag.order),
      left: toNumber(shape.left),
      top: toNumber(shape.top),
      width: toNumber(shape.width),
      height: toNumber(shape.height),
    },
  };
  if (tag.label) component.props.title = tag.label;
  return component;
}

function createTextComponent(shape, text, index) {
  return {
    id: createComponentId("HtmlElement", shape, { id: `text${index + 1}` }),
    type: "HtmlElement",
    tag: inferHtmlTag(shape, text),
    text,
    designer: createDesigner(shape, "text"),
    _ppt: {
      left: toNumber(shape.left),
      top: toNumber(shape.top),
      width: toNumber(shape.width),
      height: toNumber(shape.height),
    },
  };
}

function attachComponentHierarchy(components) {
  const byId = new Map(components.map((component) => [component.id, component]));
  const roots = [];
  const parentOf = new Map();

  for (const component of components) {
    const explicitParent = component._ppt?.parent;
    let parent = explicitParent ? byId.get(explicitParent) : null;
    if (!parent) parent = findContainingParent(component, components);

    if (parent && parent !== component && PARENT_TYPES.has(parent.type)) {
      parent.children ||= [];
      parent.children.push(component);
      parentOf.set(component, parent);
    } else {
      roots.push(component);
    }
  }

  // Safety net: parent assignments can form cycles (e.g. two wrappers with
  // near-identical bounds adopting each other, or hand-edited parent= tags),
  // and a cycle detached from the roots would silently drop every component
  // inside it. Promote one member of each unreachable cluster to the roots.
  const reachable = new Set();
  const walk = (component) => {
    if (reachable.has(component)) return;
    reachable.add(component);
    (component.children || []).forEach(walk);
  };
  roots.forEach(walk);
  for (const component of components) {
    if (reachable.has(component)) continue;
    const parent = parentOf.get(component);
    if (parent && Array.isArray(parent.children)) {
      const index = parent.children.indexOf(component);
      if (index !== -1) parent.children.splice(index, 1);
    }
    roots.push(component);
    walk(component);
  }

  sortComponents(roots);
  cleanupPptMetadata(roots);
  return roots;
}

function findContainingParent(component, components) {
  const bounds = component._ppt;
  if (!bounds) return null;
  // Require the candidate to be strictly larger, not merely containing
  // within the tolerance margin: two wrappers with near-identical bounds
  // would otherwise adopt each other and form a cycle. Area strictly grows
  // along any geometric parent chain, so cycles become impossible.
  const componentArea = area(bounds);
  return components
    .filter((candidate) =>
      candidate !== component &&
      PARENT_TYPES.has(candidate.type) &&
      candidate._ppt &&
      containsBounds(candidate._ppt, bounds) &&
      area(candidate._ppt) > componentArea * 1.01 + 4,
    )
    .sort((a, b) => area(a._ppt) - area(b._ppt))[0] || null;
}

function containsBounds(parent, child) {
  const margin = 2;
  return child.left >= parent.left - margin &&
    child.top >= parent.top - margin &&
    child.left + child.width <= parent.left + parent.width + margin &&
    child.top + child.height <= parent.top + parent.height + margin;
}

function sortComponents(components) {
  components.sort((a, b) => {
    const orderA = Number.isFinite(a._ppt?.order) ? a._ppt.order : Number.MAX_SAFE_INTEGER;
    const orderB = Number.isFinite(b._ppt?.order) ? b._ppt.order : Number.MAX_SAFE_INTEGER;
    return orderA - orderB ||
      (a._ppt?.top || 0) - (b._ppt?.top || 0) ||
      (a._ppt?.left || 0) - (b._ppt?.left || 0);
  });
  components.forEach((component) => {
    if (Array.isArray(component.children)) sortComponents(component.children);
  });
}

function cleanupPptMetadata(components) {
  components.forEach((component) => {
    delete component._ppt;
    if (component.events && Object.keys(component.events).length === 0) delete component.events;
    if (component.props && Object.keys(component.props).length === 0) delete component.props;
    if (Array.isArray(component.children)) cleanupPptMetadata(component.children);
  });
}

async function getPowerPointSlideCount(pptPath) {
  const script = `
$ErrorActionPreference = "Stop"
$presentation = $null
$powerPoint = $null
try {
  $powerPoint = New-Object -ComObject PowerPoint.Application
  try {
    $presentation = $powerPoint.Presentations.Open(${toPowerShellString(pptPath)}, $true, $false, $false)
  } catch {
    $presentation = $powerPoint.Presentations.Open(${toPowerShellString(pptPath)}, $true, $false, $true)
  }
  Write-Output $presentation.Slides.Count
} finally {
  if ($presentation -ne $null) { $presentation.Close() | Out-Null }
  if ($powerPoint -ne $null) { $powerPoint.Quit() | Out-Null }
}
`;
  const stdout = await runPowerShell(script);
  const count = Number(stdout.trim().split(/\r?\n/).pop());
  if (!Number.isInteger(count) || count < 1) throw new Error("No slides found.");
  return count;
}

async function extractPowerPointSlideLayout(pptPath, slideNumber) {
  const script = `
$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
$presentation = $null
$powerPoint = $null
function Get-StringProp($object, $name) {
  try {
    $value = $object.$name
    if ($null -ne $value) { return [string]$value }
  } catch {}
  return ""
}
function Get-ShapeText($shape) {
  try {
    if ($shape.TextFrame.HasText -eq -1) {
      return [string]$shape.TextFrame.TextRange.Text
    }
  } catch {}
  return ""
}
function Get-TableInfo($shape) {
  try {
    if ($shape.HasTable -ne -1) { return $null }
    $table = $shape.Table
    $headers = @()
    $cells = @()
    for ($row = 1; $row -le $table.Rows.Count; $row++) {
      $rowCells = @()
      for ($col = 1; $col -le $table.Columns.Count; $col++) {
        $value = [string]$table.Cell($row, $col).Shape.TextFrame.TextRange.Text
        if ($row -eq 1) { $headers += $value.Trim() }
        $rowCells += $value.Trim()
      }
      $cells += ,$rowCells
    }
    return [ordered]@{
      rows = [int]$table.Rows.Count
      columns = [int]$table.Columns.Count
      headers = $headers
      cells = $cells
    }
  } catch {}
  return $null
}
function Get-TagText($shape, $text) {
  $values = @(
    (Get-StringProp $shape "AlternativeText"),
    (Get-StringProp $shape "Title"),
    (Get-StringProp $shape "Name"),
    $text
  )
  foreach ($value in $values) {
    $candidate = ([string]$value).Trim()
    if ($candidate.StartsWith("qt:", [System.StringComparison]::OrdinalIgnoreCase)) {
      return $candidate
    }
  }
  return ""
}
function Read-Shape($shape, $path) {
  $items = @()
  $text = Get-ShapeText $shape
  $table = Get-TableInfo $shape
  $key = "$path/$($shape.Id)"
  $items += [ordered]@{
    key = $key
    id = [int]$shape.Id
    name = [string]$shape.Name
    type = [int]$shape.Type
    visible = [int]$shape.Visible
    left = [math]::Round([double]$shape.Left, 1)
    top = [math]::Round([double]$shape.Top, 1)
    width = [math]::Round([double]$shape.Width, 1)
    height = [math]::Round([double]$shape.Height, 1)
    text = $text.Trim()
    altText = (Get-StringProp $shape "AlternativeText")
    title = (Get-StringProp $shape "Title")
    tagText = (Get-TagText $shape $text)
    table = $table
  }
  try {
    if ($shape.GroupItems.Count -gt 0) {
      for ($i = 1; $i -le $shape.GroupItems.Count; $i++) {
        $items += Read-Shape $shape.GroupItems.Item($i) $key
      }
    }
  } catch {}
  return $items
}
try {
  $powerPoint = New-Object -ComObject PowerPoint.Application
  try {
    $presentation = $powerPoint.Presentations.Open(${toPowerShellString(pptPath)}, $true, $false, $false)
  } catch {
    $presentation = $powerPoint.Presentations.Open(${toPowerShellString(pptPath)}, $true, $false, $true)
  }
  $slide = $presentation.Slides.Item(${slideNumber})
  $shapes = @()
  for ($i = 1; $i -le $slide.Shapes.Count; $i++) {
    $shapes += Read-Shape $slide.Shapes.Item($i) "slide-${slideNumber}"
  }
  $result = [ordered]@{
    slideNumber = ${slideNumber}
    slideWidth = [math]::Round([double]$presentation.PageSetup.SlideWidth, 1)
    slideHeight = [math]::Round([double]$presentation.PageSetup.SlideHeight, 1)
    shapes = $shapes
  }
  $result | ConvertTo-Json -Depth 12 -Compress
} finally {
  if ($presentation -ne $null) { $presentation.Close() | Out-Null }
  if ($powerPoint -ne $null) { $powerPoint.Quit() | Out-Null }
}
`;
  const stdout = await runPowerShell(script);
  const jsonText = extractJsonObject(stdout);
  try {
    return JSON.parse(jsonText);
  } catch (error) {
    throw new Error(`Cannot parse PPT layout JSON: ${error.message}`);
  }
}

function runPowerShell(script) {
  return new Promise((resolve, reject) => {
    const encoded = Buffer.from(script, "utf16le").toString("base64");
    execFile(
      "powershell.exe",
      ["-NoProfile", "-ExecutionPolicy", "Bypass", "-EncodedCommand", encoded],
      { windowsHide: true, timeout: 120000 },
      (error, stdout, stderr) => {
        if (error) {
          reject(new Error((stderr || error.message).trim()));
          return;
        }
        resolve(stdout);
      },
    );
  });
}

async function ensureScriptFile(jsonPath, scriptSetup = "") {
  const scriptPath = jsonPath.replace(/\.json$/i, ".js");
  if (existsSync(scriptPath)) return;
  await mkdir(dirname(scriptPath), { recursive: true });
  await writeFile(scriptPath, scriptSetup, "utf8");
}

function parseQtTag(value) {
  const raw = String(value || "").trim();
  if (!raw.toLowerCase().startsWith("qt:")) return null;
  const body = raw.slice(3).trim();
  const result = {};

  for (const [index, part] of splitTagParts(body).entries()) {
    if (!part) continue;
    const eqIndex = part.indexOf("=");
    if (eqIndex === -1) {
      if (index === 0) result._type = part.trim();
      else result[part.trim()] = true;
      continue;
    }
    const key = part.slice(0, eqIndex).trim();
    const rawValue = part.slice(eqIndex + 1).trim();
    if (!key) continue;
    result[key] = key === "data"
      ? unquote(rawValue)
      : coerceTagValue(unquote(rawValue));
  }

  return result;
}

function splitTagParts(value) {
  const parts = [];
  let current = "";
  let quote = "";
  for (const char of String(value || "")) {
    if ((char === '"' || char === "'") && !quote) {
      quote = char;
      current += char;
      continue;
    }
    if (char === quote) {
      quote = "";
      current += char;
      continue;
    }
    if (char === ";" && !quote) {
      parts.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

function parseColumns(value) {
  if (!value) return null;
  const columns = String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
      const [fieldPart, ...labelParts] = item.split(":");
      const label = labelParts.join(":").trim() || fieldPart.trim();
      const field = createFieldName(fieldPart.trim() || label);
      return { name: field, label, field, align: "left" };
    });
  return columns.length > 0 ? columns : null;
}

function decodeBase64Json(value) {
  if (!value) return null;
  try {
    const jsonText = Buffer.from(String(value), "base64").toString("utf8");
    return JSON.parse(jsonText);
  } catch {
    return null;
  }
}

function cloneJsonValue(value) {
  return JSON.parse(JSON.stringify(value));
}

function tableColumnsFromShape(shape) {
  const headers = Array.isArray(shape.table?.headers)
    ? shape.table.headers.map(cleanVisibleText).filter(Boolean)
    : [];
  return headers.map((header) => {
    const field = createFieldName(header);
    return { name: field, label: header, field, align: "left" };
  });
}

function extractPrefixed(tag, prefix) {
  const result = {};
  Object.entries(tag).forEach(([key, value]) => {
    if (!key.startsWith(prefix)) return;
    const nextKey = camelCase(key.slice(prefix.length));
    if (nextKey) result[nextKey] = value;
  });
  return result;
}

function normalizeComponentType(type) {
  const aliases = {
    text: "HtmlElement",
    label: "HtmlElement",
    div: "HtmlElement",
    h1: "HtmlElement",
    h2: "HtmlElement",
    section: "CardSection",
    qbtn: "Button",
    qinput: "Input",
    qselect: "Select",
    qtoggle: "Toggle",
    qcard: "Card",
    qcardsection: "CardSection",
    qtable: "Table",
    Text: "HtmlElement",
    Label: "HtmlElement",
    Div: "HtmlElement",
    H1: "HtmlElement",
    H2: "HtmlElement",
    Section: "CardSection",
    QBtn: "Button",
    QInput: "Input",
    QSelect: "Select",
    QToggle: "Toggle",
    QCard: "Card",
    QCardSection: "CardSection",
    QTable: "Table",
  };
  const text = String(type || "");
  const normalized = aliases[text] || aliases[text.toLowerCase()] || toNeutralType(text);
  return aliases[normalized] || normalized;
}

function createComponentId(type, shape, tag) {
  return sanitizeId(tag.id) ||
    sanitizeId(`${type}${shape.id || shape.name || ""}`) ||
    `${type.charAt(0).toLowerCase()}${type.slice(1)}${Date.now().toString(36)}`;
}

function createDesigner(shape, role) {
  const designer = {
    x: Math.round(toNumber(shape.left) || 0),
    y: Math.round(toNumber(shape.top) || 0),
    width: Math.round(toNumber(shape.width) || 0),
    height: Math.round(toNumber(shape.height) || 0),
  };
  if (role) designer.role = role;
  return designer;
}

function inferHtmlTag(shape, text) {
  const height = toNumber(shape.height) || 0;
  const width = toNumber(shape.width) || 0;
  if (height >= 28 && width >= 160 && String(text || "").length <= 50) return "h2";
  return "div";
}

function isLikelyDecorative(shape) {
  const text = cleanVisibleText(shape.text);
  if (!text) return true;
  const width = toNumber(shape.width) || 0;
  const height = toNumber(shape.height) || 0;
  return width < 8 || height < 8;
}

function sortedShapes(shapes) {
  return (Array.isArray(shapes) ? shapes : [])
    .filter((shape) => Number(shape.visible) !== 0)
    .sort((a, b) => (toNumber(a.top) - toNumber(b.top)) || (toNumber(a.left) - toNumber(b.left)));
}

function cleanVisibleText(value) {
  return String(value || "")
    .split(/\r?\n/)
    .filter((line) => !line.trim().toLowerCase().startsWith("qt:"))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function sanitizeId(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const cleaned = raw.replace(/[^A-Za-z0-9_$]/g, "");
  if (/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(cleaned)) return cleaned;
  return "";
}

function createFieldName(value) {
  const ascii = String(value || "")
    .replace(/[^A-Za-z0-9_$]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word, index) => {
      const clean = word.replace(/^[^A-Za-z_$]+/, "");
      if (!clean) return "";
      return index === 0
        ? clean.charAt(0).toLowerCase() + clean.slice(1)
        : clean.charAt(0).toUpperCase() + clean.slice(1);
    })
    .join("");
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(ascii) ? ascii : "field";
}

function toIdentifier(value) {
  return sanitizeId(toPascalCase(value)) || "GeneratedPage";
}

function toPascalCase(value) {
  const result = String(value || "")
    .replace(/[^A-Za-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("");
  return result || "Generated";
}

function sanitizeFileName(value) {
  return String(value || "GeneratedPage")
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, " ")
    .trim() || "GeneratedPage";
}

function camelCase(value) {
  return String(value || "")
    .replace(/[-_\s]+(.)?/g, (_, char) => char ? char.toUpperCase() : "")
    .replace(/^(.)/, (char) => char.toLowerCase());
}

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function area(bounds) {
  return (bounds.width || 0) * (bounds.height || 0);
}

function isTruthy(value) {
  return value === true || String(value).toLowerCase() === "true";
}

function coerceTagValue(value) {
  if (value === "true") return true;
  if (value === "false") return false;
  if (value === "") return "";
  const numericValue = Number(value);
  if (!Number.isNaN(numericValue) && String(numericValue) === String(value)) {
    return numericValue;
  }
  return value;
}

function unquote(value) {
  const text = String(value || "");
  if (
    (text.startsWith('"') && text.endsWith('"')) ||
    (text.startsWith("'") && text.endsWith("'"))
  ) {
    return text.slice(1, -1);
  }
  return text;
}

function toPowerShellString(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

function extractJsonObject(value) {
  const text = String(value || "").trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) return text;
  return text.slice(start, end + 1);
}

module.exports = { registerPptTaggedJsonCommands };
