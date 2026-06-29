<template>
  <q-page padding>
    <q-card flat bordered>
      <q-card-section class="q-pa-sm">
        <div class="row q-col-gutter-sm">
          <div class="col">
            <div class="row">
              <div class="col-2">
                <div class="bg-grey-4 row items-center q-px-md full-height rounded-borders overflow-hidden" style="border-radius: 4px">
                  조회분류
                  <span class="text-negative q-ml-xs">*</span>
                </div>
              </div>
              <div class="col-2 bg-white q-pa-xs">
                <q-select v-model="search.class1" :options="classOptions" outlined dense bg-color="white" />
              </div>
              <div class="col-2 bg-white q-pa-xs">
                <q-select v-model="search.class2" :options="classOptions" outlined dense bg-color="white" />
              </div>
              <div class="col-2">
                <div class="bg-grey-4 row items-center q-px-md full-height rounded-borders overflow-hidden" style="border-radius: 4px">조회구분</div>
              </div>
              <div class="col-2 bg-white row items-center q-px-sm">
                <q-toggle v-model="storeName.rows.state1.state1" label="필수" dense />
              </div>
              <div class="col-2 bg-white row items-center q-px-sm">
                <q-toggle v-model="storeName.selectedRow" label="사용여부" dense />
              </div>
            </div>
            <div class="row">
              <div class="col-2">
                <div class="bg-grey-4 row items-center q-px-md full-height rounded-borders overflow-hidden" style="border-radius: 4px">조회명</div>
              </div>
              <div class="col-10 bg-white q-pa-xs">
                <q-input v-model="storeName.searchText" outlined dense bg-color="white" />
              </div>
            </div>
          </div>
          <div class="col-auto" style="min-width: 180px; display: flex; align-items: flex-end">
            <div class="row no-wrap" style="width: 100%; height: 48px; align-items: center; justify-content: flex-end; gap: 8px; padding: 4px; background: white">
              <q-btn style="min-width: 80px; height: 36px" label="초기화" outline color="grey-7" @click="resetSearch" />
              <q-btn style="min-width: 80px; height: 36px" label="검색" color="primary" @click="onSearch" />
            </div>
          </div>
        </div>
      </q-card-section>
    </q-card>
    <q-card label="Card" flat bordered>
      <q-card-section class="q-pa-sm" label="Card Section">
        <div class="qt-ag-table-wrap" @paste.capture="Table001.handlePaste" @copy.capture="Table001.handleCopy">
          <div class="row items-center q-gutter-sm full-width qt-table-toolbar-preview">
            <div class="text-subtitle1">tblList</div>
            <q-space />
            <q-btn outline unelevated class="qt-table-toolbar-btn" style="height: 24px; min-height: 24px; padding: 0 10px; background: rgba(255, 255, 255, 0.82); opacity: 0.72" color="grey-5" text-color="grey-8" label="신규" @click="onTableAdd_Table001" />
            <q-btn outline unelevated class="qt-table-toolbar-btn" style="height: 24px; min-height: 24px; padding: 0 10px; background: rgba(255, 255, 255, 0.82); opacity: 0.72" color="primary" label="저장" @click="onTableSave_Table001" />
            <q-btn outline unelevated class="qt-table-toolbar-btn" style="height: 24px; min-height: 24px; padding: 0 10px; background: rgba(255, 255, 255, 0.82); opacity: 0.72" color="red" label="삭제" @click="onTableDelete_Table001" />
            <q-btn outline unelevated class="qt-table-toolbar-btn" style="height: 24px; min-height: 24px; padding: 0 10px; background: rgba(255, 255, 255, 0.82); opacity: 0.72" color="grey-5" text-color="grey-8" label="새로고침" @click="onTableRefresh_Table001" />
          </div>
          <ag-grid-vue ref="Table001Ref"
          class="qt-ag-grid"
          style="width: 100%; height: 360px"
          :row-data="Table001_rows"
          :column-defs="Table001_columnDefs"
          :default-col-def="{ resizable: true, sortable: true, filter: true, minWidth: 70, suppressKeyboardEvent: (params) => Table001.suppressKeyboardEvent(params), cellClassRules: { 'qt-ag-copy-range-cell': (params) => Table001.isCellInCopyRange(params), 'qt-ag-copy-range-anchor': (params) => Table001.isCellCopyRangeAnchor(params) } }"
          :header-height="32"
          :row-height="84"
          :animate-rows="true"
          :single-click-edit="false"
          :get-row-id="(params) => String(params.data?.__qtRowId ?? params.data?.['row-id'] ?? params.node?.rowIndex ?? '')"
          @grid-ready="(event) => Table001.setGridApi(event.api)"
          @cell-mouse-down="(event) => Table001.handleCellMouseDown(event)"
          @cell-mouse-over="(event) => Table001.handleCellMouseOver(event)"
          @cell-key-down="(event) => Table001.handleCellKeyDown(event)"
          @cell-value-changed="(event) => Table001.handleCellValueChanged(event)"
          :group-header-height="32"
          :pagination="true"
          :pagination-page-size="10"
          :pagination-page-size-selector="[10,20,50,0]"
          :row-selection="{ mode: 'singleRow', checkboxes: true, headerCheckbox: false, enableClickSelection: false }"
          @selection-changed="(event) => Table001.setSelected(event.api.getSelectedRows())"
          @row-clicked="(event) => onRowClick_Table001(event.event, event.data)" />
        </div>
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script setup>
import { ref } from 'vue'
import { useIndexUtilStore } from 'src/store/index/IndexUtil'
import { useInStore } from 'src/store/in/inStore'
import { createTableApi } from 'src/component/quasar-ui-api'
import { AgGridVue } from 'ag-grid-vue3'
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community'

ModuleRegistry.registerModules([AllCommunityModule])

