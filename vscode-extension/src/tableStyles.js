function getTableStyles() {
  return `.table-wizard-dialog { width: min(560px, calc(100vw - 32px)); }
.table-wizard-body { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 12px; }
.table-wizard-body .field { margin: 0; }
.table-wizard-check { align-self: center; }
.table-wizard-toolbar { grid-column: 1 / -1; display: flex; flex-wrap: wrap; gap: 12px; padding: 10px; border: 1px solid var(--vscode-panel-border); }
.table-wizard-toolbar legend { padding: 0 5px; color: var(--vscode-descriptionForeground); }
.designer-dialog.table-columns-dialog { width: min(1500px, calc(100vw - 24px)); max-width: calc(100vw - 24px); height: min(720px, calc(100vh - 24px)); display: flex; flex-direction: column; }
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
.qt-ag-grid .ag-header-cell-label { color: #ffffff; font-weight: 700; }
.qt-ag-grid .ag-header-cell-text, .qt-ag-grid .ag-header-cell .ag-icon, .qt-ag-grid .ag-header-cell-menu-button, .qt-ag-grid .ag-header-cell-filter-button { color: #ffffff; }
.qt-ag-grid .ag-row { color: #111827; border-bottom: 1px solid #d9dee7; }
.qt-ag-grid .ag-row-even { background: #ffffff; }
.qt-ag-grid .ag-row-odd { background: #eef8ff; }
.qt-ag-grid .ag-row-hover, .qt-ag-grid .ag-row-selected { background: #dff0ff !important; }
.qt-ag-grid .ag-row-selected::before { background-color: #dff0ff !important; opacity: 1 !important; }
.qt-ag-grid .ag-row-hover::before { background-color: #eef7ff !important; opacity: 1 !important; }
.qt-ag-grid .ag-cell { display: flex; align-items: center; padding-inline: 16px; border-right: 0; }
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
