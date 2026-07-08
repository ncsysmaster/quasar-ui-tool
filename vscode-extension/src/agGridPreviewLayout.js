function getAgGridPreviewLayoutScript() {
  return [
    applyTablePreviewHeaderLayoutToColumns,
    normalizeTablePreviewLayoutRows,
    createDefaultTablePreviewLayoutRows,
    createTablePreviewLayoutCellId,
    getTablePreviewLayoutCellId,
    getTablePreviewColumnKey,
    getTablePreviewLayoutCellColumns,
    getTablePreviewLayoutColumnIndexes,
    createTablePreviewBodyLayoutRegions,
    createTablePreviewBodyLayoutColumnConfigs,
    getAgGridPreviewBodyCellConfig,
    getAgGridPreviewBodyCellValue,
    setAgGridPreviewBodyCellValue,
    getAgGridPreviewBodyCellSpan,
    getAgGridPreviewBodyCellClass,
    isAgGridPreviewBodyCellEditable,
  ]
    .map((fn) => fn.toString())
    .join("\n\n")
}


      function applyTablePreviewHeaderLayoutToColumns(columns, headerLayout, headerRows) {
        const nextColumns = (Array.isArray(columns) ? columns : []).map((column) => ({ ...column }))
        const visibleRows = getTableHeaderRows({ table: { headerRows } })
        const groupRows = Math.max(0, visibleRows - 1)
        const layoutRows = normalizeTablePreviewLayoutRows(headerLayout, nextColumns, visibleRows, 'header')
        const coveredCells = new Set()

        layoutRows.forEach((row, rowIndex) => {
          row.forEach((cell) => {
            const columnIndexes = getTablePreviewLayoutColumnIndexes(nextColumns, cell)
              .filter((columnIndex) => !coveredCells.has(rowIndex + ':' + columnIndex))
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
                columnIndexes.forEach((columnIndex) => coveredCells.add(nextRowIndex + ':' + columnIndex))
              }
            }
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
              cellId: getTablePreviewLayoutCellId(cell, kind, rowIndex, keys, cellIndex, usedCellIds),
              label: String(cell?.label || keys[0] || ''),
              field: String(cell?.field || keys[0] || ''),
              columns: keys,
              colspan: span,
              rowspan: Math.max(1, Math.min(count - rowIndex, Number(cell?.rowspan || 1)))
            }
            normalized.push(nextCell)
          })
          return normalized.length > 0 ? normalized : createDefaultTablePreviewLayoutRows(columns, 1, kind)[0]
        })
        normalizedRows.forEach((row) => row.forEach((cell) => delete cell.navigation))
        return normalizedRows
      }


      function createDefaultTablePreviewLayoutRows(columns, rowCount = 1, kind = 'body') {
        return Array.from({ length: Math.min(3, Math.max(1, Number(rowCount) || 1)) }, (_, rowIndex) =>
          (columns || []).map((column, columnIndex) => ({
            cellId: createTablePreviewLayoutCellId(kind, rowIndex, [getTablePreviewColumnKey(column)], columnIndex),
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


      function createTablePreviewLayoutCellId(kind, rowIndex, keys, cellIndex = 0) {
        const rawKey = (Array.isArray(keys) ? keys : [])
          .map((key) => String(key || '').trim())
          .filter(Boolean)
          .join('_') || 'cell' + (Number(cellIndex) + 1)
        const safeKey = rawKey
          .replace(/[^A-Za-z0-9_가-힣-]+/g, '_')
          .replace(/^_+|_+$/g, '') || 'cell'
        return String(kind || 'body') + '_r' + (Number(rowIndex) + 1) + '_' + safeKey
      }


      function getTablePreviewLayoutCellId(cell, kind, rowIndex, keys, cellIndex, usedCellIds = new Set()) {
        const raw = String(cell?.cellId || '').trim()
        let cellId = raw || createTablePreviewLayoutCellId(kind, rowIndex, keys, cellIndex)
        if (usedCellIds.has(cellId)) {
          const base = cellId
          let sequence = 2
          while (usedCellIds.has(cellId)) {
            cellId = base + '_' + sequence
            sequence += 1
          }
        }
        usedCellIds.add(cellId)
        return cellId
      }


      function getTablePreviewColumnKey(column) {
        return String(column?.field || column?.name || '').trim()
      }


      function getTablePreviewLayoutCellColumns(cell) {
        if (Array.isArray(cell?.columns)) return cell.columns.map(String).filter(Boolean)
        if (cell?.field) return [String(cell.field)]
        return []
      }


      function getTablePreviewLayoutColumnIndexes(columns, cell) {
        const keys = getTablePreviewLayoutCellColumns(cell)
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
          row.forEach((cell, cellIndex) => {
            const indexes = getTablePreviewLayoutColumnIndexes(columns, cell)
            if (indexes.length === 0) return
            const start = Math.min(...indexes)
            const end = Math.max(...indexes)
            layoutCells.push({
              cellId: cell.cellId || createTablePreviewLayoutCellId('body', rowIndex, getTablePreviewLayoutCellColumns(cell), cellIndex),
              rowIndex,
              start,
              end,
              span: Math.max(1, end - start + 1),
              rowspan: Math.max(1, Math.min(rowCount - rowIndex, Number(cell.rowspan || 1))),
              field: String(cell.field || getTablePreviewColumnKey(columns[start]) || ''),
              label: String(cell.label || cell.field || ''),
              editable: columns[start]?.editable !== false
            })
          })
        })

        for (let columnIndex = 0; columnIndex < columns.length; columnIndex += 1) {
          if (consumed.has(columnIndex) || isTablePreviewUtilityColumn(columns[columnIndex])) continue
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
          const regionCells = cells
            .slice()
            .sort((left, right) => left.rowIndex - right.rowIndex || left.start - right.start)
            .map((cell, inputIndex) => ({
              ...cell,
              inputIndex,
              regionStart: columnIndex,
              regionColumnId: getTablePreviewColumnKey(columns[columnIndex]),
              localStart: Math.max(0, cell.start - columnIndex)
            }))
          const region = {
            span: regionSpan,
            rowCount,
            cells: regionCells
          }
          regions.set(columnIndex, region)
          regions.set(getTablePreviewColumnKey(columns[columnIndex]), region)
        }
        return regions
      }


      function createTablePreviewBodyLayoutColumnConfigs(columns, bodyLayout, rowRows) {
        const configs = new Map()
        const rowCount = getTableRowRows({ table: { rowRows } })
        const layoutRows = normalizeTablePreviewLayoutRows(bodyLayout, columns, rowCount)
        layoutRows.forEach((row, rowIndex) => {
          row.forEach((cell) => {
            const indexes = getTablePreviewLayoutColumnIndexes(columns, cell)
            if (indexes.length === 0) return
            const start = Math.min(...indexes)
            const end = Math.max(...indexes)
            const key = getTablePreviewColumnKey(columns[start])
            const config = configs.get(key) || { rows: {} }
            config.rows[String(rowIndex + 1)] = {
              field: String(cell.field || key || ''),
              label: String(cell.label || cell.field || key || ''),
              colspan: Math.max(1, end - start + 1),
              rowspan: Math.max(1, Math.min(rowCount - rowIndex, Number(cell.rowspan || 1))),
              cellId: String(cell.cellId || createTablePreviewLayoutCellId('body', rowIndex, getTablePreviewLayoutCellColumns(cell), 0))
            }
            configs.set(key, config)
            configs.set(start, config)
          })
        })
        return configs
      }


      function getAgGridPreviewBodyCellConfig(params, config) {
        const rowIdx = String(params?.data?.rowIdx || 1)
        return config?.rows?.[rowIdx] || null
      }


      function getAgGridPreviewBodyCellValue(params, config) {
        const cell = getAgGridPreviewBodyCellConfig(params, config)
        if (!cell) return undefined
        const field = cell.field
        return field ? params?.data?.[field] : undefined
      }


      function setAgGridPreviewBodyCellValue(params, config) {
        const cell = getAgGridPreviewBodyCellConfig(params, config)
        const field = cell?.field
        if (!field || !params?.data) return false
        params.data[field] = params.newValue
        params.data.__qtChangedField = field
        return true
      }


      function getAgGridPreviewBodyCellSpan(params, config, spanName) {
        if (params?.node?.rowPinned) return 1
        const cell = getAgGridPreviewBodyCellConfig(params, config)
        return Math.max(1, Number(cell?.[spanName] || 1))
      }


      function getAgGridPreviewBodyCellClass(params, config) {
        const cell = getAgGridPreviewBodyCellConfig(params, config)
        const classes = [getAgGridPreviewLogicalCellToneClass(params)]
        if (!cell) classes.push('qt-ag-covered-cell')
        if (Number(cell?.rowspan || 1) > 1) classes.push('qt-ag-rowspan-cell')
        return classes.join(' ')
      }


      function isAgGridPreviewBodyCellEditable(params, config) {
        return Boolean(getAgGridPreviewBodyCellConfig(params, config))
      }

module.exports = {
  getAgGridPreviewLayoutScript,
}
