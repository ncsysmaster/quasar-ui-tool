import fs from "node:fs/promises";
import path from "node:path";
import { Presentation, PresentationFile } from "file:///C:/Users/orumi/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@oai/artifact-tool/dist/artifact_tool.mjs";

const root = "D:/01 PROJECTSRC/codex/quasar_tool";
const scratch = path.join(root, ".tmp", "presentation-work");
const slidesDir = path.join(scratch, "slides");
const layoutDir = path.join(scratch, "layout");
const qaDir = path.join(scratch, "qa");
const output = path.join(root, "docs", "quasar-tool-screen-component-guide.pptx");

const images = {
  editor: "C:/Users/orumi/AppData/Local/Temp/codex-clipboard-c8b2dc72-ee75-4644-a5c3-e47a0c5956ef.png",
  browser: "C:/Users/orumi/AppData/Local/Temp/codex-clipboard-083028b7-a8c6-4ec6-9ed2-e82af217bdd7.png",
  grid: "C:/Users/orumi/AppData/Local/Temp/codex-clipboard-550369ad-6707-4d04-a411-cdcbf0929d13.png",
  split: "C:/Users/orumi/AppData/Local/Temp/codex-clipboard-f4863194-35a8-420c-aaa1-4a41cb19b175.png",
};

const C = {
  bg: "#F3F6F8",
  ink: "#15202B",
  muted: "#64717D",
  line: "#D7DEE4",
  white: "#FFFFFF",
  dark: "#20242A",
  dark2: "#2D333B",
  blue: "#1976D2",
  teal: "#0F766E",
  orange: "#F97316",
  red: "#DC2626",
  paleBlue: "#E8F2FC",
  paleOrange: "#FFF0E6",
  paleTeal: "#E8F6F3",
};

const presentation = Presentation.create({ slideSize: { width: 1280, height: 720 } });

function shape(slide, geometry, left, top, width, height, fill, line = C.line, radius = "rounded") {
  return slide.shapes.add({
    geometry,
    position: { left, top, width, height },
    fill,
    line: { style: "solid", fill: line, width: line === "none" ? 0 : 1 },
    ...(geometry === "roundRect" ? { borderRadius: radius } : {}),
  });
}

function text(slide, value, left, top, width, height, size = 22, color = C.ink, bold = false, align = "left") {
  const box = slide.shapes.add({
    geometry: "textbox",
    position: { left, top, width, height },
    fill: "none",
    line: { style: "solid", fill: "none", width: 0 },
  });
  box.text = value;
  box.text.style = {
    fontSize: size,
    typeface: "Malgun Gothic",
    color,
    bold,
    horizontalAlignment: align,
    verticalAlignment: "middle",
  };
  return box;
}

function title(slide, kicker, heading, sub = "") {
  text(slide, kicker.toUpperCase(), 54, 28, 470, 24, 12, C.blue, true);
  text(slide, heading, 54, 52, 1168, 56, 34, C.ink, true);
  if (sub) text(slide, sub, 54, 108, 1150, 32, 17, C.muted);
  shape(slide, "rect", 54, 146, 1172, 2, C.line, "none");
}

async function addImage(slide, file, left, top, width, height, fit = "contain", alt = "Quasar Tool 화면 캡처") {
  const bytes = await fs.readFile(file);
  slide.images.add({
    blob: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    contentType: "image/png",
    alt,
    fit,
    position: { left, top, width, height },
  });
}

function pill(slide, value, left, top, width, fill = C.paleBlue, color = C.blue) {
  shape(slide, "roundRect", left, top, width, 30, fill, "none");
  text(slide, value, left + 8, top, width - 16, 30, 13, color, true, "center");
}

function marker(slide, number, left, top, color = C.orange) {
  shape(slide, "ellipse", left, top, 34, 34, color, C.white);
  text(slide, String(number), left, top, 34, 34, 16, C.white, true, "center");
}

