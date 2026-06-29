const { getTableStyles } = require("./tableStyles");

function getTableHtml() {
  return `<div id="table-wizard-dialog" class="designer-dialog-backdrop hidden">
  <div class="designer-dialog table-wizard-dialog" role="dialog" aria-modal="true" aria-labelledby="table-wizard-title">
    <div class="designer-dialog-header">
      <strong id="table-wizard-title">Table Wizard</strong>
      <button class="designer-dialog-close" type="button" data-table-wizard-cancel aria-label="닫기">×</button>
    </div>
    <div class="designer-dialog-body table-wizard-body">
      <label class="field"><span>테이블명</span><input data-table-name value="Table"></label>
      <label class="field"><span>row-key</span><input data-table-row-key value="id"></label>
      <label class="field"><span>rows binding</span><input data-table-rows-binding placeholder="예: storeName.rows"></label>
      <label class="field"><span>loading binding</span><input data-table-loading-binding placeholder="예: storeName.loading"></label>
      <label class="field"><span>선택 방식</span><select data-table-selection><option value="none">none</option><option value="single">single</option><option value="multiple">multiple</option></select></label>
      <label class="check table-wizard-check"><input type="checkbox" data-table-pagination checked><span>페이징 사용</span></label>
      <label class="check table-wizard-check"><input type="checkbox" data-table-filter><span>검색 필터 사용</span></label>
      <label class="check table-wizard-check"><input type="checkbox" data-table-mode-column checked><span>mode column</span></label>
      <label class="check table-wizard-check"><input type="checkbox" data-table-excel-copy checked><span>Excel copy</span></label>
      <fieldset class="table-wizard-toolbar"><legend>상단 버튼</legend>
        <label class="check"><input type="checkbox" data-table-toolbar="search"><span>검색</span></label>
        <label class="check"><input type="checkbox" data-table-toolbar="add" checked><span>신규</span></label>
        <label class="check"><input type="checkbox" data-table-toolbar="save" checked><span>저장</span></label>
        <label class="check"><input type="checkbox" data-table-toolbar="delete" checked><span>삭제</span></label>
        <label class="check"><input type="checkbox" data-table-toolbar="excel"><span>엑셀</span></label>
        <label class="check"><input type="checkbox" data-table-toolbar="refresh" checked><span>새로고침</span></label>
      </fieldset>
      <div class="error-text hidden" data-table-wizard-error></div>
    </div>
    <div class="designer-dialog-actions">
      <button type="button" data-table-wizard-cancel>취소</button>
      <button class="primary" type="button" data-table-wizard-create>생성</button>
    </div>
  </div>
</div>
<div id="table-columns-dialog" class="designer-dialog-backdrop hidden">
  <div class="designer-dialog table-columns-dialog" role="dialog" aria-modal="true" aria-labelledby="table-columns-title">
    <div class="designer-dialog-header">
      <strong id="table-columns-title">Table 컬럼 편집</strong>
      <button class="designer-dialog-close" type="button" data-table-columns-cancel aria-label="닫기">×</button>
    </div>
    <div class="table-columns-body">
      <div class="table-columns-grid" data-table-columns-grid></div>
    </div>
    <div class="designer-dialog-actions">
      <button type="button" data-table-columns-cancel>취소</button>
      <button class="primary" type="button" data-table-columns-save>적용</button>
    </div>
  </div>
</div>
<div id="table-context-menu" class="form-context-menu hidden" role="menu">
  <button type="button" data-table-context="edit" role="menuitem">컬럼 편집...</button>
  <button type="button" data-table-context="add" role="menuitem">컬럼 추가</button>
</div>`;
}

function getTableScript() {
  return [
    setupTableDialogs,
    showTableWizard,
    hideTableWizard,
    submitTableWizard,
    setTableWizardError,
    showTableContextMenu,
    hideTableContextMenu,
    showTableColumnsDialog,
    hideTableColumnsDialog,
    normalizeTableColumnDrafts,
    normalizeTableLayoutRows,
    createDefaultTableLayoutRows,
    createLayoutRowsFromLegacyHeaders,
    getLayoutRowsForTab,
    setLayoutRowsForTab,
    getLayoutRowLimitForTab,
    getLayoutCellColumns,
    getLayoutCellStartIndex,
    getLayoutCellSpan,
    getTableDraftHeaderValue,
    getTableDraftHeaderFieldValue,
    renderTableColumnTree,
    renderTableLayoutTree,
    renderTableColumnProperties,
    renderTableLayoutProperties,
    renderTableColumnPropertySection,
    getTableColumnTreeNodes,
    getTableLayoutTreeNodes,
    getTableColumnDisplayName,
    getColumnFieldKey,
    selectTableColumnNode,
    addTableColumn,
    deleteSelectedTableColumn,
    moveSelectedTableColumn,
    getSelectedTableColumnPropertyIndex,
    updateSelectedTableColumnProperty,
    updateSelectedTableLayoutProperty,
    syncLayoutColumnReference,
    addTableLayoutRow,
    removeTableLayoutRow,
    mergeSelectedTableLayoutCells,
    splitSelectedTableLayoutCell,
    renderTableLayoutGrid,
    renderTableColumnsEditor,
    readTableColumnsEditor,
    readTableHeaderLayout,
    readTableBodyLayout,
    createDefaultTableColumn,
    findTableComponent,
  ]
    .map((fn) => fn.toString())
    .join("\n\n");
}

