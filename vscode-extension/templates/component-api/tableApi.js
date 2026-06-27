import { createBaseComponentApi, resolveValue, writeValue } from './baseApi'

const INTERNAL_ROW_ID = '__qtRowId'
const ROW_MODE_FIELD = 'mode'
const ROW_MODES = new Set(['R', 'C', 'U', 'D'])

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

function isArrowKeyboardEvent(event) {
  return ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event?.key)
}

function getCellMoveKey(event) {
  if (event?.key === 'Enter' && event.shiftKey) return ''
  if (event?.key === 'Enter') return 'ArrowDown'
  return isArrowKeyboardEvent(event) ? event.key : ''
}

function shouldCompleteEditingOnly(event) {
  return event?.key === 'Enter' && event.shiftKey
}

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

function isEditableColumnDef(columnDef, params = {}) {
  if (typeof columnDef?.editable === 'function') return Boolean(columnDef.editable(params))
  return columnDef?.editable === true
}

function getTextInputFromEvent(event) {
  const target = event?.target
  if (!target) return null

  const isTextInput = (element) => {
    if (!element || typeof element !== 'object') return false
    const tagName = String(element.tagName || '').toLowerCase()
    return tagName === 'textarea' || tagName === 'input'
  }

  if (isTextInput(target)) return target
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

function assignInternalRowId(row, value) {
  Object.defineProperty(row, INTERNAL_ROW_ID, {
    value,
    enumerable: false,
    configurable: true,
    writable: true,
  })
  return row
}

function getStableRowKey(row, rowKey) {
  const internalKey = row?.[INTERNAL_ROW_ID]
  return isEmptyValue(internalKey) ? getRowKeyValue(row, rowKey) : internalKey
}

export function createTableApi(options = {}) {
  const base = createBaseComponentApi(options)
  const {
    rows = null,
    columns = null,
    selected = null,
    pagination = null,
    loading = null,
    rowKey = 'id',
  } = options
  let gridApi = null
  let internalRowSequence = 0
  let generatedRowKeySequence = 0
  const pendingBlankRows = new WeakSet()

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
    return !name || name === 'actions' || name === ROW_MODE_FIELD || name === rowKey
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

  const moveToAdjacentEditableCell = (params, key) => {
    const eventApi = params.api || gridApi
    const moveKey = getCellMoveKey({ key })
    const shouldStartEditingAfterMove = key !== 'Enter'
    if (!eventApi || !moveKey) return false

    const columns = getDisplayedColumns(eventApi)
    if (columns.length === 0) return false

    const currentColumnId = params.column?.getColId?.() || params.colDef?.colId || params.colDef?.field
    const currentColumnIndex = columns.findIndex((column) => column?.getColId?.() === currentColumnId)
    const currentRowIndex = Number.isInteger(Number(params.node?.rowIndex))
      ? Number(params.node.rowIndex)
      : Number(eventApi.getFocusedCell?.()?.rowIndex)

    if (!Number.isInteger(currentRowIndex) || currentColumnIndex < 0) return false

    const displayedRowCount = Number(eventApi.getDisplayedRowCount?.() ?? api.getRows().length)
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
        if (isEditableColumnDef(columnDef, {
          ...params,
          api: eventApi,
          node: rowNode,
          data: rowNode?.data,
          column: columns[nextColumnIndex],
          colDef: columnDef,
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
    if (!targetColumnId || !isEditableColumnDef(targetColumnDef, {
      ...params,
      api: eventApi,
      node: targetRowNode,
      data: targetRowNode?.data,
      column: targetColumn,
      colDef: targetColumnDef,
    })) return false

    params.event?.preventDefault?.()
    params.event?.stopPropagation?.()
    eventApi.stopEditing?.(false)

    setTimeout(() => {
      eventApi.ensureIndexVisible?.(nextRowIndex)
      eventApi.ensureColumnVisible?.(targetColumnId)
      eventApi.setFocusedCell?.(nextRowIndex, targetColumnId)
      if (shouldStartEditingAfterMove) {
        eventApi.startEditingCell?.({ rowIndex: nextRowIndex, colKey: targetColumnId })
      }
    }, 0)

    return true
  }

  const completeCurrentEdit = (params = {}) => {
    const eventApi = params.api || gridApi
    if (!eventApi) return false

    params.event?.preventDefault?.()
    params.event?.stopPropagation?.()
    eventApi.stopEditing?.(false)
    return true
  }

  const delCreatedBlankLastRowOnArrowUp = (params = {}) => {
    const keyboardEvent = params.event
    const eventApi = params.api || gridApi
    if (keyboardEvent?.key !== 'ArrowUp' || !eventApi || !params.data) return false

    const editorInput = getTextInputFromEvent(keyboardEvent)
    if (editorInput && !isEmptyValue(editorInput.value)) return false

    const rowIndex = Number(params.node?.rowIndex)
    const displayedRowCount = Number(eventApi.getDisplayedRowCount?.() ?? api.getRows().length)
    const isLastDisplayedRow =
      Number.isInteger(rowIndex) && rowIndex >= Math.max(0, displayedRowCount - 1)
    if (!isLastDisplayedRow || !isCreatedBlankDataRow(params.data)) return false

    keyboardEvent.preventDefault?.()
    keyboardEvent.stopPropagation?.()
    eventApi.stopEditing?.(false)

    const removedIndex = findDataRowIndex(params)
    api.delRow(removedIndex)

    setTimeout(() => {
      const nextRowCount = Number(eventApi.getDisplayedRowCount?.() ?? api.getRows().length)
      if (nextRowCount <= 0) return
      const nextIndex = Math.min(Math.max(0, removedIndex - 1), nextRowCount - 1)
      eventApi.ensureIndexVisible?.(nextIndex)
      eventApi.setFocusedCell?.(nextIndex, params.column?.getColId?.())
    }, 0)

    return true
  }

  const api = {
    ...base,
    setGridApi(nextGridApi) {
      gridApi = nextGridApi || null
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
    handleCellKeyDown(event) {
      const keyboardEvent = event?.event
      if (keyboardEvent?.key !== 'ArrowDown' && keyboardEvent?.key !== 'ArrowUp') return false

      const eventApi = event?.api || gridApi
      const rowIndex = Number(event?.node?.rowIndex)
      const displayedRowCount = Number(eventApi?.getDisplayedRowCount?.() ?? api.getRows().length)
      const isLastDisplayedRow =
        Number.isInteger(rowIndex) && rowIndex >= Math.max(0, displayedRowCount - 1)

      if (!isLastDisplayedRow) return false

      if (delCreatedBlankLastRowOnArrowUp({ ...event, event: keyboardEvent })) return true

      if (keyboardEvent.key !== 'ArrowDown') return false
      if (event?.data && pendingBlankRows.has(event.data) && isDataRowBlank(event.data)) return false

      keyboardEvent.preventDefault?.()
      const newRow = api.addEmptyRow()
      const nextIndex = api.getRows().length - 1
      setTimeout(() => {
        eventApi?.ensureIndexVisible?.(nextIndex)
        eventApi?.setFocusedCell?.(nextIndex, event?.column?.getColId?.())
      }, 0)
      return newRow
    },
    suppressKeyboardEvent(params = {}) {
      const event = params.event
      const columnDef = params.column?.getColDef?.() || params.colDef || {}
      if (params.editing && shouldCompleteEditingOnly(event)) {
        return completeCurrentEdit(params)
      }

      if (params.editing && delCreatedBlankLastRowOnArrowUp(params)) return true

      if (params.editing && getCellMoveKey(event)) {
        if (shouldKeepHorizontalArrowInEditor(event)) return false
        return moveToAdjacentEditableCell(params, event.key)
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

      const field = event?.colDef?.field || event?.column?.getColDef?.()?.field
      const nextRow = {
        ...nextRows[dataIndex],
        ...(event?.data && typeof event.data === 'object' ? event.data : {}),
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
