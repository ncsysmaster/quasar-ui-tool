# VS Code 디버깅 가이드

## 1. 문서 목적

이 문서는 VS Code 디버깅을 처음 사용하는 개발자가 Quasar Tool을 직접 실행하고, 오류가 발생한 위치를 찾고, 변수 값을 확인할 수 있도록 설명한다.

Quasar Tool에는 서로 다른 세 가지 실행 영역이 있다.

| 실행 영역 | 주요 코드 | 확인 도구 |
|---|---|---|
| VS Code Extension Host | `extension.js`, `providers.js`, `state.js` | 첫 번째 VS Code의 실행 및 디버그 창 |
| VS Code Webview | `webviews.js`, `paletteView.js`, 각 View 파일 | Webview Developer Tools |
| Quasar 웹 애플리케이션 | `src/pages/*.vue` | 브라우저 개발자 도구 |

오류가 발생한 영역에 맞는 도구를 사용해야 한다. 예를 들어 Screen 내부의 JavaScript 오류는 일반 Extension 디버그 콘솔이 아니라 Webview Developer Tools에서 확인한다.

## 2. 디버깅 전 준비

### 2.1 프로젝트 열기

VS Code에서 다음 프로젝트 루트 폴더를 연다.

```text
D:\01 PROJECTSRC\codex\quasar_tool
```

`vscode-extension` 폴더만 따로 열지 말고 `quasar_tool` 폴더를 열어야 `.vscode/launch.json`과 프로젝트 전체 파일을 사용할 수 있다.

### 2.2 패키지 설치

VS Code에서 <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>`</kbd>를 눌러 터미널을 열고 다음 명령을 실행한다.

```powershell
npm install
```

Extension 전용 패키지가 설치되지 않았다면 다음 명령도 실행한다.

```powershell
cd vscode-extension
npm install
cd ..
```

### 2.3 기본 검증

디버깅 전에 화면 JSON 문법과 웹 애플리케이션 빌드를 확인한다.

```powershell
npm run validate:screens
npm run build
```

명령 마지막에 오류가 표시되지 않아야 한다. 오류가 있다면 디버깅 전에 해당 파일명과 줄 번호부터 확인한다.

## 3. Extension 디버깅 시작

프로젝트의 `.vscode/launch.json`에는 `Run Quasar UI Tool Extension` 실행 구성이 등록되어 있다.

1. 첫 번째 VS Code 왼쪽에서 `실행 및 디버그` 아이콘을 클릭한다.
2. 상단 실행 목록에서 `Run Quasar UI Tool Extension`을 선택한다.
3. `F5`를 누른다.
4. `Extension Development Host`라는 새 VS Code 창이 열리는지 확인한다.
5. 새 창에서 `파일 > 폴더 열기`로 `quasar_tool` 프로젝트를 연다.
6. `.src/pages/IndexPage.json`을 연다.
7. 일반 JSON 편집기로 열리면 파일을 우클릭하고 `Open With... > Quasar UI Tool Editor`를 선택한다.
8. Activity Bar의 `Quasar Tool` 아이콘을 열어 Palette, Properties, Events, Page Tree가 표시되는지 확인한다.

두 VS Code 창의 역할은 다음과 같다.

- 첫 번째 VS Code: 소스 수정, 중단점 설정, 변수 및 호출 스택 확인
- Extension Development Host: 사용자가 실제 Extension을 사용하는 상황을 재현

## 4. 중단점 사용 방법

중단점은 프로그램을 지정한 줄에서 일시 정지시키는 기능이다.

1. 디버깅할 JavaScript 파일을 연다.
2. 멈추고 싶은 줄 번호의 왼쪽 여백을 클릭한다.
3. 빨간 원이 표시되는지 확인한다.
4. Extension Development Host에서 해당 기능을 실행한다.
5. 첫 번째 VS Code가 중단점에서 멈추는지 확인한다.

### 4.1 주요 단축키

| 단축키 | 기능 |
|---|---|
| `F5` | 다음 중단점까지 계속 실행 |
| `F10` | 현재 함수 내부로 들어가지 않고 다음 줄 실행 |
| `F11` | 현재 줄에서 호출하는 함수 내부로 이동 |
| `Shift+F11` | 현재 함수 실행을 마치고 호출 위치로 이동 |
| `Shift+F5` | 디버깅 종료 |
| `Ctrl+Shift+F5` | 디버깅 다시 시작 |

### 4.2 디버그 패널 읽기

- 변수(Variables): 현재 함수의 변수와 전달받은 인자를 표시한다.
- 조사식(Watch): 계속 확인하고 싶은 식을 직접 등록한다. 예: `message.type`, `this.selectedId`.
- 호출 스택(Call Stack): 어떤 함수들이 순서대로 호출되었는지 표시한다.
- 중단점(Breakpoints): 등록된 모든 중단점을 켜거나 끈다.
- 디버그 콘솔(Debug Console): 현재 멈춘 위치에서 변수나 표현식을 직접 실행한다.

## 5. 컴포넌트 추가 기능 디버깅 예제

Palette에서 컴포넌트를 Screen으로 드래그하는 과정을 예로 든다.

### 5.1 Extension 영역 중단점

다음 순서로 중단점을 설정한다.

1. `vscode-extension/src/providers.js`의 `dropPaletteComponent` 메시지 처리 부분
2. `vscode-extension/src/state.js`의 `addComponent` 함수 시작 부분
3. `state.js`에서 `parent.children.push(component)`을 실행하는 부분

Extension Development Host에서 Button을 Screen으로 드래그하면 다음 흐름으로 실행된다.

```text
Palette dragstart
  -> Screen drop
  -> webview가 dropPaletteComponent 메시지 전송
  -> providers.js가 메시지 수신
  -> state.js의 addComponent 실행
  -> 화면 JSON 수정
  -> Vue 파일 자동 생성 예약