function setupTableDialogs() {
  const wizard = document.getElementById("table-wizard-dialog");
  wizard?.querySelectorAll("[data-table-wizard-cancel]").forEach((button) =>
    button.addEventListener("click", hideTableWizard),
  );
  wizard
    ?.querySelector("[data-table-wizard-create]")
    ?.addEventListener("click", submitTableWizard);
  wizard?.addEventListener("pointerdown", (event) => {
    if (event.target === wizard) hideTableWizard();
  });

  const columnsDialog = document.getElementById("table-columns-dialog");
  columnsDialog
    ?.querySelectorAll("[data-table-columns-cancel]")
    .forEach((button) => button.addEventListener("click", hideTableColumnsDialog));
  columnsDialog
    ?.querySelector("[data-table-columns-save]")
    ?.addEventListener("click", () => {
      const columns = readTableColumnsEditor();
      vscode.postMessage({
        type: "updateTableColumns",
        id: tableColumnsComponentId,
        columns,
        headerRows: tableColumnsHeaderRows,
        rowRows: tableColumnsBodyRows.length || 1,
        headerLayout: readTableHeaderLayout(),
        bodyRows: readTableBodyLayout(),
      });
      hideTableColumnsDialog();
    });

  const menu = document.getElementById("table-context-menu");
  menu?.querySelectorAll("[data-table-context]").forEach((button) =>
    button.addEventListener("click", () => {
      const componentId = menu.dataset.componentId || "";
      const action = button.dataset.tableContext;
      hideTableContextMenu();
      showTableColumnsDialog(componentId, action === "add");
    }),
  );
  document.addEventListener("pointerdown", (event) => {
    if (!event.target.closest?.("#table-context-menu")) hideTableContextMenu();
  });
}

function showTableWizard(request = {}) {
  const dialog = document.getElementById("table-wizard-dialog");
  if (!dialog) return;
  pendingTableWizard = {
    paletteIndex: Number(request.paletteIndex),
    targetId: request.targetId || "",
    dropMode: request.dropMode || "inside",
  };
  dialog.querySelector("[data-table-name]").value = "Table";
  dialog.querySelector("[data-table-row-key]").value = "id";
  dialog.querySelector("[data-table-rows-binding]").value = "";
  dialog.querySelector("[data-table-loading-binding]").value = "";
  dialog.querySelector("[data-table-selection]").value = "none";
  dialog.querySelector("[data-table-pagination]").checked = true;
  dialog.querySelector("[data-table-filter]").checked = false;
  dialog.querySelector("[data-table-mode-column]").checked = true;
  dialog.querySelector("[data-table-excel-copy]").checked = true;
  dialog.querySelectorAll("[data-table-toolbar]").forEach((input) => {
    input.checked = ["add", "save", "delete", "refresh"].includes(
      input.dataset.tableToolbar,
    );
  });
  setTableWizardError("");
  dialog.classList.remove("hidden");
  dialog.querySelector("[data-table-name]").focus();
  dialog.querySelector("[data-table-name]").select();
}

function hideTableWizard() {
  document.getElementById("table-wizard-dialog")?.classList.add("hidden");
  pendingTableWizard = null;
}

function submitTableWizard() {
  const dialog = document.getElementById("table-wizard-dialog");
  if (!dialog || !pendingTableWizard) return;
  const tableName = dialog.querySelector("[data-table-name]").value.trim();
  const rowKey = dialog.querySelector("[data-table-row-key]").value.trim();
  if (!tableName) return setTableWizardError("테이블명을 입력하세요.");
  if (!rowKey) return setTableWizardError("row-key를 입력하세요.");
  const toolbar = {};
  dialog.querySelectorAll("[data-table-toolbar]").forEach((input) => {
    toolbar[input.dataset.tableToolbar] = input.checked;
  });
  const request = pendingTableWizard;
  pendingTableWizard = null;
  dialog.classList.add("hidden");
  vscode.postMessage({
    type: "createTable",
    paletteIndex: request.paletteIndex,
    targetId: request.targetId,
    dropMode: request.dropMode,
    options: {
      title: tableName,
      rowKey,
      rowsBinding: dialog.querySelector("[data-table-rows-binding]").value.trim(),
      loadingBinding: dialog.querySelector("[data-table-loading-binding]").value.trim(),
      selection: dialog.querySelector("[data-table-selection]").value,
      pagination: dialog.querySelector("[data-table-pagination]").checked,
      filter: dialog.querySelector("[data-table-filter]").checked,
      showModeColumn: dialog.querySelector("[data-table-mode-column]").checked,
      excelCopy: dialog.querySelector("[data-table-excel-copy]").checked,
      toolbar,
    },
  });
}

function setTableWizardError(message) {
  const error = document.querySelector("[data-table-wizard-error]");
  if (!error) return;
  error.textContent = message;
  error.classList.toggle("hidden", !message);
}

function showTableContextMenu(clientX, clientY, componentId) {
  const menu = document.getElementById("table-context-menu");
  if (!menu) return;
  menu.dataset.componentId = componentId || "";
  menu.classList.remove("hidden");
  const bounds = menu.getBoundingClientRect();
  menu.style.left = Math.max(4, Math.min(clientX, innerWidth - bounds.width - 4)) + "px";
  menu.style.top = Math.max(4, Math.min(clientY, innerHeight - bounds.height - 4)) + "px";
}

function hideTableContextMenu() {
  document.getElementById("table-context-menu")?.classList.add("hidden");
}