const storeName = useIndexUtilStore()

const storeIn = useInStore()

const stages = [
  {
    "title": "1단계",
    "description": "UI화면편집기 결과물인 화면 JSON -> Vue 파일 생성기"
  },
  {
    "title": "2단계",
    "description": "컴포넌트 팔레트 + 속성 패널"
  },
  {
    "title": "3단계",
    "description": "드래그앤드롭 화면 배치"
  },
  {
    "title": "4단계",
    "description": "그리드, 팝업, 공통코드, API 자동연결"
  },
  {
    "title": "5단계",
    "description": "VS Code Extension 통합"
  }
]

const search = {
  "class1": null,
  "class2": null,
  "requiredYn": false,
  "useYn": false,
  "name": ""
}

const classOptions = []

const Table001_columnDefs = [{ "colId": "mode", "headerName": "", "field": "mode", "sortable": true, "resizable": true, "editable": false, "width": 46, "cellStyle": { "textAlign": "center" }, "cellClass": "qt-table-mode-cell", "minWidth": 42, "maxWidth": 52 },{ headerName: "성명", marryChildren: true, children: [{ "colId": "name", "headerName": "부서", "field": "name", "sortable": false, "resizable": true, "editable": false, "flex": 1, "cellStyle": { "textAlign": "left" }, "qtGroupRowCell": true, "cellClass": "qt-ag-group-row-cell" , colSpan: (params) => params.node?.rowPinned ? 1 : 1, cellRenderer: (params) => {
    const data = params.data || {}
    const region = {"span":1,"rowCount":2,"cells":[{"rowIndex":0,"start":1,"end":1,"span":1,"rowspan":1,"field":"name","label":"성명","editable":true,"inputIndex":0,"localStart":0},{"rowIndex":1,"start":1,"end":1,"span":1,"rowspan":1,"field":"name","label":"성명","editable":true,"inputIndex":1,"localStart":0}]}
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
  } }] },{ headerName: "직책", marryChildren: true, children: [{ "colId": "column2", "headerName": "title2", "field": "position", "sortable": false, "resizable": true, "editable": false, "flex": 1, "cellStyle": { "textAlign": "left" }, "qtGroupRowCell": true, "cellClass": "qt-ag-group-row-cell" , colSpan: (params) => params.node?.rowPinned ? 1 : 2, cellRenderer: (params) => {
    const data = params.data || {}
    const region = {"span":2,"rowCount":2,"cells":[{"rowIndex":0,"start":2,"end":3,"span":2,"rowspan":1,"field":"position","label":"직책","editable":true,"inputIndex":0,"localStart":0},{"rowIndex":1,"start":2,"end":2,"span":1,"rowspan":1,"field":"position","label":"직책","editable":true,"inputIndex":1,"localStart":0},{"rowIndex":1,"start":3,"end":3,"span":1,"rowspan":1,"field":"address","label":"주소","editable":true,"inputIndex":2,"localStart":1}]}
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
  } }, { "colId": "column3", "headerName": "title2", "field": "address", "sortable": false, "resizable": true, "editable": true, "flex": 1, "cellStyle": { "textAlign": "left" } }] },{ headerName: "부서", marryChildren: true, children: [{ "colId": "deptment", "headerName": "컬럼 4", "field": "deptment", "sortable": true, "resizable": true, "editable": false, "flex": 1, "cellStyle": { "textAlign": "left" }, "qtGroupRowCell": true, "cellClass": "qt-ag-group-row-cell" , colSpan: (params) => params.node?.rowPinned ? 1 : 1, cellRenderer: (params) => {
    const data = params.data || {}
    const region = {"span":1,"rowCount":2,"cells":[{"rowIndex":0,"start":4,"end":4,"span":1,"rowspan":1,"field":"deptment","label":"컬럼 4","editable":true,"inputIndex":0,"localStart":0},{"rowIndex":1,"start":4,"end":4,"span":1,"rowspan":1,"field":"deptment","label":"부서","editable":true,"inputIndex":1,"localStart":0}]}
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
  } }] }]

const Table001_rows = ref([])

const Table001Ref = ref(null)

const Table001 = createTableApi({
  id: "Table001",
  type: "Table",
  componentRef: Table001Ref,
  rowKey: "row-id",
  excelCopy: false,
  rows: { get: () => Table001_rows.value, set: (value) => { Table001_rows.value = value } },
  columns: { get: () => Table001_columnDefs },
  selected: { get: () => storeName.selectedRow, set: (value) => { storeName.selectedRow = value } },
  pagination: { get: () => Table001Pagination.value, set: (value) => { Table001Pagination.value = value } }
})

function onSearch() {
  console.log('onSearch', { ...search })
  storeName.searchText = 'search text !!!!'
  console.log('storeName.storeName : ', storeName.storeName)
}

function resetSearch() {
  console.log('resetSearch storeName.storeName : ', storeName.storeName)
  storeName.selectList(storeName.loading)
  

  console.log('storeName.searchText : ', storeName.searchText)

}

function onRowClick_Table001(event, row) {
  console.log('row-click', row)

}


function onTableAdd_Table001() {
  console.log('table-add')
    const newRow = {
    rowSn: Date.now(),
    name: '홍길동',
    dtlDt: '혁신기획팀',
    actions : '',
    key: 'abdc'
  }
  
  Table001.addRow(newRow)
  
}


function onTableSave_Table001() {
  console.log('table-save')
}


function onTableDelete_Table001() {
  
  console.log('table-delete')

  const selIndex = Table001.getSelectedIndex()

  console.log('selected index', selIndex)

  Table001.delSelectedRow()
  
}


function onTableRefresh_Table001() {
  console.log('table-refresh')

  console.log('onRefre ', storeName.list)
}
</script>
