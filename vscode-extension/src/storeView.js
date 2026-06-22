function getStoreHtml() {
  return `<div id="pinia-store-dialog" class="designer-dialog-backdrop hidden">
  <div class="designer-dialog pinia-store-dialog" role="dialog" aria-modal="true" aria-labelledby="pinia-store-dialog-title">
    <div class="designer-dialog-header">
      <strong id="pinia-store-dialog-title">Store 신규 추가</strong>
      <button class="designer-dialog-close" type="button" data-store-dialog-close aria-label="닫기">×</button>
    </div>
    <div class="designer-dialog-body">
      <label class="field">
        <span>파일 경로</span>
        <input type="text" data-store-path placeholder="예: education/course">
      </label>
      <label class="field">
        <span>파일명</span>
        <input type="text" data-store-file-name placeholder="예: courseStore">
      </label>
      <label class="field">
        <span>Store 명칭</span>
        <input type="text" data-store-const-name placeholder="예: useCourseStore">
      </label>
      <label class="field">
        <span>Store ID</span>
        <input type="text" data-store-id placeholder="예: course">
      </label>
      <div class="error-text hidden" data-store-dialog-error></div>
    </div>
    <div class="designer-dialog-actions">
      <button type="button" data-store-dialog-cancel>취소</button>
      <button class="primary" type="button" data-store-dialog-submit>생성</button>
    </div>
  </div>
</div>`;
}

function getStoreScript() {
  return [
    renderPiniaStores,
    getActivePiniaStore,
    storeTextField,
    renderStoreStateTree,
    renderStoreMembers,
    renderStoreDetail,
    setupStoreEditorEvents,
    updateStoreStateRow,
    getStoreStateContainer,
    scheduleStoreSave,
    storeValueType,
    storeValueText,
    parseStoreValue,
    storeBodySummary,
    setupPiniaStoreDialog,
    showPiniaStoreDialog,
    hidePiniaStoreDialog,
    submitPiniaStoreDialog,
    validatePiniaStoreDialog,
    setPiniaStoreDialogError,
    stripStoreExtension,
    defaultStoreId,
    defaultStoreConstName,
  ].map((fn) => fn.toString()).join("\n\n");
}



function renderPiniaStores(content) {
  if (piniaStores.length === 0) {
    content.innerHTML = '<div class="empty">등록된 Pinia Store가 없습니다.</div>'
    return
  }
  const store = getActivePiniaStore()
  if (!store?.definition) {
    content.innerHTML = '<div class="empty">Store JSON을 읽을 수 없습니다.</div>'
    return
  }
  const definition = store.definition
  definition.designer ||= {}
  definition.designer.stateNotes ||= {}

  content.innerHTML =
    '<div class="store-file-tabs" role="tablist" aria-label="연결된 Store">' +
      piniaStores.map((item) => '<button type="button" role="tab" class="store-file-tab' +
        (item.fsPath === store.fsPath ? ' active' : '') + '" data-store-tab="' + escapeAttr(item.fsPath) +
        '" aria-selected="' + (item.fsPath === store.fsPath) + '">' + escapeHtml(item.tabName || item.constName || item.fileName) + '</button>').join('') +
      '</div>' +
    '<div class="store-editor-layout"><section class="store-editor-sidebar">' +
      '<div class="store-section"><h3>Pinia Store</h3>' +
        storeTextField('Store Name', 'constName', definition.store.constName) +
        storeTextField('Store ID', 'defineStoreId', definition.store.defineStoreId) + '</div>' +
      '<div class="store-section"><div class="store-section-title"><h3>State</h3><button type="button" data-add-state>+ 추가</button></div>' +
        '<div class="store-state-tree">' + renderStoreStateTree(definition.state || {}, []) + '</div></div>' +
      renderStoreMembers('getters', definition.getters || [], 'Getters') +
      renderStoreMembers('actions', definition.actions || [], 'Actions') +
    '</section><section class="store-editor-detail">' + renderStoreDetail(definition) + '</section></div>'

  setupStoreEditorEvents(content, store)
}

