const {
  storeMemberEditorFunctions,
} = require("./storeMemberEditorView");
const { storeLayoutFunctions } = require("./storeLayoutView");

function getStoreHtml() {
  return `<div id="pinia-store-dialog" class="designer-dialog-backdrop hidden">
  <div class="designer-dialog pinia-store-dialog" role="dialog" aria-modal="true" aria-labelledby="pinia-store-dialog-title">
    <div class="designer-dialog-header">
      <strong id="pinia-store-dialog-title">Store 신규 추가</strong>
      <button class="designer-dialog-close" type="button" data-store-dialog-close aria-label="닫기">×</button>
    </div>
    <div class="designer-dialog-body">
      <label class="field">
        <span>파일 경로</span>
        <input type="text" data-store-path placeholder="예: education/course">
      </label>
      <label class="field">
        <span>파일명</span>
        <input type="text" data-store-file-name placeholder="예: courseStore">
      </label>
      <label class="field">
        <span>Store Name</span>
        <input type="text" data-store-const-name placeholder="예: useCourseStore">
      </label>
      <label class="field">
        <span>Store ID (defineStore)</span>
        <input type="text" data-store-id placeholder="예: course">
      </label>
      <label class="field">
        <span>Import 명</span>
        <input type="text" data-store-import-name placeholder="예: storeName">
      </label>
      <div class="error-text hidden" data-store-dialog-error></div>
    </div>
    <div class="designer-dialog-actions">
      <button type="button" data-store-dialog-cancel>취소</button>
      <button class="primary" type="button" data-store-dialog-submit>생성</button>
    </div>
  </div>
</div>
<div id="store-delete-dialog" class="designer-dialog-backdrop hidden">
  <div class="designer-dialog store-delete-dialog" role="alertdialog" aria-modal="true" aria-labelledby="store-delete-dialog-title" aria-describedby="store-delete-dialog-message">
    <div class="designer-dialog-header">
      <strong id="store-delete-dialog-title">삭제 확인</strong>
      <button class="designer-dialog-close" type="button" data-store-delete-cancel aria-label="닫기">×</button>
    </div>
    <div class="designer-dialog-body">
      <p id="store-delete-dialog-message" class="store-delete-message"></p>
      <p class="store-delete-warning">삭제한 내용은 되돌릴 수 없습니다.</p>
    </div>
    <div class="designer-dialog-actions">
      <button type="button" data-store-delete-cancel>취소</button>
      <button class="primary store-delete-confirm" type="button" data-store-delete-confirm>삭제</button>
    </div>
  </div>
</div>`;
}

function getStoreScript() {
  return [
    renderPiniaStores,
    getActivePiniaStore,
    renderStoreStateTree,
    renderStoreMembers,
    renderStoreDetail,
    setupStoreEditorEvents,
    ...storeMemberEditorFunctions,
    setupStoreDeleteDialog,
    confirmStoreDeletion,
    resolveStoreDeleteConfirmation,
    addStoreStateField,
    showStoreStateContextMenu,
    hideStoreStateContextMenu,
    ...storeLayoutFunctions,
    updateStoreStateRow,
    getStoreStateContainer,
    getStoreStateValue,
    scheduleStoreSave,
    storeValueType,
    storeValueText,
    parseStoreValue,
    storeBodySummary,
    setupPiniaStoreDialog,
    showPiniaStoreDialog,
    showPiniaStoreSettingsDialog,
    hidePiniaStoreDialog,
    submitPiniaStoreDialog,
    validatePiniaStoreDialog,
    setPiniaStoreDialogError,
    getStoreSubpath,
    stripStoreExtension,
    defaultStoreId,
    defaultStoreConstName,
    defaultStoreImportName,
  ]
    .map((fn) => fn.toString())
    .join("\n\n");
}

function renderPiniaStores(content) {
  disposeStoreMemberEditor();
  if (piniaStores.length === 0) {
    content.innerHTML =
      '<div class="empty">등록된 Pinia Store가 없습니다.</div>';
    return;
  }
  const store = getActivePiniaStore();
  if (!store?.definition) {
    content.innerHTML =
      '<div class="empty">Store JSON을 읽을 수 없습니다.</div>';
    return;
  }
  const definition = store.definition;
  definition.designer ||= {};
  definition.designer.stateNotes ||= {};

  content.innerHTML =
    '<div class="store-file-tabs" role="tablist" aria-label="연결된 Store">' +
    piniaStores
      .map(
        (item) =>
          '<div class="store-file-tab-wrap' +
          (item.fsPath === store.fsPath ? " active" : "") +
          '"><button type="button" role="tab" class="store-file-tab' +
          (item.fsPath === store.fsPath ? " active" : "") +
          '" data-store-tab="' +
          escapeAttr(item.fsPath) +
          '" aria-selected="' +
          (item.fsPath === store.fsPath) +
          '">' +
          escapeHtml(item.tabName || item.constName || item.fileName) +
          "</button>" +
          (item.fsPath === store.fsPath
            ? '<button type="button" class="store-file-settings" data-store-settings title="Store 파일 설정" aria-label="Store 파일 설정"><span class="material-icons" aria-hidden="true">settings</span></button>'
            : "") +
          "</div>",
      )
      .join("") +
    "</div>" +
    '<div class="store-editor-layout"><section class="store-editor-sidebar">' +
    '<div class="store-section" data-store-section="state"><div class="store-section-title"><h3>State</h3><button type="button" data-add-state>+ 추가</button></div>' +
    '<div class="store-state-tree">' +
    renderStoreStateTree(definition.state || {}, []) +
    '</div><div class="store-section-resizer" data-store-section-resize="state" role="separator" aria-label="State panel height resize" aria-orientation="horizontal" tabindex="0"></div></div>' +
    renderStoreMembers("getters", definition.getters || [], "Getters") +
    renderStoreMembers("actions", definition.actions || [], "Actions") +
    '</section><div class="store-panel-splitter" role="separator" aria-label="Store 패널 너비 조절" aria-orientation="vertical" tabindex="0"></div>' +
    '<section class="store-editor-detail">' +
    renderStoreDetail(definition) +
    '</section></div><div class="store-state-context-menu hidden" role="menu"><button type="button" data-context-add-state role="menuitem">+ 자식 필드 추가</button></div>';

  setupStoreEditorEvents(content, store);
  if (selectedStoreMember) mountStoreMemberEditor(store);
  setupStoreStateTableResize(content);
  setupStoreSectionResize(content);
  setupStorePanelSplitter(content);
}

