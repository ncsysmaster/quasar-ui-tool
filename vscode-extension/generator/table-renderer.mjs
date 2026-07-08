import {
  escapeAttribute,
  escapeJavaScriptString,
  escapeTemplateText,
  isAssignableExpression,
  toIdentifier,
} from './render-utils.mjs'

// ---- AG-Grid template / attribute rendering ----

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
  const headerRows = getTableHeaderRows(component)
  const headerHeight = headerRows > 1 ? 32 : 48
  const rowRows = getTableRowRows(component)
  const expandedBodyRows = usesExpandedBodyRows(component)
  const rowHeight = expandedBodyRows ? 42 : 42 * rowRows
  const attributes = [
    `ref="${getComponentRefName(component)}"`,
    'class="qt-ag-grid"',
    `style="${escapeAttribute(getAgGridStyle(component))}"`,
    `:row-data="${escapeAttribute(getTableRowDataExpression(component))}"`,
    `:column-defs="${getTableColumnsVariableName(component)}"`,
    `:default-col-def="{ resizable: true, sortable: true, filter: true, minWidth: 70, suppressKeyboardEvent: (params) => ${getComponentApiName(component)}.suppressKeyboardEvent(params), cellClassRules: { 'qt-ag-copy-range-cell': (params) => ${getComponentApiName(component)}.isCellInCopyRange(params), 'qt-ag-copy-range-anchor': (params) => ${getComponentApiName(component)}.isCellCopyRangeAnchor(params) } }"`,
    `:header-height="${headerHeight}"`,
    `:row-height="${rowHeight}"`,
    ':animate-rows="true"',
    ':single-click-edit="false"',
    `:get-row-id="(params) => String(params.data?.__qtDisplayRowId ?? params.data?.__qtRowId ?? params.data?.['${escapeJavaScriptString(getTableRowKey(component))}'] ?? params.node?.rowIndex ?? '')"`,
    `@grid-ready="(event) => ${getComponentApiName(component)}.setGridApi(event.api)"`,
    `@cell-mouse-down="(event) => ${getComponentApiName(component)}.handleCellMouseDown(event)"`,
    `@cell-mouse-over="(event) => ${getComponentApiName(component)}.handleCellMouseOver(event)"`,
    `@cell-key-down="(event) => ${getComponentApiName(component)}.handleCellKeyDown(event)"`,
    `@cell-value-changed="(event) => ${getComponentApiName(component)}.handleCellValueChanged(event)"`,
  ]
  const pagination = component.table?.pagination || {}
  const selection = component.table?.selection || component.props?.selection || 'none'
  const rowClickHandler = component.events?.['row-click'] || component.events?.rowClick

  if (headerRows > 1) {
    attributes.push(':group-header-height="32"')
  }
  if (expandedBodyRows) {
    attributes.push(':suppress-row-transform="true"')
    attributes.push(':enable-cell-span="true"')
    attributes.push(':get-row-class="getAgGridDisplayRowClass"')
  }

  if (pagination.mode !== 'none') {
    const rowsPerPage = Number(pagination.rowsPerPage) || 10
    const options = Array.isArray(pagination.rowsPerPageOptions) ? pagination.rowsPerPageOptions : [10, 20, 50, 0]
    attributes.push(':pagination="true"')
    attributes.push(`:pagination-page-size="${rowsPerPage}"`)
    attributes.push(`:pagination-page-size-selector="${escapeAttribute(JSON.stringify(options))}"`)
  }

  if (selection === 'single' || selection === 'multiple') {
    const mode = selection === 'multiple' ? 'multiRow' : 'singleRow'
    attributes.push(`:row-selection="{ mode: '${mode}', checkboxes: false, headerCheckbox: false, enableClickSelection: false }"`)
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

// ---- header/body layout normalization engine ----

export function getTableRowKey(component) {
  return component.table?.rowKey || component.props?.rowKey || 'id'
}

export function renderTableColumnsExpression(columns, headerRows = 1, rowRows = 1, headerLayout = null, bodyLayout = null) {
  const groupDepth = getTableHeaderRows({ table: { headerRows } }) - 1
  const bodyRows = getTableRowRows({ table: { rowRows } })
  const logicalRowSpan = bodyRows > 1
  const hasExplicitLayout = Array.isArray(headerLayout) || Array.isArray(bodyLayout)
  const sourceColumns = Array.isArray(columns) ? columns : []
  if (hasExplicitLayout) {
    const layoutColumns = applyHeaderLayoutToColumns(sourceColumns, headerLayout, headerRows)
    const useExpandedBodyRows = bodyRows > 1 && Array.isArray(bodyLayout)
    const bodyRegions = useExpandedBodyRows ? new Map() : createBodyLayoutRegions(layoutColumns, bodyLayout, bodyRows)
    const bodyConfigs = useExpandedBodyRows ? createBodyLayoutColumnConfigs(layoutColumns, bodyLayout, bodyRows) : new Map()
    const renderColumns = groupDepth > 0
      ? prepareColumnsForHeaderRows(layoutColumns, groupDepth)
      : layoutColumns
    const expressions = groupDepth > 0
      ? renderAgGridColumnGroups(renderColumns, groupDepth, 0, bodyRows, bodyRegions, 0, bodyConfigs, logicalRowSpan)
      : renderColumns.map((column, index) => renderAgGridColumnDefExpression(column, {
          bodyRegion: bodyRegions.get(getColumnFieldKey(column)) || bodyRegions.get(index),
          bodyConfig: bodyConfigs.get(getColumnFieldKey(column)) || bodyConfigs.get(index),
          logicalRowSpan,
        }))
    return `[${expressions.join(',')}]`
  }
  const renderColumns = groupDepth > 0
    ? prepareColumnsForHeaderRows(columns, groupDepth)
    : (Array.isArray(columns) ? columns : [])
  const expressions = groupDepth > 0
    ? renderAgGridColumnGroups(renderColumns, groupDepth, 0, bodyRows, new Map(), 0, new Map(), logicalRowSpan)
    : renderColumns.map((column) => renderAgGridColumnDefExpression(column, { logicalRowSpan }))
  return `[${expressions.join(',')}]`
}

function applyHeaderLayoutToColumns(columns, headerLayout, headerRows) {
  const nextColumns = (Array.isArray(columns) ? columns : []).map((column) => ({ ...column }))
  const visibleRows = getTableHeaderRows({ table: { headerRows } })
  const groupRows = Math.max(0, visibleRows - 1)
  const layoutRows = normalizeTableLayoutRows(headerLayout, nextColumns, visibleRows, 'header')
  const coveredCells = new Set()

  layoutRows.forEach((row, rowIndex) => {
    row.forEach((cell) => {
      const columnIndexes = getLayoutColumnIndexes(nextColumns, cell)
        .filter((columnIndex) => !coveredCells.has(`${rowIndex}:${columnIndex}`))
      if (columnIndexes.length === 0) return

      const rowSpan = Math.max(1, Math.min(visibleRows - rowIndex, Number(cell?.rowspan || 1)))
      const spansToLeafRow = rowIndex < groupRows && rowIndex + rowSpan >= visibleRows

      columnIndexes.forEach((columnIndex) => {
        if (rowIndex >= groupRows) {
          nextColumns[columnIndex].label = String(cell.label || nextColumns[columnIndex].label || nextColumns[columnIndex].name || '')
        } else if (spansToLeafRow && columnIndexes.length === 1) {
          nextColumns[columnIndex].label = String(cell.label || nextColumns[columnIndex].label || nextColumns[columnIndex].name || '')
          nextColumns[columnIndex].__qtHeaderLeafDepth = rowIndex
          nextColumns[columnIndex].__qtForceHeaderRows = false
        } else {
          const headers = Array.isArray(nextColumns[columnIndex].headers) ? [...nextColumns[columnIndex].headers] : []
          headers[rowIndex] = String(cell.label || nextColumns[columnIndex].label || nextColumns[columnIndex].name || '')
          nextColumns[columnIndex].headers = headers
          nextColumns[columnIndex].__qtForceHeaderRows = true
        }
      })

      if (rowSpan > 1) {
        for (let nextRowIndex = rowIndex + 1; nextRowIndex < rowIndex + rowSpan; nextRowIndex += 1) {
          columnIndexes.forEach((columnIndex) => coveredCells.add(`${nextRowIndex}:${columnIndex}`))
        }
      }
    })
  })
  return nextColumns
}

function normalizeTableLayoutRows(rows, columns, rowCount = 1, kind = 'body') {
  const columnKeys = (columns || []).map(getColumnFieldKey)
  const count = Math.min(3, Math.max(1, Math.round(Number(rowCount) || 1)))
  const defaults = createDefaultTableLayoutRows(columns, count, kind)
  const source = Array.isArray(rows) && rows.length > 0 ? rows.slice(0, count) : []
  while (source.length < count) source.push(defaults[source.length] || defaults[0] || [])
  const usedCellIds = new Set()
  const normalizedRows = source.map((row, rowIndex) => {
    const cells = Array.isArray(row) ? row : []
    const normalized = []
    let cursor = 0
    cells.forEach((cell, cellIndex) => {
      const rawKeys = Array.isArray(cell?.columns)
        ? cell.columns.map(String).filter(Boolean)
        : (cell?.field ? [String(cell.field)] : [])
      const startKey = rawKeys.find((key) => columnKeys.includes(key)) || columnKeys[cursor] || ''
      const start = columnKeys.indexOf(startKey)
      if (start < 0) return
      const span = Math.max(1, Math.min(columnKeys.length - start, Number(cell?.colspan || rawKeys.length || 1)))
      const keys = columnKeys.slice(start, start + span)
      cursor = start + span
      const nextCell = {
        cellId: getTableLayoutCellId(cell, kind, rowIndex, keys, cellIndex, usedCellIds),
        label: String(cell?.label || keys[0] || ''),
        field: String(cell?.field || keys[0] || ''),
        columns: keys,
        colspan: span,
        rowspan: Math.max(1, Math.min(count - rowIndex, Number(cell?.rowspan || 1))),
      }
      normalized.push(nextCell)
    })
    return normalized.length > 0 ? normalized : createDefaultTableLayoutRows(columns, 1, kind)[0]
  })
  normalizedRows.forEach((row) => row.forEach((cell) => delete cell.navigation))
  return normalizedRows
}

function createDefaultTableLayoutRows(columns, rowCount = 1, kind = 'body') {
  return Array.from({ length: Math.min(3, Math.max(1, Number(rowCount) || 1)) }, (_, rowIndex) =>
    (columns || []).map((column, columnIndex) => ({
      cellId: createTableLayoutCellId(kind, rowIndex, [getColumnFieldKey(column)], columnIndex),
      label: kind === 'header' && rowIndex > 0
        ? `title${columnIndex + 1}`
        : String(column?.label || column?.name || column?.field || 'Column'),
      field: getColumnFieldKey(column),
      columns: [getColumnFieldKey(column)],
      colspan: 1,
      rowspan: 1,
    }))
  )
}

function createTableLayoutCellId(kind, rowIndex, keys, cellIndex = 0) {
  const rawKey = (Array.isArray(keys) ? keys : [])
    .map((key) => String(key || '').trim())
    .filter(Boolean)
    .join('_') || `cell${Number(cellIndex) + 1}`
  const safeKey = rawKey
    .replace(/[^A-Za-z0-9_가-힣-]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'cell'
  return `${String(kind || 'body')}_r${Number(rowIndex) + 1}_${safeKey}`
}

function getTableLayoutCellId(cell, kind, rowIndex, keys, cellIndex, usedCellIds = new Set()) {
  const raw = String(cell?.cellId || '').trim()
  let cellId = raw || createTableLayoutCellId(kind, rowIndex, keys, cellIndex)
  if (usedCellIds.has(cellId)) {
    const base = cellId
    let sequence = 2
    while (usedCellIds.has(cellId)) {
      cellId = `${base}_${sequence}`
      sequence += 1
    }
  }
  usedCellIds.add(cellId)
  return cellId
}

function getColumnFieldKey(column) {
  return String(column?.field || column?.name || '').trim()
}

function getLayoutCellColumns(cell) {
  if (Array.isArray(cell?.columns)) return cell.columns.map(String).filter(Boolean)
  if (cell?.field) return [String(cell.field)]
  return []
}

function getLayoutColumnIndexes(columns, cell) {
  const keys = getLayoutCellColumns(cell)
  return keys
    .map((key) => columns.findIndex((column) => getColumnFieldKey(column) === key))
    .filter((index) => index >= 0)
}

function createBodyLayoutRegions(columns, bodyLayout, rowRows) {
  const regions = new Map()
  const rowCount = getTableRowRows({ table: { rowRows } })
  if (rowCount <= 1 && !Array.isArray(bodyLayout)) return regions
  const layoutRows = normalizeTableLayoutRows(bodyLayout, columns, rowCount, 'body')
  const consumed = new Set()
  const layoutCells = []

  layoutRows.forEach((row, rowIndex) => {
    row.forEach((cell, cellIndex) => {
      const indexes = getLayoutColumnIndexes(columns, cell)
      if (indexes.length === 0) return
      const start = Math.min(...indexes)
      const end = Math.max(...indexes)
      layoutCells.push({
        cellId: cell.cellId || createTableLayoutCellId('body', rowIndex, getLayoutCellColumns(cell), cellIndex),
        rowIndex,
        start,
        end,
        span: Math.max(1, end - start + 1),
        rowspan: Math.max(1, Math.min(rowCount - rowIndex, Number(cell.rowspan || 1))),
        field: String(cell.field || getColumnFieldKey(columns[start]) || ''),
        label: String(cell.label || cell.field || ''),
        editable: columns[start]?.editable !== false,
      })
    })
  })

  for (let columnIndex = 0; columnIndex < columns.length; columnIndex += 1) {
    if (consumed.has(columnIndex) || isUtilityColumn(columns[columnIndex])) continue
    let regionEnd = columnIndex
    let changed = true
    const cells = []
    const cellKeys = new Set()

    while (changed) {
      changed = false
      layoutCells.forEach((cell) => {
        if (cell.end < columnIndex || cell.start > regionEnd) return
        const key = `${cell.rowIndex}:${cell.start}:${cell.end}:${cell.field}`
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
    const regionCells = cells
      .slice()
      .sort((left, right) => left.rowIndex - right.rowIndex || left.start - right.start)
      .map((cell, inputIndex) => ({
        ...cell,
        inputIndex,
        regionStart: columnIndex,
        regionColumnId: getColumnFieldKey(columns[columnIndex]),
        localStart: Math.max(0, cell.start - columnIndex),
      }))
    const region = {
      span: regionSpan,
      rowCount,
      cells: regionCells,
    }
    regions.set(columnIndex, region)
    regions.set(getColumnFieldKey(columns[columnIndex]), region)
  }
  return regions
}

function createBodyLayoutColumnConfigs(columns, bodyLayout, rowRows) {
  const configs = new Map()
  const rowCount = getTableRowRows({ table: { rowRows } })
  const layoutRows = normalizeTableLayoutRows(bodyLayout, columns, rowCount, 'body')
  layoutRows.forEach((row, rowIndex) => {
    row.forEach((cell) => {
      const indexes = getLayoutColumnIndexes(columns, cell)
      if (indexes.length === 0) return
      const start = Math.min(...indexes)
      const end = Math.max(...indexes)
      const key = getColumnFieldKey(columns[start])
      const config = configs.get(key) || { rows: {} }
      const rowNumber = String(rowIndex + 1)
      config.rows[rowNumber] = {
        field: String(cell.field || key || ''),
        label: String(cell.label || cell.field || key || ''),
        colspan: Math.max(1, end - start + 1),
        rowspan: Math.max(1, Math.min(rowCount - rowIndex, Number(cell.rowspan || 1))),
        cellId: String(cell.cellId || createTableLayoutCellId('body', rowIndex, getLayoutCellColumns(cell), 0)),
      }
      configs.set(key, config)
      configs.set(start, config)
    })
  })
  return configs
}

function prepareColumnsForHeaderRows(columns, groupDepth) {
  return (Array.isArray(columns) ? columns : []).map((column) => {
    const next = { ...column }
    const headers = getExistingColumnHeaders(next).slice(0, groupDepth)
    const generatedHeaders = []

    for (let index = 0; index < groupDepth; index += 1) {
      if (!String(headers[index] || '').trim() && !isUtilityColumn(next)) {
        headers[index] = getColumnDisplayName(next)
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

function getExistingColumnHeaders(column) {
  if (Array.isArray(column?.headers)) return [...column.headers]
  return [
    column?.header1 ?? column?.headerGroup ?? column?.group ?? '',
    column?.header2 ?? column?.headerSubGroup ?? '',
  ]
}

export function getRenderableTableColumns(component) {
  const columns = Array.isArray(component?.columns) ? component.columns : []
  const selection = component?.table?.selection || component?.props?.selection || 'none'
  const utilityColumns = []

  if ((selection === 'single' || selection === 'multiple') && !columns.some(isSelectionColumn)) {
    utilityColumns.push({
      name: '__qtSelection',
      label: '',
      field: '__qtSelection',
      type: 'selection',
      align: 'center',
      width: '50px',
      sortable: false,
      editable: false,
      selectColumn: true,
      selectionMode: selection,
    })
  }

  if (component?.table?.showModeColumn !== false && !columns.some(isModeColumn)) {
    utilityColumns.push(
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
    )
  }

  return [...utilityColumns, ...columns]
}

// ---- AG-Grid column-def generation ----

function renderAgGridColumnDefExpression(column, options = {}) {
  const sizing = getAgGridColumnSizing(column)
  const align = ['left', 'center', 'right'].includes(column?.align) ? column.align : ''
  const type = column?.type || 'text'
  const groupRowCell = options.groupRowCell || null
  const bodyRegion = options.bodyRegion || null
  const bodyConfig = options.bodyConfig || null
  const logicalRowSpan = Boolean(options.logicalRowSpan)
  const modeColumn = isModeColumn(column)
  const selectionColumn = isSelectionColumn(column)
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
    ...(modeColumn ? {
      cellClass: 'qt-table-mode-cell',
      editable: false,
      headerName: '',
      minWidth: 42,
      maxWidth: 52,
    } : {}),
    ...(selectionColumn ? {
      checkboxSelection: (params) => !params.node?.rowPinned && Number(params.data?.rowIdx || 1) <= 1,
      headerCheckboxSelection: column?.selectionMode === 'multiple',
      showDisabledCheckboxes: false,
      cellClass: 'qt-ag-selection-span-cell',
      editable: false,
      headerName: '',
      sortable: false,
      filter: false,
      resizable: false,
      suppressMovable: true,
      lockPosition: 'left',
      minWidth: 44,
      maxWidth: 58,
    } : {}),
  }

  if (type === 'number') value.type = 'numericColumn'
  if (type === 'checkbox') value.cellRenderer = 'agCheckboxCellRenderer'
  if (type === 'badge') value.cellRenderer = (params) => params.value == null ? '' : String(params.value)
  if (type === 'button') value.cellRenderer = (params) => params.value == null ? '' : String(params.value)
  if (type === 'link') value.cellRenderer = (params) => params.value == null ? '' : `<a href="${String(params.value)}" target="_blank">${String(params.value)}</a>`
  if (type === 'image') value.cellRenderer = (params) => params.value == null ? '' : `<img src="${String(params.value)}" alt="" style="max-width:80px;max-height:48px" />`
  if (type === 'actions') {
    value.cellRenderer = () => '<button type="button" class="qt-ag-action-btn" style="margin-right:4px;padding:1px 7px;border:1px solid #cfd8dc;border-radius:3px;background:#fff;color:#455a64">편집</button><button type="button" class="qt-ag-action-btn qt-ag-action-danger" style="padding:1px 7px;border:1px solid #ffcdd2;border-radius:3px;background:#fff;color:#c62828">삭제</button>'
    value.sortable = false
    value.filter = false
    value.editable = false
  }
  if (selectionColumn) {
    delete value.cellRenderer
  }

  if (groupRowCell) {
    delete value.cellRenderer
    value.editable = false
    value.qtGroupRowCell = true
    value.cellClass = mergeAgGridCellClass(value.cellClass, 'qt-ag-group-row-cell')
  }
  if (bodyRegion) {
    delete value.cellRenderer
    value.editable = false
    value.qtGroupRowCell = true
    value.cellClass = mergeAgGridCellClass(value.cellClass, 'qt-ag-group-row-cell')
  }
  if (bodyConfig) {
    value.editable = false
    value.qtBodyConfig = bodyConfig
  }

  const formatter = column?.format
  const extraProperties = []
  const bodyConfigLiteral = bodyConfig ? objectToJavaScriptLiteral(bodyConfig) : ''
  if (logicalRowSpan && selectionColumn) {
    extraProperties.push(`rowSpan: (params) => getAgGridLogicalRowSpan(params)`)
    extraProperties.push(`cellClass: (params) => getAgGridLogicalCellClass(params, 'qt-ag-selection-span-cell')`)
  } else if (logicalRowSpan && modeColumn) {
    extraProperties.push(`rowSpan: (params) => getAgGridLogicalRowSpan(params)`)
    extraProperties.push(`cellClass: (params) => getAgGridLogicalCellClass(params, 'qt-table-mode-cell')`)
  }
  if (groupRowCell) {
    extraProperties.push(`colSpan: (params) => params.node?.rowPinned ? 1 : ${groupRowCell.span}`)
    extraProperties.push(`cellRenderer: ${renderAgGridGroupRowCellRendererExpression(groupRowCell)}`)
  } else if (bodyRegion) {
    extraProperties.push(`colSpan: (params) => params.node?.rowPinned ? 1 : ${bodyRegion.span}`)
    extraProperties.push(`cellRenderer: ${renderAgGridBodyLayoutCellRendererExpression(bodyRegion)}`)
  } else if (bodyConfig) {
    extraProperties.push(`valueGetter: (params) => getAgGridBodyCellValue(params, ${bodyConfigLiteral})`)
    extraProperties.push(`valueSetter: (params) => setAgGridBodyCellValue(params, ${bodyConfigLiteral})`)
    extraProperties.push(`colSpan: (params) => getAgGridBodyCellSpan(params, ${bodyConfigLiteral}, 'colspan')`)
    extraProperties.push(`rowSpan: (params) => getAgGridBodyCellSpan(params, ${bodyConfigLiteral}, 'rowspan')`)
    extraProperties.push(`cellClass: (params) => getAgGridBodyCellClass(params, ${bodyConfigLiteral})`)
    extraProperties.push(`suppressNavigable: (params) => !getAgGridBodyCellConfig(params, ${bodyConfigLiteral})`)
    extraProperties.push(`editable: (params) => ${Boolean(column?.editable)} && isAgGridBodyCellEditable(params, ${bodyConfigLiteral})`)
  } else if (formatter) {
    extraProperties.push(`valueFormatter: (params) => ${formatter}(params.value, params.data)`)
  }

  const literal = objectToJavaScriptLiteral(value)
  if (extraProperties.length === 0) return literal
  return `${literal.slice(0, -1)}, ${extraProperties.join(', ')} }`
}

function countAgGridLeafColumns(columns) {
  return (Array.isArray(columns) ? columns : []).reduce(
    (count, column) => count + (Array.isArray(column?.columns) ? countAgGridLeafColumns(column.columns) : 1),
    0,
  )
}

function renderAgGridColumnGroups(columns, groupDepth, depth, rowRows, bodyRegions = new Map(), startIndex = 0, bodyConfigs = new Map(), logicalRowSpan = false) {
  if (depth >= groupDepth) {
    return columns.map((column, index) => {
      const globalIndex = startIndex + index
      return renderAgGridColumnDefExpression(column, {
        bodyRegion: bodyRegions.get(getColumnFieldKey(column)) || bodyRegions.get(globalIndex),
        bodyConfig: bodyConfigs.get(getColumnFieldKey(column)) || bodyConfigs.get(globalIndex),
        logicalRowSpan,
      })
    })
  }

  const groups = []
  let index = 0
  while (index < (columns || []).length) {
    if (shouldRenderColumnLeafAtDepth(columns, index, depth, groupDepth)) {
      groups.push({ leaf: columns[index] })
      index += 1
      continue
    }

    const column = columns[index]
    const headerName = getColumnGroupHeaderName(column, depth)
    const key = headerName || `__blank_${depth}_${index}`
    const groupColumns = [column]
    index += 1
    while (
      index < columns.length &&
      !shouldRenderColumnLeafAtDepth(columns, index, depth, groupDepth) &&
      getColumnGroupHeaderName(columns[index], depth) === headerName
    ) {
      groupColumns.push(columns[index])
      index += 1
    }
    groups.push({ key, headerName, columns: groupColumns })
  }

  let leafOffset = startIndex
  return groups.map((group) => {
    const groupStartIndex = leafOffset
    const groupLeafCount = group.leaf ? 1 : countAgGridLeafColumns(group.columns)
    leafOffset += groupLeafCount
    if (group.leaf) {
      return renderAgGridColumnDefExpression(group.leaf, {
        bodyRegion: bodyRegions.get(getColumnFieldKey(group.leaf)) || bodyRegions.get(groupStartIndex),
        bodyConfig: bodyConfigs.get(getColumnFieldKey(group.leaf)) || bodyConfigs.get(groupStartIndex),
        logicalRowSpan,
      })
    }
    const shouldRenderGroupBodyCell = bodyRegions.size === 0 && bodyConfigs.size === 0 && rowRows > 1 && depth === groupDepth - 1 && group.columns.length > 0
    const children = shouldRenderGroupBodyCell
      ? renderAgGridGroupBodyChildren(group, depth, logicalRowSpan)
      : renderAgGridColumnGroups(group.columns, groupDepth, depth + 1, rowRows, bodyRegions, groupStartIndex, bodyConfigs, logicalRowSpan)
    return `{ headerName: ${JSON.stringify(group.headerName)}, marryChildren: true, children: [${children.join(', ')}] }`
  })
}

function renderAgGridGroupBodyChildren(group, depth, logicalRowSpan = false) {
  const groupField = getColumnGroupFieldName(group.columns[0], depth, group.headerName)
  const childConfigs = group.columns.map((column) => ({
    field: String(column?.field || column?.name || 'column'),
    label: String(column?.label || column?.name || column?.field || 'Column'),
    editable: column?.editable !== false,
  }))

  return group.columns.map((column, index) => renderAgGridColumnDefExpression(
    column,
    index === 0
      ? {
          groupRowCell: {
            span: group.columns.length,
            groupField,
            groupLabel: group.headerName,
            children: childConfigs,
          },
          logicalRowSpan,
        }
      : { logicalRowSpan },
  ))
}

// ---- embedded runtime code-generation templates ----

function renderAgGridGroupRowCellRendererExpression(options) {
  return `(params) => {
    const data = params.data || {}
    const groupField = ${JSON.stringify(options.groupField)}
    const groupLabel = ${JSON.stringify(options.groupLabel)}
    const children = ${JSON.stringify(options.children)}
    const stop = (event) => event.stopPropagation()
    let modeRefreshTimer = null
    const scheduleModeRefresh = () => {
      if (modeRefreshTimer || !params.api || !params.node) return
      modeRefreshTimer = setTimeout(() => {
        modeRefreshTimer = null
        params.api?.refreshCells?.({ rowNodes: [params.node], columns: ['mode'], force: false })
      }, 0)
    }
    const setValue = (field, value) => {
      if (!field || !params.data) return
      const previousMode = params.data.mode
      params.data[field] = value
      if (params.data.mode !== 'C' && params.data.mode !== 'D') params.data.mode = 'U'
      if (params.data.mode !== previousMode) scheduleModeRefresh()
    }
    const isTextEditMode = (input) => input?.dataset?.qtAgTextEditMode === 'true'
    const setTextEditMode = (input, enabled) => {
      if (!input || input.dataset.qtAgEditable !== 'true') return false
      input.dataset.qtAgTextEditMode = enabled ? 'true' : 'false'
      input.readOnly = !enabled
      if (enabled) {
        setTimeout(() => {
          input.focus?.()
          input.select?.()
        }, 0)
      }
      return true
    }
    const handleKeydown = (event, input) => {
      if (event.key === 'F2') {
        event.preventDefault()
        event.stopPropagation()
        setTextEditMode(input, true)
        return
      }
      if (event.key === 'Escape' && isTextEditMode(input)) {
        event.preventDefault()
        event.stopPropagation()
        setTextEditMode(input, false)
        return
      }
      if (event.key === 'Enter' && event.shiftKey) {
        event.preventDefault()
        event.stopPropagation()
        setValue(input.dataset.qtAgGroupField || '', input.value)
        setTextEditMode(input, false)
        return
      }
    }
    const createInput = (field, label, className, editable = true, inputIndex = 0) => {
      const input = document.createElement('input')
      input.className = className
      input.dataset.qtAgGroupInputIndex = String(inputIndex)
      input.dataset.qtAgGroupField = field || ''
      input.dataset.qtAgEditable = editable === false ? 'false' : 'true'
      input.dataset.qtAgTextEditMode = 'false'
      input.value = data[field] == null ? '' : String(data[field])
      input.placeholder = label || field || ''
      input.readOnly = true
      input.addEventListener('mousedown', stop)
      input.addEventListener('click', stop)
      input.addEventListener('dblclick', (event) => {
        event.stopPropagation()
        setTextEditMode(input, true)
      })
      input.addEventListener('keydown', (event) => handleKeydown(event, input))
      input.addEventListener('change', () => setValue(field, input.value))
      input.addEventListener('blur', () => {
        setValue(field, input.value)
        setTextEditMode(input, false)
      })
      return input
    }
    const root = document.createElement('div')
    root.className = 'qt-ag-group-row-editor'
    root.style.setProperty('--qt-group-child-count', String(Math.max(1, children.length)))
    root.addEventListener('mousedown', stop)
    root.addEventListener('click', stop)
    root.addEventListener('dblclick', stop)
    root.appendChild(createInput(groupField, groupLabel, 'qt-ag-group-input qt-ag-group-main', true, 0))
    const childWrap = document.createElement('div')
    childWrap.className = 'qt-ag-group-children'
    children.forEach((child, index) => {
      childWrap.appendChild(createInput(child.field, child.label, 'qt-ag-group-input', child.editable, index + 1))
    })
    root.appendChild(childWrap)
    return root
  }`
}

function renderAgGridBodyLayoutCellRendererExpression(region) {
  return `(params) => {
    const data = params.data || {}
    const region = ${JSON.stringify(region)}
    const stop = (event) => event.stopPropagation()
    let modeRefreshTimer = null
    const scheduleModeRefresh = () => {
      if (modeRefreshTimer || !params.api || !params.node) return
      modeRefreshTimer = setTimeout(() => {
        modeRefreshTimer = null
        params.api?.refreshCells?.({ rowNodes: [params.node], columns: ['mode'], force: false })
      }, 0)
    }
    const setValue = (field, value) => {
      if (!field || !params.data) return
      const previousMode = params.data.mode
      params.data[field] = value
      if (params.data.mode !== 'C' && params.data.mode !== 'D') params.data.mode = 'U'
      if (params.data.mode !== previousMode) scheduleModeRefresh()
    }
    const isTextEditMode = (input) => input?.dataset?.qtAgTextEditMode === 'true'
    const setTextEditMode = (input, enabled) => {
      if (!input || input.dataset.qtAgEditable !== 'true') return false
      input.dataset.qtAgTextEditMode = enabled ? 'true' : 'false'
      input.readOnly = !enabled
      if (enabled) {
        setTimeout(() => {
          input.focus?.()
          input.select?.()
        }, 0)
      }
      return true
    }
    const createInput = (cell) => {
      const input = document.createElement('input')
      input.className = 'qt-ag-layout-input'
      input.dataset.qtAgLayoutInputIndex = String(cell.inputIndex || 0)
      input.dataset.qtAgLayoutCellId = cell.cellId || ''
      input.dataset.qtAgLayoutField = cell.field || ''
      input.dataset.qtAgLayoutRowStart = String(Math.max(0, Number(cell.rowIndex || 0)))
      input.dataset.qtAgLayoutRowEnd = String(Math.max(0, Number(cell.rowIndex || 0)) + Math.max(1, Number(cell.rowspan || 1)) - 1)
      input.dataset.qtAgLayoutColStart = String(Math.max(0, Number(cell.localStart || 0)))
      input.dataset.qtAgLayoutColEnd = String(Math.max(0, Number(cell.localStart || 0)) + Math.max(1, Number(cell.span || 1)) - 1)
      input.value = data[cell.field] == null ? '' : String(data[cell.field])
      input.placeholder = cell.label || cell.field || ''
      input.style.gridColumn = String((cell.localStart || 0) + 1) + ' / span ' + String(Math.max(1, cell.span || 1))
      input.style.gridRow = String((cell.rowIndex || 0) + 1) + ' / span ' + String(Math.max(1, cell.rowspan || 1))
      input.dataset.qtAgEditable = cell.editable === false ? 'false' : 'true'
      input.dataset.qtAgTextEditMode = 'false'
      input.readOnly = true
      input.addEventListener('mousedown', stop)
      input.addEventListener('click', stop)
      input.addEventListener('dblclick', (event) => {
        event.stopPropagation()
        setTextEditMode(input, true)
      })
      input.addEventListener('keydown', (event) => {
        if (event.key === 'F2') {
          event.preventDefault()
          event.stopPropagation()
          setTextEditMode(input, true)
          return
        }
        if (event.key === 'Escape' && isTextEditMode(input)) {
          event.preventDefault()
          event.stopPropagation()
          setTextEditMode(input, false)
          return
        }
        if (event.key === 'Enter' && event.shiftKey) {
          event.preventDefault()
          event.stopPropagation()
          setValue(input.dataset.qtAgLayoutField || '', input.value)
          setTextEditMode(input, false)
          return
        }
      })
      input.addEventListener('change', () => setValue(cell.field, input.value))
      input.addEventListener('blur', () => {
        setValue(cell.field, input.value)
        setTextEditMode(input, false)
      })
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
  }`
}

function mergeAgGridCellClass(currentClass, nextClass) {
  if (!currentClass) return nextClass
  if (typeof currentClass === 'string') return `${currentClass} ${nextClass}`
  if (Array.isArray(currentClass)) return [...currentClass, nextClass]
  return currentClass
}

function shouldRenderColumnLeafAtDepth(columns, index, depth, groupDepth) {
  const column = columns[index]
  if (column?.__qtHeaderLeafDepth === depth) return true
  const headerName = getColumnGroupHeaderName(column, depth)
  if (!headerName) return true
  if (column?.__qtForceHeaderRows) return false
  if (Array.isArray(column?.__qtGeneratedHeaders) && column.__qtGeneratedHeaders[depth]) return false
  const displayName = getColumnDisplayName(column)
  const hasAdjacentSameHeader =
    getColumnGroupHeaderName(columns[index - 1], depth) === headerName ||
    getColumnGroupHeaderName(columns[index + 1], depth) === headerName
  const hasDeeperHeader = hasColumnGroupHeaderBelow(column, depth, groupDepth)
  return !hasAdjacentSameHeader && !hasDeeperHeader && headerName === displayName
}

function hasColumnGroupHeaderBelow(column, depth, groupDepth) {
  for (let index = depth + 1; index < groupDepth; index += 1) {
    if (getColumnGroupHeaderName(column, index)) return true
  }
  return false
}

function getColumnDisplayName(column) {
  return String(column?.label || column?.name || column?.field || 'Column')
}

function isModeColumn(column) {
  return column?.modeColumn === true || column?.field === 'mode' || column?.name === 'mode'
}

function isSelectionColumn(column) {
  return column?.selectColumn === true || column?.field === '__qtSelection' || column?.name === '__qtSelection'
}

function isUtilityColumn(column) {
  return isModeColumn(column) || isSelectionColumn(column)
}

function getColumnGroupHeaderName(column, index) {
  if (Array.isArray(column?.headers)) return String(column.headers[index] || '')
  if (index === 0) return String(column?.header1 || column?.headerGroup || column?.group || '')
  if (index === 1) return String(column?.header2 || column?.headerSubGroup || '')
  return ''
}

function getColumnGroupFieldName(column, index, fallback) {
  if (Array.isArray(column?.headerFields)) return String(column.headerFields[index] || fallback || '')
  if (Array.isArray(column?.groupFields)) return String(column.groupFields[index] || fallback || '')
  if (index === 0) return String(column?.headerField || column?.groupField || fallback || '')
  return String(fallback || '')
}

export function getTableHeaderRows(component) {
  const number = Number(component?.table?.headerRows ?? 1)
  if (!Number.isFinite(number)) return 1
  return Math.min(3, Math.max(1, Math.round(number)))
}

export function getTableRowRows(component) {
  const number = Number(component?.table?.rowRows ?? 1)
  if (!Number.isFinite(number)) return 1
  return Math.min(3, Math.max(1, Math.round(number)))
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

export function getTableGridRowsVariableName(component) {
  return `${getComponentApiName(component)}_gridRows`
}

export function getTableRowsExpression(component) {
  if (component.dynamicProps?.rows) return component.dynamicProps.rows
  if (component.table?.rowsBinding) return component.table.rowsBinding
  return getTableRowsVariableName(component)
}

function getTableRowDataExpression(component) {
  return usesExpandedBodyRows(component) ? getTableGridRowsVariableName(component) : getTableRowsExpression(component)
}

export function usesExpandedBodyRows(component) {
  return getTableRowRows(component) > 1 && Array.isArray(component?.bodyRows)
}

export function renderTableDisplayRowsHelper() {
  return `function createAgGridDisplayRows(rows, rowRows, rowKey) {
  const sourceRows = Array.isArray(rows) ? rows : []
  const count = Math.min(3, Math.max(1, Math.round(Number(rowRows) || 1)))
  if (count <= 1) return sourceRows
  return sourceRows.flatMap((row, sourceIndex) => {
    const source = row && typeof row === 'object' ? row : {}
    const sourceKey = source.__qtRowId ?? (rowKey ? source[rowKey] : undefined) ?? sourceIndex
    return Array.from({ length: count }, (_, rowIndex) => ({
      ...source,
      rowIdx: rowIndex + 1,
      __qtSourceRowIndex: sourceIndex,
      __qtDisplayRowId: String(sourceKey) + '_' + String(rowIndex + 1),
      __qtDisplayRowCount: count,
    }))
  })
}

function getAgGridDisplayRowClass(params) {
  const data = params?.data || {}
  const sourceIndex = Number.isInteger(Number(data.__qtSourceRowIndex))
    ? Number(data.__qtSourceRowIndex)
    : Number(params?.node?.rowIndex || 0)
  const rowIdx = Number(data.rowIdx || 1)
  const rowCount = Math.max(1, Number(data.__qtDisplayRowCount || 1))
  return [
    sourceIndex % 2 === 0 ? 'qt-ag-logical-row-even' : 'qt-ag-logical-row-odd',
    rowIdx <= 1 ? 'qt-ag-logical-row-start' : 'qt-ag-logical-row-continuation',
    rowIdx < rowCount ? 'qt-ag-logical-row-not-last' : 'qt-ag-logical-row-last',
  ].join(' ')
}

function getAgGridLogicalRowSpan(params) {
  if (params?.node?.rowPinned) return 1
  const rowIdx = Math.max(1, Number(params?.data?.rowIdx || 1))
  if (rowIdx > 1) return 1
  return Math.max(1, Number(params?.data?.__qtDisplayRowCount || 1))
}

function getAgGridLogicalCellClass(params, baseClass) {
  const classes = [baseClass, 'qt-ag-rowspan-cell', getAgGridLogicalCellToneClass(params)].filter(Boolean)
  const rowIdx = Math.max(1, Number(params?.data?.rowIdx || 1))
  if (rowIdx > 1) classes.push('qt-ag-covered-cell')
  return classes.join(' ')
}

function getAgGridLogicalCellToneClass(params) {
  const data = params?.data || {}
  const sourceIndex = Number.isInteger(Number(data.__qtSourceRowIndex))
    ? Number(data.__qtSourceRowIndex)
    : Number(params?.node?.rowIndex || 0)
  return sourceIndex % 2 === 0 ? 'qt-ag-logical-cell-even' : 'qt-ag-logical-cell-odd'
}

function getAgGridBodyCellConfig(params, config) {
  const rowIdx = String(params?.data?.rowIdx || 1)
  return config?.rows?.[rowIdx] || null
}

function getAgGridBodyCellValue(params, config) {
  const cell = getAgGridBodyCellConfig(params, config)
  if (!cell) return undefined
  const field = cell.field
  return field ? params?.data?.[field] : undefined
}

function setAgGridBodyCellValue(params, config) {
  const cell = getAgGridBodyCellConfig(params, config)
  const field = cell?.field
  if (!field || !params?.data) return false
  params.data[field] = params.newValue
  params.data.__qtChangedField = field
  return true
}

function getAgGridBodyCellSpan(params, config, spanName) {
  if (params?.node?.rowPinned) return 1
  const cell = getAgGridBodyCellConfig(params, config)
  return Math.max(1, Number(cell?.[spanName] || 1))
}

function getAgGridBodyCellClass(params, config) {
  const cell = getAgGridBodyCellConfig(params, config)
  const classes = [getAgGridLogicalCellToneClass(params)]
  if (!cell) classes.push('qt-ag-covered-cell')
  if (Number(cell?.rowspan || 1) > 1) classes.push('qt-ag-rowspan-cell')
  return classes.join(' ')
}

function isAgGridBodyCellEditable(params, config) {
  return Boolean(getAgGridBodyCellConfig(params, config))
}`
}

export function getComponentApiName(component) {
  return toIdentifier(component?.id || component?.type || 'component')
}

export function getComponentRefName(component) {
  return `${getComponentApiName(component)}Ref`
}
