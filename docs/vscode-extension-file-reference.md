# VS Code Extension 파일 기능 명세

## 루트 파일

| 파일 | 기능 |
|---|---|
| `vscode-extension/package.json` | 확장 메타데이터, 활성화 이벤트, 명령, Activity Bar 컨테이너, Webview View, Custom Editor 연결을 선언한다. |
| `vscode-extension/README.md` | Extension Development Host 실행, Open With, 편집 영역과 런타임 렌더링 원칙을 설명한다. |
| `vscode-extension/media/quasar-tool.svg` | Activity Bar에 표시되는 Quasar Tool 아이콘이다. |

## `src` 파일

### `extension.js`

확장 진입점이다. `PageEditorState`를 한 번 생성해 모든 Provider에 공유하고 다음 기능을 등록한다.

- `quasarTool.pageEditor` Custom Editor
- Component Palette, Properties, Events, Page Tree, DataSet View
- `.src/pages/*.js` 생성/변경/삭제 감시
- JSON/JS 문서 저장 시 Vue 생성 예약
- `Quasar Tool: Open Page Editor` 명령

### `constants.js`

View ID와 Palette 정의를 관리한다. 현재 Palette는 Form Search, Button, Input, Card, Card Section, Table, Text, Row, Column을 제공한다. 신규 컴포넌트의 기본 `props`, `class`, `tag`, `text`는 이 파일에 추가한다.

### `providers.js`

VS Code Webview Provider 모음이다.

| 클래스 | 역할 |
|---|---|
| `PageEditorProvider` | JSON Custom Editor 생성, Screen/Script 메시지 처리, 상태 전달 |
| `PaletteViewProvider` | Palette 클릭 메시지를 컴포넌트 추가로 연결 |
| `PropertiesViewProvider` | 속성 변경, class 선택 팝업, 삭제 처리 |
| `EventsViewProvider` | 이벤트 저장, 메서드 생성 또는 Script 위치 이동 |
| `PageTreeViewProvider` | 선택, 삭제, 이동, 복사/잘라내기/붙여넣기, Form 메뉴 처리 |
| `DatasetViewProvider` | DataSet 필드 추가, 변경, 삭제 처리 |

`postViewState()`는 현재 모델, 선택 ID, 문서 존재 여부를 각 Activity Bar View에 전달한다. Store 파일 검색과 페이지별 필터링은 `piniaStoreRepository.js`에 위임한다.

### `state.js`

도구의 핵심 애플리케이션 상태와 명령을 구현한다.

| 기능군 | 주요 메서드 |
|---|---|
| 문서 및 동기화 | `setDocument`, `onTextDocumentChanged`, `onScriptFileChanged`, `updateModel` |
| Script | `ensureExternalScript`, `updateScript`, `requestScriptMethod` |
| 컴포넌트 CRUD | `addComponent`, `updateSelectedProperty`, `removeSelectedComponent` |
| 클립보드 | `copySelectedComponent`, `cutSelectedComponent`, `pasteComponent` |
| 계층 및 DnD | `moveComponent`, `moveComponentInTree`, `moveComponentInside` |
| Form Grid | `updateFormLayout`, `resizeFormLayout`, `splitFormCell` |
| DataSet | `addDatasetField`, `updateDatasetField`, `removeDatasetField` |
| Events | `updateSelectedEvent`, `openSelectedEventMethod`, `openFirstComponentMethod` |
| 자동 생성 | `scheduleGenerateVue` |

Form Search 생성 템플릿과 대응 데이터/스크립트 초기화도 이 파일에 있다.

### `model.js`

JSON 모델의 파싱, 정규화, 직렬화를 담당한다.

- 깨진 JSON은 빈 모델로 대체한다.
- 누락된 `schemaVersion`, `tool`, `page`, `data`, `script`, `datasets`를 보완한다.
- 구형 `props.style`을 최상위 `style`로 마이그레이션한다.
- 컴포넌트 검색, 삭제, 루트 페이지와 기본 DataSet 생성을 제공한다.
- Properties 입력 문자열을 boolean/number/string으로 변환한다.

### `generatorBridge.js`

Extension Host와 Node 생성기를 연결한다.

- JSON/JS가 `.src/pages` 원본인지 판별한다.
- 같은 이름의 JSON과 JS 경로를 계산한다.
- 현재 문서에서 실제 프로젝트 루트를 찾아 Extension에 포함된 `vscode-extension/generator/generate-vue.mjs`를 실행한다.
- 성공/실패를 VS Code 상태 표시줄에 알린다.