function showTableColumnsDialog(componentId, appendColumn = false, initialNode = null) {
  const component = findTableComponent(model?.components || [], componentId);
  const dialog = document.getElementById("table-columns-dialog");
  if (!component || component.type !== "Table" || !dialog) return;
  tableColumnsComponentId = componentId;
  tableColumnsDraft = normalizeTableColumnDrafts(component.columns || []);
  tableColumnsHeaderRows = Math.min(3, Math.max(1, Math.round(Number(component.table?.headerRows || 1))));
  tableColumnsHeaderLayout = normalizeTableLayoutRows(
    component.headerRows || createLayoutRowsFromLegacyHeaders(tableColumnsDraft, tableColumnsHeaderRows),
    tableColumnsDraft,
    tableColumnsHeaderRows,
    "header",
  );
  tableColumnsBodyRows = normalizeTableLayoutRows(
    component.bodyRows || createDefaultTableLayoutRows(tableColumnsDraft, Math.min(3, Math.max(1, Math.round(Number(component.table?.rowRows || 1)))), "body"),
    tableColumnsDraft,
    Math.min(3, Math.max(1, Math.round(Number(component.table?.rowRows || 1)))),
    "body",
  );
  if (tableColumnsDraft.length === 0) tableColumnsDraft.push(createDefaultTableColumn(1));
  if (appendColumn) {
    const column = createDefaultTableColumn(tableColumnsDraft.length + 1);
    tableColumnsDraft.push(column);
    const cell = { label: column.label, field: column.field, columns: [column.field] };
    tableColumnsHeaderLayout.forEach((row) => row.push({ ...cell, columns: [...cell.columns] }));
    tableColumnsBodyRows.forEach((row) => row.push({ ...cell, columns: [...cell.columns] }));
  }
  tableColumnsActiveTab = initialNode?.kind === "layout" ? initialNode.layout : "columns";
  tableColumnsSelectedNode = initialNode || { kind: "column", index: Math.max(0, tableColumnsDraft.length - 1) };
  renderTableColumnsEditor();
  dialog.classList.remove("hidden");
}

function hideTableColumnsDialog() {
  document.getElementById("table-columns-dialog")?.classList.add("hidden");
  tableColumnsComponentId = "";
  tableColumnsDraft = [];
  tableColumnsHeaderRows = 1;
  tableColumnsHeaderLayout = [];
  tableColumnsBodyRows = [];
  tableColumnsActiveTab = "columns";
  tableColumnsSelectedNode = null;
}

function normalizeTableColumnDrafts(columns) {
  const source = Array.isArray(columns) ? columns : [];
  return source.map((column, index) => {
    const name = String(column?.name || column?.field || "column" + (index + 1)).trim();
    const field = String(column?.field || name).trim();
    const next = {
      name,
      label: String(column?.label || name),
      field,
      type: String(column?.type || "text"),
      align: ["left", "center", "right"].includes(column?.align) ? column.align : "left",
      width: String(column?.width || ""),
      sortable: Boolean(column?.sortable),
      required: Boolean(column?.required),
      editable: Boolean(column?.editable),
    };
    if (column?.format) next.format = String(column.format);
    if (column?.render) next.render = String(column.render);
    if (Array.isArray(column?.headers)) next.headers = column.headers.slice();
    if (Array.isArray(column?.headerFields)) next.headerFields = column.headerFields.slice();
    return next;
  });
}

function normalizeTableLayoutRows(rows, columns, rowCount, kind) {
  const columnKeys = (columns || []).map(getColumnFieldKey);
  const limit = Math.min(3, Math.max(1, Math.round(Number(rowCount || 1))));
  const defaults = createDefaultTableLayoutRows(columns, limit, kind);
  const source = Array.isArray(rows) && rows.length > 0
    ? rows.slice(0, limit)
    : [];
  while (source.length < limit) source.push(defaults[source.length] || defaults[0] || []);

  return source.map((row) => {
    const cells = Array.isArray(row) ? row : [];
    const nextCells = [];
    let cursor = 0;
    cells.forEach((cell) => {
      const rawColumns = getLayoutCellColumns(cell);
      const startKey = rawColumns.find((key) => columnKeys.includes(key)) || columnKeys[cursor] || "";
      const start = Math.max(0, columnKeys.indexOf(startKey));
      const span = Math.max(1, Math.min(columnKeys.length - start, Number(cell?.colspan || rawColumns.length || 1)));
      const keys = columnKeys.slice(start, start + span);
      if (keys.length === 0) return;
      cursor = start + span;
      nextCells.push({
        label: String(cell?.label || cell?.headerName || keys.map((key) => {
          const column = columns[columnKeys.indexOf(key)];
          return column?.label || key;
        }).join(" / ")),
        field: String(cell?.field || keys[0] || ""),
        columns: keys,
        ...(span > 1 ? { colspan: span } : {}),
        ...(Number(cell?.rowspan) > 1 ? { rowspan: Math.min(limit, Math.round(Number(cell.rowspan))) } : {}),
      });
    });

    if (nextCells.length === 0) {
      return createDefaultTableLayoutRows(columns, 1, kind)[0] || [];
    }
    return nextCells;
  });
}

function createDefaultTableLayoutRows(columns, rowCount = 1, kind = "body") {
  const count = Math.min(3, Math.max(1, Math.round(Number(rowCount || 1))));
  return Array.from({ length: count }, (_, rowIndex) =>
    (columns || []).map((column, columnIndex) => ({
      label: kind === "header" && rowIndex > 0
        ? "title" + (columnIndex + 1)
        : String(column?.label || column?.name || column?.field || "Column"),
      field: getColumnFieldKey(column),
      columns: [getColumnFieldKey(column)],
    })),
  );
}