function getActivePiniaStore() {
  return (
    piniaStores.find((store) => store.fsPath === activePiniaStorePath) ||
    piniaStores[0]
  );
}

function renderStoreStateTree(value, path, nested = false) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return "";
  const nodes = Object.entries(value)
    .map(([name, child]) => {
      const childPath = [...path, name];
      const pathKey = JSON.stringify(childPath);
      const selected =
        pathKey === JSON.stringify(selectedStoreStatePath);
      const isObject =
        child && typeof child === "object" && !Array.isArray(child);
      const hasChildren = isObject && Object.keys(child).length > 0;
      const collapsed = hasChildren && collapsedStoreStatePaths.has(pathKey);
      const toggle = hasChildren
        ? '<button type="button" class="store-state-toggle ' +
          (collapsed ? "collapsed" : "expanded") +
          '" data-state-toggle="' +
          encodeURIComponent(pathKey) +
          '" title="' +
          (collapsed ? "펼치기" : "접기") +
          '" aria-label="' +
          (collapsed ? "펼치기" : "접기") +
          '"></button>'
        : '<span class="store-state-toggle-spacer"></span>';
      const row =
        '<div class="store-state-row' +
        (selected ? " selected" : "") +
        '" role="treeitem" tabindex="0"' +
        ' data-state-path="' +
        encodeURIComponent(JSON.stringify(childPath)) +
        '"><span class="store-state-main">' +
        toggle +
        '<span class="store-state-name">' +
        escapeHtml(name) +
        "</span><small>- " +
        storeValueType(child) +
        "</small></span></div>";
      return (
        '<div class="store-state-node">' +
        row +
        (hasChildren && !collapsed
          ? '<div class="store-state-children" role="group">' +
            renderStoreStateTree(child, childPath, true) +
            "</div>"
          : "") +
        "</div>"
      );
    })
    .join("");
  if (nested) return nodes;
  const rootPathKey = JSON.stringify([]);
  const rootSelected =
    rootPathKey === JSON.stringify(selectedStoreStatePath);
  const rootHasChildren = Object.keys(value).length > 0;
  const rootCollapsed =
    rootHasChildren && collapsedStoreStatePaths.has(rootPathKey);
  return (
    '<div class="store-state-node store-state-root"><div class="store-state-row store-state-root-row' +
    (rootSelected ? " selected" : "") +
    '" role="treeitem" tabindex="0" data-state-path="' +
    encodeURIComponent(rootPathKey) +
    '"><span class="store-state-main">' +
    (rootHasChildren
      ? '<button type="button" class="store-state-toggle ' +
        (rootCollapsed ? "collapsed" : "expanded") +
        '" data-state-toggle="' +
        encodeURIComponent(rootPathKey) +
        '" title="' +
        (rootCollapsed ? "펼치기" : "접기") +
        '" aria-label="' +
        (rootCollapsed ? "펼치기" : "접기") +
        '"></button>'
      : '<span class="store-state-toggle-spacer"></span>') +
    '<span class="store-state-name">State</span></span></div>' +
    (rootHasChildren && !rootCollapsed
      ? '<div class="store-state-children" role="group">' + nodes + "</div>"
      : "") +
    "</div>"
  );
}

function renderStoreMembers(kind, members, title) {
  return (
    '<div class="store-section" data-store-section="' +
    kind +
    '"><div class="store-section-title"><h3>' +
    title +
    "</h3>" +
    '<button type="button" data-add-member="' +
    kind +
    '">+ 추가</button></div><div class="store-member-list">' +
    members
      .map((member, index) => {
        const selected =
          selectedStoreMember?.kind === kind &&
          selectedStoreMember?.index === index;
        if (kind === "getters") {
          return (
            '<div class="store-member-row' +
            (selected ? " selected" : "") +
            '" data-member-kind="getters" data-member-index="' +
            index +
            '">' +
            '<input data-member-field="name" value="' +
            escapeAttr(member.name || "") +
            '" aria-label="Getter 명">' +
            '<input data-member-field="summary" value="' +
            escapeAttr(storeBodySummary(member.body)) +
            '" aria-label="Return 식">' +
            '<button type="button" class="store-edit" data-edit-member="getters" data-member-index="' +
            index +
            '" title="Getter 편집" aria-label="Getter 편집"><span class="material-icons" aria-hidden="true">edit</span></button>' +
            '<button type="button" class="store-delete" data-remove-member="getters" data-member-index="' +
            index +
            '">×</button></div>'
          );
        }
        return (
          '<div class="store-member-row action' +
          (selected ? " selected" : "") +
          '" data-member-kind="actions" data-member-index="' +
          index +
          '">' +
          '<input data-member-field="name" value="' +
          escapeAttr(member.name || "") +
          '" aria-label="Action 명">' +
          '<label class="store-async"><input type="checkbox" data-member-field="async"' +
          (member.async !== false ? " checked" : "") +
          "> async</label>" +
          '<input data-member-field="description" value="' +
          escapeAttr(member.description || "") +
          '" aria-label="참고사항">' +
          '<button type="button" class="store-edit" data-edit-member="actions" data-member-index="' +
          index +
          '" title="Action 편집" aria-label="Action 편집"><span class="material-icons" aria-hidden="true">edit</span></button>' +
          '<button type="button" class="store-delete" data-remove-member="actions" data-member-index="' +
          index +
          '">×</button></div>'
        );
      })
      .join("") +
    '</div><div class="store-section-resizer" data-store-section-resize="' +
    kind +
    '" role="separator" aria-label="' +
    title +
    ' panel height resize" aria-orientation="horizontal" tabindex="0"></div></div>'
  );
}

