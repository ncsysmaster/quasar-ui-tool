function getPageTreeHtml(webview, htmlShell, getNonce) {
  const nonce = getNonce();
  return htmlShell(
    webview,
    nonce,
    "Page Tree",
    `
    <div id="content"></div>

    <script nonce="${nonce}">
      const vscode = acquireVsCodeApi()
      let model = null
      let selectedId = ''
      let pendingLocalSelectionId = ''
      const collapsedIds = new Set()

      window.addEventListener('message', (event) => {
        if (event.data.type !== 'state') return
        const nextSelectedId = event.data.selectedId || ''
        const selectionChanged = nextSelectedId !== selectedId
        const isLocalSelection = Boolean(
          pendingLocalSelectionId && pendingLocalSelectionId === nextSelectedId
        )
        pendingLocalSelectionId = ''
        model = event.data.model
        selectedId = nextSelectedId

        if (selectionChanged && selectedId) {
          expandSelectedAncestors()
        }

        render()

        if (selectionChanged && selectedId && !isLocalSelection) {
          requestAnimationFrame(revealSelectedComponent)
        }
      })

      window.addEventListener('keydown', (event) => {
        if (!(event.ctrlKey || event.metaKey) || event.altKey || event.shiftKey) return
        if (event.key.toLowerCase() !== 's') return

        event.preventDefault()
        event.stopPropagation()
        vscode.postMessage({ type: 'saveScreen' })
      }, true)

      vscode.postMessage({ type: 'ready' })

      document.addEventListener('keydown', (event) => {
        const isEditing = event.target?.isContentEditable ||
          event.target.closest?.('input, textarea, select, .form-context-menu')
        if (isEditing) return

        const clipboardAction = (event.ctrlKey || event.metaKey) &&
          !event.altKey && !event.shiftKey
          ? { c: 'copy', x: 'cut', v: 'paste' }[event.key.toLowerCase()]
          : undefined

        if (clipboardAction) {
          if ((clipboardAction === 'copy' || clipboardAction === 'cut') && !selectedId) return

          event.preventDefault()
          event.stopPropagation()
          vscode.postMessage({
            type: 'componentClipboard',
            action: clipboardAction
          })
          return
        }

        if (event.key !== 'Delete' && event.key !== 'Backspace') return
        if (!selectedId) return

        event.preventDefault()
        event.stopPropagation()
        vscode.postMessage({ type: 'deleteComponent', id: selectedId })
      })

      function render() {
        const content = document.getElementById('content')

        if (!model) {
          content.innerHTML = '<div class="empty">No page is open.</div>'
          return
        }

        content.innerHTML = '<div class="tree-root" role="tree">' +
          (model.components || []).map((item) => row(item)).join('') +
          '</div>' +
          '<div id="tree-form-context-menu" class="form-context-menu hidden" role="menu">' +
            '<button data-form-action="add-row" role="menuitem">Row 추가</button>' +
            '<button data-form-action="add-column" role="menuitem">Column 추가</button>' +
            '<button data-tree-split-cell role="menuitem">셀 나누기...</button>' +
            '<span class="form-context-separator"></span>' +
            '<button data-form-action="delete-row" role="menuitem">Row 삭제</button>' +
            '<button data-form-action="delete-column" role="menuitem">Column 삭제</button>' +
          '</div>' +
          '<div id="tree-cell-split-dialog" class="designer-dialog-backdrop hidden">' +
            '<div class="designer-dialog" role="dialog" aria-modal="true" aria-labelledby="tree-split-cell-title">' +
              '<div class="designer-dialog-header">' +
                '<strong id="tree-split-cell-title">셀 나누기</strong>' +
                '<button class="designer-dialog-close" data-tree-split-cancel title="닫기" aria-label="닫기">×</button>' +
              '</div>' +
              '<div class="designer-dialog-body">' +
                '<fieldset class="split-cell-fieldset">' +
                  '<legend>줄/칸 나누기</legend>' +
                  '<label class="split-cell-option"><input type="radio" name="tree-split-direction" data-tree-split-rows checked><span>줄 개수</span><input type="number" data-tree-split-row-count min="1" max="20" value="2"></label>' +
                  '<label class="split-cell-option"><input type="radio" name="tree-split-direction" data-tree-split-columns><span>칸 개수</span><input type="number" data-tree-split-column-count min="1" max="20" value="2" disabled></label>' +
                '</fieldset>' +
              '</div>' +
              '<div class="designer-dialog-actions">' +
                '<button class="primary" data-tree-split-apply>나누기</button>' +
                '<button data-tree-split-cancel>취소</button>' +
              '</div>' +
            '</div>' +
          '</div>'

        setupTreeFormContextMenu()
        setupTreeSplitCellDialog()

        content.querySelectorAll('[data-toggle]').forEach((toggle) => {
          toggle.addEventListener('click', (event) => {
            event.preventDefault()
            event.stopPropagation()

            const id = toggle.dataset.toggle
            if (collapsedIds.has(id)) {
              collapsedIds.delete(id)
            } else {
              collapsedIds.add(id)
            }
            render()
          })
        })

        content.querySelectorAll('[data-select]').forEach((button) => {
          button.addEventListener('click', () => {
            selectFromTree(button.dataset.select)
          })

          button.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              selectFromTree(button.dataset.select)
              return
            }

            if (event.key === 'Delete' || event.key === 'Backspace') {
              event.preventDefault()
              event.stopPropagation()
              vscode.postMessage({
                type: 'deleteComponent',
                id: button.dataset.select
              })
            }
          })

          button.addEventListener('contextmenu', (event) => {
            const layoutContext = getTreeLayoutContext(button.dataset.select)
            if (!layoutContext.rowId && !layoutContext.columnId) return

            event.preventDefault()
            event.stopPropagation()
            showTreeFormContextMenu(event.clientX, event.clientY, layoutContext)
          })

          button.addEventListener('dragstart', (event) => {
            event.stopPropagation()

            const dragId = button.dataset.select

            event.dataTransfer.setData('text/plain', dragId)
            event.dataTransfer.setData('application/quasar-tree-id', dragId)
            event.dataTransfer.effectAllowed = 'move'

            button.classList.add('dragging')

            selectFromTree(dragId)
          })

          button.addEventListener('dragend', () => {
            button.classList.remove('dragging')
            content.querySelectorAll('.tree-row.drag-over').forEach((el) => {
              el.classList.remove('drag-over')
            })
          })

          button.addEventListener('dragover', (event) => {
            event.preventDefault()
            event.stopPropagation()

            const dragId =
              event.dataTransfer.getData('application/quasar-tree-id') ||
              event.dataTransfer.getData('text/plain')

            const dropId = button.dataset.select

            if (!dragId || !dropId || dragId === dropId) return

            button.classList.add('drag-over')
            event.dataTransfer.dropEffect = 'move'
          })

          button.addEventListener('dragleave', () => {
            button.classList.remove('drag-over')
          })

          button.addEventListener('drop', (event) => {
            event.preventDefault()
            event.stopPropagation()

            button.classList.remove('drag-over')

            const dragId =
              event.dataTransfer.getData('application/quasar-tree-id') ||
              event.dataTransfer.getData('text/plain')

            const dropId = button.dataset.select

            if (!dragId || !dropId || dragId === dropId) return

            vscode.postMessage({
              type: 'moveComponent',
              dragId,
              dropId,
              mode: 'inside'
            })
          })
        })
      }

      function selectFromTree(id) {
        pendingLocalSelectionId = id || ''
        vscode.postMessage({ type: 'select', id: pendingLocalSelectionId })
      }

      function row(component) {
        const children = Array.isArray(component.children)
          ? component.children
          : []

        const tagName = getDisplayTag(component)
        const idText = component.id || ''
        const hasChildren = children.length > 0
        const isCollapsed = hasChildren && collapsedIds.has(idText)
        const toggle = hasChildren
          ? '<button class="tree-toggle ' + (isCollapsed ? 'collapsed' : 'expanded') + '" data-toggle="' + escapeAttr(idText) + '" title="' + (isCollapsed ? 'Expand' : 'Collapse') + '" aria-label="' + (isCollapsed ? 'Expand' : 'Collapse') + '"></button>'
          : '<span class="tree-toggle-spacer"></span>'
        const childrenHtml = hasChildren && !isCollapsed
          ? '<div class="tree-children" role="group">' + children.map((child) => row(child)).join('') + '</div>'
          : ''

        return '<div class="tree-node">' +
          '<div class="tree-row ' +
          (component.id === selectedId ? 'selected' : '') +
          '" draggable="true" role="treeitem" tabindex="0"' +
          ' data-select="' + escapeAttr(component.id || '') + '"' +
          '>' +
          '<span class="tree-main">' +
            toggle +
            '<span class="tree-tag">' + escapeHtml(tagName) + '</span>' +
            '<span class="tree-id">(' + escapeHtml(idText) + ')</span>' +
          '</span>' +
          '</div>' +
          childrenHtml +
        '</div>'
      }

      function expandSelectedAncestors() {
        const path = findTreeComponentPath(model?.components || [], selectedId)
        path.slice(0, -1).forEach((component) => {
          if (component?.id) collapsedIds.delete(component.id)
        })
      }

      function revealSelectedComponent() {
        const content = document.getElementById('content')
        const selectedRow = [...content.querySelectorAll('[data-select]')]
          .find((rowElement) => rowElement.dataset.select === selectedId)

        selectedRow?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'nearest'
        })
      }

      function getDisplayTag(component) {
        if (!component) return ''

        if (component.type === 'HtmlElement') {
          const tagName = component.tag || 'div'
          if (tagName.toLowerCase() !== 'div') return tagName

          const classTokens = getTreeClassTokens(component)
          if (classTokens.includes('row')) return 'div-row'
          if (classTokens.some((token) => token === 'col' || token.startsWith('col-'))) {
            return 'div-col'
          }

          return tagName
        }

        return component.type || ''
      }

      function getTreeLayoutContext(componentId) {
        const path = findTreeComponentPath(model?.components || [], componentId)
        if (!path.length) return { rowId: '', columnId: '', splitCellId: '' }

        const component = path[path.length - 1]
        if (isTreeLayoutRow(component)) {
          const firstColumn = findFirstTreeLayoutComponent(component, isTreeLayoutColumn)
          return {
            rowId: component.id || '',
            columnId: firstColumn?.id || '',
            splitCellId: ''
          }
        }

        if (isTreeLayoutColumn(component)) {
          const row = [...path.slice(0, -1)].reverse().find(isTreeLayoutRow)
          return {
            rowId: row?.id || '',
            columnId: component.id || '',
            splitCellId: component.id || ''
          }
        }

        return { rowId: '', columnId: '', splitCellId: '' }
      }

      function findTreeComponentPath(components, id, ancestors = []) {
        for (const component of components || []) {
          const path = [...ancestors, component]
          if (component.id === id) return path
          const childPath = findTreeComponentPath(component.children, id, path)
          if (childPath.length) return childPath
        }
        return []
      }

      function findFirstTreeLayoutComponent(component, predicate) {
        if (!component) return null
        if (predicate(component)) return component
        for (const child of component.children || []) {
          const found = findFirstTreeLayoutComponent(child, predicate)
          if (found) return found
        }
        return null
      }

      function isTreeLayoutRow(component) {
        return component?.type === 'HtmlElement' && getTreeClassTokens(component).includes('row')
      }

      function isTreeLayoutColumn(component) {
        return component?.type === 'HtmlElement' && (
          component?.designer?.role === 'splitCell' ||
          getTreeClassTokens(component)
            .some((token) => token === 'col' || token.startsWith('col-'))
        )
      }

      function getTreeClassTokens(component) {
        return String(component?.class || component?.props?.class || '')
          .split(/\\s+/)
          .filter(Boolean)
      }

      function setupTreeFormContextMenu() {
        const menu = document.getElementById('tree-form-context-menu')
        if (!menu) return

        menu.querySelectorAll('[data-form-action]').forEach((button) => {
          button.addEventListener('click', (event) => {
            event.stopPropagation()
            if (button.disabled) return

            const action = button.dataset.formAction
            const targetId = action.includes('column')
              ? menu.dataset.columnId
              : menu.dataset.rowId

            hideTreeFormContextMenu()
            vscode.postMessage({ type: 'formLayoutAction', action, targetId })
          })
        })

        menu.querySelector('[data-tree-split-cell]')?.addEventListener('click', (event) => {
          event.stopPropagation()
          const targetId = menu.dataset.splitCellId
          if (!targetId || event.currentTarget.disabled) return

          hideTreeFormContextMenu()
          showTreeSplitCellDialog(targetId)
        })
      }

      function showTreeFormContextMenu(clientX, clientY, layoutContext) {
        const menu = document.getElementById('tree-form-context-menu')
        if (!menu) return

        menu.dataset.rowId = layoutContext.rowId || ''
        menu.dataset.columnId = layoutContext.columnId || ''
        menu.dataset.splitCellId = layoutContext.splitCellId || ''
        menu.querySelectorAll('[data-form-action]').forEach((button) => {
          button.disabled = button.dataset.formAction.includes('column')
            ? !layoutContext.columnId
            : !layoutContext.rowId
        })
        const splitCellButton = menu.querySelector('[data-tree-split-cell]')
        if (splitCellButton) splitCellButton.disabled = !layoutContext.splitCellId
        menu.classList.remove('hidden')

        const bounds = menu.getBoundingClientRect()
        menu.style.left = Math.max(4, Math.min(clientX, window.innerWidth - bounds.width - 4)) + 'px'
        menu.style.top = Math.max(4, Math.min(clientY, window.innerHeight - bounds.height - 4)) + 'px'
      }

      function hideTreeFormContextMenu() {
        document.getElementById('tree-form-context-menu')?.classList.add('hidden')
      }

      function setupTreeSplitCellDialog() {
        const dialog = document.getElementById('tree-cell-split-dialog')
        if (!dialog) return

        const rowsEnabled = dialog.querySelector('[data-tree-split-rows]')
        const columnsEnabled = dialog.querySelector('[data-tree-split-columns]')
        const rowCount = dialog.querySelector('[data-tree-split-row-count]')
        const columnCount = dialog.querySelector('[data-tree-split-column-count]')

        rowsEnabled.addEventListener('change', () => {
          rowCount.disabled = !rowsEnabled.checked
          columnCount.disabled = rowsEnabled.checked
        })
        columnsEnabled.addEventListener('change', () => {
          columnCount.disabled = !columnsEnabled.checked
          rowCount.disabled = columnsEnabled.checked
        })

        dialog.querySelectorAll('[data-tree-split-cancel]').forEach((button) => {
          button.addEventListener('click', hideTreeSplitCellDialog)
        })

        dialog.addEventListener('click', (event) => {
          if (event.target === dialog) hideTreeSplitCellDialog()
        })

        dialog.querySelector('[data-tree-split-apply]').addEventListener('click', () => {
          if (!rowsEnabled.checked && !columnsEnabled.checked) return

          vscode.postMessage({
            type: 'splitFormCell',
            targetId: dialog.dataset.targetId,
            rowsEnabled: rowsEnabled.checked,
            rowCount: clampTreeSplitCount(rowCount.value),
            columnsEnabled: columnsEnabled.checked,
            columnCount: clampTreeSplitCount(columnCount.value)
          })
          hideTreeSplitCellDialog()
        })
      }

      function showTreeSplitCellDialog(targetId) {
        const dialog = document.getElementById('tree-cell-split-dialog')
        if (!dialog) return

        dialog.dataset.targetId = targetId
        dialog.querySelector('[data-tree-split-rows]').checked = true
        dialog.querySelector('[data-tree-split-row-count]').value = '2'
        dialog.querySelector('[data-tree-split-row-count]').disabled = false
        dialog.querySelector('[data-tree-split-columns]').checked = false
        dialog.querySelector('[data-tree-split-column-count]').value = '2'
        dialog.querySelector('[data-tree-split-column-count]').disabled = true
        dialog.classList.remove('hidden')
        dialog.querySelector('[data-tree-split-row-count]').focus()
        dialog.querySelector('[data-tree-split-row-count]').select()
      }

      function hideTreeSplitCellDialog() {
        document.getElementById('tree-cell-split-dialog')?.classList.add('hidden')
      }

      function clampTreeSplitCount(value) {
        return Math.max(1, Math.min(20, Math.round(Number(value) || 1)))
      }

      document.addEventListener('pointerdown', (event) => {
        if (!event.target.closest?.('#tree-form-context-menu')) hideTreeFormContextMenu()
      })
      window.addEventListener('blur', hideTreeFormContextMenu)
    </script>
  `,
  );
}

module.exports = {
  getPageTreeHtml,
};
