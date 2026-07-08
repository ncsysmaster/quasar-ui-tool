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
          :row-data="Table001_gridRows"
          :column-defs="Table001_columnDefs"
          :default-col-def="{ resizable: true, sortable: true, filter: true, minWidth: 70, suppressKeyboardEvent: (params) => Table001.suppressKeyboardEvent(params), cellClassRules: { 'qt-ag-copy-range-cell': (params) => Table001.isCellInCopyRange(params), 'qt-ag-copy-range-anchor': (params) => Table001.isCellCopyRangeAnchor(params) } }"
          :header-height="32"
          :row-height="42"
          :animate-rows="true"
          :single-click-edit="false"
          :get-row-id="(params) => String(params.data?.__qtDisplayRowId ?? params.data?.__qtRowId ?? params.data?.['rowId'] ?? params.node?.rowIndex ?? '')"
          @grid-ready="(event) => Table001.setGridApi(event.api)"
          @cell-mouse-down="(event) => Table001.handleCellMouseDown(event)"
          @cell-mouse-over="(event) => Table001.handleCellMouseOver(event)"
          @cell-key-down="(event) => Table001.handleCellKeyDown(event)"
          @cell-value-changed="(event) => Table001.handleCellValueChanged(event)"
          :group-header-height="32"
          :suppress-row-transform="true"
          :enable-cell-span="true"
          :get-row-class="getAgGridDisplayRowClass"
          :pagination="true"
          :pagination-page-size="10"
          :pagination-page-size-selector="[10,20,50,0]"
          @row-clicked="(event) => onRowClick_Table001(event.event, event.data)" />
        </div>
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useIndexUtilStore } from 'src/store/index/IndexUtil'
import { createTableApi } from 'src/component/quasar-ui-api'
import { AgGridVue } from 'ag-grid-vue3'
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community'

ModuleRegistry.registerModules([AllCommunityModule])

const storeName = useIndexUtilStore()

const search = {
  "class1": null,
  "class2": null
}

const classOptions = []