function renderStoreDetail(definition) {
  if (selectedStoreMember) {
    const member =
      definition[selectedStoreMember.kind]?.[selectedStoreMember.index];
    if (member) {
      return (
        '<div class="store-script-editor"><div class="store-detail-heading">함수명 : ' +
        escapeHtml(member.name || "") +
        "</div>" +
        '<label>Parameters<input data-member-params value="' +
        escapeAttr((member.params || []).join(", ")) +
        '" placeholder="예: rows, options"></label>' +
        '<div id="store-member-editor" class="store-member-editor" role="application" aria-label="' +
        escapeAttr(
          (selectedStoreMember.kind === "getters" ? "Getter" : "Action") +
            " JavaScript editor",
        ) +
        '"></div></div>'
      );
    }
  }
  const state = definition.state || {};
  const selectedValue = getStoreStateValue(state, selectedStoreStatePath);
  const selectedIsObject =
    selectedValue &&
    typeof selectedValue === "object" &&
    !Array.isArray(selectedValue);
  const containerPath =
    selectedStoreStatePath.length > 0 && !selectedIsObject
      ? selectedStoreStatePath.slice(0, -1)
      : selectedStoreStatePath;
  const container = getStoreStateContainer(state, containerPath);
  const entries =
    selectedStoreStatePath.length > 0 && !selectedIsObject
      ? [[selectedStoreStatePath.at(-1), selectedValue]]
      : Object.entries(container || {});
  const notes = definition.designer?.stateNotes || {};
  return (
    '<div class="store-state-detail"><div class="store-detail-heading">State</div><button type="button" class="store-detail-add" data-add-state>+ 추가</button>' +
    '<div class="store-state-table"><div class="store-state-table-head">' +
    '<span>이름<button type="button" class="store-state-column-resizer" data-state-column-resize="0" role="separator" aria-label="이름 컬럼 너비 조절" tabindex="0"></button></span>' +
    '<span>타입<button type="button" class="store-state-column-resizer" data-state-column-resize="1" role="separator" aria-label="타입 컬럼 너비 조절" tabindex="0"></button></span>' +
    '<span>초기값<button type="button" class="store-state-column-resizer" data-state-column-resize="2" role="separator" aria-label="초기값 컬럼 너비 조절" tabindex="0"></button></span>' +
    '<span>참고사항</span><span>삭제</span></div>' +
    entries
      .map(([name, value]) => {
        const pathKey = [...containerPath, name].join(".");
        return (
          '<div class="store-state-table-row" data-state-name="' +
          escapeAttr(name) +
          '" data-state-container-path="' +
          encodeURIComponent(JSON.stringify(containerPath)) +
          '">' +
          '<input data-state-field="name" value="' +
          escapeAttr(name) +
          '"><select data-state-field="type">' +
          ["array", "object", "string", "number", "boolean", "null"]
            .map(
              (type) =>
                '<option value="' +
                type +
                '"' +
                (storeValueType(value) === type ? " selected" : "") +
                ">" +
                type +
                "</option>",
            )
            .join("") +
          '</select><input data-state-field="value" value="' +
          escapeAttr(storeValueText(value)) +
          '">' +
          '<input data-state-field="note" value="' +
          escapeAttr(notes[pathKey] || "") +
          '">' +
          '<button type="button" class="store-delete" data-remove-state="' +
          escapeAttr(name) +
          '" data-state-container-path="' +
          encodeURIComponent(JSON.stringify(containerPath)) +
          '">×</button></div>'
        );
      })
      .join("") +
    "</div></div>"
  );
}