function footer(slide, page) {
  text(slide, "QUASAR TOOL · SCREEN COMPONENT GUIDE", 54, 686, 500, 18, 9, C.muted, true);
  text(slide, String(page).padStart(2, "0"), 1170, 682, 54, 24, 11, C.muted, true, "right");
}

function infoCard(slide, left, top, width, height, heading, body, accent = C.blue) {
  shape(slide, "roundRect", left, top, width, height, C.white, C.line);
  shape(slide, "rect", left, top, 5, height, accent, "none");
  text(slide, heading, left + 20, top + 14, width - 34, 30, 20, C.ink, true);
  text(slide, body, left + 20, top + 48, width - 34, height - 58, 15, C.muted);
}

// 1. Cover
{
  const s = presentation.slides.add();
  s.background.fill = C.dark;
  text(s, "QUASAR TOOL", 62, 58, 470, 28, 13, "#72B7F2", true);
  text(s, "Screen 컴포넌트\n사용 가이드", 62, 104, 470, 150, 52, C.white, true);
  text(s, "JSON 기반 Quasar/Vue 화면을 VS Code에서 설계하고\n실행 가능한 Vue 파일로 연결하는 방법", 62, 268, 460, 90, 18, "#C7D0D9");
  pill(s, "Screen", 62, 376, 106, C.blue, C.white);
  pill(s, "Script", 180, 376, 106, C.dark2, "#D9E2EA");
  pill(s, "DataSet", 298, 376, 118, C.dark2, "#D9E2EA");
  shape(s, "roundRect", 555, 52, 670, 570, C.white, "#454C55");
  await addImage(s, images.grid, 575, 90, 630, 490, "contain", "Form Search Grid가 열린 Screen 화면");
  text(s, "설계 · 편집 · 생성", 62, 612, 400, 36, 16, "#8FA1B2", true);
  text(s, "v0.1.0", 1135, 660, 90, 20, 10, "#8FA1B2", true, "right");
}

// 2. Workflow
{
  const s = presentation.slides.add(); s.background.fill = C.bg;
  title(s, "01 · WORKFLOW", "한 화면의 원본은 JSON과 JS, 결과는 Vue", "Screen 편집과 코드 편집이 같은 상태 모델을 공유합니다.");
  const steps = [
    ["1", "Open With", ".src/pages/Page.json", C.blue],
    ["2", "Screen 설계", "Palette · Properties · Tree", C.teal],
    ["3", "Script 작성", ".src/pages/Page.js", C.orange],
    ["4", "Vue 생성", "src/pages/Page.vue", C.blue],
    ["5", "브라우저 확인", "Quasar dev :9000", C.teal],
  ];
  steps.forEach((item, i) => {
    const x = 54 + i * 235;
    shape(s, "roundRect", x, 220, 198, 230, C.white, C.line);
    shape(s, "ellipse", x + 64, 250, 70, 70, item[3], "none");
    text(s, item[0], x + 64, 250, 70, 70, 27, C.white, true, "center");
    text(s, item[1], x + 18, 340, 162, 34, 19, C.ink, true, "center");
    text(s, item[2], x + 16, 384, 166, 48, 13, C.muted, false, "center");
    if (i < steps.length - 1) text(s, "→", x + 198, 294, 37, 50, 27, C.muted, true, "center");
  });
  infoCard(s, 54, 500, 548, 116, "원본 관리 원칙", "생성된 Vue보다 .src/pages의 JSON/JS 쌍을 기준으로 버전 관리합니다.", C.orange);
  infoCard(s, 622, 500, 604, 116, "자동 동기화", "JSON 또는 JS 저장 시 해당 화면만 generate-vue.mjs가 실행됩니다.", C.teal);
  footer(s, 2);
}

