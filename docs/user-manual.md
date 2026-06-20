# Quasar Tool 사용자 매뉴얼

## 1. 화면 열기

1. VS Code에서 `.src/pages/<PageName>.json` 파일을 선택한다.
2. 우클릭 후 `Open With...`를 선택한다.
3. `Quasar UI Tool Editor`를 선택한다.
4. Activity Bar에서 `Quasar Tool` 아이콘을 열어 보조 패널을 표시한다.

## 2. Editor 탭

### Screen

실제 Vue/Quasar 런타임으로 화면을 렌더링하고 컴포넌트를 선택·배치한다. 선택 컴포넌트는 편집 테두리로 표시되며 Page Tree와 Properties가 함께 갱신된다.

Grid 정보 아이콘을 누르면 Form Search 행의 `col-N` 합계와 각 셀의 폭 배지를 보이거나 숨길 수 있다.

### Script

같은 이름의 `.js` 파일을 Monaco 편집기로 연다. JavaScript 구문 강조, 오류 밑줄, 자동 완성, Ctrl+C/V/Z를 제공한다. Events 패널에서 만든 함수로 자동 이동할 수 있다.

### DataSet

현재 화면의 DataSet 이름과 필드 구성을 확인한다. 상세 편집은 Activity Bar의 DataSet View를 사용한다.

## 3. Component Palette

| 항목 | 사용 방법 |
|---|---|
| Form Search | 조회 조건과 초기화/검색 버튼이 포함된 표준 검색 Form을 한 번에 추가 |
| Button | 클릭 명령용 `QBtn` 추가 |
| Input | 입력용 `QInput` 추가 |
| Card | 구획 컨테이너 `QCard` 추가 |
| Card Section | Card 내부 내용 영역 추가 |
| Table | rows/columns 기반 `QTable` 추가 |
| Text | Screen에서 더블클릭해 직접 편집 가능한 `div` 텍스트 추가 |
| Row | Quasar flex row 컨테이너 추가 |
| Column | 세로 배치 컨테이너 추가 |

Palette 항목은 클릭하거나 Screen의 대상 컨테이너로 드래그한다.

## 4. Properties

Screen 또는 Page Tree에서 컴포넌트를 선택한 뒤 값을 변경한다.

- `id`: 이벤트 함수명과 Tree 식별에 사용한다.
- `class`: Quasar utility class를 직접 입력하거나 선택 팝업에서 고른다.
- `style`: `border-radius: 4px`와 같은 inline CSS를 입력한다.
- `props.*`: label, color, dense, outlined 등 컴포넌트 속성이다.
- model/dynamic 속성은 JSON 모델에서 Vue 바인딩으로 생성된다.

class 선택 팝업은 중앙에 열리며 그룹별 체크 후 적용한다.

## 5. Events

1. 컴포넌트를 선택한다.
2. `@click`, `@change` 등 필요한 이벤트에 함수명을 입력한다.
3. 입력 옆 `...` 버튼을 누른다.
4. 함수가 없으면 `onClick_QBtn001` 형식으로 JS에 생성된다.
5. 이미 있으면 Script 탭에서 해당 함수 위치로 이동한다.

컴포넌트를 더블클릭하면 등록된 첫 이벤트 메서드로 이동한다.

## 6. Page Tree

- 화살표로 자식 계층을 펼치거나 접는다.
- Tree 항목을 선택하면 Screen의 같은 컴포넌트가 선택된다.
- Screen에서 선택하면 숨겨진 조상이 자동으로 펼쳐지고 Tree 중앙으로 스크롤된다.
- 드래그해 계층과 순서를 변경한다.
- `Delete` 또는 `Backspace`로 삭제한다.
- `Ctrl+C`, `Ctrl+X`, `Ctrl+V`로 복사, 잘라내기, 붙여넣기한다.

## 7. Form Search Grid 편집

셀 또는 행에서 우클릭해 컨텍스트 메뉴를 연다.

| 메뉴 | 동작 |
|---|---|
| Row 추가 | 선택 행과 같은 구조를 아래에 추가 |
| Column 추가 | 선택 셀 오른쪽에 빈 열 추가 |
| 셀 나누기 | 선택 셀만 줄 또는 칸으로 분할 |
| Row 삭제 | 선택 행 삭제 |
| Column 삭제 | 선택 셀 삭제 |

행 자체를 선택하면 `셀 나누기`는 비활성화된다.

### 셀 나누기

- `줄 개수`: 선택 셀의 `col-N` 폭과 부모 행을 유지하고 셀 내부만 세로 구획으로 나눈다.
- `칸 개수`: 선택 셀의 `col-N` 값을 나눠 같은 행에 형제 셀을 만든다.
- 줄과 칸은 라디오 버튼으로 하나만 선택할 수 있다.
- 기존 내용은 첫 번째 분할 구획에 남고 새 구획은 비어 있다.

### 크기 조절

- 행 또는 행 안의 셀을 선택하면 행 높이 조절 핸들을 사용할 수 있다.
- 셀을 선택하면 오른쪽 경계를 드래그해 같은 위치의 열 폭을 조절할 수 있다.

## 8. 저장과 생성

JSON 또는 대응 JS를 저장하면 해당 화면의 Vue 파일이 자동 생성된다. 수동 생성이 필요하면 터미널에서 다음 명령을 실행한다.

```powershell
npm run generate:vue -- .src/pages/IndexPage.json
```

Vue에서 JSON으로 역변환할 때는 다음 명령을 사용한다.

```powershell
npm run generate:json -- src/pages/IndexPage.vue
```

## 9. 주의사항

- 생성된 `src/pages/*.vue`보다 `.src/pages/*.json`과 `.js`를 원본으로 관리한다.
- 직접 Vue를 수정한 경우 역변환 전에 지원되지 않는 복잡한 문법이 있는지 확인한다.
- 컴포넌트 ID를 중복 사용하지 않는다.
- Screen 편집 보조선과 Grid 배지는 실제 브라우저 결과에 생성되지 않는다.

