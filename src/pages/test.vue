<template>
  <q-page class="guide-page">
    <main class="guide-container">
      <section class="guide-hero">
        <div>
          <p class="eyebrow">QUASAR UI TOOL GUIDE</p>
          <h1>Quick Start</h1>
          <p class="hero-copy">
            Extension 설치부터 화면 구성, 데이터 연결, Vue 코드 생성까지
            한 페이지에서 순서대로 확인할 수 있습니다.
          </p>
        </div>
        <img :src="toolLogo" alt="Quasar UI Tool" />
      </section>

      <nav class="quick-nav" aria-label="Quick Start 목차">
        <p>Quick Start</p>
        <div class="quick-nav-list">
          <a
            v-for="(item, index) in guideNav"
            :key="item.id"
            :href="`#${item.id}`"
            @click.prevent="scrollToSection(item.id)"
          >
            <span>{{ index + 1 }}</span>
            <q-icon :name="item.icon" size="23px" />
            <strong>{{ item.label }}</strong>
          </a>
        </div>
      </nav>

      <div class="workflow" aria-label="전체 작업 흐름">
        <template v-for="(step, index) in workflow" :key="step.label">
          <div class="workflow-step">
            <q-icon :name="step.icon" size="26px" />
            <span>{{ step.label }}</span>
          </div>
          <q-icon
            v-if="index < workflow.length - 1"
            class="workflow-arrow"
            name="arrow_forward"
            size="22px"
          />
        </template>
      </div>

      <section id="install" class="guide-section">
        <header class="section-header">
          <span class="section-number">01</span>
          <div>
            <p>INSTALLATION</p>
            <h2>설치 및 실행</h2>
          </div>
          <q-icon name="download_for_offline" />
        </header>

        <div class="two-column">
          <div>
            <h3>먼저 준비해 주세요</h3>
            <div class="requirement-grid">
              <div v-for="item in requirements" :key="item.name">
                <span :class="item.color"><q-icon :name="item.icon" size="28px" /></span>
                <strong>{{ item.name }}</strong>
                <small>{{ item.description }}</small>
              </div>
            </div>
          </div>

          <div class="step-panel">
            <h3>Extension 실행 순서</h3>
            <ol class="numbered-steps">
              <li v-for="step in installSteps" :key="step.title">
                <span>{{ step.number }}</span>
                <div>
                  <strong>{{ step.title }}</strong>
                  <p>{{ step.description }}</p>
                </div>
              </li>
            </ol>
          </div>
        </div>

        <div class="terminal-card">
          <div class="terminal-bar"><i></i><i></i><i></i><span>Terminal</span></div>
          <code><b>$</b> npm install</code>
          <code><b>$</b> npm run dev</code>
        </div>
      </section>

      <section id="screen" class="guide-section">
        <header class="section-header">
          <span class="section-number">02</span>
          <div>
            <p>VISUAL EDITOR</p>
            <h2>화면 만들기</h2>
          </div>
          <q-icon name="design_services" />
        </header>

        <div class="editor-figure">
          <div class="editor-titlebar">
            <q-icon name="data_object" />
            <span>IndexPage.json — Quasar UI Tool Editor</span>
          </div>
          <div class="editor-layout">
            <div class="palette-panel">
              <strong>Component Palette</strong>
              <span v-for="item in paletteItems" :key="item.label">
                <q-icon :name="item.icon" />{{ item.label }}
              </span>
            </div>
            <div class="canvas-panel">
              <small>SCREEN CANVAS</small>
              <div class="mock-form">
                <div><i>조회 구분</i><b>Option</b><i>검색어</i><b>Input</b></div>
                <div class="mock-actions"><span>초기화</span><strong>검색</strong></div>
              </div>
              <div class="mock-table">
                <div class="mock-table-head"><i>No.</i><i>이름</i><i>상태</i></div>
                <div v-for="row in 3" :key="row"><i>{{ row }}</i><i>Sample {{ row }}</i><i>Active</i></div>
              </div>
            </div>
            <div class="properties-panel">
              <strong>Properties</strong>
              <label>Component<input value="q-input" readonly /></label>
              <label>Label<input value="검색어" readonly /></label>
              <label>Outlined<span class="mock-toggle"></span></label>
            </div>
          </div>
        </div>

        <div class="tip-row">
          <div><q-icon name="touch_app" /><strong>1. 선택</strong><span>Palette에서 컴포넌트를 선택합니다.</span></div>
          <div><q-icon name="drag_indicator" /><strong>2. 배치</strong><span>Canvas에 원하는 순서로 배치합니다.</span></div>
          <div><q-icon name="tune" /><strong>3. 설정</strong><span>Properties에서 속성을 수정합니다.</span></div>
        </div>
      </section>

      <section id="data" class="guide-section">
        <header class="section-header">
          <span class="section-number">03</span>
          <div>
            <p>DATA BINDING</p>
            <h2>데이터 연결</h2>
          </div>
          <q-icon name="hub" />
        </header>

        <div class="binding-diagram">
          <div class="binding-node node-blue">
            <q-icon name="input" />
            <strong>UI Component</strong>
            <span>v-model</span>
          </div>
          <div class="binding-link"><span>양방향 바인딩</span><q-icon name="sync_alt" /></div>
          <div class="binding-node node-violet">
            <q-icon name="dataset" />
            <strong>DataSet</strong>
            <span>화면 데이터</span>
          </div>
          <div class="binding-link"><span>상태 관리</span><q-icon name="sync_alt" /></div>
          <div class="binding-node node-green">
            <q-icon name="inventory_2" />
            <strong>Pinia Store</strong>
            <span>공통 상태·함수</span>
          </div>
        </div>

        <div class="code-example">
          <div class="code-caption"><q-icon name="code" /> 데이터 연결 예시</div>
          <pre><span>&lt;q-input</span> v-model=<b>"search.name"</b> label=<b>"이름"</b> <span>/&gt;</span>