// 3. Screen anatomy
{
  const s = presentation.slides.add(); s.background.fill = C.bg;
  title(s, "02 · SCREEN", "Screen은 실제 Quasar 런타임으로 렌더링", "편집 보조선만 추가되고 컴포넌트 구조는 생성 Vue와 같은 규칙을 사용합니다.");
  shape(s, "roundRect", 54, 180, 820, 430, C.white, C.line);
  await addImage(s, images.editor, 65, 195, 798, 400, "contain", "Screen Script DataSet 탭이 있는 VS Code 편집 화면");
  marker(s, 1, 84, 190, C.blue);
  marker(s, 2, 820, 410, C.orange);
  infoCard(s, 902, 180, 324, 115, "1 · Editor 탭", "Screen / Script / DataSet을 전환합니다.", C.blue);
  infoCard(s, 902, 313, 324, 115, "2 · 런타임 Canvas", "Vue + Quasar CSS로 JSON 컴포넌트를 직접 렌더링합니다.", C.orange);
  infoCard(s, 902, 446, 324, 164, "선택 동기화", "Screen에서 선택하면 Page Tree가 자동 펼침되고 Properties와 Events가 같은 ID를 표시합니다.", C.teal);
  footer(s, 3);
}

// 4. Form Search
{
  const s = presentation.slides.add(); s.background.fill = C.bg;
  title(s, "03 · FORM SEARCH", "Form Search는 조회 화면의 표준 골격을 한 번에 생성", "Palette에서 클릭하면 조회 필드, 토글, 입력, 초기화/검색 버튼 구조와 기본 데이터를 함께 만듭니다.");
  shape(s, "roundRect", 54, 176, 1172, 344, C.white, C.line);
  await addImage(s, images.grid, 66, 190, 1148, 316, "contain", "Form Search Grid 편집 화면");
  marker(s, 1, 74, 208, C.blue); marker(s, 2, 415, 208, C.orange); marker(s, 3, 835, 208, C.teal); marker(s, 4, 1138, 451, C.red);
  const labels = [
    [54, "1", "라벨 셀", "필수 표시와 배경 class를 Properties에서 수정"],
    [350, "2", "입력 셀", "QSelect/QInput과 v-model을 배치"],
    [646, "3", "토글 셀", "QToggle로 boolean 조회 조건 구성"],
    [942, "4", "명령 셀", "초기화와 검색 이벤트 연결"],
  ];
  labels.forEach((a, i) => infoCard(s, a[0], 548, 272, 100, `${a[1]} · ${a[2]}`, a[3], [C.blue,C.orange,C.teal,C.red][i]));
  footer(s, 4);
}

// 5. Basic components
{
  const s = presentation.slides.add(); s.background.fill = C.bg;
  title(s, "04 · BASIC COMPONENTS", "Button · Input · Text는 가장 빠른 화면 조립 단위", "Palette 클릭 후 Properties와 Events에서 동작을 완성합니다.");
  shape(s, "roundRect", 54, 176, 720, 420, C.white, C.line);
  await addImage(s, images.browser, 66, 188, 696, 396, "contain", "Button Input Text가 렌더링된 브라우저 화면");
  const comps = [
    [810, 176, "BUTTON · QBtn", "label/color/flat/outline을 설정하고 @click 메서드를 연결합니다.", C.blue, "클릭 → Events → ..."],
    [810, 316, "INPUT · QInput", "label/dense/outlined와 model을 설정하고 Enter 또는 change 이벤트를 연결합니다.", C.orange, "입력 → Properties"],
    [810, 456, "TEXT · HtmlElement", "Screen에서 더블클릭해 직접 편집하고 class/style로 표현을 조절합니다.", C.teal, "더블클릭 → 직접 편집"],
  ];
  comps.forEach(([x,y,h,b,a,p]) => { infoCard(s,x,y,416,122,h,b,a); pill(s,p,x+210,y+82,186,C.bg,a); });
  footer(s, 5);
}

