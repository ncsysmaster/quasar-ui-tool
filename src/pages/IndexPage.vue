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
      <q-card-section label="Card Section">
        <q-table label="조회목록" v-model:pagination="Table001Pagination" v-model:selected="Table001Selected" :columns="Table001_columns" :rows-per-page-options="[10,20,50,0]" flat bordered dense :rows='[]' row-key="rowSn" separator="vertical" no-data-label="데이터가 없습니다." loading-label="데이터를 불러오는 중입니다." class="" selection="single" @row-click="onRowClick_Table001">
          <template #top>
            <div class="row items-center q-gutter-sm full-width">
              <div class="text-subtitle1">조회목록</div>
              <q-btn dense flat color="primary" label="신규" @click="onTableAdd_Table001" />
              <q-btn dense flat color="primary" label="저장" @click="onTableSave_Table001" />
              <q-btn dense flat color="primary" label="삭제" @click="onTableDelete_Table001" />
              <q-btn dense flat color="primary" label="새로고침" @click="onTableRefresh_Table001" />
            </div>
          </template>
          <template #body-cell-actions="props">
            <q-td :props="props">
              <q-btn dense flat label="편집" />
              <q-btn dense flat color="negative" label="삭제" />
            </q-td>
          </template>
        </q-table>
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script setup>
import { useIndexUtilStore } from 'src/store/index/IndexUtil'
import { useInStore } from 'src/store/in/inStore'

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

const Table001_columns = [{"name":"name","label":"명칭","field":"name","type":"text","align":"left","sortable":true,"required":false,"editable":false},{"name":"dtlDt","label":"상세일자","field":"dtlDt","type":"date","align":"center","sortable":true,"required":false,"editable":false},{"name":"actions","label":"작업","field":"actions","type":"actions","align":"center","sortable":false,"required":false,"editable":false},{"name":"key","label":"참조사항","field":"column4","type":"text","align":"left","sortable":false,"required":false,"editable":false}]

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
}


function onTableSave_Table001() {
  console.log('table-save')
}


function onTableDelete_Table001() {
  console.log('table-delete')
}


function onTableRefresh_Table001() {
  console.log('table-refresh')
}
</script>
