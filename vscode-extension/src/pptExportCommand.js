const vscode = require("vscode");
const { execFile } = require("child_process");
const { mkdir, unlink, writeFile } = require("fs/promises");
const { join } = require("path");
const { findProjectFolder } = require("./projectRoot");

// Much wider than the PowerPoint default 960x540 so scaled-up components
// leave room for the readability-boosted font sizes. The DOM-driven export
// always fills this full width and derives the slide height from the
// captured content's aspect ratio; SLIDE_HEIGHT is the fallback-path height.
const SLIDE_WIDTH = 1200;
const SLIDE_HEIGHT = 675;
const DEFAULT_COMPONENT_WIDTH = 180;
const DEFAULT_COMPONENT_HEIGHT = 36;
const EXPORT_MARGIN = 16;
const METADATA_CHUNK_SIZE = 7000;
const MAX_RENDER_SHAPES = 1500;

async function exportPageJsonToTaggedPpt(document, model, layoutSnapshot = null) {
  const projectFolder = findProjectFolder(document?.uri);
  if (!projectFolder) {
    vscode.window.showWarningMessage("Open the Quasar project folder first.");
    return null;
  }

  const pageName = model?.page?.name || model?.page?.id || "QuasarPage";
  const defaultName = `${safeFileName(pageName)}.pptx`;
  const outputUri = await vscode.window.showSaveDialog({
    title: "Create PPT from current Screen",
    defaultUri: vscode.Uri.joinPath(projectFolder.uri, "docs", defaultName),
    saveLabel: "Create PPT",
    filters: { "PowerPoint Presentation": ["pptx"] },
  });
  if (!outputUri) return null;

  const instructions = createPptInstructions(model, layoutSnapshot);
  const tempDir = join(projectFolder.uri.fsPath, ".tmp", "ppt-export");
  await mkdir(tempDir, { recursive: true });
  const instructionPath = join(tempDir, `ppt-export-${Date.now()}.json`);
  await writeFile(
    instructionPath,
    JSON.stringify({
      title: pageName,
      slideWidth: instructions.slideWidth,
      slideHeight: instructions.slideHeight,
      shapes: instructions.shapes,
    }, null, 2),
    "utf8",
  );

  try {
    await runPowerPointExport(instructionPath, outputUri.fsPath);
  } finally {
    await unlink(instructionPath).catch(() => undefined);
  }
  vscode.window.showInformationMessage(`PPT created: ${outputUri.fsPath}`);
  return outputUri;
}

function createPptInstructions(model, layoutSnapshot = null) {
  // Preferred path: draw exactly what the webview rendered (framework
  // agnostic - works the same whether the JSON was rendered with Quasar or,
  // later, React). Falls back to the model-driven wireframe when no render
  // capture is available (e.g. the Screen tab was never rendered).
  const renderShapes = Array.isArray(layoutSnapshot?.renderShapes)
    ? layoutSnapshot.renderShapes
    : [];
  if (renderShapes.length > 0) {
    return createDomDrivenInstructions(model, layoutSnapshot, renderShapes);
  }

  const roots = Array.isArray(model?.components) ? model.components : [];
  const layoutContext = createLayoutContext(layoutSnapshot);
  const shapes = createPageJsonMetadataShapes(model);
  roots.forEach((component, index) => {
    collectComponentShape(component, shapes, {
      depth: 0,
      index,
      parentId: "",
      order: index + 1,
      layoutContext,
      parentBounds: { x: 24, y: 24, width: SLIDE_WIDTH - 48, height: SLIDE_HEIGHT - 48 },
    });
  });
  return { shapes, slideWidth: SLIDE_WIDTH, slideHeight: SLIDE_HEIGHT };
}

function boostExportFontSize(scaledPt) {
  // Strictly proportional scaling produced ~5pt slide text (unreadable);
  // boost into a readable band while keeping relative sizing intact.
  return Math.min(18, Math.max(8, Math.round((scaledPt + 6) * 10) / 10));
}

