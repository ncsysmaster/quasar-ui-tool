<template>
  <q-page class="intro-page">
    <main class="intro-content">
      <div class="page-heading">
        <div class="heading-title">
          <span class="heading-icon"><q-icon name="dashboard" size="30px" /></span>
          <h1>화면 구성</h1>
        </div>
        <nav class="breadcrumb" aria-label="현재 위치">
          <span>UI TOOL 소개</span>
          <q-icon name="double_arrow" size="20px" />
          <strong>화면 구성</strong>
        </nav>
      </div>

      <section class="detail-card">
        <h2>에디터 화면 구성</h2>
        <p class="lead">
          VS Code 안에서 필요한 도구를 빠르게 찾고 화면을 효율적으로 편집할 수 있도록 구성되어 있습니다.
        </p>

        <div class="feature-grid">
          <!-- 1. VS Code Activity Bar -->
          <article class="feature-card">
            <div class="shot">
              <div class="shot-bar dark"><i /><i /><i /><span>Visual Studio Code</span></div>
              <div class="shot-body vscode-body">
                <div class="activity-bar">
                  <span><q-icon name="description" size="16px" /></span>
                  <span><q-icon name="search" size="16px" /></span>
                  <span><q-icon name="account_tree" size="16px" /></span>
                  <span class="active"><q-icon name="widgets" size="16px" /></span>
                  <span><q-icon name="settings" size="16px" /></span>
                </div>
                <div class="side-panel">
                  <b>QUASAR UI TOOL</b>
                  <p class="sel"><q-icon name="folder_open" size="12px" />화면 목록</p>
                  <p class="ind"><q-icon name="data_object" size="12px" />user.screen.json</p>
                  <p class="ind"><q-icon name="data_object" size="12px" />order.screen.json</p>
                  <p><q-icon name="build" size="12px" />코드 생성</p>
                </div>
                <div class="editor-area">
                  <div class="editor-tab"><em>user.screen.json</em></div>
                  <div class="editor-lines"><i /><i class="w70" /><i class="w85" /><i class="w60" /><i class="w75" /></div>
                </div>
              </div>
            </div>
            <h3>VS Code Activity Bar</h3>
            <p>VS Code 왼쪽 Activity Bar에 Quasar UI Tool 아이콘이 추가됩니다. 여기서 화면 목록, 편집 화면, 코드 생성 등 주요 기능에 바로 접근합니다.</p>
          </article>

          <!-- 2. 비주얼 에디터 -->
          <article class="feature-card">
            <div class="shot">
              <div class="shot-bar"><i /><i /><i /><span>Visual Editor — user.screen.json</span></div>
              <div class="shot-body ve-body">
                <div class="ve-toolbar">
                  <span><q-icon name="undo" size="13px" /></span>
                  <span><q-icon name="redo" size="13px" /></span>
                  <span class="gap" />
                  <span><q-icon name="visibility" size="13px" /></span>
                  <span class="run"><q-icon name="play_arrow" size="13px" /></span>
                </div>
                <div class="ve-canvas">
                  <div class="ve-header" />
                  <div class="ve-row"><span /><span /><span class="btn" /></div>
                  <div class="ve-selected">
                    <div class="ve-table"><i class="head" /><i /><i /><i /></div>
                    <em>q-table</em>
                  </div>
                </div>
              </div>
            </div>
            <h3>비주얼 에디터</h3>
            <p>화면 구조와 컴포넌트를 눈으로 확인하며 JSON 페이지를 시각적으로 편집합니다. 컴포넌트를 선택하면 하이라이트되어 현재 편집 대상을 바로 알 수 있습니다.</p>
          </article>

          <!-- 3. 컴포넌트·속성·데이터 패널 -->
          <article class="feature-card">
            <div class="shot">
              <div class="shot-bar"><i /><i /><i /><span>Panels</span></div>
              <div class="shot-body panel-body">
                <div class="panel">
                  <b><q-icon name="widgets" size="12px" />컴포넌트</b>
                  <p><q-icon name="smart_button" size="12px" />Button</p>
                  <p><q-icon name="input" size="12px" />Input</p>
                  <p><q-icon name="table_chart" size="12px" />Table</p>
                </div>
                <div class="panel">
                  <b><q-icon name="tune" size="12px" />속성</b>
                  <div class="prop"><em>label</em><span>목록</span></div>
                  <div class="prop"><em>dense</em><span class="on">true</span></div>
                  <div class="prop"><em>rows</em><span>userList</span></div>
                </div>
                <div class="panel">
                  <b><q-icon name="storage" size="12px" />데이터</b>
                  <p><q-icon name="account_tree" size="12px" />페이지 트리</p>
                  <p><q-icon name="dataset" size="12px" />DataSet</p>
                  <p><q-icon name="hub" size="12px" />Store 연결</p>
                </div>
              </div>
            </div>
            <h3>컴포넌트 · 속성 · 데이터 패널</h3>
            <p>컴포넌트 선택, 속성 설정, 페이지 트리와 데이터 연결을 한 화면의 패널에서 처리합니다. 편집에 필요한 정보가 항상 곁에 표시됩니다.</p>
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
.breadcrumb::after { content: "QUASAR UI TOOL · INTERFACE"; font-size: 16px; }
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

