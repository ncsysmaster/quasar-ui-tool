function getScreenStoreStateScript() {
  return [
    renderScreenStoreStatePanel,
    renderScreenStoreStateNode,
    setupScreenStoreStateDrag,
    buildStoreBindingExpression,
    getStoreStateBinding,
    isStoreStateDrag,
    screenStoreValueType,
  ]
    .map((fn) => fn.toString())
    .join("\n\n");
}

function renderScreenStoreStatePanel() {
  const panel = document.getElementById("screen-store-state-panel");
  if (!panel) return;
  const stores = Array.isArray(piniaStores) ? piniaStores : [];
  panel.innerHTML =
    '<div class="screen-store-state-title">Store State</div>' +
    '<div class="screen-store-state-content" role="tree">' +
    (stores.length > 0
      ? stores
          .map((store) => {
            const importName =
              store.tabName ||
              store.pageImport?.variableName ||
              store.definition?.store?.importName ||
              store.constName ||
              "store";
            const state = store.definition?.state || {};
            const rootBinding = buildStoreBindingExpression(importName, []);
            return (
              '<details class="screen-store-state-root" open>' +
              '<summary><span class="screen-store-state-row screen-store-state-import" draggable="true" data-store-binding="' +
              encodeURIComponent(
                JSON.stringify({
                  expression: rootBinding,
                  importName,
                  path: [],
                  fsPath: store.fsPath || "",
                }),
              ) +
              '"><span class="material-icons" aria-hidden="true">inventory_2</span>' +
              escapeHtml(importName) +
              "</span></summary>" +
              '<div class="screen-store-state-children">' +
              Object.entries(state)
                .map(([name, value]) =>
                  renderScreenStoreStateNode(
                    name,
                    value,
                    importName,
                    [name],
                    store.fsPath || "",
                  ),
                )
                .join("") +
              "</div></details>"
            );
          })
          .join("")
      : '<div class="empty">연결된 Store가 없습니다.</div>') +
    "</div>";
  setupScreenStoreStateDrag(panel);
}

function renderScreenStoreStateNode(
  name,
  value,
  importName,
  path,
  fsPath,
) {
  const expandable =
    value && typeof value === "object" && !Array.isArray(value);
  const binding = {
    expression: buildStoreBindingExpression(importName, path),
    importName,
    path,
    fsPath,
  };
  const row =
    '<span class="screen-store-state-row" draggable="true" data-store-binding="' +
    encodeURIComponent(JSON.stringify(binding)) +
    '"><span class="screen-store-state-name">' +
    escapeHtml(name) +
    '</span><small>- ' +
    screenStoreValueType(value) +
    "</small></span>";
  if (!expandable || Object.keys(value).length === 0) {
    return '<div class="screen-store-state-node screen-store-state-leaf">' +
      row +
      "</div>";
  }
  return (
    '<details class="screen-store-state-node" open><summary>' +
    row +
    "</summary>" +
    '<div class="screen-store-state-children">' +
    Object.entries(value)
      .map(([childName, childValue]) =>
        renderScreenStoreStateNode(
          childName,
          childValue,
          importName,
          [...path, childName],
          fsPath,
        ),
      )
      .join("") +
    "</div></details>"
  );
}

function setupScreenStoreStateDrag(panel) {
  panel.querySelectorAll("[data-store-binding]").forEach((row) => {
    row.addEventListener("dragstart", (event) => {
      const binding = decodeURIComponent(row.dataset.storeBinding || "");
      event.dataTransfer.setData("application/quasar-store-binding", binding);
      try {
        const parsed = JSON.parse(binding);
        event.dataTransfer.setData("text/plain", parsed.expression || "");
      } catch {
        event.dataTransfer.setData("text/plain", "");
      }
      event.dataTransfer.effectAllowed = "copy";
      row.classList.add("dragging");
    });
    row.addEventListener("dragend", () => row.classList.remove("dragging"));
  });
}