function createDomDrivenInstructions(model, layoutSnapshot, renderShapes) {
  // Width-driven scaling: the capture always fills the full slide width, and
  // the slide height is derived from the content's real extent (the preview
  // element usually has a large empty area below the content that must not
  // shrink everything through min(width, height) fitting).
  const width = Math.max(1, Number(layoutSnapshot?.width) || 0);
  const snapshotHeight = Math.max(1, Number(layoutSnapshot?.height) || 0);
  const renderTablesRaw = Array.isArray(layoutSnapshot?.renderTables)
    ? layoutSnapshot.renderTables
    : [];
  let maxBottom = 0;
  for (const raw of renderShapes) {
    maxBottom = Math.max(maxBottom, (Number(raw.y) || 0) + (Number(raw.height) || 0));
  }
  for (const table of renderTablesRaw) {
    maxBottom = Math.max(maxBottom, (Number(table.y) || 0) + (Number(table.height) || 0));
  }
  const contentHeight = Math.min(snapshotHeight, Math.max(200, maxBottom + 24));
  const rawScale = (SLIDE_WIDTH - EXPORT_MARGIN * 2) / width;
  const scale = Number.isFinite(rawScale) && rawScale > 0 ? rawScale : 1;
  const slideHeight = Math.max(300, Math.round((contentHeight * scale + EXPORT_MARGIN * 2) * 10) / 10);
  const snapshotComponents = Array.isArray(layoutSnapshot?.components)
    ? layoutSnapshot.components
    : [];
  const layoutContext = {
    scale,
    offsetX: EXPORT_MARGIN,
    offsetY: EXPORT_MARGIN,
    slideWidth: SLIDE_WIDTH,
    slideHeight,
    byId: new Map(
      snapshotComponents
        .filter((item) => item?.id)
        .map((item) => [String(item.id), item]),
    ),
  };
  const shapes = createPageJsonMetadataShapes(model);
  const tagById = buildComponentTagMap(model);
  const taggedIds = new Set();
  let decoIndex = 0;

  // Native PPT tables claim their component's qt: tag before the loose-shape
  // loop runs (so the tag lands on the real table, not a decoration box), but
  // they are DRAWN last - PowerPoint stacks later shapes on top, and the
  // table must sit above the card/container boxes captured from the DOM.
  const tableShapes = [];
  for (const table of renderTablesRaw) {
    const bounds = transformRenderBounds(table, layoutContext);
    if (!bounds) continue;
    const rows = Array.isArray(table.rows) ? table.rows : [];
    const columnWidths = Array.isArray(table.columnWidths) ? table.columnWidths : [];
    if (rows.length === 0 || columnWidths.length === 0) continue;
    const rawId = table.qtId ? String(table.qtId) : "";
    const qtId = rawId && tagById.has(rawId) && !taggedIds.has(rawId) ? rawId : "";
    if (qtId) taggedIds.add(qtId);
    decoIndex += 1;
    const cells = [];
    rows.forEach((row, rowIndex) => {
      const rowCells = Array.isArray(row.cells) ? row.cells : [];
      rowCells.forEach((cell) => {
        cells.push({
          row: rowIndex + 1,
          col: Math.max(1, Math.round(Number(cell.colStart) || 0) + 1),
          rowSpan: Math.max(1, Math.round(Number(cell.rowSpan) || 1)),
          colSpan: Math.max(1, Math.round(Number(cell.colSpan) || 1)),
          text: String(cell.text || ""),
        });
      });
    });
    tableShapes.push({
      kind: "pptTable",
      id: qtId || `deco${decoIndex}`,
      ...bounds,
      text: "",
      tag: qtId ? tagById.get(qtId).tag : "qt:ignore=true",
      rows: rows.length,
      cols: columnWidths.length,
      headerRows: rows.filter((row) => row.header).length,
      columnWidths: columnWidths.map((width) => Math.max(6, Math.round((Number(width) || 0) * scale * 10) / 10)),
      rowHeights: rows.map((row) => Math.max(10, Math.round((Number(row.height) || 0) * scale * 10) / 10)),
      headerBackground: table.headerBackground || null,
      headerColor: table.headerColor || null,
      bodyColor: table.bodyColor || null,
      fontSize: boostExportFontSize((Number(table.fontSize) || 10) * scale),
      fontFamily: String(table.fontFamily || "Malgun Gothic"),
      cells,
    });
  }

  for (const raw of renderShapes.slice(0, MAX_RENDER_SHAPES)) {
    const bounds = transformRenderBounds(raw, layoutContext);
    if (!bounds) continue;
    // The first captured shape of each model component carries that
    // component's qt: tag; every other captured shape is visual decoration
    // and gets qt:ignore=true so the reverse converter never turns grid
    // header cells, toolbar chrome, or text fragments into phantom
    // components.
    const rawId = raw.qtId ? String(raw.qtId) : "";
    const qtId = rawId && tagById.has(rawId) && !taggedIds.has(rawId) ? rawId : "";
    if (qtId) taggedIds.add(qtId);
    const tag = qtId ? tagById.get(qtId).tag : "qt:ignore=true";
    decoIndex += 1;
    const id = qtId || `deco${decoIndex}`;

    if (raw.kind === "text") {
      shapes.push({
        kind: "domText",
        id,
        ...bounds,
        text: String(raw.text || ""),
        tag,
        style: {
          color: raw.color || null,
          fontFamily: String(raw.fontFamily || ""),
          fontSize: boostExportFontSize((Number(raw.fontSize) || 10) * scale),
          bold: Boolean(raw.bold),
          align: raw.align || "left",
          wrap: Boolean(raw.wrap),
        },
      });
    } else {
      shapes.push({
        kind: "domBox",
        id,
        ...bounds,
        text: "",
        tag,
        style: {
          background: raw.background || null,
          borderColor: raw.borderColor || null,
          borderWidth: Math.max(0.25, Math.round((Number(raw.borderWidth) || 1) * scale * 0.75 * 100) / 100),
          rounded: Boolean(raw.rounded),
          circle: Boolean(raw.circle),
        },
      });
    }
  }

  // Tables drawn after every captured box/text so they stack on top.
  shapes.push(...tableShapes);

  // Guarantee a tagged shape for every model component even if its element
  // produced no captured shape (fully transparent, zero-sized, or scrolled
  // out of view): reverse conversion must be able to rebuild the tree from
  // visible tags alone when the hidden metadata shapes are removed.
  for (const [id, info] of tagById) {
    if (taggedIds.has(id)) continue;
    const bounds = getSnapshotBounds(info.component, layoutContext) || {
      x: EXPORT_MARGIN,
      y: EXPORT_MARGIN,
      width: 12,
      height: 12,
    };
    shapes.push({ kind: "anchor", id, ...bounds, text: "", tag: info.tag });
  }

  return { shapes, slideWidth: SLIDE_WIDTH, slideHeight };
}