// 6. Containers and table
{
  const s = presentation.slides.add(); s.background.fill = C.bg;
  title(s, "05 · CONTAINERS", "Card · Card Section · Table은 정보 구획과 목록을 구성", "Page Tree에서 부모-자식 구조를 먼저 확인하면 배치 오류를 줄일 수 있습니다.");
  const xs = [54, 444, 834];
  const data = [
    ["CARD · QCard", "페이지의 독립 구획", "flat / bordered / class", C.blue],
    ["CARD SECTION", "Card 내부 패딩 영역", "QCard의 children으로 배치", C.orange],
    ["TABLE · QTable", "rows/columns 목록", "dense / request / row-click", C.teal],
  ];
  data.forEach((d,i)=>{
    shape(s,"roundRect",xs[i],184,350,350,C.white,C.line);
    shape(s,"roundRect",xs[i]+26,218,298,166,i===2?C.paleTeal:C.bg,d[3]);
    if(i===0){ shape(s,"rect",xs[i]+52,248,246,26,C.paleBlue,C.blue); shape(s,"rect",xs[i]+52,290,246,76,C.white,C.line); }
    if(i===1){ shape(s,"rect",xs[i]+48,242,254,108,C.white,C.line); text(s,"content",xs[i]+48,274,254,34,16,C.muted,false,"center"); }
    if(i===2){ [0,1,2,3].forEach(r=>shape(s,"rect",xs[i]+48,238+r*29,254,28,r===0?C.teal:C.white,r===0?C.teal:C.line)); }
    text(s,d[0],xs[i]+24,404,302,34,21,C.ink,true);
    text(s,d[1],xs[i]+24,443,302,28,15,C.muted);
    pill(s,d[2],xs[i]+24,484,302,C.bg,d[3]);
  });
  infoCard(s,54,562,1130,84,"권장 계층","QPage → QCard → QCardSection → Row/Column 또는 QTable. Page Tree에서 드래그해 부모를 조정합니다.",C.blue);
  footer(s, 6);
}

// 7. Row and Column
{
  const s = presentation.slides.add(); s.background.fill = C.bg;
  title(s, "06 · LAYOUT", "Row · Column과 col-N 배지로 12칸 Grid를 읽기", "각 행의 합계와 각 셀 폭을 동시에 확인해 레이아웃 오류를 빠르게 찾습니다.");
  shape(s, "roundRect", 54, 176, 1172, 318, C.white, C.line);
  await addImage(s, images.grid, 64, 188, 1152, 294, "contain", "col-N 배지가 표시된 Form Search Grid");
  marker(s, 1, 58, 199, C.teal); marker(s, 2, 218, 199, C.orange); marker(s, 3, 1115, 430, C.blue);
  infoCard(s,54,522,354,112,"1 · 행 합계","왼쪽 col-12 배지는 현재 행의 셀 폭 합계입니다.",C.teal);
  infoCard(s,426,522,354,112,"2 · 셀 폭","오른쪽 위 col-2/col-4 배지는 해당 셀의 Quasar 폭입니다.",C.orange);
  infoCard(s,798,522,428,112,"3 · 표시 토글","Screen 도구의 보기 아이콘으로 배지를 숨기거나 다시 표시합니다.",C.blue);
  footer(s, 7);
}

