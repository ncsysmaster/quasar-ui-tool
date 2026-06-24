import { createBaseComponentApi, resolveValue, writeValue } from './baseApi'

function asArray(value) {
  return Array.isArray(value) ? value : []
}

function getRowKeyValue(row, rowKey) {
  return row && rowKey ? row[rowKey] : undefined
}

function cloneRow(row) {
  return row && typeof row === 'object' ? { ...row } : row
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

  const api = {
    ...base,
    setGridApi(nextGridApi) {
      gridApi = nextGridApi || null
    },
    getGridApi() {
      return gridApi
    },
    getRows() {
      return asArray(resolveValue(rows))
    },
    setRows(nextRows = []) {
      writeValue(rows, Array.isArray(nextRows) ? nextRows : [])
      gridApi?.setGridOption?.('rowData', Array.isArray(nextRows) ? nextRows : [])
    },
    addRow(row = {}) {
      const nextRows = [...api.getRows(), cloneRow(row)]
      writeValue(rows, nextRows)
      gridApi?.setGridOption?.('rowData', nextRows)
      return nextRows[nextRows.length - 1]
    },
    insertRow(index, row = {}) {
      const nextRows = [...api.getRows()]
      const safeIndex = Math.max(0, Math.min(Number(index) || 0, nextRows.length))
      nextRows.splice(safeIndex, 0, cloneRow(row))
      writeValue(rows, nextRows)
      gridApi?.setGridOption?.('rowData', nextRows)
      return nextRows[safeIndex]
    },
    removeRow(index) {
      const nextRows = [...api.getRows()]
      const safeIndex = Number(index)
      if (!Number.isInteger(safeIndex) || safeIndex < 0 || safeIndex >= nextRows.length) return null
      const [removed] = nextRows.splice(safeIndex, 1)
      writeValue(rows, nextRows)
      gridApi?.setGridOption?.('rowData', nextRows)
      return removed
    },
    removeSelectedRows() {
      const selectedRows = api.getSelectedRows()
      const keys = new Set(selectedRows.map((row) => getRowKeyValue(row, rowKey)))
      const nextRows = api.getRows().filter((row) => !keys.has(getRowKeyValue(row, rowKey)))
      writeValue(rows, nextRows)
      gridApi?.setGridOption?.('rowData', nextRows)
      api.clearSelection()
      return selectedRows
    },
    getColumns() {
      return asArray(resolveValue(columns))
    },
    getSelectedRow() {
      const value = resolveValue(selected)
      return Array.isArray(value) ? value[0] || null : value || null
    },
    getSelectedRows() {
      if (gridApi) return gridApi.getSelectedRows()
      const value = resolveValue(selected)
      if (!value) return []
      return Array.isArray(value) ? value : [value]
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
      nextRows[rowIndex] = { ...nextRows[rowIndex], [field]: value }
      writeValue(rows, nextRows)
      gridApi?.setGridOption?.('rowData', nextRows)
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
        getRowKeyValue(row, rowKey) === key ? { ...row, ...patch } : row,
      )
      writeValue(rows, nextRows)
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

  return api
}
