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
          style="width: 100%; height: 400px"
          :row-data="storeName.list"
          :column-defs="Table001_columnDefs"
          :default-col-def="{ resizable: true, sortable: true, filter: true, minWidth: 70, suppressKeyboardEvent: (params) => Table001.suppressKeyboardEvent(params), cellClassRules: { 'qt-ag-copy-range-cell': (params) => Table001.isCellInCopyRange(params), 'qt-ag-copy-range-anchor': (params) => Table001.isCellCopyRangeAnchor(params) } }"
          :header-height="48"
          :row-height="42"
          :animate-rows="true"
          :single-click-edit="false"
          :get-row-id="(params) => String(params.data?.__qtRowId ?? params.data?.['rowSn'] ?? params.node?.rowIndex ?? '')"
          @grid-ready="(event) => Table001.setGridApi(event.api)"
          @cell-mouse-down="(event) => Table001.handleCellMouseDown(event)"
          @cell-mouse-over="(event) => Table001.handleCellMouseOver(event)"
          @cell-key-down="(event) => Table001.handleCellKeyDown(event)"
          @cell-value-changed="(event) => Table001.handleCellValueChanged(event)"
          :pagination="true"
          :pagination-page-size="10"
          :pagination-page-size-selector="[10,20,50,0]"
          :row-selection="{ mode: 'multiRow', checkboxes: true, headerCheckbox: true, enableClickSelection: false }"
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

const Table001_columnDefs = [{ "colId": "mode", "headerName": "", "field": "mode", "sortable": true, "resizable": true, "editable": false, "width": 46, "cellStyle": { "textAlign": "center" }, "cellClass": "qt-table-mode-cell", "minWidth": 42, "maxWidth": 52 },{ "colId": "name", "headerName": "명칭", "field": "name", "sortable": true, "resizable": true, "editable": true, "flex": 1, "cellStyle": { "textAlign": "left" }, "headerClass": "qt-required-column" },{ "colId": "dtlDt", "headerName": "상세일자", "field": "dtlDt", "sortable": true, "resizable": true, "editable": true, "flex": 1, "cellStyle": { "textAlign": "center" }, "headerClass": "qt-required-column" },{ "colId": "add", "headerName": "주소", "field": "address", "sortable": true, "resizable": true, "editable": true, "flex": 1, "cellStyle": { "textAlign": "left" } },{ "colId": "actions", "headerName": "작업", "field": "actions", "sortable": false, "resizable": true, "editable": false, "flex": 1, "cellStyle": { "textAlign": "center" }, "cellRenderer": () => '<button type="button" class="qt-ag-action-btn" style="margin-right:4px;padding:1px 7px;border:1px solid #cfd8dc;border-radius:3px;background:#fff;color:#455a64">편집</button><button type="button" class="qt-ag-action-btn qt-ag-action-danger" style="padding:1px 7px;border:1px solid #ffcdd2;border-radius:3px;background:#fff;color:#c62828">삭제</button>', "filter": false }]

const Table001Ref = ref(null)

const Table001 = createTableApi({
  id: "Table001",
  type: "Table",
  componentRef: Table001Ref,
  rowKey: "rowSn",
  excelCopy: false,
  rows: { get: () => storeName.list, set: (value) => { storeName.list = value } },
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