function setupStoreEditorEvents(content, store) {
  const definition = store.definition;
  content.querySelectorAll("[data-store-tab]").forEach((button) =>
    button.addEventListener("click", () => {
      activePiniaStorePath = button.dataset.storeTab;
      selectedStoreStatePath = [];
      collapsedStoreStatePaths.clear();
      selectedStoreMember = null;
      render();
    }),
  );
  content
    .querySelector("[data-store-settings]")
    ?.addEventListener("click", showPiniaStoreSettingsDialog);
  content.querySelectorAll("[data-state-path]").forEach((button) =>
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      const path = JSON.parse(decodeURIComponent(button.dataset.statePath));
      selectedStoreStatePath = path;
      selectedStoreMember = null;
      render();
    }),
  );
  content.querySelectorAll("[data-state-path]").forEach((row) =>
    row.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      selectedStoreStatePath = JSON.parse(
        decodeURIComponent(row.dataset.statePath),
      );
      selectedStoreMember = null;
      render();
    }),
  );
  content.querySelectorAll("[data-state-toggle]").forEach((toggle) =>
    toggle.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const pathKey = decodeURIComponent(toggle.dataset.stateToggle);
      if (collapsedStoreStatePaths.has(pathKey))
        collapsedStoreStatePaths.delete(pathKey);
      else collapsedStoreStatePaths.add(pathKey);
      render();
    }),
  );
  content.querySelectorAll("[data-state-path]").forEach((button) =>
    button.addEventListener("contextmenu", (event) => {
      event.preventDefault();
      event.stopPropagation();
      selectedStoreStatePath = JSON.parse(
        decodeURIComponent(button.dataset.statePath),
      );
      selectedStoreMember = null;
      const clientX = event.clientX;
      const clientY = event.clientY;
      render();
      requestAnimationFrame(() =>
        showStoreStateContextMenu(content, clientX, clientY),
      );
    }),
  );
  content.querySelectorAll("[data-add-state]").forEach((button) =>
    button.addEventListener("click", () => addStoreStateField(store)),
  );
  content
    .querySelector("[data-context-add-state]")
    ?.addEventListener("click", () => addStoreStateField(store));
  content
    .querySelectorAll(".store-state-table-row")
    .forEach((row) =>
      row
        .querySelectorAll("[data-state-field]")
        .forEach((input) =>
          input.addEventListener("change", () =>
            updateStoreStateRow(store, row),
          ),
        ),
  );
  content.querySelectorAll("[data-remove-state]").forEach((button) =>
    button.addEventListener("click", async () => {
      const containerPath = JSON.parse(
        decodeURIComponent(button.dataset.stateContainerPath),
      );
      const fieldName = button.dataset.removeState;
      if (!(await confirmStoreDeletion("State 필드", fieldName))) return;
      delete getStoreStateContainer(definition.state, containerPath)[
        fieldName
      ];
      selectedStoreStatePath = containerPath;
      scheduleStoreSave(store);
      render();
    }),
  );
  content.querySelectorAll("[data-add-member]").forEach((button) =>
    button.addEventListener("click", () => {
      const kind = button.dataset.addMember;
      const list = (definition[kind] ||= []);
      const base = kind === "getters" ? "getter" : "action";
      let index = 1;
      while (list.some((item) => item.name === base + index)) index += 1;
      list.push(
        kind === "getters"
          ? { name: base + index, params: ["state"], body: "return undefined" }
          : {
              name: base + index,
              params: [],
              async: true,
              body: "",
              description: "",
            },
      );
      selectedStoreMember = { kind, index: list.length - 1 };
      scheduleStoreSave(store);
      render();
    }),
  );
  content.querySelectorAll("[data-member-kind]").forEach((row) =>
    row.addEventListener("click", (event) => {
      if (event.target.closest("[data-remove-member], [data-edit-member]"))
        return;
      selectedStoreMember = {
        kind: row.dataset.memberKind,
        index: Number(row.dataset.memberIndex),
      };
      selectedStoreStatePath = [];
      if (!event.target.closest("input, label")) render();
    }),
  );
  content.querySelectorAll("[data-edit-member]").forEach((button) =>
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      selectedStoreMember = {
        kind: button.dataset.editMember,
        index: Number(button.dataset.memberIndex),
      };
      selectedStoreStatePath = [];
      render();
    }),
  );
  content.querySelectorAll("[data-member-field]").forEach((input) =>
    input.addEventListener("change", () => {
      const row = input.closest("[data-member-kind]");
      const member =
        definition[row.dataset.memberKind][Number(row.dataset.memberIndex)];
      if (input.dataset.memberField === "async") member.async = input.checked;
      else if (input.dataset.memberField === "summary")
        member.body = input.value.trim()
          ? input.value.trim().startsWith("return ")
            ? input.value.trim()
            : "return " + input.value.trim()
          : "return undefined";
      else member[input.dataset.memberField] = input.value;
      scheduleStoreSave(store);
      render();
    }),
  );
  content.querySelectorAll("[data-remove-member]").forEach((button) =>
    button.addEventListener("click", async () => {
      const kind = button.dataset.removeMember;
      const index = Number(button.dataset.memberIndex);
      const member = definition[kind]?.[index];
      const label = kind === "getters" ? "Getter" : "Action";
      if (!(await confirmStoreDeletion(label, member?.name || ""))) return;
      definition[kind].splice(index, 1);
      selectedStoreMember = null;
      scheduleStoreSave(store);
      render();
    }),
  );
  content
    .querySelector("[data-member-params]")
    ?.addEventListener("change", (event) => {
      definition[selectedStoreMember.kind][selectedStoreMember.index].params =
        event.target.value
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean);
      scheduleStoreSave(store);
      render();
    });
  content.onclick = (event) => {
    if (!event.target.closest(".store-state-context-menu"))
      hideStoreStateContextMenu(content);
  };
}

function setupStoreDeleteDialog() {
  const dialog = document.getElementById("store-delete-dialog");
  if (!dialog) return;
  dialog.querySelectorAll("[data-store-delete-cancel]").forEach((button) =>
    button.addEventListener("click", () =>
      resolveStoreDeleteConfirmation(false),
    ),
  );
  dialog
    .querySelector("[data-store-delete-confirm]")
    ?.addEventListener("click", () => resolveStoreDeleteConfirmation(true));
  dialog.addEventListener("pointerdown", (event) => {
    if (event.target === dialog) resolveStoreDeleteConfirmation(false);
  });
  dialog.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    event.preventDefault();
    resolveStoreDeleteConfirmation(false);
  });
}

function confirmStoreDeletion(type, name) {
  const dialog = document.getElementById("store-delete-dialog");
  if (!dialog) return Promise.resolve(false);
  if (storeDeleteConfirmationResolve)
    resolveStoreDeleteConfirmation(false);
  const target = name ? type + ' "' + name + '"' : type;
  dialog.querySelector("#store-delete-dialog-message").textContent =
    target + "을 삭제하시겠습니까?";
  dialog.classList.remove("hidden");
  dialog.querySelector("[data-store-delete-confirm]")?.focus();
  return new Promise((resolve) => {
    storeDeleteConfirmationResolve = resolve;
  });
}

function resolveStoreDeleteConfirmation(confirmed) {
  const resolve = storeDeleteConfirmationResolve;
  storeDeleteConfirmationResolve = null;
  document.getElementById("store-delete-dialog")?.classList.add("hidden");
  resolve?.(Boolean(confirmed));
}

function addStoreStateField(store) {
  const state = store.definition.state || (store.definition.state = {});
  let container = getStoreStateValue(state, selectedStoreStatePath);
  if (!container || typeof container !== "object" || Array.isArray(container)) {
    const parentPath = selectedStoreStatePath.slice(0, -1);
    const fieldName = selectedStoreStatePath.at(-1);
    const parent = getStoreStateContainer(state, parentPath);
    parent[fieldName] = {};
    container = parent[fieldName];
  }
  let index = 1;
  while (Object.prototype.hasOwnProperty.call(container, "state" + index))
    index += 1;
  container["state" + index] = null;
  selectedStoreMember = null;
  hideStoreStateContextMenu(document.getElementById("content"));
  scheduleStoreSave(store);
  render();
}