function buildComponentTagMap(model) {
  const map = new Map();
  const walk = (component, parentId, order) => {
    if (!component || typeof component !== "object") return;
    const type = String(component.type || "HtmlElement");
    if (type !== "Page" && component.id) {
      map.set(String(component.id), {
        component,
        tag: buildQtTag(component, { parentId, order }),
      });
    }
    const nextParentId = type === "Page" ? parentId : component.id;
    const children = Array.isArray(component.children) ? component.children : [];
    children.forEach((child, index) => walk(child, nextParentId, index + 1));
  };
  const roots = Array.isArray(model?.components) ? model.components : [];
  roots.forEach((component, index) => walk(component, "", index + 1));
  return map;
}

function transformRenderBounds(raw, layoutContext) {
  const scale = layoutContext.scale || 1;
  const slideWidth = layoutContext.slideWidth || SLIDE_WIDTH;
  const slideHeight = layoutContext.slideHeight || SLIDE_HEIGHT;
  const x = layoutContext.offsetX + (Number(raw.x) || 0) * scale;
  const y = layoutContext.offsetY + (Number(raw.y) || 0) * scale;
  const width = (Number(raw.width) || 0) * scale;
  const height = (Number(raw.height) || 0) * scale;
  // 1px separators/strips scale below 1pt but must survive as thin shapes.
  if (width < 0.2 || height < 0.2) return null;
  if (x >= slideWidth || y >= slideHeight) return null;
  return {
    x: Math.max(0, Math.round(x * 10) / 10),
    y: Math.max(0, Math.round(y * 10) / 10),
    width: Math.min(slideWidth, Math.max(0.75, Math.round(width * 10) / 10)),
    height: Math.min(slideHeight, Math.max(0.75, Math.round(height * 10) / 10)),
  };
}

function collectComponentShape(component, shapes, context) {
  if (!component || typeof component !== "object") return;
  const type = String(component.type || "HtmlElement");
  const bounds = resolveBounds(component, context);
  const style = getSnapshotStyle(component, context.layoutContext);
  const tag = buildQtTag(component, {
    parentId: context.parentId,
    order: context.order,
  });
  const shape = componentToPptShape(component, bounds, tag, style);
  if (shape) shapes.push(shape);

  const children = Array.isArray(component.children) ? component.children : [];
  const nextParentId = type === "Page" ? context.parentId : component.id;
  children.forEach((child, index) => {
    collectComponentShape(child, shapes, {
      depth: context.depth + 1,
      index,
      parentId: nextParentId,
      order: index + 1,
      layoutContext: context.layoutContext,
      parentBounds: bounds,
    });
  });

  if (type === "Table") {
    const columns = getTableColumns(component);
    shapes.push({
      kind: "table",
      id: `${component.id || "table"}Table`,
      x: bounds.x,
      y: bounds.y + 36,
      width: bounds.width,
      height: Math.max(72, bounds.height - 36),
      text: component.props?.title || component.table?.title || "",
      tag,
      style,
      columns,
    });
  }
}

