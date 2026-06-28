import {
  escapeAttribute,
  escapeJavaScriptString,
  escapeTemplateText,
  isAssignableExpression,
  toIdentifier,
} from './render-utils.mjs'

export function renderTableComponent(component, depth) {
  const indent = '  '.repeat(depth)
  const childIndent = '  '.repeat(depth + 1)
  const toolbar = component.table?.toolbar || {}
  const content = []

  if (component.table?.title || Object.values(toolbar).some(Boolean)) {
    const leftControls = []
    const buttonControls = []
    if (component.table?.title) {
      leftControls.push(`<div class="text-subtitle1">${escapeTemplateText(component.table.title)}</div>`)
    }
    if (toolbar.filter) {
      leftControls.push(`<q-input v-model="${component.table?.filterBinding || 'tableFilter'}" dense outlined placeholder="검색" />`)
    }

    const buttons = [
      ['search', '검색', 'onTableSearch'],
      ['add', '신규', 'onTableAdd'],
      ['save', '저장', 'onTableSave'],
      ['delete', '삭제', 'onTableDelete'],
      ['excel', '엑셀', 'onTableExcel'],
      ['refresh', '새로고침', 'onTableRefresh'],
    ]
    buttons.forEach(([key, label, fallbackHandler]) => {
      const handler = component.table?.handlers?.[key] || fallbackHandler
      if (toolbar[key]) {
        buttonControls.push(`<q-btn ${renderTableToolbarButtonAttrs(key)} label="${label}" @click="${handler}" />`)
      }
    })

    const controls = [
      ...leftControls,
      ...(buttonControls.length ? ['<q-space />'] : []),
      ...buttonControls,
    ]
    content.push(`${childIndent}<div class="row items-center q-gutter-sm full-width qt-table-toolbar-preview">\n${controls.map((line) => `${childIndent}  ${line}`).join('\n')}\n${childIndent}</div>`)
  }

  content.push(`${childIndent}<ag-grid-vue ${renderAgGridAttributes(component, depth + 1)} />`)

  return `${indent}<div class="qt-ag-table-wrap" @paste.capture="${getComponentApiName(component)}.handlePaste" @copy.capture="${getComponentApiName(component)}.handleCopy">\n${content.join('\n')}\n${indent}</div>`
}

function renderTableToolbarButtonAttrs(key) {
  const baseAttrs = 'outline unelevated class="qt-table-toolbar-btn" style="height: 24px; min-height: 24px; padding: 0 10px; background: rgba(255, 255, 255, 0.82); opacity: 0.72"'
  if (key === 'save') return `${baseAttrs} color="primary"`
  if (key === 'delete') return `${baseAttrs} color="red"`
  return `${baseAttrs} color="grey-5" text-color="grey-8"`
}

function renderAgGridAttributes(component, depth) {
  const attributes = [
    `ref="${getComponentRefName(component)}"`,
    'class="qt-ag-grid"',
    `style="${escapeAttribute(getAgGridStyle(component))}"`,
    `:row-data="${escapeAttribute(getTableRowsExpression(component))}"`,
    `:column-defs="${getTableColumnsVariableName(component)}"`,
    `:default-col-def="{ resizable: true, sortable: true, filter: true, minWidth: 70, suppressKeyboardEvent: (params) => ${getComponentApiName(component)}.suppressKeyboardEvent(params), cellClassRules: { 'qt-ag-copy-range-cell': (params) => ${getComponentApiName(component)}.isCellInCopyRange(params), 'qt-ag-copy-range-anchor': (params) => ${getComponentApiName(component)}.isCellCopyRangeAnchor(params) } }"`,
    ':header-height="48"',
    ':row-height="42"',
    ':animate-rows="true"',
    ':single-click-edit="false"',
    `:get-row-id="(params) => String(params.data?.__qtRowId ?? params.data?.['${escapeJavaScriptString(getTableRowKey(component))}'] ?? params.node?.rowIndex ?? '')"`,
    `@grid-ready="(event) => ${getComponentApiName(component)}.setGridApi(event.api)"`,
    `@cell-mouse-down="(event) => ${getComponentApiName(component)}.handleCellMouseDown(event)"`,
    `@cell-mouse-over="(event) => ${getComponentApiName(component)}.handleCellMouseOver(event)"`,
    `@cell-key-down="(event) => ${getComponentApiName(component)}.handleCellKeyDown(event)"`,
    `@cell-value-changed="(event) => ${getComponentApiName(component)}.handleCellValueChanged(event)"`,
  ]
  const pagination = component.table?.pagination || {}
  const selection = component.table?.selection || component.props?.selection || 'none'
  const rowClickHandler = component.events?.['row-click'] || component.events?.rowClick

  if (pagination.mode !== 'none') {
    const rowsPerPage = Number(pagination.rowsPerPage) || 10
    const options = Array.isArray(pagination.rowsPerPageOptions) ? pagination.rowsPerPageOptions : [10, 20, 50, 0]
    attributes.push(':pagination="true"')
    attributes.push(`:pagination-page-size="${rowsPerPage}"`)
    attributes.push(`:pagination-page-size-selector="${escapeAttribute(JSON.stringify(options))}"`)
  }

  if (selection === 'single' || selection === 'multiple') {
    const mode = selection === 'multiple' ? 'multiRow' : 'singleRow'
    const headerCheckbox = selection === 'multiple' ? 'true' : 'false'
    attributes.push(`:row-selection="{ mode: '${mode}', checkboxes: true, headerCheckbox: ${headerCheckbox}, enableClickSelection: false }"`)
    if (isAssignableExpression(component.models?.selected)) {
      attributes.push(`@selection-changed="(event) => ${getComponentApiName(component)}.setSelected(event.api.getSelectedRows())"`)
    }
  }

  if (isAssignableExpression(component.table?.loadingBinding)) {
    attributes.push(`:loading="${escapeAttribute(component.table.loadingBinding)}"`)
  }

  if (rowClickHandler) {
    attributes.push(`@row-clicked="(event) => ${escapeAttribute(String(rowClickHandler))}(event.event, event.data)"`)
  }

  return attributes.join('\n' + '  '.repeat(depth))
}