function getActivePiniaStore() {
  return piniaStores.find((store) => store.fsPath === activePiniaStorePath) || piniaStores[0]
}

function storeTextField(label, field, value) {
  return '<label class="store-meta-field"><span>' + label + '</span>' +
    '<input data-store-meta="' + field + '" value="' + escapeAttr(value || '') + '"></label>'
}

function renderStoreStateTree(value, path) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return ''
  return Object.entries(value).map(([name, child]) => {
    const childPath = [...path, name]
    const selected = JSON.stringify(childPath) === JSON.stringify(selectedStoreStatePath)
    const expandable = child && typeof child === 'object' && !Array.isArray(child)
    return '<div class="store-state-node"><button type="button" class="store-state-row' + (selected ? ' selected' : '') +
      '" data-state-path="' + encodeURIComponent(JSON.stringify(childPath)) + '" data-state-object="' + expandable + '"><span>' +
      (expandable ? '+ ' : '') + escapeHtml(name) + '</span><small>' + storeValueType(child) + '</small></button>' +
      (expandable ? '<div class="store-state-children">' + renderStoreStateTree(child, childPath) + '</div>' : '') + '</div>'
  }).join('')
}

function renderStoreMembers(kind, members, title) {
  return '<div class="store-section"><div class="store-section-title"><h3>' + title + '</h3>' +
    '<button type="button" data-add-member="' + kind + '">+ 추가</button></div><div class="store-member-list">' +
    members.map((member, index) => {
      const selected = selectedStoreMember?.kind === kind && selectedStoreMember?.index === index
      if (kind === 'getters') {
        return '<div class="store-member-row' + (selected ? ' selected' : '') + '" data-member-kind="getters" data-member-index="' + index + '">' +
          '<input data-member-field="name" value="' + escapeAttr(member.name || '') + '" aria-label="Getter 명">' +
          '<input data-member-field="summary" value="' + escapeAttr(storeBodySummary(member.body)) + '" aria-label="Return 식">' +
          '<button type="button" class="store-delete" data-remove-member="getters" data-member-index="' + index + '">×</button></div>'
      }
      return '<div class="store-member-row action' + (selected ? ' selected' : '') + '" data-member-kind="actions" data-member-index="' + index + '">' +
        '<input data-member-field="name" value="' + escapeAttr(member.name || '') + '" aria-label="Action 명">' +
        '<label class="store-async"><input type="checkbox" data-member-field="async"' + (member.async !== false ? ' checked' : '') + '> async</label>' +
        '<input data-member-field="description" value="' + escapeAttr(member.description || '') + '" aria-label="참고사항">' +
        '<button type="button" class="store-delete" data-remove-member="actions" data-member-index="' + index + '">×</button></div>'
    }).join('') + '</div></div>'
}

function renderStoreDetail(definition) {
  if (selectedStoreMember) {
    const member = definition[selectedStoreMember.kind]?.[selectedStoreMember.index]
    if (member) {
      return '<div class="store-script-editor"><div class="store-detail-heading">함수명 : ' + escapeHtml(member.name || '') + '</div>' +
        '<label>Parameters<input data-member-params value="' + escapeAttr((member.params || []).join(', ')) + '" placeholder="예: rows, options"></label>' +
        '<textarea data-member-body spellcheck="false">' + escapeHtml(member.body || '') + '</textarea></div>'
    }
  }
  const container = getStoreStateContainer(definition.state || {}, selectedStoreStatePath)
  const notes = definition.designer?.stateNotes || {}
  return '<div class="store-state-detail"><div class="store-detail-heading">State</div><button type="button" class="store-detail-add" data-add-state>+ 추가</button>' +
    '<div class="store-state-table"><div class="store-state-table-head"><span>이름</span><span>타입</span><span>초기값</span><span>참고사항</span><span>삭제</span></div>' +
    Object.entries(container).map(([name, value]) => {
      const pathKey = [...selectedStoreStatePath, name].join('.')
      return '<div class="store-state-table-row" data-state-name="' + escapeAttr(name) + '">' +
        '<input data-state-field="name" value="' + escapeAttr(name) + '"><select data-state-field="type">' +
        ['array', 'object', 'string', 'number', 'boolean', 'null'].map((type) => '<option value="' + type + '"' + (storeValueType(value) === type ? ' selected' : '') + '>' + type + '</option>').join('') +
        '</select><input data-state-field="value" value="' + escapeAttr(storeValueText(value)) + '">' +
        '<input data-state-field="note" value="' + escapeAttr(notes[pathKey] || '') + '">' +
        '<button type="button" class="store-delete" data-remove-state="' + escapeAttr(name) + '">×</button></div>'
    }).join('') + '</div></div>'
}

