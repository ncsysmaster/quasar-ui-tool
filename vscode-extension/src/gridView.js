function getGridHtml() {
  return [
    '<div id="form-context-menu" class="form-context-menu hidden" role="menu">',
    '<button data-form-action="add-row" role="menuitem">Row 추가</button>',
    '<button data-form-action="add-column" role="menuitem">Column 추가</button>',
    '<button data-split-cell role="menuitem">셀 나누기...</button>',
    '<button data-merge-cells role="menuitem">셀 병합</button>',
    '<span class="form-context-separator"></span>',
    '<button data-form-action="delete-row" role="menuitem">Row 삭제</button>',
    '<button data-form-action="delete-column" role="menuitem">Column 삭제</button>',
    '</div>',
    '<div id="form-cell-split-dialog" class="designer-dialog-backdrop hidden">',
    '<div class="designer-dialog" role="dialog" aria-modal="true" aria-labelledby="split-cell-title">',
    '<div class="designer-dialog-header">',
    '<strong id="split-cell-title">셀 나누기</strong>',
    '<button class="designer-dialog-close" data-split-cancel title="닫기" aria-label="닫기">×</button>',
    '</div>',
    '<div class="designer-dialog-body">',
    '<fieldset class="split-cell-fieldset">',
    '<legend>줄/칸 나누기</legend>',
    '<label class="split-cell-option"><input type="radio" name="split-direction" data-split-rows checked><span>줄 개수</span><input type="number" data-split-row-count min="1" max="20" value="2"></label>',
    '<label class="split-cell-option"><input type="radio" name="split-direction" data-split-columns><span>칸 개수</span><input type="number" data-split-column-count min="1" max="20" value="2" disabled></label>',
    '</fieldset>',
    '</div>',
    '<div class="designer-dialog-actions">',
    '<button class="primary" data-split-apply>나누기</button>',
    '<button data-split-cancel>취소</button>',
    '</div>',
    '</div>',
    '</div>',
  ].join("");
}

function getGridScript() {
  return [
    getFormGridMetric,
    buildFormGridMetricBadge,
    isInspectableGridRow,
    getNumericColumnClass,
    getNumericColumnValue,
    getFormResizeKind,
    buildFormResizeHandle,
    startFormLayoutResize,
    getFormLayoutContext,
    getFormGridDropCellId,
    findComponentPath,
    findFirstLayoutComponent,
    isLayoutRow,
    isLayoutColumn,
    isFormGridRow,
    getComponentClassTokens,
    setupFormContextMenu,
    showFormContextMenu,
    hideFormContextMenu,
    setupSplitCellDialog,
    showSplitCellDialog,
    hideSplitCellDialog,
    clampSplitCount,
  ].map((fn) => fn.toString()).join("\n\n");
}

