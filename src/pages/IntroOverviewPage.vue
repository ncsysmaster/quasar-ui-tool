<template>
  <q-page class="intro-page">
    <main class="intro-content">
      <div class="page-heading">
        <div class="heading-title">
          <span class="heading-icon"><q-icon name="info" size="30px" /></span>
          <h1>도구 소개</h1>
        </div>
        <nav class="breadcrumb" aria-label="현재 위치">
          <span>UI TOOL 소개</span>
          <q-icon name="double_arrow" size="20px" />
          <strong>도구 소개</strong>
        </nav>
      </div>

      <section class="detail-card">
          <h2>Quasar UI Tool을 소개합니다</h2>
          <p class="lead">
            Quasar UI Tool은 VS Code 안에서 화면 JSON을 시각적으로 편집하고
            Vue(Quasar) 페이지 코드를 자동으로 생성하는 UI 개발 도구입니다.
            화면 설계부터 코드 생성까지 하나의 흐름으로 연결하여
            반복적인 화면 개발 작업을 줄이고 프로젝트 표준을 지키도록 돕습니다.
          </p>

          <div class="section-block">
            <div class="section-title">
              <span class="section-icon"><q-icon name="flag" size="22px" /></span>
              <h3>도구의 목적</h3>
            </div>
            <div class="purpose-list">
              <article v-for="item in purposes" :key="item.title">
                <span class="topic-icon"><q-icon :name="item.icon" size="22px" /></span>
                <div>
                  <h4>{{ item.title }}</h4>
                  <p>{{ item.description }}</p>
                </div>
              </article>
            </div>
          </div>

          <div class="section-block">
            <div class="section-title">
              <span class="section-icon"><q-icon name="groups" size="22px" /></span>
              <h3>주요 사용자</h3>
            </div>
            <div class="card-grid">
              <article v-for="user in users" :key="user.title" class="mini-card">
                <span class="topic-icon"><q-icon :name="user.icon" size="22px" /></span>
                <h4>{{ user.title }}</h4>
                <p>{{ user.description }}</p>
              </article>
            </div>
          </div>

          <div class="section-block">
            <div class="section-title">
              <span class="section-icon"><q-icon name="lightbulb" size="22px" /></span>
              <h3>활용 사례</h3>
            </div>
            <div class="case-list">
              <article v-for="(useCase, index) in useCases" :key="useCase.title">
                <span class="case-number">{{ index + 1 }}</span>
                <div>
                  <h4>{{ useCase.title }}</h4>
                  <p>{{ useCase.description }}</p>
                </div>
              </article>
            </div>
          </div>

          <div class="section-block">
            <div class="section-title">
              <span class="section-icon"><q-icon name="trending_up" size="22px" /></span>
              <h3>기대 효과</h3>
            </div>
            <div class="card-grid">
              <article v-for="effect in effects" :key="effect.title" class="mini-card effect-card">
                <span class="topic-icon"><q-icon :name="effect.icon" size="22px" /></span>
                <h4>{{ effect.title }}</h4>
                <p>{{ effect.description }}</p>
              </article>
            </div>
          </div>
      </section>
    </main>
  </q-page>
</template>

<script setup>
const purposes = [
  {
    title: '화면 개발 자동화',
    description: '화면 JSON을 시각적으로 편집하면 실행 가능한 Vue(Quasar) 코드가 자동으로 생성되어 반복적인 마크업·바인딩 작업을 줄입니다.',
    icon: 'auto_fix_high'
  },
  {
    title: '설계와 구현의 연결',
    description: '화면 설계 결과가 곧 화면 JSON이 되므로 설계 문서와 실제 구현 코드가 어긋나지 않고 하나의 산출물로 관리됩니다.',
    icon: 'link'
  },
  {
    title: '프로젝트 표준화',
    description: '컴포넌트 구성과 코드 생성 규칙을 도구가 담당하여 개발자마다 다른 코드 스타일 대신 일관된 프로젝트 표준을 유지합니다.',
    icon: 'rule'
  }
]

const users = [
  {
    title: '프론트엔드 개발자',
    description: 'Quasar와 Vue로 업무 화면을 개발하는 개발자가 반복 화면을 빠르게 만들고 핵심 로직에 집중할 수 있습니다.',
    icon: 'code'
  },
  {
    title: 'UI 설계자 · 퍼블리셔',
    description: '코드를 직접 작성하지 않아도 컴포넌트 팔레트와 속성 패널로 화면 구조와 배치를 설계할 수 있습니다.',
    icon: 'design_services'
  },
  {
    title: '프로젝트 표준 담당자',
    description: '화면 구성 규칙과 코드 생성 표준을 도구에 반영하여 프로젝트 전체 화면 품질을 관리할 수 있습니다.',
    icon: 'verified'
  },
  {
    title: '신규 투입 인력',
    description: '프로젝트 표준이 도구에 내장되어 있어 새로 합류한 개발자도 표준에 맞는 화면을 바로 만들 수 있습니다.',
    icon: 'person_add'
  }
]

