# Quasar Tool 구현 산출물

## 구현 범위

- Quasar/Vue SPA 개발 환경
- JSON→Vue 생성기와 Vue→JSON 역변환기
- JSON/JS 저장 감시 및 화면 단위 자동 생성
- VS Code Custom Editor의 Screen, Script, DataSet 탭
- Component Palette, Properties, Events, Page Tree, DataSet View
- Vue/Quasar 런타임 기반 Screen 렌더링
- 컴포넌트 선택, 이동, 직접 Text 편집, 삭제, 클립보드
- Monaco 기반 JavaScript 편집
- 이벤트 메서드 생성 및 탐색
- Form Search 템플릿과 Grid 행/열 편집, resize, 셀 분할
- Grid `col-N` 및 행 합계 표시 토글

## 파일 산출물

| 구분 | 위치 |
|---|---|
| 화면 원본 | `.src/pages/*.json`, `.src/pages/*.js` |
| Vue 결과 | `src/pages/*.vue` |
| 생성기 | `vscode-extension/generator/*.mjs` |
| 스키마 | `schemas/screen.schema.json` |
| VS Code 확장 | `vscode-extension/` |
| 기준 가이드 | `docs/development-standards.md`, `requirements-guide.md`, `feature-definition-guide.md` |
| 설계 및 매뉴얼 | `docs/architecture-design.md`, `development-guide.md`, `user-manual.md` |
| 확장 파일 명세 | `docs/vscode-extension-file-reference.md` |
| 교육 자료 | `docs/quasar-tool-screen-component-guide.pptx` |

## 검증 기준

- `npm run validate:screens` 성공
- `npm run generate:vue` 성공
- `npm run build` 성공
- Extension Host에서 JSON Open With 가능
- Screen, Page Tree, Properties, Events 선택 상태 동기화
- 생성 Vue가 Quasar 개발 서버에서 렌더링

## 알려진 제약

- 현재 개발 실행은 Extension Development Host가 필요하며, 첫 VS Code에서 직접 사용하려면 VSIX 패키징 및 설치가 필요하다.
- 역변환기는 지원하는 Vue template/script 문법 범위 안에서 동작한다.
- Screen은 실제 런타임을 사용하지만 VS Code Webview와 브라우저 viewport 차이 및 편집 overlay 때문에 미세한 차이가 생길 수 있다.
- API 자동 연결, 공통코드, 팝업 설계와 고급 Grid 메타모델은 4단계 확장 대상으로 남아 있다.
