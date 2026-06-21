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
            <div class="row" style="height: 48px">
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
const examples = [
  {
    "key": "dashboard",
    "label": "기본 대시보드",
    "description": "업무 현황과 주요 지표를 배치하는 기본 화면 예제입니다."
  },
  {
    "key": "layout",
    "label": "레이아웃",
    "description": "행, 열, 카드, 영역 분할을 조합하는 화면 구조 예제입니다."
  },
  {
    "key": "page",
    "label": "페이지",
    "description": "검색, 상세, 등록 화면의 페이지 패턴 예제입니다."
  },
  {
    "key": "component",
    "label": "콤포넌트",
    "description": "Quasar 컴포넌트 팔레트와 속성 설정 예제입니다."
  },
  {
    "key": "content",
    "label": "콘텐츠",
    "description": "텍스트, 배지, 리스트, 테이블 콘텐츠 배치 예제입니다."
  },
  {
    "key": "form",
    "label": "폼",
    "description": "입력, 선택, 검증, 버튼 액션을 포함한 폼 예제입니다."
  },
  {
    "key": "support",
    "label": "지원",
    "description": "공통코드, API 연결, 팝업 호출 지원 기능 예제입니다."
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
  Object.assign(search, {
    class1: null,
    class2: null,
    requiredYn: false,
    useYn: false,
    name: ''
  })
}
</script>