function buildStoreBindingExpression(importName, path) {
  return (path || []).reduce(
    (expression, key) =>
      /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key)
        ? expression + "." + key
        : expression + "[" + JSON.stringify(key) + "]",
    importName,
  );
}

function getStoreStateBinding(dataTransfer) {
  const raw = dataTransfer?.getData("application/quasar-store-binding");
  if (!raw) return null;
  try {
    const binding = JSON.parse(raw);
    return binding?.expression ? binding : null;
  } catch {
    return null;
  }
}

function isStoreStateDrag(dataTransfer) {
  return Array.from(dataTransfer?.types || []).includes(
    "application/quasar-store-binding",
  );
}

function screenStoreValueType(value) {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
}

function getScreenStoreStateStyles() {
  return `.screen-editor-workspace { display: grid; grid-template-columns: minmax(0, 1fr) 300px; min-height: calc(100vh - 42px); }
.screen-editor-canvas { min-width: 0; overflow: auto; }
.screen-store-state-panel { min-width: 0; overflow: auto; border-left: 1px solid var(--vscode-panel-border); color: var(--vscode-editor-foreground); background: var(--vscode-sideBar-background); }
.screen-store-state-title { position: sticky; z-index: 5; top: 0; padding: 8px 10px; border-bottom: 1px solid var(--vscode-panel-border); border-left: 3px solid var(--vscode-focusBorder); background: var(--vscode-sideBar-background); font-weight: 600; }
.screen-store-state-content { padding: 5px; }
.screen-store-state-content details > summary { display: flex; min-height: 26px; align-items: center; list-style: none; cursor: pointer; }
.screen-store-state-content details > summary::-webkit-details-marker { display: none; }
.screen-store-state-content details > summary::before { content: ""; flex: 0 0 7px; width: 7px; height: 7px; margin: 0 8px 0 3px; border-right: 1.5px solid var(--vscode-icon-foreground); border-bottom: 1.5px solid var(--vscode-icon-foreground); transform: translateY(-1px) rotate(45deg); }
.screen-store-state-content details:not([open]) > summary::before { transform: translateX(1px) rotate(-45deg); }
.screen-store-state-node { position: relative; }
.screen-store-state-row { display: inline-flex; min-width: 0; min-height: 25px; padding: 2px 5px; gap: 5px; align-items: center; border: 1px solid transparent; cursor: grab; user-select: none; }
.screen-store-state-row:hover { border-color: var(--vscode-focusBorder); background: var(--vscode-list-hoverBackground); }
.screen-store-state-row.dragging { opacity: .45; cursor: grabbing; }
.screen-store-state-row .material-icons { font-size: 15px; color: var(--vscode-icon-foreground); }
.screen-store-state-import { font-weight: 600; }
.screen-store-state-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.screen-store-state-row small { color: var(--vscode-descriptionForeground); font-size: 11px; }
.screen-store-state-children { position: relative; margin-left: 13px; padding-left: 13px; border-left: 1px solid var(--vscode-tree-indentGuidesStroke, var(--vscode-panel-border)); }
.screen-store-state-children > .screen-store-state-node::before { content: ""; position: absolute; left: -13px; top: 13px; width: 12px; border-top: 1px solid var(--vscode-tree-indentGuidesStroke, var(--vscode-panel-border)); }
.screen-store-state-leaf { min-height: 26px; padding-left: 17px; }
.qt-store-binding-drop-target { outline: 3px solid var(--vscode-focusBorder) !important; outline-offset: -3px !important; background-color: rgba(0, 122, 204, .12) !important; }
@media (max-width: 900px) { .screen-editor-workspace { grid-template-columns: 1fr; } .screen-store-state-panel { max-height: 280px; border-top: 1px solid var(--vscode-panel-border); border-left: 0; } }`;
}

module.exports = {
  getScreenStoreStateScript,
  getScreenStoreStateStyles,
};
