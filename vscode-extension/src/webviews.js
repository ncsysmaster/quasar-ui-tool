const { getGridHtml, getGridScript, getGridStyles } = require("./gridView");
const { getStoreHtml, getStoreScript, getStoreStyles } = require("./storeView");
const {
  getScreenStoreStateScript,
  getScreenStoreStateStyles,
} = require("./screenStoreStateView");
const { getTableHtml, getTableScript, getTableStyles } = require("./tableView");
const { PALETTE } = require("./constants");
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
      <button id="import-pinia-store" class="screen-tool-button tab-action-button hidden" type="button" title="기존 Store 파일 연결" aria-label="기존 Store 파일 연결">
        <span class="material-icons" aria-hidden="true">folder_open</span>
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
    ${getTableHtml()}
    <script nonce="${nonce}" src="${runtimeUris.vue}"></script>
    <script nonce="${nonce}" src="${runtimeUris.agGridCommunity}"></script>
    <script nonce="${nonce}" src="${runtimeUris.agGridVue}"></script>
    <script nonce="${nonce}" src="${runtimeUris.quasar}"></script>
    <script nonce="${nonce}" src="${runtimeUris.monacoLoader}"></script>
    <script nonce="${nonce}">
      const vscode = acquireVsCodeApi()
      const componentTypeMap = ${JSON.stringify(NEUTRAL_TO_QUASAR)}
      const tablePaletteIndex = ${PALETTE.findIndex((item) => item.type === "Table")}
      const vueRuntime = window.Vue
      const quasarRuntime = window.Quasar || window.quasar
      const agGridRuntime = window.agGrid || {}
      const agGridVueRuntime = window.AgGridVue || {}
      if (agGridRuntime.ModuleRegistry && agGridRuntime.AllCommunityModule) {
        agGridRuntime.ModuleRegistry.registerModules([agGridRuntime.AllCommunityModule])
      }
      let model = null
      let selectedId = ''
      let selectedCellIds = []
      let piniaStores = []
      let activePiniaStorePath = ''
      let selectedStoreStatePath = []
      const collapsedStoreStatePaths = new Set()
      let selectedStoreMember = null
      let activeTab = 'screen'
      let previewApp = null
      let previewState = null
      let scriptEditor = null
      let scriptEditorModel = null
      let scriptDirty = false
      let scriptSaving = false
      let scriptDraftValue = null
      let scriptRenderToken = 0
      let storeMemberEditor = null
      let storeMemberEditorModel = null
      let storeMemberEditorRenderToken = 0
      let dirtyTabs = { screen: false, script: false, store: false }
      const dirtyPiniaStorePaths = new Set()
      let quasarToolCompletionProviderDisposable = null
      let storeDeleteConfirmationResolve = null
      let pendingTableWizard = null
      let lastTableWizardRequest = 0
      let tableColumnsComponentId = ''
      let tableColumnsDraft = []
      let tableColumnsHeaderRows = 1
      let tableColumnsHeaderLayout = []
      let tableColumnsBodyRows = []
      let tableColumnsActiveTab = 'columns'
      let tableColumnsSelectedNode = null
      let selectedTableHeaderMergeCells = []
      let selectedTableBodyMergeCells = []
      let lastTableColumnsRequest = 0
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
          const incomingStores = Array.isArray(event.data.stores) ? event.data.stores : []
          const storeEditorHasFocus = activeTab === 'store' && Boolean(
            document.activeElement?.closest?.('.store-editor-layout, .store-file-tabs')
          )
          const activeStoreBeingEdited = activeTab === 'store' && (
            storeMemberEditor || storeEditorHasFocus
          )
            ? piniaStores.find((store) => store.fsPath === activePiniaStorePath)
            : null
          piniaStores = activeStoreBeingEdited && incomingStores.some(
            (store) => store.fsPath === activePiniaStorePath
          )
            ? incomingStores.map((store) =>
                store.fsPath === activePiniaStorePath ? activeStoreBeingEdited : store
              )
            : incomingStores
          if (!piniaStores.some((store) => store.fsPath === activePiniaStorePath)) {
            activePiniaStorePath = piniaStores[0]?.fsPath || ''
            selectedStoreStatePath = []
            selectedStoreMember = null
          }
          if (activeTab === 'store' && !activeStoreBeingEdited) render()
          if (activeTab === 'screen' || activeTab === 'script') renderScreenStoreStatePanel()
          return
        }

        if (event.data.type === 'selectPiniaStore') {
          activePiniaStorePath = event.data.fsPath || ''
          selectedStoreStatePath = []
          selectedStoreMember = null
          if (activeTab === 'store') render()
          return
        }

        if (event.data.type === 'saved') {
          if (event.data.tab === 'screen') {
            markTabDirty('screen', false)
          } else if (event.data.tab === 'script') {
            scriptSaving = false
            if (!scriptEditorModel || scriptEditorModel.getValue() === String(event.data.value ?? '')) {
              scriptDirty = false
              scriptDraftValue = null
              markTabDirty('script', false)
            }
          } else if (event.data.tab === 'store') {
            if (event.data.fsPath) dirtyPiniaStorePaths.delete(event.data.fsPath)
            markTabDirty('store', dirtyPiniaStorePaths.size > 0)
          }
          return
        }

        if (event.data.type === 'requestSave') {
          saveActiveTab()
          return
        }

        if (event.data.type !== 'state') return

        model = event.data.model
        selectedId = event.data.selectedId
        selectedCellIds = Array.isArray(event.data.selectedCellIds)
          ? event.data.selectedCellIds
          : []
        dirtyTabs.screen = Boolean(event.data.dirtyTabs?.screen)
        updateDirtyTabIndicators()

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

        const tableWizardRequest = event.data.tableWizardRequest
        if (
          tableWizardRequest?.requestId &&
          tableWizardRequest.requestId !== lastTableWizardRequest
        ) {
          lastTableWizardRequest = tableWizardRequest.requestId
          render()
          showTableWizard(tableWizardRequest)
          return
        }
        const tableColumnsRequest = event.data.tableColumnsRequest
        if (tableColumnsRequest?.requestId && tableColumnsRequest.requestId !== lastTableColumnsRequest) {
          lastTableColumnsRequest = tableColumnsRequest.requestId
          render()
          showTableColumnsDialog(tableColumnsRequest.componentId)
          return
        }

        if (activeTab === 'script' && scriptEditor) {
          if (!scriptDirty) syncScriptEditor(model.script?.setup || '')
          revealPendingScriptMethod()
          return
        }

        if (activeTab === 'store') return

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

      updateDirtyTabIndicators()

      document.getElementById('create-pinia-store').addEventListener('click', () => {
        showPiniaStoreDialog()
      })
      document.getElementById('import-pinia-store').addEventListener('click', () => {
        vscode.postMessage({ type: 'importPiniaStore' })
      })

      setupPiniaStoreDialog()
      setupStoreDeleteDialog()
      setupTableDialogs()

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

      window.addEventListener('keydown', handleGlobalKeydown, true)

      function handleGlobalKeydown(event) {
        if ((event.ctrlKey || event.metaKey) && !event.altKey && !event.shiftKey && event.key.toLowerCase() === 's') {
          event.preventDefault()
          event.stopPropagation()
          saveActiveTab()
          return
        }

        if (activeTab !== 'screen') return

        const tagName = event.target?.tagName?.toLowerCase()
        if (event.target?.isContentEditable || tagName === 'input' || tagName === 'textarea' || tagName === 'select') {
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
      }

      function updateDirtyTabIndicators() {
        document.querySelectorAll('[data-tab]').forEach((tab) => {
          const tabName = tab.dataset.tab
          const label = tabName === 'screen' ? 'Screen' : tabName === 'script' ? 'Script' : 'Store'
          tab.textContent = (dirtyTabs[tabName] ? '*' : '') + label
        })
      }

      function markTabDirty(tabName, value = true) {
        dirtyTabs[tabName] = Boolean(value)
        updateDirtyTabIndicators()
      }

      function saveActiveTab() {
        if (activeTab === 'screen') {
          vscode.postMessage({ type: 'saveScreen' })
          return
        }
        if (activeTab === 'script' && scriptEditor && scriptEditorModel) {
          saveScriptEditor()
          return
        }
        if (activeTab === 'store') {
          saveActivePiniaStore()
        }
      }

      function render() {
        const content = document.getElementById('content')
        if (!model) {
          unmountPreview()
          disposeStoreMemberEditor()
          content.innerHTML = '<div class="empty">Open a page JSON file.</div>'
          return
        }

        if (activeTab === 'script') {
          unmountPreview()
          disposeStoreMemberEditor()
          const existingScriptContainer = document.getElementById('script-editor')
          if (scriptEditor && existingScriptContainer?.isConnected) {
            syncScriptEditor(model.script?.setup || '')
            renderScreenStoreStatePanel()
            setupScriptStoreStateDrop(existingScriptContainer)
            revealPendingScriptMethod()
            scriptEditor.focus()
            return
          }
          disposeScriptEditor()
          content.innerHTML = '<div class="script-editor-workspace"><div class="script-editor-shell"><div id="script-editor" class="script-editor" role="application" aria-label="JavaScript editor"></div></div><aside id="screen-store-state-panel" class="screen-store-state-panel" aria-label="Store State"></aside></div>'
          renderScreenStoreStatePanel()
          mountScriptEditor(model.script?.setup || '')
          return
        }

        disposeScriptEditor()

        if (activeTab === 'store') {
          unmountPreview()
          renderPiniaStores(content)
          return
        }

        disposeStoreMemberEditor()
        unmountPreview()

        content.innerHTML = '<div class="screen-editor-workspace"><div class="screen-editor-canvas"><div class="runtime-preview-frame' + (showCanvasGrid ? ' show-canvas-grid' : '') + '"><div id="quasar-preview"></div></div></div><aside id="screen-store-state-panel" class="screen-store-state-panel" aria-label="Store State"></aside></div>' +
          ${JSON.stringify(getGridHtml())}
        mountPreview()
        renderScreenStoreStatePanel()

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
        const importStoreButton = document.getElementById('import-pinia-store')

        tools?.classList.toggle('hidden', activeTab !== 'screen')
        createStoreButton?.classList.toggle('hidden', activeTab !== 'store')
        importStoreButton?.classList.toggle('hidden', activeTab !== 'store')
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
          const scriptUri = monaco.Uri.parse('file:///.src/pages/' + encodeURIComponent(pageId) + '.js')
          const editorValue = scriptDirty && scriptDraftValue !== null
            ? scriptDraftValue
            : value
          scriptEditorModel = monaco.editor.getModel(scriptUri) || monaco.editor.createModel(
            editorValue,
            'javascript',
            scriptUri
          )
          if (scriptEditorModel.getValue() !== editorValue) {
            scriptEditorModel.setValue(editorValue)
          }
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
          setupScriptStoreStateDrop(container)

          scriptEditor.onDidChangeModelContent(() => {
            if (scriptSaving) return
            scriptDirty = true
            scriptDraftValue = scriptEditorModel.getValue()
            markTabDirty('script', true)
          })

          scriptEditor.focus()
          revealPendingScriptMethod()
        } catch (error) {
          if (container.isConnected) {
            container.innerHTML = '<div class="empty error-text">Script editor failed to load: ' + escapeHtml(error.message) + '</div>'
          }
        }
      }

      function setupScriptStoreStateDrop(container) {
        if (!container || container.dataset.storeStateDropReady === 'true') return
        container.dataset.storeStateDropReady = 'true'

        container.addEventListener('dragover', (event) => {
          if (!isStoreStateDrag(event.dataTransfer)) return
          event.preventDefault()
          event.dataTransfer.dropEffect = 'copy'
          container.classList.add('qt-script-store-drop-target')
        })

        container.addEventListener('dragleave', (event) => {
          if (container.contains(event.relatedTarget)) return
          container.classList.remove('qt-script-store-drop-target')
        })

        container.addEventListener('drop', (event) => {
          const binding = getStoreStateBinding(event.dataTransfer)
          if (!binding?.expression || !scriptEditor || !scriptEditorModel) return
          event.preventDefault()
          event.stopPropagation()
          container.classList.remove('qt-script-store-drop-target')

          const target = scriptEditor.getTargetAtClientPoint?.(event.clientX, event.clientY)
          const position = target?.position || scriptEditor.getPosition()
          if (!position) return

          const range = new window.monaco.Range(
            position.lineNumber,
            position.column,
            position.lineNumber,
            position.column
          )
          scriptEditor.pushUndoStop()
          scriptEditor.executeEdits('store-state-drop', [{
            range,
            text: binding.expression,
            forceMoveMarkers: true
          }])
          scriptEditor.pushUndoStop()
          scriptEditor.setPosition({
            lineNumber: position.lineNumber,
            column: position.column + binding.expression.length
          })
          scriptEditor.focus()
        })
      }

      function syncScriptEditor(value) {
        if (scriptDirty) return
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
        scriptEditor.addCommand(ctrlCmd | monaco.KeyCode.KeyS, async () => {
          await saveScriptEditor()
        })
        scriptEditor.addCommand(monaco.KeyMod.Shift | monaco.KeyMod.Alt | monaco.KeyCode.KeyF, () => {
          formatEditorDocument(scriptEditor)
        })
      }

      async function saveScriptEditor() {
        if (!scriptEditorModel && scriptDraftValue === null) return
        scriptSaving = true
        if (scriptEditor) {
          await formatEditorDocument(scriptEditor, 800)
        }
        const value = scriptEditorModel
          ? scriptEditorModel.getValue()
          : String(scriptDraftValue ?? '')
        scriptSaving = false
        scriptDraftValue = value
        if (model) {
          model.script ||= {}
          model.script.setup = value
        }
        vscode.postMessage({ type: 'updateScript', value })
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
        if (scriptDirty && scriptEditorModel) {
          scriptDraftValue = scriptEditorModel.getValue()
        }
        scriptSaving = false
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
        registerQuasarToolCompletions(monaco)
      }

      function registerQuasarToolCompletions(monaco) {
        if (quasarToolCompletionProviderDisposable) return
        quasarToolCompletionProviderDisposable = monaco.languages.registerCompletionItemProvider('javascript', {
          triggerCharacters: ['.', '$'],
          provideCompletionItems(editorModel, position) {
            return {
              suggestions: [
                ...buildStoreStateCompletionItems(monaco, editorModel, position),
                ...buildQuasarScriptCompletionItems(monaco, editorModel, position)
              ]
            }
          }
        })
      }

      function buildStoreStateCompletionItems(monaco, editorModel, position) {
        const tokenInfo = getCompletionTokenInfo(editorModel, position)
        const stores = getStoreCompletionSources()
        const matchedStore = stores.find((store) =>
          tokenInfo.token === store.importName ||
          tokenInfo.token.startsWith(store.importName + '.') ||
          tokenInfo.token === store.importName + '.'
        )

        if (!matchedStore) {
          return stores.flatMap((store) => flattenStoreStateCompletionItems(monaco, store, tokenInfo))
        }

        const suffix = tokenInfo.token.slice(matchedStore.importName.length)
        const pathText = suffix.startsWith('.') ? suffix.slice(1) : ''
        const endsWithDot = tokenInfo.token.endsWith('.')
        const pathParts = pathText ? pathText.split('.') : []
        const partial = endsWithDot ? '' : pathParts.pop() || ''
        const parentPath = pathParts.filter(Boolean)
        const parentValue = getValueByPath(matchedStore.state, parentPath)
        const children = parentValue && typeof parentValue === 'object' && !Array.isArray(parentValue)
          ? Object.entries(parentValue)
          : []

        return children
          .filter(([name]) => !partial || name.toLowerCase().startsWith(partial.toLowerCase()))
          .map(([name, value]) => ({
            label: name,
            kind: monaco.languages.CompletionItemKind.Property,
            insertText: name,
            detail: matchedStore.importName + '.' + [...parentPath, name].join('.'),
            documentation: 'Store State - ' + storeValueType(value),
            range: tokenInfo.currentSegmentRange
          }))
      }

      function buildQuasarScriptCompletionItems(monaco, editorModel, position) {
        const range = editorModel.getWordUntilPosition(position)
        const completionRange = new monaco.Range(position.lineNumber, range.startColumn, position.lineNumber, range.endColumn)
        const items = [
          ['useQuasar', "const $q = useQuasar()", 'Quasar instance helper'],
          ['$q.notify', "$q.notify({ message: '\${1:message}', color: '\${2:primary}' })", 'Quasar notify'],
          ['$q.dialog', "$q.dialog({ title: '\${1:title}', message: '\${2:message}' })", 'Quasar dialog'],
          ['Notify.create', "Notify.create({ message: '\${1:message}', color: '\${2:primary}' })", 'Quasar Notify plugin'],
          ['Dialog.create', "Dialog.create({ title: '\${1:title}', message: '\${2:message}' })", 'Quasar Dialog plugin'],
          ['Loading.show', 'Loading.show()', 'Quasar loading show'],
          ['Loading.hide', 'Loading.hide()', 'Quasar loading hide'],
          ['ref', "const \${1:name} = ref(\${2:null})", 'Vue ref'],
          ['reactive', "const \${1:state} = reactive({\\n  \${2:key}: \${3:null}\\n})", 'Vue reactive'],
          ['computed', "const \${1:value} = computed(() => \${2:source})", 'Vue computed'],
          ['watch', "watch(\${1:source}, (\${2:value}) => {\\n  \${3:// TODO}\\n})", 'Vue watch'],
          ['onMounted', "onMounted(() => {\\n  \${1:// TODO}\\n})", 'Vue lifecycle'],
          ['nextTick', 'await nextTick()', 'Vue nextTick']
        ]

        return items.map(([label, insertText, detail]) => ({
          label,
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText,
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          detail,
          range: completionRange
        }))
      }

      function getCompletionTokenInfo(editorModel, position) {
        const linePrefix = editorModel.getLineContent(position.lineNumber).slice(0, position.column - 1)
        const match = linePrefix.match(/([A-Za-z_$][\\w$]*(?:\\.[A-Za-z_$][\\w$]*)*\\.?)$/)
        const token = match?.[1] || ''
        const tokenStartColumn = position.column - token.length
        const currentSegmentLength = token.endsWith('.')
          ? 0
          : (token.split('.').pop() || '').length
        return {
          token,
          tokenRange: new monaco.Range(position.lineNumber, tokenStartColumn, position.lineNumber, position.column),
          currentSegmentRange: new monaco.Range(position.lineNumber, position.column - currentSegmentLength, position.lineNumber, position.column)
        }
      }

      function getStoreCompletionSources() {
        return (Array.isArray(piniaStores) ? piniaStores : []).map((store) => {
          const importName =
            store.tabName ||
            store.pageImport?.variableName ||
            store.definition?.store?.importName ||
            store.constName ||
            'store'
          return {
            importName,
            state: store.definition?.state || {},
            fsPath: store.fsPath || ''
          }
        })
      }

      function flattenStoreStateCompletionItems(monaco, store, tokenInfo) {
        const result = [{
          label: store.importName,
          kind: monaco.languages.CompletionItemKind.Variable,
          insertText: store.importName,
          detail: 'Pinia Store',
          documentation: store.fsPath,
          range: tokenInfo.currentSegmentRange
        }]
        const walk = (value, path) => {
          if (!value || typeof value !== 'object' || Array.isArray(value)) return
          Object.entries(value).forEach(([name, child]) => {
            const nextPath = [...path, name]
            const expression = buildStoreBindingExpression(store.importName, nextPath)
            result.push({
              label: expression,
              kind: child && typeof child === 'object' && !Array.isArray(child)
                ? monaco.languages.CompletionItemKind.Struct
                : monaco.languages.CompletionItemKind.Property,
              insertText: expression,
              detail: 'Store State - ' + storeValueType(child),
              documentation: expression,
              range: tokenInfo.tokenRange.startColumn === tokenInfo.tokenRange.endColumn
                ? tokenInfo.currentSegmentRange
                : tokenInfo.tokenRange
            })
            walk(child, nextPath)
          })
        }
        walk(store.state, [])
        return result
      }

      function getValueByPath(value, path) {
        return (path || []).reduce((current, key) => {
          if (!current || typeof current !== 'object') return undefined
          return current[key]
        }, value)
      }

      async function formatEditorDocument(editor, timeoutMs = 2000) {
        if (!editor) return
        const withTimeout = (promise) => Promise.race([
          promise,
          new Promise((resolve) => setTimeout(resolve, timeoutMs))
        ])
        const action = editor.getAction('editor.action.formatDocument')
        if (action?.isSupported?.() !== false) {
          try {
            await withTimeout(action.run())
            return
          } catch {}
        }
        const selectionAction = editor.getAction('editor.action.formatSelection')
        if (selectionAction?.isSupported?.() !== false) {
          try {
            await withTimeout(selectionAction.run())
          } catch {}
        }
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
        if (component.type === 'Table') {
          return renderTablePreviewComponent(component, scope, repeatIndex)
        }

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

      function renderTablePreviewComponent(component, scope, repeatIndex) {
        const wrapperClass = ['qt-ag-table-preview']
        if (component.id === selectedId) wrapperClass.push('qt-selected')

        const wrapperProps = {
          class: wrapperClass,
          key: repeatIndex === undefined
            ? component.id || component.type
            : (component.id || component.type) + '-' + repeatIndex,
          'data-qt-id': component.id || '',
          tabindex: 0,
          draggable: true,
          onClick: (event) => {
            event.stopPropagation()
            event.currentTarget.focus()
            const headerInfo = getTableHeaderEventInfo(event, component)
            if (headerInfo) {
              markTableHeaderDomSelection(event.currentTarget, headerInfo)
              if (event.ctrlKey || event.metaKey) {
                event.preventDefault()
                handleTableHeaderCtrlClick(component, headerInfo)
                return
              }
              selectedTableHeaderMergeCells = [{
                componentId: component.id,
                rowIndex: headerInfo.rowIndex,
                columnIndex: headerInfo.columnIndex
              }]
            }
            const bodyInfo = getTableBodyLayoutEventInfo(event, component)
            if (bodyInfo) {
              if (event.ctrlKey || event.metaKey) {
                event.preventDefault()
                handleTableBodyCtrlClick(component, bodyInfo)
                return
              }
              selectedTableBodyMergeCells = [{
                componentId: component.id,
                rowIndex: bodyInfo.rowIndex,
                cellIndex: bodyInfo.cellIndex,
                columnIndex: bodyInfo.columnIndex
              }]
            }
            if (component.id !== selectedId || selectedCellIds.length > 0) {
              vscode.postMessage({ type: 'select', id: component.id })
            }
          },
          onDblclick: (event) => {
            event.preventDefault()
            event.stopPropagation()
            const headerInfo = getTableHeaderEventInfo(event, component)
            if (headerInfo) {
              markTableHeaderDomSelection(event.currentTarget, headerInfo)
              showTableColumnsDialog(component.id, false, tableHeaderInfoToColumnEditorNode(headerInfo, component))
              return
            }
            const bodyInfo = getTableBodyLayoutEventInfo(event, component)
            if (bodyInfo) {
              showTableColumnsDialog(component.id, false, tableBodyInfoToColumnEditorNode(bodyInfo, component))
              return
            }
            vscode.postMessage({ type: 'openFirstEventMethod', id: component.id })
          },
          onContextmenu: (event) => {
            event.preventDefault()
            event.stopPropagation()
            vscode.postMessage({ type: 'select', id: component.id })
            const headerInfo = getTableHeaderEventInfo(event, component)
            if (headerInfo) {
              markTableHeaderDomSelection(event.currentTarget, headerInfo)
              showTableColumnsDialog(component.id, false, tableHeaderInfoToColumnEditorNode(headerInfo, component))
              return
            }
            const bodyInfo = getTableBodyLayoutEventInfo(event, component)
            if (bodyInfo) {
              showTableColumnsDialog(component.id, false, tableBodyInfoToColumnEditorNode(bodyInfo, component))
              return
            }
            showTableContextMenu(event.clientX, event.clientY, component.id)
          },
          onDragstart: (event) => {
            event.stopPropagation()
            event.dataTransfer.setData('text/plain', component.id)
            vscode.postMessage({ type: 'select', id: component.id })
          }
        }

        return vueRuntime.h('div', wrapperProps, [
          buildTableToolbarPreview(component, scope),
          vueRuntime.h(resolveAgGridComponent(), buildAgGridPreviewProps(component, scope))
        ].filter(Boolean))
      }

      function buildTableToolbarPreview(component, scope) {
        const toolbar = component.table?.toolbar || {}
        const hasToolbar = toolbar.filter || toolbar.search || toolbar.add || toolbar.save ||
          toolbar.delete || toolbar.excel || toolbar.refresh || component.table?.title
        if (!hasToolbar) return null

        const children = []
        if (component.table?.title) {
          children.push(vueRuntime.h('div', { class: 'qt-table-title' }, component.table.title))
        }
        if (toolbar.filter) {
          children.push(vueRuntime.h(resolveQuasarComponent('Input'), {
            dense: true,
            outlined: true,
            placeholder: '검색',
            class: 'qt-table-filter-preview',
            modelValue: resolveValue(component.table?.filterBinding, scope) || '',
            'onUpdate:modelValue': (value) => setResolvedValue(component.table?.filterBinding, value, scope)
          }))
        }
        const labels = { search: '검색', add: '신규', save: '저장', delete: '삭제', excel: '엑셀', refresh: '새로고침' }
        if (Object.keys(labels).some((key) => toolbar[key])) {
          children.push(vueRuntime.h('div', { class: 'qt-table-toolbar-spacer' }))
        }
        Object.keys(labels).forEach((key) => {
          if (!toolbar[key]) return
          children.push(vueRuntime.h(resolveQuasarComponent('Button'), {
            outline: true,
            unelevated: true,
            class: 'qt-table-toolbar-btn',
            color: getTableToolbarButtonColor(key),
            textColor: getTableToolbarButtonTextColor(key),
            label: labels[key],
            onClick: (event) => event.stopPropagation(),
            onDblclick: (event) => {
              event.preventDefault()
              event.stopPropagation()
              vscode.postMessage({
                type: 'openTableToolbarMethod',
                id: component.id,
                action: key
              })
            }
          }))
        })

        return vueRuntime.h('div', { class: 'qt-table-toolbar-preview' }, children)
      }

      function buildAgGridPreviewProps(component, scope) {
        const pagination = component.table?.pagination || {}
        const selection = component.table?.selection || component.props?.selection || 'none'
        const rows = resolveValue(component.dynamicProps?.rows || component.table?.rowsBinding, scope)
        const rowData = Array.isArray(rows) ? rows : (Array.isArray(component.props?.rows) ? component.props.rows : [])
        const rowKey = component.table?.rowKey || component.props?.rowKey || 'id'
        const headerRows = getTableHeaderRows(component)
        const headerHeight = headerRows > 1 ? 32 : 48
        const rowRows = getTableRowRows(component)
        const rowHeight = 42 * rowRows
        const props = {
          class: 'qt-ag-grid',
          style: getAgGridPreviewStyle(component),
          rowData: normalizeTablePreviewRows(rowData),
          columnDefs: buildTablePreviewColumnDefs(component),
          defaultColDef: {
            resizable: true,
            sortable: true,
            filter: true,
            minWidth: 70,
            suppressKeyboardEvent: suppressAgGridKeyboardEvent
          },
          headerHeight,
          rowHeight,
          animateRows: true,
          singleClickEdit: false,
          getRowId: (params) => String(params.data?.__qtRowId ?? params.data?.[rowKey] ?? params.node?.rowIndex ?? ''),
          onRowClicked: (event) => {
            event.event?.stopPropagation?.()
            if (component.id !== selectedId) vscode.postMessage({ type: 'select', id: component.id })
          }
        }
        if (headerRows > 1) props.groupHeaderHeight = 32

        if (pagination.mode !== 'none') {
          props.pagination = true
          props.paginationPageSize = Number(pagination.rowsPerPage) || 10
          props.paginationPageSizeSelector = Array.isArray(pagination.rowsPerPageOptions)
            ? pagination.rowsPerPageOptions
            : [10, 20, 50, 0]
        }

        if (selection === 'single' || selection === 'multiple') {
          props.rowSelection = {
            mode: selection === 'multiple' ? 'multiRow' : 'singleRow',
            checkboxes: true,
            headerCheckbox: selection === 'multiple',
            enableClickSelection: false
          }
          props.onSelectionChanged = (event) => {
            if (component.models?.selected) {
              setResolvedValue(component.models.selected, event.api.getSelectedRows(), scope)
            }
          }
        }

        if (component.table?.loadingBinding) {
          props.loading = Boolean(resolveValue(component.table.loadingBinding, scope))
        }

        return props
      }

      function suppressAgGridKeyboardEvent(params = {}) {
        const event = params.event
        const columnDef = params.column?.getColDef?.() || params.colDef || {}
        if (params.editing && shouldCompleteAgGridEditingOnly(event)) {
          return completeAgGridEditingCell(params)
        }

        if (params.editing && getCellMoveKey(event)) {
          if (shouldKeepHorizontalArrowInEditor(event)) return false
          return moveAgGridEditingCell(params, event.key)
        }

        const isImeEvent = Boolean(
          event?.isComposing ||
          event?.key === 'Process' ||
          event?.key === 'Unidentified' ||
          event?.keyCode === 229 ||
          event?.which === 229
        )
        if (params.editing || !isEditableAgGridColumnDef(columnDef, params)) return false

        const isPrintableEvent = Boolean(
          event &&
          typeof event.key === 'string' &&
          event.key.length === 1 &&
          !event.ctrlKey &&
          !event.metaKey &&
          !event.altKey
        )
        return isPrintableEvent || isImeEvent
      }

      function isArrowKeyboardEvent(event) {
        return ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event?.key)
      }

      function getCellMoveKey(event) {
        if (event?.key === 'Enter' && event.shiftKey) return ''
        if (event?.key === 'Enter') return 'ArrowDown'
        return isArrowKeyboardEvent(event) ? event.key : ''
      }

      function shouldCompleteAgGridEditingOnly(event) {
        return event?.key === 'Enter' && event.shiftKey
      }

      function isEditableAgGridColumnDef(columnDef, params = {}) {
        if (columnDef?.qtGroupRowCell === true) return true
        if (typeof columnDef?.editable === 'function') return Boolean(columnDef.editable(params))
        return columnDef?.editable === true
      }

      function isGroupRowCellAgGridColumnDef(columnDef) {
        return columnDef?.qtGroupRowCell === true
      }

      function getTextInputFromEvent(event) {
        const target = event?.target
        if (!target) return null
        const tagName = String(target.tagName || '').toLowerCase()
        if (tagName === 'input' || tagName === 'textarea') return target
        return typeof target.closest === 'function' ? target.closest('input,textarea') : null
      }

      function shouldKeepHorizontalArrowInEditor(event) {
        if (event?.key !== 'ArrowLeft' && event?.key !== 'ArrowRight') return false
        const input = getTextInputFromEvent(event)
        if (!input || typeof input.selectionStart !== 'number' || typeof input.selectionEnd !== 'number') {
          return false
        }

        const selectionStart = input.selectionStart
        const selectionEnd = input.selectionEnd
        if (selectionStart !== selectionEnd) return true

        const textLength = String(input.value || '').length
        if (event.key === 'ArrowLeft') return selectionStart > 0
        return selectionEnd < textLength
      }

      function getAgGridDisplayedColumns(eventApi) {
        const allColumns = eventApi?.getAllDisplayedColumns?.()
        if (Array.isArray(allColumns) && allColumns.length > 0) return allColumns
        const centerColumns = eventApi?.getDisplayedCenterColumns?.()
        return Array.isArray(centerColumns) ? centerColumns : []
      }

      function focusAgGridGroupRowCellInput(eventApi, rowIndex, columnId, inputIndex = 0) {
        eventApi?.ensureIndexVisible?.(rowIndex)
        eventApi?.ensureColumnVisible?.(columnId)
        eventApi?.setFocusedCell?.(rowIndex, columnId)
        setTimeout(() => {
          const rows = Array.from(document.querySelectorAll('.ag-row'))
          const row = rows.find((element) => element.getAttribute('row-index') === String(rowIndex))
          const cells = row ? Array.from(row.querySelectorAll('.ag-cell')) : []
          const cell = cells.find((element) => element.getAttribute('col-id') === String(columnId))
          const input = cell?.querySelector?.('.qt-ag-group-input[data-qt-ag-group-input-index="' + (Number(inputIndex) || 0) + '"]')
          input?.focus?.()
          input?.select?.()
        }, 0)
      }

      function moveAgGridEditingCell(params, key) {
        const eventApi = params.api
        const moveKey = getCellMoveKey({ key })
        const shouldStartEditingAfterMove = key !== 'Enter'
        if (!eventApi || !moveKey) return false

        const columns = getAgGridDisplayedColumns(eventApi)
        if (columns.length === 0) return false

        const currentColumnId = params.column?.getColId?.() || params.colDef?.colId || params.colDef?.field
        const currentColumnIndex = columns.findIndex((column) => column?.getColId?.() === currentColumnId)
        const currentRowIndex = Number.isInteger(Number(params.node?.rowIndex))
          ? Number(params.node.rowIndex)
          : Number(eventApi.getFocusedCell?.()?.rowIndex)

        if (!Number.isInteger(currentRowIndex) || currentColumnIndex < 0) return false

        const displayedRowCount = Number(eventApi.getDisplayedRowCount?.() || 0)
        let nextRowIndex = currentRowIndex
        let nextColumnIndex = currentColumnIndex

        if (moveKey === 'ArrowUp') nextRowIndex -= 1
        if (moveKey === 'ArrowDown') nextRowIndex += 1

        if (moveKey === 'ArrowLeft' || moveKey === 'ArrowRight') {
          const direction = moveKey === 'ArrowLeft' ? -1 : 1
          nextColumnIndex += direction
          while (nextColumnIndex >= 0 && nextColumnIndex < columns.length) {
            const rowNode = eventApi.getDisplayedRowAtIndex?.(nextRowIndex)
            const columnDef = columns[nextColumnIndex]?.getColDef?.() || {}
            if (isEditableAgGridColumnDef(columnDef, {
              ...params,
              api: eventApi,
              node: rowNode,
              data: rowNode?.data,
              column: columns[nextColumnIndex],
              colDef: columnDef
            })) break
            nextColumnIndex += direction
          }
        }

        if (nextRowIndex < 0 || nextRowIndex >= displayedRowCount) return false
        if (nextColumnIndex < 0 || nextColumnIndex >= columns.length) return false

        const targetColumn = columns[nextColumnIndex]
        const targetColumnId = targetColumn?.getColId?.()
        const targetRowNode = eventApi.getDisplayedRowAtIndex?.(nextRowIndex)
        const targetColumnDef = targetColumn?.getColDef?.() || {}
        if (!targetColumnId || !isEditableAgGridColumnDef(targetColumnDef, {
          ...params,
          api: eventApi,
          node: targetRowNode,
          data: targetRowNode?.data,
          column: targetColumn,
          colDef: targetColumnDef
        })) return false

        params.event?.preventDefault?.()
        params.event?.stopPropagation?.()
        eventApi.stopEditing?.(false)

        setTimeout(() => {
          eventApi.ensureIndexVisible?.(nextRowIndex)
          eventApi.ensureColumnVisible?.(targetColumnId)
          eventApi.setFocusedCell?.(nextRowIndex, targetColumnId)
          if (shouldStartEditingAfterMove) {
            if (isGroupRowCellAgGridColumnDef(targetColumnDef)) {
              focusAgGridGroupRowCellInput(eventApi, nextRowIndex, targetColumnId, 0)
            } else {
              eventApi.startEditingCell?.({ rowIndex: nextRowIndex, colKey: targetColumnId })
            }
          }
        }, 0)

        return true
      }

      function completeAgGridEditingCell(params = {}) {
        const eventApi = params.api
        if (!eventApi) return false

        params.event?.preventDefault?.()
        params.event?.stopPropagation?.()
        eventApi.stopEditing?.(false)
        return true
      }

      function normalizeTablePreviewRows(rows) {
        return (Array.isArray(rows) ? rows : []).map((row) => {
          if (!row || typeof row !== 'object') return row
          if (!['R', 'C', 'U', 'D'].includes(String(row.mode || '').toUpperCase())) row.mode = 'R'
          return row
        })
      }

      function getAgGridPreviewStyle(component) {
        const declarations = String(component.style || '')
          .split(';')
          .map((item) => item.trim())
          .filter(Boolean)
        const width = findStyleDeclarationValue(declarations, 'width') || '100%'
        const height = findStyleDeclarationValue(declarations, 'height') || '360px'
        const rest = declarations.filter((item) => {
          const property = item.slice(0, item.indexOf(':')).trim().toLowerCase()
          return property !== 'width' && property !== 'height'
        })
        return ['width: ' + width, 'height: ' + height].concat(rest).join('; ')
      }

      function findStyleDeclarationValue(declarations, propertyName) {
        const target = String(propertyName || '').trim().toLowerCase()
        const declaration = declarations.find((item) => {
          const separator = item.indexOf(':')
          return separator >= 0 && item.slice(0, separator).trim().toLowerCase() === target
        })
        return declaration ? declaration.slice(declaration.indexOf(':') + 1).trim() : ''
      }

      function toAgGridPreviewColumnDef(column, options = {}) {
        const sizing = getAgGridPreviewColumnSizing(column)
        const align = ['left', 'center', 'right'].includes(column?.align) ? column.align : ''
        const type = column?.type || 'text'
        const groupRowCell = options.groupRowCell || null
        const bodyRegion = options.bodyRegion || null
        const def = {
          colId: String(column?.name || column?.field || 'column'),
          headerName: String(column?.label || column?.name || column?.field || 'Column'),
          field: String(column?.field || column?.name || 'column'),
          sortable: Boolean(column?.sortable),
          resizable: true,
          editable: Boolean(column?.editable),
          ...sizing,
          ...(align ? { cellStyle: { textAlign: align } } : {}),
          ...(column?.modeColumn || column?.field === 'mode' ? {
            cellClass: 'qt-table-mode-cell',
            editable: false,
            headerName: '',
            minWidth: 42,
            maxWidth: 52
          } : {})
        }
        if (type === 'number') def.type = 'numericColumn'
        if (type === 'checkbox') def.cellRenderer = 'agCheckboxCellRenderer'
        if (type === 'actions') {
          def.cellRenderer = () => '<button type="button" class="qt-ag-action-btn">편집</button><button type="button" class="qt-ag-action-btn qt-ag-action-danger">삭제</button>'
          def.sortable = false
          def.filter = false
        }
        if (groupRowCell) {
          delete def.cellRenderer
          def.editable = false
          def.qtGroupRowCell = true
          def.cellClass = mergeAgGridPreviewCellClass(def.cellClass, 'qt-ag-group-row-cell')
          def.colSpan = (params) => params.node?.rowPinned ? 1 : groupRowCell.span
          def.cellRenderer = createAgGridPreviewGroupRowCellRenderer(groupRowCell)
        }
        if (bodyRegion) {
          delete def.cellRenderer
          def.editable = false
          def.qtGroupRowCell = true
          def.cellClass = mergeAgGridPreviewCellClass(def.cellClass, 'qt-ag-group-row-cell')
          def.colSpan = (params) => params.node?.rowPinned ? 1 : bodyRegion.span
          def.cellRenderer = createAgGridPreviewBodyLayoutCellRenderer(bodyRegion)
        }
        return def
      }

      function buildTablePreviewColumnDefs(component) {
        const groupDepth = getTableHeaderRows(component) - 1
        const sourceColumns = Array.isArray(component?.headerRows) || Array.isArray(component?.bodyRows)
          ? applyTablePreviewHeaderLayoutToColumns(getTablePreviewColumns(component), component.headerRows, getTableHeaderRows(component))
          : getTablePreviewColumns(component)
        const bodyRegions = createTablePreviewBodyLayoutRegions(sourceColumns, component.bodyRows, getTableRowRows(component))
        const columns = groupDepth > 0
          ? prepareTablePreviewColumnsForHeaderRows(sourceColumns, groupDepth)
          : sourceColumns
        const rowRows = getTableRowRows(component)
        if (groupDepth <= 0) {
          return columns.map((column, index) =>
            toAgGridPreviewColumnDef(column, { bodyRegion: bodyRegions.get(getTablePreviewColumnKey(column)) || bodyRegions.get(index) })
          )
        }
        return buildTablePreviewColumnGroups(columns, groupDepth, 0, rowRows, bodyRegions)
      }

      function countTablePreviewLeafColumns(columns) {
        return (Array.isArray(columns) ? columns : []).reduce(
          (count, column) => count + (Array.isArray(column?.columns) ? countTablePreviewLeafColumns(column.columns) : 1),
          0
        )
      }

      function buildTablePreviewColumnGroups(columns, groupDepth, depth, rowRows, bodyRegions = new Map(), startIndex = 0) {
        if (depth >= groupDepth) {
          return columns.map((column, index) => {
            const globalIndex = startIndex + index
            return toAgGridPreviewColumnDef(column, {
              bodyRegion: bodyRegions.get(getTablePreviewColumnKey(column)) || bodyRegions.get(globalIndex)
            })
          })
        }
        const groups = []
        let index = 0
        while (index < (columns || []).length) {
          if (shouldRenderPreviewColumnLeafAtDepth(columns, index, depth, groupDepth)) {
            groups.push({ leaf: columns[index] })
            index += 1
            continue
          }
          const column = columns[index]
          const headerName = getTablePreviewColumnGroupName(column, depth)
          const key = headerName || '__blank_' + depth + '_' + index
          const groupColumns = [column]
          index += 1
          while (
            index < columns.length &&
            !shouldRenderPreviewColumnLeafAtDepth(columns, index, depth, groupDepth) &&
            getTablePreviewColumnGroupName(columns[index], depth) === headerName
          ) {
            groupColumns.push(columns[index])
            index += 1
          }
          groups.push({ key, headerName, columns: groupColumns })
        }
        let leafOffset = startIndex
        return groups.map((group) => {
          const groupStartIndex = leafOffset
          const groupLeafCount = group.leaf ? 1 : countTablePreviewLeafColumns(group.columns)
          leafOffset += groupLeafCount
          if (group.leaf) {
            return toAgGridPreviewColumnDef(group.leaf, {
              bodyRegion: bodyRegions.get(getTablePreviewColumnKey(group.leaf)) || bodyRegions.get(groupStartIndex)
            })
          }
          const shouldRenderGroupBodyCell = bodyRegions.size === 0 && rowRows > 1 && depth === groupDepth - 1 && group.columns.length > 0
          return {
            headerName: group.headerName,
            marryChildren: true,
            children: shouldRenderGroupBodyCell
              ? buildTablePreviewGroupBodyChildren(group, depth)
              : buildTablePreviewColumnGroups(group.columns, groupDepth, depth + 1, rowRows, bodyRegions, groupStartIndex)
          }
        })
      }

      function buildTablePreviewGroupBodyChildren(group, depth) {
        const groupField = getTablePreviewColumnGroupFieldName(group.columns[0], depth, group.headerName)
        const children = group.columns.map((column) => ({
          field: String(column?.field || column?.name || 'column'),
          label: String(column?.label || column?.name || column?.field || 'Column'),
          editable: column?.editable !== false
        }))
        return group.columns.map((column, index) => toAgGridPreviewColumnDef(
          column,
          index === 0
            ? {
                groupRowCell: {
                  span: group.columns.length,
                  groupField,
                  groupLabel: group.headerName,
                  children
                }
              }
            : {}
        ))
      }

      function applyTablePreviewHeaderLayoutToColumns(columns, headerLayout, headerRows) {
        const nextColumns = (Array.isArray(columns) ? columns : []).map((column) => ({ ...column }))
        const visibleRows = getTableHeaderRows({ table: { headerRows } })
        const groupRows = Math.max(0, visibleRows - 1)
        const layoutRows = normalizeTablePreviewLayoutRows(headerLayout, nextColumns, visibleRows, 'header')
        layoutRows.forEach((row, rowIndex) => {
          row.forEach((cell) => {
            getTablePreviewLayoutColumnIndexes(nextColumns, cell).forEach((columnIndex) => {
              if (rowIndex >= groupRows) {
                nextColumns[columnIndex].label = String(cell.label || nextColumns[columnIndex].label || nextColumns[columnIndex].name || '')
              } else {
                const headers = Array.isArray(nextColumns[columnIndex].headers) ? [...nextColumns[columnIndex].headers] : []
                headers[rowIndex] = String(cell.label || nextColumns[columnIndex].label || nextColumns[columnIndex].name || '')
                nextColumns[columnIndex].headers = headers
                nextColumns[columnIndex].__qtForceHeaderRows = true
              }
            })
          })
        })
        return nextColumns
      }

      function normalizeTablePreviewLayoutRows(rows, columns, rowCount = 1, kind = 'body') {
        const columnKeys = (columns || []).map(getTablePreviewColumnKey)
        const count = Math.min(3, Math.max(1, Math.round(Number(rowCount) || 1)))
        const defaults = createDefaultTablePreviewLayoutRows(columns, count, kind)
        const source = Array.isArray(rows) && rows.length > 0 ? rows.slice(0, count) : []
        while (source.length < count) source.push(defaults[source.length] || defaults[0] || [])
        return source.map((row) => {
          const cells = Array.isArray(row) ? row : []
          const normalized = []
          let cursor = 0
          cells.forEach((cell) => {
            const rawKeys = Array.isArray(cell?.columns)
              ? cell.columns.map(String).filter(Boolean)
              : (cell?.field ? [String(cell.field)] : [])
            const startKey = rawKeys.find((key) => columnKeys.includes(key)) || columnKeys[cursor] || ''
            const start = columnKeys.indexOf(startKey)
            if (start < 0) return
            const span = Math.max(1, Math.min(columnKeys.length - start, Number(cell?.colspan || rawKeys.length || 1)))
            const keys = columnKeys.slice(start, start + span)
            cursor = start + span
            normalized.push({
              label: String(cell?.label || keys[0] || ''),
              field: String(cell?.field || keys[0] || ''),
              columns: keys,
              colspan: span,
              rowspan: Math.max(1, Math.min(count, Number(cell?.rowspan || 1)))
            })
          })
          return normalized.length > 0 ? normalized : createDefaultTablePreviewLayoutRows(columns, 1, kind)[0]
        })
      }

      function createDefaultTablePreviewLayoutRows(columns, rowCount = 1, kind = 'body') {
        return Array.from({ length: Math.min(3, Math.max(1, Number(rowCount) || 1)) }, (_, rowIndex) =>
          (columns || []).map((column, columnIndex) => ({
            label: kind === 'header' && rowIndex > 0
              ? 'title' + (columnIndex + 1)
              : String(column?.label || column?.name || column?.field || 'Column'),
            field: getTablePreviewColumnKey(column),
            columns: [getTablePreviewColumnKey(column)],
            colspan: 1,
            rowspan: 1
          }))
        )
      }

      function getTablePreviewColumnKey(column) {
        return String(column?.field || column?.name || '').trim()
      }

      function getTablePreviewLayoutColumnIndexes(columns, cell) {
        const keys = Array.isArray(cell?.columns) ? cell.columns.map(String) : [String(cell?.field || '')]
        return keys
          .map((key) => columns.findIndex((column) => getTablePreviewColumnKey(column) === key))
          .filter((index) => index >= 0)
      }

      function createTablePreviewBodyLayoutRegions(columns, bodyLayout, rowRows) {
        const regions = new Map()
        const rowCount = getTableRowRows({ table: { rowRows } })
        if (rowCount <= 1 && !Array.isArray(bodyLayout)) return regions
        const layoutRows = normalizeTablePreviewLayoutRows(bodyLayout, columns, rowCount)
        const consumed = new Set()
        const layoutCells = []

        layoutRows.forEach((row, rowIndex) => {
          row.forEach((cell) => {
            const indexes = getTablePreviewLayoutColumnIndexes(columns, cell)
            if (indexes.length === 0) return
            const start = Math.min(...indexes)
            const end = Math.max(...indexes)
            layoutCells.push({
              rowIndex,
              start,
              end,
              span: Math.max(1, end - start + 1),
              rowspan: Math.max(1, Number(cell.rowspan || 1)),
              field: String(cell.field || getTablePreviewColumnKey(columns[start]) || ''),
              label: String(cell.label || cell.field || ''),
              editable: columns[start]?.editable !== false
            })
          })
        })

        for (let columnIndex = 0; columnIndex < columns.length; columnIndex += 1) {
          if (consumed.has(columnIndex) || isTablePreviewModeColumn(columns[columnIndex])) continue
          let regionEnd = columnIndex
          let changed = true
          const cells = []
          const cellKeys = new Set()

          while (changed) {
            changed = false
            layoutCells.forEach((cell) => {
              if (cell.end < columnIndex || cell.start > regionEnd) return
              const key = cell.rowIndex + ':' + cell.start + ':' + cell.end + ':' + cell.field
              if (!cellKeys.has(key)) {
                cellKeys.add(key)
                cells.push(cell)
                changed = true
              }
              if (cell.end > regionEnd) {
                regionEnd = cell.end
                changed = true
              }
            })
          }

          if (cells.length === 0) continue
          const regionSpan = regionEnd - columnIndex + 1
          const needsRenderer = regionSpan > 1 || rowCount > 1 || cells.length > 1
          if (!needsRenderer) continue
          for (let index = columnIndex + 1; index <= regionEnd; index += 1) consumed.add(index)
          const region = {
            span: regionSpan,
            rowCount,
            cells: cells
              .slice()
              .sort((left, right) => left.rowIndex - right.rowIndex || left.start - right.start)
              .map((cell, inputIndex) => ({
                ...cell,
                inputIndex,
                localStart: Math.max(0, cell.start - columnIndex)
              }))
          }
          regions.set(columnIndex, region)
          regions.set(getTablePreviewColumnKey(columns[columnIndex]), region)
        }
        return regions
      }

      function createAgGridPreviewGroupRowCellRenderer(options) {
        return (params) => {
          const data = params.data || {}
          const children = Array.isArray(options.children) ? options.children : []
          const stop = (event) => event.stopPropagation()
          const setValue = (field, value) => {
            if (!field || !params.data) return
            params.data[field] = value
            if (params.data.mode !== 'C' && params.data.mode !== 'D') params.data.mode = 'U'
            params.api?.refreshCells?.({ rowNodes: params.node ? [params.node] : undefined, force: true })
          }
          const getGroupInput = (rowIndex, inputIndex, targetColumnId) => {
            const columnId = targetColumnId || params.column?.getColId?.() || params.colDef?.colId || params.colDef?.field
            const rows = Array.from(document.querySelectorAll('.ag-row'))
            const row = rows.find((element) => element.getAttribute('row-index') === String(rowIndex))
            const cells = row ? Array.from(row.querySelectorAll('.ag-cell')) : []
            const cell = cells.find((element) => element.getAttribute('col-id') === String(columnId))
            return cell?.querySelector('.qt-ag-group-input[data-qt-ag-group-input-index="' + inputIndex + '"]') ||
              cell?.querySelector('.qt-ag-layout-input[data-qt-ag-layout-input-index="' + inputIndex + '"]') ||
              null
          }
          const focusGroupInput = (rowIndex, inputIndex) => {
            const columnId = params.column?.getColId?.() || params.colDef?.colId || params.colDef?.field
            params.api?.ensureIndexVisible?.(rowIndex)
            params.api?.ensureColumnVisible?.(columnId)
            params.api?.setFocusedCell?.(rowIndex, columnId)
            setTimeout(() => {
              const targetInput = getGroupInput(rowIndex, inputIndex)
              targetInput?.focus?.()
              targetInput?.select?.()
            }, 0)
          }
          const getDisplayedColumns = () => {
            const allColumns = params.api?.getAllDisplayedColumns?.()
            if (Array.isArray(allColumns) && allColumns.length > 0) return allColumns
            const centerColumns = params.api?.getDisplayedCenterColumns?.()
            return Array.isArray(centerColumns) ? centerColumns : []
          }
          const getCurrentColumnIndex = () => {
            const columnId = params.column?.getColId?.() || params.colDef?.colId || params.colDef?.field
            return getDisplayedColumns().findIndex((column) => column?.getColId?.() === columnId)
          }
          const isEditableColumnDef = (columnDef) => {
            if (columnDef?.qtGroupRowCell === true) return true
            if (typeof columnDef?.editable === 'function') {
              return Boolean(columnDef.editable({ ...params, colDef: columnDef }))
            }
            return columnDef?.editable === true
          }
          const focusGridCell = (rowIndex, columnIndex) => {
            const columns = getDisplayedColumns()
            const targetColumn = columns[columnIndex]
            const targetColumnId = targetColumn?.getColId?.()
            const targetColumnDef = targetColumn?.getColDef?.() || {}
            if (!targetColumnId || !isEditableColumnDef(targetColumnDef)) return false
            params.api?.ensureIndexVisible?.(rowIndex)
            params.api?.ensureColumnVisible?.(targetColumnId)
            params.api?.setFocusedCell?.(rowIndex, targetColumnId)
            setTimeout(() => {
              if (targetColumnDef.qtGroupRowCell === true) {
                const targetInput = getGroupInput(rowIndex, 0, targetColumnId)
                targetInput?.focus?.()
                targetInput?.select?.()
              } else {
                params.api?.startEditingCell?.({ rowIndex, colKey: targetColumnId })
              }
            }, 0)
            return true
          }
          const shouldKeepHorizontalArrow = (event, input) => {
            if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return false
            if (typeof input.selectionStart !== 'number' || typeof input.selectionEnd !== 'number') return false
            if (input.selectionStart !== input.selectionEnd) return true
            const textLength = String(input.value || '').length
            return event.key === 'ArrowLeft' ? input.selectionStart > 0 : input.selectionEnd < textLength
          }
          const moveGroupInput = (event, input) => {
            if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter'].includes(event.key)) return false
            if (shouldKeepHorizontalArrow(event, input)) return false
            if (event.key === 'Enter' && event.shiftKey) return false
            const passThrough = 'qt-ag-pass-through'

            const currentIndex = Number(input.dataset.qtAgGroupInputIndex || 0)
            const currentRowIndex = Number(params.node?.rowIndex)
            const displayedRowCount = Number(params.api?.getDisplayedRowCount?.() || 0)
            let nextIndex = currentIndex
            let nextRowIndex = currentRowIndex

            if (event.key === 'ArrowDown' || event.key === 'Enter') {
              nextRowIndex += 1
            } else if (event.key === 'ArrowUp') {
              nextRowIndex -= 1
            } else if (event.key === 'ArrowRight') {
              if (currentIndex < children.length) nextIndex += 1
              else {
                const moved = focusGridCell(currentRowIndex, getCurrentColumnIndex() + children.length)
                if (!moved) return passThrough
                event.preventDefault()
                event.stopPropagation()
                setValue(input.dataset.qtAgGroupField || '', input.value)
                return true
              }
            } else if (event.key === 'ArrowLeft') {
              if (currentIndex > 0) nextIndex -= 1
              else {
                const moved = focusGridCell(currentRowIndex, getCurrentColumnIndex() - 1)
                if (!moved) return passThrough
                event.preventDefault()
                event.stopPropagation()
                setValue(input.dataset.qtAgGroupField || '', input.value)
                return true
              }
            }

            if (!Number.isInteger(nextRowIndex) || nextRowIndex < 0 || nextRowIndex >= displayedRowCount) return passThrough
            event.preventDefault()
            event.stopPropagation()
            setValue(input.dataset.qtAgGroupField || '', input.value)
            focusGroupInput(nextRowIndex, nextIndex)
            return true
          }
          const handleKeydown = (event, input) => {
            if (event.key === 'Enter' && event.shiftKey) {
              event.preventDefault()
              event.stopPropagation()
              setValue(input.dataset.qtAgGroupField || '', input.value)
              return
            }
            const moved = moveGroupInput(event, input)
            if (moved === true || moved === 'qt-ag-pass-through') return
            event.stopPropagation()
          }
          const createInput = (field, label, className, editable = true, inputIndex = 0) => {
            const input = document.createElement('input')
            input.className = className
            input.dataset.qtAgGroupInputIndex = String(inputIndex)
            input.dataset.qtAgGroupField = field || ''
            input.value = data[field] == null ? '' : String(data[field])
            input.placeholder = label || field || ''
            input.readOnly = editable === false
            input.addEventListener('mousedown', stop)
            input.addEventListener('click', stop)
            input.addEventListener('dblclick', stop)
            input.addEventListener('keydown', (event) => handleKeydown(event, input))
            input.addEventListener('change', () => setValue(field, input.value))
            input.addEventListener('blur', () => setValue(field, input.value))
            return input
          }
          const root = document.createElement('div')
          root.className = 'qt-ag-group-row-editor'
          root.style.setProperty('--qt-group-child-count', String(Math.max(1, children.length)))
          root.addEventListener('mousedown', stop)
          root.addEventListener('click', stop)
          root.addEventListener('dblclick', stop)
          root.appendChild(createInput(options.groupField, options.groupLabel, 'qt-ag-group-input qt-ag-group-main', true, 0))
          const childWrap = document.createElement('div')
          childWrap.className = 'qt-ag-group-children'
          children.forEach((child, index) => {
            childWrap.appendChild(createInput(child.field, child.label, 'qt-ag-group-input', child.editable, index + 1))
          })
          root.appendChild(childWrap)
          return root
        }
      }

      function createAgGridPreviewBodyLayoutCellRenderer(region) {
        return (params) => {
          const data = params.data || {}
          const stop = (event) => event.stopPropagation()
          const setValue = (field, value) => {
            if (!field || !params.data) return
            params.data[field] = value
            if (params.data.mode !== 'C' && params.data.mode !== 'D') params.data.mode = 'U'
            params.api?.refreshCells?.({ rowNodes: params.node ? [params.node] : undefined, force: true })
          }
          const getRegionInput = (rowIndex, inputIndex, targetColumnId) => {
            const columnId = targetColumnId || params.column?.getColId?.() || params.colDef?.colId || params.colDef?.field
            const rows = Array.from(document.querySelectorAll('.ag-row'))
            const row = rows.find((element) => element.getAttribute('row-index') === String(rowIndex))
            const cells = row ? Array.from(row.querySelectorAll('.ag-cell')) : []
            const cell = cells.find((element) => element.getAttribute('col-id') === String(columnId))
            return cell?.querySelector('.qt-ag-layout-input[data-qt-ag-layout-input-index="' + inputIndex + '"]') || null
          }
          const focusRegionInput = (rowIndex, inputIndex) => {
            const columnId = params.column?.getColId?.() || params.colDef?.colId || params.colDef?.field
            params.api?.ensureIndexVisible?.(rowIndex)
            params.api?.ensureColumnVisible?.(columnId)
            params.api?.setFocusedCell?.(rowIndex, columnId)
            setTimeout(() => {
              const targetInput = getRegionInput(rowIndex, inputIndex, columnId)
              targetInput?.focus?.()
              targetInput?.select?.()
            }, 0)
          }
          const getCellElement = (rowIndex, targetColumnId) => {
            const columnId = targetColumnId || params.column?.getColId?.() || params.colDef?.colId || params.colDef?.field
            const rows = Array.from(document.querySelectorAll('.ag-row'))
            const row = rows.find((element) => element.getAttribute('row-index') === String(rowIndex))
            const cells = row ? Array.from(row.querySelectorAll('.ag-cell')) : []
            return cells.find((element) => element.getAttribute('col-id') === String(columnId)) || null
          }
          const findLayoutInputByBodyRow = (rowIndex, targetColumnId, bodyRowIndex, anchorColumn = 0) => {
            const cell = getCellElement(rowIndex, targetColumnId)
            const inputs = Array.from(cell?.querySelectorAll?.('.qt-ag-layout-input') || [])
            if (inputs.length === 0) return null
            const rows = inputs.map((item) => ({
              input: item,
              rowStart: Math.max(0, Number(item.dataset.qtAgLayoutRowStart || 0)),
              rowEnd: Math.max(0, Number(item.dataset.qtAgLayoutRowEnd || item.dataset.qtAgLayoutRowStart || 0)),
              colStart: Math.max(0, Number(item.dataset.qtAgLayoutColStart || 0))
            }))
            const candidates = rows.filter((item) => bodyRowIndex >= item.rowStart && bodyRowIndex <= item.rowEnd)
            const pool = candidates.length > 0 ? candidates : rows
            return pool
              .slice()
              .sort((left, right) =>
                Math.abs(left.colStart - anchorColumn) - Math.abs(right.colStart - anchorColumn) ||
                left.rowStart - right.rowStart
              )[0]?.input || null
          }
          const regionCells = Array.isArray(region.cells) ? region.cells : []
          const regionRowCount = Math.max(1, Number(region.rowCount || 1))
          const getCellByInputIndex = (inputIndex) =>
            regionCells.find((cell) => Number(cell.inputIndex || 0) === Number(inputIndex))
          const getCellStart = (cell) => Math.max(0, Number(cell?.localStart || 0))
          const getCellSpan = (cell) => Math.max(1, Number(cell?.span || 1))
          const getCellEnd = (cell) => getCellStart(cell) + getCellSpan(cell) - 1
          const getCellRowStart = (cell) => Math.max(0, Number(cell?.rowIndex || 0))
          const getCellRowSpan = (cell) => Math.max(1, Number(cell?.rowspan || 1))
          const getCellRowEnd = (cell) => getCellRowStart(cell) + getCellRowSpan(cell) - 1
          const chooseCellAt = (bodyRowIndex, anchorColumn) => {
            const candidates = regionCells.filter((cell) =>
              bodyRowIndex >= getCellRowStart(cell) && bodyRowIndex <= getCellRowEnd(cell)
            )
            const exact = candidates.find((cell) =>
              anchorColumn >= getCellStart(cell) && anchorColumn <= getCellEnd(cell)
            )
            if (exact) return exact
            return candidates
              .slice()
              .sort((left, right) =>
                Math.abs(getCellStart(left) - anchorColumn) - Math.abs(getCellStart(right) - anchorColumn)
              )[0] || null
          }
          const findHorizontalCell = (currentCell, direction) => {
            const bodyRowIndex = getCellRowStart(currentCell)
            const targetColumn = direction > 0 ? getCellEnd(currentCell) + 1 : getCellStart(currentCell) - 1
            const target = chooseCellAt(bodyRowIndex, targetColumn)
            return target && target !== currentCell ? target : null
          }
          const findVerticalCell = (currentCell, direction, dataRowIndex, displayedRowCount) => {
            const anchorColumn = getCellStart(currentCell)
            const firstBodyRow = direction > 0 ? getCellRowEnd(currentCell) + 1 : getCellRowStart(currentCell) - 1
            for (
              let bodyRowIndex = firstBodyRow;
              bodyRowIndex >= 0 && bodyRowIndex < regionRowCount;
              bodyRowIndex += direction
            ) {
              const target = chooseCellAt(bodyRowIndex, anchorColumn)
              if (target) return { rowIndex: dataRowIndex, cell: target }
            }

            const nextDataRowIndex = dataRowIndex + direction
            if (!Number.isInteger(nextDataRowIndex) || nextDataRowIndex < 0 || nextDataRowIndex >= displayedRowCount) {
              return null
            }

            const startBodyRow = direction > 0 ? 0 : regionRowCount - 1
            for (
              let bodyRowIndex = startBodyRow;
              bodyRowIndex >= 0 && bodyRowIndex < regionRowCount;
              bodyRowIndex += direction
            ) {
              const target = chooseCellAt(bodyRowIndex, anchorColumn)
              if (target) return { rowIndex: nextDataRowIndex, cell: target }
            }
            return null
          }
          const shouldKeepHorizontalArrow = (event, input) => {
            if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return false
            if (typeof input.selectionStart !== 'number' || typeof input.selectionEnd !== 'number') return false
            if (input.selectionStart !== input.selectionEnd) return true
            const textLength = String(input.value || '').length
            return event.key === 'ArrowLeft' ? input.selectionStart > 0 : input.selectionEnd < textLength
          }
          const moveInput = (event, input) => {
            if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter'].includes(event.key)) return false
            if (event.key === 'Enter' && event.shiftKey) return false
            if (shouldKeepHorizontalArrow(event, input)) return false
            const passThrough = 'qt-ag-pass-through'
            const inputs = Array.from(root.querySelectorAll('.qt-ag-layout-input'))
            const currentIndex = Number(input.dataset.qtAgLayoutInputIndex || 0)
            const currentCell = getCellByInputIndex(currentIndex)
            const currentRowIndex = Number(params.node?.rowIndex)
            const displayedRowCount = Number(params.api?.getDisplayedRowCount?.() || 0)
            const getDisplayedColumns = () => {
              const allColumns = params.api?.getAllDisplayedColumns?.()
              if (Array.isArray(allColumns) && allColumns.length > 0) return allColumns
              const centerColumns = params.api?.getDisplayedCenterColumns?.()
              return Array.isArray(centerColumns) ? centerColumns : []
            }
            const getCurrentColumnIndex = () => {
              const columnId = params.column?.getColId?.() || params.colDef?.colId || params.colDef?.field
              return getDisplayedColumns().findIndex((column) => column?.getColId?.() === columnId)
            }
            const focusGridCell = (rowIndex, columnIndex, bodyRowIndex = 0, anchorColumn = 0) => {
              const columns = getDisplayedColumns()
              const targetColumn = columns[columnIndex]
              const targetColumnId = targetColumn?.getColId?.()
              const targetColumnDef = targetColumn?.getColDef?.() || {}
              if (!targetColumnId) return false
              params.api?.ensureIndexVisible?.(rowIndex)
              params.api?.ensureColumnVisible?.(targetColumnId)
              params.api?.setFocusedCell?.(rowIndex, targetColumnId)
              setTimeout(() => {
                const targetInput = findLayoutInputByBodyRow(rowIndex, targetColumnId, bodyRowIndex, anchorColumn) ||
                  getRegionInput(rowIndex, 0, targetColumnId) ||
                  document.querySelector('.ag-row[row-index="' + rowIndex + '"] .ag-cell[col-id="' + targetColumnId + '"] .qt-ag-group-input[data-qt-ag-group-input-index="0"]')
                if (targetInput) {
                  targetInput.focus?.()
                  targetInput.select?.()
                } else if (targetColumnDef.editable === true || typeof targetColumnDef.editable === 'function') {
                  params.api?.startEditingCell?.({ rowIndex, colKey: targetColumnId })
                }
              }, 0)
              return true
            }
            let nextInputIndex = currentIndex
            let nextRowIndex = currentRowIndex
            if (event.key === 'ArrowLeft') nextInputIndex -= 1
            if (event.key === 'ArrowRight') nextInputIndex += 1
            if (event.key === 'ArrowDown' || event.key === 'Enter') nextRowIndex += 1
            if (event.key === 'ArrowUp') nextRowIndex -= 1
            if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
              const targetCell = currentCell
                ? findHorizontalCell(currentCell, event.key === 'ArrowRight' ? 1 : -1)
                : null
              const nextInput = targetCell
                ? inputs.find((candidate) => Number(candidate.dataset.qtAgLayoutInputIndex || 0) === Number(targetCell.inputIndex || 0))
                : inputs[nextInputIndex]
              if (!nextInput) {
                const nextColumnIndex = getCurrentColumnIndex() + (event.key === 'ArrowRight' ? Math.max(1, region.span || 1) : -1)
                const moved = focusGridCell(
                  currentRowIndex,
                  nextColumnIndex,
                  currentCell ? getCellRowStart(currentCell) : 0,
                  currentCell ? getCellStart(currentCell) : 0
                )
                if (!moved) return passThrough
                event.preventDefault()
                event.stopPropagation()
                setValue(input.dataset.qtAgLayoutField || '', input.value)
                return true
              }
              event.preventDefault()
              event.stopPropagation()
              setValue(input.dataset.qtAgLayoutField || '', input.value)
              nextInput.focus()
              nextInput.select()
              return true
            }
            const target = currentCell
              ? findVerticalCell(currentCell, event.key === 'ArrowUp' ? -1 : 1, currentRowIndex, displayedRowCount)
              : null
            if (!target && (!Number.isInteger(nextRowIndex) || nextRowIndex < 0 || nextRowIndex >= displayedRowCount)) return passThrough
            event.preventDefault()
            event.stopPropagation()
            setValue(input.dataset.qtAgLayoutField || '', input.value)
            if (target) {
              focusRegionInput(target.rowIndex, target.cell.inputIndex)
            } else {
              focusRegionInput(nextRowIndex, currentIndex)
            }
            return true
          }
          const createInput = (cell) => {
            const input = document.createElement('input')
            input.className = 'qt-ag-layout-input'
            input.dataset.qtAgLayoutInputIndex = String(cell.inputIndex || 0)
            input.dataset.qtAgLayoutField = cell.field || ''
            input.dataset.qtAgLayoutRowStart = String(Math.max(0, Number(cell.rowIndex || 0)))
            input.dataset.qtAgLayoutRowEnd = String(Math.max(0, Number(cell.rowIndex || 0)) + Math.max(1, Number(cell.rowspan || 1)) - 1)
            input.dataset.qtAgLayoutColStart = String(Math.max(0, Number(cell.localStart || 0)))
            input.dataset.qtAgLayoutColEnd = String(Math.max(0, Number(cell.localStart || 0)) + Math.max(1, Number(cell.span || 1)) - 1)
            input.value = data[cell.field] == null ? '' : String(data[cell.field])
            input.placeholder = cell.label || cell.field || ''
            input.style.gridColumn = String((cell.localStart || 0) + 1) + ' / span ' + String(Math.max(1, cell.span || 1))
            input.style.gridRow = String((cell.rowIndex || 0) + 1) + ' / span ' + String(Math.max(1, cell.rowspan || 1))
            input.readOnly = cell.editable === false
            input.addEventListener('mousedown', stop)
            input.addEventListener('click', stop)
            input.addEventListener('dblclick', stop)
            input.addEventListener('keydown', (event) => {
              if (event.key === 'Enter' && event.shiftKey) {
                event.preventDefault()
                event.stopPropagation()
                setValue(input.dataset.qtAgLayoutField || '', input.value)
                return
              }
              const moved = moveInput(event, input)
              if (moved === true || moved === 'qt-ag-pass-through') return
              event.stopPropagation()
            })
            input.addEventListener('change', () => setValue(cell.field, input.value))
            input.addEventListener('blur', () => setValue(cell.field, input.value))
            return input
          }
          const root = document.createElement('div')
          root.className = 'qt-ag-layout-row-editor'
          root.style.setProperty('--qt-layout-column-count', String(Math.max(1, region.span || 1)))
          root.style.setProperty('--qt-layout-row-count', String(Math.max(1, region.rowCount || 1)))
          root.addEventListener('mousedown', stop)
          root.addEventListener('click', stop)
          root.addEventListener('dblclick', stop)
          ;(region.cells || []).forEach((cell) => root.appendChild(createInput(cell)))
          return root
        }
      }

      function mergeAgGridPreviewCellClass(currentClass, nextClass) {
        if (!currentClass) return nextClass
        if (typeof currentClass === 'string') return currentClass + ' ' + nextClass
        if (Array.isArray(currentClass)) return currentClass.concat(nextClass)
        return currentClass
      }

      function shouldRenderPreviewColumnLeafAtDepth(columns, index, depth, groupDepth) {
        const column = columns[index]
        const headerName = getTablePreviewColumnGroupName(column, depth)
        if (!headerName) return true
        if (column?.__qtForceHeaderRows) return false
        if (Array.isArray(column?.__qtGeneratedHeaders) && column.__qtGeneratedHeaders[depth]) return false
        const displayName = getTableColumnDisplayText(column)
        const hasAdjacentSameHeader =
          getTablePreviewColumnGroupName(columns[index - 1], depth) === headerName ||
          getTablePreviewColumnGroupName(columns[index + 1], depth) === headerName
        const hasDeeperHeader = hasPreviewColumnGroupHeaderBelow(column, depth, groupDepth)
        return !hasAdjacentSameHeader && !hasDeeperHeader && headerName === displayName
      }

      function hasPreviewColumnGroupHeaderBelow(column, depth, groupDepth) {
        for (let index = depth + 1; index < groupDepth; index += 1) {
          if (getTablePreviewColumnGroupName(column, index)) return true
        }
        return false
      }

      function prepareTablePreviewColumnsForHeaderRows(columns, groupDepth) {
        return (Array.isArray(columns) ? columns : []).map((column) => {
          const next = { ...column }
          const headers = getTablePreviewExistingColumnHeaders(next).slice(0, groupDepth)
          const generatedHeaders = []

          for (let index = 0; index < groupDepth; index += 1) {
            if (!String(headers[index] || '').trim() && !isTablePreviewModeColumn(next)) {
              headers[index] = getTableColumnDisplayText(next)
              generatedHeaders[index] = true
            } else {
              headers[index] = String(headers[index] || '').trim()
              generatedHeaders[index] = false
            }
          }

          if (headers.some(Boolean)) next.headers = headers
          if (generatedHeaders.some(Boolean)) next.__qtGeneratedHeaders = generatedHeaders
          return next
        })
      }

      function getTablePreviewExistingColumnHeaders(column) {
        if (Array.isArray(column?.headers)) return column.headers.slice()
        return [
          column?.header1 ?? column?.headerGroup ?? column?.group ?? '',
          column?.header2 ?? column?.headerSubGroup ?? ''
        ]
      }

      function isTablePreviewModeColumn(column) {
        return column?.modeColumn === true || column?.field === 'mode' || column?.name === 'mode'
      }

      function getTablePreviewColumnGroupName(column, index) {
        if (Array.isArray(column?.headers)) return String(column.headers[index] || '')
        if (index === 0) return String(column?.header1 || column?.headerGroup || column?.group || '')
        if (index === 1) return String(column?.header2 || column?.headerSubGroup || '')
        return ''
      }

      function getTablePreviewColumnGroupFieldName(column, index, fallback) {
        if (Array.isArray(column?.headerFields)) return String(column.headerFields[index] || fallback || '')
        if (Array.isArray(column?.groupFields)) return String(column.groupFields[index] || fallback || '')
        if (index === 0) return String(column?.headerField || column?.groupField || fallback || '')
        return String(fallback || '')
      }

      function getTableHeaderRows(component) {
        const number = Number(component?.table?.headerRows ?? 1)
        if (!Number.isFinite(number)) return 1
        return Math.min(3, Math.max(1, Math.round(number)))
      }

      function getTableRowRows(component) {
        const number = Number(component?.table?.rowRows ?? 1)
        if (!Number.isFinite(number)) return 1
        return Math.min(3, Math.max(1, Math.round(number)))
      }

      function getTableHeaderEventInfo(event, component) {
        const headerCell = event.target?.closest?.('.ag-header-cell, .ag-header-group-cell')
        if (!headerCell || !event.currentTarget?.contains?.(headerCell)) return null
        const columnIndexes = getAgHeaderColumnIndexesFromCell(event.currentTarget, headerCell, component)
        if (columnIndexes.length === 0) return null
        const headerRow = headerCell.closest?.('.ag-header-row')
        const rowIndex = getAgHeaderDomRowIndex(headerRow)
        const start = Math.min(...columnIndexes)
        const end = Math.max(...columnIndexes)
        return {
          rowIndex,
          columnIndex: start,
          start,
          end,
          isGroup: headerCell.classList.contains('ag-header-group-cell'),
          element: headerCell
        }
      }

      function markTableHeaderDomSelection(wrapper, info) {
        wrapper.querySelectorAll?.('.qt-ag-header-selected')
          .forEach((element) => element.classList.remove('qt-ag-header-selected'))
        info?.element?.classList?.add('qt-ag-header-selected')
      }

      function getAgHeaderDomRowIndex(headerRow) {
        const raw = headerRow?.getAttribute?.('aria-rowindex') ||
          headerRow?.dataset?.rowIndex ||
          headerRow?.getAttribute?.('row-index')
        const number = Number(raw)
        if (Number.isFinite(number)) return Math.max(0, Math.round(number) - 1)
        const rows = [...(headerRow?.parentElement?.querySelectorAll?.('.ag-header-row') || [])]
        const index = rows.indexOf(headerRow)
        return index >= 0 ? index : 0
      }

      function getAgHeaderColumnIndexesFromCell(wrapper, headerCell, component) {
        const headerBounds = headerCell.getBoundingClientRect()
        const leafCells = [...wrapper.querySelectorAll('.ag-header-cell')]
          .filter((cell) => !cell.classList.contains('ag-header-group-cell'))
        const indexes = []
        leafCells.forEach((cell, orderIndex) => {
          const bounds = cell.getBoundingClientRect()
          const overlaps = bounds.right > headerBounds.left + 1 && bounds.left < headerBounds.right - 1
          if (!overlaps) return
          const sourceIndex = getTableSourceColumnIndexByHeaderCell(component, cell, orderIndex)
          if (sourceIndex >= 0 && !indexes.includes(sourceIndex)) indexes.push(sourceIndex)
        })
        return indexes.sort((left, right) => left - right)
      }

      function getTableSourceColumnIndexByHeaderCell(component, headerCell, orderIndex) {
        const colId = headerCell.getAttribute('col-id') || headerCell.getAttribute('colId') || ''
        const previewColumns = getTablePreviewColumns(component)
        let previewIndex = previewColumns.findIndex((column) =>
          String(column?.name || column?.field || 'column') === String(colId)
        )
        if (previewIndex < 0) previewIndex = orderIndex
        const previewColumn = previewColumns[previewIndex]
        if (!previewColumn || previewColumn.modeColumn || previewColumn.field === 'mode') return -1
        const sourceColumns = Array.isArray(component?.columns) ? component.columns : []
        const sourceIndex = sourceColumns.indexOf(previewColumn)
        if (sourceIndex >= 0) return sourceIndex
        const modeOffset = previewColumns.some((column) => column?.modeColumn || column?.field === 'mode') ? 1 : 0
        const fallbackIndex = previewIndex - modeOffset
        return fallbackIndex >= 0 && fallbackIndex < sourceColumns.length ? fallbackIndex : -1
      }

      function tableHeaderInfoToColumnEditorNode(info, component) {
        const cellIndex = getTableLayoutCellIndexAtColumn(component.headerRows, component, info.rowIndex, info.columnIndex)
        if (cellIndex >= 0) {
          return { kind: 'layout', layout: 'header', rowIndex: info.rowIndex, cellIndex }
        }
        return { kind: 'column', index: info.columnIndex }
      }

      function tableBodyInfoToColumnEditorNode(info) {
        return { kind: 'layout', layout: 'body', rowIndex: info.rowIndex, cellIndex: info.cellIndex }
      }

      function getTableBodyLayoutEventInfo(event, component) {
        const input = event.target?.closest?.('.qt-ag-layout-input')
        if (input) {
          const field = input.dataset.qtAgLayoutField || ''
          const rows = normalizeTablePreviewLayoutRows(component.bodyRows, getTablePreviewColumns(component), getTableRowRows(component))
          for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
            const cellIndex = rows[rowIndex].findIndex((cell) => (cell.columns || []).includes(field) || cell.field === field)
            if (cellIndex >= 0) {
              const cell = rows[rowIndex][cellIndex]
              const indexes = getTablePreviewLayoutColumnIndexes(getTablePreviewColumns(component), cell)
              return {
                rowIndex,
                cellIndex,
                columnIndex: Math.min(...indexes),
                start: Math.min(...indexes),
                end: Math.max(...indexes)
              }
            }
          }
        }
        const bodyCell = event.target?.closest?.('.ag-center-cols-container .ag-cell, .ag-pinned-left-cols-container .ag-cell, .ag-pinned-right-cols-container .ag-cell')
        if (!bodyCell || !event.currentTarget?.contains?.(bodyCell)) return null
        const colId = bodyCell.getAttribute('col-id') || ''
        const columns = getTablePreviewColumns(component)
        const columnIndex = columns.findIndex((column) => String(column?.name || column?.field || '') === colId)
        if (columnIndex < 0) return null
        const cellIndex = getTableLayoutCellIndexAtColumn(component.bodyRows, component, 0, columnIndex)
        if (cellIndex < 0) return null
        return { rowIndex: 0, cellIndex, columnIndex, start: columnIndex, end: columnIndex }
      }

      function getTableLayoutCellIndexAtColumn(rows, component, rowIndex, columnIndex) {
        const columns = getTablePreviewColumns(component)
        const layoutRows = normalizeTablePreviewLayoutRows(rows, columns, Math.max(rowIndex + 1, Array.isArray(rows) ? rows.length : 1))
        const row = layoutRows[rowIndex] || []
        return row.findIndex((cell) => {
          const indexes = getTablePreviewLayoutColumnIndexes(columns, cell)
          if (indexes.length === 0) return false
          return columnIndex >= Math.min(...indexes) && columnIndex <= Math.max(...indexes)
        })
      }

      function getTableHeaderGroupRange(component, rowIndex, columnIndex) {
        const columns = Array.isArray(component?.columns) ? component.columns : []
        const target = getTableColumnHeaderValue(columns[columnIndex], rowIndex) ||
          getTableColumnDisplayText(columns[columnIndex])
        let start = columnIndex
        let end = columnIndex
        while (start > 0) {
          const value = getTableColumnHeaderValue(columns[start - 1], rowIndex) ||
            getTableColumnDisplayText(columns[start - 1])
          if (value !== target) break
          start -= 1
        }
        while (end + 1 < columns.length) {
          const value = getTableColumnHeaderValue(columns[end + 1], rowIndex) ||
            getTableColumnDisplayText(columns[end + 1])
          if (value !== target) break
          end += 1
        }
        return { start, end }
      }

      function handleTableHeaderCtrlClick(component, info) {
        const current = {
          componentId: component.id,
          rowIndex: info.rowIndex,
          columnIndex: info.columnIndex
        }
        const previous = selectedTableHeaderMergeCells.filter((cell) =>
          cell.componentId === current.componentId && cell.rowIndex === current.rowIndex
        )
        if (!previous.some((cell) => cell.columnIndex === current.columnIndex)) {
          previous.push(current)
        }
        selectedTableHeaderMergeCells = previous
        if (selectedTableHeaderMergeCells.length < 2) return

        const indexes = selectedTableHeaderMergeCells
          .map((cell) => cell.columnIndex)
          .sort((left, right) => left - right)
        const minIndex = indexes[0]
        const maxIndex = indexes[indexes.length - 1]
        const isContiguous = indexes.length === maxIndex - minIndex + 1 &&
          indexes.every((index, offset) => index === minIndex + offset)
        if (!isContiguous) return

        mergeOrSplitTableLayoutCells(component, 'header', current.rowIndex, minIndex, maxIndex)
        selectedTableHeaderMergeCells = []
      }

      function handleTableBodyCtrlClick(component, info) {
        const current = {
          componentId: component.id,
          rowIndex: info.rowIndex,
          cellIndex: info.cellIndex,
          columnIndex: info.columnIndex
        }
        const previous = selectedTableBodyMergeCells.filter((cell) =>
          cell.componentId === current.componentId && cell.rowIndex === current.rowIndex
        )
        if (!previous.some((cell) => cell.cellIndex === current.cellIndex)) previous.push(current)
        selectedTableBodyMergeCells = previous
        if (selectedTableBodyMergeCells.length < 2) return
        const indexes = selectedTableBodyMergeCells.map((cell) => cell.columnIndex).sort((left, right) => left - right)
        const minIndex = indexes[0]
        const maxIndex = indexes[indexes.length - 1]
        mergeOrSplitTableLayoutCells(component, 'body', current.rowIndex, minIndex, maxIndex)
        selectedTableBodyMergeCells = []
      }

      function mergeOrSplitTableLayoutCells(component, layout, rowIndex, start, end) {
        const columns = JSON.parse(JSON.stringify(component.columns || []))
        const sourceRows = layout === 'header' ? component.headerRows : component.bodyRows
        const rows = normalizeTablePreviewLayoutRows(sourceRows, columns, layout === 'header' ? getTableHeaderRows(component) : getTableRowRows(component))
        const row = rows[rowIndex]
        if (!row || start < 0 || end < start) return
        const selectedCellIndexes = row
          .map((cell, cellIndex) => ({ cell, cellIndex, indexes: getTablePreviewLayoutColumnIndexes(columns, cell) }))
          .filter((item) => item.indexes.length && Math.min(...item.indexes) >= start && Math.max(...item.indexes) <= end)
          .map((item) => item.cellIndex)
        if (selectedCellIndexes.length < 1) return
        const minCell = Math.min(...selectedCellIndexes)
        const maxCell = Math.max(...selectedCellIndexes)
        const selectedCells = row.slice(minCell, maxCell + 1)
        const alreadyMerged = selectedCells.length === 1 && (selectedCells[0].columns || []).length > 1
        if (alreadyMerged) {
          const splitCells = (selectedCells[0].columns || []).map((key) => {
            const column = columns.find((item) => String(item.field || item.name) === String(key)) || {}
            return { label: column.label || key, field: key, columns: [key] }
          })
          row.splice(minCell, 1, ...splitCells)
        } else {
          const mergedColumns = selectedCells.flatMap((cell) => cell.columns || [])
          const first = selectedCells[0] || {}
          row.splice(minCell, maxCell - minCell + 1, {
            label: first.label || mergedColumns[0] || '',
            field: first.field || mergedColumns[0] || '',
            columns: mergedColumns,
            colspan: mergedColumns.length
          })
        }
        if (layout === 'header') component.headerRows = rows
        else component.bodyRows = rows
        vscode.postMessage({
          type: 'updateTableColumns',
          id: component.id,
          columns,
          headerRows: getTableHeaderRows(component),
          rowRows: getTableRowRows(component),
          headerLayout: component.headerRows,
          bodyRows: component.bodyRows
        })
        render()
      }

      function getTableColumnHeaderValue(column, rowIndex) {
        if (Array.isArray(column?.headers)) return String(column.headers[rowIndex] || '')
        if (rowIndex === 0) return String(column?.header1 || column?.headerGroup || column?.group || '')
        if (rowIndex === 1) return String(column?.header2 || column?.headerSubGroup || '')
        return ''
      }

      function setTableColumnHeaderValue(column, rowIndex, value) {
        if (!column) return
        const headers = Array.isArray(column.headers) ? [...column.headers] : []
        headers[rowIndex] = String(value || '').trim()
        column.headers = headers
      }

      function getTableColumnDisplayText(column) {
        return String(column?.label || column?.name || column?.field || 'Column')
      }

      function getTablePreviewColumns(component) {
        const columns = Array.isArray(component?.columns) ? component.columns : []
        if (component?.table?.showModeColumn === false) return columns
        if (columns.some((column) => (column?.field || column?.name) === 'mode')) return columns
        return [{
          name: 'mode',
          label: '',
          field: 'mode',
          type: 'text',
          align: 'center',
          width: '46px',
          sortable: true,
          editable: false,
          modeColumn: true
        }, ...columns]
      }

      function getAgGridPreviewColumnSizing(column) {
        const rawWidth = String(column?.width || '').trim()
        if (!rawWidth) return { flex: 1 }

        const percentMatch = rawWidth.match(/^([0-9]+(?:\.[0-9]+)?)%$/)
        if (percentMatch) {
          return { flex: Math.max(0.1, Number.parseFloat(percentMatch[1])), minWidth: 70 }
        }

        const flexMatch = rawWidth.match(/^([0-9]+(?:\.[0-9]+)?)fr$/i)
        if (flexMatch) {
          return { flex: Math.max(0.1, Number.parseFloat(flexMatch[1])), minWidth: 70 }
        }

        const pixelMatch = rawWidth.match(/^([0-9]+(?:\.[0-9]+)?)(px)?$/i)
        if (pixelMatch) {
          return { width: Math.max(40, Math.round(Number.parseFloat(pixelMatch[1]))) }
        }

        return { flex: 1, minWidth: 70 }
      }

      function appendPreviewChild(children, child) {
        if (!child) return children
        if (Array.isArray(children)) return [...children, child]
        return children === undefined ? [child] : [children, child]
      }

      function buildProps(component, repeatIndex, scope, resizeKind, gridMetric) {
        const props = { ...(component.props || {}) }
        const classNames = []

        if (props.class) classNames.push(props.class)

        if (component.style !== undefined) {
          props.style = component.style
        }

        Object.entries(component.dynamicProps || {}).forEach(([name, expression]) => {
          const resolved = resolveValue(expression, scope)
          props[name] = resolved
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
          if (isStoreStateDrag(event.dataTransfer)) {
            event.preventDefault()
            event.stopPropagation()
            event.dataTransfer.dropEffect = 'copy'
            event.currentTarget.classList.add('qt-store-binding-drop-target')
            return
          }

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
          event.currentTarget.classList.remove('qt-store-binding-drop-target')
          clearPaletteDropTarget()
        }

        props.onDrop = (event) => {
          event.preventDefault()
          event.stopPropagation()

          const storeBinding = getStoreStateBinding(event.dataTransfer)
          if (storeBinding) {
            event.currentTarget.classList.remove('qt-store-binding-drop-target')
            clearPaletteDropTarget()
            vscode.postMessage({
              type: 'bindStoreState',
              id: component.id,
              expression: storeBinding.expression,
              storePath: storeBinding.fsPath || '',
              statePath: storeBinding.path || []
            })
            return
          }

          const paletteIndex = getPaletteDragIndex(event.dataTransfer)

          if (paletteIndex >= 0) {
            clearPaletteDropTarget()

            if (paletteIndex === tablePaletteIndex) {
              showTableWizard({
                paletteIndex,
                targetId: component.id,
                dropMode: componentCanHaveChildren(component) ? 'inside' : 'after'
              })
              return
            }

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

      function buildTablePreviewSlots(component, scope) {
        const toolbar = component.table?.toolbar || {}
        const slots = {}
        const hasToolbar = toolbar.filter || toolbar.search || toolbar.add || toolbar.save ||
          toolbar.delete || toolbar.excel || toolbar.refresh || component.table?.title

        if (hasToolbar) {
          slots.top = () => {
            const children = []
            if (component.table?.title) {
              children.push(vueRuntime.h('div', { class: 'qt-table-title' }, component.table.title))
            }
            if (toolbar.filter) {
              children.push(vueRuntime.h(resolveQuasarComponent('Input'), {
                dense: true,
                outlined: true,
                placeholder: '검색',
                class: 'qt-table-filter-preview',
                modelValue: resolveValue(component.table?.filterBinding, scope) || '',
                'onUpdate:modelValue': (value) => setResolvedValue(component.table?.filterBinding, value, scope)
              }))
            }
            const labels = { search: '검색', add: '신규', save: '저장', delete: '삭제', excel: '엑셀', refresh: '새로고침' }
            if (Object.keys(labels).some((key) => toolbar[key])) {
              children.push(vueRuntime.h('div', { class: 'qt-table-toolbar-spacer' }))
            }
            Object.keys(labels).forEach((key) => {
              if (!toolbar[key]) return
              children.push(vueRuntime.h(resolveQuasarComponent('Button'), {
                outline: true,
                unelevated: true,
                class: 'qt-table-toolbar-btn',
                color: getTableToolbarButtonColor(key),
                textColor: getTableToolbarButtonTextColor(key),
                label: labels[key],
                onClick: (event) => event.stopPropagation(),
                onDblclick: (event) => {
                  event.preventDefault()
                  event.stopPropagation()
                  vscode.postMessage({
                    type: 'openTableToolbarMethod',
                    id: component.id,
                    action: key
                  })
                }
              }))
            })
            return vueRuntime.h('div', { class: 'qt-table-toolbar-preview' }, children)
          }
        }

        if (component.table?.errorBinding) {
          slots['no-data'] = () => {
            const error = resolveValue(component.table.errorBinding, scope)
            return vueRuntime.h('div', {
              class: error ? 'qt-table-error-preview text-negative' : 'qt-table-empty-preview'
            }, error ? String(error) : (component.props?.noDataLabel || '데이터가 없습니다.'))
          }
        }

        ;(component.columns || []).forEach((column) => {
          const specialTypes = ['checkbox', 'select', 'badge', 'button', 'link', 'image', 'actions']
          if (!specialTypes.includes(column.type) && !column.editable) return
          slots['body-cell-' + column.name] = (slotProps) => {
            const cell = resolveQuasarComponent('TableCell')
            if (column.type === 'actions') {
              return vueRuntime.h(cell, { props: slotProps }, [
                vueRuntime.h(resolveQuasarComponent('Button'), { dense: true, flat: true, label: '편집' }),
                vueRuntime.h(resolveQuasarComponent('Button'), { dense: true, flat: true, color: 'negative', label: '삭제' })
              ])
            }
            let control
            if (column.type === 'checkbox') {
              control = vueRuntime.h(quasarRuntime.QCheckbox || 'q-checkbox', {
                modelValue: slotProps.row?.[column.field],
                'onUpdate:modelValue': (value) => { slotProps.row[column.field] = value }
              })
            } else if (column.type === 'select') {
              control = vueRuntime.h(resolveQuasarComponent('Select'), {
                dense: true,
                borderless: true,
                options: [],
                modelValue: slotProps.row?.[column.field],
                'onUpdate:modelValue': (value) => { slotProps.row[column.field] = value }
              })
            } else if (column.type === 'badge') {
              control = vueRuntime.h(quasarRuntime.QBadge || 'q-badge', { label: slotProps.row?.[column.field], color: 'primary' })
            } else if (column.type === 'button') {
              control = vueRuntime.h(resolveQuasarComponent('Button'), { dense: true, flat: true, label: slotProps.row?.[column.field] || column.label })
            } else if (column.type === 'link') {
              control = vueRuntime.h('a', { href: slotProps.row?.[column.field], target: '_blank' }, slotProps.row?.[column.field])
            } else if (column.type === 'image') {
              control = vueRuntime.h('img', { src: slotProps.row?.[column.field], alt: '', style: 'max-width: 80px; max-height: 48px' })
            } else {
              control = vueRuntime.h(resolveQuasarComponent('Input'), {
                dense: true,
                borderless: true,
                modelValue: slotProps.row?.[column.field],
                'onUpdate:modelValue': (value) => { slotProps.row[column.field] = value }
              })
            }
            return vueRuntime.h(cell, { props: slotProps }, [control])
          }
        })
        return slots
      }

      function resolveQuasarComponent(type) {
        const runtimeType = componentTypeMap[type] || type
        return quasarRuntime[runtimeType] || runtimeType
      }

      function resolveAgGridComponent() {
        return agGridVueRuntime.AgGridVue || 'ag-grid-vue'
      }

      function getTableToolbarButtonColor(key) {
        if (key === 'save') return 'primary'
        if (key === 'delete') return 'red'
        return 'grey-5'
      }

      function getTableToolbarButtonTextColor(key) {
        return getTableToolbarButtonColor(key) === 'grey-5' ? 'grey-8' : undefined
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
        const rootKey = keys.shift()
        if (keys.length === 0) {
          if (Object.prototype.hasOwnProperty.call(data, rootKey)) data[rootKey] = nextValue
          else if (scope && Object.prototype.hasOwnProperty.call(scope, rootKey)) scope[rootKey] = nextValue
          return
        }
        let target = roots[rootKey]

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

      ${getScreenStoreStateScript()}
      ${getStoreScript()}
      ${getTableScript()}

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
          if (paletteIndex === tablePaletteIndex) {
            showTableWizard({ paletteIndex, targetId: '', dropMode: 'inside' })
            return
          }
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
    .script-editor-workspace { display: grid; grid-template-columns: minmax(0, 1fr) 300px; min-height: calc(100vh - 42px); }
    .script-editor-shell { min-width: 0; overflow: hidden; }
    .script-editor { width: 100%; height: calc(100vh - 42px); overflow: hidden; }
    .script-editor-workspace .script-editor { height: calc(100vh - 42px); }
    .qt-script-store-drop-target { outline: 2px solid var(--vscode-focusBorder); outline-offset: -2px; }
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
    ${getScreenStoreStateStyles()}
    ${getTableStyles()}
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
