<template>
  <q-page padding>
    <div class="text-h5 text-weight-bold">{{ currentExample.label }}</div>
    <div class="text-body1 text-grey-8 q-mt-md">{{ currentExample.description }}</div>
    <div class="row q-col-gutter-md q-mt-md">
      <div class="col-12 col-sm-6 col-md-4" v-for="item in examples" :key="item.key">
        <q-card flat bordered>
          <q-card-section>
            <div class="text-subtitle1 text-weight-medium">{{ item.label }}</div>
            <div class="text-caption text-grey-7 q-mt-xs">{{ item.description }}</div>
          </q-card-section>
        </q-card>
      </div>
    </div>
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
</script>
