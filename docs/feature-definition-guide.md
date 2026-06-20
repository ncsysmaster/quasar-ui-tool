# 기능 정의 가이드

## 기능 맵

| 단계 | 기능 영역 | 주요 산출물 |
| --- | --- | --- |
| 1단계 | JSON -> Vue 생성기 | 화면 JSON, Vue SFC, 컴포넌트 매핑 |
| 2단계 | 팔레트/속성 패널 | 컴포넌트 목록, 속성 편집 모델 |
| 3단계 | 드래그앤드롭 배치 | 캔버스, 트리 구조, 배치 이벤트 |
| 4단계 | 업무 기능 자동화 | 그리드, 팝업, 공통코드, API 연결 |
| 5단계 | VS Code Extension | Webview, 명령, 파일 연동 |

## 1단계: 화면 JSON -> Vue 파일 생성기

### 기능

- 화면 JSON 로드
- JSON 스키마 검증
- Quasar 컴포넌트 매핑
- Vue SFC 생성
- 생성 결과 저장

### 입력

- 화면 ID
- 화면명
- 레이아웃 정보
- 컴포넌트 트리
- 이벤트 정의

### 출력

- `*.vue` 파일
- 생성 로그
- 검증 오류 목록

## 2단계: 컴포넌트 팔레트 + 속성 패널

### 기능

- 컴포넌트 검색
- 컴포넌트 그룹 분류
- 속성 패널 렌더링
- 속성 변경 저장
- 컴포넌트 기본값 적용

### 컴포넌트 그룹

- Layout: Page, Card, Row, Column, Separator
- Input: Input, Select, Checkbox, Radio, Date
- Display: Label, Badge, Table, List
- Action: Button, ButtonGroup, Toggle
- Data: Grid, Tree, Pagination

## 3단계: 드래그앤드롭 화면 배치

### 기능

- 팔레트에서 캔버스로 드래그
- 캔버스 내 위치 변경
- 컨테이너 내부 배치
- 컴포넌트 선택/삭제/복제
- JSON 트리 동기화

### 저장 모델

- 컴포넌트 ID
- 컴포넌트 타입
- 부모 ID
- 정렬 순서
- 속성
- 이벤트

## 4단계: 그리드, 팝업, 공통코드, API 자동연결

### 기능

- 그리드 컬럼 편집
- 데이터소스 연결
- 팝업 호출 정의
- 공통코드 바인딩
- API 요청/응답 매핑
- 이벤트 핸들러 생성

### 자동연결 대상

- 조회 버튼 -> 목록 API
- 저장 버튼 -> 저장 API
- Select 컴포넌트 -> 공통코드 API
- Grid 컴포넌트 -> 데이터소스
- Popup 버튼 -> 팝업 화면

## 5단계: VS Code Extension 통합

### 기능

- 화면 JSON 탐색기
- 화면 편집 Webview
- Vue 파일 생성 명령
- 템플릿 설정 관리
- 프로젝트 설정 파일 관리

### VS Code 명령 예시

- `Quasar Tool: Create Screen JSON`
- `Quasar Tool: Generate Vue File`
- `Quasar Tool: Open UI Builder`
- `Quasar Tool: Validate Screen JSON`

## 산출물 기준

- 각 단계는 동작 가능한 최소 산출물을 가진다.
- 생성기, 편집기, Extension 기능은 분리된 모듈로 관리한다.
- 단계가 올라가도 1단계 JSON -> Vue 생성 흐름은 계속 유지한다.

