import fs from "node:fs/promises";
import { Presentation, PresentationFile } from "@oai/artifact-tool";

const OUT = String.raw`D:\01 PROJECTSRC\codex\quasar_tool\docs\Quasar-UI-Tool-VSCode-Extension-Deployment-Guide.pptx`;
const TMP = String.raw`D:\01 PROJECTSRC\codex\quasar_tool\.tmp\vscode-extension-deployment-ppt`;
const HERO = String.raw`D:\01 PROJECTSRC\codex\quasar_tool\docs\QuasarUiTool.png`;
const ICON = String.raw`D:\01 PROJECTSRC\codex\quasar_tool\vscode-extension\media\quasar-tool.png`;

const W = 1280, H = 720;
const C = { ink: "#111827", muted: "#5F6B7A", panel: "#EEF2F6", rule: "#C8D0DA", blue: "#2F80ED", cyan: "#18C8FF", navy: "#071B45", green: "#17A673", amber: "#E79A16", red: "#D84A4A", white: "#FFFFFF" };

const deck = Presentation.create({ slideSize: { width: W, height: H } });

function box(slide, x, y, w, h, fill = C.panel, radius = 0, line = "none") {
  return slide.shapes.add({ geometry: radius ? "roundRect" : "rect", position: { left:x, top:y, width:w, height:h }, fill, line: { style:"solid", fill:line, width: line === "none" ? 0 : 1 }, ...(radius ? { borderRadius:"rounded-xl" } : {}) });
}
function txt(slide, value, x, y, w, h, size=22, color=C.ink, bold=false, align="left", font="Arial") {
  const s = slide.shapes.add({ geometry:"textbox", position:{left:x,top:y,width:w,height:h}, fill:"none", line:{style:"solid",fill:"none",width:0} });
  s.text = value;
  s.text.style = { fontSize:size, color, bold, alignment:align, verticalAlignment:"middle", fontFamily:font, typeface:font, autoFit:"shrinkText", insets:{top:0,right:0,bottom:0,left:0} };
  return s;
}
function title(slide, value, n) {
  txt(slide, value, 48, 34, 1130, 70, 38, C.ink, true);
  txt(slide, String(n).padStart(2,"0"), 1190, 646, 42, 24, 14, C.muted, false, "right");
  box(slide, 48, 112, 1184, 2, C.rule);
}
function addNotes(slide, local = "") {
  slide.speakerNotes.textFrame.setText(`${local}\n\n[Sources]\n- Local project: vscode-extension/package.json, vscode-extension/CHANGELOG.md, docs/marketplace-publisher-info.md\n- Microsoft VS Code Extension API: https://code.visualstudio.com/api/working-with-extensions/publishing-extension\n- Microsoft VS Code docs: https://code.visualstudio.com/docs/configure/extensions/extension-marketplace`);
}
function terminal(slide, lines, x, y, w, h, caption="PowerShell") {
  box(slide,x,y,w,h,C.navy,14);
  box(slide,x,y,w,42,"#0B2A60",14);
  [C.red,C.amber,C.green].forEach((c,i)=>box(slide,x+18+i*24,y+14,12,12,c,12));
  txt(slide,caption,x+100,y+7,w-120,28,16,"#D7E8FF",true);
  lines.forEach((line,i)=>txt(slide,line,x+28,y+58+i*42,w-56,34,18,line.startsWith("#")?"#72D6FF":"#F5FAFF",false,"left","Consolas"));
}
function step(slide, num, label, x, y, color=C.blue) {
  box(slide,x,y,82,82,color,82);
  txt(slide,String(num),x,y,82,82,34,C.white,true,"center");
  txt(slide,label,x-42,y+96,166,64,20,C.ink,true,"center");
}

// 1 — Cover
{
  const s=deck.slides.add(); s.background.fill=C.white;
  const bytes=await fs.readFile(HERO);
  s.images.add({blob:bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),contentType:"image/png",alt:"Quasar UI Tool logo",fit:"cover",position:{left:780,top:0,width:500,height:720}});
  txt(s,"QUASAR UI TOOL",56,52,500,36,20,C.blue,true);
  txt(s,"VS Code Extension\n배포 가이드",56,164,670,190,60,C.ink,true);
  txt(s,"수정 → 버전 → 설치 → 포장 → 시험 → 게시 → 확인",56,410,670,80,26,C.muted,true);
  box(s,56,530,560,72,C.navy,14);
  txt(s,"반복 배포용 · ORUM.quasar-tool-vscode",78,530,520,72,22,C.white,true);
  txt(s,"2026.08",56,646,200,24,15,C.muted);
  addNotes(s,"이 자료의 목표: 배포 담당자가 마지막 체크리스트만 보고도 안전하게 새 버전을 게시할 수 있도록 한다.");
}

