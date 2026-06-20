/* 편집창 화면 */
function getEditorHtml(webview, runtimeUris) {
  const nonce = getNonce();
  return htmlShell(
    webview,
    nonce,
    "Quasar Page Editor",
    `
    <link rel="stylesheet" href="${runtimeUris.materialIconsCss}">
    <link rel="stylesheet" href="${runtimeUris.quasarCss}">
    <div class="tabs">
      <button class="tab active" data-tab="screen">Screen</button>
      <button class="tab" data-tab="script">Script</button>
      <button class="tab" data-tab="dataset">DataSet</button>
      <div id="screen-tools" class="screen-tools">
        <button id="toggle-canvas-grid" class="screen-tool-button" type="button" title="화면 격자 숨기기" aria-label="화면 격자 숨기기" aria-pressed="true">
          <span class="material-icons" aria-hidden="true">grid_on</span>
        </button>
        <button id="toggle-grid-metrics" class="screen-tool-button" type="button" title="Grid col 정보 숨기기" aria-label="Grid col 정보 숨기기" aria-pressed="true">
          <span class="material-icons" aria-hidden="true">visibility</span>
        </button>
      </div>
    </div>
    <main id="content"></main>
    <script nonce="${nonce}" src="${runtimeUris.vue}"></script>
    <script nonce="${nonce}" src="${runtimeUris.quasar}"></script>
    <script nonce="${nonce}" src="${runtimeUris.monacoLoader}"></script>
    <script nonce="${nonce}">
      const vscode = acquireVsCodeApi()
      const vueRuntime = window.Vue
      const quasarRuntime = window.Quasar || window.quasar
      let model = null
      let selectedId = ''
      let activeTab = 'screen'
      let previewApp = null
      let previewState = null
      let scriptEditor = null
      let scriptEditorModel = null
      let scriptSaveTimer = null
      let scriptRenderToken = 0
      let pendingScriptMethod = ''
      let lastScriptNavigationRequest = 0
      let showGridMetrics = vscode.getState()?.showGridMetrics !== false
      let showCanvasGrid = vscode.getState()?.showCanvasGrid !== false

      window.MonacoEnvironment = {
        getWorker(moduleId, label) {
          const workerUri = label === 'typescript' || label === 'javascript'
            ? '${runtimeUris.monacoTypeScriptWorker}'
            : '${runtimeUris.monacoEditorWorker}'
          return new Worker(workerUri, { type: 'module', name: label })
        }
      }

      const monacoReady = new Promise((resolve, reject) => {
        if (typeof require !== 'function') {
          reject(new Error('Monaco AMD loader could not be loaded.'))
          return
        }

        require.config({ paths: { vs: '${runtimeUris.monacoVs}' } })
        require(
          ['vs/editor/editor.main', 'vs/language/typescript/monaco.contribution'],
          () => {
            configureJavaScriptLanguage()
            resolve(window.monaco)
          },
          reject
        )
      })

      window.addEventListener('message', (event) => {
        if (event.data.type !== 'state') return

        model = event.data.model
        selectedId = event.data.selectedId

        const navigation = event.data.scriptNavigation
        if (navigation?.requestId && navigation.requestId !== lastScriptNavigationRequest) {
          lastScriptNavigationRequest = navigation.requestId
          pendingScriptMethod = navigation.methodName || ''
        }

        if (event.data.activeTab) {
          activeTab = event.data.activeTab

          document.querySelectorAll('[data-tab]').forEach((tab) => {
            tab.classList.toggle('active', tab.dataset.tab === activeTab)
          })
          updateScreenTools()
        }

        if (activeTab === 'script' && scriptEditor) {
          syncScriptEditor(model.script?.setup || '')
          revealPendingScriptMethod()
          return
        }

        render()
      })

      document.querySelectorAll('[data-tab]').forEach((button) => {
        button.addEventListener('click', () => {
          activeTab = button.dataset.tab
          document.querySelectorAll('[data-tab]').forEach((tab) => tab.classList.toggle('active', tab === button))
          updateScreenTools()
          vscode.postMessage({ type: 'setEditorTab', tab: activeTab })
          render()
        })
      })

      document.getElementById('toggle-grid-metrics').addEventListener('click', () => {
        showGridMetrics = !showGridMetrics
        vscode.setState({ ...(vscode.getState() || {}), showGridMetrics })
        updateScreenTools()
        if (activeTab === 'screen') render()
      })

      document.getElementById('toggle-canvas-grid').addEventListener('click', () => {
        showCanvasGrid = !showCanvasGrid
        vscode.setState({ ...(vscode.getState() || {}), showCanvasGrid })
        updateScreenTools()
        document.querySelector('.runtime-preview-frame')
          ?.classList.toggle('show-canvas-grid', showCanvasGrid)
      })

      updateScreenTools()

      vscode.postMessage({ type: 'ready' })

      document.addEventListener('keydown', (event) => {
        console.log('[keydown]', event.key, {
          selectedId,
          activeTab,
          target: event.target?.tagName
        })

        if (activeTab !== 'screen') return

        const tagName = event.target?.tagName?.toLowerCase()
        if (event.target?.isContentEditable || tagName === 'input' || tagName === 'textarea' || tagName === 'select') {
          console.log('[keydown ignored] input area')
          return
        }

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

        if (event.key === 'Delete' || event.key === 'Backspace') {
          console.log('[delete key pressed]', selectedId)

          if (!selectedId) {
            console.log('[delete ignored] no selectedId')
            return
          }

          event.preventDefault()
          event.stopPropagation()

          vscode.postMessage({
            type: 'deleteSelected'
          })
        }
      })

      function render() {
        const content = document.getElementById('content')
        if (!model) {
          unmountPreview()
          content.innerHTML = '<div class="empty">Open a page JSON file.</div>'
          return
        }

        if (activeTab === 'script') {
          unmountPreview()
          content.innerHTML = '<div id="script-editor" class="script-editor" role="application" aria-label="JavaScript editor"></div>'
          mountScriptEditor(model.script?.setup || '')
          return
        }

        disposeScriptEditor()

        if (activeTab === 'dataset') {
          unmountPreview()
          const dataset = getDataset()
          content.innerHTML = '<div class="summary"><b>' + escapeHtml(dataset.name) + '</b><br><span>' + dataset.fields.length + ' fields</span></div>'
          return
        }

        unmountPreview()

        content.innerHTML = '<div class="runtime-preview-frame' + (showCanvasGrid ? ' show-canvas-grid' : '') + '"><div id="quasar-preview"></div></div>' +
          '<div id="form-context-menu" class="form-context-menu hidden" role="menu">' +
            '<button data-form-action="add-row" role="menuitem">Row 추가</button>' +
            '<button data-form-action="add-column" role="menuitem">Column 추가</button>' +
            '<button data-split-cell role="menuitem">셀 나누기...</button>' +
            '<span class="form-context-separator"></span>' +
            '<button data-form-action="delete-row" role="menuitem">Row 삭제</button>' +
            '<button data-form-action="delete-column" role="menuitem">Column 삭제</button>' +
          '</div>' +
          '<div id="form-cell-split-dialog" class="designer-dialog-backdrop hidden">' +
            '<div class="designer-dialog" role="dialog" aria-modal="true" aria-labelledby="split-cell-title">' +
              '<div class="designer-dialog-header">' +
                '<strong id="split-cell-title">셀 나누기</strong>' +
                '<button class="designer-dialog-close" data-split-cancel title="닫기" aria-label="닫기">×</button>' +
              '</div>' +
              '<div class="designer-dialog-body">' +
                '<fieldset class="split-cell-fieldset">' +
                  '<legend>줄/칸 나누기</legend>' +
                  '<label class="split-cell-option"><input type="radio" name="split-direction" data-split-rows checked><span>줄 개수</span><input type="number" data-split-row-count min="1" max="20" value="2"></label>' +
                  '<label class="split-cell-option"><input type="radio" name="split-direction" data-split-columns><span>칸 개수</span><input type="number" data-split-column-count min="1" max="20" value="2" disabled></label>' +
                '</fieldset>' +
              '</div>' +
              '<div class="designer-dialog-actions">' +
                '<button class="primary" data-split-apply>나누기</button>' +
                '<button data-split-cancel>취소</button>' +
              '</div>' +
            '</div>' +
          '</div>'
        mountPreview()

        setupPaletteDrop()
        setupFormContextMenu()
        setupSplitCellDialog()
      }

      function updateScreenTools() {
        const tools = document.getElementById('screen-tools')
        const metricsButton = document.getElementById('toggle-grid-metrics')
        const metricsIcon = metricsButton?.querySelector('.material-icons')
        const metricsLabel = showGridMetrics ? 'Grid col 정보 숨기기' : 'Grid col 정보 표시하기'
        const canvasButton = document.getElementById('toggle-canvas-grid')
        const canvasIcon = canvasButton?.querySelector('.material-icons')
        const canvasLabel = showCanvasGrid ? '화면 격자 숨기기' : '화면 격자 표시하기'

        tools?.classList.toggle('hidden', activeTab !== 'screen')
        metricsButton?.classList.toggle('active', showGridMetrics)
        metricsButton?.setAttribute('aria-pressed', String(showGridMetrics))
        metricsButton?.setAttribute('aria-label', metricsLabel)
        if (metricsButton) metricsButton.title = metricsLabel
        if (metricsIcon) metricsIcon.textContent = showGridMetrics ? 'visibility' : 'visibility_off'

        canvasButton?.classList.toggle('active', showCanvasGrid)
        canvasButton?.setAttribute('aria-pressed', String(showCanvasGrid))
        canvasButton?.setAttribute('aria-label', canvasLabel)
        if (canvasButton) canvasButton.title = canvasLabel
        if (canvasIcon) canvasIcon.textContent = showCanvasGrid ? 'grid_on' : 'grid_off'
      }

      function mountPreview() {
        if (!vueRuntime || !quasarRuntime) {
          document.getElementById('quasar-preview').innerHTML = '<div class="empty">Vue or Quasar runtime could not be loaded.<br>Vue: ' +
            (vueRuntime ? 'loaded' : 'missing') + '<br>Quasar: ' + (quasarRuntime ? 'loaded' : 'missing') + '</div>'
          return
        }

        previewState = vueRuntime.reactive({ model, selectedId, showGrid: true })
        previewApp = vueRuntime.createApp({
          setup() {
            return () => vueRuntime.h(
              resolveQuasarComponent('QLayout'),
              { view: 'hHh Lpr fFf', container: true, class: 'qt-preview-layout' },
              () => vueRuntime.h(
                resolveQuasarComponent('QPageContainer'),
                null,
                () => renderComponents(previewState.model?.components || [], {})
              )
            )
          }
        })
        previewApp.use(quasarRuntime)
        previewApp.mount('#quasar-preview')
      }

      function unmountPreview() {
        if (previewApp) {
          previewApp.unmount()
          previewApp = null
          previewState = null
        }
      }

      async function mountScriptEditor(value) {
        const container = document.getElementById('script-editor')
        const token = ++scriptRenderToken

        try {
          const monaco = await monacoReady
          if (token !== scriptRenderToken || activeTab !== 'script' || !container.isConnected) return

          const pageId = model?.page?.id || 'Page'
          scriptEditorModel = monaco.editor.createModel(
            value,
            'javascript',
            monaco.Uri.parse('file:///.src/pages/' + encodeURIComponent(pageId) + '.js')
          )
          scriptEditor = monaco.editor.create(container, {
            model: scriptEditorModel,
            theme: getMonacoTheme(),
            automaticLayout: true,
            fontFamily: 'var(--vscode-editor-font-family)',
            fontSize: 13,
            lineHeight: 20,
            minimap: { enabled: true },
            scrollBeyondLastLine: false,
            smoothScrolling: true,
            tabSize: 2,
            insertSpaces: true,
            formatOnPaste: true,
            formatOnType: true,
            quickSuggestions: { other: true, comments: false, strings: true },
            suggestOnTriggerCharacters: true,
            parameterHints: { enabled: true },
            bracketPairColorization: { enabled: true },
            guides: { bracketPairs: true, indentation: true },
            wordWrap: 'on',
            renderValidationDecorations: 'on'
          })

          registerScriptEditorShortcuts(monaco)

          scriptEditor.onDidChangeModelContent(() => {
            clearTimeout(scriptSaveTimer)
            scriptSaveTimer = setTimeout(() => {
              vscode.postMessage({ type: 'updateScript', value: scriptEditorModel.getValue() })
            }, 250)
          })

          scriptEditor.focus()
          revealPendingScriptMethod()
        } catch (error) {
          if (container.isConnected) {
            container.innerHTML = '<div class="empty error-text">Script editor failed to load: ' + escapeHtml(error.message) + '</div>'
          }
        }
      }

      function syncScriptEditor(value) {
        if (!scriptEditorModel || scriptEditorModel.getValue() === value) return

        const selections = scriptEditor.getSelections()
        scriptEditorModel.setValue(value)
        if (selections) scriptEditor.setSelections(selections)
      }

      function revealPendingScriptMethod() {
        if (!pendingScriptMethod || !scriptEditor || !scriptEditorModel) return

        const matches = scriptEditorModel.findMatches(
          pendingScriptMethod,
          false,
          false,
          true,
          null,
          false
        )
        const match = matches[0]
        if (!match) return

        scriptEditor.setSelection(match.range)
        scriptEditor.revealLineInCenter(match.range.startLineNumber)
        scriptEditor.focus()
        pendingScriptMethod = ''
      }

      function registerScriptEditorShortcuts(monaco) {
        const ctrlCmd = monaco.KeyMod.CtrlCmd

        scriptEditor.addCommand(ctrlCmd | monaco.KeyCode.KeyC, copyScriptSelection)
        scriptEditor.addCommand(ctrlCmd | monaco.KeyCode.KeyV, pasteIntoScriptEditor)
        scriptEditor.addCommand(ctrlCmd | monaco.KeyCode.KeyZ, () => {
          scriptEditor.trigger('keyboard', 'undo', null)
        })
        scriptEditor.addCommand(ctrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyZ, () => {
          scriptEditor.trigger('keyboard', 'redo', null)
        })
        scriptEditor.addCommand(ctrlCmd | monaco.KeyCode.KeyY, () => {
          scriptEditor.trigger('keyboard', 'redo', null)
        })
      }

      async function copyScriptSelection() {
        const selection = scriptEditor?.getSelection()
        if (!selection || !scriptEditorModel) return

        const text = selection.isEmpty()
          ? scriptEditorModel.getLineContent(selection.startLineNumber) + '\\n'
          : scriptEditorModel.getValueInRange(selection)

        try {
          await navigator.clipboard.writeText(text)
        } catch {
          scriptEditor.trigger('keyboard', 'editor.action.clipboardCopyAction', null)
        }
      }

      async function pasteIntoScriptEditor() {
        const selection = scriptEditor?.getSelection()
        if (!selection || !scriptEditorModel) return

        try {
          const text = await navigator.clipboard.readText()
          scriptEditor.pushUndoStop()
          scriptEditor.executeEdits('clipboard', [{
            range: selection,
            text,
            forceMoveMarkers: true
          }])
          scriptEditor.pushUndoStop()
          scriptEditor.focus()
        } catch {
          scriptEditor.trigger('keyboard', 'editor.action.clipboardPasteAction', null)
        }
      }

      function disposeScriptEditor() {
        scriptRenderToken += 1
        clearTimeout(scriptSaveTimer)
        scriptSaveTimer = null
        scriptEditor?.dispose()
        scriptEditorModel?.dispose()
        scriptEditor = null
        scriptEditorModel = null
      }

      function configureJavaScriptLanguage() {
        const monaco = window.monaco
        const javascript = monaco.languages.typescript.javascriptDefaults

        javascript.setEagerModelSync(true)
        javascript.setDiagnosticsOptions({
          noSemanticValidation: false,
          noSyntaxValidation: false,
          noSuggestionDiagnostics: false
        })
        javascript.setCompilerOptions({
          allowNonTsExtensions: true,
          allowJs: true,
          checkJs: true,
          target: monaco.languages.typescript.ScriptTarget.ES2022,
          module: monaco.languages.typescript.ModuleKind.ESNext,
          moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs
        })
        javascript.addExtraLib(getFrameworkTypeDefinitions(), 'file:///node_modules/@types/quasar-tool/index.d.ts')
      }

      function getFrameworkTypeDefinitions() {
        return [
          "declare module 'vue' {",
          "  export function ref<T>(value: T): { value: T };",
          "  export function reactive<T extends object>(value: T): T;",
          "  export function computed<T>(getter: () => T): { readonly value: T };",
          "  export function watch(source: unknown, callback: (...args: any[]) => void, options?: object): void;",
          "  export function onMounted(callback: () => void): void;",
          "  export function onUnmounted(callback: () => void): void;",
          "  export function nextTick(callback?: () => void): Promise<void>;",
          "}",
          "declare module 'quasar' {",
          "  export interface NotifyOptions { message: string; color?: string; icon?: string; timeout?: number; position?: string; actions?: object[]; }",
          "  export interface QuasarInstance {",
          "    notify(options: string | NotifyOptions): void;",
          "    dialog(options: object): Promise<unknown> | object;",
          "    loading: { show(options?: object): void; hide(): void };",
          "    platform: { is: Record<string, boolean>; has: Record<string, boolean> };",
          "    screen: { width: number; height: number; name: string; lt: Record<string, boolean>; gt: Record<string, boolean> };",
          "  }",
          "  export function useQuasar(): QuasarInstance;",
          "  export const Notify: { create(options: string | NotifyOptions): void };",
          "  export const Dialog: { create(options: object): object };",
          "  export const Loading: { show(options?: object): void; hide(): void };",
          "}",
          "declare const $q: import('quasar').QuasarInstance;"
        ].join('\\n')
      }

      function getMonacoTheme() {
        if (document.body.classList.contains('vscode-high-contrast')) return 'hc-black'
        return document.body.classList.contains('vscode-light') ? 'vs' : 'vs-dark'
      }

      function renderComponents(components, scope) {
        return (components || []).flatMap((component) => renderComponent(component, scope))
      }

      function renderComponent(component, scope) {
        if (component?.repeat?.source) {
          const list = resolveValue(component.repeat.source, scope)
          if (!Array.isArray(list)) return []
          const itemName = component.repeat.itemName || 'item'
          return list.map((item, index) => {
            const nextScope = { ...scope, [itemName]: item, $index: index }
            const cloned = { ...component, repeat: undefined }
            return renderSingleComponent(cloned, nextScope, index)
          })
        }

        return renderSingleComponent(component, scope)
      }

      function renderSingleComponent(component, scope, repeatIndex) {
        const isHtml = component.type === 'HtmlElement'
        const tag = isHtml ? component.tag || 'div' : resolveQuasarComponent(component.type)
        const resizeKind = getFormResizeKind(component)
        const gridMetric = getFormGridMetric(component)
        const props = buildProps(component, repeatIndex, scope, resizeKind, gridMetric)

        let children = buildChildren(component, scope, isHtml)
        const metricBadge = buildFormGridMetricBadge(gridMetric)
        const resizeHandle = buildFormResizeHandle(component, resizeKind)

        children = appendPreviewChild(children, metricBadge)
        children = appendPreviewChild(children, resizeHandle)

        return vueRuntime.h(tag, props, children)
      }

      function appendPreviewChild(children, child) {
        if (!child) return children
        if (Array.isArray(children)) return [...children, child]
        return children === undefined ? [child] : [children, child]
      }

      function buildProps(component, repeatIndex, scope, resizeKind, gridMetric) {
        const props = { ...(component.props || {}) }
        const classNames = []

        if (component.style !== undefined) {
          props.style = component.style
        }

        Object.entries(component.dynamicProps || {}).forEach(([name, expression]) => {
          props[name] = resolveValue(expression, scope)
        })

        Object.entries(component.models || {}).forEach(([name, expression]) => {
          props[name] = resolveValue(expression, scope)
          const updateName = name === 'modelValue'
            ? 'onUpdate:modelValue'
            : 'onUpdate:' + name
          props[updateName] = (value) => setResolvedValue(expression, value, scope)
        })

        const isHtml = component.type === 'HtmlElement'
        const componentChildren = Array.isArray(component.children) ? component.children : []
        const isDirectEditableText = isHtml &&
          component.text !== undefined &&
          !component.textBinding &&
          componentChildren.length === 0

        if (component.class) classNames.push(component.class)

        if (isHtml) { classNames.push('qt-html-element') }

        if (isDirectEditableText) { classNames.push('qt-direct-text') }

        if (resizeKind) { classNames.push('qt-layout-resizable') }

        if (gridMetric) { classNames.push('qt-grid-metric-host') }

        if (component.id === selectedId) { classNames.push('qt-selected') }

        props.class = classNames
        props.key = repeatIndex === undefined
          ? component.id || component.type
          : (component.id || component.type) + '-' + repeatIndex

        props['data-qt-id'] = component.id || ''
        props.draggable = !isDirectEditableText
        props.tabindex = 0

        if (isDirectEditableText) {
          props.contenteditable = 'true'
          props.spellcheck = 'false'
        }

        props.onClick = (event) => {
          event.stopPropagation()
          console.log('[component click]', component.id)
          event.currentTarget.focus()
          if (component.id !== selectedId) {
            vscode.postMessage({ type: 'select', id: component.id })
          }
        }

        props.onDblclick = (event) => {
          event.preventDefault()
          event.stopPropagation()

          if (isDirectEditableText) {
            event.currentTarget.focus()
            return
          }

          vscode.postMessage({ type: 'openFirstEventMethod', id: component.id })
        }

        if (isDirectEditableText) {
          props.onBlur = (event) => {
            const value = event.currentTarget.textContent || ''
            if (value === String(component.text ?? '')) return
            vscode.postMessage({
              type: 'updateComponentText',
              id: component.id,
              value
            })
          }

          props.onKeydown = (event) => {
            event.stopPropagation()

            if (event.key === 'Enter') {
              event.preventDefault()
              event.currentTarget.blur()
            } else if (event.key === 'Escape') {
              event.preventDefault()
              event.currentTarget.textContent = String(component.text ?? '')
              event.currentTarget.blur()
            }
          }
        }

        props.onContextmenu = (event) => {
          const layoutContext = getFormLayoutContext(component.id)
          if (!layoutContext.rowId && !layoutContext.columnId) return

          event.preventDefault()
          event.stopPropagation()
          showFormContextMenu(event.clientX, event.clientY, layoutContext)
        }

        props.onDragstart = (event) => {
          event.stopPropagation()
          event.dataTransfer.setData('text/plain', component.id)
          vscode.postMessage({ type: 'select', id: component.id })
        }

        props.onDragover = (event) => {
          const paletteIndex = getPaletteDragIndex(event.dataTransfer)
          const targetCellId = getFormGridDropCellId(component.id)

          if (isPaletteDrag(event.dataTransfer) && targetCellId) {
            event.preventDefault()
            event.stopPropagation()
            event.dataTransfer.dropEffect = 'copy'
            setPaletteDropTarget(targetCellId)
            return
          }

          event.preventDefault()
          event.stopPropagation()
        }

        props.onDragleave = (event) => {
          if (!getFormGridDropCellId(component.id)) return
          const nextTarget = event.relatedTarget
          if (nextTarget && event.currentTarget.contains(nextTarget)) return
          clearPaletteDropTarget()
        }

        props.onDrop = (event) => {
          event.preventDefault()
          event.stopPropagation()

          const paletteIndex = getPaletteDragIndex(event.dataTransfer)
          const targetCellId = getFormGridDropCellId(component.id)

          if (paletteIndex >= 0) {
            clearPaletteDropTarget()
            if (!targetCellId) return

            vscode.postMessage({
              type: 'dropPaletteComponent',
              index: paletteIndex,
              targetId: targetCellId
            })

            return
          }

          const dragId = event.dataTransfer.getData('text/plain')
          const dropId = component.id

          if (!dragId || !dropId || dragId === dropId) return

          vscode.postMessage({
            type: 'moveComponent',
            dragId,
            dropId,
            mode: 'inside'
          })
        }

        if (component.label && !props.label) {
          props.label = component.label
        }

        return props
      }

      function getFormGridMetric(component) {
        if (!showGridMetrics) return null
        if (component?.type !== 'HtmlElement') return null

        const path = findComponentPath(model?.components || [], component.id)
        if (!path.some((item) => item?.designer?.template === 'courseSearchForm')) {
          return null
        }

        if (isInspectableGridRow(component)) {
          const total = (component.children || [])
            .reduce((sum, child) => sum + getNumericColumnValue(child), 0)
          return {
            kind: 'row',
            label: 'col-' + total,
            title: 'Row column total: ' + total + ' / 12',
            status: total === 12 ? 'valid' : total > 12 ? 'over' : 'under'
          }
        }

        const parent = path[path.length - 2]
        const columnClass = getNumericColumnClass(component)
        if (columnClass && isInspectableGridRow(parent)) {
          return {
            kind: 'cell',
            label: columnClass,
            title: 'Cell width: ' + columnClass,
            status: 'cell'
          }
        }

        return null
      }

      function buildFormGridMetricBadge(metric) {
        if (!metric) return null

        return vueRuntime.h('span', {
          class: [
            'qt-grid-metric-badge',
            'qt-grid-metric-' + metric.kind,
            'qt-grid-metric-' + metric.status
          ],
          title: metric.title,
          'aria-hidden': 'true'
        }, metric.label)
      }

      function isInspectableGridRow(component) {
        const children = component?.children || []
        return isLayoutRow(component) &&
          children.length > 0 &&
          children.every((child) => getNumericColumnValue(child) > 0)
      }

      function getNumericColumnClass(component) {
        return getComponentClassTokens(component)
          .find((token) => /^col-(?:[1-9]|1[0-2])$/.test(token)) || ''
      }

      function getNumericColumnValue(component) {
        const columnClass = getNumericColumnClass(component)
        return columnClass ? Number(columnClass.slice(4)) : 0
      }

      function getFormResizeKind(component) {
        if (component?.type !== 'HtmlElement' || !selectedId) return ''

        const selectedPath = findComponentPath(model?.components || [], selectedId)
        const isFormSearchComponent = selectedPath.some((item) =>
          item?.designer?.template === 'courseSearchForm'
        )
        if (!isFormSearchComponent) return ''

        const selectedColumn = [...selectedPath].reverse().find(isLayoutColumn)
        const selectedRow = [...selectedPath].reverse().find(isFormGridRow)

        if (selectedColumn?.id === component.id) return 'column'
        if (selectedRow?.id === component.id) return 'row'

        if (component.id === selectedId && isLayoutColumn(component)) return 'column'
        if (component.id === selectedId && isLayoutRow(component)) return 'row'
        return ''
      }

      function buildFormResizeHandle(component, resizeKind) {
        if (!resizeKind) return null

        return vueRuntime.h('span', {
          class: 'qt-resize-handle qt-resize-handle-' + resizeKind,
          title: resizeKind === 'row' ? 'Resize row height' : 'Resize column width',
          draggable: false,
          onClick: (event) => {
            event.preventDefault()
            event.stopPropagation()
          },
          onPointerdown: (event) => startFormLayoutResize(
            event,
            component.id,
            resizeKind
          )
        })
      }

      function startFormLayoutResize(event, componentId, resizeKind) {
        if (event.button !== 0) return

        event.preventDefault()
        event.stopPropagation()

        const handle = event.currentTarget
        const element = handle.parentElement
        if (!element) return

        const startRect = element.getBoundingClientRect()
        const parentWidth = element.parentElement?.getBoundingClientRect().width || startRect.width
        const startX = event.clientX
        const startY = event.clientY
        let nextValue = resizeKind === 'row' ? startRect.height : 100

        document.body.classList.add('qt-layout-resizing')
        document.body.dataset.resizeKind = resizeKind
        handle.setPointerCapture?.(event.pointerId)

        const move = (moveEvent) => {
          moveEvent.preventDefault()

          if (resizeKind === 'row') {
            nextValue = Math.max(24, Math.round(startRect.height + moveEvent.clientY - startY))
            element.style.height = nextValue + 'px'
            return
          }

          const width = Math.max(24, startRect.width + moveEvent.clientX - startX)
          nextValue = Math.max(2, Math.min(100, width / parentWidth * 100))
          const percent = Math.round(nextValue * 100) / 100 + '%'
          element.style.flex = '0 0 ' + percent
          element.style.width = percent
          element.style.maxWidth = percent
        }

        const finish = (finishEvent) => {
          finishEvent?.preventDefault()
          window.removeEventListener('pointermove', move)
          window.removeEventListener('pointerup', finish)
          window.removeEventListener('pointercancel', cancel)
          document.body.classList.remove('qt-layout-resizing')
          delete document.body.dataset.resizeKind

          vscode.postMessage({
            type: 'resizeFormLayout',
            id: componentId,
            resizeKind,
            value: nextValue
          })
        }

        const cancel = () => {
          window.removeEventListener('pointermove', move)
          window.removeEventListener('pointerup', finish)
          window.removeEventListener('pointercancel', cancel)
          document.body.classList.remove('qt-layout-resizing')
          delete document.body.dataset.resizeKind
          render()
        }

        window.addEventListener('pointermove', move, { passive: false })
        window.addEventListener('pointerup', finish, { once: true })
        window.addEventListener('pointercancel', cancel, { once: true })
      }

      function buildChildren(component, scope, isHtml) {
        const children = Array.isArray(component.children) ? component.children : []

        if (children.length > 0) {
          const renderedChildren = renderComponents(children, scope)
          const leadingText = component.textBinding
            ? String(resolveValue(component.textBinding, scope) ?? '')
            : component.text
          const content = leadingText === undefined
            ? renderedChildren
            : [String(leadingText), ...renderedChildren]
          // div, section 같은 HTML 태그는 배열 children 사용
          if (isHtml) {
            return content
          }

          // QCard, QPage, QCardSection 같은 Quasar 컴포넌트는 slot 함수 사용
          return () => content
        }

        if (component.textBinding) {
          return String(resolveValue(component.textBinding, scope) ?? '')
        }

        if (component.text !== undefined) {
          return String(component.text)
        }

        return undefined
      }

      function resolveQuasarComponent(type) {
        return quasarRuntime[type] || type
      }

      function resolveValue(path, scope) {
        const roots = { ...(previewState?.model?.data || model?.data || {}), ...scope }
        return String(path || '').split('.').reduce((value, key) => {
          if (value === undefined || value === null || key === '') return value
          return value[key]
        }, roots)
      }

      function setResolvedValue(path, nextValue, scope) {
        const keys = String(path || '').split('.').filter(Boolean)
        if (!keys.length) return

        const data = previewState?.model?.data || model?.data || {}
        const roots = { ...data, ...scope }
        let target = roots[keys.shift()]

        while (keys.length > 1 && target) {
          target = target[keys.shift()]
        }

        if (target && keys.length === 1) {
          target[keys[0]] = nextValue
        }
      }

      function getFormLayoutContext(componentId) {
        const path = findComponentPath(model?.components || [], componentId)
        if (!path.length) return { rowId: '', columnId: '', splitCellId: '' }

        const selectedComponent = path[path.length - 1]
        const splitCell = isFormGridRow(selectedComponent)
          ? null
          : [...path].reverse().find(isLayoutColumn)
        const form = path.find((component) => component?.designer?.template === 'courseSearchForm')
        const layoutContainer = form || [...path].reverse().find((component) =>
          component?.type === 'QCard' || component?.type === 'QCardSection'
        )
        let row = [...path].reverse().find(isLayoutRow)
        let column = [...path].reverse().find(isLayoutColumn)

        if (layoutContainer) {
          row ||= findFirstLayoutComponent(layoutContainer, isLayoutRow)
          column ||= row ? findFirstLayoutComponent(row, isLayoutColumn) : null
        }

        if (row && !column) {
          column = findFirstLayoutComponent(row, isLayoutColumn)
        }

        return {
          rowId: row?.id || '',
          columnId: column?.id || '',
          splitCellId: splitCell?.id || ''
        }
      }

      function getFormGridDropCellId(componentId) {
        const path = findComponentPath(model?.components || [], componentId)
        if (!path.some((component) => component?.designer?.template === 'courseSearchForm')) {
          return ''
        }

        const cell = [...path].reverse().find(isLayoutColumn)
        return cell?.id || ''
      }

      function getPaletteDragIndex(dataTransfer) {
        if (!dataTransfer) return -1

        const typedValue = dataTransfer.getData('application/quasar-palette-index')
        const textValue = dataTransfer.getData('text/plain') || ''
        const rawValue = typedValue || (textValue.startsWith('palette:')
          ? textValue.slice('palette:'.length)
          : '')
        if (rawValue === '') return -1

        const index = Number(rawValue)
        return Number.isInteger(index) ? index : -1
      }

      function isPaletteDrag(dataTransfer) {
        if (!dataTransfer) return false
        const types = Array.from(dataTransfer.types || [])
        return types.includes('application/quasar-palette-index') ||
          (dataTransfer.getData('text/plain') || '').startsWith('palette:')
      }

      function setPaletteDropTarget(componentId) {
        document.querySelectorAll('.qt-palette-drop-target').forEach((element) => {
          if (element.dataset.qtId !== componentId) {
            element.classList.remove('qt-palette-drop-target')
          }
        })

        document.querySelectorAll('[data-qt-id]').forEach((element) => {
          if (element.dataset.qtId === componentId) {
            element.classList.add('qt-palette-drop-target')
          }
        })
      }

      function clearPaletteDropTarget() {
        document.querySelectorAll('.qt-palette-drop-target').forEach((element) => {
          element.classList.remove('qt-palette-drop-target')
        })
      }

      function findComponentPath(components, id, ancestors = []) {
        for (const component of components || []) {
          const path = [...ancestors, component]
          if (component.id === id) return path
          const childPath = findComponentPath(component.children, id, path)
          if (childPath.length) return childPath
        }
        return []
      }

      function findFirstLayoutComponent(component, predicate) {
        if (!component) return null
        if (predicate(component)) return component
        for (const child of component.children || []) {
          const found = findFirstLayoutComponent(child, predicate)
          if (found) return found
        }
        return null
      }

      function isLayoutRow(component) {
        return component?.type === 'HtmlElement' && getComponentClassTokens(component).includes('row')
      }

      function isLayoutColumn(component) {
        return component?.type === 'HtmlElement' && (
          component?.designer?.role === 'splitCell' ||
          getComponentClassTokens(component)
            .some((token) => token === 'col' || token.startsWith('col-'))
        )
      }

      function isFormGridRow(component) {
        return !component?.designer?.splitCell &&
          isLayoutRow(component) &&
          (component.children || []).some(isLayoutColumn)
      }

      function getComponentClassTokens(component) {
        return String(component?.class || component?.props?.class || '')
          .split(/\\s+/)
          .filter(Boolean)
      }

      function setupFormContextMenu() {
        const menu = document.getElementById('form-context-menu')
        if (!menu) return

        menu.querySelectorAll('[data-form-action]').forEach((button) => {
          button.addEventListener('click', (event) => {
            event.stopPropagation()
            if (button.disabled) return

            const action = button.dataset.formAction
            const targetId = action.includes('column')
              ? menu.dataset.columnId
              : menu.dataset.rowId

            hideFormContextMenu()
            vscode.postMessage({ type: 'formLayoutAction', action, targetId })
          })
        })

        menu.querySelector('[data-split-cell]')?.addEventListener('click', (event) => {
          event.stopPropagation()
          const targetId = menu.dataset.splitCellId
          if (!targetId || event.currentTarget.disabled) return

          hideFormContextMenu()
          showSplitCellDialog(targetId)
        })
      }

      function showFormContextMenu(clientX, clientY, layoutContext) {
        const menu = document.getElementById('form-context-menu')
        if (!menu) return

        menu.dataset.rowId = layoutContext.rowId || ''
        menu.dataset.columnId = layoutContext.columnId || ''
        menu.dataset.splitCellId = layoutContext.splitCellId || ''
        menu.querySelectorAll('[data-form-action]').forEach((button) => {
          button.disabled = button.dataset.formAction.includes('column')
            ? !layoutContext.columnId
            : !layoutContext.rowId
        })
        const splitCellButton = menu.querySelector('[data-split-cell]')
        if (splitCellButton) splitCellButton.disabled = !layoutContext.splitCellId

        menu.classList.remove('hidden')
        const bounds = menu.getBoundingClientRect()
        menu.style.left = Math.max(4, Math.min(clientX, window.innerWidth - bounds.width - 4)) + 'px'
        menu.style.top = Math.max(4, Math.min(clientY, window.innerHeight - bounds.height - 4)) + 'px'
      }

      function hideFormContextMenu() {
        document.getElementById('form-context-menu')?.classList.add('hidden')
      }

      function setupSplitCellDialog() {
        const dialog = document.getElementById('form-cell-split-dialog')
        if (!dialog) return

        const rowsEnabled = dialog.querySelector('[data-split-rows]')
        const columnsEnabled = dialog.querySelector('[data-split-columns]')
        const rowCount = dialog.querySelector('[data-split-row-count]')
        const columnCount = dialog.querySelector('[data-split-column-count]')

        rowsEnabled.addEventListener('change', () => {
          rowCount.disabled = !rowsEnabled.checked
          columnCount.disabled = rowsEnabled.checked
        })
        columnsEnabled.addEventListener('change', () => {
          columnCount.disabled = !columnsEnabled.checked
          rowCount.disabled = columnsEnabled.checked
        })

        dialog.querySelectorAll('[data-split-cancel]').forEach((button) => {
          button.addEventListener('click', hideSplitCellDialog)
        })

        dialog.addEventListener('click', (event) => {
          if (event.target === dialog) hideSplitCellDialog()
        })

        dialog.querySelector('[data-split-apply]').addEventListener('click', () => {
          if (!rowsEnabled.checked && !columnsEnabled.checked) return

          vscode.postMessage({
            type: 'splitFormCell',
            targetId: dialog.dataset.targetId,
            rowsEnabled: rowsEnabled.checked,
            rowCount: clampSplitCount(rowCount.value),
            columnsEnabled: columnsEnabled.checked,
            columnCount: clampSplitCount(columnCount.value)
          })
          hideSplitCellDialog()
        })
      }

      function showSplitCellDialog(targetId) {
        const dialog = document.getElementById('form-cell-split-dialog')
        if (!dialog) return

        dialog.dataset.targetId = targetId
        dialog.querySelector('[data-split-rows]').checked = true
        dialog.querySelector('[data-split-row-count]').value = '2'
        dialog.querySelector('[data-split-row-count]').disabled = false
        dialog.querySelector('[data-split-columns]').checked = false
        dialog.querySelector('[data-split-column-count]').value = '2'
        dialog.querySelector('[data-split-column-count]').disabled = true
        dialog.classList.remove('hidden')
        dialog.querySelector('[data-split-row-count]').focus()
        dialog.querySelector('[data-split-row-count]').select()
      }

      function hideSplitCellDialog() {
        document.getElementById('form-cell-split-dialog')?.classList.add('hidden')
      }

      function clampSplitCount(value) {
        return Math.max(1, Math.min(20, Math.round(Number(value) || 1)))
      }

      function getDataset() {
        return model.datasets?.[0] || { name: 'defaultDataset', fields: [] }
      }

      function setupPaletteDrop() {
        const frame = document.querySelector('.runtime-preview-frame')
        if (!frame) return

        frame.addEventListener('dragover', (event) => {
          if (!isPaletteDrag(event.dataTransfer)) return
          event.preventDefault()
          event.dataTransfer.dropEffect = 'copy'
        })

        frame.addEventListener('drop', (event) => {
          if (!isPaletteDrag(event.dataTransfer)) return

          event.preventDefault()
          event.stopPropagation()
          clearPaletteDropTarget()
        })
      }      

      document.addEventListener('pointerdown', (event) => {
        if (!event.target.closest?.('#form-context-menu')) hideFormContextMenu()
      })
      window.addEventListener('blur', hideFormContextMenu)
    </script>
  `,
  );
}

