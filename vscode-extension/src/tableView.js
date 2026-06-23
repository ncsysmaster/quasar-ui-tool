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
    <div class="table-columns-toolbar"><button type="button" class="primary" data-table-column-add>+ 컬럼 추가</button></div>
    <div class="table-columns-body"><div class="table-columns-grid" data-table-columns-grid></div></div>
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
    renderTableColumnsEditor,
    readTableColumnsEditor,
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
    ?.querySelector("[data-table-column-add]")
    ?.addEventListener("click", () => {
      tableColumnsDraft.push(
        createDefaultTableColumn(tableColumnsDraft.length + 1),
      );
      renderTableColumnsEditor();
    });
  columnsDialog
    ?.querySelector("[data-table-columns-save]")
    ?.addEventListener("click", () => {
      const columns = readTableColumnsEditor();
      vscode.postMessage({
        type: "updateTableColumns",
        id: tableColumnsComponentId,
        columns,
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

function showTableColumnsDialog(componentId, appendColumn = false) {
  const component = findTableComponent(model?.components || [], componentId);
  const dialog = document.getElementById("table-columns-dialog");
  if (!component || component.type !== "Table" || !dialog) return;
  tableColumnsComponentId = componentId;
  tableColumnsDraft = JSON.parse(JSON.stringify(component.columns || []));
  if (tableColumnsDraft.length === 0)
    tableColumnsDraft.push(createDefaultTableColumn(1));
  if (appendColumn)
    tableColumnsDraft.push(createDefaultTableColumn(tableColumnsDraft.length + 1));
  renderTableColumnsEditor();
  dialog.classList.remove("hidden");
}

function hideTableColumnsDialog() {
  document.getElementById("table-columns-dialog")?.classList.add("hidden");
  tableColumnsComponentId = "";
  tableColumnsDraft = [];
}

function renderTableColumnsEditor() {
  const grid = document.querySelector("[data-table-columns-grid]");
  if (!grid) return;
  const typeOptions = ["text", "number", "date", "datetime", "checkbox", "select", "badge", "button", "link", "image", "actions"];
  grid.innerHTML =
    '<div class="table-columns-head"><span>순서</span><span>name</span><span>label</span><span>field</span><span>type</span><span>align</span><span>width</span><span>sortable</span><span>required</span><span>editable</span><span>format</span><span>삭제</span></div>' +
    tableColumnsDraft
      .map((column, index) =>
        '<div class="table-column-row" data-table-column-index="' + index + '">' +
        '<div class="table-column-order"><button data-column-move="up" title="위로">↑</button><button data-column-move="down" title="아래로">↓</button></div>' +
        '<input data-column-field="name" value="' + escapeAttr(column.name || "") + '">' +
        '<input data-column-field="label" value="' + escapeAttr(column.label || "") + '">' +
        '<input data-column-field="field" value="' + escapeAttr(column.field || "") + '">' +
        '<select data-column-field="type">' + typeOptions.map((type) => '<option value="' + type + '"' + ((column.type || "text") === type ? " selected" : "") + '>' + type + '</option>').join("") + '</select>' +
        '<select data-column-field="align"><option value="left"' + (column.align === "left" ? " selected" : "") + '>left</option><option value="center"' + (column.align === "center" ? " selected" : "") + '>center</option><option value="right"' + (column.align === "right" ? " selected" : "") + '>right</option></select>' +
        '<input data-column-field="width" value="' + escapeAttr(column.width || "") + '" placeholder="120px">' +
        '<input type="checkbox" data-column-field="sortable"' + (column.sortable ? " checked" : "") + '>' +
        '<input type="checkbox" data-column-field="required"' + (column.required ? " checked" : "") + '>' +
        '<input type="checkbox" data-column-field="editable"' + (column.editable ? " checked" : "") + '>' +
        '<input data-column-field="format" value="' + escapeAttr(column.format || "") + '" placeholder="methodName">' +
        '<button class="store-delete" data-column-delete title="삭제">×</button></div>',
      )
      .join("");
  grid.querySelectorAll("[data-column-move]").forEach((button) =>
    button.addEventListener("click", () => {
      tableColumnsDraft = readTableColumnsEditor();
      const row = button.closest("[data-table-column-index]");
      const index = Number(row.dataset.tableColumnIndex);
      const next = button.dataset.columnMove === "up" ? index - 1 : index + 1;
      if (next < 0 || next >= tableColumnsDraft.length) return;
      [tableColumnsDraft[index], tableColumnsDraft[next]] = [tableColumnsDraft[next], tableColumnsDraft[index]];
      renderTableColumnsEditor();
    }),
  );
  grid.querySelectorAll("[data-column-delete]").forEach((button) =>
    button.addEventListener("click", () => {
      tableColumnsDraft = readTableColumnsEditor();
      const row = button.closest("[data-table-column-index]");
      tableColumnsDraft.splice(Number(row.dataset.tableColumnIndex), 1);
      renderTableColumnsEditor();
    }),
  );
}

function readTableColumnsEditor() {
  return [...document.querySelectorAll("[data-table-column-index]")].map((row, index) => {
    const read = (name) => row.querySelector('[data-column-field="' + name + '"]');
    const name = read("name").value.trim() || "column" + (index + 1);
    return {
      name,
      label: read("label").value.trim() || name,
      field: read("field").value.trim() || name,
      type: read("type").value,
      align: read("align").value,
      width: read("width").value.trim(),
      sortable: read("sortable").checked,
      required: read("required").checked,
      editable: read("editable").checked,
      format: read("format").value.trim(),
    };
  });
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

function getTableStyles() {
  return `.table-wizard-dialog { width: min(560px, calc(100vw - 32px)); }
.table-wizard-body { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 12px; }
.table-wizard-body .field { margin: 0; }
.table-wizard-check { align-self: center; }
.table-wizard-toolbar { grid-column: 1 / -1; display: flex; flex-wrap: wrap; gap: 12px; padding: 10px; border: 1px solid var(--vscode-panel-border); }
.table-wizard-toolbar legend { padding: 0 5px; color: var(--vscode-descriptionForeground); }
.table-columns-dialog { width: min(1500px, calc(100vw - 24px)); height: min(720px, calc(100vh - 24px)); display: flex; flex-direction: column; }
.table-columns-toolbar { padding: 6px 10px; border-bottom: 1px solid var(--vscode-panel-border); }
.table-columns-toolbar button { min-height: 26px; padding: 3px 9px; border: 0; color: var(--vscode-button-foreground); background: var(--vscode-button-background); }
.table-columns-body { flex: 1; min-height: 0; overflow: auto; padding: 8px; }
.table-columns-grid { min-width: 1250px; border: 1px solid var(--vscode-panel-border); }
.table-columns-head, .table-column-row { display: grid; grid-template-columns: 70px 130px 150px 130px 105px 90px 90px 70px 70px 70px 130px 44px; align-items: stretch; }
.table-columns-head { position: sticky; z-index: 2; top: 0; color: var(--vscode-button-foreground); background: var(--vscode-button-background); font-weight: 600; }
.table-columns-head span { padding: 6px 4px; text-align: center; border-right: 1px solid var(--vscode-panel-border); }
.table-column-row > input, .table-column-row > select, .table-column-row > button, .table-column-order { min-width: 0; min-height: 28px; border-width: 0 1px 1px 0; }
.table-column-row > input[type="checkbox"] { width: auto; justify-self: center; align-self: center; }
.table-column-order { display: flex; align-items: center; justify-content: center; }
.table-column-order button { width: 27px; height: 24px; padding: 0; border: 0; color: var(--vscode-icon-foreground); background: transparent; }
.qt-table-toolbar-preview { display: flex; width: 100%; gap: 6px; align-items: center; }
.qt-table-toolbar-preview .qt-table-title { margin-right: auto; font-weight: 600; }
.qt-table-empty-preview { padding: 18px; color: var(--vscode-descriptionForeground); text-align: center; }
@media (max-width: 700px) { .table-wizard-body { grid-template-columns: 1fr; } .table-wizard-toolbar { grid-column: 1; } }`;
}

module.exports = { getTableHtml, getTableScript, getTableStyles };