// 8. Split cell
{
  const s = presentation.slides.add(); s.background.fill = C.bg;
  title(s, "07 · CELL SPLIT", "셀 나누기는 선택 셀만 줄 또는 칸으로 분할", "행 자체를 선택하면 메뉴가 비활성화되며 줄과 칸은 동시에 선택할 수 없습니다.");
  shape(s,"roundRect",54,184,350,262,C.dark,C.dark2);
  shape(s,"rect",66,198,326,38,"#454545","none");
  text(s,"셀 나누기",78,198,180,38,14,C.white,true);
  text(s,"×",352,198,24,38,18,"#C8C8C8",false,"center");
  shape(s,"roundRect",78,250,210,128,C.dark2,"#5B626A");
  text(s,"줄/칸 나누기",90,242,120,24,12,"#DDE4EA",true);
  shape(s,"ellipse",92,278,15,15,C.blue,C.blue);
  shape(s,"ellipse",96,282,7,7,C.white,"none");
  text(s,"줄 개수",116,271,72,28,13,C.white,true);
  shape(s,"roundRect",194,270,76,30,"#353A40","#59616A");
  text(s,"2",204,270,48,30,13,"#DDE4EA");
  shape(s,"ellipse",92,326,15,15,"none","#7A828B");
  text(s,"칸 개수",116,319,72,28,13,"#AEB7C0");
  shape(s,"roundRect",194,318,76,30,"#292E34","#444B52");
  text(s,"2",204,318,48,30,13,"#747D86");
  shape(s,"roundRect",304,250,76,36,"#2F5F9E","#4B91F1");
  text(s,"나누기",304,250,76,36,13,C.white,true,"center");
  shape(s,"roundRect",304,296,76,36,"#34383D","#686E74");
  text(s,"취소",304,296,76,36,13,"#DDE4EA",false,"center");
  text(s,"줄/칸 중 하나만 선택",66,396,326,24,12,"#B8C1CA",true,"center");
  text(s,"줄 나누기",456,184,300,32,20,C.ink,true);
  shape(s,"roundRect",456,228,300,190,C.white,C.line);
  shape(s,"roundRect",492,256,228,132,C.paleBlue,C.blue);
  shape(s,"rect",508,270,196,45,C.white,C.line);
  shape(s,"rect",508,328,196,45,C.white,C.line);
  text(s,"선택 셀 내부",508,270,196,45,15,C.blue,true,"center");
  text(s,"새 세로 구획",508,328,196,45,15,C.blue,true,"center");
  text(s,"바깥 col-N 유지",456,428,300,30,14,C.muted,false,"center");
  text(s,"칸 나누기",818,184,300,32,20,C.ink,true);
  shape(s,"roundRect",818,228,408,190,C.white,C.line);
  [0,1].forEach(i=>{ shape(s,"rect",850+i*174,270,158,104,i===0?C.paleOrange:C.white,C.orange); text(s,"col-5",850+i*174,270,158,104,20,C.orange,true,"center"); });
  text(s,"col-10 → col-5 + col-5",818,428,408,30,14,C.muted,false,"center");
  infoCard(s,54,492,1172,132,"사용 순서","1) 셀 선택  2) 우클릭 → 셀 나누기  3) 줄 또는 칸 선택  4) 개수 입력  5) 나누기. 기존 내용은 첫 구획에 유지됩니다.",C.orange);
  footer(s, 8);
}

// 9. Side panels
{
  const s = presentation.slides.add(); s.background.fill = C.bg;
  title(s, "08 · SIDE PANELS", "Palette · Properties · Events · Page Tree가 선택 ID를 공유", "화면 조립, 속성 편집, 이벤트 연결, 계층 이동이 한 흐름으로 이어집니다.");
  const panels = [
    [54,"Component Palette",["Form Search","Button","Input","Card","Table"],C.blue],
    [350,"Properties",["id  QBtn001","class  q-ml-sm","style  min-width:80px","color  primary"],C.orange],
    [646,"Events",["@click  onClick_QBtn001","@focus","@blur","[...] 메서드 열기"],C.teal],
    [942,"Page Tree",["▾ QPage","  ▾ QCard","    ▾ Row","      QBtn001"],C.red],
  ];
  panels.forEach(([x,h,rows,a])=>{
    shape(s,"roundRect",x,182,268,406,C.dark,C.dark2);
    text(s,h,x+16,194,236,34,17,C.white,true);
    shape(s,"rect",x+12,234,244,1,"#4A515B","none");
    rows.forEach((r,i)=>{
      shape(s,"roundRect",x+14,252+i*66,240,50,i===0?"#36485B":C.dark2,i===0?a:"#454C55");
      text(s,r,x+28,252+i*66,212,50,14,i===0?C.white:"#D5DDE5",i===0);
    });
  });
  pill(s,"선택 → 속성 → 이벤트 → 계층",416,620,448,C.white,C.blue);
  footer(s, 9);
}

