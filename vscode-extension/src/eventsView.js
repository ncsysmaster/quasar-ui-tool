function getEventsHtml(webview, htmlShell, getNonce) {
  const nonce = getNonce();

  return htmlShell(
    webview,
    nonce,
    "Events",
    `
    <div id="content" class="view-body"></div>

    <script nonce="${nonce}">
      const vscode = acquireVsCodeApi()
      let model = null
      let selectedId = ''

      window.addEventListener('message', (event) => {
        if (event.data.type !== 'state') return
        model = event.data.model
        selectedId = event.data.selectedId
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
        const component = findComponent(model?.components || [], selectedId)

        if (!component) {
          content.innerHTML = '<div class="empty">Select a component.</div>'
          return
        }

        const events = component.events || {}
        const eventList = [...new Set([
          ...Object.keys(events),
          ...getEventsByComponent(component)
        ])]

        content.innerHTML =
          '<div class="event-section">' +
            '<div class="event-section-title">' +
              escapeHtml(component.type || '') + ' Events' +
            '</div>' +
            eventList.map((eventName) => {
              return eventField(eventName, events[eventName] || '')
            }).join('') +
          '</div>'

        content.querySelectorAll('[data-event-name]').forEach((input) => {
          input.addEventListener('change', () => {
            vscode.postMessage({
              type: 'updateEvent',
              eventName: input.dataset.eventName,
              value: input.value,
              openScriptTab: true
            })
          })
        })

        content.querySelectorAll('[data-open-event]').forEach((button) => {
          button.addEventListener('click', () => {
            const input = content.querySelector('[data-event-name="' + button.dataset.openEvent + '"]')
            vscode.postMessage({
              type: 'openEventMethod',
              eventName: button.dataset.openEvent,
              value: input?.value || ''
            })
          })
        })
      }

      function eventField(eventName, value) {
        return '<div class="event-field">' +
          '<span class="event-label">@' + escapeHtml(eventName) + '</span>' +
          '<div class="event-input-wrap">' +
            '<input class="event-input" data-event-name="' + escapeAttr(eventName) + '" value="' + escapeAttr(value) + '" placeholder="handler name">' +
            '<button class="event-method-button" data-open-event="' + escapeAttr(eventName) + '" title="Create or open event method">...</button>' +
          '</div>' +
        '</div>'
      }

      function getEventsByComponent(component) {
        if (!component) return []

        if (component.type === 'Button') {
          return ['click', 'dblclick', 'mouseover', 'mouseleave', 'focus', 'blur']
        }

        if (component.type === 'Input') {
          return ['update:model-value', 'change', 'input', 'focus', 'blur', 'clear']
        }

        if (component.type === 'Select') {
          return ['update:model-value', 'filter', 'input-value', 'popup-show', 'popup-hide', 'focus', 'blur', 'clear']
        }

        if (component.type === 'Toggle') {
          return ['update:model-value', 'click', 'focus', 'blur']
        }

        if (component.type === 'Table') {
          return ['row-click', 'row-dblclick', 'selection', 'request', 'update:pagination']
        }

        if (component.type === 'Card' || component.type === 'CardSection') {
          return ['click', 'dblclick', 'mouseover', 'mouseleave']
        }

        if (component.type === 'HtmlElement') {
          return ['click', 'dblclick', 'mouseover', 'mouseleave', 'mouseenter', 'keydown', 'keyup']
        }

        return ['click', 'dblclick', 'focus', 'blur']
      }
    </script>
  `,
  );
}

module.exports = {
  getEventsHtml,
};
