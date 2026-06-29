function getTableStyles() {
  return `.table-wizard-dialog { width: min(560px, calc(100vw - 32px)); }
.table-wizard-body { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 12px; }
.table-wizard-body .field { margin: 0; }
.table-wizard-check { align-self: center; }
.table-wizard-toolbar { grid-column: 1 / -1; display: flex; flex-wrap: wrap; gap: 12px; padding: 10px; border: 1px solid var(--vscode-panel-border); }
.table-wizard-toolbar legend { padding: 0 5px; color: var(--vscode-descriptionForeground); }
.designer-dialog.table-columns-dialog { width: min(1500px, calc(100vw - 24px)); max-width: calc(100vw - 24px); height: min(720px, calc(100vh - 24px)); display: flex; flex-direction: column; }
.table-columns-body { flex: 1; min-height: 0; overflow: auto; padding: 8px; }
.table-columns-grid { min-width: 980px; }
.table-editor-tabs { display: flex; gap: 0; margin-bottom: 8px; border-bottom: 1px solid var(--vscode-panel-border); }
.table-editor-tab { min-height: 34px; padding: 6px 18px; border: 1px solid var(--vscode-panel-border); border-bottom: 0; color: var(--vscode-descriptionForeground); background: var(--vscode-editor-background); }
.table-editor-tab.active { color: var(--vscode-editor-foreground); background: var(--vscode-list-activeSelectionBackground); }
.table-layout-editor { margin-bottom: 10px; padding: 8px; border: 1px solid var(--vscode-panel-border); border-radius: 6px; background: var(--vscode-editor-background); }
.table-layout-grid { display: grid; gap: 4px; min-width: 900px; }
.table-layout-row { display: grid; min-height: 38px; gap: 2px; align-items: stretch; }
.table-layout-row-title { display: flex; align-items: center; padding: 0 10px; color: var(--vscode-descriptionForeground); background: var(--vscode-sideBar-background); border: 1px solid var(--vscode-panel-border); }
.table-layout-cell { display: flex; min-width: 0; gap: 6px; align-items: center; padding: 0 8px; color: var(--vscode-editor-foreground); background: var(--vscode-input-background); border: 1px solid var(--vscode-panel-border); text-align: left; }
.table-layout-cell:hover { background: var(--vscode-list-hoverBackground); }
.table-layout-cell.selected { outline: 1px solid var(--vscode-focusBorder); background: var(--vscode-list-activeSelectionBackground); }
.table-layout-cell input { flex: 0 0 auto; }
.table-layout-cell span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.table-column-editor-shell { display: grid; grid-template-columns: 320px minmax(560px, 1fr); gap: 12px; min-width: 980px; }
.table-column-tree-panel { min-height: 430px; padding: 10px; border: 1px solid var(--vscode-panel-border); border-radius: 6px; background: var(--vscode-editor-background); }
.table-column-add-inline { min-height: 28px; margin-bottom: 10px; padding: 3px 12px; border: 1px solid var(--vscode-focusBorder); border-radius: 4px; color: var(--vscode-button-foreground); background: transparent; }
.table-column-tree { color: var(--vscode-editor-foreground); }
.table-column-tree-node-wrap { min-width: 0; }
.table-column-tree-node { display: grid; grid-template-columns: 18px minmax(0, 1fr); align-items: center; width: 100%; min-height: 30px; border: 0; color: inherit; background: transparent; text-align: left; }
.table-column-tree-node:hover { background: var(--vscode-list-hoverBackground); }
.table-column-tree-node.selected { outline: 1px solid var(--vscode-focusBorder); background: var(--vscode-list-activeSelectionBackground); color: var(--vscode-list-activeSelectionForeground); }
.table-column-tree-toggle { display: inline-flex; align-items: center; justify-content: center; width: 18px; color: var(--vscode-descriptionForeground); }
.table-column-tree-label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.table-column-tree-children { margin-left: 18px; border-left: 1px solid var(--vscode-panel-border); }
.table-column-property-panel { min-width: 0; }
.table-column-props { border: 1px solid var(--vscode-panel-border); border-radius: 6px; overflow: hidden; background: var(--vscode-editor-background); }
.table-column-props-title { padding: 9px 12px; border-left: 4px solid var(--vscode-focusBorder); border-bottom: 1px solid var(--vscode-panel-border); font-weight: 700; }
.table-column-prop-head, .table-column-prop-row { display: grid; grid-template-columns: 220px minmax(280px, 1fr); align-items: stretch; min-height: 34px; }
.table-column-prop-head { color: var(--vscode-button-foreground); background: var(--vscode-button-background); font-weight: 700; text-align: center; }
.table-column-prop-head span, .table-column-prop-row span { display: flex; align-items: center; padding: 6px 10px; border-right: 1px solid var(--vscode-panel-border); }
.table-column-prop-row { border-bottom: 1px solid var(--vscode-panel-border); background: var(--vscode-input-background); }
.table-column-prop-row:nth-child(odd) { background: color-mix(in srgb, var(--vscode-input-background) 86%, var(--vscode-editor-foreground) 14%); }
.table-column-prop-row input, .table-column-prop-row select { width: 100%; min-width: 0; border: 0; color: var(--vscode-input-foreground); background: transparent; padding: 5px 10px; }
.table-column-prop-row input[type="checkbox"] { width: auto; justify-self: start; align-self: center; margin-left: 10px; }
.table-column-prop-actions { display: flex; gap: 6px; justify-content: flex-end; padding: 10px; }
.table-column-prop-actions button { min-height: 28px; padding: 3px 12px; border: 1px solid var(--vscode-panel-border); color: var(--vscode-button-foreground); background: var(--vscode-button-background); }
.table-columns-head, .table-column-row { display: grid; grid-template-columns: 70px 130px 150px 130px 105px 90px 90px 70px 70px 70px 130px 44px; align-items: stretch; }
.table-columns-head { position: sticky; z-index: 2; top: 0; color: var(--vscode-button-foreground); background: var(--vscode-button-background); font-weight: 600; }
.table-columns-head span { padding: 6px 4px; text-align: center; border-right: 1px solid var(--vscode-panel-border); }
.table-column-row > input, .table-column-row > select, .table-column-row > button, .table-column-order { min-width: 0; min-height: 28px; border-width: 0 1px 1px 0; }
.table-column-row > input[type="checkbox"] { width: auto; justify-self: center; align-self: center; }
.table-column-order { display: flex; align-items: center; justify-content: center; }
.table-column-order button { width: 27px; height: 24px; padding: 0; border: 0; color: var(--vscode-icon-foreground); background: transparent; }
.qt-table-toolbar-preview { display: flex; width: 100%; gap: 6px; align-items: center; }
.qt-table-toolbar-preview .qt-table-title { font-weight: 600; }
.qt-table-toolbar-preview .qt-table-filter-preview { max-width: 240px; }
.qt-table-toolbar-preview .qt-table-toolbar-btn { height: 24px; min-height: 24px; padding: 0 10px; background: rgba(255, 255, 255, 0.82); box-shadow: none; opacity: 0.72; }
.qt-table-toolbar-spacer { flex: 1 1 auto; min-width: 8px; }
.qt-ag-table-preview { display: flex; flex-direction: column; gap: 6px; width: 100%; min-height: 220px; }
.qt-ag-grid { --ag-font-family: "Inter", "Segoe UI", Arial, sans-serif; --ag-font-size: 14px; --ag-border-radius: 6px; --ag-wrapper-border-radius: 6px; --ag-header-height: 48px; --ag-row-height: 42px; --ag-header-background-color: #3f94d9; --ag-header-foreground-color: #ffffff; --ag-background-color: #ffffff; --ag-foreground-color: #111827; --ag-border-color: #cfd7e3; --ag-row-border-color: #d9dee7; --ag-secondary-border-color: rgba(255,255,255,.18); --ag-odd-row-background-color: #ffffff; --ag-row-hover-color: #eef7ff; --ag-selected-row-background-color: #dff0ff; --ag-checkbox-border-radius: 2px; width: 100%; min-height: 220px; border: 1px solid #aeb8c7; border-radius: 6px; overflow: hidden; }
.qt-ag-grid .ag-root-wrapper { border: 0; border-radius: 6px; }
.qt-ag-grid .ag-header, .qt-ag-grid .ag-header-row, .qt-ag-grid .ag-header-cell, .qt-ag-grid .ag-header-group-cell { background-color: #3f94d9; color: #ffffff; }
.qt-ag-grid .ag-header { border-bottom: 0; }
.qt-ag-grid .ag-header-cell { padding-inline: 16px; border-right: 1px solid rgba(255,255,255,.18); }
.qt-ag-grid .ag-header-cell.qt-ag-header-selected, .qt-ag-grid .ag-header-group-cell.qt-ag-header-selected { box-shadow: inset 0 0 0 2px #ff4d4f; }
.qt-ag-grid .ag-header-cell-label, .qt-ag-grid .ag-header-group-cell-label { color: #ffffff; font-weight: 700; }
.qt-ag-grid .ag-header-cell-text, .qt-ag-grid .ag-header-group-text, .qt-ag-grid .ag-header-cell .ag-icon, .qt-ag-grid .ag-header-group-cell .ag-icon, .qt-ag-grid .ag-header-cell-menu-button, .qt-ag-grid .ag-header-cell-filter-button { color: #ffffff; }
.qt-ag-grid .ag-row { color: #111827; border-bottom: 1px solid #d9dee7; }
.qt-ag-grid .ag-row-even { background: #ffffff; }
.qt-ag-grid .ag-row-odd { background: #eef8ff; }
.qt-ag-grid .ag-row-hover, .qt-ag-grid .ag-row-selected { background: #dff0ff !important; }
.qt-ag-grid .ag-row-selected::before { background-color: #dff0ff !important; opacity: 1 !important; }
.qt-ag-grid .ag-row-hover::before { background-color: #eef7ff !important; opacity: 1 !important; }
.qt-ag-grid .ag-cell { display: flex; align-items: center; padding-inline: 16px; border-right: 0; }
.qt-ag-grid .ag-cell.qt-ag-group-row-cell { align-items: stretch; padding: 0; }
.qt-ag-grid .qt-ag-group-row-editor { display: grid; grid-template-rows: 1fr 1fr; width: 100%; height: 100%; min-width: 0; }
.qt-ag-grid .qt-ag-group-children { display: grid; grid-template-columns: repeat(var(--qt-group-child-count, 1), minmax(0, 1fr)); min-width: 0; border-top: 1px solid #d9dee7; }
.qt-ag-grid .qt-ag-group-input { width: 100%; height: 100%; min-width: 0; border: 0; border-right: 1px solid #d9dee7; outline: none; color: #111827; background: transparent; padding: 0 16px; font: inherit; }
.qt-ag-grid .qt-ag-group-input:last-child { border-right: 0; }
.qt-ag-grid .qt-ag-group-input:focus { box-shadow: inset 0 0 0 1px #1a73ff; background: #ffffff; }
.qt-ag-grid .qt-ag-layout-row-editor { display: grid; grid-template-columns: repeat(var(--qt-layout-column-count, 1), minmax(0, 1fr)); grid-template-rows: repeat(var(--qt-layout-row-count, 1), minmax(0, 1fr)); width: 100%; height: 100%; min-width: 0; }
.qt-ag-grid .qt-ag-layout-input { width: 100%; height: 100%; min-width: 0; border: 0; border-right: 1px solid #d9dee7; border-bottom: 1px solid #d9dee7; outline: none; color: #111827; background: transparent; padding: 0 16px; font: inherit; }
.qt-ag-grid .qt-ag-layout-input:focus { box-shadow: inset 0 0 0 1px #1a73ff; background: #ffffff; }
.qt-ag-grid .qt-table-mode-cell { justify-content: center; color: #2563eb; font-weight: 700; }
.qt-ag-grid .ag-cell-focus, .qt-ag-grid .ag-cell-inline-editing { border: 0 !important; outline: none !important; box-shadow: inset 0 0 0 1px #1a73ff !important; }
.qt-ag-grid .ag-cell.qt-ag-copy-range-cell { background: rgba(26, 115, 255, 0.16) !important; box-shadow: inset 0 0 0 1px rgba(26, 115, 255, 0.38); }
.qt-ag-grid .ag-cell.qt-ag-copy-range-anchor { box-shadow: inset 0 0 0 2px #1a73ff !important; }
.qt-ag-grid .ag-cell-inline-editing { background: #ffffff; }
.qt-ag-grid .ag-cell-inline-editing .ag-cell-edit-wrapper, .qt-ag-grid .ag-cell-inline-editing .ag-cell-editor, .qt-ag-grid .ag-cell-inline-editing .ag-input-wrapper, .qt-ag-grid .ag-cell-inline-editing .ag-text-field-input-wrapper { width: 100%; height: 100%; }
.qt-ag-grid .ag-cell-inline-editing input[class^="ag-"], .qt-ag-grid .ag-cell-inline-editing input[class*=" ag-"] { width: 100%; height: 100%; border: 0 !important; outline: none !important; background: transparent; box-shadow: none !important; padding-inline: 14px; }
.qt-ag-grid .ag-paging-panel { min-height: 48px; padding: 0 18px; color: #111827; background: #ffffff; border-top: 1px solid #d9dee7; font-size: 14px; }
.qt-ag-grid .ag-paging-page-size .ag-picker-field-wrapper { min-height: 30px; border-color: #cfd7e3; border-radius: 4px; }
.qt-ag-grid .ag-paging-button { color: #1f2937; }
.qt-ag-grid .ag-paging-button.ag-disabled { color: #b9c0cb; }
.qt-ag-action-btn { margin-right: 4px; padding: 1px 7px; border: 1px solid #cfd8dc; border-radius: 3px; background: #fff; color: #455a64; }
.qt-ag-action-danger { border-color: #ffcdd2; color: #c62828; }
.qt-table-empty-preview { padding: 18px; color: var(--vscode-descriptionForeground); text-align: center; }
@media (max-width: 700px) { .table-wizard-body { grid-template-columns: 1fr; } .table-wizard-toolbar { grid-column: 1; } }`;
}

module.exports = { getTableStyles };