function createLayoutRowsFromLegacyHeaders(columns, headerRows) {
  const groupRows = Math.max(0, Math.min(2, Number(headerRows || 1) - 1));
  if (groupRows <= 0) return createDefaultTableLayoutRows(columns, 1, "header");
  const rows = [];
  for (let rowIndex = 0; rowIndex < groupRows; rowIndex += 1) {
    rows.push((columns || []).map((column) => ({
      label: getTableDraftHeaderValue(column, rowIndex) || getTableColumnDisplayName(column),
      field: getTableDraftHeaderFieldValue(column, rowIndex) || getColumnFieldKey(column),
      columns: [getColumnFieldKey(column)],
    })));
  }
  rows.push((columns || []).map((column) => ({
    label: getTableColumnDisplayName(column),
    field: getColumnFieldKey(column),
    columns: [getColumnFieldKey(column)],
  })));
  return rows;
}

function getLayoutRowsForTab(tab = tableColumnsActiveTab) {
  return tab === "header" ? tableColumnsHeaderLayout : tableColumnsBodyRows;
}

function setLayoutRowsForTab(tab, rows) {
  if (tab === "header") {
    tableColumnsHeaderLayout = normalizeTableLayoutRows(rows, tableColumnsDraft, rows.length || 1, "header");
    tableColumnsHeaderRows = tableColumnsHeaderLayout.length || 1;
  } else if (tab === "body") {
    tableColumnsBodyRows = normalizeTableLayoutRows(rows, tableColumnsDraft, rows.length || 1, "body");
  }
}

function getLayoutRowLimitForTab(tab = tableColumnsActiveTab) {
  return 3;
}

function getLayoutCellColumns(cell) {
  if (Array.isArray(cell?.columns)) return cell.columns.map(String).filter(Boolean);
  if (cell?.field) return [String(cell.field)];
  return [];
}

function getLayoutCellStartIndex(cell) {
  const keys = tableColumnsDraft.map(getColumnFieldKey);
  const first = getLayoutCellColumns(cell)[0];
  const index = keys.indexOf(first);
  return index >= 0 ? index : 0;
}

function getLayoutCellSpan(cell) {
  return Math.max(1, Number(cell?.colspan || getLayoutCellColumns(cell).length || 1));
}

function getTableDraftHeaderValue(column, rowIndex) {
  if (Array.isArray(column?.headers)) return String(column.headers[rowIndex] || "");
  if (rowIndex === 0) return String(column?.header1 || column?.headerGroup || column?.group || "");
  if (rowIndex === 1) return String(column?.header2 || column?.headerSubGroup || "");
  return "";
}

function getTableDraftHeaderFieldValue(column, rowIndex) {
  if (Array.isArray(column?.headerFields)) return String(column.headerFields[rowIndex] || "");
  if (Array.isArray(column?.groupFields)) return String(column.groupFields[rowIndex] || "");
  if (rowIndex === 0) return String(column?.headerField || column?.groupField || "");
  return "";
}

function renderTableColumnTree(nodes, depth = 0) {
  return (nodes || []).map((node) => {
    const isSelected = tableColumnsSelectedNode &&
      tableColumnsSelectedNode.kind === node.kind &&
      tableColumnsSelectedNode.index === node.index;
    const padding = 10 + depth * 20;
    const children = node.children?.length
      ? '<div class="table-column-tree-children">' + renderTableColumnTree(node.children, depth + 1) + '</div>'
      : '';
    return '<div class="table-column-tree-node-wrap">' +
      '<button type="button" class="table-column-tree-node' + (isSelected ? ' selected' : '') + '" style="padding-left:' + padding + 'px" data-node-kind="column" data-column-index="' + node.index + '">' +
        '<span class="table-column-tree-toggle"></span>' +
        '<span class="table-column-tree-label">' + escapeAttr(node.label || '') + '</span>' +
      '</button>' + children + '</div>';
  }).join('');
}

function renderTableLayoutTree(nodes, depth = 0) {
  return (nodes || []).map((node) => {
    const isSelected = tableColumnsSelectedNode &&
      tableColumnsSelectedNode.kind === "layout" &&
      tableColumnsSelectedNode.layout === node.layout &&
      tableColumnsSelectedNode.rowIndex === node.rowIndex &&
      tableColumnsSelectedNode.cellIndex === node.cellIndex;
    const padding = 10 + depth * 20;
    const children = node.children?.length
      ? '<div class="table-column-tree-children">' + renderTableLayoutTree(node.children, depth + 1) + '</div>'
      : '';
    const attrs = node.cellIndex === undefined
      ? 'data-node-kind="layout-row" data-layout="' + node.layout + '" data-row-index="' + node.rowIndex + '"'
      : 'data-node-kind="layout" data-layout="' + node.layout + '" data-row-index="' + node.rowIndex + '" data-cell-index="' + node.cellIndex + '"';
    return '<div class="table-column-tree-node-wrap">' +
      '<button type="button" class="table-column-tree-node' + (isSelected ? ' selected' : '') + '" style="padding-left:' + padding + 'px" ' + attrs + '>' +
        '<span class="table-column-tree-toggle">' + (node.children?.length ? '⌄' : '') + '</span>' +
        '<span class="table-column-tree-label">' + escapeAttr(node.label || '') + '</span>' +
      '</button>' + children + '</div>';
  }).join('');
}