function showStoreStateContextMenu(content, clientX, clientY) {
  const menu = content.querySelector(".store-state-context-menu");
  if (!menu) return;
  menu.classList.remove("hidden");
  const bounds = menu.getBoundingClientRect();
  menu.style.left = Math.max(4, Math.min(clientX, innerWidth - bounds.width - 4)) + "px";
  menu.style.top = Math.max(4, Math.min(clientY, innerHeight - bounds.height - 4)) + "px";
  menu.querySelector("button")?.focus();
}

function hideStoreStateContextMenu(content) {
  content?.querySelector(".store-state-context-menu")?.classList.add("hidden");
}

function updateStoreStateRow(store, row) {
  const definition = store.definition;
  const containerPath = JSON.parse(
    decodeURIComponent(row.dataset.stateContainerPath || "%5B%5D"),
  );
  const container = getStoreStateContainer(
    definition.state,
    containerPath,
  );
  const oldName = row.dataset.stateName;
  const selectedRowWasOpen =
    selectedStoreStatePath.length === containerPath.length + 1 &&
    selectedStoreStatePath.at(-1) === oldName;
  const name = row.querySelector('[data-state-field="name"]').value.trim();
  if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name)) return;
  const type = row.querySelector('[data-state-field="type"]').value;
  const value = parseStoreValue(
    type,
    row.querySelector('[data-state-field="value"]').value,
  );
  if (name !== oldName) {
    const entries = Object.entries(container).map(([key, item]) => [
      key === oldName ? name : key,
      key === oldName ? value : item,
    ]);
    Object.keys(container).forEach((key) => delete container[key]);
    entries.forEach(([key, item]) => {
      container[key] = item;
    });
  } else container[name] = value;
  definition.designer ||= {};
  definition.designer.stateNotes ||= {};
  definition.designer.stateNotes[[...containerPath, name].join(".")] =
    row.querySelector('[data-state-field="note"]').value;
  selectedStoreStatePath = selectedRowWasOpen
    ? [...containerPath, name]
    : containerPath;
  scheduleStoreSave(store);
  render();
}

function getStoreStateContainer(state, path) {
  const value = getStoreStateValue(state, path);
  return value && typeof value === "object" && !Array.isArray(value)
    ? value
    : state;
}

function getStoreStateValue(state, path) {
  let value = state;
  for (const key of path) {
    if (
      !value ||
      typeof value !== "object" ||
      !Object.prototype.hasOwnProperty.call(value, key)
    )
      return undefined;
    value = value[key];
  }
  return value;
}

function scheduleStoreSave(store) {
  clearTimeout(storeSaveTimer);
  storeSaveTimer = setTimeout(
    () =>
      vscode.postMessage({
        type: "updatePiniaStore",
        fsPath: store.fsPath,
        definition: store.definition,
      }),
    250,
  );
}

function storeValueType(value) {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
}

function storeValueText(value) {
  return typeof value === "string" ? value : JSON.stringify(value);
}

function parseStoreValue(type, value) {
  if (type === "null") return null;
  if (type === "string") return value;
  if (type === "number") return Number(value) || 0;
  if (type === "boolean") return String(value).toLowerCase() === "true";
  try {
    const parsed = JSON.parse(value || (type === "array" ? "[]" : "{}"));
    if (type === "array") return Array.isArray(parsed) ? parsed : [];
    if (type === "object")
      return parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? parsed
        : {};
    return parsed;
  } catch {
    return type === "array" ? [] : {};
  }
}

function storeBodySummary(body) {
  return String(body || "")
    .trim()
    .replace(/^return\s+/, "");
}

function setupPiniaStoreDialog() {
  const dialog = document.getElementById("pinia-store-dialog");
  if (!dialog) return;
  const fileNameInput = dialog.querySelector("[data-store-file-name]");

  fileNameInput.addEventListener("input", () => {
    if (dialog.dataset.mode === "edit") return;
    const fileName = stripStoreExtension(fileNameInput.value.trim());
    dialog.querySelector("[data-store-const-name]").value =
      defaultStoreConstName(fileName);
    dialog.querySelector("[data-store-id]").value = defaultStoreId(fileName);
    dialog.querySelector("[data-store-import-name]").value =
      defaultStoreImportName(fileName, model);
  });

  dialog
    .querySelector("[data-store-dialog-close]")
    .addEventListener("click", hidePiniaStoreDialog);
  dialog
    .querySelector("[data-store-dialog-cancel]")
    .addEventListener("click", hidePiniaStoreDialog);
  dialog
    .querySelector("[data-store-dialog-submit]")
    .addEventListener("click", submitPiniaStoreDialog);
  dialog.addEventListener("pointerdown", (event) => {
    if (event.target === dialog) hidePiniaStoreDialog();
  });
  dialog.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      hidePiniaStoreDialog();
    }
  });
}

function showPiniaStoreDialog() {
  const dialog = document.getElementById("pinia-store-dialog");
  if (!dialog) return;
  const pageName = model?.page?.id || model?.page?.name || "exampleStore";
  const fileName = stripStoreExtension(pageName);
  dialog.dataset.mode = "create";
  dialog.dataset.sourcePath = "";
  document.getElementById("pinia-store-dialog-title").textContent =
    "Store 신규 추가";
  dialog.querySelector("[data-store-dialog-submit]").textContent = "생성";
  const pathInput = dialog.querySelector("[data-store-path]");
  pathInput.value = "";
  pathInput.disabled = false;
  dialog.querySelector("[data-store-file-name]").value = fileName;
  dialog.querySelector("[data-store-const-name]").value =
    defaultStoreConstName(fileName);
  dialog.querySelector("[data-store-id]").value = defaultStoreId(fileName);
  dialog.querySelector("[data-store-import-name]").value =
    defaultStoreImportName(fileName, model);
  setPiniaStoreDialogError("");
  dialog.classList.remove("hidden");
  dialog.querySelector("[data-store-path]").focus();
}