const Table001_columnDefs = [{ "colId": "mode", "headerName": "", "field": "mode", "sortable": true, "resizable": true, "editable": false, "width": 46, "cellStyle": { "textAlign": "center" }, "minWidth": 42, "maxWidth": 52 , rowSpan: (params) => getAgGridLogicalRowSpan(params), cellClass: (params) => getAgGridLogicalCellClass(params, 'qt-table-mode-cell') },{ headerName: "명칭", marryChildren: true, children: [{ headerName: "title1", marryChildren: true, children: [{ "colId": "name", "headerName": "title1", "field": "name", "sortable": true, "resizable": true, "editable": false, "flex": 1, "cellStyle": { "textAlign": "left" }, "qtBodyConfig": { "rows": { "1": { "field": "name", "label": "명칭", "colspan": 1, "rowspan": 2, "cellId": "body_r1_name" }, "3": { "field": "name", "label": "명칭", "colspan": 1, "rowspan": 1, "cellId": "body_r3_name" } } } , valueGetter: (params) => getAgGridBodyCellValue(params, { "rows": { "1": { "field": "name", "label": "명칭", "colspan": 1, "rowspan": 2, "cellId": "body_r1_name" }, "3": { "field": "name", "label": "명칭", "colspan": 1, "rowspan": 1, "cellId": "body_r3_name" } } }), valueSetter: (params) => setAgGridBodyCellValue(params, { "rows": { "1": { "field": "name", "label": "명칭", "colspan": 1, "rowspan": 2, "cellId": "body_r1_name" }, "3": { "field": "name", "label": "명칭", "colspan": 1, "rowspan": 1, "cellId": "body_r3_name" } } }), colSpan: (params) => getAgGridBodyCellSpan(params, { "rows": { "1": { "field": "name", "label": "명칭", "colspan": 1, "rowspan": 2, "cellId": "body_r1_name" }, "3": { "field": "name", "label": "명칭", "colspan": 1, "rowspan": 1, "cellId": "body_r3_name" } } }, 'colspan'), rowSpan: (params) => getAgGridBodyCellSpan(params, { "rows": { "1": { "field": "name", "label": "명칭", "colspan": 1, "rowspan": 2, "cellId": "body_r1_name" }, "3": { "field": "name", "label": "명칭", "colspan": 1, "rowspan": 1, "cellId": "body_r3_name" } } }, 'rowspan'), cellClass: (params) => getAgGridBodyCellClass(params, { "rows": { "1": { "field": "name", "label": "명칭", "colspan": 1, "rowspan": 2, "cellId": "body_r1_name" }, "3": { "field": "name", "label": "명칭", "colspan": 1, "rowspan": 1, "cellId": "body_r3_name" } } }), suppressNavigable: (params) => !getAgGridBodyCellConfig(params, { "rows": { "1": { "field": "name", "label": "명칭", "colspan": 1, "rowspan": 2, "cellId": "body_r1_name" }, "3": { "field": "name", "label": "명칭", "colspan": 1, "rowspan": 1, "cellId": "body_r3_name" } } }) }] }] },{ headerName: "상세일자", marryChildren: true, children: [{ headerName: "title2", marryChildren: true, children: [{ "colId": "dtlDt", "headerName": "title2", "field": "dtlDt", "sortable": true, "resizable": true, "editable": false, "flex": 1, "cellStyle": { "textAlign": "center" }, "qtBodyConfig": { "rows": { "1": { "field": "dtlDt", "label": "상세일자", "colspan": 2, "rowspan": 1, "cellId": "body_r1_dtlDt" }, "2": { "field": "dtlDt", "label": "상세일자", "colspan": 2, "rowspan": 1, "cellId": "body_r2_dtlDt" }, "3": { "field": "dtlDt", "label": "상세일자", "colspan": 1, "rowspan": 1, "cellId": "body_r3_dtlDt" } } } , valueGetter: (params) => getAgGridBodyCellValue(params, { "rows": { "1": { "field": "dtlDt", "label": "상세일자", "colspan": 2, "rowspan": 1, "cellId": "body_r1_dtlDt" }, "2": { "field": "dtlDt", "label": "상세일자", "colspan": 2, "rowspan": 1, "cellId": "body_r2_dtlDt" }, "3": { "field": "dtlDt", "label": "상세일자", "colspan": 1, "rowspan": 1, "cellId": "body_r3_dtlDt" } } }), valueSetter: (params) => setAgGridBodyCellValue(params, { "rows": { "1": { "field": "dtlDt", "label": "상세일자", "colspan": 2, "rowspan": 1, "cellId": "body_r1_dtlDt" }, "2": { "field": "dtlDt", "label": "상세일자", "colspan": 2, "rowspan": 1, "cellId": "body_r2_dtlDt" }, "3": { "field": "dtlDt", "label": "상세일자", "colspan": 1, "rowspan": 1, "cellId": "body_r3_dtlDt" } } }), colSpan: (params) => getAgGridBodyCellSpan(params, { "rows": { "1": { "field": "dtlDt", "label": "상세일자", "colspan": 2, "rowspan": 1, "cellId": "body_r1_dtlDt" }, "2": { "field": "dtlDt", "label": "상세일자", "colspan": 2, "rowspan": 1, "cellId": "body_r2_dtlDt" }, "3": { "field": "dtlDt", "label": "상세일자", "colspan": 1, "rowspan": 1, "cellId": "body_r3_dtlDt" } } }, 'colspan'), rowSpan: (params) => getAgGridBodyCellSpan(params, { "rows": { "1": { "field": "dtlDt", "label": "상세일자", "colspan": 2, "rowspan": 1, "cellId": "body_r1_dtlDt" }, "2": { "field": "dtlDt", "label": "상세일자", "colspan": 2, "rowspan": 1, "cellId": "body_r2_dtlDt" }, "3": { "field": "dtlDt", "label": "상세일자", "colspan": 1, "rowspan": 1, "cellId": "body_r3_dtlDt" } } }, 'rowspan'), cellClass: (params) => getAgGridBodyCellClass(params, { "rows": { "1": { "field": "dtlDt", "label": "상세일자", "colspan": 2, "rowspan": 1, "cellId": "body_r1_dtlDt" }, "2": { "field": "dtlDt", "label": "상세일자", "colspan": 2, "rowspan": 1, "cellId": "body_r2_dtlDt" }, "3": { "field": "dtlDt", "label": "상세일자", "colspan": 1, "rowspan": 1, "cellId": "body_r3_dtlDt" } } }), suppressNavigable: (params) => !getAgGridBodyCellConfig(params, { "rows": { "1": { "field": "dtlDt", "label": "상세일자", "colspan": 2, "rowspan": 1, "cellId": "body_r1_dtlDt" }, "2": { "field": "dtlDt", "label": "상세일자", "colspan": 2, "rowspan": 1, "cellId": "body_r2_dtlDt" }, "3": { "field": "dtlDt", "label": "상세일자", "colspan": 1, "rowspan": 1, "cellId": "body_r3_dtlDt" } } }) }] }, { headerName: "title3", marryChildren: true, children: [{ "colId": "actions", "headerName": "title3", "field": "actions", "sortable": false, "resizable": true, "editable": false, "flex": 1, "cellStyle": { "textAlign": "center" }, "cellRenderer": () => '<button type="button" class="qt-ag-action-btn" style="margin-right:4px;padding:1px 7px;border:1px solid #cfd8dc;border-radius:3px;background:#fff;color:#455a64">편집</button><button type="button" class="qt-ag-action-btn qt-ag-action-danger" style="padding:1px 7px;border:1px solid #ffcdd2;border-radius:3px;background:#fff;color:#c62828">삭제</button>', "filter": false, "qtBodyConfig": { "rows": { "3": { "field": "actions", "label": "작업", "colspan": 1, "rowspan": 1, "cellId": "body_r3_actions" } } } , valueGetter: (params) => getAgGridBodyCellValue(params, { "rows": { "3": { "field": "actions", "label": "작업", "colspan": 1, "rowspan": 1, "cellId": "body_r3_actions" } } }), valueSetter: (params) => setAgGridBodyCellValue(params, { "rows": { "3": { "field": "actions", "label": "작업", "colspan": 1, "rowspan": 1, "cellId": "body_r3_actions" } } }), colSpan: (params) => getAgGridBodyCellSpan(params, { "rows": { "3": { "field": "actions", "label": "작업", "colspan": 1, "rowspan": 1, "cellId": "body_r3_actions" } } }, 'colspan'), rowSpan: (params) => getAgGridBodyCellSpan(params, { "rows": { "3": { "field": "actions", "label": "작업", "colspan": 1, "rowspan": 1, "cellId": "body_r3_actions" } } }, 'rowspan'), cellClass: (params) => getAgGridBodyCellClass(params, { "rows": { "3": { "field": "actions", "label": "작업", "colspan": 1, "rowspan": 1, "cellId": "body_r3_actions" } } }), suppressNavigable: (params) => !getAgGridBodyCellConfig(params, { "rows": { "3": { "field": "actions", "label": "작업", "colspan": 1, "rowspan": 1, "cellId": "body_r3_actions" } } }) }] }] },{ headerName: "컬럼 4", marryChildren: true, children: [{ headerName: "컬럼 4", marryChildren: true, children: [{ "colId": "column4", "headerName": "컬럼 4", "field": "adress", "sortable": false, "resizable": true, "editable": false, "flex": 1, "cellStyle": { "textAlign": "left" }, "qtBodyConfig": { "rows": { "1": { "field": "adress", "label": "컬럼 4", "colspan": 1, "rowspan": 2, "cellId": "body_r1_adress" }, "3": { "field": "adress", "label": "컬럼 4", "colspan": 1, "rowspan": 1, "cellId": "body_r3_adress" } } } , valueGetter: (params) => getAgGridBodyCellValue(params, { "rows": { "1": { "field": "adress", "label": "컬럼 4", "colspan": 1, "rowspan": 2, "cellId": "body_r1_adress" }, "3": { "field": "adress", "label": "컬럼 4", "colspan": 1, "rowspan": 1, "cellId": "body_r3_adress" } } }), valueSetter: (params) => setAgGridBodyCellValue(params, { "rows": { "1": { "field": "adress", "label": "컬럼 4", "colspan": 1, "rowspan": 2, "cellId": "body_r1_adress" }, "3": { "field": "adress", "label": "컬럼 4", "colspan": 1, "rowspan": 1, "cellId": "body_r3_adress" } } }), colSpan: (params) => getAgGridBodyCellSpan(params, { "rows": { "1": { "field": "adress", "label": "컬럼 4", "colspan": 1, "rowspan": 2, "cellId": "body_r1_adress" }, "3": { "field": "adress", "label": "컬럼 4", "colspan": 1, "rowspan": 1, "cellId": "body_r3_adress" } } }, 'colspan'), rowSpan: (params) => getAgGridBodyCellSpan(params, { "rows": { "1": { "field": "adress", "label": "컬럼 4", "colspan": 1, "rowspan": 2, "cellId": "body_r1_adress" }, "3": { "field": "adress", "label": "컬럼 4", "colspan": 1, "rowspan": 1, "cellId": "body_r3_adress" } } }, 'rowspan'), cellClass: (params) => getAgGridBodyCellClass(params, { "rows": { "1": { "field": "adress", "label": "컬럼 4", "colspan": 1, "rowspan": 2, "cellId": "body_r1_adress" }, "3": { "field": "adress", "label": "컬럼 4", "colspan": 1, "rowspan": 1, "cellId": "body_r3_adress" } } }), suppressNavigable: (params) => !getAgGridBodyCellConfig(params, { "rows": { "1": { "field": "adress", "label": "컬럼 4", "colspan": 1, "rowspan": 2, "cellId": "body_r1_adress" }, "3": { "field": "adress", "label": "컬럼 4", "colspan": 1, "rowspan": 1, "cellId": "body_r3_adress" } } }) }] }] }]