function getGridStyles() {
  return [
    '.qt-html-element.qt-multi-selected { outline: 3px solid #00a6a6 !important; outline-offset: -3px !important; box-shadow: inset 0 0 0 1px rgba(0, 166, 166, 0.35) !important; }',
    '.qt-palette-drop-target { outline: 3px solid #21a366 !important; outline-offset: -3px !important; background-color: rgba(33, 163, 102, 0.1) !important; }',
    '.qt-layout-resizable { position: relative !important; }',
    '.qt-resize-handle { position: absolute; z-index: 120; display: block; touch-action: none; user-select: none; }',
    '.qt-resize-handle::after { content: ""; position: absolute; border-radius: 1px; background: #1976d2; opacity: 0.85; }',
    '.qt-resize-handle-row { right: 8px; bottom: -5px; left: 8px; height: 10px; cursor: ns-resize; }',
    '.qt-resize-handle-row::after { right: 0; bottom: 4px; left: 0; height: 2px; }',
    '.qt-resize-handle-column { top: 8px; right: -5px; bottom: 8px; width: 10px; cursor: ew-resize; }',
    '.qt-resize-handle-column::after { top: 0; right: 4px; bottom: 0; width: 2px; }',
    'body.qt-layout-resizing, body.qt-layout-resizing * { user-select: none !important; }',
    'body.qt-layout-resizing[data-resize-kind="row"], body.qt-layout-resizing[data-resize-kind="row"] * { cursor: ns-resize !important; }',
    'body.qt-layout-resizing[data-resize-kind="column"], body.qt-layout-resizing[data-resize-kind="column"] * { cursor: ew-resize !important; }',
    '.qt-grid-metric-host { position: relative !important; overflow: visible !important; }',
    '.qt-grid-metric-badge { position: absolute; z-index: 115; display: inline-flex; width: auto; height: 20px; padding: 1px 4px; align-items: center; justify-content: center; border: 1px solid; border-radius: 3px; font-family: var(--vscode-editor-font-family, monospace); font-size: 10px; font-weight: 600; line-height: 16px; white-space: nowrap; opacity: 0.6; pointer-events: none; user-select: none; }',
    '.qt-grid-metric-cell { top: 2px; right: 2px; color: #7a3215; border-color: rgba(239, 108, 53, 0.5); background: rgba(255, 224, 204, 0.44); }',
    '.qt-grid-metric-row { top: 2px; left: 2px; }',
    '.qt-grid-metric-valid { color: #174f52; border-color: rgba(79, 164, 168, 0.5); background: rgba(216, 241, 242, 0.44); }',
    '.qt-grid-metric-under { color: #6a4c00; border-color: rgba(214, 165, 0, 0.5); background: rgba(255, 241, 189, 0.44); }',
    '.qt-grid-metric-over { color: #7a1f26; border-color: rgba(209, 77, 87, 0.5); background: rgba(255, 217, 221, 0.44); }',
    '.form-context-menu { position: fixed; z-index: 10000; display: grid; min-width: 168px; padding: 4px; border: 1px solid var(--vscode-menu-border, var(--vscode-panel-border)); border-radius: 4px; color: var(--vscode-menu-foreground, var(--vscode-editor-foreground)); background: var(--vscode-menu-background, var(--vscode-editorWidget-background)); box-shadow: 0 6px 18px rgba(0, 0, 0, 0.35); }',
    '.form-context-menu button { min-height: 26px; padding: 4px 10px; border: 0; border-radius: 2px; color: inherit; background: transparent; text-align: left; }',
    '.form-context-menu button:hover:not(:disabled) { color: var(--vscode-menu-selectionForeground, var(--vscode-list-activeSelectionForeground)); background: var(--vscode-menu-selectionBackground, var(--vscode-list-activeSelectionBackground)); }',
    '.form-context-menu button:disabled { opacity: 0.45; cursor: default; }',
    '.form-context-separator { height: 1px; margin: 4px 6px; background: var(--vscode-menu-separatorBackground, var(--vscode-panel-border)); }',
    '.split-cell-fieldset { display: grid; gap: 8px; margin: 0; padding: 10px; border: 1px solid var(--vscode-panel-border); border-radius: 5px; }',
    '.split-cell-fieldset legend { padding: 0 5px; color: var(--vscode-descriptionForeground); font-weight: 700; font-size: 12px; }',
    '.split-cell-option { display: grid; grid-template-columns: 18px 72px 1fr; gap: 8px; align-items: center; }',
    '.split-cell-option input[type="radio"] { width: auto; min-height: auto; margin: 0; }',
    '.split-cell-option input[type="number"] { min-width: 0; }',
  ].join("\n");
}

function getFormGridMetric(component) {
  if (!showGridMetrics) return null;
  if (component?.type !== "HtmlElement") return null;

  const path = findComponentPath(model?.components || [], component.id);
  if (!path.some((item) => item?.designer?.template === "courseSearchForm")) return null;

  if (isInspectableGridRow(component)) {
    const total = (component.children || [])
      .reduce((sum, child) => sum + getNumericColumnValue(child), 0);
    return {
      kind: "row",
      label: `col-${total}`,
      title: `Row column total: ${total} / 12`,
      status: total === 12 ? "valid" : total > 12 ? "over" : "under",
    };
  }

  const parent = path[path.length - 2];
  const columnClass = getNumericColumnClass(component);
  return columnClass && isInspectableGridRow(parent)
    ? { kind: "cell", label: columnClass, title: `Cell width: ${columnClass}`, status: "cell" }
    : null;
}