function renderTableColumnProperties() {
  if (tableColumnsSelectedNode?.kind === "layout") return renderTableLayoutProperties(tableColumnsSelectedNode);
  const index = Number.isInteger(tableColumnsSelectedNode?.index) ? tableColumnsSelectedNode.index : 0;
  return renderTableColumnPropertySection(index, true);
}

function renderTableLayoutProperties(node) {
  const rows = getLayoutRowsForTab(node.layout);
  const cell = rows?.[node.rowIndex]?.[node.cellIndex];
  if (!cell) {
    return '<section class="table-column-props"><div class="table-column-props-title">셀 속성</div><div class="table-column-empty">셀을 선택하세요.</div></section>';
  }
  const columnText = getLayoutCellColumns(cell).join(', ');
  return '<section class="table-column-props">' +
    '<div class="table-column-props-title">' + (node.layout === 'header' ? 'Header 셀 속성' : 'Body 셀 속성') + '</div>' +
    '<div class="table-column-prop-head"><span>구분</span><span>속성</span></div>' +
    '<label class="table-column-prop-row"><span>Row</span><input value="' + (node.rowIndex + 1) + '" disabled></label>' +
    '<label class="table-column-prop-row"><span>Label</span><input data-layout-prop="label" value="' + escapeAttr(cell.label || '') + '"></label>' +
    '<label class="table-column-prop-row"><span>Field</span><input data-layout-prop="field" value="' + escapeAttr(cell.field || '') + '"></label>' +
    '<label class="table-column-prop-row"><span>Columns</span><input value="' + escapeAttr(columnText) + '" disabled></label>' +
    '<label class="table-column-prop-row"><span>Colspan</span><input data-layout-prop="colspan" value="' + escapeAttr(cell.colspan || getLayoutCellColumns(cell).length || 1) + '"></label>' +
    '<label class="table-column-prop-row"><span>Rowspan</span><input data-layout-prop="rowspan" value="' + escapeAttr(cell.rowspan || 1) + '"></label>' +
    '<div class="table-column-prop-actions"><button type="button" data-layout-split-selected>병합 취소</button></div>' +
  '</section>';
}

function renderTableColumnPropertySection(index, showActions = true) {
  const column = tableColumnsDraft[index] || tableColumnsDraft[0] || createDefaultTableColumn(1);
  const typeOptions = ["text", "number", "date", "datetime", "checkbox", "select", "badge", "button", "link", "image", "actions"];
  const alignOptions = ["left", "center", "right"];
  const select = (name, value, options) => '<select data-column-prop="' + name + '">' + options.map((option) => '<option value="' + option + '"' + (String(value) === option ? ' selected' : '') + '>' + option + '</option>').join('') + '</select>';
  const checkbox = (name, checked) => '<input type="checkbox" data-column-prop="' + name + '"' + (checked ? ' checked' : '') + '>';
  const actions = showActions
    ? '<div class="table-column-prop-actions"><button type="button" data-column-move-selected="up">위로</button><button type="button" data-column-move-selected="down">아래로</button><button type="button" data-column-delete-selected>삭제</button></div>'
    : '';
  return '<section class="table-column-props">' +
    '<div class="table-column-props-title">Column 속성</div>' +
    '<div class="table-column-prop-head"><span>구분</span><span>속성</span></div>' +
    '<label class="table-column-prop-row"><span>Column명</span><input data-column-prop="name" value="' + escapeAttr(column.name || '') + '"></label>' +
    '<label class="table-column-prop-row"><span>Label</span><input data-column-prop="label" value="' + escapeAttr(column.label || '') + '"></label>' +
    '<label class="table-column-prop-row"><span>Field</span><input data-column-prop="field" value="' + escapeAttr(column.field || '') + '"></label>' +
    '<label class="table-column-prop-row"><span>Type</span>' + select('type', column.type || 'text', typeOptions) + '</label>' +
    '<label class="table-column-prop-row"><span>Align</span>' + select('align', column.align || 'left', alignOptions) + '</label>' +
    '<label class="table-column-prop-row"><span>Width</span><input data-column-prop="width" value="' + escapeAttr(column.width || '') + '"></label>' +
    '<label class="table-column-prop-row"><span>Sortable</span>' + checkbox('sortable', column.sortable) + '</label>' +
    '<label class="table-column-prop-row"><span>Required</span>' + checkbox('required', column.required) + '</label>' +
    '<label class="table-column-prop-row"><span>Editable</span>' + checkbox('editable', column.editable) + '</label>' +
    '<label class="table-column-prop-row"><span>Format</span><input data-column-prop="format" value="' + escapeAttr(column.format || '') + '"></label>' +
    '<label class="table-column-prop-row"><span>Render</span><input data-column-prop="render" value="' + escapeAttr(column.render || '') + '"></label>' +
    actions +
  '</section>';
}

function getTableColumnTreeNodes() {
  return tableColumnsDraft.map((column, index) => ({
    kind: "column",
    index,
    label: getTableColumnDisplayName(column),
    children: [],
  }));
}

function getTableLayoutTreeNodes(layout) {
  const rows = getLayoutRowsForTab(layout);
  return rows.map((row, rowIndex) => ({
    kind: "layout-row",
    layout,
    rowIndex,
    label: (layout === "header" ? "Header " : "Body ") + (rowIndex + 1),
    children: row.map((cell, cellIndex) => ({
      kind: "layout",
      layout,
      rowIndex,
      cellIndex,
      label: cell.label || cell.field || getLayoutCellColumns(cell).join(", "),
      children: [],
    })),
  }));
}