// 2 — Identity
{
  const s=deck.slides.add(); s.background.fill=C.white; title(s,"배포 전에 확장 ID 네 가지를 고정한다",2);
  const bytes=await fs.readFile(ICON);
  s.images.add({blob:bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),contentType:"image/png",alt:"Quasar UI Tool extension icon",fit:"contain",position:{left:62,top:164,width:270,height:270}});
  const rows=[["Publisher","ORUM"],["Name","quasar-tool-vscode"],["Marketplace ID","ORUM.quasar-tool-vscode"],["현재 버전","0.1.0"]];
  rows.forEach((r,i)=>{ const y=154+i*96; txt(s,r[0],400,y,240,54,19,C.muted,true); txt(s,r[1],650,y,500,54,29,i===2?C.blue:C.ink,true); box(s,400,y+68,760,1,C.rule); });
  box(s,62,490,1098,110,"#EAF5FF",12);
  txt(s,"publisher 또는 name을 바꾸면 기존 업데이트가 아니라 다른 확장으로 인식될 수 있다.",92,510,1040,70,22,C.navy,true,"center");
  addNotes(s,"확장 식별자는 displayName이 아니라 publisher + name 조합이다.");
}

// 3 — Where to deploy
{
  const s=deck.slides.add(); s.background.fill=C.white; title(s,"배포 대상은 루트 앱이 아니라 vscode-extension 폴더다",3);
  txt(s,"D:\\01 PROJECTSRC\\codex\\quasar_tool",62,146,690,42,22,C.muted,true,"left","Consolas");
  const tree=[
    [0,"quasar_tool/",C.ink,true], [1,"src/              ← Quasar 웹 앱",C.muted,false],
    [1,"vscode-extension/  ← 배포 시작점",C.blue,true], [2,"src/",C.ink,true], [2,"generator/",C.ink,true],
    [2,"templates/",C.ink,true], [2,"media/",C.ink,true], [2,"package.json",C.ink,true], [2,"CHANGELOG.md",C.ink,true]
  ];
  tree.forEach((r,i)=>txt(s,`${"   ".repeat(r[0])}${r[0]?"└─ ":""}${r[1]}`,74,196+i*43,650,34,21,r[2],r[3],"left","Consolas"));
  box(s,788,166,390,378,"#F5F7FA",14);
  txt(s,"패키지에 포함",820,194,326,42,27,C.ink,true);
  ["src/**","generator/**","templates/**","media/**","README.md","CHANGELOG.md"].forEach((v,i)=>{box(s,820,258+i*45,16,16,i<4?C.cyan:C.blue,16);txt(s,v,852,247+i*45,280,36,20,C.ink,false,"left","Consolas");});
  txt(s,"루트 src/pages 수정만으로는\n확장 배포물에 자동 반영되지 않는다.",790,566,390,70,20,C.red,true,"center");
  addNotes(s,"package.json의 files 배열을 기준으로 패키지 포함 범위를 설명한다.");
}

// 4 — overall workflow
{
  const s=deck.slides.add(); s.background.fill=C.white; title(s,"반복 배포는 일곱 단계만 기억하면 된다",4);
  box(s,80,298,1120,4,C.rule);
  const labels=["수정","버전","설치","포장","시험","게시","확인"];
  const colors=[C.navy,C.blue,C.cyan,C.green,C.amber,"#8B5CF6",C.ink];
  labels.forEach((v,i)=>step(s,i+1,v,76+i*170,258,colors[i]));
  txt(s,"앞 단계가 확인되지 않으면 다음 단계로 넘어가지 않는다",128,500,1024,64,26,C.ink,true,"center");
  box(s,216,594,848,44,"#EAF5FF",10); txt(s,"수정 → 버전 → 설치 → 포장 → 시험 → 게시 → 확인",230,594,820,44,21,C.blue,true,"center");
  addNotes(s,"이 한 줄을 반복 배포의 기억 장치로 사용한다.");
}

// 5 — change and version
{
  const s=deck.slides.add(); s.background.fill=C.white; title(s,"변경 기록을 먼저 쓰고 버전을 한 칸 올린다",5);
  terminal(s,["cd \"D:\\01 PROJECTSRC\\codex\\quasar_tool\\vscode-extension\"","git status --short","npm pkg get version","npm version patch --no-git-tag-version"],56,146,740,342);
  box(s,850,150,330,330,"#F5F7FA",12);
  txt(s,"버전 선택",880,176,270,40,26,C.ink,true);
  [["PATCH","0.1.0 → 0.1.1","버그 수정"],["MINOR","0.1.1 → 0.2.0","기능 추가"],["MAJOR","0.2.0 → 1.0.0","호환성 변경"]].forEach((r,i)=>{txt(s,r[0],880,242+i*72,84,28,17,[C.green,C.blue,C.red][i],true);txt(s,r[1],972,237+i*72,174,28,19,C.ink,true);txt(s,r[2],972,266+i*72,174,24,16,C.muted);});
  box(s,56,532,1124,88,"#FFF7E8",12); txt(s,"CHANGELOG.md의 새 버전 제목과 package.json 버전이 반드시 같아야 한다.",82,532,1072,88,23,C.ink,true,"center");
  addNotes(s,"npm version에 --no-git-tag-version을 사용하면 작업 중 저장소에 자동 태그를 만들지 않는다.");
}