function buildFormGridMetricBadge(metric) {
  if (!metric) return null;
  return vueRuntime.h("span", {
    class: ["qt-grid-metric-badge", `qt-grid-metric-${metric.kind}`, `qt-grid-metric-${metric.status}`],
    title: metric.title,
    "aria-hidden": "true",
  }, metric.label);
}

function isInspectableGridRow(component) {
  const children = component?.children || [];
  return isLayoutRow(component) && children.length > 0 &&
    children.every((child) => getNumericColumnValue(child) > 0);
}

function getNumericColumnClass(component) {
  return getComponentClassTokens(component)
    .find((token) => /^col-(?:[1-9]|1[0-2])$/.test(token)) || "";
}

function getNumericColumnValue(component) {
  const columnClass = getNumericColumnClass(component);
  return columnClass ? Number(columnClass.slice(4)) : 0;
}

function getFormResizeKind(component) {
  if (component?.type !== "HtmlElement" || !selectedId) return "";
  const selectedPath = findComponentPath(model?.components || [], selectedId);
  if (!selectedPath.some((item) => item?.designer?.template === "courseSearchForm")) return "";
  const selectedColumn = [...selectedPath].reverse().find(isLayoutColumn);
  const selectedRow = [...selectedPath].reverse().find(isFormGridRow);
  if (selectedColumn?.id === component.id) return "column";
  if (selectedRow?.id === component.id) return "row";
  if (component.id === selectedId && isLayoutColumn(component)) return "column";
  if (component.id === selectedId && isLayoutRow(component)) return "row";
  return "";
}

function buildFormResizeHandle(component, resizeKind) {
  if (!resizeKind) return null;
  return vueRuntime.h("span", {
    class: `qt-resize-handle qt-resize-handle-${resizeKind}`,
    title: resizeKind === "row" ? "Resize row height" : "Resize column width",
    draggable: false,
    onClick: (event) => { event.preventDefault(); event.stopPropagation(); },
    onPointerdown: (event) => startFormLayoutResize(event, component.id, resizeKind),
  });
}

function startFormLayoutResize(event, componentId, resizeKind) {
  if (event.button !== 0) return;
  event.preventDefault();
  event.stopPropagation();
  const handle = event.currentTarget;
  const element = handle.parentElement;
  if (!element) return;
  const startRect = element.getBoundingClientRect();
  const parentWidth = element.parentElement?.getBoundingClientRect().width || startRect.width;
  const startX = event.clientX;
  const startY = event.clientY;
  let nextValue = resizeKind === "row" ? startRect.height : 100;
  document.body.classList.add("qt-layout-resizing");
  document.body.dataset.resizeKind = resizeKind;
  handle.setPointerCapture?.(event.pointerId);

  const move = (moveEvent) => {
    moveEvent.preventDefault();
    if (resizeKind === "row") {
      nextValue = Math.max(24, Math.round(startRect.height + moveEvent.clientY - startY));
      element.style.height = `${nextValue}px`;
      return;
    }
    const width = Math.max(24, startRect.width + moveEvent.clientX - startX);
    nextValue = Math.max(2, Math.min(100, width / parentWidth * 100));
    const percent = `${Math.round(nextValue * 100) / 100}%`;
    element.style.flex = `0 0 ${percent}`;
    element.style.width = percent;
    element.style.maxWidth = percent;
  };

  const cleanup = () => {
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", finish);
    window.removeEventListener("pointercancel", cancel);
    document.body.classList.remove("qt-layout-resizing");
    delete document.body.dataset.resizeKind;
  };
  const finish = (finishEvent) => {
    finishEvent?.preventDefault();
    cleanup();
    vscode.postMessage({ type: "resizeFormLayout", id: componentId, resizeKind, value: nextValue });
  };
  const cancel = () => { cleanup(); render(); };
  window.addEventListener("pointermove", move, { passive: false });
  window.addEventListener("pointerup", finish, { once: true });
  window.addEventListener("pointercancel", cancel, { once: true });
}

