const { getGridHtml, getGridScript, getGridStyles } = require("./gridView");
const { getStoreHtml, getStoreScript, getStoreStyles } = require("./storeView");
const { NEUTRAL_TO_QUASAR } = require("./componentTypes");
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
      <button class="tab" data-tab="store">Store</button>
      <button id="create-pinia-store" class="screen-tool-button tab-action-button hidden" type="button" title="Store 신규 추가" aria-label="Store 신규 추가">
        <span class="material-icons" aria-hidden="true">add_box</span>
      </button>
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
    ${getStoreHtml()}
    <script nonce="${nonce}" src="${runtimeUris.vue}"></script>
    <script nonce="${nonce}" src="${runtimeUris.quasar}"></script>
    <script nonce="${nonce}" src="${runtimeUris.monacoLoader}"></script>
    <script nonce="${nonce}">
      const vscode = acquireVsCodeApi()
      const componentTypeMap = ${JSON.stringify(NEUTRAL_TO_QUASAR)}
      const vueRuntime = window.Vue
      const quasarRuntime = window.Quasar || window.quasar
      let model = null
      let selectedId = ''
      let selectedCellIds = []
      let piniaStores = []
      let activePiniaStorePath = ''
      let selectedStoreStatePath = []
      let selectedStoreMember = null
      let storeSaveTimer = null
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
        if (event.data.type === 'piniaStores') {
          piniaStores = Array.isArray(event.data.stores) ? event.data.stores : []
          if (!piniaStores.some((store) => store.fsPath === activePiniaStorePath)) {
            activePiniaStorePath = piniaStores[0]?.fsPath || ''
            selectedStoreStatePath = []
            selectedStoreMember = null
          }
          if (activeTab === 'store') render()
          return
        }

        if (event.data.type === 'selectPiniaStore') {
          activePiniaStorePath = event.data.fsPath || ''
          selectedStoreStatePath = []
          selectedStoreMember = null
          if (activeTab === 'store') render()
          return
        }

        if (event.data.type !== 'state') return

        model = event.data.model
        selectedId = event.data.selectedId
        selectedCellIds = Array.isArray(event.data.selectedCellIds)
          ? event.data.selectedCellIds
          : []

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
          if (activeTab === 'store') {
            vscode.postMessage({ type: 'requestPiniaStores' })
          }
          render()
        })
      })

      document.getElementById('create-pinia-store').addEventListener('click', () => {
        showPiniaStoreDialog()
      })

      setupPiniaStoreDialog()

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

        if (activeTab === 'store') {
          unmountPreview()
          renderPiniaStores(content)
          return
        }

        unmountPreview()

        content.innerHTML = '<div class="runtime-preview-frame' + (showCanvasGrid ? ' show-canvas-grid' : '') + '"><div id="quasar-preview"></div></div>' +
          ${JSON.stringify(getGridHtml())}
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
        const createStoreButton = document.getElementById('create-pinia-store')

        tools?.classList.toggle('hidden', activeTab !== 'screen')
        createStoreButton?.classList.toggle('hidden', activeTab !== 'store')
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
              resolveQuasarComponent('Layout'),
              { view: 'hHh Lpr fFf', container: true, class: 'qt-preview-layout' },
              () => vueRuntime.h(
                resolveQuasarComponent('PageContainer'),
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

        if (selectedCellIds.includes(component.id)) { classNames.push('qt-multi-selected') }

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

          const gridCellId = getFormGridDropCellId(component.id)
          if ((event.ctrlKey || event.metaKey) && gridCellId) {
            event.preventDefault()
            vscode.postMessage({ type: 'toggleGridCellSelection', id: gridCellId })
            return
          }

          if (component.id !== selectedId || selectedCellIds.length > 0) {
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

          const gridCellId = getFormGridDropCellId(component.id)
          layoutContext.mergeCellIds = gridCellId && selectedCellIds.includes(gridCellId)
            ? [...selectedCellIds]
            : []

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
          if (isPaletteDrag(event.dataTransfer)) {
            event.preventDefault()
            event.stopPropagation()
            event.dataTransfer.dropEffect = 'copy'
            setPaletteDropTarget(component.id)
            return
          }

          event.preventDefault()
          event.stopPropagation()
        }

        props.onDragleave = (event) => {
          const nextTarget = event.relatedTarget
          if (nextTarget && event.currentTarget.contains(nextTarget)) return
          clearPaletteDropTarget()
        }

        props.onDrop = (event) => {
          event.preventDefault()
          event.stopPropagation()

          const paletteIndex = getPaletteDragIndex(event.dataTransfer)

          if (paletteIndex >= 0) {
            clearPaletteDropTarget()

            vscode.postMessage({
              type: 'dropPaletteComponent',
              index: paletteIndex,
              targetId: component.id,
              mode: componentCanHaveChildren(component) ? 'inside' : 'after'
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

      ${getGridScript()}

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

          // Card, Page, CardSection 같은 컨테이너 컴포넌트는 slot 함수 사용
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
        const runtimeType = componentTypeMap[type] || type
        return quasarRuntime[runtimeType] || runtimeType
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

      function componentCanHaveChildren(component) {
        if (!component) return false

        if (component.type === 'HtmlElement') {
          const children = Array.isArray(component.children) ? component.children : []
          if (component.text !== undefined && children.length === 0) return false

          return ['div', 'section', 'article', 'main', 'aside', 'header', 'footer']
            .includes(component.tag || 'div')
        }

        return ['Page', 'Card', 'CardSection', 'Layout', 'PageContainer']
          .includes(component.type)
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

      function getDataset() {
        return model.datasets?.[0] || { name: 'defaultDataset', fields: [] }
      }

      ${getStoreScript()}

      function setupPaletteDrop() {
        const frame = document.querySelector('.runtime-preview-frame')
        if (!frame) return

        frame.addEventListener('dragover', (event) => {
          if (!isPaletteDrag(event.dataTransfer)) return
          event.preventDefault()
          event.dataTransfer.dropEffect = 'copy'
          frame.classList.add('qt-palette-frame-drop-target')
        })

        frame.addEventListener('dragleave', (event) => {
          if (event.relatedTarget && frame.contains(event.relatedTarget)) return
          frame.classList.remove('qt-palette-frame-drop-target')
          clearPaletteDropTarget()
        })

        frame.addEventListener('drop', (event) => {
          if (!isPaletteDrag(event.dataTransfer)) return

          event.preventDefault()
          event.stopPropagation()
          const paletteIndex = getPaletteDragIndex(event.dataTransfer)
          frame.classList.remove('qt-palette-frame-drop-target')
          clearPaletteDropTarget()

          if (paletteIndex < 0) return
          vscode.postMessage({
            type: 'dropPaletteComponent',
            index: paletteIndex,
            targetId: '',
            mode: 'inside'
          })
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
    .tab-action-button { margin: 2px 2px 5px 4px; align-self: center; }
    #content { min-height: calc(100vh - 42px); }
    .runtime-preview-frame { min-height: calc(100vh - 42px); overflow: auto; color: #000; background-color: #fafafa; }
    .runtime-preview-frame.qt-palette-frame-drop-target { box-shadow: inset 0 0 0 3px rgba(33, 163, 102, 0.85); }
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
    .store-list { display: grid; align-content: start; }
    .store-item { display: grid; grid-template-columns: minmax(160px, 0.7fr) minmax(140px, 0.6fr) minmax(220px, 1fr); gap: 4px 14px; width: 100%; min-height: 58px; padding: 9px 12px; align-items: center; border: 0; border-bottom: 1px solid var(--vscode-panel-border); color: var(--vscode-editor-foreground); background: transparent; text-align: left; }
    .store-item:hover { background: var(--vscode-list-hoverBackground); }
    .store-name { font-weight: 600; }
    .store-id, .store-path, .store-state { overflow: hidden; color: var(--vscode-descriptionForeground); font-size: 12px; text-overflow: ellipsis; white-space: nowrap; }
    .store-state { grid-column: 1 / -1; }
    ${getStoreStyles()}
    .check { display: flex; gap: 6px; align-items: center; color: var(--vscode-descriptionForeground); }
    .check input { width: auto; min-height: auto; }
    .qt-html-element {outline: 1px dashed #bdbdbd; outline-offset: -1px; }
    .qt-html-element:hover { outline: 1px dashed #757575; }
    .qt-html-element.qt-selected { outline: 2px solid #1976d2; outline-offset: -2px; box-shadow: 0 0 0 2px rgba(25, 118, 210, 0.2) !important; }
    .qt-direct-text { cursor: text; }
    .qt-direct-text[contenteditable="true"]:focus { outline: 2px solid #1976d2; outline-offset: 1px; }
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

    .designer-dialog-backdrop { position: fixed; inset: 0; z-index: 10020; display: flex; align-items: center; justify-content: center; padding: 16px; background: rgba(0, 0, 0, 0.48); }
    .designer-dialog { width: min(360px, calc(100vw - 32px)); border: 1px solid var(--vscode-panel-border); border-radius: 6px; color: var(--vscode-editor-foreground); background: var(--vscode-editorWidget-background); box-shadow: 0 12px 32px rgba(0, 0, 0, 0.45); overflow: hidden; }
    .designer-dialog-header { display: flex; min-height: 36px; padding: 7px 8px 7px 12px; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--vscode-panel-border); background: var(--vscode-titleBar-activeBackground); }
    .designer-dialog-close { width: 26px; height: 24px; padding: 0; border: 0; color: var(--vscode-icon-foreground); background: transparent; font-size: 18px; line-height: 20px; }
    .designer-dialog-close:hover { background: var(--vscode-toolbar-hoverBackground); }
    .designer-dialog-body { display: grid; gap: 12px; padding: 12px; }
    .designer-dialog-actions { display: flex; justify-content: flex-end; gap: 8px; padding: 10px 12px; border-top: 1px solid var(--vscode-panel-border); }
    .designer-dialog-actions button { min-width: 76px; min-height: 28px; padding: 4px 10px; border: 1px solid var(--vscode-panel-border); border-radius: 3px; color: var(--vscode-button-secondaryForeground); background: var(--vscode-button-secondaryBackground); }
    .designer-dialog-actions button.primary { margin: 0; border-color: var(--vscode-button-background); color: var(--vscode-button-foreground); background: var(--vscode-button-background); }

    ${getGridStyles()}
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