function getTableColumnDisplayName(column) {
  return String(column?.label || column?.name || column?.field || 'Column');
}

function getColumnFieldKey(column) {
  return String(column?.field || column?.name || '').trim();
}

function selectTableColumnNode(event) {
  if (event.target?.matches?.('[data-layout-cell-select]')) return;
  const button = event.target.closest('[data-node-kind]');
  if (!button) return;
  if (button.dataset.nodeKind === 'column') {
    tableColumnsSelectedNode = { kind: 'column', index: Number(button.dataset.columnIndex) };
  } else if (button.dataset.nodeKind === 'layout') {
    tableColumnsSelectedNode = {
      kind: 'layout',
      layout: button.dataset.layout,
      rowIndex: Number(button.dataset.rowIndex),
      cellIndex: Number(button.dataset.cellIndex),
    };
  }
  renderTableColumnsEditor();
}

function addTableColumn() {
  tableColumnsDraft = readTableColumnsEditor();
  const column = createDefaultTableColumn(tableColumnsDraft.length + 1);
  tableColumnsDraft.push(column);
  const cell = { label: column.label, field: column.field, columns: [column.field] };
  tableColumnsHeaderLayout.forEach((row) => row.push({ ...cell }));
  tableColumnsBodyRows.forEach((row) => row.push({ ...cell }));
  tableColumnsSelectedNode = { kind: 'column', index: tableColumnsDraft.length - 1 };
  renderTableColumnsEditor();
}

function deleteSelectedTableColumn() {
  if (tableColumnsSelectedNode?.kind !== 'column') return;
  const index = Number(tableColumnsSelectedNode.index);
  if (!Number.isInteger(index) || !tableColumnsDraft[index]) return;
  const removedKey = getColumnFieldKey(tableColumnsDraft[index]);
  tableColumnsDraft.splice(index, 1);
  [tableColumnsHeaderLayout, tableColumnsBodyRows].forEach((rows) => {
    rows.forEach((row) => {
      for (let cellIndex = row.length - 1; cellIndex >= 0; cellIndex -= 1) {
        const keys = getLayoutCellColumns(row[cellIndex]).filter((key) => key !== removedKey);
        if (keys.length === 0) row.splice(cellIndex, 1);
        else {
          row[cellIndex].columns = keys;
          row[cellIndex].field = keys[0];
          if (row[cellIndex].colspan) row[cellIndex].colspan = keys.length;
        }
      }
    });
  });
  if (tableColumnsDraft.length === 0) tableColumnsDraft.push(createDefaultTableColumn(1));
  tableColumnsSelectedNode = { kind: 'column', index: Math.max(0, Math.min(index, tableColumnsDraft.length - 1)) };
  renderTableColumnsEditor();
}

function moveSelectedTableColumn(direction) {
  if (tableColumnsSelectedNode?.kind !== 'column') return;
  const index = Number(tableColumnsSelectedNode.index);
  const next = direction === 'up' ? index - 1 : index + 1;
  if (next < 0 || next >= tableColumnsDraft.length) return;
  [tableColumnsDraft[index], tableColumnsDraft[next]] = [tableColumnsDraft[next], tableColumnsDraft[index]];
  tableColumnsSelectedNode = { kind: 'column', index: next };
  renderTableColumnsEditor();
}

function getSelectedTableColumnPropertyIndex() {
  if (tableColumnsSelectedNode?.kind === 'column') return Number(tableColumnsSelectedNode.index);
  if (tableColumnsSelectedNode?.kind === 'layout') {
    const cell = getLayoutRowsForTab(tableColumnsSelectedNode.layout)?.[tableColumnsSelectedNode.rowIndex]?.[tableColumnsSelectedNode.cellIndex];
    const field = getLayoutCellColumns(cell)[0];
    return tableColumnsDraft.findIndex((column) => getColumnFieldKey(column) === field);
  }
  return 0;
}

function updateSelectedTableColumnProperty(input) {
  const index = getSelectedTableColumnPropertyIndex();
  const column = tableColumnsDraft[index];
  if (!column) return;
  const property = input.dataset.columnProp;
  const oldKey = getColumnFieldKey(column);
  const value = input.type === 'checkbox' ? input.checked : input.value;
  if (['sortable', 'required', 'editable'].includes(property)) column[property] = Boolean(value);
  else if (value === '') delete column[property];
  else column[property] = value;
  if (property === 'field' || property === 'name') {
    const newKey = getColumnFieldKey(column);
    if (oldKey && newKey && oldKey !== newKey) syncLayoutColumnReference(oldKey, newKey);
  }
}

function updateSelectedTableLayoutProperty(input) {
  if (tableColumnsSelectedNode?.kind !== 'layout') return;
  const rows = getLayoutRowsForTab(tableColumnsSelectedNode.layout);
  const cell = rows?.[tableColumnsSelectedNode.rowIndex]?.[tableColumnsSelectedNode.cellIndex];
  if (!cell) return;
  const property = input.dataset.layoutProp;
  const value = input.value.trim();
  if (property === "colspan") {
    const start = getLayoutCellStartIndex(cell);
    const span = Math.max(1, Math.min(tableColumnsDraft.length - start, Number(value) || 1));
    cell.columns = tableColumnsDraft.slice(start, start + span).map(getColumnFieldKey);
    cell.colspan = span;
  } else if (property === "rowspan") {
    const span = Math.max(1, Math.min(getLayoutRowsForTab(tableColumnsSelectedNode.layout).length, Number(value) || 1));
    if (span > 1) cell.rowspan = span;
    else delete cell.rowspan;
  } else if (value === "") {
    delete cell[property];
  } else {
    cell[property] = value;
  }
}

