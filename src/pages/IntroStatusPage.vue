<template>
  <q-page class="intro-page">
    <main class="intro-content">
      <div class="page-heading">
        <div class="heading-title">
          <span class="heading-icon"><q-icon name="update" size="30px" /></span>
          <h1>개발 현황</h1>
        </div>
        <nav class="breadcrumb" aria-label="현재 위치">
          <span>UI TOOL 소개</span>
          <q-icon name="double_arrow" size="20px" />
          <strong>개발 현황</strong>
        </nav>
      </div>

      <section class="detail-card">
        <h2>현재 개발 현황</h2>
        <p class="lead">
          현재 제공되는 기능과 알려진 제한사항, 앞으로 추가될 기능을 확인할 수 있습니다.
        </p>

        <div class="feature-grid">
          <!-- 1. 현재 지원 기능 -->
          <article class="feature-card">
            <div class="shot">
              <div class="shot-bar"><i /><i /><i /><span>지원 현황</span></div>
              <div class="shot-body check-body">
                <p v-for="item in supported" :key="item" class="check-row done">
                  <q-icon name="task_alt" size="15px" />{{ item }}
                </p>
              </div>
            </div>
            <h3>현재 지원 기능</h3>
            <p>
              Visual JSON Editor, 화면 JSON 관리, Vue 코드 생성, Pinia Store 연동을 안정적으로
              제공합니다. Layout · Form · Table · Dialog 등 주요 Quasar 컴포넌트를 지원합니다.
            </p>
          </article>

          <!-- 2. 알려진 제한사항 -->
          <article class="feature-card">
            <div class="shot">
              <div class="shot-bar"><i /><i /><i /><span>제한사항</span></div>
              <div class="shot-body check-body">
                <p v-for="item in limitations" :key="item" class="check-row warn">
                  <q-icon name="report_problem" size="15px" />{{ item }}
                </p>
              </div>
            </div>
            <h3>알려진 제한사항</h3>
            <p>
              일부 고급 컴포넌트 속성과 복합 화면 패턴은 아직 지원 범위가 제한적입니다.
              제한사항은 단계적으로 해소하며 지원 범위를 계속 넓혀가고 있습니다.
            </p>
          </article>

          <!-- 3. 향후 개발 예정 기능 -->
          <article class="feature-card">
            <div class="shot">
              <div class="shot-bar"><i /><i /><i /><span>로드맵</span></div>
              <div class="shot-body roadmap-body">
                <div v-for="(item, index) in roadmap" :key="item.title" class="roadmap-row">
                  <div class="roadmap-line">
                    <span class="dot" :class="{ first: index === 0 }" />
                    <span v-if="index < roadmap.length - 1" class="bar" />
                  </div>
                  <div class="roadmap-text">
                    <em>{{ item.title }}</em>
                    <span>{{ item.description }}</span>
                  </div>
                </div>
              </div>
            </div>
            <h3>향후 개발 예정 기능</h3>
            <p>
              지원 컴포넌트 확장과 편집 편의 기능을 우선으로, 화면 JSON 검증 자동화와
              코드 생성 품질 개선을 로드맵에 따라 순차적으로 진행할 예정입니다.
            </p>
          </article>
        </div>
      </section>
    </main>
  </q-page>
</template>

<script setup>
const supported = [
  'Visual JSON Editor 화면 편집',
  '화면 JSON 저장 · 관리',
  'Vue(Quasar) 페이지 코드 생성',
  'Pinia Store · DataSet 연동',
  'Layout · Form · Table · Dialog 지원'
]

const limitations = [
  '일부 고급 컴포넌트 속성 미지원',
  '복합 화면 패턴 지원 제한',
  'Vue 코드 → JSON 역변환 미지원'
]

