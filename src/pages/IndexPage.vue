<template>
  <q-page padding>
    <q-card label="Card" flat bordered>
      <q-card-section class="q-pa-sm" label="Card Section">
        <q-form class="q-gutter-sm" label="Form">
          <div>
            <div class="row" style="min-height: 96px">
              <div class="col">
                <div class="row">
                  <div class="col-2 flex items-center " style="min-height: 48px">
                    <label class="text-body2 bg-grey-4 row items-center q-px-md full-height rounded-borders overflow-hidden" style="width: 100%">조회구분</label>
                  </div>
                  <div class="col-4 flex items-center q-px-sm" style="min-height: 48px">
                    <q-select style="width: 100%" outlined dense label="Combo Box" :options='[&quot;option1&quot;,&quot;option2&quot;,&quot;option3&quot;]' />
                  </div>
                  <div class="col-2 flex items-center " style="min-height: 48px">
                    <label class="text-body2 bg-grey-4 row items-center q-px-md full-height rounded-borders overflow-hidden" style="width: 100%">Label</label>
                  </div>
                  <div class="col-4 flex items-center q-px-sm" style="min-height: 48px">
                    <q-input style="width: 100%" outlined dense label="Input" />
                  </div>
                </div>
                <div class="row">
                  <div class="col-2 flex items-center q-px-sm" style="min-height: 48px" />
                  <div class="col-4 flex items-center q-px-sm" style="min-height: 48px" />
                  <div class="col-3 flex items-center q-px-sm" style="min-height: 48px" />
                  <div class="col-2 flex items-center q-px-sm" style="min-height: 48px" />
                  <div class="col-1 flex items-center q-px-sm" style="min-height: 48px" />
                </div>
              </div>
              <div class="col-auto flex" style="min-height: 96px; min-width:180px;">
                <q-btn style="align-self: flex-end; margin-left: auto" label="초기화" color="grey-7" outline />
                <q-btn style="margin-left: auto; align-self: flex-end" label="검색" color="primary" unelevated />
              </div>
            </div>
          </div>
        </q-form>
      </q-card-section>
    </q-card>
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
                <q-toggle v-model="search.requiredYn" label="필수" dense />
              </div>
              <div class="col-2 bg-white row items-center q-px-sm">
                <q-toggle v-model="search.useYn" label="사용여부" dense />
              </div>
            </div>
            <div class="row">
              <div class="col-2">
                <div class="bg-grey-4 row items-center q-px-md full-height rounded-borders overflow-hidden" style="border-radius: 4px">조회명</div>
              </div>
              <div class="col-10 bg-white q-pa-xs">
                <q-input v-model="search.name" outlined dense bg-color="white" />
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