<em>const</em> search = reactive({
  name: <b>''</b>,
  useYn: <em>true</em>
})</pre>
        </div>
      </section>

      <section id="generate" class="guide-section">
        <header class="section-header">
          <span class="section-number">04</span>
          <div>
            <p>CODE GENERATION</p>
            <h2>코드 생성</h2>
          </div>
          <q-icon name="auto_awesome" />
        </header>

        <div class="generation-flow">
          <div><q-icon name="description" /><strong>Screen JSON</strong><small>화면 정의</small></div>
          <span><q-icon name="east" /></span>
          <div class="generator-node"><q-icon name="settings_suggest" /><strong>Generator</strong><small>검증 및 변환</small></div>
          <span><q-icon name="east" /></span>
          <div><q-icon name="html" /><strong>Vue Page</strong><small>화면 코드</small></div>
          <div><q-icon name="inventory_2" /><strong>Pinia Store</strong><small>상태 코드</small></div>
        </div>

        <div class="command-grid">
          <div v-for="command in commands" :key="command.code">
            <q-icon :name="command.icon" />
            <span><strong>{{ command.title }}</strong><code>{{ command.code }}</code></span>
            <q-icon name="content_copy" />
          </div>
        </div>
      </section>

      <section id="troubleshooting" class="guide-section">
        <header class="section-header">
          <span class="section-number">05</span>
          <div>
            <p>TROUBLESHOOTING</p>
            <h2>문제 해결</h2>
          </div>
          <q-icon name="build_circle" />
        </header>

        <div class="trouble-list">
          <details v-for="(item, index) in troubles" :key="item.question" :open="index === 0">
            <summary>
              <span><q-icon :name="item.icon" />{{ item.question }}</span>
              <q-icon name="expand_more" />
            </summary>
            <p>{{ item.answer }}</p>
          </details>
        </div>

        <div class="help-banner">
          <span><q-icon name="support_agent" size="32px" /></span>
          <div>
            <strong>해결되지 않았나요?</strong>
            <p>오류 메시지와 재현 절차를 포함해 문의해 주세요.</p>
          </div>
          <a href="mailto:mailmoon@naver.com?subject=%5BQuasar%20UI%20Tool%20질의응답%5D">
            mailmoon@naver.com <q-icon name="send" />
          </a>
        </div>
      </section>
    </main>
  </q-page>
</template>

<script setup>
import toolLogo from '../../docs/QuasarUiTool.png'

const guideNav = [
  { id: 'install', label: '설치 및 실행', icon: 'download' },
  { id: 'screen', label: '화면 만들기', icon: 'dashboard_customize' },
  { id: 'data', label: '데이터 연결', icon: 'hub' },
  { id: 'generate', label: '코드 생성', icon: 'code' },
  { id: 'troubleshooting', label: '문제 해결', icon: 'build' }
]

