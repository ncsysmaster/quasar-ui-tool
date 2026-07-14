function getTablePreviewSelectionScript() {
  return [
    getTableHeaderEventInfo,
    markTableHeaderDomSelection,
    markSelectedTableHeaderDomSelection,
    markSelectedTableBodyDomSelection,
    resetTableHeaderDomSpans,
    applyTableHeaderLayoutDomSpans,
    scheduleTableHeaderDomSync,
    getAgHeaderDomRowIndex,
    getAgHeaderCellLogicalBounds,
    getAgHeaderColumnIndexesFromCell,
    getTableSourceColumnIndexByHeaderCell,
    tableHeaderInfoToColumnEditorNode,
    tableBodyInfoToColumnEditorNode,
    getTableBodyLayoutEventInfo,
    getTableLayoutCellIndexAtColumn,
    createTableLayoutCellItem,
    getTableBodyLayoutCells,
    getTableBodyLayoutCellInfo,
    getTableLayoutSelectionKey,
    findMatchingTableLayoutCell,
    getTableBodySelectionCells,
    tableLayoutRectsOverlap,
    tableLayoutRectsTouch,
    getTableLayoutSelectionRectangle,
    isCompleteTableLayoutSelectionRectangle,
    createTableHeaderLayoutCellItem,
    getTableHeaderLayoutCells,
    getTableHeaderLayoutCellInfo,
    getTableHeaderSelectionKey,
    getTableHeaderSelectionCells,
    tableHeaderRectsOverlap,
    tableHeaderRectsTouch,
    getTableHeaderSelectionRectangle,
    isCompleteTableHeaderSelectionRectangle,
    createTableHeaderSelectionCell,
    createTableBodySelectionCell,
    isTableHeaderInfoSelected,
    isTableBodyInfoSelected,
    selectAdjacentTableHeaderCell,
    selectAdjacentTableBodyCell,
    getSelectedTableHeaderRange,
    getSelectedTableBodyRange,
    canMergeSelectedTableHeaderCells,
    canSplitSelectedTableHeaderCell,
    canMergeSelectedTableBodyCells,
    canSplitSelectedTableBodyCell,
    mergeSelectedTableHeaderCells,
    splitSelectedTableHeaderCell,
    mergeSelectedTableBodyCells,
    splitSelectedTableBodyCell,
    mergeTableHeaderLayoutCells,
    splitTableHeaderLayoutCell,
    mergeTableBodyLayoutCells,
    splitTableBodyLayoutCell,
    postTableLayoutUpdate,
    handleTableHeaderCtrlClick,
    handleTableBodyCtrlClick,
    mergeOrSplitTableBodyLayoutCells,
  ]
    .map((fn) => fn.toString())
    .join("\n\n")
}




      // ---- shared layout-cell / rect geometry (header + body) ----

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


      function createTableLayoutCellItem(component, rows, columns, cell, rowIndex, cellIndex) {
        const indexes = getTablePreviewLayoutColumnIndexes(columns, cell)
        if (indexes.length === 0) return null
        const start = Math.min(...indexes)
        const end = Math.max(...indexes)
        const rowSpan = Math.max(1, Math.min(rows.length - rowIndex, Number(cell?.rowspan || 1)))
        return {
          componentId: component.id,
          rowIndex,
          rowEnd: rowIndex + rowSpan - 1,
          columnIndex: start,
          start,
          end,
          cellIndex,
          cellId: String(cell?.cellId || ''),
          cell
        }
      }


      function getTableLayoutSelectionKey(cell) {
        return [
          cell.componentId || '',
          cell.rowIndex,
          cell.cellIndex,
          cell.cellId || '',
          cell.start,
          cell.end
        ].join(':')
      }


      function findMatchingTableLayoutCell(knownCells, selectedCell) {
        if (!selectedCell) return null
        const selectedKey = getTableLayoutSelectionKey(selectedCell)
        return knownCells.find((cell) => getTableLayoutSelectionKey(cell) === selectedKey) ||
          knownCells.find((cell) =>
            cell.componentId === selectedCell.componentId &&
            cell.rowIndex === selectedCell.rowIndex &&
            (cell.rowEnd ?? cell.rowIndex) === (selectedCell.rowEnd ?? selectedCell.rowIndex) &&
            cell.start === selectedCell.start &&
            cell.end === selectedCell.end
          ) ||
          knownCells.find((cell) =>
            cell.componentId === selectedCell.componentId &&
            tableLayoutRectsOverlap(cell, selectedCell)
          ) ||
          null
      }


      function tableLayoutRectsOverlap(left, right) {
        return Math.max(left.rowIndex, right.rowIndex) <= Math.min(left.rowEnd ?? left.rowIndex, right.rowEnd ?? right.rowIndex) &&
          Math.max(left.start, right.start) <= Math.min(left.end, right.end)
      }


      function tableLayoutRectsTouch(left, right) {
        const leftBottom = left.rowEnd ?? left.rowIndex
        const rightBottom = right.rowEnd ?? right.rowIndex
        const rowsOverlap = Math.max(left.rowIndex, right.rowIndex) <= Math.min(leftBottom, rightBottom)
        const columnsOverlap = Math.max(left.start, right.start) <= Math.min(left.end, right.end)
        const horizontalTouch = rowsOverlap && (left.end + 1 === right.start || right.end + 1 === left.start)
        const verticalTouch = columnsOverlap && (leftBottom + 1 === right.rowIndex || rightBottom + 1 === left.rowIndex)
        return horizontalTouch || verticalTouch
      }


      function getTableLayoutSelectionRectangle(cells) {
        const selected = (cells || []).filter(Boolean)
        if (selected.length === 0) return null
        return {
          rowIndex: Math.min(...selected.map((cell) => cell.rowIndex)),
          rowEnd: Math.max(...selected.map((cell) => cell.rowEnd ?? cell.rowIndex)),
          start: Math.min(...selected.map((cell) => cell.start)),
          end: Math.max(...selected.map((cell) => cell.end)),
          selectedCount: selected.length,
          cells: selected
        }
      }


      function isCompleteTableLayoutSelectionRectangle(range) {
        if (!range) return false
        const covered = new Set()
        for (const cell of range.cells) {
          const rowEnd = cell.rowEnd ?? cell.rowIndex
          for (let rowIndex = cell.rowIndex; rowIndex <= rowEnd; rowIndex += 1) {
            for (let columnIndex = cell.start; columnIndex <= cell.end; columnIndex += 1) {
              const key = rowIndex + ':' + columnIndex
              if (covered.has(key)) return false
              covered.add(key)
            }
          }
        }
        const area = (range.rowEnd - range.rowIndex + 1) * (range.end - range.start + 1)
        return covered.size === area
      }


      function postTableLayoutUpdate(component, columns) {
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


      // ---- DOM event info / span sync (header + body) ----

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


      function markSelectedTableHeaderDomSelection(wrapper, component) {
        wrapper.querySelectorAll?.('.qt-ag-header-selected')
          .forEach((element) => element.classList.remove('qt-ag-header-selected'))
        const selected = selectedTableHeaderMergeCells.filter((cell) => cell.componentId === component.id)
        if (selected.length === 0) return
        wrapper.querySelectorAll?.('.ag-header-cell, .ag-header-group-cell').forEach((element) => {
          const info = getTableHeaderEventInfo({ target: element, currentTarget: wrapper }, component)
          if (!info) return
          const current = createTableHeaderSelectionCell(component, info)
          if (selected.some((cell) => tableHeaderRectsOverlap(cell, current))) {
            element.classList.add('qt-ag-header-selected')
          }
        })
      }


      function markSelectedTableBodyDomSelection(wrapper, component) {
        wrapper.querySelectorAll?.('.qt-ag-body-selected')
          .forEach((element) => element.classList.remove('qt-ag-body-selected'))
        const selected = selectedTableBodyMergeCells.filter((cell) => cell.componentId === component.id)
        if (selected.length === 0) return
        wrapper.querySelectorAll?.('.qt-ag-layout-input, .ag-center-cols-container .ag-cell, .ag-pinned-left-cols-container .ag-cell, .ag-pinned-right-cols-container .ag-cell').forEach((element) => {
          const info = getTableBodyLayoutEventInfo({ target: element, currentTarget: wrapper }, component)
          if (!info) return
          const current = createTableBodySelectionCell(component, info)
          if (selected.some((cell) => tableLayoutRectsOverlap(cell, current))) {
            element.classList.add('qt-ag-body-selected')
          }
        })
      }


      function resetTableHeaderDomSpans(wrapper) {
        wrapper.querySelectorAll?.('.qt-ag-header-span-anchor').forEach((element) => {
          element.classList.remove('qt-ag-header-span-anchor')
          element.style.width = ''
          element.style.zIndex = ''
        })
        wrapper.querySelectorAll?.('.qt-ag-header-span-hidden').forEach((element) => {
          element.classList.remove('qt-ag-header-span-hidden')
          element.style.visibility = ''
          element.style.pointerEvents = ''
        })
      }


      function applyTableHeaderLayoutDomSpans(wrapper, component) {
        resetTableHeaderDomSpans(wrapper)
        const wrapperBounds = wrapper.getBoundingClientRect?.()
        const headerRowCount = getTableHeaderRows(component)
        const groupRows = Math.max(0, headerRowCount - 1)
        const columns = Array.isArray(component?.columns) ? component.columns : []
        if (columns.length === 0 || groupRows < 0) return
        const layoutRows = normalizeTablePreviewLayoutRows(component.headerRows, columns, headerRowCount, 'header')
        const domRows = [...(wrapper.querySelectorAll?.('.ag-header-row') || [])]

        if (wrapperBounds) {
          wrapper.querySelectorAll?.('.ag-header-cell').forEach((element) => {
            const bounds = element.getBoundingClientRect()
            element.dataset.qtAgLogicalLeft = String(bounds.left - wrapperBounds.left)
            element.dataset.qtAgLogicalRight = String(bounds.right - wrapperBounds.left)
          })
        }

        layoutRows.forEach((row, rowIndex) => {
          if (rowIndex < groupRows) return
          const domRow = domRows.find((element) => getAgHeaderDomRowIndex(element) === rowIndex)
          if (!domRow) return
          const leafCells = [...domRow.querySelectorAll('.ag-header-cell')]
          row.forEach((cell) => {
            const keys = getTablePreviewLayoutCellColumns(cell)
            if (keys.length < 2) return
            const cells = keys
              .map((key) => {
                const column = columns.find((item) =>
                  String(item?.field || item?.name || '') === String(key) ||
                  String(item?.name || item?.field || '') === String(key)
                )
                const colId = String(column?.name || column?.field || key)
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
            anchor.style.width = Math.max(0, right - left) + 'px'
            anchor.style.zIndex = '5'
            ordered.slice(1).forEach((element) => {
              element.classList.add('qt-ag-header-span-hidden')
              element.style.visibility = 'hidden'
              element.style.pointerEvents = 'none'
            })
          })
        })
      }


      function scheduleTableHeaderDomSync(wrapper, component) {
        if (!wrapper || !component) return
        const sync = () => {
          applyTableHeaderLayoutDomSpans(wrapper, component)
          markSelectedTableHeaderDomSelection(wrapper, component)
          markSelectedTableBodyDomSelection(wrapper, component)
        }
        if (typeof requestAnimationFrame === 'function') {
          requestAnimationFrame(() => requestAnimationFrame(sync))
        }
        setTimeout(sync, 60)
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


      function getAgHeaderCellLogicalBounds(wrapper, headerCell) {
        const wrapperBounds = wrapper?.getBoundingClientRect?.()
        const bounds = headerCell?.getBoundingClientRect?.()
        if (!bounds) return null
        const storedLeft = Number(headerCell?.dataset?.qtAgLogicalLeft)
        const storedRight = Number(headerCell?.dataset?.qtAgLogicalRight)
        if (Number.isFinite(storedLeft) && Number.isFinite(storedRight) && storedRight > storedLeft && wrapperBounds) {
          return {
            left: wrapperBounds.left + storedLeft,
            right: wrapperBounds.left + storedRight
          }
        }
        return { left: bounds.left, right: bounds.right }
      }


      function getAgHeaderColumnIndexesFromCell(wrapper, headerCell, component) {
        const isLeafHeader = headerCell?.classList?.contains('ag-header-cell') &&
          !headerCell?.classList?.contains('ag-header-group-cell')
        if (isLeafHeader) {
          const directIndex = getTableSourceColumnIndexByHeaderCell(component, headerCell, -1)
          return directIndex >= 0 ? [directIndex] : []
        }

        const headerBounds = getAgHeaderCellLogicalBounds(wrapper, headerCell)
        if (!headerBounds) return []
        const leafCells = [...wrapper.querySelectorAll('.ag-header-cell')]
          .filter((cell) => !cell.classList.contains('ag-header-group-cell'))
        const indexes = []
        leafCells.forEach((cell, orderIndex) => {
          const bounds = getAgHeaderCellLogicalBounds(wrapper, cell)
          if (!bounds) return
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
        if (!previewColumn || isTablePreviewModeColumn(previewColumn) || isTablePreviewSelectionColumn(previewColumn)) return -1
        const sourceColumns = Array.isArray(component?.columns) ? component.columns : []
        const sourceIndex = sourceColumns.indexOf(previewColumn)
        if (sourceIndex >= 0) return sourceIndex
        const utilityOffset = previewColumns.filter((column) =>
          isTablePreviewModeColumn(column) || isTablePreviewSelectionColumn(column)
        ).length
        const fallbackIndex = previewIndex - utilityOffset
        return fallbackIndex >= 0 && fallbackIndex < sourceColumns.length ? fallbackIndex : -1
      }


      function tableHeaderInfoToColumnEditorNode(info, component) {
        const cellInfo = getTableHeaderLayoutCellInfo(component, info.rowIndex, info.columnIndex)
        if (cellInfo) {
          return { kind: 'layout', layout: 'header', rowIndex: cellInfo.rowIndex, cellIndex: cellInfo.cellIndex }
        }
        return { kind: 'column', index: info.columnIndex }
      }


      function tableBodyInfoToColumnEditorNode(info) {
        return { kind: 'layout', layout: 'body', rowIndex: info.rowIndex, cellIndex: info.cellIndex }
      }


      function getTableBodyLayoutEventInfo(event, component) {
        const input = event.target?.closest?.('.qt-ag-layout-input')
        if (input) {
          const cellId = String(input.dataset.qtAgLayoutCellId || '')
          const rowStart = Math.max(0, Number(input.dataset.qtAgLayoutRowStart || 0))
          const colStart = Math.max(0, Number(input.dataset.qtAgLayoutColStart || 0))
          const cellInfo = getTableBodyLayoutCells(component).cells.find((cell) =>
            (cellId && cell.cellId === cellId) ||
            (rowStart >= cell.rowIndex && rowStart <= cell.rowEnd && colStart >= cell.start && colStart <= cell.end)
          )
          if (cellInfo) return {
            rowIndex: cellInfo.rowIndex,
            rowEnd: cellInfo.rowEnd,
            cellIndex: cellInfo.cellIndex,
            columnIndex: cellInfo.start,
            start: cellInfo.start,
            end: cellInfo.end,
            cellId: cellInfo.cellId
          }
        }
        const bodyCell = event.target?.closest?.('.ag-center-cols-container .ag-cell, .ag-pinned-left-cols-container .ag-cell, .ag-pinned-right-cols-container .ag-cell')
        if (!bodyCell || !event.currentTarget?.contains?.(bodyCell)) return null
        const colId = bodyCell.getAttribute('col-id') || ''
        const columns = Array.isArray(component?.columns) ? component.columns : []
        const columnIndex = columns.findIndex((column) => String(column?.name || column?.field || '') === colId)
        if (columnIndex < 0) return null
        const domRow = bodyCell.closest?.('.ag-row')
        const displayRowIndex = Math.max(0, Number(domRow?.getAttribute?.('row-index') || 0))
        const rowIndex = displayRowIndex % getTableRowRows(component)
        const cellIndex = getTableBodyLayoutCellInfo(component, rowIndex, columnIndex)?.cellIndex ?? -1
        if (cellIndex < 0) return null
        const cellInfo = getTableBodyLayoutCellInfo(component, rowIndex, columnIndex)
        return {
          rowIndex: cellInfo?.rowIndex ?? rowIndex,
          rowEnd: cellInfo?.rowEnd ?? rowIndex,
          cellIndex,
          columnIndex: cellInfo?.start ?? columnIndex,
          start: cellInfo?.start ?? columnIndex,
          end: cellInfo?.end ?? columnIndex,
          cellId: cellInfo?.cellId || ''
        }
      }


      // ---- header cell model / selection / merge-split ----

      function getTableHeaderLayoutCellInfo(component, rowIndex, columnIndex) {
        return getTableHeaderLayoutCells(component).cells.find((cell) =>
          rowIndex >= cell.rowIndex &&
          rowIndex <= cell.rowEnd &&
          columnIndex >= cell.start &&
          columnIndex <= cell.end
        ) || null
      }


      function createTableHeaderLayoutCellItem(component, rows, columns, cell, rowIndex, cellIndex) {
        return createTableLayoutCellItem(component, rows, columns, cell, rowIndex, cellIndex)
      }


      function getTableHeaderLayoutCells(component) {
        const columns = Array.isArray(component?.columns) ? component.columns : []
        const rows = normalizeTablePreviewLayoutRows(component.headerRows, columns, getTableHeaderRows(component), 'header')
        const cells = []
        rows.forEach((row, rowIndex) => {
          row.forEach((cell, cellIndex) => {
            const item = createTableHeaderLayoutCellItem(component, rows, columns, cell, rowIndex, cellIndex)
            if (item) cells.push(item)
          })
        })
        return { columns, rows, cells }
      }


      function getTableHeaderSelectionKey(cell) {
        return getTableLayoutSelectionKey(cell)
      }


      function getTableHeaderSelectionCells(component) {
        const known = getTableHeaderLayoutCells(component).cells
        return selectedTableHeaderMergeCells
          .filter((cell) => cell.componentId === component.id)
          .map((cell) => findMatchingTableLayoutCell(known, cell) || cell)
      }


      function tableHeaderRectsOverlap(left, right) {
        return tableLayoutRectsOverlap(left, right)
      }


      function tableHeaderRectsTouch(left, right) {
        return tableLayoutRectsTouch(left, right)
      }


      function getTableHeaderSelectionRectangle(cells) {
        return getTableLayoutSelectionRectangle(cells)
      }


      function isCompleteTableHeaderSelectionRectangle(range) {
        return isCompleteTableLayoutSelectionRectangle(range)
      }


      function createTableHeaderSelectionCell(component, info) {
        const cellInfo = getTableHeaderLayoutCellInfo(component, info.rowIndex, info.columnIndex)
        if (cellInfo) {
          return {
            componentId: component.id,
            rowIndex: cellInfo.rowIndex,
            rowEnd: cellInfo.rowEnd,
            columnIndex: cellInfo.start,
            start: cellInfo.start,
            end: cellInfo.end,
            cellIndex: cellInfo.cellIndex,
            cellId: String(cellInfo.cell?.cellId || '')
          }
        }
        return {
          componentId: component.id,
          rowIndex: info.rowIndex,
          rowEnd: info.rowIndex,
          columnIndex: info.columnIndex,
          start: info.start,
          end: info.end
        }
      }


      function isTableHeaderInfoSelected(component, info) {
        const current = createTableHeaderSelectionCell(component, info)
        return selectedTableHeaderMergeCells.some((cell) =>
          cell.componentId === component.id && tableHeaderRectsOverlap(cell, current)
        )
      }


      function selectAdjacentTableHeaderCell(component, info) {
        const current = createTableHeaderSelectionCell(component, info)
        const previous = selectedTableHeaderMergeCells.filter((cell) =>
          cell.componentId === current.componentId
        )
        if (previous.length === 0) {
          selectedTableHeaderMergeCells = [current]
          return true
        }
        const currentKey = getTableHeaderSelectionKey(current)
        if (previous.some((cell) => getTableHeaderSelectionKey(cell) === currentKey)) {
          selectedTableHeaderMergeCells = previous
          return true
        }
        if (!previous.some((cell) => tableHeaderRectsTouch(cell, current))) return false
        selectedTableHeaderMergeCells = [...previous, current]
          .sort((left, right) => left.rowIndex - right.rowIndex || left.start - right.start)
        return true
      }


      function getSelectedTableHeaderRange(component) {
        return getTableHeaderSelectionRectangle(getTableHeaderSelectionCells(component))
      }


      function canMergeSelectedTableHeaderCells(component) {
        const range = getSelectedTableHeaderRange(component)
        if (!range || range.selectedCount < 2) return false
        return isCompleteTableHeaderSelectionRectangle(range)
      }


      function canSplitSelectedTableHeaderCell(component, info = null) {
        const selected = getTableHeaderSelectionCells(component)
        if (selected.length !== 1) return false
        const target = info ? createTableHeaderSelectionCell(component, info) : selected[0]
        if (!target) return false
        const cellInfo = getTableHeaderLayoutCellInfo(component, target.rowIndex, target.columnIndex)
        const columnCount = getTablePreviewLayoutCellColumns(cellInfo?.cell).length
        const rowSpan = Math.max(1, Number(cellInfo?.cell?.rowspan || 1))
        return Boolean(cellInfo && (columnCount > 1 || rowSpan > 1))
      }


      function mergeSelectedTableHeaderCells(componentId) {
        const component = findTableComponent(model?.components || [], componentId)
        if (!component || !canMergeSelectedTableHeaderCells(component)) return
        const range = getSelectedTableHeaderRange(component)
        mergeTableHeaderLayoutCells(component, range)
        selectedTableHeaderMergeCells = []
      }


      function splitSelectedTableHeaderCell(componentId) {
        const component = findTableComponent(model?.components || [], componentId)
        if (!component || !canSplitSelectedTableHeaderCell(component)) return
        const target = getTableHeaderSelectionCells(component)[0]
        const cellInfo = target ? getTableHeaderLayoutCellInfo(component, target.rowIndex, target.columnIndex) : null
        if (!cellInfo) return
        splitTableHeaderLayoutCell(component, cellInfo)
        selectedTableHeaderMergeCells = []
      }


      function mergeTableHeaderLayoutCells(component, range) {
        if (!range || !isCompleteTableHeaderSelectionRectangle(range)) return
        const columns = JSON.parse(JSON.stringify(component.columns || []))
        const rows = normalizeTablePreviewLayoutRows(component.headerRows, columns, getTableHeaderRows(component), 'header')
        const columnKeys = columns.slice(range.start, range.end + 1).map((column) => String(column?.field || column?.name || '')).filter(Boolean)
        if (columnKeys.length === 0) return
        const cells = []
        rows.forEach((row, rowIndex) => {
          row.forEach((cell, cellIndex) => {
            const item = createTableHeaderLayoutCellItem(component, rows, columns, cell, rowIndex, cellIndex)
            if (item && range.cells.some((selected) => tableHeaderRectsOverlap(selected, item))) cells.push(item)
          })
        })
        if (cells.length !== range.cells.length) return
        const first = cells.slice().sort((left, right) => left.rowIndex - right.rowIndex || left.start - right.start)[0] || {}
        const merged = {
          cellId: first.cell?.cellId,
          label: first.cell?.label || columnKeys[0] || '',
          field: first.cell?.field || columnKeys[0] || '',
          columns: columnKeys,
          ...(columnKeys.length > 1 ? { colspan: columnKeys.length } : {}),
          ...(range.rowEnd > range.rowIndex ? { rowspan: range.rowEnd - range.rowIndex + 1 } : {})
        }

        for (let rowIndex = range.rowEnd; rowIndex >= range.rowIndex; rowIndex -= 1) {
          const row = rows[rowIndex]
          if (!row) continue
          const indexes = cells
            .filter((cell) => cell.rowIndex === rowIndex)
            .map((cell) => cell.cellIndex)
          if (indexes.length === 0) continue
          if (rowIndex === range.rowIndex) {
            const insertIndex = Math.min(...indexes)
            indexes.slice().sort((left, right) => right - left).forEach((index) => row.splice(index, 1))
            row.splice(insertIndex, 0, merged)
          } else {
            indexes.slice().sort((left, right) => right - left).forEach((index) => row.splice(index, 1))
          }
        }
        component.headerRows = rows
        postTableLayoutUpdate(component, columns)
      }


      function splitTableHeaderLayoutCell(component, cellInfo) {
        const columns = JSON.parse(JSON.stringify(component.columns || []))
        const rows = normalizeTablePreviewLayoutRows(component.headerRows, columns, getTableHeaderRows(component), 'header')
        const cell = rows?.[cellInfo.rowIndex]?.[cellInfo.cellIndex]
        if (!cell) return
        const cellColumns = getTablePreviewLayoutCellColumns(cell)
        const rowSpan = Math.max(1, Math.min(rows.length - cellInfo.rowIndex, Number(cell?.rowspan || 1)))
        if (cellColumns.length <= 1 && rowSpan <= 1) return
        const createSplitCells = () => cellColumns.map((key) => {
          const column = columns.find((item) => String(item?.field || item?.name || '') === String(key)) || {}
          return {
            label: column.label || key,
            field: key,
            columns: [key]
          }
        })
        rows[cellInfo.rowIndex].splice(cellInfo.cellIndex, 1, ...createSplitCells())
        for (let rowIndex = cellInfo.rowIndex + 1; rowIndex < cellInfo.rowIndex + rowSpan; rowIndex += 1) {
          const row = rows[rowIndex]
          if (!row) continue
          const insertIndex = row.findIndex((candidate) => {
            const indexes = getTablePreviewLayoutColumnIndexes(columns, candidate)
            return indexes.length > 0 && Math.min(...indexes) > cellInfo.start
          })
          row.splice(insertIndex >= 0 ? insertIndex : row.length, 0, ...createSplitCells())
        }
        component.headerRows = rows
        postTableLayoutUpdate(component, columns)
      }


      function handleTableHeaderCtrlClick(component, info) {
        return selectAdjacentTableHeaderCell(component, info)
      }


      // ---- body cell model / selection / merge-split ----

      function getTableBodyLayoutCells(component) {
        const columns = Array.isArray(component?.columns) ? component.columns : []
        const rows = normalizeTablePreviewLayoutRows(component.bodyRows, columns, getTableRowRows(component), 'body')
        const cells = []
        rows.forEach((row, rowIndex) => {
          row.forEach((cell, cellIndex) => {
            const item = createTableLayoutCellItem(component, rows, columns, cell, rowIndex, cellIndex)
            if (item) cells.push(item)
          })
        })
        return { columns, rows, cells }
      }


      function getTableBodyLayoutCellInfo(component, rowIndex, columnIndex) {
        return getTableBodyLayoutCells(component).cells.find((cell) =>
          rowIndex >= cell.rowIndex &&
          rowIndex <= cell.rowEnd &&
          columnIndex >= cell.start &&
          columnIndex <= cell.end
        ) || null
      }


      function createTableBodySelectionCell(component, info) {
        const cellInfo = getTableBodyLayoutCellInfo(component, info.rowIndex, info.columnIndex)
        if (cellInfo) {
          return {
            componentId: component.id,
            rowIndex: cellInfo.rowIndex,
            rowEnd: cellInfo.rowEnd,
            columnIndex: cellInfo.start,
            start: cellInfo.start,
            end: cellInfo.end,
            cellIndex: cellInfo.cellIndex,
            cellId: String(cellInfo.cell?.cellId || '')
          }
        }
        return {
          componentId: component.id,
          rowIndex: info.rowIndex,
          rowEnd: info.rowEnd ?? info.rowIndex,
          columnIndex: info.columnIndex,
          start: info.start,
          end: info.end,
          cellIndex: info.cellIndex,
          cellId: String(info.cellId || '')
        }
      }


      function isTableBodyInfoSelected(component, info) {
        const current = createTableBodySelectionCell(component, info)
        return selectedTableBodyMergeCells.some((cell) =>
          cell.componentId === component.id && tableLayoutRectsOverlap(cell, current)
        )
      }


      function selectAdjacentTableBodyCell(component, info) {
        const current = createTableBodySelectionCell(component, info)
        const previous = selectedTableBodyMergeCells.filter((cell) =>
          cell.componentId === current.componentId
        )
        if (previous.length === 0) {
          selectedTableBodyMergeCells = [current]
          return true
        }
        const currentKey = getTableLayoutSelectionKey(current)
        if (previous.some((cell) => getTableLayoutSelectionKey(cell) === currentKey)) {
          selectedTableBodyMergeCells = previous
          return true
        }
        if (!previous.some((cell) => tableLayoutRectsTouch(cell, current))) return false
        selectedTableBodyMergeCells = [...previous, current]
          .sort((left, right) => left.rowIndex - right.rowIndex || left.start - right.start)
        return true
      }


      function getTableBodySelectionCells(component) {
        const known = getTableBodyLayoutCells(component).cells
        return selectedTableBodyMergeCells
          .filter((cell) => cell.componentId === component.id)
          .map((cell) => findMatchingTableLayoutCell(known, cell) || cell)
      }


      function getSelectedTableBodyRange(component) {
        return getTableLayoutSelectionRectangle(getTableBodySelectionCells(component))
      }


      function canMergeSelectedTableBodyCells(component) {
        const range = getSelectedTableBodyRange(component)
        if (!range || range.selectedCount < 2) return false
        return isCompleteTableLayoutSelectionRectangle(range)
      }


      function canSplitSelectedTableBodyCell(component, info = null) {
        const selected = getTableBodySelectionCells(component)
        if (selected.length !== 1) return false
        const target = info ? createTableBodySelectionCell(component, info) : selected[0]
        if (!target) return false
        const cellInfo = getTableBodyLayoutCellInfo(component, target.rowIndex, target.columnIndex)
        const columnCount = getTablePreviewLayoutCellColumns(cellInfo?.cell).length
        const rowSpan = Math.max(1, Number(cellInfo?.cell?.rowspan || 1))
        return Boolean(cellInfo && (columnCount > 1 || rowSpan > 1))
      }


      function mergeSelectedTableBodyCells(componentId) {
        const component = findTableComponent(model?.components || [], componentId)
        if (!component || !canMergeSelectedTableBodyCells(component)) return
        const range = getSelectedTableBodyRange(component)
        mergeTableBodyLayoutCells(component, range)
        selectedTableBodyMergeCells = []
      }


      function splitSelectedTableBodyCell(componentId) {
        const component = findTableComponent(model?.components || [], componentId)
        if (!component || !canSplitSelectedTableBodyCell(component)) return
        const target = getTableBodySelectionCells(component)[0]
        const cellInfo = target ? getTableBodyLayoutCellInfo(component, target.rowIndex, target.columnIndex) : null
        if (!cellInfo) return
        splitTableBodyLayoutCell(component, cellInfo)
        selectedTableBodyMergeCells = []
      }


      function mergeTableBodyLayoutCells(component, range) {
        if (!range || !isCompleteTableLayoutSelectionRectangle(range)) return
        const columns = JSON.parse(JSON.stringify(component.columns || []))
        const rows = normalizeTablePreviewLayoutRows(component.bodyRows, columns, getTableRowRows(component), 'body')
        const columnKeys = columns.slice(range.start, range.end + 1).map((column) => String(column?.field || column?.name || '')).filter(Boolean)
        if (columnKeys.length === 0) return
        const cells = []
        rows.forEach((row, rowIndex) => {
          row.forEach((cell, cellIndex) => {
            const item = createTableLayoutCellItem(component, rows, columns, cell, rowIndex, cellIndex)
            if (item && range.cells.some((selected) => tableLayoutRectsOverlap(selected, item))) cells.push(item)
          })
        })
        if (cells.length !== range.cells.length) return
        const first = cells.slice().sort((left, right) => left.rowIndex - right.rowIndex || left.start - right.start)[0] || {}
        const merged = {
          cellId: first.cell?.cellId,
          label: first.cell?.label || columnKeys[0] || '',
          field: first.cell?.field || columnKeys[0] || '',
          columns: columnKeys,
          ...(columnKeys.length > 1 ? { colspan: columnKeys.length } : {}),
          ...(range.rowEnd > range.rowIndex ? { rowspan: range.rowEnd - range.rowIndex + 1 } : {})
        }

        for (let rowIndex = range.rowEnd; rowIndex >= range.rowIndex; rowIndex -= 1) {
          const row = rows[rowIndex]
          if (!row) continue
          const indexes = cells
            .filter((cell) => cell.rowIndex === rowIndex)
            .map((cell) => cell.cellIndex)
          if (indexes.length === 0) continue
          if (rowIndex === range.rowIndex) {
            const insertIndex = Math.min(...indexes)
            indexes.slice().sort((left, right) => right - left).forEach((index) => row.splice(index, 1))
            row.splice(insertIndex, 0, merged)
          } else {
            indexes.slice().sort((left, right) => right - left).forEach((index) => row.splice(index, 1))
          }
        }
        component.bodyRows = rows
        postTableLayoutUpdate(component, columns)
      }


      function splitTableBodyLayoutCell(component, cellInfo) {
        const columns = JSON.parse(JSON.stringify(component.columns || []))
        const rows = normalizeTablePreviewLayoutRows(component.bodyRows, columns, getTableRowRows(component), 'body')
        const cell = rows?.[cellInfo.rowIndex]?.[cellInfo.cellIndex]
        if (!cell) return
        const cellColumns = getTablePreviewLayoutCellColumns(cell)
        const rowSpan = Math.max(1, Math.min(rows.length - cellInfo.rowIndex, Number(cell?.rowspan || 1)))
        if (cellColumns.length <= 1 && rowSpan <= 1) return
        const createSplitCells = () => cellColumns.map((key) => {
          const column = columns.find((item) => String(item?.field || item?.name || '') === String(key)) || {}
          return {
            label: column.label || key,
            field: key,
            columns: [key]
          }
        })
        rows[cellInfo.rowIndex].splice(cellInfo.cellIndex, 1, ...createSplitCells())
        for (let rowIndex = cellInfo.rowIndex + 1; rowIndex < cellInfo.rowIndex + rowSpan; rowIndex += 1) {
          const row = rows[rowIndex]
          if (!row) continue
          const insertIndex = row.findIndex((candidate) => {
            const indexes = getTablePreviewLayoutColumnIndexes(columns, candidate)
            return indexes.length > 0 && Math.min(...indexes) > cellInfo.start
          })
          row.splice(insertIndex >= 0 ? insertIndex : row.length, 0, ...createSplitCells())
        }
        component.bodyRows = rows
        postTableLayoutUpdate(component, columns)
      }


      function handleTableBodyCtrlClick(component, info) {
        return selectAdjacentTableBodyCell(component, info)
      }


      function mergeOrSplitTableBodyLayoutCells(component, rowIndex, start, end) {
        const columns = JSON.parse(JSON.stringify(component.columns || []))
        const rows = normalizeTablePreviewLayoutRows(component.bodyRows, columns, getTableRowRows(component))
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
          const rowSpan = Math.max(1, Number(selectedCells[0]?.rowspan || 1))
          const splitCells = (selectedCells[0].columns || []).map((key) => {
            const column = columns.find((item) => String(item.field || item.name) === String(key)) || {}
            return {
              label: column.label || key,
              field: key,
              columns: [key],
              ...(rowSpan > 1 ? { rowspan: rowSpan } : {})
            }
          })
          row.splice(minCell, 1, ...splitCells)
        } else {
          const rowSpans = new Set(selectedCells.map((cell) => Math.max(1, Number(cell?.rowspan || 1))))
          if (rowSpans.size !== 1) return
          const mergedColumns = selectedCells.flatMap((cell) => cell.columns || [])
          const first = selectedCells[0] || {}
          const rowSpan = [...rowSpans][0] || 1
          row.splice(minCell, maxCell - minCell + 1, {
            label: first.label || mergedColumns[0] || '',
            field: first.field || mergedColumns[0] || '',
            columns: mergedColumns,
            colspan: mergedColumns.length,
            ...(rowSpan > 1 ? { rowspan: rowSpan } : {})
          })
        }
        component.bodyRows = rows
        postTableLayoutUpdate(component, columns)
      }


module.exports = {
  getTablePreviewSelectionScript,
}