### `piniaStoreCommand.js`

Pinia Store 생성 명령, Store JSON/JS 동시 저장, 페이지 JSON의 Store 바인딩 및 Vue 재생성을 담당한다. 화면 표현 로직은 포함하지 않는다.

### `piniaStoreRepository.js`

`.src/store/**/*.json`을 재귀 검색하고 현재 페이지에 연결된 Store만 읽어 Webview용 모델로 반환한다. Store 목록의 경로·소유 페이지·파싱 오류 처리를 한곳에서 관리한다.

### `webviewResources.js`

Webview에서 사용할 로컬 리소스 경로를 해결한다. Workspace, Extension, 상위 폴더의 `node_modules` 후보를 검사해 Vue, Quasar, Material Icons, Monaco와 worker 파일을 찾고 `asWebviewUri()`로 변환한다.

### `webviews.js`

Custom Editor의 HTML, CSS, 클라이언트 JavaScript를 생성한다.

- Screen, Script, Store 탭과 Screen 도구 모음
- JSON을 Vue/Quasar VNode으로 변환하는 런타임 렌더러
- 선택, 더블클릭, 직접 Text 편집, DnD, 키보드 삭제 및 클립보드
- `gridView.js`, `storeView.js`를 조립하고 Extension Host 메시지를 연결
- Monaco JavaScript 편집기, Quasar 전역 타입 보완, 오류 표시와 자동 완성
- class 선택 팝업과 공통 HTML shell 스타일
- DataSet 편집 Webview

### `storeView.js`

Store 탭 전용 HTML, Webview 동작, CSS를 관리한다. 페이지 JSON의 `imports` 순서대로 Store 탭을 구성하고 `variableName`을 탭 이름으로 사용한다. 신규 Store의 `Import 명`은 Store JSON의 `store.importName`, 페이지 JSON의 `imports[].variableName`, Vue의 `const <Import명>`에 동일하게 적용된다. State 트리/표, Getter와 Action 편집, 신규 Store 팝업을 수정할 때 이 파일을 우선 확인한다.

### `gridView.js`

Form Search Grid의 컨텍스트 메뉴, 행/열 크기 조절, 셀 나누기·병합, `col-N` 배지와 관련 스타일을 관리한다.

### `paletteView.js`

`constants.js`의 Palette를 버튼 Grid로 렌더링한다. 클릭은 현재 선택 위치에 컴포넌트를 추가하고, 드래그는 `application/quasar-palette-index` 데이터를 Screen으로 전달한다.

### `propertiesView.js`

선택 컴포넌트에 맞는 속성 필드를 렌더링한다. `class`, `style`, label, color, dense, outlined 등 공통/유형별 속성을 편집하고 Quasar utility class를 그룹별로 선택하는 중앙 팝업을 제공한다.

### `eventsView.js`

컴포넌트 유형별 대표 이벤트 목록을 표시한다. 이벤트 입력 옆 `...` 버튼은 `on<Event>_<ComponentId>` 이름의 메서드를 외부 JS에 생성하거나 기존 메서드 위치로 이동한다.

### `pageTreeView.js`

화면 컴포넌트 계층을 Tree로 표시한다.

- 부모/자식 연결선과 펼침/접힘
- Screen 선택에 따른 조상 자동 펼침 및 중앙 스크롤
- Drag & Drop 계층 이동
- Delete/Backspace와 Ctrl+C/X/V
- Form Grid 행/열 컨텍스트 메뉴

## 변경 시 영향도

| 변경 목적 | 우선 확인 파일 |
|---|---|
| Palette 항목 추가 | `constants.js`, `state.js`, `webviews.js` |
| 속성 필드 추가 | `propertiesView.js`, `state.js`, `generate-vue.mjs` |
| 이벤트 종류 추가 | `eventsView.js`, `state.js` |
| 화면 렌더링 변경 | `webviews.js`, `webviewResources.js` |
| Store 편집 화면 변경 | `storeView.js` |
| Store 검색/페이지 연결 변경 | `piniaStoreRepository.js`, `providers.js` |
| Store 생성·저장 변경 | `piniaStoreCommand.js`, `pinia-store.mjs` |
| Form Grid 편집 변경 | `gridView.js`, `state.js` |
| JSON 구조 변경 | `model.js`, `state.js`, `schemas/screen.schema.json`, 생성기 3종 |
| 새 Activity Bar View | `package.json`, `extension.js`, `providers.js`, 신규 View 파일 |
