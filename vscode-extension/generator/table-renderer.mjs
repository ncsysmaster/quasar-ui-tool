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
  const headerRows = getTableHeaderRows(component)
  const headerHeight = headerRows > 1 ? 32 : 48
  const rowRows = getTableRowRows(component)
  const rowHeight = 42 * rowRows
  const attributes = [
    `ref="${getComponentRefName(component)}"`,
    'class="qt-ag-grid"',
    `style="${escapeAttribute(getAgGridStyle(component))}"`,
    `:row-data="${escapeAttribute(getTableRowsExpression(component))}"`,
    `:column-defs="${getTableColumnsVariableName(component)}"`,
    `:default-col-def="{ resizable: true, sortable: true, filter: true, minWidth: 70, suppressKeyboardEvent: (params) => ${getComponentApiName(component)}.suppressKeyboardEvent(params), cellClassRules: { 'qt-ag-copy-range-cell': (params) => ${getComponentApiName(component)}.isCellInCopyRange(params), 'qt-ag-copy-range-anchor': (params) => ${getComponentApiName(component)}.isCellCopyRangeAnchor(params) } }"`,
    `:header-height="${headerHeight}"`,
    `:row-height="${rowHeight}"`,
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

  if (headerRows > 1) {
    attributes.push(':group-header-height="32"')
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

export function renderTableColumnsExpression(columns, headerRows = 1, rowRows = 1, headerLayout = null, bodyLayout = null) {
  const groupDepth = getTableHeaderRows({ table: { headerRows } }) - 1
  const bodyRows = getTableRowRows({ table: { rowRows } })
  const hasExplicitLayout = Array.isArray(headerLayout) || Array.isArray(bodyLayout)
  const sourceColumns = Array.isArray(columns) ? columns : []
  if (hasExplicitLayout) {
    const layoutColumns = applyHeaderLayoutToColumns(sourceColumns, headerLayout, headerRows)
    const bodyRegions = createBodyLayoutRegions(layoutColumns, bodyLayout, bodyRows)
    const renderColumns = groupDepth > 0
      ? prepareColumnsForHeaderRows(layoutColumns, groupDepth)
      : layoutColumns
    const expressions = groupDepth > 0
      ? renderAgGridColumnGroups(renderColumns, groupDepth, 0, bodyRows, bodyRegions)
      : renderColumns.map((column, index) => renderAgGridColumnDefExpression(column, { bodyRegion: bodyRegions.get(getColumnFieldKey(column)) || bodyRegions.get(index) }))
    return `[${expressions.join(',')}]`
  }
  const renderColumns = groupDepth > 0
    ? prepareColumnsForHeaderRows(columns, groupDepth)
    : (Array.isArray(columns) ? columns : [])
  const expressions = groupDepth > 0
    ? renderAgGridColumnGroups(renderColumns, groupDepth, 0, bodyRows)
    : renderColumns.map((column) => renderAgGridColumnDefExpression(column))
  return `[${expressions.join(',')}]`
}

function applyHeaderLayoutToColumns(columns, headerLayout, headerRows) {
  const nextColumns = (Array.isArray(columns) ? columns : []).map((column) => ({ ...column }))
  const visibleRows = getTableHeaderRows({ table: { headerRows } })
  const groupRows = Math.max(0, visibleRows - 1)
  const layoutRows = normalizeTableLayoutRows(headerLayout, nextColumns, visibleRows, 'header')
  layoutRows.forEach((row, rowIndex) => {
    row.forEach((cell) => {
      getLayoutColumnIndexes(nextColumns, cell).forEach((columnIndex) => {
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

function normalizeTableLayoutRows(rows, columns, rowCount = 1, kind = 'body') {
  const columnKeys = (columns || []).map(getColumnFieldKey)
  const count = Math.min(3, Math.max(1, Math.round(Number(rowCount) || 1)))
  const defaults = createDefaultTableLayoutRows(columns, count, kind)
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
        rowspan: Math.max(1, Math.min(count, Number(cell?.rowspan || 1))),
      })
    })
    return normalized.length > 0 ? normalized : createDefaultTableLayoutRows(columns, 1, kind)[0]
  })
}

function createDefaultTableLayoutRows(columns, rowCount = 1, kind = 'body') {
  return Array.from({ length: Math.min(3, Math.max(1, Number(rowCount) || 1)) }, (_, rowIndex) =>
    (columns || []).map((column, columnIndex) => ({
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

function getColumnFieldKey(column) {
  return String(column?.field || column?.name || '').trim()
}

function getLayoutColumnIndexes(columns, cell) {
  const keys = Array.isArray(cell?.columns) ? cell.columns.map(String) : [String(cell?.field || '')]
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
    row.forEach((cell) => {
      const indexes = getLayoutColumnIndexes(columns, cell)
      if (indexes.length === 0) return
      const start = Math.min(...indexes)
      const end = Math.max(...indexes)
      layoutCells.push({
        rowIndex,
        start,
        end,
        span: Math.max(1, end - start + 1),
        rowspan: Math.max(1, Number(cell.rowspan || 1)),
        field: String(cell.field || getColumnFieldKey(columns[start]) || ''),
        label: String(cell.label || cell.field || ''),
        editable: columns[start]?.editable !== false,
      })
    })
  })

  for (let columnIndex = 0; columnIndex < columns.length; columnIndex += 1) {
    if (consumed.has(columnIndex) || isModeColumn(columns[columnIndex])) continue
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
    const region = {
      span: regionSpan,
      rowCount,
      cells: cells
        .slice()
        .sort((left, right) => left.rowIndex - right.rowIndex || left.start - right.start)
        .map((cell, inputIndex) => ({
          ...cell,
          inputIndex,
          localStart: Math.max(0, cell.start - columnIndex),
        })),
    }
    regions.set(columnIndex, region)
    regions.set(getColumnFieldKey(columns[columnIndex]), region)
  }
  return regions
}

function prepareColumnsForHeaderRows(columns, groupDepth) {
  return (Array.isArray(columns) ? columns : []).map((column) => {
    const next = { ...column }
    const headers = getExistingColumnHeaders(next).slice(0, groupDepth)
    const generatedHeaders = []

    for (let index = 0; index < groupDepth; index += 1) {
      if (!String(headers[index] || '').trim() && !isModeColumn(next)) {
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

function renderAgGridColumnDefExpression(column, options = {}) {
  const sizing = getAgGridColumnSizing(column)
  const align = ['left', 'center', 'right'].includes(column?.align) ? column.align : ''
  const type = column?.type || 'text'
  const groupRowCell = options.groupRowCell || null
  const bodyRegion = options.bodyRegion || null
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
  if (type === 'button') value.cellRenderer = (params) => params.value == null ? '' : String(params.value)
  if (type === 'link') value.cellRenderer = (params) => params.value == null ? '' : `<a href="${String(params.value)}" target="_blank">${String(params.value)}</a>`
  if (type === 'image') value.cellRenderer = (params) => params.value == null ? '' : `<img src="${String(params.value)}" alt="" style="max-width:80px;max-height:48px" />`
  if (type === 'actions') {
    value.cellRenderer = () => '<button type="button" class="qt-ag-action-btn" style="margin-right:4px;padding:1px 7px;border:1px solid #cfd8dc;border-radius:3px;background:#fff;color:#455a64">편집</button><button type="button" class="qt-ag-action-btn qt-ag-action-danger" style="padding:1px 7px;border:1px solid #ffcdd2;border-radius:3px;background:#fff;color:#c62828">삭제</button>'
    value.sortable = false
    value.filter = false
    value.editable = false
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

  const formatter = column?.format
  const extraProperties = []
  if (groupRowCell) {
    extraProperties.push(`colSpan: (params) => params.node?.rowPinned ? 1 : ${groupRowCell.span}`)
    extraProperties.push(`cellRenderer: ${renderAgGridGroupRowCellRendererExpression(groupRowCell)}`)
  } else if (bodyRegion) {
    extraProperties.push(`colSpan: (params) => params.node?.rowPinned ? 1 : ${bodyRegion.span}`)
    extraProperties.push(`cellRenderer: ${renderAgGridBodyLayoutCellRendererExpression(bodyRegion)}`)
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

function renderAgGridColumnGroups(columns, groupDepth, depth, rowRows, bodyRegions = new Map(), startIndex = 0) {
  if (depth >= groupDepth) {
    return columns.map((column, index) => {
      const globalIndex = startIndex + index
      return renderAgGridColumnDefExpression(column, {
        bodyRegion: bodyRegions.get(getColumnFieldKey(column)) || bodyRegions.get(globalIndex),
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
      })
    }
    const shouldRenderGroupBodyCell = bodyRegions.size === 0 && rowRows > 1 && depth === groupDepth - 1 && group.columns.length > 0
    const children = shouldRenderGroupBodyCell
      ? renderAgGridGroupBodyChildren(group, depth)
      : renderAgGridColumnGroups(group.columns, groupDepth, depth + 1, rowRows, bodyRegions, groupStartIndex)
    return `{ headerName: ${JSON.stringify(group.headerName)}, marryChildren: true, children: [${children.join(', ')}] }`
  })
}

function renderAgGridGroupBodyChildren(group, depth) {
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
        }
      : {},
  ))
}

function renderAgGridGroupRowCellRendererExpression(options) {
  return `(params) => {
    const data = params.data || {}
    const groupField = ${JSON.stringify(options.groupField)}
    const groupLabel = ${JSON.stringify(options.groupLabel)}
    const children = ${JSON.stringify(options.children)}
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
    const focusRegionInput = (rowIndex, inputIndex, targetColumnId) => {
      const columnId = targetColumnId || params.column?.getColId?.() || params.colDef?.colId || params.colDef?.field
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
        colStart: Math.max(0, Number(item.dataset.qtAgLayoutColStart || 0)),
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
        if (nextInput) {
          event.preventDefault()
          event.stopPropagation()
          setValue(input.dataset.qtAgLayoutField || '', input.value)
          nextInput.focus()
          nextInput.select()
          return true
        }
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