// 6 — install and package
{
  const s=deck.slides.add(); s.background.fill=C.white; title(s,"깨끗하게 설치한 뒤 새 VSIX를 만든다",6);
  terminal(s,["npm ci","npx --yes @vscode/vsce package","","# 생성 결과","quasar-tool-vscode-0.1.1.vsix"],56,148,760,414);
  txt(s,"패키징 성공 조건",864,158,310,42,26,C.ink,true);
  const checks=["오류가 없다","새 버전 파일이다","용량이 비정상적으로 크지 않다","media · generator · templates 포함",".env · PAT · API Key 미포함"];
  checks.forEach((v,i)=>{box(s,868,224+i*62,28,28,i===4?"#FFE3E3":"#DDF6EC",28);txt(s,i===4?"!":"✓",868,224+i*62,28,28,18,i===4?C.red:C.green,true,"center");txt(s,v,914,218+i*62,278,42,18,C.ink,i===4);});
  txt(s,"기존 VSIX를 재사용하지 말고 매번 다시 만든다",56,602,1120,42,23,C.red,true,"center");
  addNotes(s,"VSIX 파일명에 새 버전이 들어갔는지 확인한다. 비밀정보는 Marketplace 검사에서 차단될 수 있다.");
}

// 7 — local test
{
  const s=deck.slides.add(); s.background.fill=C.white; title(s,"게시 전에 일반 VS Code에 VSIX를 직접 설치한다",7);
  terminal(s,["code --install-extension `","  .\\quasar-tool-vscode-0.1.1.vsix --force"],52,150,720,190);
  box(s,826,150,382,190,"#EAF5FF",14); txt(s,"VS Code 화면에서",854,170,326,36,24,C.navy,true);
  ["1  Ctrl + Shift + X","2  우측 상단 …","3  Install from VSIX…","4  새 VSIX 선택"].forEach((v,i)=>txt(s,v,860,214+i*30,310,28,17,C.ink,i===3));
  txt(s,"필수 기능 시험",54,386,1120,40,27,C.ink,true);
  const tests=[".src/pages/*.json 열기","Screen 렌더링","Properties · Page Tree","Ctrl+S 저장","Vue 생성","Pinia 생성","PPT 기능","개발자 콘솔 오류"];
  tests.forEach((v,i)=>{const col=i%4,row=Math.floor(i/4); const x=54+col*288,y=448+row*76; box(s,x,y,254,56,i===7?"#FFF0F0":"#F3F6F9",10);txt(s,`${i+1}. ${v}`,x+14,y,226,56,17,i===7?C.red:C.ink,true,"center");});
  addNotes(s,"Extension Development Host뿐 아니라 실제 설치된 확장으로 시험해야 패키지 누락을 발견할 수 있다.");
}

// 8 — publish paths
{
  const s=deck.slides.add(); s.background.fill=C.white; title(s,"게시 방식은 수동 업로드와 명령 게시 중 하나를 선택한다",8);
  box(s,56,154,548,404,"#F5F7FA",14); box(s,676,154,548,404,"#EAF5FF",14);
  txt(s,"A. Marketplace 수동 업로드",86,184,488,52,28,C.ink,true);
  ["Publisher 관리 페이지 접속","ORUM 선택","기존 확장 선택","새 VSIX 업로드","검증 완료 확인"].forEach((v,i)=>{box(s,88,262+i*54,32,32,C.ink,32);txt(s,String(i+1),88,262+i*54,32,32,16,C.white,true,"center");txt(s,v,138,255+i*54,410,42,19,C.ink,i===3);});
  txt(s,"B. vsce 명령 게시",706,184,488,52,28,C.navy,true);
  terminal(s,["npx --yes @vscode/vsce login ORUM","npx --yes @vscode/vsce publish"],706,258,488,176,"PowerShell · Publisher 인증");
  txt(s,"처음·간헐 배포에 추천",104,584,450,42,21,C.green,true,"center");
  txt(s,"반복 자동화에 적합",724,584,450,42,21,C.blue,true,"center");
  addNotes(s,"Microsoft는 장기 자동화에서 Microsoft Entra ID 기반 인증을 권장한다. PAT를 문서나 저장소에 기록하지 않는다.");
}

