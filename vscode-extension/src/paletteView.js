const { PALETTE } = require("./constants");

function getPaletteHtml(webview, htmlShell, getNonce) {
  const nonce = getNonce();

  return htmlShell(
    webview,
    nonce,
    "Component Palette",
    `
    <div class="palette-grid">
      ${PALETTE.map(
        (item, index) => `
          <button
            class="palette-item"
            draggable="true"
            data-add="${index}"
          >
            <span class="palette-icon">${getPaletteIcon(item.type, item.label)}</span>
            <span class="palette-label">${escapeHtml(item.label)}</span>
          </button>
      `,
      ).join("")}
    </div>

    <script nonce="${nonce}">
      const vscode = acquireVsCodeApi()

      document.querySelectorAll('[data-add]').forEach((button) => {
        button.addEventListener('click', () => {
          vscode.postMessage({
            type: 'addComponent',
            index: Number(button.dataset.add)
          })
        })

        button.addEventListener('dragstart', (event) => {
          event.dataTransfer.setData(
            'application/quasar-palette-index',
            button.dataset.add
          )

          event.dataTransfer.setData(
            'text/plain',
            'palette:' + button.dataset.add
          )

          event.dataTransfer.effectAllowed = 'copy'
        })
      })
    </script>
  `,
  );
}

function getPaletteIcon(type, label) {
  if (type === "QPage") return "▧";
  if (type === "FormTemplate") return "F";
  if (type === "QBtn") return "🔘";
  if (type === "QInput") return "⌨️";
  if (type === "QCard") return "▢";
  if (type === "QCardSection") return "▤";
  if (type === "QTable") return "▦";

  if (type === "HtmlElement" && label === "Text") return "T";
  if (type === "HtmlElement" && label === "Row") return "↔";
  if (type === "HtmlElement" && label === "Column") return "↕";

  return "▣";
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

module.exports = {
  getPaletteHtml,
};