function getAgGridStyle(component) {
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
  return [`width: ${width}`, `height: ${height}`, ...rest].join('; ')
}

function findStyleDeclarationValue(declarations, propertyName) {
  const target = String(propertyName || '').trim().toLowerCase()
  const declaration = declarations.find((item) => {
    const separator = item.indexOf(':')
    return separator >= 0 && item.slice(0, separator).trim().toLowerCase() === target
  })
  return declaration ? declaration.slice(declaration.indexOf(':') + 1).trim() : ''
}

export function getTableRowKey(component) {
  return component.table?.rowKey || component.props?.rowKey || 'id'
}

export function renderTableColumnsExpression(columns) {
  return `[${columns.map((column) => renderAgGridColumnDefExpression(column)).join(',')}]`
}

export function getRenderableTableColumns(component) {
  const columns = Array.isArray(component?.columns) ? component.columns : []
  if (component?.table?.showModeColumn === false) return columns
  if (columns.some((column) => (column?.field || column?.name) === 'mode')) return columns
  return [
    {
      name: 'mode',
      label: '',
      field: 'mode',
      type: 'text',
      align: 'center',
      width: '46px',
      sortable: true,
      editable: false,
      modeColumn: true,
    },
    ...columns,
  ]
}

function renderAgGridColumnDefExpression(column) {
  const sizing = getAgGridColumnSizing(column)
  const align = ['left', 'center', 'right'].includes(column?.align) ? column.align : ''
  const type = column?.type || 'text'
  const value = {
    colId: String(column?.name || column?.field || 'column'),
    headerName: String(column?.label || column?.name || column?.field || 'Column'),
    field: String(column?.field || column?.name || 'column'),
    sortable: Boolean(column?.sortable),
    resizable: true,
    editable: Boolean(column?.editable),
    ...sizing,
    ...(align ? { cellStyle: { textAlign: align } } : {}),
    ...(column?.required ? { headerClass: 'qt-required-column' } : {}),
    ...(column?.modeColumn || column?.field === 'mode' ? {
      cellClass: 'qt-table-mode-cell',
      editable: false,
      headerName: '',
      minWidth: 42,
      maxWidth: 52,
    } : {}),
  }

  if (type === 'number') value.type = 'numericColumn'
  if (type === 'checkbox') value.cellRenderer = 'agCheckboxCellRenderer'
  if (type === 'badge') value.cellRenderer = (params) => params.value == null ? '' : String(params.value)
  if (type === 'button') value.cellRenderer = (params) => params.value == null ? String(value.headerName) : String(params.value)
  if (type === 'link') value.cellRenderer = (params) => params.value == null ? '' : `<a href="${String(params.value)}" target="_blank">${String(params.value)}</a>`
  if (type === 'image') value.cellRenderer = (params) => params.value == null ? '' : `<img src="${String(params.value)}" alt="" style="max-width:80px;max-height:48px" />`
  if (type === 'actions') {
    value.cellRenderer = () => '<button type="button" class="qt-ag-action-btn" style="margin-right:4px;padding:1px 7px;border:1px solid #cfd8dc;border-radius:3px;background:#fff;color:#455a64">편집</button><button type="button" class="qt-ag-action-btn qt-ag-action-danger" style="padding:1px 7px;border:1px solid #ffcdd2;border-radius:3px;background:#fff;color:#c62828">삭제</button>'
    value.sortable = false
    value.filter = false
    value.editable = false
  }

  const formatter = column?.format
  const literal = objectToJavaScriptLiteral(value)
  if (!formatter) return literal
  return `${literal.slice(0, -1)}, valueFormatter: (params) => ${formatter}(params.value, params.data) }`
}

function getAgGridColumnSizing(column) {
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

function objectToJavaScriptLiteral(value) {
  if (typeof value === 'function') return value.toString()
  if (Array.isArray(value)) return `[${value.map((item) => objectToJavaScriptLiteral(item)).join(', ')}]`
  if (value && typeof value === 'object') {
    return `{ ${Object.entries(value)
      .map(([key, item]) => `${JSON.stringify(key)}: ${objectToJavaScriptLiteral(item)}`)
      .join(', ')} }`
  }
  return JSON.stringify(value)
}

export function getTableColumnsVariableName(component) {
  const tableId = String(component?.id || 'Table')
    .replace(/[^A-Za-z0-9_$]/g, '_')
    .replace(/^(?=\d)/, '_')
  return `${tableId}_columnDefs`
}

export function getTableRowsVariableName(component) {
  return `${getComponentApiName(component)}_rows`
}

export function getTableRowsExpression(component) {
  if (component.dynamicProps?.rows) return component.dynamicProps.rows
  if (component.table?.rowsBinding) return component.table.rowsBinding
  return getTableRowsVariableName(component)
}

export function getComponentApiName(component) {
  return toIdentifier(component?.id || component?.type || 'component')
}

export function getComponentRefName(component) {
  return `${getComponentApiName(component)}Ref`
}