function syncLayoutColumnReference(oldKey, newKey) {
  [tableColumnsHeaderLayout, tableColumnsBodyRows].forEach((rows) => {
    rows.forEach((row) => {
      row.forEach((cell) => {
        cell.columns = getLayoutCellColumns(cell).map((key) => key === oldKey ? newKey : key);
        if (cell.field === oldKey) cell.field = newKey;
      });
    });
  });
}

function addTableLayoutRow() {
  const tab = tableColumnsActiveTab;
  const rows = getLayoutRowsForTab(tab).slice();
  if (rows.length >= getLayoutRowLimitForTab(tab)) return;
  rows.push(createDefaultTableLayoutRows(tableColumnsDraft, 1, tab)[0]);
  setLayoutRowsForTab(tab, rows);
  tableColumnsSelectedNode = { kind: "layout", layout: tab, rowIndex: rows.length - 1, cellIndex: 0 };
  renderTableColumnsEditor();
}

function removeTableLayoutRow() {
  const tab = tableColumnsActiveTab;
  const rows = getLayoutRowsForTab(tab).slice();
  if (rows.length <= 1) return;
  const rowIndex = tableColumnsSelectedNode?.layout === tab && Number.isInteger(tableColumnsSelectedNode.rowIndex)
    ? tableColumnsSelectedNode.rowIndex
    : rows.length - 1;
  rows.splice(Math.max(0, Math.min(rowIndex, rows.length - 1)), 1);
  setLayoutRowsForTab(tab, rows);
  tableColumnsSelectedNode = { kind: "layout", layout: tab, rowIndex: 0, cellIndex: 0 };
  renderTableColumnsEditor();
}

function mergeSelectedTableLayoutCells() {
  const tab = tableColumnsActiveTab;
  const selected = [...document.querySelectorAll('[data-layout-cell-select]:checked')]
    .map((input) => ({ rowIndex: Number(input.dataset.rowIndex), cellIndex: Number(input.dataset.cellIndex) }))
    .filter((item) => Number.isInteger(item.rowIndex) && Number.isInteger(item.cellIndex));
  const rowIndexes = [...new Set(selected.map((item) => item.rowIndex))];
  if (rowIndexes.length !== 1 || selected.length < 2) return;
  const rows = getLayoutRowsForTab(tab).map((row) => row.map((cell) => ({ ...cell, columns: getLayoutCellColumns(cell) })));
  const rowIndex = rowIndexes[0];
  const row = rows[rowIndex];
  const indexes = selected.map((item) => item.cellIndex).sort((left, right) => left - right);
  const min = indexes[0];
  const max = indexes[indexes.length - 1];
  if (indexes.some((index, offset) => index !== min + offset)) return;
  const columns = row.slice(min, max + 1).flatMap((cell) => getLayoutCellColumns(cell));
  const first = row[min] || {};
  row.splice(min, max - min + 1, {
    label: first.label || columns[0] || "",
    field: first.field || columns[0] || "",
    columns,
    colspan: columns.length,
  });
  setLayoutRowsForTab(tab, rows);
  tableColumnsSelectedNode = { kind: "layout", layout: tab, rowIndex, cellIndex: min };
  renderTableColumnsEditor();
}

function splitSelectedTableLayoutCell() {
  if (tableColumnsSelectedNode?.kind !== "layout") return;
  const { layout, rowIndex, cellIndex } = tableColumnsSelectedNode;
  const rows = getLayoutRowsForTab(layout).map((row) => row.map((cell) => ({ ...cell, columns: getLayoutCellColumns(cell) })));
  const cell = rows?.[rowIndex]?.[cellIndex];
  if (!cell) return;
  const nextCells = getLayoutCellColumns(cell).map((key) => {
    const column = tableColumnsDraft.find((item) => getColumnFieldKey(item) === key) || {};
    return {
      label: column.label || key,
      field: key,
      columns: [key],
    };
  });
  rows[rowIndex].splice(cellIndex, 1, ...nextCells);
  setLayoutRowsForTab(layout, rows);
  tableColumnsSelectedNode = { kind: "layout", layout, rowIndex, cellIndex };
  renderTableColumnsEditor();
}

function renderTableLayoutGrid(tab) {
  const rows = getLayoutRowsForTab(tab);
  const gridTemplate = "86px repeat(" + Math.max(1, tableColumnsDraft.length) + ", minmax(90px, 1fr))";
  return '<div class="table-layout-grid">' + rows.map((row, rowIndex) => {
    let cursor = 1;
    const cells = row.map((cell, cellIndex) => {
      const start = getLayoutCellStartIndex(cell) + 2;
      const span = getLayoutCellSpan(cell);
      cursor = start + span;
      const selected = tableColumnsSelectedNode?.kind === "layout" &&
        tableColumnsSelectedNode.layout === tab &&
        tableColumnsSelectedNode.rowIndex === rowIndex &&
        tableColumnsSelectedNode.cellIndex === cellIndex;
      return '<button type="button" class="table-layout-cell' + (selected ? ' selected' : '') + '" style="grid-column:' + start + ' / span ' + span + '" data-node-kind="layout" data-layout="' + tab + '" data-row-index="' + rowIndex + '" data-cell-index="' + cellIndex + '">' +
        '<input type="checkbox" data-layout-cell-select data-row-index="' + rowIndex + '" data-cell-index="' + cellIndex + '">' +
        '<span>' + escapeAttr(cell.label || cell.field || '') + '</span>' +
      '</button>';
    }).join('');
    return '<div class="table-layout-row" style="grid-template-columns:' + gridTemplate + '">' +
      '<div class="table-layout-row-title">' + (tab === "header" ? "Header " : "Body ") + (rowIndex + 1) + '</div>' +
      cells +
    '</div>';
  }).join('') + '</div>';
}