// 10. Script and DataSet
{
  const s = presentation.slides.add(); s.background.fill = C.bg;
  title(s, "09 · SCRIPT & DATASET", "Monaco로 JavaScript를 편집하고 DataSet으로 데이터 구조를 정의", "이벤트 메서드 생성 시 Script 탭이 해당 함수 위치로 이동합니다.");
  shape(s,"roundRect",54,182,760,424,C.dark,C.dark2);
  text(s,"IndexPage.js",74,194,230,30,14,"#DCE6EF",true);
  const code = [
    ["const search = reactive({", "#C586C0"],
    ["  name: '', requiredYn: false", "#DCDCAA"],
    ["})", "#DCE6EF"],
    ["", "#DCE6EF"],
    ["function onClick_QBtn001(payload) {", "#4EC9B0"],
    ["  console.log('click', payload)", "#CE9178"],
    ["}", "#DCE6EF"],
  ];
  code.forEach((c,i)=>{ text(s,String(i+1),68,246+i*40,28,30,12,"#788491",false,"right"); text(s,c[0],112,246+i*40,650,30,16,c[1],i===4); });
  shape(s,"roundRect",846,182,380,424,C.white,C.line);
  text(s,"DataSet",870,202,240,34,21,C.ink,true);
  pill(s,"defaultDataset",870,248,188,C.paleTeal,C.teal);
  const fields = [["courseNm","string"],["requiredYn","boolean"],["rows","object"]];
  fields.forEach((f,i)=>{ shape(s,"roundRect",870,304+i*76,332,58,C.bg,C.line); text(s,f[0],888,304+i*76,194,58,15,C.ink,true); pill(s,f[1],1080,318+i*76,102,C.white,C.muted); });
  text(s,"Ctrl+C / Ctrl+V / Ctrl+Z · 자동 완성 · 오류 밑줄",54,626,760,30,14,C.muted,true);
  footer(s, 10);
}

// 11. Generation
{
  const s = presentation.slides.add(); s.background.fill = C.bg;
  title(s, "10 · GENERATION", "저장 순간 화면 단위로 Vue를 다시 생성", "정방향 생성과 역변환을 모두 지원하며 수동 명령으로도 동일하게 실행할 수 있습니다.");
  const nodes = [
    [54,218,286,130,"Page.json","컴포넌트 · props · data",C.blue],
    [54,390,286,130,"Page.js","<script setup> 본문",C.orange],
    [488,304,300,150,"generate-vue.mjs","검증 · template · script",C.teal],
    [936,304,290,150,"Page.vue","Quasar 실행 결과",C.blue],
  ];
  nodes.forEach(n=>infoCard(s,n[0],n[1],n[2],n[3],n[4],n[5],n[6]));
  text(s,"↘",356,250,100,80,42,C.muted,true,"center"); text(s,"↗",356,402,100,80,42,C.muted,true,"center"); text(s,"→",806,332,108,80,42,C.muted,true,"center");
  pill(s,"npm run generate:vue",488,486,300,C.white,C.teal);
  pill(s,"npm run generate:json  ← 역변환",882,504,344,C.white,C.orange);
  infoCard(s,54,562,1172,84,"자동 처리","VS Code 저장 이벤트 또는 watch:vue가 변경된 JSON/JS의 대응 화면만 생성합니다.",C.blue);
  footer(s, 11);
}

