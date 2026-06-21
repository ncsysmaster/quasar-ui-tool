# Quasar Tool 문서 및 산출물

이 폴더는 Quasar Tool의 설계, 개발, 운영, 사용자 교육 산출물을 관리한다.

## 문서 목록

| 문서 | 대상 | 내용 |
|---|---|---|
| [architecture-design.md](architecture-design.md) | 설계자, 개발자 | 시스템 구성, 데이터 흐름, 화면 모델, 생성 파이프라인 |
| [vscode-extension-file-reference.md](vscode-extension-file-reference.md) | 확장 개발자 | `vscode-extension` 아래 파일별 책임과 주요 메시지 |
| [development-guide.md](development-guide.md) | 개발자 | 설치, 실행, 디버깅, 생성기, 기능 추가, 검증 절차 |
| [vscode-debugging-guide.md](vscode-debugging-guide.md) | 초보 개발자 | Extension Host, Webview, Quasar 브라우저 디버깅 절차 |
| [user-manual.md](user-manual.md) | 화면 개발자 | Open With, Screen/Script/DataSet, 패널과 단축키 사용법 |
| [deliverables.md](deliverables.md) | 프로젝트 관리자 | 구현 범위, 산출물 위치, 검증 및 알려진 제약 |
| [development-standards.md](development-standards.md) | 개발자 | 개발 표준 |
| [requirements-guide.md](requirements-guide.md) | 기획자, 개발자 | 요구사항 기준 |
| [feature-definition-guide.md](feature-definition-guide.md) | 기획자, 개발자 | 기능 정의와 단계별 로드맵 |
| `quasar-tool-screen-component-guide.pptx` | 사용자 교육 | Screen 창과 컴포넌트 사용법 중심의 이미지 가이드 |

## 기준 소스

- 화면 원본: `.src/pages/<PageName>.json`
- 화면 스크립트: `.src/pages/<PageName>.js`
- 생성 결과: `src/pages/<PageName>.vue`
- VS Code 확장: `vscode-extension/`
- 화면 스키마: `schemas/screen.schema.json`