const roadmap = [
  { title: '지원 컴포넌트 확장', description: '고급 컴포넌트와 속성 추가' },
  { title: '편집 편의 기능', description: '드래그 배치 · 단축키 개선' },
  { title: '검증 자동화', description: '화면 JSON 유효성 자동 검사' },
  { title: '코드 생성 품질 개선', description: '생성 코드 최적화 · 표준 강화' }
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
.breadcrumb::after { content: "QUASAR UI TOOL · STATUS"; font-size: 16px; }
.breadcrumb > * { display: none; }
.breadcrumb .q-icon { color: var(--q-primary); }
.breadcrumb strong { color: #303d49; font-weight: 800; }
.detail-card { padding: 34px; border: 1px solid #dfe5eb; border-radius: 14px; background: #fff; box-shadow: 0 10px 28px rgba(42, 66, 88, .06); }
.detail-card > h2 { margin: 0; color: #303d49; font-size: 27px; font-weight: 800; }
.lead { margin: 10px 0 26px; color: #6e7984; font-size: 16px; line-height: 1.7; }

.feature-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 20px; }
.feature-card { display: flex; flex-direction: column; padding: 18px; border: 1px solid #e4e9ee; border-radius: 12px; background: #fbfcfd; }
.feature-card h3 { margin: 15px 0 6px; color: #3c4955; font-size: 18px; font-weight: 800; }
.feature-card > p { margin: 0; color: #74808b; font-size: 14.5px; line-height: 1.65; }

/* 캡처(스크린샷) 프레임 */
.shot { overflow: hidden; border: 1px solid #d8dfe6; border-radius: 10px; background: #fff; box-shadow: 0 4px 14px rgba(42, 66, 88, .08); }
.shot-bar { display: flex; align-items: center; gap: 5px; padding: 7px 10px; border-bottom: 1px solid #e4e9ee; background: #f1f4f8; }
.shot-bar i { width: 9px; height: 9px; border-radius: 50%; background: #cdd6de; }
.shot-bar i:nth-child(1) { background: #f38b82; }
.shot-bar i:nth-child(2) { background: #f4c96b; }
.shot-bar i:nth-child(3) { background: #83cf8f; }
.shot-bar span { margin-left: 7px; color: #7d8a96; font-size: 11px; font-weight: 700; }
.shot-body { height: 168px; }

/* 체크리스트 (지원 기능 · 제한사항) */
.check-body { display: flex; flex-direction: column; gap: 7px; padding: 12px; overflow: hidden; }
.check-row { display: flex; align-items: center; gap: 7px; margin: 0; padding: 6px 9px; border-radius: 7px; font-size: 11.5px; font-weight: 700; white-space: nowrap; }
.check-row.done { color: #1d7a46; background: #e6f6ec; }
.check-row.done .q-icon { color: #2e9e6b; }
.check-row.warn { color: #8a6d1f; background: #fdf3dd; }
.check-row.warn .q-icon { color: #d9a012; }

/* 로드맵 (향후 개발 예정) */
.roadmap-body { display: flex; flex-direction: column; padding: 13px 14px; overflow: hidden; }
.roadmap-row { display: flex; gap: 10px; flex: 1; }
.roadmap-line { display: flex; flex-direction: column; align-items: center; width: 14px; }
.roadmap-line .dot { width: 11px; height: 11px; flex: 0 0 auto; margin-top: 2px; border: 2px solid var(--q-primary); border-radius: 50%; background: #fff; }
.roadmap-line .dot.first { background: var(--q-primary); }
.roadmap-line .bar { flex: 1; width: 2px; margin: 2px 0; border-radius: 2px; background: #c8dcf3; }
.roadmap-text { display: flex; flex-direction: column; gap: 1px; padding-bottom: 7px; }
.roadmap-text em { color: #3c4955; font-size: 11.5px; font-style: normal; font-weight: 800; white-space: nowrap; }
.roadmap-text span { color: #8b98a4; font-size: 10.5px; white-space: nowrap; }

@media (max-width: 1200px) {
  .feature-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (max-width: 760px) {
  .intro-content { width: min(100% - 28px, 560px); padding-top: 14px; }
  .page-heading { flex-wrap: wrap; }
  .detail-card { padding: 24px 20px; }
  .feature-grid { grid-template-columns: 1fr; }
}
</style>
