<template>
  <q-page class="intro-page">
    <main class="intro-content">
      <div class="page-heading">
        <div class="heading-title">
          <span class="heading-icon"><q-icon name="extension" size="30px" /></span>
          <h1>주요 기능</h1>
        </div>
        <nav class="breadcrumb" aria-label="현재 위치">
          <span>UI TOOL 소개</span>
          <q-icon name="double_arrow" size="20px" />
          <strong>주요 기능</strong>
        </nav>
      </div>

      <section class="detail-card">
        <h2>주요 기능과 지원 컴포넌트</h2>
        <p class="lead">
          화면 설계부터 코드 생성까지, Quasar UI Tool이 제공하는 핵심 기능을 한눈에 확인하세요.
        </p>

        <div class="feature-grid">
          <!-- 1. Visual JSON Editor -->
          <article class="feature-card">
            <div class="shot">
              <div class="shot-bar"><i /><i /><i /><span>Visual JSON Editor</span></div>
              <div class="shot-body editor-split">
                <div class="json-pane">
                  <p><span class="j-key">"type"</span>: <span class="j-str">"page"</span>,</p>
                  <p><span class="j-key">"layout"</span>: {</p>
                  <p class="ind"><span class="j-key">"header"</span>: <span class="j-str">"toolbar"</span>,</p>
                  <p class="ind"><span class="j-key">"body"</span>: [</p>
                  <p class="ind2"><span class="j-str">"q-form"</span>,</p>
                  <p class="ind2"><span class="j-str">"q-table"</span></p>
                  <p class="ind">]</p>
                  <p>}</p>
                </div>
                <div class="canvas-pane">
                  <div class="canvas-toolbar" />
                  <div class="canvas-row"><span /><span /><span class="btn" /></div>
                  <div class="canvas-table">
                    <i /><i /><i /><i /><i /><i />
                  </div>
                </div>
              </div>
            </div>
            <h3>Visual JSON Editor</h3>
            <p>화면 JSON을 코드 대신 시각적인 편집 화면에서 구성합니다. 왼쪽 JSON 구조가 오른쪽 화면 미리보기에 실시간으로 반영됩니다.</p>
          </article>

          <!-- 2. Component Palette -->
          <article class="feature-card">
            <div class="shot">
              <div class="shot-bar"><i /><i /><i /><span>Component Palette</span></div>
              <div class="shot-body palette-body">
                <div class="palette-search"><q-icon name="search" size="13px" /><em>컴포넌트 검색…</em></div>
                <div class="palette-grid">
                  <div class="chip"><q-icon name="smart_button" size="17px" /><em>Button</em></div>
                  <div class="chip"><q-icon name="input" size="17px" /><em>Input</em></div>
                  <div class="chip"><q-icon name="arrow_drop_down_circle" size="17px" /><em>Select</em></div>
                  <div class="chip"><q-icon name="table_chart" size="17px" /><em>Table</em></div>
                  <div class="chip"><q-icon name="crop_landscape" size="17px" /><em>Card</em></div>
                  <div class="chip"><q-icon name="web_asset" size="17px" /><em>Dialog</em></div>
                  <div class="chip"><q-icon name="check_box" size="17px" /><em>Checkbox</em></div>
                  <div class="chip"><q-icon name="date_range" size="17px" /><em>Date</em></div>
                </div>
              </div>
            </div>
            <h3>Component Palette</h3>
            <p>사용할 UI 컴포넌트를 팔레트에서 탐색하고 드래그하듯 화면에 배치합니다. Quasar 주요 컴포넌트가 목록으로 제공됩니다.</p>
          </article>

          <!-- 3. Properties / Page Tree -->
          <article class="feature-card">
            <div class="shot">
              <div class="shot-bar"><i /><i /><i /><span>Properties · Page Tree</span></div>
              <div class="shot-body tree-split">
                <div class="tree-pane">
                  <p class="t0"><q-icon name="description" size="13px" />page</p>
                  <p class="t1"><q-icon name="view_quilt" size="13px" />layout</p>
                  <p class="t2 sel"><q-icon name="table_chart" size="13px" />q-table</p>
                  <p class="t2"><q-icon name="edit_note" size="13px" />q-form</p>
                  <p class="t3"><q-icon name="input" size="13px" />q-input</p>
                </div>
                <div class="props-pane">
                  <div class="prop"><em>label</em><span>사용자 목록</span></div>
                  <div class="prop"><em>rows</em><span>userList</span></div>
                  <div class="prop"><em>dense</em><span class="on">true</span></div>
                  <div class="prop"><em>bordered</em><span class="on">true</span></div>
                </div>
              </div>
            </div>
            <h3>Properties · Page Tree</h3>
            <p>페이지 트리에서 화면 계층 구조를 확인하고, 선택한 컴포넌트의 속성을 속성 패널에서 편리하게 관리합니다.</p>
          </article>

          <!-- 4. DataSet & Pinia Store -->
          <article class="feature-card">
            <div class="shot">
              <div class="shot-bar"><i /><i /><i /><span>DataSet · Pinia Store</span></div>
              <div class="shot-body data-flow">
                <div class="mini-table">
                  <b>DataSet</b>
                  <i class="head" /><i /><i /><i />
                </div>
                <div class="flow-arrow"><q-icon name="sync_alt" size="19px" /></div>
                <div class="store-box">
                  <b><q-icon name="storage" size="13px" /> useUserStore</b>
                  <span>state: userList</span>
                  <span>actions: fetch()</span>
                  <span>getters: total</span>
                </div>
              </div>
            </div>
            <h3>DataSet 및 Pinia Store</h3>
            <p>화면 데이터 구조(DataSet)를 정의하면 Pinia Store와 자동으로 연결되어 상태 관리 코드까지 함께 구성됩니다.</p>
          </article>

          <!-- 5. Vue 코드 생성 -->
          <article class="feature-card">
            <div class="shot">
              <div class="shot-bar dark"><i /><i /><i /><span>UserPage.vue — 생성됨</span></div>
              <div class="shot-body code-body">
                <p><span class="c-tag">&lt;template&gt;</span></p>
                <p class="ind"><span class="c-tag">&lt;q-page</span> <span class="c-attr">class</span>=<span class="c-str">"user-page"</span><span class="c-tag">&gt;</span></p>
                <p class="ind2"><span class="c-tag">&lt;q-table</span> <span class="c-attr">:rows</span>=<span class="c-str">"userList"</span> <span class="c-tag">/&gt;</span></p>
                <p class="ind"><span class="c-tag">&lt;/q-page&gt;</span></p>
                <p><span class="c-tag">&lt;/template&gt;</span></p>
                <p><span class="c-tag">&lt;script setup&gt;</span></p>
                <p class="ind"><span class="c-kw">import</span> { useUserStore } <span class="c-kw">from</span> <span class="c-str">'stores/user'</span></p>
                <p><span class="c-tag">&lt;/script&gt;</span></p>
              </div>
            </div>
            <h3>Vue 코드 생성</h3>
            <p>작성한 화면 JSON을 버튼 한 번으로 실행 가능한 Vue(Quasar) 페이지 코드로 변환합니다. 생성된 코드는 바로 프로젝트에서 사용할 수 있습니다.</p>
          </article>

          <!-- 6. 지원 컴포넌트 -->
          <article class="feature-card">
            <div class="shot">
              <div class="shot-bar"><i /><i /><i /><span>지원 컴포넌트</span></div>
              <div class="shot-body support-grid">
                <div class="support-tile">
                  <div class="pic layout-pic"><i class="top" /><i class="side" /><i class="main" /></div>
                  <em>Layout</em>
                </div>
                <div class="support-tile">
                  <div class="pic form-pic"><i /><i /><i class="btn" /></div>
                  <em>Form</em>
                </div>
                <div class="support-tile">
                  <div class="pic table-pic"><i class="head" /><i /><i /><i /></div>
                  <em>Table</em>
                </div>
                <div class="support-tile">
                  <div class="pic dialog-pic"><i class="backdrop" /><i class="modal" /></div>
                  <em>Dialog</em>
                </div>
              </div>
            </div>
            <h3>지원 컴포넌트</h3>
            <p>Layout, Form, Table, Dialog 등 Quasar 기반 주요 컴포넌트를 지원하며, 지원 범위는 계속 확대되고 있습니다.</p>
          </article>
        </div>
      </section>
    </main>
  </q-page>