const workflow = [
  { label: 'Extension 설치', icon: 'extension' },
  { label: 'JSON 편집', icon: 'data_object' },
  { label: '데이터 연결', icon: 'link' },
  { label: '코드 생성', icon: 'auto_awesome' },
  { label: 'Quasar 실행', icon: 'play_circle' }
]

const requirements = [
  { name: 'VS Code', description: '최신 안정 버전', icon: 'code', color: 'req-blue' },
  { name: 'Node.js', description: 'LTS 버전 권장', icon: 'terminal', color: 'req-green' },
  { name: 'Quasar', description: 'Quasar v2 프로젝트', icon: 'widgets', color: 'req-violet' }
]

const installSteps = [
  { number: '1', title: '프로젝트 열기', description: '저장소를 VS Code에서 엽니다.' },
  { number: '2', title: 'Extension 실행', description: 'Run Quasar UI Tool Extension 구성을 실행합니다.' },
  { number: '3', title: 'JSON 열기', description: 'Extension Host에서 화면 JSON을 엽니다.' },
  { number: '4', title: 'Editor 선택', description: 'Open With… → Quasar UI Tool Editor를 선택합니다.' }
]

const paletteItems = [
  { label: 'Layout', icon: 'view_quilt' },
  { label: 'Form', icon: 'dynamic_form' },
  { label: 'Input', icon: 'input' },
  { label: 'Table', icon: 'table_chart' }
]

const commands = [
  { title: '화면 JSON 검증', code: 'npm run validate:screens', icon: 'fact_check' },
  { title: 'Vue 페이지 생성', code: 'npm run generate:vue', icon: 'html' },
  { title: 'Pinia Store 생성', code: 'npm run generate:pinia', icon: 'inventory_2' }
]

const troubles = [
  { question: 'JSON이 비주얼 에디터로 열리지 않습니다.', answer: '파일을 우클릭한 뒤 Open With… 메뉴에서 Quasar UI Tool Editor를 선택하고 기본 편집기로 설정하세요.', icon: 'data_object' },
  { question: 'Activity Bar에 Quasar Tool이 보이지 않습니다.', answer: 'Extension Development Host가 실행 중인지 확인하고 VS Code의 View → Appearance → Activity Bar를 활성화하세요.', icon: 'view_sidebar' },
  { question: 'Vue 파일이 생성되지 않습니다.', answer: '터미널의 오류 메시지를 확인하고 먼저 npm run validate:screens로 JSON 스키마 오류를 검사하세요.', icon: 'html' },
  { question: '수정한 내용이 화면에 반영되지 않습니다.', answer: 'JSON을 저장한 다음 Vue 코드를 다시 생성하고 Quasar 개발 서버를 재실행하거나 새로고침하세요.', icon: 'refresh' }
]

function scrollToSection(sectionId) {
  const section = document.getElementById(sectionId)

  if (!section) return

  section.scrollIntoView({
    behavior: 'smooth',
    block: 'start'
  })
}
</script>

