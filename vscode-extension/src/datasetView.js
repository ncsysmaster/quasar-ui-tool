function getDatasetHtml(webview, htmlShell, getNonce) {
  const nonce = getNonce();
  return htmlShell(
    webview,
    nonce,
    "DataSet",
    `
    <div id="content"></div>
    <script nonce="${nonce}">
      const vscode = acquireVsCodeApi()
      let model = null

      window.addEventListener('message', (event) => {
        if (event.data.type !== 'state') return
        model = event.data.model
        render()
      })

      window.addEventListener('keydown', (event) => {
        if (!(event.ctrlKey || event.metaKey) || event.altKey || event.shiftKey) return
        if (event.key.toLowerCase() !== 's') return

        event.preventDefault()
        event.stopPropagation()
        vscode.postMessage({ type: 'saveScreen' })
      }, true)

      vscode.postMessage({ type: 'ready' })

      function render() {
        const content = document.getElementById('content')
        const dataset = model?.datasets?.[0] || { name: 'defaultDataset', fields: [] }
        content.innerHTML = '<button class="primary" data-add>Add Field</button>' +
          dataset.fields.map((field, index) => fieldRow(field, index)).join('')

        content.querySelector('[data-add]')?.addEventListener('click', () => vscode.postMessage({ type: 'addField' }))
        content.querySelectorAll('[data-field]').forEach((input) => {
          input.addEventListener('change', () => vscode.postMessage({
            type: 'updateField',
            index: Number(input.dataset.index),
            name: input.dataset.field,
            value: input.type === 'checkbox' ? input.checked : input.value
          }))
        })
        content.querySelectorAll('[data-remove]').forEach((button) => {
          button.addEventListener('click', () => vscode.postMessage({ type: 'removeField', index: Number(button.dataset.remove) }))
        })
      }

      function fieldRow(field, index) {
        return '<div class="dataset-row">' +
          '<input data-field="name" data-index="' + index + '" value="' + escapeAttr(field.name || '') + '">' +
          '<input data-field="label" data-index="' + index + '" value="' + escapeAttr(field.label || '') + '">' +
          '<select data-field="type" data-index="' + index + '">' + ['string', 'number', 'boolean', 'date', 'object'].map((type) => '<option value="' + type + '"' + (field.type === type ? ' selected' : '') + '>' + type + '</option>').join('') + '</select>' +
          '<label class="check"><input type="checkbox" data-field="required" data-index="' + index + '"' + (field.required ? ' checked' : '') + '> required</label>' +
          '<button class="danger" data-remove="' + index + '">Delete</button>' +
        '</div>'
      }
    </script>
  `,
  );
}

module.exports = { getDatasetHtml };