</template>

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
.breadcrumb::after { content: "QUASAR UI TOOL · FEATURES"; font-size: 16px; }
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
.shot-bar.dark { background: #2c3440; border-color: #232a34; }
.shot-bar.dark span { color: #aab6c2; }
.shot-body { height: 168px; }

/* 1. Visual JSON Editor */
.editor-split { display: grid; grid-template-columns: 1fr 1fr; }
.json-pane { padding: 10px 12px; border-right: 1px solid #e4e9ee; background: #fafbfd; font-family: Consolas, monospace; font-size: 10.5px; line-height: 1.75; color: #5b6570; }
.json-pane p { margin: 0; white-space: nowrap; }
.json-pane .ind { padding-left: 12px; }
.json-pane .ind2 { padding-left: 24px; }
.j-key { color: #1976d2; }
.j-str { color: #2e9e6b; }
.canvas-pane { display: flex; flex-direction: column; gap: 8px; padding: 12px; background: repeating-linear-gradient(0deg, #fff, #fff 11px, #f4f7fa 11px, #f4f7fa 12px); }
.canvas-toolbar { height: 16px; border-radius: 4px; background: var(--q-primary); opacity: .82; }
.canvas-row { display: flex; gap: 6px; }
.canvas-row span { height: 14px; flex: 1; border: 1px solid #c9d4de; border-radius: 4px; background: #fff; }
.canvas-row .btn { flex: 0 0 34px; border: none; background: var(--q-primary); opacity: .75; }
.canvas-table { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; flex: 1; }
.canvas-table i { border: 1px solid #d5dee6; border-radius: 3px; background: #fff; }
.canvas-table i:nth-child(-n+3) { background: #e3eefb; }

/* 2. Component Palette */
.palette-body { display: flex; flex-direction: column; gap: 10px; padding: 12px; }
.palette-search { display: flex; align-items: center; gap: 6px; padding: 6px 9px; border: 1px solid #dbe2e9; border-radius: 6px; color: #97a3ae; font-size: 11px; }
.palette-search em { font-style: normal; }
.palette-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
.chip { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 9px 4px; border: 1px solid #dfe6ec; border-radius: 8px; background: #fff; color: var(--q-primary); }
.chip em { color: #5b6772; font-size: 10px; font-style: normal; font-weight: 700; }

/* 3. Properties / Page Tree */
.tree-split { display: grid; grid-template-columns: 1fr 1.15fr; }
.tree-pane { padding: 11px 12px; border-right: 1px solid #e4e9ee; background: #fafbfd; font-size: 11px; color: #5b6570; }
.tree-pane p { display: flex; align-items: center; gap: 5px; margin: 0 0 7px; }
.tree-pane .q-icon { color: #8b98a4; }
.t1 { padding-left: 13px; }
.t2 { padding-left: 26px; }
.t3 { padding-left: 39px; }
.tree-pane .sel { margin-left: 22px; padding: 2px 6px 2px 4px; border-radius: 5px; color: var(--q-primary); background: #e3eefb; font-weight: 700; }
.tree-pane .sel .q-icon { color: var(--q-primary); }
.props-pane { display: flex; flex-direction: column; gap: 7px; padding: 12px; }
.prop { display: flex; align-items: center; justify-content: space-between; padding: 5px 9px; border: 1px solid #e2e8ee; border-radius: 6px; background: #fff; font-size: 10.5px; }
.prop em { color: #64707b; font-style: normal; font-weight: 700; }
.prop span { color: #3c4955; font-family: Consolas, monospace; }
.prop .on { padding: 1px 7px; border-radius: 8px; color: #1d7a46; background: #dcf3e5; font-weight: 700; }

/* 4. DataSet & Pinia Store */
.data-flow { display: flex; align-items: center; gap: 10px; padding: 16px 14px; }
.mini-table { display: grid; grid-template-rows: auto 14px 14px 14px 14px; gap: 4px; flex: 1; }
.mini-table b { color: #64707b; font-size: 11px; }
.mini-table i { border: 1px solid #d5dee6; border-radius: 3px; background: #fff; }
.mini-table .head { background: #e3eefb; border-color: #c8dcf3; }
.flow-arrow { color: var(--q-primary); }
.store-box { display: flex; flex-direction: column; gap: 5px; flex: 1.2; padding: 11px 12px; border: 1px solid #f3d9a4; border-radius: 9px; background: #fdf7ea; }
.store-box b { display: flex; align-items: center; gap: 4px; color: #8a6d1f; font-size: 11.5px; }
.store-box span { padding: 3px 8px; border-radius: 5px; background: #fff; color: #74808b; font-size: 10.5px; font-family: Consolas, monospace; }

/* 5. Vue 코드 생성 */
.code-body { padding: 12px 14px; background: #232a34; font-family: Consolas, monospace; font-size: 10.5px; line-height: 1.8; }
.code-body p { margin: 0; color: #c6cfd9; white-space: nowrap; }
.code-body .ind { padding-left: 14px; }
.code-body .ind2 { padding-left: 28px; }
.c-tag { color: #7cc7ff; }
.c-attr { color: #a5d6a7; }
.c-str { color: #ffcc80; }
.c-kw { color: #ce93d8; }

/* 6. 지원 컴포넌트 */
.support-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; padding: 14px; }
.support-tile { display: flex; flex-direction: column; align-items: center; gap: 7px; }
.support-tile em { color: #5b6772; font-size: 11px; font-style: normal; font-weight: 800; }
.pic { position: relative; width: 100%; height: 106px; overflow: hidden; border: 1px solid #dfe6ec; border-radius: 8px; background: #fff; }
.layout-pic .top { position: absolute; inset: 6px 6px auto; height: 14px; border-radius: 3px; background: var(--q-primary); opacity: .8; }
.layout-pic .side { position: absolute; inset: 25px auto 6px 6px; width: 22%; border-radius: 3px; background: #dbe7f3; }
.layout-pic .main { position: absolute; inset: 25px 6px 6px calc(22% + 11px); border-radius: 3px; background: #eef3f8; }
.form-pic i { position: absolute; left: 8px; right: 8px; height: 13px; border: 1px solid #c9d4de; border-radius: 3px; background: #fff; }
.form-pic i:nth-child(1) { top: 12px; }
.form-pic i:nth-child(2) { top: 34px; }
.form-pic .btn { top: 60px; left: auto; width: 40%; border: none; background: var(--q-primary); opacity: .8; }
.table-pic { display: grid; grid-template-rows: repeat(4, 1fr); gap: 3px; padding: 7px; }
.table-pic i { border: 1px solid #d5dee6; border-radius: 2px; background: #fff; }
.table-pic .head { background: #e3eefb; border-color: #c8dcf3; }
.dialog-pic .backdrop { position: absolute; inset: 0; background: rgba(48, 61, 73, .35); }
.dialog-pic .modal { position: absolute; top: 50%; left: 50%; width: 64%; height: 52%; transform: translate(-50%, -50%); border-radius: 6px; background: #fff; box-shadow: 0 6px 16px rgba(0, 0, 0, .25); }

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