function renderTableColumnsEditor() {
  const grid = document.querySelector("[data-table-columns-grid]");
  if (!grid) return;
  if (!tableColumnsSelectedNode && tableColumnsDraft.length > 0) {
    tableColumnsSelectedNode = { kind: 'column', index: 0 };
  }
  const tab = tableColumnsActiveTab || "columns";
  const tabs = ["columns", "header", "body"].map((item) =>
    '<button type="button" class="table-editor-tab' + (tab === item ? ' active' : '') + '" data-table-editor-tab="' + item + '">' +
      (item === "columns" ? "Columns" : item === "header" ? "Header" : "Body") +
    '</button>'
  ).join('');
  const isLayoutTab = tab === "header" || tab === "body";
  const treeHtml = isLayoutTab
    ? renderTableLayoutTree(getTableLayoutTreeNodes(tab))
    : renderTableColumnTree(getTableColumnTreeNodes());
  const actionHtml = isLayoutTab
    ? '<button type="button" class="table-column-add-inline" data-table-layout-row-add>+ Row</button>' +
      '<button type="button" class="table-column-add-inline" data-table-layout-row-remove>- Row</button>' +
      '<button type="button" class="table-column-add-inline" data-table-layout-merge>Merge</button>'
    : '<button type="button" class="table-column-add-inline" data-table-column-add-inline>+ Column</button>';
  const layoutGrid = isLayoutTab ? renderTableLayoutGrid(tab) : "";
  grid.innerHTML =
    '<div class="table-editor-tabs">' + tabs + '</div>' +
    (layoutGrid ? '<div class="table-layout-editor">' + layoutGrid + '</div>' : '') +
    '<div class="table-column-editor-shell">' +
      '<aside class="table-column-tree-panel">' +
        actionHtml +
        '<div class="table-column-tree">' + treeHtml + '</div>' +
      '</aside>' +
      '<div class="table-column-property-panel">' + (isLayoutTab ? renderTableLayoutProperties(tableColumnsSelectedNode || { kind: "layout", layout: tab, rowIndex: 0, cellIndex: 0 }) : renderTableColumnProperties()) + '</div>' +
    '</div>';

  grid.querySelectorAll('[data-table-editor-tab]').forEach((button) => {
    button.addEventListener('click', () => {
      tableColumnsActiveTab = button.dataset.tableEditorTab;
      if (tableColumnsActiveTab === "columns") tableColumnsSelectedNode = { kind: "column", index: 0 };
      else tableColumnsSelectedNode = { kind: "layout", layout: tableColumnsActiveTab, rowIndex: 0, cellIndex: 0 };
      renderTableColumnsEditor();
    });
  });
  grid.querySelector('[data-table-column-add-inline]')?.addEventListener('click', addTableColumn);
  grid.querySelector('[data-table-layout-row-add]')?.addEventListener('click', addTableLayoutRow);
  grid.querySelector('[data-table-layout-row-remove]')?.addEventListener('click', removeTableLayoutRow);
  grid.querySelector('[data-table-layout-merge]')?.addEventListener('click', mergeSelectedTableLayoutCells);
  grid.querySelectorAll('[data-node-kind]').forEach((button) => button.addEventListener('click', selectTableColumnNode));
  grid.querySelectorAll('[data-column-prop]').forEach((input) => {
    const eventName = input.tagName === 'SELECT' || input.type === 'checkbox' ? 'change' : 'input';
    input.addEventListener(eventName, () => updateSelectedTableColumnProperty(input));
  });
  grid.querySelectorAll('[data-layout-prop]').forEach((input) => {
    input.addEventListener('input', () => updateSelectedTableLayoutProperty(input));
  });
  grid.querySelector('[data-layout-split-selected]')?.addEventListener('click', splitSelectedTableLayoutCell);
  grid.querySelector('[data-column-delete-selected]')?.addEventListener('click', deleteSelectedTableColumn);
  grid.querySelectorAll('[data-column-move-selected]').forEach((button) => {
    button.addEventListener('click', () => moveSelectedTableColumn(button.dataset.columnMoveSelected));
  });
}

function readTableColumnsEditor() {
  return tableColumnsDraft.map((column) => ({ ...column }));
}

function readTableHeaderLayout() {
  return normalizeTableLayoutRows(tableColumnsHeaderLayout, tableColumnsDraft, tableColumnsHeaderLayout.length || 1, "header");
}

function readTableBodyLayout() {
  return normalizeTableLayoutRows(tableColumnsBodyRows, tableColumnsDraft, tableColumnsBodyRows.length || 1, "body");
}

function createDefaultTableColumn(index) {
  return {
    name: "column" + index,
    label: "컬럼 " + index,
    field: "column" + index,
    type: "text",
    align: "left",
    width: "",
    sortable: false,
    required: false,
    editable: false,
    format: "",
  };
}

function findTableComponent(components, id) {
  for (const component of components || []) {
    if (component.id === id) return component;
    const child = findTableComponent(component.children, id);
    if (child) return child;
  }
  return null;
}

module.exports = { getTableHtml, getTableScript, getTableStyles };