<style scoped>
.guide-page { color: #3f4b57; background: #f5f8fb; scroll-behavior: smooth; }
.guide-container { width: min(1160px, calc(100% - 48px)); margin: 0 auto; padding: 42px 0 90px; }
.guide-hero {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 220px;
  padding: 38px 48px;
  overflow: hidden;
  border-radius: 20px;
  color: #fff;
  background: linear-gradient(125deg, #0d5daa, #1976d2 58%, #4da5ed);
  box-shadow: 0 18px 42px rgba(22, 91, 151, .2);
}
.guide-hero::after { content: ""; position: absolute; width: 280px; height: 280px; border: 50px solid rgba(255,255,255,.08); border-radius: 50%; transform: translate(70px, -90px); }
.guide-hero > div { position: relative; z-index: 1; }
.guide-hero img { position: relative; z-index: 1; width: 150px; border: 5px solid rgba(255,255,255,.28); border-radius: 28px; box-shadow: 0 15px 30px rgba(0, 34, 76, .3); }
.eyebrow { margin: 0 0 8px; color: #cce7ff; font-size: 13px; font-weight: 800; letter-spacing: .14em; }
.guide-hero h1 { margin: 0; font-size: 46px; line-height: 1.1; }
.hero-copy { max-width: 680px; margin: 16px 0 0; color: rgba(255,255,255,.9); font-size: 18px; line-height: 1.7; }
.quick-nav { margin-top: 24px; padding: 24px; border: 1px solid #dce5ed; border-radius: 15px; background: #fff; box-shadow: 0 9px 24px rgba(39, 67, 92, .07); }
.quick-nav > p { margin: 0 0 15px; color: #2f3d4a; font-size: 20px; font-weight: 800; }
.quick-nav-list { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; }
.quick-nav-list a { position: relative; display: flex; align-items: center; gap: 9px; min-height: 58px; padding: 11px 13px; border-radius: 9px; color: #50606f; background: #f4f7fa; text-decoration: none; transition: .16s ease; }
.quick-nav-list a:hover { color: var(--q-primary); background: #e8f3fd; transform: translateY(-2px); }
.quick-nav-list a > span { display: grid; place-items: center; width: 23px; height: 23px; border-radius: 50%; color: #fff; background: var(--q-primary); font-size: 11px; font-weight: 800; }
.quick-nav-list strong { font-size: 14px; }
.workflow { display: flex; align-items: center; justify-content: center; gap: 12px; margin: 42px 0; }
.workflow-step { display: grid; place-items: center; gap: 7px; width: 135px; min-height: 96px; border: 1px solid #dce5ed; border-radius: 13px; color: var(--q-primary); background: #fff; box-shadow: 0 7px 18px rgba(38, 68, 94, .06); }
.workflow-step span { color: #52606d; font-size: 14px; font-weight: 700; }
.workflow-arrow { color: #9aabb9; }
.guide-section { margin-top: 32px; padding: 38px; scroll-margin-top: 90px; border: 1px solid #dce5ed; border-radius: 17px; background: #fff; box-shadow: 0 10px 27px rgba(38, 68, 94, .06); }
.section-header { display: flex; align-items: center; gap: 15px; padding-bottom: 23px; border-bottom: 1px solid #e5ebf0; }
.section-number { display: grid; place-items: center; width: 49px; height: 49px; border-radius: 14px; color: #fff; background: var(--q-primary); font-size: 15px; font-weight: 800; }
.section-header > div { flex: 1; }
.section-header p { margin: 0 0 2px; color: var(--q-primary); font-size: 11px; font-weight: 800; letter-spacing: .12em; }
.section-header h2 { margin: 0; color: #2f3b47; font-size: 29px; font-weight: 800; }
.section-header > .q-icon { color: #d4e6f6; font-size: 48px; }
.two-column { display: grid; grid-template-columns: 1fr 1fr; gap: 28px; margin-top: 27px; }
.two-column h3, .step-panel h3 { margin: 0 0 16px; color: #3b4854; font-size: 18px; }
.requirement-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
.requirement-grid > div { display: grid; justify-items: center; gap: 5px; padding: 17px 8px; border: 1px solid #e1e8ee; border-radius: 11px; text-align: center; }
.requirement-grid > div > span { display: grid; place-items: center; width: 48px; height: 48px; border-radius: 12px; }
.requirement-grid strong { font-size: 14px; }.requirement-grid small { color: #84909a; font-size: 11px; }
.req-blue { color: #176fc1; background: #e7f3ff; }.req-green { color: #16815a; background: #e7f7ef; }.req-violet { color: #7554c9; background: #f0ebff; }
.step-panel { padding: 22px; border-radius: 12px; background: #f7f9fb; }
.numbered-steps { display: grid; gap: 12px; margin: 0; padding: 0; list-style: none; }
.numbered-steps li { display: flex; gap: 12px; }
.numbered-steps li > span { display: grid; place-items: center; width: 28px; height: 28px; flex: 0 0 28px; border-radius: 50%; color: var(--q-primary); background: #e3f1fd; font-size: 12px; font-weight: 800; }
.numbered-steps strong { color: #43515e; font-size: 14px; }.numbered-steps p { margin: 2px 0 0; color: #788590; font-size: 12px; }
.terminal-card { margin-top: 22px; padding: 0 0 17px; overflow: hidden; border-radius: 11px; color: #d8e9f8; background: #172433; }
.terminal-bar { display: flex; align-items: center; gap: 6px; margin-bottom: 10px; padding: 10px 14px; background: #233244; }
.terminal-bar i { width: 9px; height: 9px; border-radius: 50%; background: #f06a64; }.terminal-bar i:nth-child(2) { background: #f2bd4d; }.terminal-bar i:nth-child(3) { background: #5cc871; }
.terminal-bar span { margin-left: 7px; color: #91a6ba; font-size: 11px; }
.terminal-card code { display: block; padding: 3px 18px; font-size: 13px; }.terminal-card b { color: #50c8ff; }
.editor-figure { margin-top: 27px; overflow: hidden; border: 1px solid #cfdbe5; border-radius: 12px; box-shadow: 0 12px 25px rgba(30, 61, 87, .09); }
.editor-titlebar { display: flex; align-items: center; gap: 8px; padding: 11px 15px; color: #d8e3ec; background: #273746; font-size: 12px; }
.editor-layout { display: grid; grid-template-columns: 170px 1fr 185px; min-height: 300px; }
.palette-panel, .properties-panel { padding: 16px 13px; background: #f7f9fb; }
.palette-panel { border-right: 1px solid #dbe3ea; }.properties-panel { border-left: 1px solid #dbe3ea; }
.palette-panel > strong, .properties-panel > strong { display: block; margin-bottom: 14px; color: #3d4a56; font-size: 13px; }
.palette-panel > span { display: flex; align-items: center; gap: 8px; margin-bottom: 7px; padding: 9px; border: 1px solid #dfe6ec; border-radius: 7px; color: #596875; background: #fff; font-size: 12px; }
.canvas-panel { padding: 18px; background: #edf2f6; }.canvas-panel > small { color: #8493a0; font-size: 9px; font-weight: 800; letter-spacing: .12em; }
.mock-form, .mock-table { margin-top: 12px; padding: 11px; border: 1px solid #d8e1e9; border-radius: 7px; background: #fff; }
.mock-form > div:first-child { display: grid; grid-template-columns: 1fr 1.5fr 1fr 2fr; }
.mock-form i, .mock-form b { padding: 9px; border: 1px solid #e0e5ea; color: #71808d; font-size: 10px; font-style: normal; }.mock-form i { background: #f0f3f5; }
.mock-actions { display: flex; justify-content: flex-end; gap: 7px; margin-top: 10px; }.mock-actions span, .mock-actions strong { padding: 6px 12px; border: 1px solid #b9c7d2; border-radius: 5px; font-size: 9px; }.mock-actions strong { color: #fff; border-color: var(--q-primary); background: var(--q-primary); }
.mock-table > div { display: grid; grid-template-columns: .5fr 2fr 1fr; }.mock-table i { padding: 8px; border-bottom: 1px solid #e3e8ec; color: #687987; font-size: 9px; font-style: normal; }.mock-table-head { color: #fff; background: var(--q-primary); }.mock-table-head i { color: #fff; border: 0; }
.properties-panel label { display: grid; gap: 4px; margin-bottom: 11px; color: #76838e; font-size: 10px; }.properties-panel input { width: 100%; padding: 7px; border: 1px solid #d5dfe7; border-radius: 5px; color: #52616d; background: #fff; font-size: 10px; }
.mock-toggle { width: 30px; height: 16px; border-radius: 10px; background: var(--q-primary); }.mock-toggle::after { content:""; display: block; width: 12px; height: 12px; margin: 2px 2px 2px 16px; border-radius: 50%; background: #fff; }
.tip-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-top: 20px; }.tip-row > div { display: grid; grid-template-columns: 35px 1fr; align-items: center; padding: 16px; border-radius: 10px; background: #f4f8fb; }.tip-row .q-icon { grid-row: 1 / 3; color: var(--q-primary); font-size: 24px; }.tip-row strong { color: #42515e; font-size: 13px; }.tip-row span { color: #7b8893; font-size: 11px; }
.binding-diagram { display: flex; align-items: center; justify-content: center; gap: 15px; margin-top: 32px; }
.binding-node { display: grid; place-items: center; gap: 5px; width: 170px; min-height: 130px; border: 2px solid; border-radius: 15px; }.binding-node .q-icon { font-size: 31px; }.binding-node strong { font-size: 15px; }.binding-node span { font-size: 11px; opacity: .72; }
.node-blue { color: #1976d2; border-color: #b8daf8; background: #edf7ff; }.node-violet { color: #7355c5; border-color: #d4c8f5; background: #f5f1ff; }.node-green { color: #18825c; border-color: #bce3d2; background: #effaf5; }
.binding-link { display: grid; justify-items: center; color: #94a3af; }.binding-link span { font-size: 10px; }.binding-link .q-icon { font-size: 29px; }
.code-example { margin-top: 28px; overflow: hidden; border-radius: 11px; background: #182635; }.code-caption { display: flex; align-items: center; gap: 7px; padding: 11px 16px; color: #a9bfd1; background: #233648; font-size: 12px; }.code-example pre { margin: 0; padding: 18px; color: #e2edf6; font-size: 13px; line-height: 1.7; }.code-example pre span { color: #73d1ff; }.code-example pre b { color: #f5c56b; }.code-example pre em { color: #c59cff; font-style: normal; }
.generation-flow { display: grid; grid-template-columns: 1fr 40px 1fr 40px 1fr; gap: 10px; align-items: center; margin-top: 30px; }.generation-flow > div { display: grid; justify-items: center; gap: 5px; padding: 24px 12px; border: 1px solid #dce5ec; border-radius: 12px; background: #f8fafc; }.generation-flow > div:last-child { grid-column: 5; }.generation-flow > div .q-icon { color: var(--q-primary); font-size: 31px; }.generation-flow strong { font-size: 14px; }.generation-flow small { color: #82909b; font-size: 11px; }.generation-flow > span { color: #9babb7; text-align: center; }.generation-flow .generator-node { color: #fff; border: 0; background: linear-gradient(135deg, #1369b9, #429de7); }.generation-flow .generator-node .q-icon, .generation-flow .generator-node small { color: #fff; }
.command-grid { display: grid; gap: 10px; margin-top: 22px; }.command-grid > div { display: flex; align-items: center; gap: 14px; padding: 14px 17px; border: 1px solid #e0e7ed; border-radius: 9px; }.command-grid > div > .q-icon:first-child { color: var(--q-primary); font-size: 23px; }.command-grid > div > .q-icon:last-child { margin-left: auto; color: #9aa7b2; }.command-grid span { display: grid; gap: 3px; }.command-grid strong { font-size: 13px; }.command-grid code { color: #62717e; font-size: 12px; }
.trouble-list { display: grid; gap: 10px; margin-top: 26px; }.trouble-list details { border: 1px solid #dfe6ec; border-radius: 10px; background: #fbfcfd; }.trouble-list summary { display: flex; justify-content: space-between; padding: 16px 18px; cursor: pointer; list-style: none; color: #45535f; font-weight: 700; }.trouble-list summary span { display: flex; align-items: center; gap: 10px; }.trouble-list summary span .q-icon { color: var(--q-primary); }.trouble-list details p { margin: 0; padding: 0 18px 17px 52px; color: #74818c; font-size: 13px; line-height: 1.65; }
.help-banner { display: flex; align-items: center; gap: 14px; margin-top: 22px; padding: 20px; border-radius: 12px; color: #fff; background: linear-gradient(110deg, #34495e, #246da9); }.help-banner > span { display: grid; place-items: center; width: 50px; height: 50px; border-radius: 12px; background: rgba(255,255,255,.13); }.help-banner > div { flex: 1; }.help-banner strong { font-size: 16px; }.help-banner p { margin: 3px 0 0; color: rgba(255,255,255,.75); font-size: 12px; }.help-banner a { display: flex; align-items: center; gap: 8px; padding: 11px 15px; border-radius: 8px; color: #24679f; background: #fff; font-size: 12px; font-weight: 700; text-decoration: none; }

@media (max-width: 850px) {
  .quick-nav-list { grid-template-columns: repeat(2, 1fr); }
  .workflow { flex-wrap: wrap; }.workflow-arrow { display: none; }
  .two-column { grid-template-columns: 1fr; }
  .editor-layout { grid-template-columns: 130px 1fr; }.properties-panel { display: none; }
  .binding-diagram { flex-direction: column; }.binding-link { transform: rotate(90deg); }
}
@media (max-width: 600px) {
  .guide-container { width: min(100% - 26px, 540px); padding-top: 24px; }
  .guide-hero { min-height: 0; padding: 30px 24px; }.guide-hero img { display: none; }.guide-hero h1 { font-size: 37px; }
  .quick-nav-list { grid-template-columns: 1fr; }
  .guide-section { padding: 26px 18px; }
  .section-header h2 { font-size: 25px; }
  .section-header > .q-icon { display: none; }
  .requirement-grid, .tip-row { grid-template-columns: 1fr; }
  .editor-layout { grid-template-columns: 1fr; }.palette-panel { display: none; }
  .generation-flow { grid-template-columns: 1fr; }.generation-flow > span { transform: rotate(90deg); }.generation-flow > div:last-child { grid-column: auto; }
  .help-banner { align-items: flex-start; flex-wrap: wrap; }.help-banner a { width: 100%; justify-content: center; }
}
</style>
