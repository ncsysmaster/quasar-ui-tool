# Generator

Each page uses a paired source structure:

- `.src/pages/PageName.json`: page, component, data, and dataset definition
- `.src/pages/PageName.js`: `<script setup>` JavaScript body

`generate:vue` creates a missing JS file automatically. Legacy `script.setup`
content is migrated to the paired JS file and replaced with `script.src`.

VS Code Extension과 함께 배포되는 화면 JSON -> Vue 파일 생성기 소스입니다.

초기 대상 기능:

- `schemas/screen.schema.json` 기준 유효성 검사
- `examples/sample-screen.json` 입력 처리
- Quasar 컴포넌트 매핑
- Vue SFC 파일 생성
