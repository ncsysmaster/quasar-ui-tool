import { createBaseComponentApi, resolveValue, writeValue } from './baseApi'

const INTERNAL_ROW_ID = '__qtRowId'
const DISPLAY_ROW_ID = '__qtDisplayRowId'
const DISPLAY_SOURCE_ROW_INDEX = '__qtSourceRowIndex'
const DISPLAY_CHANGED_FIELD = '__qtChangedField'
const DISPLAY_ROW_COUNT = '__qtDisplayRowCount'
const DISPLAY_SELECTION_FIELD = '__qtSelection'
const ROW_MODE_FIELD = 'mode'
const ROW_MODES = new Set(['R', 'C', 'U', 'D'])

// ---- row identity / mode ----

function asArray(value) {
  return Array.isArray(value) ? value : []
}

function getRowKeyValue(row, rowKey) {
  return row && rowKey ? row[rowKey] : undefined
}

function cloneRow(row) {
  return row && typeof row === 'object' ? { ...row } : row
}

function isEmptyValue(value) {
  return value === undefined || value === null || value === ''
}

function normalizeRowMode(value, fallback = 'R') {
  const mode = String(value || '').trim().toUpperCase()
  return ROW_MODES.has(mode) ? mode : fallback
}

function ensureRowMode(row, fallback = 'R') {
  if (!row || typeof row !== 'object') return row
  const nextMode = normalizeRowMode(row[ROW_MODE_FIELD], fallback)
  if (row[ROW_MODE_FIELD] !== nextMode) row[ROW_MODE_FIELD] = nextMode
  return row
}

function setRowMode(row, mode) {
  if (!row || typeof row !== 'object') return row
  row[ROW_MODE_FIELD] = normalizeRowMode(mode)
  return row
}

function markRowCreated(row) {
  return setRowMode(row, 'C')
}

function markRowUpdated(row) {
  if (!row || typeof row !== 'object') return row
  const mode = normalizeRowMode(row[ROW_MODE_FIELD])
  if (mode !== 'C' && mode !== 'D') row[ROW_MODE_FIELD] = 'U'
  return row
}

// ---- IME / keyboard editing ----

function isImeKeyboardEvent(event) {
  return Boolean(
    event?.isComposing ||
    event?.key === 'Process' ||
    event?.key === 'Unidentified' ||
    event?.keyCode === 229 ||
    event?.which === 229,
  )
}

function isPrintableKeyboardEvent(event) {
  return Boolean(
    event &&
    typeof event.key === 'string' &&
    event.key.length === 1 &&
    !event.ctrlKey &&
    !event.metaKey &&
    !event.altKey,
  )
}

function shouldCompleteEditingOnly(event) {
  return event?.key === 'Enter' && event.shiftKey
}

// ---- clipboard ----

function parseClipboardText(text) {
  const source = String(text ?? '').replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  if (!source) return []

  const rows = []
  let row = []
  let cell = ''
  let inQuotes = false

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index]

    if (inQuotes) {
      if (char === '"' && source[index + 1] === '"') {
        cell += '"'
        index += 1
      } else if (char === '"') {
        inQuotes = false
      } else {
        cell += char
      }
      continue
    }

    if (char === '"' && cell === '') {
      inQuotes = true
    } else if (char === '\t') {
      row.push(cell)
      cell = ''
    } else if (char === '\n') {
      row.push(cell)
      rows.push(row)
      row = []
      cell = ''
    } else {
      cell += char
    }
  }

  if (cell !== '' || row.length > 0 || !source.endsWith('\n')) {
    row.push(cell)
    rows.push(row)
  }

  if (rows.length > 1 && rows[rows.length - 1].every((item) => item === '')) rows.pop()
  return rows
}

function normalizeClipboardValue(value) {
  if (value === undefined || value === null) return ''
  if (value instanceof Date) return value.toISOString()
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value)
    } catch {
      return String(value)
    }
  }
  return String(value)
}