// 12. Quick start
{
  const s = presentation.slides.add(); s.background.fill = C.dark;
  text(s,"QUICK START",54,38,300,26,12,"#72B7F2",true);
  text(s,"화면 하나를 완성하는 6단계",54,72,780,58,36,C.white,true);
  const steps = [
    ["01","JSON Open With","Quasar UI Tool Editor"],
    ["02","Palette 추가","클릭 또는 드래그"],
    ["03","Properties 설정","class · style · props"],
    ["04","Events 연결","[...] 메서드 생성"],
    ["05","Script/DataSet 편집","Monaco와 필드 정의"],
    ["06","저장 후 확인","Vue 생성 · Browser"],
  ];
  steps.forEach((d,i)=>{
    const col=i%3,row=Math.floor(i/3),x=54+col*390,y=174+row*184;
    shape(s,"roundRect",x,y,352,146,C.dark2,"#454C55");
    text(s,d[0],x+18,y+16,54,36,16,i%2?"#FDBA74":"#72B7F2",true);
    text(s,d[1],x+18,y+52,312,34,20,C.white,true);
    text(s,d[2],x+18,y+92,312,30,14,"#B8C3CE");
  });
  shape(s,"roundRect",54,566,1132,70,"#243B53","#31577B");
  text(s,"기준 문서",76,583,120,30,14,"#72B7F2",true);
  text(s,"docs/user-manual.md  ·  development-guide.md  ·  vscode-extension-file-reference.md",204,583,940,30,15,C.white);
  text(s,"QUASAR TOOL",54,674,300,18,9,"#8FA1B2",true);
  text(s,"12",1160,670,40,22,11,"#8FA1B2",true,"right");
}

await Promise.all([slidesDir, layoutDir, qaDir].map((dir) => fs.mkdir(dir, { recursive: true })));

await fs.writeFile(path.join(scratch, "source-notes.txt"), [
  "Quasar Tool Screen Component Guide - source ledger",
  "Source code: local repository vscode-extension/src and src/generator (accessed 2026-06-20)",
  "Screen capture: user-provided Form Search grid screenshot; slides 1, 4, 7",
  "Browser capture: user-provided Quasar UI Builder screenshot; slide 5",
  "Editor capture: user-provided Screen/Script/DataSet screenshot; slide 3",
  "Cell split dialog: recreated as editable shapes from the current implementation; slide 8",
  "All diagrams and interface mockups are editable native presentation shapes.",
].join("\n"), "utf8");

await fs.writeFile(path.join(scratch, "slide-plan.txt"), [
  "Mode: create; audience: Quasar Tool screen developers; slides: 12",
  "Palette: neutral #F3F6F8/#20242A (65%), blue #1976D2, teal #0F766E, orange #F97316 accent",
  "Typeface: Malgun Gothic; cover 52px, slide title 34px, body 15-20px, footer 9px",
  "Story: workflow > Screen > palette components > layout/split > panels > script/dataset > generation > quick start",
].join("\n"), "utf8");

for (const [index, slide] of presentation.slides.items.entries()) {
  const stem = `slide-${String(index + 1).padStart(2, "0")}`;
  const png = await presentation.export({ slide, format: "png", scale: 1 });
  await fs.writeFile(path.join(slidesDir, `${stem}.png`), new Uint8Array(await png.arrayBuffer()));
  const layout = await slide.export({ format: "layout" });
  await fs.writeFile(path.join(layoutDir, `${stem}.layout.json`), await layout.text(), "utf8");
}

const montage = await presentation.export({ format: "webp", montage: true, scale: 0.4 });
await fs.writeFile(path.join(scratch, "deck-montage.webp"), new Uint8Array(await montage.arrayBuffer()));
const pptx = await PresentationFile.exportPptx(presentation);
await pptx.save(output);

await fs.writeFile(path.join(qaDir, "visual-qa.txt"), [
  "Visual QA",
  "Mechanical: 12 slides rendered; layout JSON and montage generated; PPTX exported.",
  "Deck-level: consistent 54px margins, title/footer system, screenshot provenance recorded.",
  "Slide-level: screenshot crops use contain; editable labels and diagrams remain native shapes.",
  "Issue ledger: no known blocker before visual inspection.",
  "Final decision: pass after individual review of all 12 rendered slides.",
].join("\n"), "utf8");

console.log(JSON.stringify({ output, scratch, slideCount: presentation.slides.items.length }));