const useCases = [
  {
    title: '신규 업무 화면 개발',
    description: '컴포넌트 팔레트에서 Layout, Form, Table 등을 배치해 화면 JSON을 만들고, 곧바로 Vue 페이지 코드를 생성하여 개발을 시작합니다.'
  },
  {
    title: '유사 화면 대량 생산',
    description: '조회·등록·수정 등 패턴이 반복되는 업무 시스템 화면을 표준 구성으로 빠르게 찍어내듯 만들 수 있습니다.'
  },
  {
    title: '화면 시안 협의와 프로토타이핑',
    description: '실제 Quasar 컴포넌트로 화면 시안을 구성해 기획자·현업과 눈으로 확인하며 협의하고, 확정된 시안을 그대로 코드로 전환합니다.'
  },
  {
    title: '기존 화면 유지보수',
    description: '화면 구조가 JSON으로 관리되므로 페이지 트리에서 구성 요소를 한눈에 파악하고 수정 지점을 빠르게 찾을 수 있습니다.'
  }
]

const effects = [
  {
    title: '개발 생산성 향상',
    description: '반복적인 화면 코드 작성이 자동화되어 화면당 개발 시간이 크게 단축됩니다.',
    icon: 'speed'
  },
  {
    title: '화면 품질 · 일관성 확보',
    description: '검증된 컴포넌트 구성과 생성 규칙을 사용하므로 화면 간 편차와 단순 실수가 줄어듭니다.',
    icon: 'workspace_premium'
  },
  {
    title: '협업 · 커뮤니케이션 개선',
    description: '설계자와 개발자가 동일한 화면 JSON을 보며 소통하므로 전달 과정의 오해가 줄어듭니다.',
    icon: 'handshake'
  },
  {
    title: '유지보수 비용 절감',
    description: '표준화된 구조 덕분에 담당자가 바뀌어도 화면을 쉽게 이해하고 수정할 수 있습니다.',
    icon: 'savings'
  }
]
</script>

<style scoped>
.intro-page { color: #3f4c59; background: #f6f8fb; }
.intro-content { width: calc(100% - 48px); margin: 0 auto; padding: 14px 0 56px; }
.page-heading { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 16px; }
.heading-title { display: flex; align-items: center; gap: 14px; }
.heading-icon {
  display: grid;
  place-items: center;
  width: 56px;
  height: 56px;
  border-radius: 15px;
  color: #fff;
  background: var(--q-primary);
}
.page-heading h1 { margin: 0; color: #303d49; font-size: 30px; font-weight: 800; }
.breadcrumb { display: block; align-self: flex-start; margin-top: -3px; color: #3973d3; font-size: 0; font-weight: 800; letter-spacing: .13em; line-height: 1.4; }
.breadcrumb::after { content: "QUASAR UI TOOL · OVERVIEW"; font-size: 16px; }
.breadcrumb > * { display: none; }
.breadcrumb .q-icon { color: var(--q-primary); }
.breadcrumb strong { color: #303d49; font-weight: 800; }
.detail-card { padding: 34px; border: 1px solid #dfe5eb; border-radius: 14px; background: #fff; box-shadow: 0 10px 28px rgba(42, 66, 88, .06); }
.detail-card > h2 { margin: 0; color: #303d49; font-size: 27px; font-weight: 800; }
.lead { margin: 10px 0 6px; color: #6e7984; font-size: 16px; line-height: 1.7; }
.section-block { margin-top: 34px; }
.section-title { display: flex; align-items: center; gap: 11px; margin-bottom: 15px; }
.section-icon {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  border-radius: 10px;
  color: var(--q-primary);
  background: #e8f3fd;
}
.section-title h3 { margin: 0; color: #303d49; font-size: 21px; font-weight: 800; }
.purpose-list { display: grid; gap: 12px; }
.purpose-list article { display: flex; gap: 16px; padding: 19px; border: 1px solid #e4e9ee; border-radius: 10px; background: #fbfcfd; }
.topic-icon { display: grid; place-items: center; width: 44px; height: 44px; flex: 0 0 44px; border-radius: 11px; color: var(--q-primary); background: #e8f3fd; }
.purpose-list h4, .mini-card h4, .case-list h4 { margin: 0 0 5px; color: #3c4955; font-size: 17px; font-weight: 700; }
.purpose-list p, .mini-card p, .case-list p { margin: 0; color: #74808b; font-size: 15px; line-height: 1.6; }
.card-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.mini-card { padding: 19px; border: 1px solid #e4e9ee; border-radius: 10px; background: #fbfcfd; }
.mini-card .topic-icon { margin-bottom: 12px; }
.case-list { display: grid; gap: 12px; }
.case-list article { display: flex; gap: 16px; padding: 19px; border: 1px solid #e4e9ee; border-radius: 10px; background: #fbfcfd; }
.case-number {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  flex: 0 0 34px;
  border-radius: 50%;
  color: #fff;
  background: var(--q-primary);
  font-size: 15px;
  font-weight: 800;
}
.effect-card { background: #f4faff; border-color: #d8e8f7; }

@media (max-width: 760px) {
  .intro-content { width: min(100% - 28px, 560px); padding-top: 14px; }
  .page-heading { flex-wrap: wrap; }
  .detail-card { padding: 24px 20px; }
  .card-grid { grid-template-columns: 1fr; }
}
</style>