function createPageJsonMetadataShapes(model) {
  const json = JSON.stringify(model || {});
  const encoded = Buffer.from(json, "utf8").toString("base64");
  const chunks = [];
  for (let index = 0; index < encoded.length; index += METADATA_CHUNK_SIZE) {
    chunks.push(encoded.slice(index, index + METADATA_CHUNK_SIZE));
  }
  return chunks.map((chunk, index) => ({
    kind: "metadata",
    id: `pageJsonMeta${index + 1}`,
    x: 0,
    y: 0,
    width: 1,
    height: 1,
    text: "",
    tag: [
      "qt:meta",
      "kind=pageJson",
      "encoding=base64",
      `chunk=${index + 1}`,
      `chunks=${chunks.length}`,
      `data=${chunk}`,
    ].join(";"),
  }));
}

function createLayoutContext(layoutSnapshot) {
  const components = Array.isArray(layoutSnapshot?.components)
    ? layoutSnapshot.components
    : [];
  const width = Math.max(1, Number(layoutSnapshot?.width) || 0);
  const height = Math.max(1, Number(layoutSnapshot?.height) || 0);
  const scale = width > 0 && height > 0
    ? Math.min(
        (SLIDE_WIDTH - EXPORT_MARGIN * 2) / width,
        (SLIDE_HEIGHT - EXPORT_MARGIN * 2) / height,
      )
    : 1;
  const usedScale = Number.isFinite(scale) && scale > 0 ? scale : 1;
  const offsetX = Math.max(EXPORT_MARGIN, (SLIDE_WIDTH - width * usedScale) / 2);
  const offsetY = Math.max(EXPORT_MARGIN, (SLIDE_HEIGHT - height * usedScale) / 2);
  return {
    scale: usedScale,
    offsetX,
    offsetY,
    byId: new Map(
      components
        .filter((item) => item?.id)
        .map((item) => [String(item.id), item]),
    ),
  };
}

function getSnapshotBounds(component, layoutContext) {
  if (!component?.id || !layoutContext?.byId) return null;
  const raw = layoutContext.byId.get(String(component.id));
  if (!raw) return null;
  const scale = layoutContext.scale || 1;
  const slideWidth = layoutContext.slideWidth || SLIDE_WIDTH;
  const slideHeight = layoutContext.slideHeight || SLIDE_HEIGHT;
  return {
    x: clampNumber(layoutContext.offsetX + Number(raw.x) * scale, 0, 0, slideWidth - 1),
    y: clampNumber(layoutContext.offsetY + Number(raw.y) * scale, 0, 0, slideHeight - 1),
    width: clampNumber(Number(raw.width) * scale, DEFAULT_COMPONENT_WIDTH, 2, slideWidth),
    height: clampNumber(Number(raw.height) * scale, DEFAULT_COMPONENT_HEIGHT, 2, slideHeight),
  };
}

function getSnapshotStyle(component, layoutContext) {
  if (!component?.id || !layoutContext?.byId) return null;
  const raw = layoutContext.byId.get(String(component.id));
  return raw?.style || null;
}

function componentToPptShape(component, bounds, tag, style) {
  const type = String(component.type || "HtmlElement");
  if (type === "Page") return null;
  const text = getComponentText(component);
  const base = {
    id: String(component.id || type),
    type,
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    text,
    tag,
    style,
  };

  if (type === "Card" || type === "CardSection" || type === "FormTemplate") {
    return { ...base, kind: "container" };
  }
  if (type === "Button") return { ...base, kind: "button" };
  if (type === "Input" || type === "Select" || type === "Toggle") {
    return { ...base, kind: "field" };
  }
  if (type === "Table") {
    return { ...base, kind: "tableTitle" };
  }
  if (type === "Separator") return { ...base, kind: "line" };
  if (type === "HtmlElement" && !String(text || "").trim()) return null;
  return { ...base, kind: "text" };
}

