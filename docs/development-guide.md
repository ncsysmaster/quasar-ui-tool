# Quasar Tool 개발 가이드

## 1. 요구 환경

- Node.js와 npm
- VS Code 1.90 이상
- Windows PowerShell 기준 프로젝트 경로
- 프로젝트 루트에서 설치된 Quasar, Vue, Monaco 의존성

## 2. 설치와 실행

```powershell
npm install
npm run dev
```

개발 서버 기본 주소는 `http://localhost:9000`이며 LAN에서는 실행 PC의 IP와 포트 `9000`을 사용한다.

VS Code Extension 개발 실행:

1. 프로젝트 루트를 VS Code로 연다.
2. Run and Debug에서 `Run Quasar UI Tool Extension`을 실행한다.
3. 새 Extension Development Host에서 `.src/pages/IndexPage.json`을 연다.
4. `Open With...`에서 `Quasar UI Tool Editor`를 선택한다.

설치형 확장으로 패키징한 뒤에는 첫 VS Code에서도 동일한 Open With 방식을 사용할 수 있다.

## 3. 소스 쌍과 생성 결과

```text
.src/pages/IndexPage.json  화면/데이터/DataSet 정의
.src/pages/IndexPage.js    script setup 본문
src/pages/IndexPage.vue    생성 결과
```

JS 파일이 없으면 JSON→Vue 생성 또는 Custom Editor 초기화 시 자동 생성된다. JSON 안의 구형 `script.setup`은 대응 JS로 이동하고 `script.src`로 정규화한다.

## 4. 주요 명령

| 명령 | 용도 |
|---|---|
| `npm run dev` | Quasar 개발 서버 실행 |
| `npm run build` | 배포 빌드 |
| `npm run validate:screens` | `.src/pages/*.json` 구조 검증 |
| `npm run generate:vue` | JSON/JS에서 Vue 생성 |
| `npm run generate:vue -- .src/pages/IndexPage.json` | 지정 화면만 Vue 생성 |
| `npm run generate:json` | Vue에서 JSON/JS 역변환 |
| `npm run watch:vue` | JSON 또는 JS 저장 감지 후 해당 화면만 생성 |

## 5. 기능 추가 절차

### Palette 컴포넌트 추가

1. `vscode-extension/src/constants.js`의 `PALETTE`에 항목을 추가한다.
2. 복합 템플릿이면 `state.js`에 생성 함수를 추가하고 `addComponent()`에서 분기한다.
3. `webviews.js` 런타임 렌더러가 type, props, models, dynamicProps, events를 처리하는지 확인한다.
4. `generate-vue.mjs`의 tag 및 attribute 생성 결과를 확인한다.
5. Screen, 생성 Vue, 브라우저 화면을 비교한다.

### Properties 필드 추가

1. `propertiesView.js`에서 컴포넌트 유형별 필드를 표시한다.
2. 값의 저장 경로를 `props.*`, `dynamicProps.*`, `models.*`, `class`, `style` 중에서 결정한다.
3. `state.updateSelectedProperty()`의 경로 처리와 값 변환을 확인한다.
4. 생성 Vue 속성 문법을 검증한다.

### Event 추가

1. `eventsView.js`의 유형별 이벤트 목록에 Vue 이벤트명을 추가한다.
2. `...` 버튼으로 생성되는 메서드명이 유효한지 확인한다.
3. 외부 JS 저장, Monaco 이동, 생성 Vue의 `@event` 바인딩을 확인한다.

### JSON 모델 변경

1. `schemas/screen.schema.json`을 먼저 갱신한다.
2. `model.js`에 기본값과 구버전 마이그레이션을 추가한다.
3. `state.js`, `webviews.js`, 정방향/역방향 생성기를 함께 수정한다.
4. 기존 `.src/pages` 전체를 검증하고 재생성 diff를 점검한다.

## 6. Webview 개발 규칙

- CSP nonce를 유지하고 외부 네트워크 스크립트에 의존하지 않는다.
- 로컬 파일은 `localResourceRoots`와 `asWebviewUri()`를 사용한다.
- 모델 변경은 Webview에서 직접 파일을 쓰지 않고 Provider 메시지를 거쳐 State에서 처리한다.
- 편집 UI는 실제 Quasar DOM에 영향을 주지 않는 overlay 또는 `designer` 메타데이터로 분리한다.
- Script 편집 중 상태 갱신이 Screen 탭으로 전환하지 않도록 활성 탭을 State에서 유지한다.
- 키보드 단축키는 input, textarea, Monaco 편집 영역과 충돌하지 않게 대상 요소를 검사한다.

## 7. Screen과 브라우저 일치 기준

1. 동일한 Vue 및 Quasar 버전을 로드한다.
2. Quasar CSS와 Material Icons를 Webview에 포함한다.
3. JSON의 `class`와 `style`을 생성 Vue와 같은 방식으로 적용한다.
4. VNode children, model binding, dynamic props, event binding 순서를 일치시킨다.
5. 선택선, Grid 배지, resize handle을 제외하고 추가 레이아웃 CSS를 최소화한다.

## 8. 검증 체크리스트

```powershell
node --check vscode-extension/src/state.js
node --check vscode-extension/src/webviews.js
npm run validate:screens
npm run generate:vue
npm run build
```

수동 검증:

- Palette 클릭과 드래그 추가
- Screen/Page Tree 양방향 선택 동기화
- Properties 및 class/style 저장
- Events 메서드 생성과 Script 이동
- Ctrl+C/X/V, Delete/Backspace, Undo
- Form Grid 행/열 메뉴, resize, 셀 줄/칸 나누기
- JSON/JS 저장 후 해당 Vue만 갱신
- 생성 Vue와 브라우저 렌더링 비교

## 9. 디버깅

- Extension Host: Run and Debug 콘솔의 Provider 메시지 확인
- Webview: `Developer: Open Webview Developer Tools`
- Vue 생성 실패: VS Code 상태 표시줄과 터미널에서 지정 파일 생성 명령 확인
- 런타임 로드 실패: `node_modules`에 Vue, Quasar, extras, Monaco가 있는지 확인
- 흰 화면: Webview/브라우저 콘솔의 첫 JavaScript 오류부터 해결

