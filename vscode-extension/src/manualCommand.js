const vscode = require("vscode");

const OPEN_MANUAL_COMMAND = "quasarTool.openManual";
let manualPanel = null;

function registerManualCommand(context) {
  context.subscriptions.push(
    vscode.commands.registerCommand(OPEN_MANUAL_COMMAND, () =>
      openManualPanel(context),
    ),
  );
}

function openManualPanel(context) {
  if (manualPanel) {
    manualPanel.reveal(vscode.ViewColumn.Active);
    return;
  }

  manualPanel = vscode.window.createWebviewPanel(
    "quasarToolManual",
    "Quasar UI Tool Manual",
    vscode.ViewColumn.Active,
    {
      enableScripts: false,
      retainContextWhenHidden: true,
    },
  );
  manualPanel.webview.html = getManualHtml();
  manualPanel.onDidDispose(
    () => {
      manualPanel = null;
    },
    null,
    context.subscriptions,
  );
}

function getManualHtml() {
  return `<!DOCTYPE html>
<html lang="ko">
  <head>
    <meta charset="UTF-8">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline';">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Quasar UI Tool Manual</title>
    <style>
      :root {
        color-scheme: light dark;
      }

      body {
        margin: 0;
        padding: 28px 32px 40px;
        color: var(--vscode-foreground);
        background: var(--vscode-editor-background);
        font-family: var(--vscode-font-family);
        font-size: var(--vscode-font-size);
        line-height: 1.6;
      }

      main {
        max-width: 960px;
      }

      h1 {
        margin: 0 0 4px;
        font-size: 28px;
        line-height: 1.25;
      }

      h2 {
        margin: 30px 0 10px;
        padding-left: 10px;
        border-left: 4px solid var(--vscode-focusBorder);
        font-size: 18px;
      }

      p {
        margin: 8px 0;
      }

      ul,
      ol {
        margin: 8px 0 0 22px;
        padding: 0;
      }

      li {
        margin: 4px 0;
      }

      code {
        padding: 1px 5px;
        border-radius: 4px;
        color: var(--vscode-textPreformat-foreground);
        background: var(--vscode-textCodeBlock-background);
      }

      .lead {
        color: var(--vscode-descriptionForeground);
        font-size: 15px;
      }

      .grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 12px;
        margin-top: 14px;
      }

      .card {
        border: 1px solid var(--vscode-panel-border);
        border-radius: 8px;
        padding: 14px 16px;
        background: var(--vscode-editorWidget-background);
      }

      .card strong {
        display: block;
        margin-bottom: 4px;
      }

      .steps {
        border: 1px solid var(--vscode-panel-border);
        border-radius: 8px;
        padding: 12px 18px;
        background: var(--vscode-sideBar-background);
      }
    </style>
  </head>
  <body>
    <main>
      <h1>Quasar UI Tool 간단 기능 소개</h1>
      <p class="lead">
        VS Code 안에서 화면 JSON을 시각적으로 편집하고 Quasar/Vue 화면과 Pinia Store 파일을 생성하는 UI 개발 도구입니다.
      </p>

      <h2>빠른 시작</h2>
      <ol class="steps">
        <li><code>Ctrl + Shift + P</code>를 누르고 <code>Quasar Tool: New Quasar Project</code>를 실행합니다.</li>
        <li>생성 위치, 프로젝트명, package name, 앱 제목, dev port를 입력합니다.</li>
        <li>생성된 프로젝트 폴더에서 <code>npm install</code> 후 <code>npm run dev</code>를 실행합니다.</li>
        <li><code>.src/pages/*.json</code> 파일을 <code>Open With... > Quasar UI Tool Editor</code>로 엽니다.</li>
      </ol>

      <h2>편집기 탭</h2>
      <div class="grid">
        <section class="card">
          <strong>Screen</strong>
          화면을 실제 렌더링에 가깝게 보면서 컴포넌트 배치, 선택, 복사, 삭제, Form/Grid/Table 편집을 수행합니다.
        </section>
        <section class="card">
          <strong>Script</strong>
          JavaScript 편집 영역입니다. 이벤트 메소드 이동, 자동완성, 포맷, Store State 드래그 입력을 지원합니다.
        </section>
        <section class="card">
          <strong>Store</strong>
          Pinia Store JSON을 생성, import, 편집하고 <code>src/store</code> 결과 JS 파일로 변환합니다.
        </section>
      </div>

      <h2>사이드 패널</h2>
      <ul>
        <li><strong>Component Palette</strong>: Page, Text, Row, Column, Button, Input, Form Search, Table 등을 Screen에 추가합니다.</li>
        <li><strong>Page Tree</strong>: 화면 컴포넌트 구조를 트리로 보고 선택, 복사, 삭제, Grid 메뉴 작업을 수행합니다.</li>
        <li><strong>Properties</strong>: 선택 컴포넌트의 id, class, style, width, height, binding, Table 옵션 등을 수정합니다.</li>
        <li><strong>Events</strong>: 이벤트 핸들러를 연결하고 <code>event_id</code> 방식 메소드를 자동 생성합니다.</li>
      </ul>

      <h2>AG Grid Table</h2>
      <ul>
        <li>Table Wizard로 테이블명, row-key, 선택 방식, toolbar, pagination 기본값을 설정합니다.</li>
        <li>Columns / Header / Body 탭에서 컬럼, 멀티헤더, body row layout을 별도로 관리합니다.</li>
        <li>셀 merge, row/column layout, RCUD mode, Excel 복사/붙여넣기, 키보드 이동을 지원합니다.</li>
        <li>Table API는 <code>Table001.addRow()</code>, <code>Table001.delSelectedRow()</code>, <code>Table001.getSelectedIndex()</code>처럼 사용합니다.</li>
      </ul>

      <h2>저장과 생성</h2>
      <ul>
        <li><code>Ctrl + S</code>: 현재 탭의 변경사항을 저장합니다.</li>
        <li><code>npm run generate:vue</code>: <code>.src/pages/*.json</code>을 <code>src/pages/*.vue</code>로 생성합니다.</li>
        <li><code>npm run watch:vue</code>: JSON 또는 JS 저장 시 해당 파일만 자동 변환합니다.</li>
        <li><code>npm run generate:pinia</code>: <code>.src/store/**/*.json</code>을 <code>src/store/**/*.js</code>로 생성합니다.</li>
      </ul>

      <h2>자주 쓰는 실행 위치</h2>
      <ul>
        <li><code>Command Palette</code>: <code>Quasar Tool: New Quasar Project</code>, <code>Quasar Tool: Quasar UI Tool Manual</code></li>
        <li><code>Explorer 우클릭</code>: 새 Quasar 프로젝트 생성, 매뉴얼 열기</li>
        <li><code>편집기 상단 아이콘</code>: 새 프로젝트 생성, 매뉴얼 열기, Vue Watch 실행</li>
      </ul>
    </main>
  </body>
</html>`;
}

module.exports = {
  OPEN_MANUAL_COMMAND,
  registerManualCommand,
};