function resolveBounds(component, context) {
  const snapshotBounds = getSnapshotBounds(component, context.layoutContext);
  if (snapshotBounds) return snapshotBounds;

  const designer = component.designer || {};
  const parent = context.parentBounds || { x: 24, y: 24, width: 912, height: 492 };
  const fallbackY = parent.y + 20 + context.index * 52;
  const fallbackX = parent.x + Math.min(context.depth, 4) * 18;
  const fallbackWidth = Math.max(120, parent.width - Math.min(context.depth, 4) * 36);
  const isContainer = ["Card", "CardSection", "FormTemplate"].includes(component.type);
  return {
    x: clampNumber(designer.x, fallbackX, 0, SLIDE_WIDTH - 20),
    y: clampNumber(designer.y, fallbackY, 0, SLIDE_HEIGHT - 20),
    width: clampNumber(
      designer.width,
      isContainer ? fallbackWidth : Math.min(DEFAULT_COMPONENT_WIDTH, fallbackWidth),
      20,
      SLIDE_WIDTH,
    ),
    height: clampNumber(
      designer.height,
      isContainer ? Math.max(120, parent.height - 40) : DEFAULT_COMPONENT_HEIGHT,
      12,
      SLIDE_HEIGHT,
    ),
  };
}

function buildQtTag(component, options = {}) {
  const type = String(component.type || "HtmlElement");
  const parts = [`qt:type=${type}`];
  if (component.id) parts.push(`id=${component.id}`);
  if (options.parentId) parts.push(`parent=${options.parentId}`);
  if (options.order) parts.push(`order=${options.order}`);
  const label = component.props?.label || component.label;
  const text = component.text !== undefined ? component.text : "";
  if (label) parts.push(`label=${escapeTagValue(label)}`);
  if (type === "HtmlElement" && text) parts.push(`text=${escapeTagValue(text)}`);
  if (component.tag) parts.push(`tag=${component.tag}`);
  if (component.class) parts.push(`class=${escapeTagValue(component.class)}`);
  if (component.style) parts.push(`style=${escapeTagValue(component.style)}`);
  if (component.models?.modelValue) parts.push(`model=${component.models.modelValue}`);
  Object.entries(component.events || {}).forEach(([name, handler]) => {
    if (handler) parts.push(`event.${name}=${handler}`);
  });
  if (type === "Table") {
    const columns = getTableColumns(component);
    if (columns.length > 0) {
      parts.push(`columns=${columns.map((column) => `${column.field}:${escapeTagValue(column.label)}`).join(",")}`);
    }
  }
  const componentData = encodeComponentData(component);
  if (componentData && componentData.length <= METADATA_CHUNK_SIZE) {
    parts.push(`data=${componentData}`);
  }
  return parts.join(";");
}

function getComponentText(component) {
  if (component.type === "Button") {
    return String(component.props?.label || component.label || component.id || component.type);
  }
  // Inputs/selects/toggles never show their internal id in the webview, so
  // the PPT must not show it either - a blank field reads as a field.
  if (component.type === "Input" || component.type === "Select" || component.type === "Toggle") {
    return String(component.props?.label || component.label || "");
  }
  if (component.type === "Table") {
    return String(component.props?.title || component.table?.title || component.label || component.id || "Table");
  }
  if (component.text !== undefined) return String(component.text);
  if (component.props?.label) return String(component.props.label);
  return String(component.label || "");
}

function getTableColumns(component) {
  const source = Array.isArray(component.columns)
    ? component.columns
    : Array.isArray(component.props?.columns)
      ? component.props.columns
      : [];
  return source
    .map((column, index) => ({
      field: String(column.field || column.name || `field${index + 1}`),
      label: String(column.label || column.name || column.field || `Column ${index + 1}`),
    }))
    .filter((column) => column.field && column.label);
}

function encodeComponentData(component) {
  if (!component || typeof component !== "object") return "";
  const copy = JSON.parse(JSON.stringify(component));
  delete copy.children;
  delete copy.designer;
  return Buffer.from(JSON.stringify(copy), "utf8").toString("base64");
}