```

중단점에서 다음 값을 확인한다.

```text
message.type
message.index
message.targetId
message.mode
paletteIndex
component.id
this.selectedId
```

`message.targetId`가 비어 있으면 Screen 루트에 추가된다. 대상 컴포넌트 ID가 있으면 `message.mode`에 따라 내부 또는 다음 형제 위치에 추가된다.

## 6. Webview 디버깅

Screen, Script, Palette, Properties, Events, Page Tree는 Webview 기술을 사용한다. HTML 문자열 안에서 실행되는 JavaScript는 Extension Host 중단점으로 직접 확인할 수 없다.

### 6.1 Webview Developer Tools 열기

1. Extension Development Host에서 Quasar UI Tool Editor를 연다.
2. `Ctrl+Shift+P`를 누른다.
3. `Developer: Open Webview Developer Tools`를 검색해 실행한다.
4. 개발자 도구의 `Console` 탭을 연다.
5. Screen 또는 Palette를 조작해 로그와 오류를 확인한다.

### 6.2 Console 확인

빨간색 로그는 JavaScript 오류다. 오류 오른쪽의 파일명과 줄 번호를 클릭하면 발생 위치로 이동할 수 있다.

```text
ReferenceError: variableName is not defined
TypeError: Cannot read properties of undefined
```

확인할 내용은 다음과 같다.

- 오류가 발생한 첫 번째 줄
- 오류 직전에 출력된 `console.log` 값
- `targetId`, `selectedId`, `model`이 예상대로 들어왔는지
- Vue 또는 Quasar 런타임이 정상적으로 로드되었는지

### 6.3 Sources에서 중단점 설정

1. Webview Developer Tools의 `Sources` 탭을 연다.
2. Webview에서 생성된 JavaScript 소스를 찾는다.
3. `dragstart`, `dragover`, `drop`, `click` 같은 이벤트 처리 함수에 중단점을 설정한다.
4. Screen에서 해당 동작을 다시 수행한다.

`webviews.js` 안의 `<script>` 문자열은 Webview에서 실행되므로 첫 번째 VS Code가 아니라 Webview Developer Tools에서 디버깅한다.

## 7. Quasar 브라우저 화면 디버깅

생성된 Vue 화면을 실제 브라우저에서 확인하려면 프로젝트 루트 터미널에서 실행한다.

```powershell
npm run dev
```

브라우저에서 다음 주소를 연다.

```text
http://localhost:9000
```

브라우저에서 `F12`를 눌러 개발자 도구를 연다.

| 탭 | 용도 |
|---|---|
| Console | Vue 실행 오류와 `console.log` 확인 |
| Elements | 실제 HTML 구조, class, style 확인 |
| Sources | JavaScript 중단점 설정 |
| Network | API, JavaScript, CSS 파일 요청 확인 |
| Application | Local Storage와 Session Storage 확인 |

Screen과 브라우저의 모양이 다르면 `Elements` 탭에서 같은 컴포넌트의 class, style, 계산된 크기를 비교한다.

## 8. JSON-Vue 자동 생성 디버깅

JSON을 저장할 때 Vue 파일이 자동으로 생성되는지 확인하려면 다음 명령을 실행한다.

```powershell
npm run watch:vue
```

또는 VS Code 명령 팔레트에서 다음 명령을 실행한다.

```text
Quasar Tool: Start Vue Watch
```

확인 순서는 다음과 같다.

1. `.src/pages/IndexPage.json`을 수정한다.
2. `Ctrl+S`로 저장한다.
3. watch 터미널에 변경 감지 로그가 출력되는지 확인한다.
4. `src/pages/IndexPage.vue`의 수정 시간이 변경되는지 확인한다.
5. Vue 파일에 JSON 변경 내용이 반영되었는지 확인한다.

자동 생성이 실패하면 다음 명령을 직접 실행해 전체 오류를 확인한다.

```powershell
npm run generate:vue
```

## 9. 코드 수정 후 재실행

### Extension 코드 수정

`extension.js`, `providers.js`, `state.js` 등을 수정했다면 다음 순서가 가장 확실하다.

1. 첫 번째 VS Code에서 `Shift+F5`로 디버깅을 종료한다.
2. 다시 `F5`를 누른다.
3. 새 Extension Development Host에서 기능을 재현한다.

### Webview 코드 수정

Webview HTML이나 CSS를 수정했다면 Extension Development Host에서 `Ctrl+R` 또는 `Developer: Reload Window`를 실행한다. 반영되지 않으면 Extension 디버깅을 완전히 종료하고 다시 시작한다.

## 10. 자주 발생하는 문제

### 중단점이 회색이고 멈추지 않는다

- Extension이 아직 활성화되지 않았을 수 있다.
- Extension Development Host에서 `.src/pages/*.json`을 Quasar UI Tool Editor로 연다.
- 첫 번째 VS Code에서 올바른 `Run Quasar UI Tool Extension` 구성을 실행했는지 확인한다.

### 첫 번째 VS Code와 새 VS Code 중 어디를 봐야 하는지 모르겠다

- Extension Node.js 코드 오류: 첫 번째 VS Code의 디버그 콘솔
- Screen과 Palette JavaScript 오류: Extension Development Host의 Webview Developer Tools
- 실제 Vue 페이지 오류: 웹브라우저 개발자 도구

### 수정한 코드가 반영되지 않는다

- Extension Development Host에서 `Developer: Reload Window`를 실행한다.
- 그래도 반영되지 않으면 `Shift+F5` 후 다시 `F5`를 누른다.
- 현재 열려 있는 Extension Development Host가 가장 최근에 실행한 창인지 확인한다.

### Vue 파일이 생성되지 않는다

- `npm run watch:vue`가 실행 중인지 확인한다.
- JSON 문법 오류가 없는지 `npm run validate:screens`로 확인한다.
- JSON의 `targetVuePath`가 올바른지 확인한다.
- `.src/pages`가 아닌 다른 위치의 JSON을 수정한 것은 아닌지 확인한다.

### 화면이 흰색으로 표시된다

1. Webview Developer Tools Console의 첫 번째 오류를 확인한다.
2. Vue와 Quasar 런타임 로드 오류인지 확인한다.
3. JSON 문법을 검증한다.
4. Extension Development Host를 다시 로드한다.

## 11. 디버깅 체크리스트

- [ ] 프로젝트 루트 폴더를 열었다.
- [ ] `npm install`을 완료했다.
- [ ] `npm run validate:screens`가 성공했다.
- [ ] `Run Quasar UI Tool Extension`으로 실행했다.
- [ ] Extension Development Host에서 JSON을 Custom Editor로 열었다.
- [ ] 오류 영역에 맞는 콘솔을 열었다.
- [ ] 오류가 발생하기 전 단계에 중단점을 설정했다.
- [ ] 변수와 호출 스택을 확인했다.
- [ ] 수정 후 Extension 또는 Webview를 다시 로드했다.
- [ ] 마지막으로 `npm run build`를 실행했다.