const Table001_rows = ref([])

const Table001_gridRows = computed(() => createAgGridDisplayRows(Table001_rows.value, 3, "rowId"))

const Table001Ref = ref(null)

const Table001 = createTableApi({
  id: "Table001",
  type: "Table",
  componentRef: Table001Ref,
  rowKey: "rowId",
  headerRows: 3,
  headerLayout: [[{"cellId":"header_r1_name","label":"명칭","field":"name","columns":["name"]},{"cellId":"header_r1_dtlDt","label":"상세일자","field":"dtlDt","columns":["dtlDt","actions"],"colspan":2},{"cellId":"header_r1_adress","label":"컬럼 4","field":"adress","columns":["adress"]}],[{"cellId":"header_r2_name","label":"title1","field":"name","columns":["name"]},{"cellId":"header_r2_dtlDt","label":"title2","field":"dtlDt","columns":["dtlDt"]},{"cellId":"header_r2_actions","label":"title3","field":"actions","columns":["actions"]},{"cellId":"header_r2_adress","label":"컬럼 4","field":"adress","columns":["adress"]}],[{"cellId":"header_r3_name","label":"title1","field":"name","columns":["name"]},{"cellId":"header_r3_dtlDt","label":"title2","field":"dtlDt","columns":["dtlDt"]},{"cellId":"header_r3_actions","label":"title3","field":"actions","columns":["actions"]},{"cellId":"header_r3_adress","label":"컬럼 4","field":"adress","columns":["adress"]}]],
  sourceColumns: [{"name":"mode","label":"","field":"mode","type":"text","align":"center","width":"46px","sortable":true,"editable":false,"modeColumn":true},{"name":"name","label":"명칭","field":"name","type":"text","align":"left","sortable":true,"required":false,"editable":false},{"name":"dtlDt","label":"상세일자","field":"dtlDt","type":"date","align":"center","sortable":true,"required":false,"editable":false},{"name":"actions","label":"작업","field":"actions","type":"actions","align":"center","sortable":false,"required":false,"editable":false},{"name":"column4","label":"주소","field":"adress","type":"text","align":"left","sortable":false,"required":false,"editable":false}],
  rowRows: 3,
  excelCopy: false,
  rows: { get: () => Table001_rows.value, set: (value) => { Table001_rows.value = value } },
  columns: { get: () => Table001_columnDefs }
})

function createAgGridDisplayRows(rows, rowRows, rowKey) {
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

function onSearch() {
  storeName.searchText = 'search text !!!!'
}

function resetSearch() {
  search.class1 = null
  search.class2 = null
  storeName.selectList(storeName.loading)
}

function onRowClick_Table001(event, row) {
}

function onTableAdd_Table001() {
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
}

function onTableDelete_Table001() {
  Table001.delSelectedRow()
}

function onTableRefresh_Table001() {
}
</script>