/* 1. VS Code Activity Bar */
.vscode-body { display: flex; }
.activity-bar { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 8px 0; width: 36px; background: #2c3440; }
.activity-bar span { position: relative; display: grid; place-items: center; width: 28px; height: 28px; border-radius: 6px; color: #7d8a96; }
.activity-bar .active { color: #fff; background: rgba(255, 255, 255, .12); }
.activity-bar .active::before { content: ''; position: absolute; left: -4px; top: 4px; bottom: 4px; width: 2px; border-radius: 2px; background: #7cc7ff; }
.side-panel { flex: 1.1; padding: 9px 10px; border-right: 1px solid #e4e9ee; background: #fafbfd; font-size: 10.5px; color: #5b6570; }
.side-panel b { display: block; margin-bottom: 7px; color: #8b98a4; font-size: 9.5px; letter-spacing: .05em; }
.side-panel p { display: flex; align-items: center; gap: 5px; margin: 0 0 6px; white-space: nowrap; }
.side-panel .ind { padding-left: 14px; }
.side-panel .sel { color: var(--q-primary); font-weight: 700; }
.side-panel .q-icon { color: #8b98a4; flex: 0 0 auto; }
.side-panel .sel .q-icon { color: var(--q-primary); }
.editor-area { flex: 1.5; display: flex; flex-direction: column; background: #fff; }
.editor-tab { padding: 6px 10px; border-bottom: 1px solid #e4e9ee; background: #f6f8fb; }
.editor-tab em { color: #64707b; font-size: 10px; font-style: normal; font-weight: 700; }
.editor-lines { display: flex; flex-direction: column; gap: 8px; padding: 12px; }
.editor-lines i { height: 8px; border-radius: 4px; background: #e7edf3; }
.editor-lines .w70 { width: 70%; }
.editor-lines .w85 { width: 85%; }
.editor-lines .w60 { width: 60%; }
.editor-lines .w75 { width: 75%; }

/* 2. 비주얼 에디터 */
.ve-body { display: flex; flex-direction: column; }
.ve-toolbar { display: flex; align-items: center; gap: 5px; padding: 6px 10px; border-bottom: 1px solid #e4e9ee; background: #f6f8fb; }
.ve-toolbar span { display: grid; place-items: center; width: 22px; height: 22px; border: 1px solid #dbe2e9; border-radius: 5px; background: #fff; color: #66727e; }
.ve-toolbar .gap { flex: 1; border: none; background: none; }
.ve-toolbar .run { border: none; color: #fff; background: var(--q-primary); }
.ve-canvas { display: flex; flex-direction: column; gap: 9px; flex: 1; padding: 12px; background: repeating-linear-gradient(0deg, #fff, #fff 11px, #f4f7fa 11px, #f4f7fa 12px); }
.ve-header { height: 15px; border-radius: 4px; background: var(--q-primary); opacity: .82; }
.ve-row { display: flex; gap: 6px; }
.ve-row span { height: 14px; flex: 1; border: 1px solid #c9d4de; border-radius: 4px; background: #fff; }
.ve-row .btn { flex: 0 0 34px; border: none; background: var(--q-primary); opacity: .75; }
.ve-selected { position: relative; flex: 1; padding: 6px; border: 2px dashed var(--q-primary); border-radius: 6px; background: rgba(25, 118, 210, .04); }
.ve-selected em { position: absolute; top: -9px; left: 8px; padding: 1px 7px; border-radius: 7px; color: #fff; background: var(--q-primary); font-size: 9px; font-style: normal; font-weight: 700; }
.ve-table { display: grid; grid-template-rows: repeat(4, 1fr); gap: 3px; height: 100%; }
.ve-table i { border: 1px solid #d5dee6; border-radius: 3px; background: #fff; }
.ve-table .head { background: #e3eefb; border-color: #c8dcf3; }

/* 3. 컴포넌트·속성·데이터 패널 */
.panel-body { display: grid; grid-template-columns: repeat(3, 1fr); }
.panel { display: flex; flex-direction: column; gap: 6px; padding: 10px 9px; border-right: 1px solid #e4e9ee; background: #fafbfd; font-size: 10.5px; color: #5b6570; }
.panel:last-child { border-right: none; }
.panel b { display: flex; align-items: center; gap: 4px; margin-bottom: 3px; color: #8b98a4; font-size: 9.5px; letter-spacing: .04em; }
.panel p { display: flex; align-items: center; gap: 5px; margin: 0; padding: 4px 6px; border: 1px solid #e2e8ee; border-radius: 5px; background: #fff; white-space: nowrap; }
.panel .q-icon { color: #8b98a4; flex: 0 0 auto; }
.prop { display: flex; align-items: center; justify-content: space-between; gap: 4px; padding: 4px 6px; border: 1px solid #e2e8ee; border-radius: 5px; background: #fff; font-size: 10px; }
.prop em { color: #64707b; font-style: normal; font-weight: 700; }
.prop span { color: #3c4955; font-family: Consolas, monospace; }
.prop .on { padding: 0 6px; border-radius: 7px; color: #1d7a46; background: #dcf3e5; font-weight: 700; }

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