function getFormLayoutContext(componentId) {
  const path = findComponentPath(model?.components || [], componentId);
  if (!path.length) return { rowId: "", columnId: "", splitCellId: "" };
  const selectedComponent = path[path.length - 1];
  const splitCell = isFormGridRow(selectedComponent) ? null : [...path].reverse().find(isLayoutColumn);
  const form = path.find((component) => component?.designer?.template === "courseSearchForm");
  const layoutContainer = form || [...path].reverse().find((component) =>
    component?.type === "Card" || component?.type === "CardSection");
  let row = [...path].reverse().find(isLayoutRow);
  let column = [...path].reverse().find(isLayoutColumn);
  if (layoutContainer) {
    row ||= findFirstLayoutComponent(layoutContainer, isLayoutRow);
    column ||= row ? findFirstLayoutComponent(row, isLayoutColumn) : null;
  }
  if (row && !column) column = findFirstLayoutComponent(row, isLayoutColumn);
  return { rowId: row?.id || "", columnId: column?.id || "", splitCellId: splitCell?.id || "" };
}

function getFormGridDropCellId(componentId) {
  const path = findComponentPath(model?.components || [], componentId);
  if (!path.some((component) => component?.designer?.template === "courseSearchForm")) return "";
  return [...path].reverse().find(isLayoutColumn)?.id || "";
}

function findComponentPath(components, id, ancestors = []) {
  for (const component of components || []) {
    const path = [...ancestors, component];
    if (component.id === id) return path;
    const childPath = findComponentPath(component.children, id, path);
    if (childPath.length) return childPath;
  }
  return [];
}

function findFirstLayoutComponent(component, predicate) {
  if (!component) return null;
  if (predicate(component)) return component;
  for (const child of component.children || []) {
    const found = findFirstLayoutComponent(child, predicate);
    if (found) return found;
  }
  return null;
}

function isLayoutRow(component) {
  return component?.type === "HtmlElement" && getComponentClassTokens(component).includes("row");
}

function isLayoutColumn(component) {
  return component?.type === "HtmlElement" && (
    component?.designer?.role === "splitCell" ||
    getComponentClassTokens(component).some((token) => token === "col" || token.startsWith("col-"))
  );
}

function isFormGridRow(component) {
  return !component?.designer?.splitCell && isLayoutRow(component) &&
    (component.children || []).some(isLayoutColumn);
}

function getComponentClassTokens(component) {
  return String(component?.class || component?.props?.class || "").split(/\s+/).filter(Boolean);
}

function setupFormContextMenu() {
  const menu = document.getElementById("form-context-menu");
  if (!menu) return;
  menu.querySelectorAll("[data-form-action]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      if (button.disabled) return;
      const action = button.dataset.formAction;
      const targetId = action.includes("column") ? menu.dataset.columnId : menu.dataset.rowId;
      hideFormContextMenu();
      vscode.postMessage({ type: "formLayoutAction", action, targetId });
    });
  });
  menu.querySelector("[data-split-cell]")?.addEventListener("click", (event) => {
    event.stopPropagation();
    const targetId = menu.dataset.splitCellId;
    if (!targetId || event.currentTarget.disabled) return;
    hideFormContextMenu();
    showSplitCellDialog(targetId);
  });
  menu.querySelector("[data-merge-cells]")?.addEventListener("click", (event) => {
    event.stopPropagation();
    if (event.currentTarget.disabled) return;
    const cellIds = String(menu.dataset.mergeCellIds || "").split(",").filter(Boolean);
    if (cellIds.length < 2) return;
    hideFormContextMenu();
    vscode.postMessage({ type: "mergeFormCells", cellIds });
  });
}