function setupStoreEditorEvents(content, store) {
  const definition = store.definition
  content.querySelectorAll('[data-store-tab]').forEach((button) => button.addEventListener('click', () => {
    activePiniaStorePath = button.dataset.storeTab; selectedStoreStatePath = []; selectedStoreMember = null; render()
  }))
  content.querySelectorAll('[data-store-meta]').forEach((input) => input.addEventListener('change', () => {
    definition.store[input.dataset.storeMeta] = input.value.trim(); scheduleStoreSave(store)
  }))
  content.querySelectorAll('[data-state-path]').forEach((button) => button.addEventListener('click', () => {
    const path = JSON.parse(decodeURIComponent(button.dataset.statePath))
    selectedStoreStatePath = button.dataset.stateObject === 'true' ? path : path.slice(0, -1)
    selectedStoreMember = null; render()
  }))
  content.querySelectorAll('[data-add-state]').forEach((button) => button.addEventListener('click', () => {
    const container = getStoreStateContainer(definition.state, selectedStoreStatePath)
    let index = 1; while (Object.prototype.hasOwnProperty.call(container, 'state' + index)) index += 1
    container['state' + index] = null; scheduleStoreSave(store); render()
  }))
  content.querySelectorAll('.store-state-table-row').forEach((row) => row.querySelectorAll('[data-state-field]').forEach((input) =>
    input.addEventListener('change', () => updateStoreStateRow(store, row))))
  content.querySelectorAll('[data-remove-state]').forEach((button) => button.addEventListener('click', () => {
    delete getStoreStateContainer(definition.state, selectedStoreStatePath)[button.dataset.removeState]
    scheduleStoreSave(store); render()
  }))
  content.querySelectorAll('[data-add-member]').forEach((button) => button.addEventListener('click', () => {
    const kind = button.dataset.addMember; const list = definition[kind] ||= []; const base = kind === 'getters' ? 'getter' : 'action'
    let index = 1; while (list.some((item) => item.name === base + index)) index += 1
    list.push(kind === 'getters' ? { name: base + index, params: ['state'], body: 'return undefined' } : { name: base + index, params: [], async: true, body: '', description: '' })
    selectedStoreMember = { kind, index: list.length - 1 }; scheduleStoreSave(store); render()
  }))
  content.querySelectorAll('[data-member-kind]').forEach((row) => row.addEventListener('click', (event) => {
    if (event.target.closest('[data-remove-member]')) return
    selectedStoreMember = { kind: row.dataset.memberKind, index: Number(row.dataset.memberIndex) }; selectedStoreStatePath = []
    if (!event.target.closest('input, label')) render()
  }))
  content.querySelectorAll('[data-member-field]').forEach((input) => input.addEventListener('change', () => {
    const row = input.closest('[data-member-kind]'); const member = definition[row.dataset.memberKind][Number(row.dataset.memberIndex)]
    if (input.dataset.memberField === 'async') member.async = input.checked
    else if (input.dataset.memberField === 'summary') member.body = input.value.trim() ? (input.value.trim().startsWith('return ') ? input.value.trim() : 'return ' + input.value.trim()) : 'return undefined'
    else member[input.dataset.memberField] = input.value
    scheduleStoreSave(store); render()
  }))
  content.querySelectorAll('[data-remove-member]').forEach((button) => button.addEventListener('click', () => {
    definition[button.dataset.removeMember].splice(Number(button.dataset.memberIndex), 1); selectedStoreMember = null; scheduleStoreSave(store); render()
  }))
  content.querySelector('[data-member-params]')?.addEventListener('change', (event) => {
    definition[selectedStoreMember.kind][selectedStoreMember.index].params = event.target.value.split(',').map((value) => value.trim()).filter(Boolean); scheduleStoreSave(store)
  })
  content.querySelector('[data-member-body]')?.addEventListener('change', (event) => {
    definition[selectedStoreMember.kind][selectedStoreMember.index].body = event.target.value; scheduleStoreSave(store)
  })
}