function showPiniaStoreSettingsDialog() {
  const dialog = document.getElementById("pinia-store-dialog");
  const store = getActivePiniaStore();
  if (!dialog || !store?.definition?.store) return;
  const settings = store.definition.store;
  dialog.dataset.mode = "edit";
  dialog.dataset.fsPath = store.fsPath;
  dialog.dataset.sourcePath = settings.sourcePath || "";
  document.getElementById("pinia-store-dialog-title").textContent =
    "Store 파일 설정";
  dialog.querySelector("[data-store-dialog-submit]").textContent = "저장";
  const pathInput = dialog.querySelector("[data-store-path]");
  pathInput.value = getStoreSubpath(settings.sourcePath);
  pathInput.disabled = true;
  dialog.querySelector("[data-store-file-name]").value =
    settings.fileName || "";
  dialog.querySelector("[data-store-const-name]").value =
    settings.constName || "";
  dialog.querySelector("[data-store-id]").value =
    settings.defineStoreId || "";
  dialog.querySelector("[data-store-import-name]").value =
    settings.importName || store.tabName || "";
  setPiniaStoreDialogError("");
  dialog.classList.remove("hidden");
  dialog.querySelector("[data-store-file-name]").focus();
  dialog.querySelector("[data-store-file-name]").select();
}

function hidePiniaStoreDialog() {
  document.getElementById("pinia-store-dialog")?.classList.add("hidden");
}

function submitPiniaStoreDialog() {
  const dialog = document.getElementById("pinia-store-dialog");
  if (!dialog) return;
  const options = {
    storePath: dialog.querySelector("[data-store-path]").value.trim(),
    fileName: stripStoreExtension(
      dialog.querySelector("[data-store-file-name]").value.trim(),
    ),
    constName: dialog.querySelector("[data-store-const-name]").value.trim(),
    defineStoreId: dialog.querySelector("[data-store-id]").value.trim(),
    importName: dialog.querySelector("[data-store-import-name]").value.trim(),
  };
  const error = validatePiniaStoreDialog(
    options,
    dialog.dataset.mode === "edit" ? dialog.dataset.sourcePath : "",
  );
  if (error) {
    setPiniaStoreDialogError(error);
    return;
  }

  if (dialog.dataset.mode === "edit") {
    const store = getActivePiniaStore();
    const definition = JSON.parse(JSON.stringify(store.definition));
    definition.store.fileName = options.fileName;
    definition.store.constName = options.constName;
    definition.store.defineStoreId = options.defineStoreId;
    definition.store.importName = options.importName;
    hidePiniaStoreDialog();
    vscode.postMessage({
      type: "updatePiniaStoreSettings",
      fsPath: dialog.dataset.fsPath,
      definition,
    });
    return;
  }

  hidePiniaStoreDialog();
  vscode.postMessage({ type: "createPiniaStore", options });
}