function showFormContextMenu(clientX, clientY, layoutContext) {
  const menu = document.getElementById("form-context-menu");
  if (!menu) return;
  menu.dataset.rowId = layoutContext.rowId || "";
  menu.dataset.columnId = layoutContext.columnId || "";
  menu.dataset.splitCellId = layoutContext.splitCellId || "";
  menu.dataset.mergeCellIds = (layoutContext.mergeCellIds || []).join(",");
  menu.querySelectorAll("[data-form-action]").forEach((button) => {
    button.disabled = button.dataset.formAction.includes("column")
      ? !layoutContext.columnId : !layoutContext.rowId;
  });
  const splitButton = menu.querySelector("[data-split-cell]");
  if (splitButton) splitButton.disabled = !layoutContext.splitCellId;
  const mergeButton = menu.querySelector("[data-merge-cells]");
  if (mergeButton) mergeButton.disabled = (layoutContext.mergeCellIds || []).length < 2;
  menu.classList.remove("hidden");
  const bounds = menu.getBoundingClientRect();
  menu.style.left = `${Math.max(4, Math.min(clientX, window.innerWidth - bounds.width - 4))}px`;
  menu.style.top = `${Math.max(4, Math.min(clientY, window.innerHeight - bounds.height - 4))}px`;
}

function hideFormContextMenu() {
  document.getElementById("form-context-menu")?.classList.add("hidden");
}

function setupSplitCellDialog() {
  const dialog = document.getElementById("form-cell-split-dialog");
  if (!dialog) return;
  const rowsEnabled = dialog.querySelector("[data-split-rows]");
  const columnsEnabled = dialog.querySelector("[data-split-columns]");
  const rowCount = dialog.querySelector("[data-split-row-count]");
  const columnCount = dialog.querySelector("[data-split-column-count]");
  rowsEnabled.addEventListener("change", () => {
    rowCount.disabled = !rowsEnabled.checked;
    columnCount.disabled = rowsEnabled.checked;
  });
  columnsEnabled.addEventListener("change", () => {
    columnCount.disabled = !columnsEnabled.checked;
    rowCount.disabled = columnsEnabled.checked;
  });
  dialog.querySelectorAll("[data-split-cancel]").forEach((button) =>
    button.addEventListener("click", hideSplitCellDialog));
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) hideSplitCellDialog();
  });
  dialog.querySelector("[data-split-apply]").addEventListener("click", () => {
    if (!rowsEnabled.checked && !columnsEnabled.checked) return;
    vscode.postMessage({
      type: "splitFormCell",
      targetId: dialog.dataset.targetId,
      rowsEnabled: rowsEnabled.checked,
      rowCount: clampSplitCount(rowCount.value),
      columnsEnabled: columnsEnabled.checked,
      columnCount: clampSplitCount(columnCount.value),
    });
    hideSplitCellDialog();
  });
}

function showSplitCellDialog(targetId) {
  const dialog = document.getElementById("form-cell-split-dialog");
  if (!dialog) return;
  dialog.dataset.targetId = targetId;
  dialog.querySelector("[data-split-rows]").checked = true;
  dialog.querySelector("[data-split-row-count]").value = "2";
  dialog.querySelector("[data-split-row-count]").disabled = false;
  dialog.querySelector("[data-split-columns]").checked = false;
  dialog.querySelector("[data-split-column-count]").value = "2";
  dialog.querySelector("[data-split-column-count]").disabled = true;
  dialog.classList.remove("hidden");
  dialog.querySelector("[data-split-row-count]").focus();
  dialog.querySelector("[data-split-row-count]").select();
}

function hideSplitCellDialog() {
  document.getElementById("form-cell-split-dialog")?.classList.add("hidden");
}

function clampSplitCount(value) {
  return Math.max(1, Math.min(20, Math.round(Number(value) || 1)));
}

module.exports = { getGridHtml, getGridScript, getGridStyles };