function updateStoreStateRow(store, row) {
  const definition = store.definition; const container = getStoreStateContainer(definition.state, selectedStoreStatePath)
  const oldName = row.dataset.stateName; const name = row.querySelector('[data-state-field="name"]').value.trim()
  if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name)) return
  const type = row.querySelector('[data-state-field="type"]').value
  const value = parseStoreValue(type, row.querySelector('[data-state-field="value"]').value)
  if (name !== oldName) {
    const entries = Object.entries(container).map(([key, item]) => [key === oldName ? name : key, key === oldName ? value : item])
    Object.keys(container).forEach((key) => delete container[key]); entries.forEach(([key, item]) => { container[key] = item })
  } else container[name] = value
  definition.designer ||= {}; definition.designer.stateNotes ||= {}
  definition.designer.stateNotes[[...selectedStoreStatePath, name].join('.')] = row.querySelector('[data-state-field="note"]').value
  scheduleStoreSave(store); render()
}

function getStoreStateContainer(state, path) {
  return path.reduce((value, key) => value?.[key], state) || state
}

function scheduleStoreSave(store) {
  clearTimeout(storeSaveTimer)
  storeSaveTimer = setTimeout(() => vscode.postMessage({ type: 'updatePiniaStore', fsPath: store.fsPath, definition: store.definition }), 250)
}

function storeValueType(value) {
  if (value === null) return 'null'
  if (Array.isArray(value)) return 'array'
  return typeof value
}

function storeValueText(value) {
  return typeof value === 'string' ? value : JSON.stringify(value)
}

function parseStoreValue(type, value) {
  if (type === 'null') return null
  if (type === 'string') return value
  if (type === 'number') return Number(value) || 0
  if (type === 'boolean') return String(value).toLowerCase() === 'true'
  try { return JSON.parse(value || (type === 'array' ? '[]' : '{}')) } catch { return type === 'array' ? [] : {} }
}

function storeBodySummary(body) {
  return String(body || '').trim().replace(/^return\s+/, '')
}

function setupPiniaStoreDialog() {
  const dialog = document.getElementById('pinia-store-dialog')
  if (!dialog) return
  const fileNameInput = dialog.querySelector('[data-store-file-name]')

  fileNameInput.addEventListener('input', () => {
    const fileName = stripStoreExtension(fileNameInput.value.trim())
    dialog.querySelector('[data-store-const-name]').value = defaultStoreConstName(fileName)
    dialog.querySelector('[data-store-id]').value = defaultStoreId(fileName)
  })

  dialog.querySelector('[data-store-dialog-close]').addEventListener('click', hidePiniaStoreDialog)
  dialog.querySelector('[data-store-dialog-cancel]').addEventListener('click', hidePiniaStoreDialog)
  dialog.querySelector('[data-store-dialog-submit]').addEventListener('click', submitPiniaStoreDialog)
  dialog.addEventListener('pointerdown', (event) => {
    if (event.target === dialog) hidePiniaStoreDialog()
  })
  dialog.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      hidePiniaStoreDialog()
    }
  })
}

function showPiniaStoreDialog() {
  const dialog = document.getElementById('pinia-store-dialog')
  if (!dialog) return
  const pageName = model?.page?.id || model?.page?.name || 'exampleStore'
  const fileName = stripStoreExtension(pageName)
  dialog.querySelector('[data-store-path]').value = ''
  dialog.querySelector('[data-store-file-name]').value = fileName
  dialog.querySelector('[data-store-const-name]').value = defaultStoreConstName(fileName)
  dialog.querySelector('[data-store-id]').value = defaultStoreId(fileName)
  setPiniaStoreDialogError('')
  dialog.classList.remove('hidden')
  dialog.querySelector('[data-store-path]').focus()
}