function runPowerPointExport(instructionPath, outputPath) {
  const script = `
$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$data = Get-Content -LiteralPath ${toPowerShellString(instructionPath)} -Raw -Encoding UTF8 | ConvertFrom-Json
$presentation = $null
$powerPoint = $null
function To-Rgb($r, $g, $b) { return [int]($r + ($g * 256) + ($b * 65536)) }
function Get-Rgb($colorObj, $fallbackR, $fallbackG, $fallbackB) {
  if ($colorObj -ne $null -and $colorObj.r -ne $null) {
    return To-Rgb ([int]$colorObj.r) ([int]$colorObj.g) ([int]$colorObj.b)
  }
  return To-Rgb $fallbackR $fallbackG $fallbackB
}
function Set-Text($shape, $text, $style, $fallbackFont, $fallbackSize, $fallbackAlign, $fallbackColorR, $fallbackColorG, $fallbackColorB) {
  try {
    $shape.TextFrame.TextRange.Text = [string]$text
    $shape.TextFrame.MarginLeft = 6
    $shape.TextFrame.MarginRight = 6
    $shape.TextFrame.MarginTop = 4
    $shape.TextFrame.MarginBottom = 4
    $font = if ($style -ne $null -and $style.fontFamily) { [string]$style.fontFamily } else { $fallbackFont }
    $size = if ($style -ne $null -and $style.fontSize) { [double]$style.fontSize } else { $fallbackSize }
    $shape.TextFrame.TextRange.Font.Name = $font
    $shape.TextFrame.TextRange.Font.Size = $size
    if ($style -ne $null -and $style.bold) { $shape.TextFrame.TextRange.Font.Bold = -1 }
    $alignValue = if ($style -ne $null -and $style.align) { [string]$style.align } else { $fallbackAlign }
    $alignNumber = 1
    if ($alignValue -eq "center") { $alignNumber = 2 }
    elseif ($alignValue -eq "right") { $alignNumber = 3 }
    $shape.TextFrame.TextRange.ParagraphFormat.Alignment = $alignNumber
    $shape.TextFrame.TextRange.Font.Color.RGB = Get-Rgb $style.color $fallbackColorR $fallbackColorG $fallbackColorB
  } catch {}
}
function Set-Tag($shape, $tag, $id) {
  try { $shape.AlternativeText = [string]$tag } catch {}
  try { $shape.Title = [string]$tag } catch {}
  try { $shape.Name = "qt_" + [string]$id } catch {}
}
try {
  $powerPoint = New-Object -ComObject PowerPoint.Application
  $powerPoint.Visible = -1
  $presentation = $powerPoint.Presentations.Add()
  $presentation.PageSetup.SlideWidth = [double]$data.slideWidth
  $presentation.PageSetup.SlideHeight = [double]$data.slideHeight
  $slide = $presentation.Slides.Add(1, 12)
  $slide.FollowMasterBackground = 0
  $slide.Background.Fill.ForeColor.RGB = To-Rgb 250 250 250
  foreach ($item in $data.shapes) {
    $kind = [string]$item.kind
    $x = [double]$item.x
    $y = [double]$item.y
    $w = [double]$item.width
    $h = [double]$item.height
    $shape = $null
    if ($kind -eq "metadata") {
      $shape = $slide.Shapes.AddTextbox(1, $x, $y, $w, $h)
      Set-Tag $shape $item.tag $item.id
      try { $shape.Visible = 0 } catch {}
      continue
    } elseif ($kind -eq "anchor") {
      $shape = $slide.Shapes.AddShape(1, $x, $y, $w, $h)
      $shape.Fill.Visible = 0
      $shape.Line.Visible = 0
    } elseif ($kind -eq "domBox") {
      $st = $item.style
      $shapeType = 1
      if ($st -ne $null -and $st.circle) { $shapeType = 9 }
      elseif ($st -ne $null -and $st.rounded) { $shapeType = 5 }
      $shape = $slide.Shapes.AddShape($shapeType, $x, $y, $w, $h)
      if ($st -ne $null -and $st.background -ne $null) {
        $shape.Fill.ForeColor.RGB = Get-Rgb $st.background 255 255 255
      } else {
        $shape.Fill.Visible = 0
      }
      if ($st -ne $null -and $st.borderColor -ne $null) {
        $shape.Line.ForeColor.RGB = Get-Rgb $st.borderColor 189 189 189
        try { $shape.Line.Weight = [double]$st.borderWidth } catch {}
      } else {
        $shape.Line.Visible = 0
      }
    } elseif ($kind -eq "domText") {
      $st = $item.style
      $shape = $slide.Shapes.AddTextbox(1, $x, $y, $w, $h)
      # AutoSize/WordWrap must be disabled BEFORE text insertion: otherwise
      # PowerPoint grows the box to fit the default 18pt font and the
      # captured geometry (and middle-anchored text position) is lost.
      try { $shape.TextFrame.AutoSize = 0 } catch {}
      try {
        $wrapValue = 0
        if ($st -ne $null -and $st.wrap) { $wrapValue = -1 }
        $shape.TextFrame.WordWrap = $wrapValue
      } catch {}
      try {
        $shape.TextFrame.MarginLeft = 0
        $shape.TextFrame.MarginRight = 0
        $shape.TextFrame.MarginTop = 0
        $shape.TextFrame.MarginBottom = 0
      } catch {}
      try { $shape.TextFrame.VerticalAnchor = 3 } catch {}
      try { $shape.TextFrame.TextRange.Text = [string]$item.text } catch {}
      try {
        if ($st -ne $null -and $st.fontFamily) { $shape.TextFrame.TextRange.Font.Name = [string]$st.fontFamily }
      } catch {}
      try {
        if ($st -ne $null -and $st.fontSize) { $shape.TextFrame.TextRange.Font.Size = [double]$st.fontSize }
        if ($st -ne $null -and $st.bold) { $shape.TextFrame.TextRange.Font.Bold = -1 }
        $shape.TextFrame.TextRange.Font.Color.RGB = Get-Rgb $st.color 33 33 33
      } catch {}
      try {
        $alignNumber = 1
        if ($st -ne $null -and [string]$st.align -eq "center") { $alignNumber = 2 }
        elseif ($st -ne $null -and [string]$st.align -eq "right") { $alignNumber = 3 }
        $shape.TextFrame.TextRange.ParagraphFormat.Alignment = $alignNumber
      } catch {}
    } elseif ($kind -eq "pptTable") {
      $rowCount = [int]$item.rows
      $colCount = [int]$item.cols
      $headerRows = [int]$item.headerRows
      $tableShape = $slide.Shapes.AddTable($rowCount, $colCount, $x, $y, $w, $h)
      $shape = $tableShape
      for ($c = 1; $c -le $colCount; $c++) {
        try { $tableShape.Table.Columns.Item($c).Width = [double]$item.columnWidths[$c - 1] } catch {}
      }
      for ($r = 1; $r -le $rowCount; $r++) {
        try { $tableShape.Table.Rows.Item($r).Height = [double]$item.rowHeights[$r - 1] } catch {}
      }
      for ($r = 1; $r -le $rowCount; $r++) {
        for ($c = 1; $c -le $colCount; $c++) {
          try {
            $cellShape = $tableShape.Table.Cell($r, $c).Shape
            $cellShape.TextFrame.TextRange.Font.Name = [string]$item.fontFamily
            $cellShape.TextFrame.TextRange.Font.Size = [double]$item.fontSize
            if ($r -le $headerRows) {
              $cellShape.Fill.ForeColor.RGB = Get-Rgb $item.headerBackground 92 138 202
              $cellShape.TextFrame.TextRange.Font.Bold = -1
              $cellShape.TextFrame.TextRange.Font.Color.RGB = Get-Rgb $item.headerColor 255 255 255
            } else {
              $cellShape.Fill.ForeColor.RGB = To-Rgb 255 255 255
              $cellShape.TextFrame.TextRange.Font.Bold = 0
              $cellShape.TextFrame.TextRange.Font.Color.RGB = Get-Rgb $item.bodyColor 33 33 33
            }
          } catch {}
        }
      }
      foreach ($cellDef in @($item.cells)) {
        $rs = [int]$cellDef.rowSpan
        $cs = [int]$cellDef.colSpan
        if ($rs -gt 1 -or $cs -gt 1) {
          try {
            $r1 = [int]$cellDef.row
            $c1 = [int]$cellDef.col
            $tableShape.Table.Cell($r1, $c1).Merge($tableShape.Table.Cell($r1 + $rs - 1, $c1 + $cs - 1))
          } catch {}
        }
      }
      foreach ($cellDef in @($item.cells)) {
        $cellText = [string]$cellDef.text
        if ($cellText -ne "") {
          try { $tableShape.Table.Cell([int]$cellDef.row, [int]$cellDef.col).Shape.TextFrame.TextRange.Text = $cellText } catch {}
        }
      }
    } elseif ($kind -eq "line") {
      $shape = $slide.Shapes.AddLine($x, $y + ($h / 2), $x + $w, $y + ($h / 2))
      $shape.Line.ForeColor.RGB = Get-Rgb $item.style.borderColor 150 150 150
    } elseif ($kind -eq "button") {
      $shapeType = if ($item.style -ne $null -and $item.style.rounded) { 5 } else { 1 }
      $shape = $slide.Shapes.AddShape($shapeType, $x, $y, $w, $h)
      $shape.Fill.ForeColor.RGB = Get-Rgb $item.style.background 25 118 210
      $shape.Line.ForeColor.RGB = Get-Rgb $item.style.borderColor 21 101 192
      Set-Text $shape $item.text $item.style "Malgun Gothic" 12 "center" 255 255 255
    } elseif ($kind -eq "field") {
      $shapeType = if ($item.style -ne $null -and $item.style.rounded) { 5 } else { 1 }
      $shape = $slide.Shapes.AddShape($shapeType, $x, $y, $w, $h)
      $shape.Fill.ForeColor.RGB = Get-Rgb $item.style.background 255 255 255
      $shape.Line.ForeColor.RGB = Get-Rgb $item.style.borderColor 117 117 117
      Set-Text $shape $item.text $item.style "Malgun Gothic" 12 "left" 33 33 33
    } elseif ($kind -eq "container") {
      $shapeType = if ($item.style -ne $null -and $item.style.rounded) { 5 } else { 1 }
      $shape = $slide.Shapes.AddShape($shapeType, $x, $y, $w, $h)
      if ($item.style -ne $null -and $item.style.background -ne $null) {
        $shape.Fill.ForeColor.RGB = Get-Rgb $item.style.background 255 255 255
      } else {
        $shape.Fill.Visible = 0
      }
      $shape.Line.ForeColor.RGB = Get-Rgb $item.style.borderColor 189 189 189
      Set-Text $shape $item.text $item.style "Malgun Gothic" 12 "left" 33 33 33
      $shape.ZOrder(1) | Out-Null
    } elseif ($kind -eq "table") {
      $columns = @($item.columns)
      $colCount = [Math]::Max(1, $columns.Count)
      $tableShape = $slide.Shapes.AddTable(2, $colCount, $x, $y, $w, $h)
      $shape = $tableShape
      for ($col = 1; $col -le $colCount; $col++) {
        $label = if ($columns.Count -ge $col) { [string]$columns[$col - 1].label } else { "Column $col" }
        $cell = $tableShape.Table.Cell(1, $col).Shape
        $cell.TextFrame.TextRange.Text = $label
        $font = if ($item.style -ne $null -and $item.style.fontFamily) { [string]$item.style.fontFamily } else { "Malgun Gothic" }
        $size = if ($item.style -ne $null -and $item.style.fontSize) { [double]$item.style.fontSize } else { 11 }
        $cell.TextFrame.TextRange.Font.Name = $font
        $cell.TextFrame.TextRange.Font.Size = $size
        $cell.Fill.ForeColor.RGB = Get-Rgb $item.style.background 232 240 254
      }
    } else {
      $shape = $slide.Shapes.AddTextbox(1, $x, $y, $w, $h)
      Set-Text $shape $item.text $item.style "Malgun Gothic" 12 "left" 33 33 33
    }
    if ($shape -ne $null) {
      Set-Tag $shape $item.tag $item.id
    }
  }
  $presentation.SaveAs(${toPowerShellString(outputPath)})
} finally {
  if ($presentation -ne $null) { $presentation.Close() | Out-Null }
  if ($powerPoint -ne $null) { $powerPoint.Quit() | Out-Null }
}
`;
  // DOM-driven exports can draw many hundreds of shapes; COM automation is
  // slow enough per shape that the default 2-minute budget can be exceeded.
  return runPowerShell(script, 300000);
}

function runPowerShell(script, timeout = 120000) {
  return new Promise((resolve, reject) => {
    const encoded = Buffer.from(script, "utf16le").toString("base64");
    execFile(
      "powershell.exe",
      ["-NoProfile", "-ExecutionPolicy", "Bypass", "-EncodedCommand", encoded],
      { windowsHide: true, timeout },
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

function clampNumber(value, fallback, min, max) {
  const number = Number(value);
  const next = Number.isFinite(number) ? number : fallback;
  return Math.min(max, Math.max(min, next));
}

function safeFileName(value) {
  return String(value || "QuasarPage")
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, " ")
    .trim() || "QuasarPage";
}

function escapeTagValue(value) {
  return String(value).replace(/;/g, ",").replace(/\r?\n/g, " ");
}

function toPowerShellString(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

module.exports = { exportPageJsonToTaggedPpt };