/* 팔렛트 패널 */
function getDatasetHtml(webview) {
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

function htmlShell(webview, nonce, title, body) {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} data:; font-src ${webview.cspSource}; style-src ${webview.cspSource} 'unsafe-inline'; script-src ${webview.cspSource} 'nonce-${nonce}'; worker-src ${webview.cspSource} blob: data:;">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; color: var(--vscode-editor-foreground); background: var(--vscode-editor-background); font-family: var(--vscode-font-family); font-size: var(--vscode-font-size); }
    button, input, select, textarea { font: inherit; }
    button { cursor: pointer; }
    .tabs { display: flex; gap: 2px; padding: 8px 10px 0; border-bottom: 1px solid var(--vscode-panel-border); background: var(--vscode-sideBar-background); }
    .tab { padding: 8px 14px; border: 1px solid transparent; border-bottom: 0; color: var(--vscode-descriptionForeground); background: transparent; }
    .tab.active { color: var(--vscode-editor-foreground); border-color: var(--vscode-panel-border); background: var(--vscode-editor-background); }
    .screen-tools { display: flex; gap: 2px; margin-left: auto; padding: 2px 2px 5px; align-items: center; }
    .screen-tool-button { display: inline-flex; flex: 0 0 28px; width: 28px; height: 28px; padding: 0; align-items: center; justify-content: center; border: 1px solid transparent; border-radius: 3px; color: var(--vscode-icon-foreground); background: transparent; }
    .screen-tool-button:hover { background: var(--vscode-toolbar-hoverBackground); }
    .screen-tool-button.active { color: var(--vscode-focusBorder); border-color: var(--vscode-focusBorder); background: var(--vscode-list-activeSelectionBackground); }
    .screen-tool-button .material-icons { font-size: 18px; line-height: 18px; }
    #content { min-height: calc(100vh - 42px); }
    .runtime-preview-frame { min-height: calc(100vh - 42px); overflow: auto; color: #000; background-color: #fafafa; }
    .runtime-preview-frame.show-canvas-grid { background-image: linear-gradient(rgba(0,0,0,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.06) 1px, transparent 1px); background-size: 20px 20px, 20px 20px; }
    #quasar-preview { position: relative;  z-index: 1;  min-height: calc(100vh - 42px);  color: #000;  background: transparent;  font-family: Roboto, Arial, sans-serif;  font-size: 14px;  line-height: 1.5;    }    .qt-preview-layout { min-height: calc(100vh - 42px); }
    #quasar-preview .q-layout,
    #quasar-preview .q-page-container,
    #quasar-preview .q-page { min-height: calc(100vh - 42px); }
    .qt-selected { box-shadow: 0 0 0 2px rgba(25, 118, 210, 0.85) !important; }
    .script-editor { width: 100%; height: calc(100vh - 42px); overflow: hidden; }
    .error-text { color: var(--vscode-errorForeground); }
    .summary, .empty, .view-body { padding: 12px; }
    .list-item, .tree-row { display: grid; gap: 2px; width: 100%; padding: 9px 8px; border: 0; border-bottom: 1px solid var(--vscode-panel-border); color: var(--vscode-editor-foreground); background: transparent; text-align: left; }
    .list-item:hover, .tree-row:hover { background: var(--vscode-list-hoverBackground); }
    .tree-row.selected { border-color: var(--vscode-focusBorder); outline: 1px solid var(--vscode-focusBorder); }
    .muted, .list-item span, .tree-row span { color: var(--vscode-descriptionForeground); font-size: 12px; }
    .field { display: grid; gap: 4px; margin-bottom: 10px; }
    .field span { color: var(--vscode-descriptionForeground); font-size: 12px; }
    input, select { width: 100%; min-height: 28px; padding: 4px 6px; border: 1px solid var(--vscode-panel-border); color: var(--vscode-editor-foreground); background: var(--vscode-input-background); }
    .primary { margin: 8px; padding: 6px 10px; border: 0; color: var(--vscode-button-foreground); background: var(--vscode-button-background); }
    .danger { margin-top: 6px; padding: 5px 8px; border: 1px solid var(--vscode-errorForeground); color: var(--vscode-errorForeground); background: transparent; }
    .dataset-row { display: grid; gap: 6px; padding: 8px; border-bottom: 1px solid var(--vscode-panel-border); }
    .check { display: flex; gap: 6px; align-items: center; color: var(--vscode-descriptionForeground); }
    .check input { width: auto; min-height: auto; }
    .qt-html-element {outline: 1px dashed #bdbdbd; outline-offset: -1px; }
    .qt-html-element:hover { outline: 1px dashed #757575; }
    .qt-html-element.qt-selected { outline: 2px solid #1976d2; outline-offset: -2px; box-shadow: 0 0 0 2px rgba(25, 118, 210, 0.2) !important; }
    .qt-palette-drop-target { outline: 3px solid #21a366 !important; outline-offset: -3px !important; background-color: rgba(33, 163, 102, 0.1) !important; }
    .qt-direct-text { cursor: text; }
    .qt-direct-text[contenteditable="true"]:focus { outline: 2px solid #1976d2; outline-offset: 1px; }
    .qt-layout-resizable { position: relative !important; }
    .qt-resize-handle { position: absolute; z-index: 120; display: block; touch-action: none; user-select: none; }
    .qt-resize-handle::after { content: ''; position: absolute; border-radius: 1px; background: #1976d2; opacity: 0.85; }
    .qt-resize-handle-row { right: 8px; bottom: -5px; left: 8px; height: 10px; cursor: ns-resize; }
    .qt-resize-handle-row::after { right: 0; bottom: 4px; left: 0; height: 2px; }
    .qt-resize-handle-column { top: 8px; right: -5px; bottom: 8px; width: 10px; cursor: ew-resize; }
    .qt-resize-handle-column::after { top: 0; right: 4px; bottom: 0; width: 2px; }
    body.qt-layout-resizing, body.qt-layout-resizing * { user-select: none !important; }
    body.qt-layout-resizing[data-resize-kind="row"], body.qt-layout-resizing[data-resize-kind="row"] * { cursor: ns-resize !important; }
    body.qt-layout-resizing[data-resize-kind="column"], body.qt-layout-resizing[data-resize-kind="column"] * { cursor: ew-resize !important; }
    .qt-grid-metric-host { position: relative !important; overflow: visible !important; }
    .qt-grid-metric-badge { position: absolute; z-index: 115; display: inline-flex; width: auto; height: 20px; padding: 1px 4px; align-items: center; justify-content: center; border: 1px solid; border-radius: 3px; font-family: var(--vscode-editor-font-family, monospace); font-size: 10px; font-weight: 600; line-height: 16px; white-space: nowrap; opacity: 0.6; pointer-events: none; user-select: none; }
    .qt-grid-metric-cell { top: 2px; right: 2px; color: #7a3215; border-color: rgba(239, 108, 53, 0.5); background: rgba(255, 224, 204, 0.44); }
    .qt-grid-metric-row { top: 2px; left: 2px; }
    .qt-grid-metric-valid { color: #174f52; border-color: rgba(79, 164, 168, 0.5); background: rgba(216, 241, 242, 0.44); }
    .qt-grid-metric-under { color: #6a4c00; border-color: rgba(214, 165, 0, 0.5); background: rgba(255, 241, 189, 0.44); }
    .qt-grid-metric-over { color: #7a1f26; border-color: rgba(209, 77, 87, 0.5); background: rgba(255, 217, 221, 0.44); }
    .tree-main { display: flex; align-items: center; gap: 4px; }
    .tree-root { padding: 4px 0; overflow: hidden; }
    .tree-node { position: relative; }
    .tree-children { position: relative; margin-left: 14px; padding-left: 12px; border-left: 1px solid var(--vscode-tree-indentGuidesStroke, var(--vscode-panel-border)); }
    .tree-children > .tree-node::before { content: ""; position: absolute; z-index: 1; left: -12px; top: 14px; width: 12px; border-top: 1px solid var(--vscode-tree-indentGuidesStroke, var(--vscode-panel-border)); }
    .tree-children > .tree-node:last-child::after { content: ""; position: absolute; z-index: 1; left: -13px; top: 15px; bottom: 0; width: 2px; background: var(--vscode-editor-background); }
    .tree-row { position: relative; z-index: 2; min-height: 30px; padding: 5px 8px 5px 2px; }
    .tree-toggle, .tree-toggle-spacer { display: inline-flex; flex: 0 0 16px; width: 16px; height: 16px; align-items: center; justify-content: center; }
    .tree-toggle { position: relative; padding: 0; border: 0; color: var(--vscode-icon-foreground); background: transparent; }
    .tree-toggle::before { content: ""; width: 5px; height: 5px; border-right: 1.5px solid currentColor; border-bottom: 1.5px solid currentColor; transform-origin: center; }
    .tree-toggle.expanded::before { transform: translateY(-1px) rotate(45deg); }
    .tree-toggle.collapsed::before { transform: translateX(-1px) rotate(-45deg); }
    .tree-toggle:hover { color: var(--vscode-foreground); background: var(--vscode-toolbar-hoverBackground); }
    .tree-tag { color: var(--vscode-editor-foreground); font-weight: 800; }
    .tree-id { color: #8a8a8a;  font-size: 12px; }
    .tree-row.selected .tree-id { color: #b0bec5; }
    .tree-row.selected .tree-tag { color: var(--vscode-editor-foreground); }
    .palette-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(52px, 1fr)); gap: 8px; padding: 10px; }
    .palette-item { min-height: 74px; padding: 8px 4px; border: 1px solid var(--vscode-panel-border); border-radius: 6px; color: var(--vscode-editor-foreground); background: var(--vscode-sideBar-background); text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; }
    .palette-item:hover { background: var(--vscode-list-hoverBackground); border-color: var(--vscode-focusBorder); }
    .palette-icon { font-size: 18px; line-height: 18px; margin-bottom: 4px; }
    .palette-label { font-size: 11px; font-weight: 600; line-height: 14px; }
    
    .view-body { --label-width: 90px; }
    .prop-field { display: grid; grid-template-columns: var(--label-width) 6px 1fr; margin-bottom: 6px; border: 1px solid var(--vscode-panel-border); border-radius: 4px; overflow: hidden; }
    .prop-label { display: flex; align-items: center; padding: 0 8px; min-height: 28px; color: var(--vscode-descriptionForeground); background: var(--vscode-sideBar-background); border-right: 1px solid var(--vscode-panel-border); font-size: 12px; white-space: nowrap; }
    .prop-input { width: 100%; min-height: 28px; padding: 4px 6px; border: 0; color: var(--vscode-editor-foreground); background: var(--vscode-input-background); }
    .prop-input:focus { outline: 1px solid var(--vscode-focusBorder); outline-offset: -1px; }
    
    .prop-splitter { cursor: col-resize; background: var(--vscode-panel-border); }
    .prop-splitter:hover { background: var(--vscode-focusBorder); }

    .prop-input-wrap { display: flex; width: 100%; min-width: 0; }
    .prop-input-wrap .prop-input { flex: 1; min-width: 0; }
    .prop-button { width: 32px; min-width: 32px; min-height: 28px; border: 0; cursor: pointer; background: var(--vscode-button-background); color: var(--vscode-button-foreground); }
    .prop-button:hover { background: var(--vscode-button-hoverBackground); }

    .event-section {border: 1px solid var(--vscode-panel-border); border-radius: 6px; overflow: hidden; }
    .event-section-title {padding: 7px 8px; font-weight: 700; font-size: 12px; background: var(--vscode-sideBar-background); border-bottom: 1px solid var(--vscode-panel-border); }
    .event-field {display: grid; grid-template-columns: 130px 1fr; border-bottom: 1px solid var(--vscode-panel-border); }
    .event-field:last-child {border-bottom: 0; }
    .event-label {padding: 6px 8px; font-size: 12px; color: var(--vscode-descriptionForeground); background: var(--vscode-sideBar-background); border-right: 1px solid var(--vscode-panel-border); }
    .event-input-wrap { display: flex; min-width: 0; }
    .event-input { flex: 1; min-width: 0; min-height: 28px; padding: 4px 6px; border: 0; color: var(--vscode-editor-foreground); background: var(--vscode-input-background); }
    .event-method-button { width: 34px; min-width: 34px; border: 0; border-left: 1px solid var(--vscode-panel-border); color: var(--vscode-button-foreground); background: var(--vscode-button-background); font-weight: 700; }
    .event-method-button:hover { background: var(--vscode-button-hoverBackground); }

    .form-context-menu { position: fixed; z-index: 10000; display: grid; min-width: 168px; padding: 4px; border: 1px solid var(--vscode-menu-border, var(--vscode-panel-border)); border-radius: 4px; color: var(--vscode-menu-foreground, var(--vscode-editor-foreground)); background: var(--vscode-menu-background, var(--vscode-editorWidget-background)); box-shadow: 0 6px 18px rgba(0, 0, 0, 0.35); }
    .form-context-menu button { min-height: 26px; padding: 4px 10px; border: 0; border-radius: 2px; color: inherit; background: transparent; text-align: left; }
    .form-context-menu button:hover:not(:disabled) { color: var(--vscode-menu-selectionForeground, var(--vscode-list-activeSelectionForeground)); background: var(--vscode-menu-selectionBackground, var(--vscode-list-activeSelectionBackground)); }
    .form-context-menu button:disabled { opacity: 0.45; cursor: default; }
    .form-context-separator { height: 1px; margin: 4px 6px; background: var(--vscode-menu-separatorBackground, var(--vscode-panel-border)); }
    .designer-dialog-backdrop { position: fixed; inset: 0; z-index: 10020; display: flex; align-items: center; justify-content: center; padding: 16px; background: rgba(0, 0, 0, 0.48); }
    .designer-dialog { width: min(360px, calc(100vw - 32px)); border: 1px solid var(--vscode-panel-border); border-radius: 6px; color: var(--vscode-editor-foreground); background: var(--vscode-editorWidget-background); box-shadow: 0 12px 32px rgba(0, 0, 0, 0.45); overflow: hidden; }
    .designer-dialog-header { display: flex; min-height: 36px; padding: 7px 8px 7px 12px; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--vscode-panel-border); background: var(--vscode-titleBar-activeBackground); }
    .designer-dialog-close { width: 26px; height: 24px; padding: 0; border: 0; color: var(--vscode-icon-foreground); background: transparent; font-size: 18px; line-height: 20px; }
    .designer-dialog-close:hover { background: var(--vscode-toolbar-hoverBackground); }
    .designer-dialog-body { display: grid; gap: 12px; padding: 12px; }
    .split-cell-fieldset { display: grid; gap: 8px; margin: 0; padding: 10px; border: 1px solid var(--vscode-panel-border); border-radius: 5px; }
    .split-cell-fieldset legend { padding: 0 5px; color: var(--vscode-descriptionForeground); font-weight: 700; font-size: 12px; }
    .split-cell-option { display: grid; grid-template-columns: 18px 72px 1fr; gap: 8px; align-items: center; }
    .split-cell-option input[type="radio"] { width: auto; min-height: auto; margin: 0; }
    .split-cell-option input[type="number"] { min-width: 0; }
    .designer-dialog-actions { display: flex; justify-content: flex-end; gap: 8px; padding: 10px 12px; border-top: 1px solid var(--vscode-panel-border); }
    .designer-dialog-actions button { min-width: 76px; min-height: 28px; padding: 4px 10px; border: 1px solid var(--vscode-panel-border); border-radius: 3px; color: var(--vscode-button-secondaryForeground); background: var(--vscode-button-secondaryBackground); }
    .designer-dialog-actions button.primary { margin: 0; border-color: var(--vscode-button-background); color: var(--vscode-button-foreground); background: var(--vscode-button-background); }

    .hidden { display: none !important; }
    .tree-row {user-select: none; }
    .tree-row.dragging { opacity: 0.45; }
    .tree-row.drag-over {outline: 2px dashed var(--vscode-focusBorder); outline-offset: -2px; background: var(--vscode-list-hoverBackground); }
    .tree-row.drag-over .tree-main::after {content: "  안으로 이동"; color: var(--vscode-focusBorder); font-size: 11px; }

    
}
  </style>
</head>
<body>
${body}
<script nonce="${nonce}">
function escapeHtml(value) {
  return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
function escapeAttr(value) {
  return escapeHtml(value).replace(/"/g, '&quot;')
}
function findComponent(components, id) {
  for (const component of components || []) {
    if (component.id === id) return component
    const child = findComponent(component.children, id)
    if (child) return child
  }
  return null
}
</script>
</body>
</html>`;
}

function getNonce() {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let value = "";
  for (let i = 0; i < 32; i += 1)
    value += chars.charAt(Math.floor(Math.random() * chars.length));
  return value;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

module.exports = {
  getDatasetHtml,
  getEditorHtml,
  htmlShell,
  getNonce,
};