function hidePiniaStoreDialog() {
  document.getElementById('pinia-store-dialog')?.classList.add('hidden')
}

function submitPiniaStoreDialog() {
  const dialog = document.getElementById('pinia-store-dialog')
  if (!dialog) return
  const options = {
    storePath: dialog.querySelector('[data-store-path]').value.trim(),
    fileName: stripStoreExtension(dialog.querySelector('[data-store-file-name]').value.trim()),
    constName: dialog.querySelector('[data-store-const-name]').value.trim(),
    defineStoreId: dialog.querySelector('[data-store-id]').value.trim()
  }
  const error = validatePiniaStoreDialog(options)
  if (error) {
    setPiniaStoreDialogError(error)
    return
  }

  hidePiniaStoreDialog()
  vscode.postMessage({ type: 'createPiniaStore', options })
}

function validatePiniaStoreDialog(options) {
  const normalizedPath = options.storePath.split(String.fromCharCode(92)).join('/').split('/').filter(Boolean).join('/')
  if (normalizedPath.split('/').some((part) => part === '.' || part === '..')) return '상대 경로만 사용할 수 있습니다.'
  if (/[<>:"|?*]/.test(normalizedPath)) return '파일 경로에 사용할 수 없는 문자가 있습니다.'
  if (!options.fileName) return '파일명을 입력하세요.'
  if (options.fileName.includes('/') || options.fileName.includes(String.fromCharCode(92)) || /[<>:"|?*]/.test(options.fileName)) return '파일명에 사용할 수 없는 문자가 있습니다.'
  if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(options.constName)) return 'Store 명칭은 JavaScript 식별자 형식이어야 합니다.'
  if (!options.defineStoreId) return 'Store ID를 입력하세요.'
  return ''
}

function setPiniaStoreDialogError(message) {
  const error = document.querySelector('[data-store-dialog-error]')
  if (!error) return
  error.textContent = message
  error.classList.toggle('hidden', !message)
}

function stripStoreExtension(value) {
  return String(value || '').replace(/\.(json|js)$/i, '')
}

function defaultStoreId(fileName) {
  const base = String(fileName || '').replace(/Store$/i, '') || fileName
  return base ? base.charAt(0).toLowerCase() + base.slice(1) : ''
}

function defaultStoreConstName(fileName) {
  const base = String(fileName || '').replace(/Store$/i, '')
  const pascalName = base.split(/[^A-Za-z0-9]+/).filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join('')
  return 'use' + (pascalName || 'Example') + 'Store'
}

function getStoreStyles() {
  return `.store-file-tabs { display: flex; min-height: 40px; padding: 5px 10px 0; align-items: end; overflow-x: auto; border-bottom: 1px solid var(--vscode-panel-border); background: var(--vscode-sideBar-background); }
.store-file-tab { flex: 0 0 auto; min-width: 110px; min-height: 34px; padding: 6px 14px; border: 1px solid transparent; border-bottom: 0; color: var(--vscode-descriptionForeground); background: transparent; }
.store-file-tab:hover { background: var(--vscode-list-hoverBackground); }
.store-file-tab.active { color: var(--vscode-editor-foreground); border-color: var(--vscode-panel-border); background: var(--vscode-editor-background); }
.store-editor-layout { display: grid; grid-template-columns: minmax(340px, 42%) minmax(420px, 1fr); min-height: calc(100vh - 80px); }
.store-editor-sidebar { padding: 8px; overflow: auto; border-right: 1px solid var(--vscode-panel-border); }
.store-editor-detail { position: relative; padding: 14px; overflow: auto; }
.store-section { margin-bottom: 10px; border: 1px solid var(--vscode-panel-border); border-radius: 5px; overflow: hidden; }
.store-section h3 { margin: 0; padding: 8px 10px; border-left: 4px solid var(--vscode-focusBorder); font-size: 14px; font-weight: 600; }
.store-section-title { display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--vscode-panel-border); }
.store-section-title button, .store-detail-add { min-height: 26px; margin-right: 7px; padding: 3px 9px; border: 0; border-radius: 3px; color: var(--vscode-button-foreground); background: var(--vscode-button-background); }
.store-meta-field { display: grid; grid-template-columns: 100px 1fr; gap: 8px; padding: 5px 9px; align-items: center; }
.store-meta-field span { color: var(--vscode-descriptionForeground); }
.store-state-tree { min-height: 92px; padding: 5px 8px 8px; }
.store-state-row { display: flex; width: 100%; min-height: 25px; padding: 3px 6px; align-items: center; justify-content: space-between; border: 0; color: var(--vscode-editor-foreground); background: transparent; text-align: left; }
.store-state-row:hover, .store-state-row.selected { background: var(--vscode-list-hoverBackground); }
.store-state-row.selected { outline: 1px solid var(--vscode-focusBorder); }
.store-state-row small { color: var(--vscode-descriptionForeground); }
.store-state-children { margin-left: 16px; padding-left: 8px; border-left: 1px solid var(--vscode-tree-indentGuidesStroke, var(--vscode-panel-border)); }
.store-member-list { padding: 6px; }
.store-member-row { display: grid; grid-template-columns: minmax(100px, .8fr) minmax(130px, 1.4fr) 28px; gap: 5px; padding: 4px; border: 1px solid transparent; }
.store-member-row.action { grid-template-columns: minmax(90px, .8fr) 72px minmax(100px, 1fr) 28px; }
.store-member-row.selected { border-color: var(--vscode-focusBorder); background: var(--vscode-list-activeSelectionBackground); }
.store-async { display: flex; gap: 4px; align-items: center; justify-content: center; color: var(--vscode-descriptionForeground); }
.store-async input { width: auto; min-height: auto; }
.store-delete { width: 28px; min-height: 28px; padding: 0; border: 1px solid transparent; color: var(--vscode-errorForeground); background: transparent; font-size: 18px; }
.store-delete:hover { border-color: var(--vscode-errorForeground); }
.store-detail-heading { margin-bottom: 12px; padding: 7px 10px; border-left: 4px solid var(--vscode-focusBorder); font-size: 16px; font-weight: 600; }
.store-detail-add { position: absolute; top: 16px; right: 10px; }
.store-state-table { min-width: 620px; border: 1px solid var(--vscode-panel-border); }
.store-state-table-head, .store-state-table-row { display: grid; grid-template-columns: 1.2fr .8fr 1fr 1.2fr 44px; }
.store-state-table-head { color: var(--vscode-button-foreground); background: var(--vscode-button-background); font-weight: 600; }
.store-state-table-head span { padding: 7px; text-align: center; border-right: 1px solid var(--vscode-panel-border); }
.store-state-table-row > input, .store-state-table-row > select, .store-state-table-row > button { border-width: 0 1px 1px 0; }
.store-script-editor { display: grid; grid-template-rows: auto auto minmax(300px, 1fr); min-height: calc(100vh - 110px); }
.store-script-editor label { display: grid; grid-template-columns: 90px 1fr; gap: 8px; margin-bottom: 8px; align-items: center; color: var(--vscode-descriptionForeground); }
.store-script-editor textarea { width: 100%; min-height: 360px; padding: 12px; resize: none; border: 1px solid var(--vscode-panel-border); color: var(--vscode-editor-foreground); background: var(--vscode-editor-background); font-family: var(--vscode-editor-font-family); font-size: var(--vscode-editor-font-size); line-height: 1.5; tab-size: 2; }
.store-script-editor textarea:focus { outline: 1px solid var(--vscode-focusBorder); }
@media (max-width: 900px) { .store-editor-layout { grid-template-columns: 1fr; } .store-editor-sidebar { border-right: 0; border-bottom: 1px solid var(--vscode-panel-border); } }
.pinia-store-dialog { width: min(440px, calc(100vw - 32px)); }`;
}

module.exports = { getStoreHtml, getStoreScript, getStoreStyles };