function serializeClipboardCell(value) {
  const text = normalizeClipboardValue(value)
  return /[\t\r\n"]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

function isEditableColumnDef(columnDef, params = {}) {
  if (columnDef?.qtGroupRowCell === true) return true
  if (typeof columnDef?.editable === 'function') return Boolean(columnDef.editable(params))
  return columnDef?.editable === true
}

function assignInternalRowId(row, value) {
  Object.defineProperty(row, INTERNAL_ROW_ID, {
    value,
    enumerable: false,
    configurable: true,
    writable: true,
  })
  return row
}

// ---- header layout DOM ----

function getElementFromRef(componentRef) {
  const value = componentRef?.value || componentRef
  if (!value) return null
  if (value.nodeType === 1) return value
  if (value.$el?.nodeType === 1) return value.$el
  if (value.eGui?.nodeType === 1) return value.eGui
  if (typeof value.getGui === 'function') {
    const element = value.getGui()
    if (element?.nodeType === 1) return element
  }
  return null
}

function getHeaderDomRowIndex(headerRow) {
  const raw = headerRow?.getAttribute?.('aria-rowindex') ||
    headerRow?.dataset?.rowIndex ||
    headerRow?.getAttribute?.('row-index')
  const number = Number(raw)
  if (Number.isFinite(number)) return Math.max(0, Math.round(number) - 1)
  const rows = Array.from(headerRow?.parentElement?.querySelectorAll?.('.ag-header-row') || [])
  const index = rows.indexOf(headerRow)
  return index >= 0 ? index : 0
}

function resetHeaderLayoutDomSpans(root) {
  root?.querySelectorAll?.('.qt-ag-header-span-anchor').forEach((element) => {
    element.classList.remove('qt-ag-header-span-anchor')
    element.style.width = ''
    element.style.zIndex = ''
  })
  root?.querySelectorAll?.('.qt-ag-header-span-hidden').forEach((element) => {
    element.classList.remove('qt-ag-header-span-hidden')
    element.style.visibility = ''
    element.style.pointerEvents = ''
  })
}

export function createTableApi(options = {}) {
  const base = createBaseComponentApi(options)
  const {
    componentRef = null,
    rows = null,
    columns = null,
    sourceColumns = [],
    selected = null,
    pagination = null,
    loading = null,
    rowKey = 'id',
    headerRows = 1,
    headerLayout = [],
    excelCopy = true,
  } = options
  let gridApi = null
  let internalRowSequence = 0
  let generatedRowKeySequence = 0
  const pendingBlankRows = new WeakSet()
  let copyRange = null
  let copyRangeDragging = false
  const isExcelCopyEnabled = () => excelCopy !== false
  const getHeaderRowCount = () => Math.min(3, Math.max(1, Math.round(Number(headerRows) || 1)))

  // -- header layout DOM --

  const getGridElement = () => {
    const element = getElementFromRef(componentRef)
    if (!element) return null
    return element.classList?.contains('qt-ag-grid') ? element : element.querySelector?.('.qt-ag-grid')
  }

  const getHeaderColumnIdMap = () => {
    const map = new Map()
    const add = (key, colId) => {
      const normalizedKey = String(key || '').trim()
      const normalizedColId = String(colId || '').trim()
      if (normalizedKey && normalizedColId && !map.has(normalizedKey)) map.set(normalizedKey, normalizedColId)
    }
    const displayedColumns = gridApi?.getAllDisplayedColumns?.() || gridApi?.getDisplayedCenterColumns?.() || []
    displayedColumns.forEach((column) => {
      const colId = column?.getColId?.()
      const columnDef = column?.getColDef?.() || {}
      add(colId, colId)
      add(columnDef.colId, colId)
      add(columnDef.field, colId)
      add(columnDef.name, colId)
    })
    asArray(sourceColumns).forEach((column) => {
      const sourceKey = column?.field || column?.name
      const colId = map.get(String(column?.name || '').trim()) ||
        map.get(String(column?.field || '').trim()) ||
        String(column?.name || column?.field || '').trim()
      add(sourceKey, colId)
    })
    return map
  }

  const applyHeaderLayoutDomSpans = () => {
    const root = getGridElement()
    if (!root || typeof document === 'undefined') return false
    resetHeaderLayoutDomSpans(root)
    const count = getHeaderRowCount()
    const groupRows = Math.max(0, count - 1)
    const rows = Array.isArray(headerLayout) ? headerLayout : []
    const idMap = getHeaderColumnIdMap()
    const domRows = Array.from(root.querySelectorAll('.ag-header-row'))

    rows.forEach((row, rowIndex) => {
      if (rowIndex < groupRows || !Array.isArray(row)) return
      const domRow = domRows.find((element) => getHeaderDomRowIndex(element) === rowIndex)
      if (!domRow) return
      const leafCells = Array.from(domRow.querySelectorAll('.ag-header-cell'))
      row.forEach((cell) => {
        const keys = Array.isArray(cell?.columns) ? cell.columns.map(String).filter(Boolean) : []
        if (keys.length < 2) return
        const cells = keys
          .map((key) => {
            const colId = idMap.get(String(key || '').trim()) || String(key || '').trim()
            return leafCells.find((element) => String(element.getAttribute('col-id') || '') === colId)
          })
          .filter(Boolean)
        if (cells.length < 2) return
        const ordered = cells.slice().sort((left, right) => left.getBoundingClientRect().left - right.getBoundingClientRect().left)
        const bounds = ordered.map((element) => element.getBoundingClientRect())
        const left = Math.min(...bounds.map((item) => item.left))
        const right = Math.max(...bounds.map((item) => item.right))
        const anchor = ordered[0]
        anchor.classList.add('qt-ag-header-span-anchor')
        anchor.style.width = `${Math.max(0, right - left)}px`
        anchor.style.zIndex = '5'
        ordered.slice(1).forEach((element) => {
          element.classList.add('qt-ag-header-span-hidden')
          element.style.visibility = 'hidden'
          element.style.pointerEvents = 'none'
        })
      })
    })
    return true
  }

  const scheduleHeaderLayoutDomSpans = () => {
    const sync = () => applyHeaderLayoutDomSpans()
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => requestAnimationFrame(sync))
    }
    setTimeout(sync, 80)
  }

  const attachHeaderLayoutEvents = (eventApi) => {
    ;['columnResized', 'displayedColumnsChanged', 'gridSizeChanged', 'firstDataRendered', 'modelUpdated'].forEach((eventName) => {
      eventApi?.addEventListener?.(eventName, scheduleHeaderLayoutDomSpans)
    })
  }

  // -- row identity / mode --

  const ensureRowIdentity = (row) => {
    if (!row || typeof row !== 'object') return row
    if (isEmptyValue(row[INTERNAL_ROW_ID])) {
      assignInternalRowId(row, `${base.id || 'table'}-${Date.now()}-${++internalRowSequence}`)
    }
    return row
  }

  const preserveRowIdentity = (nextRow, sourceRow) => {
    const internalKey = sourceRow?.[INTERNAL_ROW_ID]
    return isEmptyValue(internalKey) ? ensureRowIdentity(nextRow) : assignInternalRowId(nextRow, internalKey)
  }

  const ensureRowsIdentity = (nextRows) =>
    asArray(nextRows).map((row) => ensureRowIdentity(ensureRowMode(row, 'R')))

  const createGeneratedRowKey = () => {
    const existingValues = api.getRows()
      .map((row) => getRowKeyValue(row, rowKey))
      .filter((value) => !isEmptyValue(value))

    if (existingValues.length === 0) return 1

    const numericValues = existingValues
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value))
    const allValuesAreNumeric = numericValues.length === existingValues.length

    if (allValuesAreNumeric) return Math.max(...numericValues) + 1

    return `${base.id || 'table'}-${Date.now()}-${++generatedRowKeySequence}`
  }

  const ensureGeneratedRowKey = (row) => {
    if (!row || typeof row !== 'object' || !rowKey) return row
    if (isEmptyValue(row[rowKey])) row[rowKey] = createGeneratedRowKey()
    return row
  }

  const isNonDataField = (field) => {
    const name = String(field || '').trim()
    return !name ||
      name === 'actions' ||
      name === ROW_MODE_FIELD ||
      name === rowKey ||
      name === DISPLAY_ROW_ID ||
      name === DISPLAY_SOURCE_ROW_INDEX ||
      name === DISPLAY_CHANGED_FIELD ||
      name === DISPLAY_ROW_COUNT ||
      name === DISPLAY_SELECTION_FIELD ||
      name === 'rowIdx'
  }

  const stripDisplayFields = (row) => {
    if (!row || typeof row !== 'object') return row
    const next = { ...row }
    delete next[DISPLAY_ROW_ID]
    delete next[DISPLAY_SOURCE_ROW_INDEX]
    delete next[DISPLAY_CHANGED_FIELD]
    delete next[DISPLAY_ROW_COUNT]
    delete next[DISPLAY_SELECTION_FIELD]
    delete next.rowIdx
    return next
  }

  const isNonDataColumn = (column) => {
    const field = column?.field || column?.name || column?.colId
    return column?.type === 'actions' || isNonDataField(field)
  }

  const syncRows = (nextRows = [], options = {}) => {
    const normalizedRows = ensureRowsIdentity(nextRows)
    writeValue(rows, normalizedRows)
    if (options.updateGrid !== false) {
      gridApi?.setGridOption?.('rowData', normalizedRows)
    }
    return normalizedRows
  }

  const isDataRowBlank = (row) => {
    if (!row || typeof row !== 'object') return false
    const fields = new Set()
    api.getColumns()
      .filter((column) => column && !isNonDataColumn(column))
      .forEach((column) => fields.add(column.field || column.name || column.colId))
    Object.keys(row).forEach((field) => {
      if (!isNonDataField(field)) fields.add(field)
    })
    return Array.from(fields).every((field) => isEmptyValue(row[field]))
  }

  const isCreatedBlankDataRow = (row) =>
    normalizeRowMode(row?.[ROW_MODE_FIELD]) === 'C' && isDataRowBlank(row)

  const findDataRowIndex = (event) => {
    const currentRows = api.getRows()
    const data = event?.data
    const sourceIndex = Number(data?.[DISPLAY_SOURCE_ROW_INDEX])
    if (Number.isInteger(sourceIndex) && sourceIndex >= 0 && sourceIndex < currentRows.length) {
      return sourceIndex
    }
    const identityIndex = currentRows.indexOf(data)
    if (identityIndex >= 0) return identityIndex

    const internalKey = data?.[INTERNAL_ROW_ID]
    if (!isEmptyValue(internalKey)) {
      const internalIndex = currentRows.findIndex((row) => row?.[INTERNAL_ROW_ID] === internalKey)
      if (internalIndex >= 0) return internalIndex
    }

    const key = getRowKeyValue(data, rowKey)
    if (!isEmptyValue(key)) {
      const keyIndex = currentRows.findIndex((row) => getRowKeyValue(row, rowKey) === key)
      if (keyIndex >= 0) return keyIndex
    }

    const rowIndex = Number(event?.node?.rowIndex)
    return Number.isInteger(rowIndex) ? rowIndex : -1
  }

  const findRowIndexByData = (data) => {
    if (!data || typeof data !== 'object') return -1
    const currentRows = api.getRows()
    const sourceIndex = Number(data?.[DISPLAY_SOURCE_ROW_INDEX])
    if (Number.isInteger(sourceIndex) && sourceIndex >= 0 && sourceIndex < currentRows.length) {
      return sourceIndex
    }
    const identityIndex = currentRows.indexOf(data)
    if (identityIndex >= 0) return identityIndex

    const key = getRowKeyValue(data, rowKey)
    if (!isEmptyValue(key)) {
      const keyIndex = currentRows.findIndex((row) => getRowKeyValue(row, rowKey) === key)
      if (keyIndex >= 0) return keyIndex
    }

    const internalKey = data?.[INTERNAL_ROW_ID]
    if (!isEmptyValue(internalKey)) {
      const internalIndex = currentRows.findIndex((row) => row?.[INTERNAL_ROW_ID] === internalKey)
      if (internalIndex >= 0) return internalIndex
    }

    return -1
  }

  // -- clipboard / copy-range --

  const getDisplayedColumns = (eventApi) => {
    const allColumns = eventApi?.getAllDisplayedColumns?.()
    if (Array.isArray(allColumns) && allColumns.length > 0) return allColumns
    const centerColumns = eventApi?.getDisplayedCenterColumns?.()
    return Array.isArray(centerColumns) ? centerColumns : []
  }

  const getColumnField = (column) => {
    const columnDef = column?.getColDef?.() || column || {}
    return columnDef.field || columnDef.name || columnDef.colId || column?.getColId?.()
  }

  const getFocusedCellInfo = (eventApi) => {
    const focusedCell = eventApi?.getFocusedCell?.()
    const displayedRowCount = Number(eventApi?.getDisplayedRowCount?.() ?? api.getRows().length)
    const rowIndex = Number.isInteger(Number(focusedCell?.rowIndex))
      ? Math.max(0, Math.min(Number(focusedCell.rowIndex), Math.max(0, displayedRowCount - 1)))
      : 0
    const columnId = focusedCell?.column?.getColId?.() || focusedCell?.column?.colId || focusedCell?.column
    return { rowIndex, columnId }
  }

  const getPasteColumns = (eventApi, startColumnId, startRowIndex) => {
    const columns = getDisplayedColumns(eventApi)
    if (columns.length === 0) return []

    const rawStartIndex = columns.findIndex((column) => column?.getColId?.() === startColumnId)
    const startIndex = rawStartIndex >= 0 ? rawStartIndex : 0

    return columns.slice(startIndex).filter((column) => {
      const rowNode = eventApi?.getDisplayedRowAtIndex?.(startRowIndex)
      const columnDef = column?.getColDef?.() || {}
      return !isNonDataColumn(columnDef) && isEditableColumnDef(columnDef, {
        api: eventApi,
        node: rowNode,
        data: rowNode?.data,
        column,
        colDef: columnDef,
      })
    })
  }

  const getCopyColumns = (eventApi) =>
    getDisplayedColumns(eventApi).filter((column) => {
      const columnDef = column?.getColDef?.() || {}
      return !isNonDataColumn(columnDef)
    })

  const getCopyRangeBounds = (eventApi = gridApi) => {
    if (!isExcelCopyEnabled() || !eventApi || !copyRange) return null

    const columns = getCopyColumns(eventApi)
    const startColumnIndex = columns.findIndex((column) => column?.getColId?.() === copyRange.startColumnId)
    const endColumnIndex = columns.findIndex((column) => column?.getColId?.() === copyRange.endColumnId)
    if (startColumnIndex < 0 || endColumnIndex < 0) return null

    const displayedRowCount = Number(eventApi.getDisplayedRowCount?.() ?? api.getRows().length)
    if (displayedRowCount <= 0) return null

    return {
      startRowIndex: Math.max(0, Math.min(copyRange.startRowIndex, copyRange.endRowIndex)),
      endRowIndex: Math.min(displayedRowCount - 1, Math.max(copyRange.startRowIndex, copyRange.endRowIndex)),
      startColumnIndex: Math.min(startColumnIndex, endColumnIndex),
      endColumnIndex: Math.max(startColumnIndex, endColumnIndex),
      columns,
    }
  }

  const refreshCopyRangeCells = (eventApi = gridApi) => {
    eventApi?.refreshCells?.({ force: true })
  }

  const stopCopyRangeDragging = () => {
    copyRangeDragging = false
  }

  const attachCopyRangeMouseUp = () => {
    if (typeof document === 'undefined') return
    document.removeEventListener('mouseup', stopCopyRangeDragging)
    document.addEventListener('mouseup', stopCopyRangeDragging, { once: true })
  }

  const getCopyMouseCell = (event) => {
    const eventApi = event?.api || gridApi
    const column = event?.column
    const columnDef = column?.getColDef?.() || event?.colDef || {}
    const columnId = column?.getColId?.() || columnDef.colId || columnDef.field
    const rowIndex = Number(event?.node?.rowIndex)
    if (!eventApi || !columnId || !Number.isInteger(rowIndex) || isNonDataColumn(columnDef)) return null
    return { eventApi, rowIndex, columnId }
  }

  // -- IME / keyboard editing --

  const completeCurrentEdit = (params = {}) => {
    const eventApi = params.api || gridApi
    if (!eventApi) return false

    params.event?.preventDefault?.()
    params.event?.stopPropagation?.()
    eventApi.stopEditing?.(false)
    return true
  }

  // -- public API --

  const api = {
    ...base,
    setGridApi(nextGridApi) {
      gridApi = nextGridApi || null
      attachHeaderLayoutEvents(gridApi)
      scheduleHeaderLayoutDomSpans()
    },
    getGridApi() {
      return gridApi
    },
    getRows() {
      const currentRows = asArray(resolveValue(rows))
      let changed = false
      const normalizedRows = currentRows.map((row) => {
        if (row && typeof row === 'object' && (
          isEmptyValue(row[INTERNAL_ROW_ID]) ||
          !ROW_MODES.has(String(row[ROW_MODE_FIELD] || '').trim().toUpperCase())
        )) changed = true
        return ensureRowIdentity(ensureRowMode(row, 'R'))
      })
      if (changed) writeValue(rows, normalizedRows)
      return normalizedRows
    },
    setRows(nextRows = []) {
      syncRows(Array.isArray(nextRows) ? nextRows : [])
    },
    addRow(row = {}) {
      const nextRows = syncRows([...api.getRows(), markRowCreated(ensureGeneratedRowKey(cloneRow(row)))])
      return nextRows[nextRows.length - 1]
    },
    createEmptyRow() {
      const emptyRow = api.getColumns().reduce((row, column) => {
        if (!column || isNonDataColumn(column)) return row
        const field = column.field || column.name || column.colId
        if (!field) return row
        row[field] = ''
        return row
      }, {})
      return ensureRowIdentity(markRowCreated(ensureGeneratedRowKey(emptyRow)))
    },
    addEmptyRow() {
      const row = api.addRow(api.createEmptyRow())
      if (row && typeof row === 'object') pendingBlankRows.add(row)
      return row
    },
    handleCellKeyDown() {
      return false
    },
    suppressKeyboardEvent(params = {}) {
      const event = params.event
      const columnDef = params.column?.getColDef?.() || params.colDef || {}
      if (params.editing && shouldCompleteEditingOnly(event)) {
        return completeCurrentEdit(params)
      }

      if (params.editing || !isEditableColumnDef(columnDef, params)) return false

      // IME first-key input must reach a real input element. Blocking printable-key
      // edit start prevents AG Grid from seeding a Korean IME edit with a latin key.
      return isPrintableKeyboardEvent(event) || isImeKeyboardEvent(event)
    },
    handleCellValueChanged(event) {
      const dataIndex = findDataRowIndex(event)
      const nextRows = [...api.getRows()]
      if (dataIndex < 0 || dataIndex >= nextRows.length) return false

      const field = event?.data?.[DISPLAY_CHANGED_FIELD] || event?.colDef?.field || event?.column?.getColDef?.()?.field
      const nextRow = {
        ...nextRows[dataIndex],
        ...(event?.data && typeof event.data === 'object' ? stripDisplayFields(event.data) : {}),
      }
      if (field) nextRow[field] = event?.newValue
      nextRows[dataIndex] = preserveRowIdentity(
        field === ROW_MODE_FIELD ? ensureRowMode(nextRow) : markRowUpdated(nextRow),
        event?.data || nextRows[dataIndex],
      )
      if (event?.data && typeof event.data === 'object') pendingBlankRows.delete(event.data)
      if (!isDataRowBlank(nextRow)) pendingBlankRows.delete(nextRow)
      syncRows(nextRows, { updateGrid: false })
      gridApi?.refreshCells?.({ rowNodes: event?.node ? [event.node] : undefined, force: true })
      return true
    },
    handleCellMouseDown(event) {
      if (!isExcelCopyEnabled()) return false
      const mouseEvent = event?.event
      if (mouseEvent && mouseEvent.button !== 0) return false

      const target = mouseEvent?.target
      if (target?.closest?.('button,input,textarea,select,a,[role="button"]')) return false

      const cell = getCopyMouseCell(event)
      if (!cell) return false

      copyRangeDragging = true
      copyRange = {
        startRowIndex: cell.rowIndex,
        endRowIndex: cell.rowIndex,
        startColumnId: cell.columnId,
        endColumnId: cell.columnId,
      }

      cell.eventApi.setFocusedCell?.(cell.rowIndex, cell.columnId)
      refreshCopyRangeCells(cell.eventApi)
      attachCopyRangeMouseUp()
      return true
    },
    handleCellMouseOver(event) {
      if (!isExcelCopyEnabled() || !copyRangeDragging || !copyRange) return false

      const cell = getCopyMouseCell(event)
      if (!cell) return false
      if (copyRange.endRowIndex === cell.rowIndex && copyRange.endColumnId === cell.columnId) return true

      copyRange.endRowIndex = cell.rowIndex
      copyRange.endColumnId = cell.columnId
      refreshCopyRangeCells(cell.eventApi)
      return true
    },
    isCellInCopyRange(params = {}) {
      const bounds = getCopyRangeBounds(params.api || gridApi)
      if (!bounds) return false

      const rowIndex = Number(params.node?.rowIndex)
      const columnId = params.column?.getColId?.() || params.colDef?.colId || params.colDef?.field
      const columnIndex = bounds.columns.findIndex((column) => column?.getColId?.() === columnId)

      return Number.isInteger(rowIndex) &&
        rowIndex >= bounds.startRowIndex &&
        rowIndex <= bounds.endRowIndex &&
        columnIndex >= bounds.startColumnIndex &&
        columnIndex <= bounds.endColumnIndex
    },
    isCellCopyRangeAnchor(params = {}) {
      if (!isExcelCopyEnabled() || !copyRange) return false
      const rowIndex = Number(params.node?.rowIndex)
      const columnId = params.column?.getColId?.() || params.colDef?.colId || params.colDef?.field
      return rowIndex === copyRange.startRowIndex && columnId === copyRange.startColumnId
    },
    getCopyRangeText() {
      if (!isExcelCopyEnabled()) return null
      const eventApi = gridApi
      const bounds = getCopyRangeBounds(eventApi)
      if (!bounds) return null

      const selectedColumns = bounds.columns.slice(bounds.startColumnIndex, bounds.endColumnIndex + 1)
      const lines = []

      for (let rowIndex = bounds.startRowIndex; rowIndex <= bounds.endRowIndex; rowIndex += 1) {
        const rowNode = eventApi.getDisplayedRowAtIndex?.(rowIndex)
        const row = rowNode?.data || {}
        lines.push(selectedColumns
          .map((column) => serializeClipboardCell(row[getColumnField(column)]))
          .join('\t'))
      }

      return lines.join('\r\n')
    },
    handleCopy(event) {
      if (!isExcelCopyEnabled()) return false
      if (gridApi?.getEditingCells?.()?.length) return false

      const text = api.getCopyRangeText()
      if (text === null) return false

      event?.clipboardData?.setData?.('text/plain', text)
      event?.preventDefault?.()
      event?.stopPropagation?.()
      return true
    },
    pasteText(text) {
      const matrix = parseClipboardText(text)
      if (matrix.length === 0) return false

      const eventApi = gridApi
      if (!eventApi) return false

      const { rowIndex: startRowIndex, columnId: startColumnId } = getFocusedCellInfo(eventApi)
      const pasteColumns = getPasteColumns(eventApi, startColumnId, startRowIndex)
      if (pasteColumns.length === 0) return false

      eventApi.stopEditing?.(false)

      const nextRows = [...api.getRows()]
      let changed = false
      let lastPastedRowIndex = startRowIndex
      let lastPastedColumnId = pasteColumns[0]?.getColId?.()

      matrix.forEach((rowValues, rowOffset) => {
        const displayRowIndex = startRowIndex + rowOffset
        const rowNode = eventApi.getDisplayedRowAtIndex?.(displayRowIndex)
        let dataIndex = findRowIndexByData(rowNode?.data)
        const valuesForColumns = rowValues.slice(0, pasteColumns.length)
        const hasAnyValue = valuesForColumns.some((value) => !isEmptyValue(value))

        if (dataIndex < 0 || dataIndex >= nextRows.length) {
          if (!hasAnyValue) return
          nextRows.push(api.createEmptyRow())
          dataIndex = nextRows.length - 1
        }

        const sourceRow = nextRows[dataIndex]
        const nextRow = { ...sourceRow }
        let rowChanged = false

        valuesForColumns.forEach((value, columnOffset) => {
          const column = pasteColumns[columnOffset]
          const field = getColumnField(column)
          if (isNonDataField(field)) return

          nextRow[field] = value
          rowChanged = true
          lastPastedColumnId = column?.getColId?.()
        })

        if (!rowChanged) return

        nextRows[dataIndex] = preserveRowIdentity(markRowUpdated(nextRow), sourceRow)
        pendingBlankRows.delete(sourceRow)
        pendingBlankRows.delete(nextRows[dataIndex])
        changed = true
        lastPastedRowIndex = displayRowIndex
      })

      if (!changed) return false

      syncRows(nextRows)
      eventApi.refreshCells?.({ force: true })

      setTimeout(() => {
        const displayedRowCount = Number(eventApi.getDisplayedRowCount?.() ?? nextRows.length)
        const focusedRowIndex = Math.min(Math.max(0, lastPastedRowIndex), Math.max(0, displayedRowCount - 1))
        if (lastPastedColumnId) {
          eventApi.ensureIndexVisible?.(focusedRowIndex)
          eventApi.ensureColumnVisible?.(lastPastedColumnId)
          eventApi.setFocusedCell?.(focusedRowIndex, lastPastedColumnId)
        }
      }, 0)

      return true
    },
    handlePaste(event) {
      const text = event?.clipboardData?.getData?.('text/plain') ||
        event?.clipboardData?.getData?.('text') ||
        ''
      if (!text) return false

      const isMultiCellPaste = /[\t\r\n]/.test(text)
      if (gridApi?.getEditingCells?.()?.length && !isMultiCellPaste) return false

      const pasted = api.pasteText(text)
      if (!pasted) return false

      event.preventDefault?.()
      event.stopPropagation?.()
      return true
    },
    insertRow(index, row = {}) {
      const nextRows = [...api.getRows()]
      const safeIndex = Math.max(0, Math.min(Number(index) || 0, nextRows.length))
      nextRows.splice(safeIndex, 0, markRowCreated(ensureGeneratedRowKey(cloneRow(row))))
      return syncRows(nextRows)[safeIndex]
    },
    delRow(index) {
      const nextRows = [...api.getRows()]
      const safeIndex = Number(index)
      if (!Number.isInteger(safeIndex) || safeIndex < 0 || safeIndex >= nextRows.length) return null
      const row = nextRows[safeIndex]
      if (normalizeRowMode(row?.[ROW_MODE_FIELD]) === 'C' || pendingBlankRows.has(row)) {
        const [removed] = nextRows.splice(safeIndex, 1)
        syncRows(nextRows)
        return removed
      }
      const removed = preserveRowIdentity(setRowMode({ ...row }, 'D'), row)
      nextRows[safeIndex] = removed
      syncRows(nextRows)
      return removed
    },
    delSelectedRows() {
      const selectedRows = api.getSelectedRows()
      const selectedIndexes = new Set(selectedRows.map((row) => findRowIndexByData(row)).filter((index) => index >= 0))
      const nextRows = []
      api.getRows().forEach((row, index) => {
        if (!selectedIndexes.has(index)) {
          nextRows.push(row)
          return
        }
        if (normalizeRowMode(row?.[ROW_MODE_FIELD]) === 'C' || pendingBlankRows.has(row)) return
        nextRows.push(preserveRowIdentity(setRowMode({ ...row }, 'D'), row))
      })
      syncRows(nextRows)
      api.clearSelection()
      return selectedRows
    },
    getColumns() {
      return asArray(resolveValue(columns))
    },
    getSelectedRow() {
      const gridSelectedRows = gridApi?.getSelectedRows?.()
      if (Array.isArray(gridSelectedRows) && gridSelectedRows.length > 0) return gridSelectedRows[0]
      const value = resolveValue(selected)
      const selectedValue = Array.isArray(value) ? value[0] || null : value || null
      if (selectedValue) return selectedValue
      const focusedCell = gridApi?.getFocusedCell?.()
      const focusedRow = Number.isInteger(focusedCell?.rowIndex)
        ? gridApi?.getDisplayedRowAtIndex?.(focusedCell.rowIndex)?.data
        : null
      return focusedRow || null
    },
    getSelectedIndex() {
      const selectedNode = gridApi?.getSelectedNodes?.()?.[0]
      const selectedNodeIndex = findRowIndexByData(selectedNode?.data)
      if (selectedNodeIndex >= 0) return selectedNodeIndex

      const selectedRowIndex = findRowIndexByData(api.getSelectedRow())
      if (selectedRowIndex >= 0) return selectedRowIndex

      const focusedCell = gridApi?.getFocusedCell?.()
      const focusedRow = Number.isInteger(focusedCell?.rowIndex)
        ? gridApi?.getDisplayedRowAtIndex?.(focusedCell.rowIndex)
        : null
      const focusedIndex = findRowIndexByData(focusedRow?.data)
      if (focusedIndex >= 0) return focusedIndex

      const sourceRowIndex = Number(selectedNode?.sourceRowIndex)
      return Number.isInteger(sourceRowIndex) &&
        sourceRowIndex >= 0 &&
        sourceRowIndex < api.getRows().length
        ? sourceRowIndex
        : -1
    },
    getSelectedRows() {
      if (gridApi) return gridApi.getSelectedRows()
      const value = resolveValue(selected)
      if (!value) return []
      return Array.isArray(value) ? value : [value]
    },
    delSelectedRow() {
      const removed = api.delRow(api.getSelectedIndex())
      if (removed) api.clearSelection()
      return removed
    },
    setSelected(rowOrRows) {
      writeValue(selected, rowOrRows)
    },
    clearSelection() {
      gridApi?.deselectAll?.()
      const value = resolveValue(selected)
      writeValue(selected, Array.isArray(value) ? [] : null)
    },
    findRowByKey(key) {
      return api.getRows().find((row) => getRowKeyValue(row, rowKey) === key) || null
    },
    getValue(rowIndex, field) {
      return api.getRows()[rowIndex]?.[field]
    },
    setCell(rowIndex, field, value) {
      const nextRows = [...api.getRows()]
      if (!nextRows[rowIndex]) return false
      const nextRow = { ...nextRows[rowIndex], [field]: value }
      nextRows[rowIndex] = preserveRowIdentity(
        field === ROW_MODE_FIELD ? ensureRowMode(nextRow) : markRowUpdated(nextRow),
        nextRows[rowIndex],
      )
      syncRows(nextRows)
      return true
    },
    getSelectedValue(field) {
      return api.getSelectedRow()?.[field]
    },
    setSelectedValue(field, value) {
      const selectedRow = api.getSelectedRow()
      if (!selectedRow) return false
      const key = getRowKeyValue(selectedRow, rowKey)
      const index = api.getRows().findIndex((row) => getRowKeyValue(row, rowKey) === key)
      return api.setCell(index, field, value)
    },
    updateRow(key, patch = {}) {
      const nextRows = api.getRows().map((row) =>
        getRowKeyValue(row, rowKey) === key
          ? preserveRowIdentity(
              Object.prototype.hasOwnProperty.call(patch, ROW_MODE_FIELD)
                ? ensureRowMode({ ...row, ...patch })
                : markRowUpdated({ ...row, ...patch }),
              row,
            )
          : row,
      )
      syncRows(nextRows)
    },
    getPagination() {
      return resolveValue(pagination)
    },
    setPagination(value) {
      writeValue(pagination, value)
    },
    isLoading() {
      return Boolean(resolveValue(loading))
    },
    setLoading(value = true) {
      writeValue(loading, Boolean(value))
    },
    refresh() {
      gridApi?.refreshCells?.({ force: true })
    },
    sizeColumnsToFit() {
      gridApi?.sizeColumnsToFit?.()
    },
    exportCsv(options) {
      gridApi?.exportDataAsCsv?.(options)
    },
  }

  api.getRows()

  return api
}