// 9 — post publish
{
  const s=deck.slides.add(); s.background.fill=C.white; title(s,"게시 후 Marketplace와 새 설치 환경에서 다시 확인한다",9);
  const xs=[74,436,798]; const heads=["Marketplace","새로 설치","버전 확인"]; const bodies=["버전 · README · 아이콘\n게시 상태 확인","확장 ID로 강제 설치\n일반 VS Code에서 실행","설치 목록에서\n정확한 버전 조회"];
  xs.forEach((x,i)=>{box(s,x,178,310,284,i===1?"#EAF5FF":"#F5F7FA",14);box(s,x+105,206,100,100,[C.blue,C.green,C.navy][i],100);txt(s,["M","↓","✓"][i],x+105,206,100,100,46,C.white,true,"center");txt(s,heads[i],x+22,330,266,40,25,C.ink,true,"center");txt(s,bodies[i],x+26,382,258,62,18,C.muted,false,"center");});
  terminal(s,["code --install-extension ORUM.quasar-tool-vscode --force","code --list-extensions --show-versions |","  Select-String \"ORUM.quasar-tool-vscode\""],160,506,960,144);
  addNotes(s,"게시 직후 검색 반영에는 시간이 걸릴 수 있으므로 Marketplace 표시와 실제 설치를 모두 확인한다.");
}

// 10 — troubleshooting
{
  const s=deck.slides.add(); s.background.fill=C.white; title(s,"오류 메시지는 원인별로 바로 대응한다",10);
  const items=[
    ["Version already exists","버전 미증가","patch 버전 올리고 다시 패키징"],
    ["401 / 403","인증·권한 오류","ORUM 권한과 토큰 범위 확인"],
    ["수정사항이 안 보임","예전 VSIX 업로드","새 버전 VSIX를 다시 생성"],
    ["extension already exists","ID 불일치","publisher와 name 원복"],
    ["패키지가 너무 큼","불필요 파일 포함","files와 의존성 목록 점검"],
    ["이미지 오류","형식·URL 문제","PNG 아이콘과 HTTPS 이미지 사용"]
  ];
  txt(s,"메시지",58,146,340,34,18,C.muted,true); txt(s,"주요 원인",436,146,260,34,18,C.muted,true); txt(s,"바로 할 일",742,146,460,34,18,C.muted,true);
  items.forEach((r,i)=>{const y=194+i*68; box(s,52,y,1160,58,i%2?"#F8FAFC":"#EEF2F6",0);txt(s,r[0],70,y,330,58,18,i<2?C.red:C.ink,true,"left","Consolas");txt(s,r[1],436,y,260,58,18,C.ink,true);txt(s,r[2],742,y,440,58,18,C.blue,i<4);});
  addNotes(s,"Remove는 통계와 이름 재사용에 영향을 줄 수 있으므로 문제 해결 수단으로 사용하지 않는다.");
}

// 11 — one-page checklist
{
  const s=deck.slides.add(); s.background.fill=C.navy;
  txt(s,"한 장으로 끝내는 반복 배포",52,36,930,66,40,C.white,true); txt(s,"SAVE THIS SLIDE",1000,46,220,30,16,C.cyan,true,"right");
  const commands=[
    "cd \"D:\\01 PROJECTSRC\\codex\\quasar_tool\\vscode-extension\"",
    "npm version patch --no-git-tag-version",
    "npm ci",
    "npx --yes @vscode/vsce package",
    "code --install-extension .\\quasar-tool-vscode-새버전.vsix --force",
    "npx --yes @vscode/vsce publish"
  ];
  commands.forEach((v,i)=>{box(s,56,130+i*72,50,50,i===5?C.green:C.blue,50);txt(s,String(i+1),56,130+i*72,50,50,21,C.white,true,"center");txt(s,v,130,124+i*72,1088,60,19,"#F4F8FF",i===5,"left","Consolas");});
  box(s,56,580,1164,82,"#0B2A60",12); txt(s,"CHANGELOG = package.json 버전 = VSIX 파일명 = Marketplace 게시 버전",82,580,1112,82,24,C.cyan,true,"center");
  addNotes(s,"이 슬라이드만 열어도 반복 배포가 가능하다. 실제 게시 전에는 반드시 로컬 설치 시험을 완료한다.");
}

await fs.mkdir(TMP,{recursive:true});
async function saveBlob(blob, path) {
  await fs.writeFile(path, Buffer.from(await blob.arrayBuffer()));
}
for (const [i,s] of deck.slides.items.entries()) {
  const png=await deck.export({slide:s,format:"png",scale:1});
  await saveBlob(png, `${TMP}\\slide-${String(i+1).padStart(2,"0")}.png`);
  const layout=await s.export({format:"layout"});
  await fs.writeFile(`${TMP}\\slide-${String(i+1).padStart(2,"0")}.layout.json`,await layout.text());
}
const pptx=await PresentationFile.exportPptx(deck);
await pptx.save(OUT);
console.log(OUT);