function validatePiniaStoreDialog(options, currentSourcePath = "") {
  const normalizedPath = options.storePath
    .split(String.fromCharCode(92))
    .join("/")
    .split("/")
    .filter(Boolean)
    .join("/");
  if (normalizedPath.split("/").some((part) => part === "." || part === ".."))
    return "상대 경로만 사용할 수 있습니다.";
  if (/[<>:"|?*]/.test(normalizedPath))
    return "파일 경로에 사용할 수 없는 문자가 있습니다.";
  if (!options.fileName) return "파일명을 입력하세요.";
  if (
    options.fileName.includes("/") ||
    options.fileName.includes(String.fromCharCode(92)) ||
    /[<>:"|?*]/.test(options.fileName)
  )
    return "파일명에 사용할 수 없는 문자가 있습니다.";
  if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(options.constName))
    return "Store Name은 JavaScript 식별자 형식이어야 합니다.";
  if (!options.defineStoreId) return "Store ID를 입력하세요.";
  if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(options.importName))
    return "Import 명은 JavaScript 식별자 형식이어야 합니다.";
  if (
    (model?.imports || []).some(
      (item) =>
        item.variableName === options.importName &&
        item.sourcePath !== currentSourcePath,
    )
  )
    return "이미 사용 중인 Import 명입니다.";
  return "";
}

function setPiniaStoreDialogError(message) {
  const error = document.querySelector("[data-store-dialog-error]");
  if (!error) return;
  error.textContent = message;
  error.classList.toggle("hidden", !message);
}

function getStoreSubpath(sourcePath) {
  const relativePath = String(sourcePath || "")
    .replace(/\\/g, "/")
    .replace(/^\.src\/store\/?/i, "");
  const parts = relativePath.split("/").filter(Boolean);
  parts.pop();
  return parts.join("/");
}

function stripStoreExtension(value) {
  return String(value || "").replace(/\.(json|js)$/i, "");
}

function defaultStoreId(fileName) {
  const base = String(fileName || "").replace(/Store$/i, "") || fileName;
  return base ? base.charAt(0).toLowerCase() + base.slice(1) : "";
}

function defaultStoreConstName(fileName) {
  const base = String(fileName || "").replace(/Store$/i, "");
  const pascalName = base
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
  return "use" + (pascalName || "Example") + "Store";
}

function defaultStoreImportName(fileName, pageModel) {
  if (
    !(pageModel?.imports || []).some(
      (item) => item.type === "store" || item.variableName,
    )
  )
    return "storeName";
  const base = String(fileName || "").replace(/Store$/i, "");
  const pascalName = base
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
  return "store" + (pascalName || "Name");
}

function getStoreStyles() {
  return `.store-file-tabs { display: flex; min-height: 40px; padding: 5px 10px 0; align-items: end; overflow-x: auto; border-bottom: 1px solid var(--vscode-panel-border); background: var(--vscode-sideBar-background); }
.store-file-tab-wrap { display: inline-flex; flex: 0 0 auto; align-items: center; min-height: 34px; border: 1px solid transparent; border-bottom: 0; }
.store-file-tab-wrap.active { border-color: var(--vscode-panel-border); background: var(--vscode-editor-background); }
.store-file-tab { flex: 0 0 auto; min-width: 110px; min-height: 33px; padding: 6px 10px 6px 14px; border: 0; color: var(--vscode-descriptionForeground); background: transparent; }
.store-file-tab:hover { background: var(--vscode-list-hoverBackground); }
.store-file-tab.active { color: var(--vscode-editor-foreground); }
.store-file-settings { display: inline-flex; width: 30px; min-height: 33px; padding: 0; align-items: center; justify-content: center; border: 0; color: var(--vscode-icon-foreground); background: transparent; }
.store-file-settings:hover { color: var(--vscode-button-foreground); background: var(--vscode-toolbar-hoverBackground, var(--vscode-list-hoverBackground)); }
.store-file-settings .material-icons { font-size: 17px; }
.store-editor-layout { --store-sidebar-width: 42%; display: grid; grid-template-columns: minmax(300px, var(--store-sidebar-width)) 7px minmax(360px, 1fr); min-height: calc(100vh - 80px); }
.store-editor-sidebar { min-width: 0; padding: 6px; overflow: auto; }
.store-panel-splitter { position: relative; z-index: 5; width: 7px; min-height: 100%; cursor: col-resize; touch-action: none; background: var(--vscode-panel-border); outline: none; }
.store-panel-splitter::after { content: ""; position: absolute; top: 0; bottom: 0; left: 2px; width: 3px; background: transparent; transition: background-color 100ms ease; }
.store-panel-splitter:hover::after, .store-panel-splitter:focus::after, body.store-panel-resizing .store-panel-splitter::after { background: var(--vscode-focusBorder); }
body.store-panel-resizing, body.store-panel-resizing * { cursor: col-resize !important; user-select: none !important; }
.store-editor-detail { position: relative; padding: 10px; overflow: auto; }
.store-section { position: relative; display: flex; min-height: 58px; margin-bottom: 4px; flex-direction: column; border: 1px solid var(--vscode-panel-border); border-radius: 4px; overflow: hidden; }
.store-section h3 { margin: 0; padding: 3px 7px; border-left: 3px solid var(--vscode-focusBorder); font-size: 12px; font-weight: 600; line-height: 18px; }
.store-section-title { display: flex; flex: 0 0 auto; min-height: 28px; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--vscode-panel-border); }
.store-section-title button, .store-detail-add { min-height: 22px; margin-right: 5px; padding: 1px 7px; border: 0; border-radius: 3px; color: var(--vscode-button-foreground); background: var(--vscode-button-background); font-size: 12px; line-height: 18px; }
.store-section-resizer { position: relative; z-index: 3; flex: 0 0 7px; height: 7px; padding: 0; border: 0; border-top: 1px solid var(--vscode-panel-border); cursor: row-resize; touch-action: none; background: var(--vscode-editor-background); outline: none; }
.store-section-resizer::after { content: ""; position: absolute; left: 50%; top: 2px; width: 32px; height: 2px; transform: translateX(-50%); border-radius: 999px; background: transparent; transition: background-color 100ms ease; }
.store-section-resizer:hover::after, .store-section-resizer:focus::after, body.store-section-resizing .store-section-resizer::after { background: var(--vscode-focusBorder); }
body.store-section-resizing, body.store-section-resizing * { cursor: row-resize !important; user-select: none !important; }
.store-state-tree { flex: 1 1 auto; min-height: 0; padding: 2px 5px 4px; overflow: auto; }
.store-state-node { position: relative; }
.store-state-row { position: relative; z-index: 2; display: flex; width: 100%; min-width: 0; min-height: 24px; padding: 2px 5px 2px 1px; align-items: center; border: 0; color: var(--vscode-editor-foreground); background: transparent; line-height: 18px; cursor: pointer; user-select: none; }
.store-state-row:hover { background: var(--vscode-list-hoverBackground); }
.store-state-row.selected { outline: 1px solid var(--vscode-focusBorder); outline-offset: -1px; background: var(--vscode-list-activeSelectionBackground, var(--vscode-list-hoverBackground)); color: var(--vscode-list-activeSelectionForeground, var(--vscode-editor-foreground)); }
.store-state-main { display: inline-flex; min-width: 0; gap: 4px; align-items: center; }
.store-state-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.store-state-root-row .store-state-name { font-weight: 600; }
.store-state-row small { color: var(--vscode-descriptionForeground); font-size: 11px; }
.store-state-toggle, .store-state-toggle-spacer { display: inline-flex; flex: 0 0 16px; width: 16px; height: 16px; padding: 0; align-items: center; justify-content: center; border: 0; color: var(--vscode-icon-foreground); background: transparent; }
.store-state-toggle::before { content: ""; width: 5px; height: 5px; border-right: 1.5px solid currentColor; border-bottom: 1.5px solid currentColor; transform-origin: center; }
.store-state-toggle.expanded::before { transform: translateY(-1px) rotate(45deg); }
.store-state-toggle.collapsed::before { transform: translateX(-1px) rotate(-45deg); }
.store-state-toggle:hover { color: var(--vscode-foreground); background: var(--vscode-toolbar-hoverBackground); }
.store-state-children { position: relative; margin-left: 14px; padding-left: 12px; border-left: 1px solid var(--vscode-tree-indentGuidesStroke, var(--vscode-panel-border)); }
.store-state-children > .store-state-node::before { content: ""; position: absolute; z-index: 1; left: -12px; top: 12px; width: 12px; border-top: 1px solid var(--vscode-tree-indentGuidesStroke, var(--vscode-panel-border)); }
.store-state-children > .store-state-node:last-child::after { content: ""; position: absolute; z-index: 1; left: -13px; top: 13px; bottom: 0; width: 2px; background: var(--vscode-editor-background); }
.store-member-list { flex: 1 1 auto; min-height: 0; padding: 1px; overflow: auto; }
.store-member-list:empty { display: none; }
.store-member-row { display: grid; grid-template-columns: minmax(100px, .8fr) minmax(130px, 1.4fr) 26px 26px; gap: 3px; padding: 2px; border: 1px solid transparent; }
.store-member-row.action { grid-template-columns: minmax(90px, .8fr) 68px minmax(100px, 1fr) 26px 26px; }
.store-member-row input { min-height: 24px; padding: 2px 5px; }
.store-member-row.selected { border-color: var(--vscode-focusBorder); background: var(--vscode-list-activeSelectionBackground); }
.store-state-context-menu { position: fixed; z-index: 1000; min-width: 150px; padding: 3px; border: 1px solid var(--vscode-menu-border, var(--vscode-panel-border)); border-radius: 3px; background: var(--vscode-menu-background, var(--vscode-editorWidget-background)); box-shadow: 0 4px 14px rgba(0, 0, 0, .35); }
.store-state-context-menu button { width: 100%; min-height: 26px; padding: 3px 8px; border: 0; color: var(--vscode-menu-foreground, var(--vscode-editor-foreground)); background: transparent; text-align: left; }
.store-state-context-menu button:hover, .store-state-context-menu button:focus { color: var(--vscode-menu-selectionForeground, var(--vscode-list-activeSelectionForeground)); background: var(--vscode-menu-selectionBackground, var(--vscode-list-activeSelectionBackground)); outline: none; }
.store-async { display: flex; gap: 4px; align-items: center; justify-content: center; color: var(--vscode-descriptionForeground); }
.store-async input { width: auto; min-height: auto; }
.store-edit { display: inline-flex; width: 26px; min-height: 24px; padding: 0; align-items: center; justify-content: center; border: 1px solid transparent; color: var(--vscode-icon-foreground); background: transparent; }
.store-edit:hover, .store-edit:focus { border-color: var(--vscode-focusBorder); color: var(--vscode-foreground); background: var(--vscode-toolbar-hoverBackground); outline: none; }
.store-edit .material-icons { font-size: 15px; }
.store-delete { width: 26px; min-height: 24px; padding: 0; border: 1px solid transparent; color: var(--vscode-errorForeground); background: transparent; font-size: 17px; }
.store-delete:hover { border-color: var(--vscode-errorForeground); }
.store-detail-heading { margin-bottom: 12px; padding: 7px 10px; border-left: 4px solid var(--vscode-focusBorder); font-size: 16px; font-weight: 600; }
.store-detail-add { position: absolute; top: 16px; right: 10px; }
.store-state-table { width: 100%; min-width: 620px; border: 1px solid var(--vscode-panel-border); }
.store-state-table-head, .store-state-table-row { display: grid; grid-template-columns: var(--store-state-column-widths, 1.2fr .8fr 1fr 1.2fr 44px); }
.store-state-table-head { color: var(--vscode-button-foreground); background: var(--vscode-button-background); font-weight: 600; }
.store-state-table-head span { position: relative; padding: 5px; text-align: center; border-right: 1px solid var(--vscode-panel-border); }
.store-state-column-resizer { position: absolute; z-index: 4; top: 0; right: -5px; width: 10px; height: 100%; min-height: 100%; padding: 0; border: 0; cursor: col-resize; touch-action: none; background: transparent; }
.store-state-column-resizer::after { content: ""; position: absolute; top: 0; bottom: 0; left: 4px; width: 2px; background: transparent; }
.store-state-column-resizer:hover::after, .store-state-column-resizer:focus::after, body.store-column-resizing .store-state-column-resizer::after { background: var(--vscode-focusBorder); }
body.store-column-resizing, body.store-column-resizing * { cursor: col-resize !important; user-select: none !important; }
.store-state-table-row > input, .store-state-table-row > select, .store-state-table-row > button { border-width: 0 1px 1px 0; }
.store-state-table-row > .store-delete { display: inline-flex; width: 100%; height: 100%; min-height: 28px; align-items: center; justify-content: center; justify-self: stretch; align-self: stretch; }
.store-script-editor { display: grid; grid-template-rows: auto auto minmax(300px, 1fr); min-height: calc(100vh - 110px); }
.store-script-editor label { display: grid; grid-template-columns: 90px 1fr; gap: 8px; margin-bottom: 8px; align-items: center; color: var(--vscode-descriptionForeground); }
.store-member-editor { width: 100%; min-height: 360px; border: 1px solid var(--vscode-panel-border); background: var(--vscode-editor-background); }
.store-member-editor:focus-within { outline: 1px solid var(--vscode-focusBorder); }
@media (max-width: 900px) { .store-editor-layout { grid-template-columns: 1fr; } .store-panel-splitter { display: none; } .store-editor-sidebar { border-bottom: 1px solid var(--vscode-panel-border); } }
.pinia-store-dialog { width: min(440px, calc(100vw - 32px)); }
.pinia-store-dialog input:disabled { cursor: not-allowed; opacity: .65; }
.store-delete-dialog { width: min(390px, calc(100vw - 32px)); }
.store-delete-message { margin: 0 0 8px; color: var(--vscode-editor-foreground); font-weight: 600; }
.store-delete-warning { margin: 0; color: var(--vscode-descriptionForeground); font-size: 12px; }
.store-delete-confirm { color: var(--vscode-button-foreground) !important; background: var(--vscode-inputValidation-errorBackground, #8b1a1a) !important; border-color: var(--vscode-inputValidation-errorBorder, var(--vscode-errorForeground)) !important; }`;
}

module.exports = { getStoreHtml, getStoreScript, getStoreStyles };
