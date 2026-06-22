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
import { ref } from 'vue'

const storeName = ref('useIndexUtilStore')

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
}

function resetSearch() {
  useStore.getList()
}
</script>
