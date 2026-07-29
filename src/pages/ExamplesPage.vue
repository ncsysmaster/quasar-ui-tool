<template>
  <q-page class="examples-page">
    <main v-if="exampleType === 'dashboard'" class="dashboard">
      <header class="dashboard-header">
        <div class="example-heading-title">
          <span class="example-heading-icon"><q-icon name="dashboard" size="30px" /></span>
          <div>
            <h1>프로젝트 현황 Dashboard</h1>
            <span>화면 개발 현황과 생성 결과를 한눈에 확인합니다.</span>
          </div>
        </div>
        <div class="example-header-tools">
          <div class="example-navigation">QUASAR UI TOOL · DASHBOARD</div>
          <div class="header-actions">
            <q-select
              v-model="period"
              :options="periodOptions"
              dense
              outlined
              bg-color="white"
              aria-label="조회 기간"
            />
            <q-btn
              unelevated
              color="primary"
              icon="refresh"
              label="새로고침"
              @click="refreshDashboard"
            />
          </div>
        </div>
      </header>

      <section class="summary-grid" aria-label="요약 현황">
        <article v-for="item in summaryCards" :key="item.label" class="summary-card">
          <span class="summary-icon" :class="item.color">
            <q-icon :name="item.icon" size="27px" />
          </span>
          <div>
            <small>{{ item.label }}</small>
            <strong>{{ item.value }}</strong>
            <p :class="{ negative: item.negative }">
              <q-icon :name="item.negative ? 'south' : 'north'" />
              {{ item.change }} <span>지난달 대비</span>
            </p>
          </div>
          <div class="mini-bars" aria-hidden="true">
            <i
              v-for="(height, index) in item.bars"
              :key="index"
              :style="{ height: `${height}%` }"
            ></i>
          </div>
        </article>
      </section>

      <section class="dashboard-grid">
        <article class="panel trend-panel">
          <div class="panel-heading">
            <div>
              <h2>화면 생성 추이</h2>
              <p>최근 7개월간 JSON 및 Vue 화면 생성 현황</p>
            </div>
            <div class="legend">
              <span><i class="legend-blue"></i>화면 JSON</span>
              <span><i class="legend-cyan"></i>Vue 생성</span>
            </div>
          </div>

          <div class="line-chart">
            <div class="y-axis"><span>80</span><span>60</span><span>40</span><span>20</span><span>0</span></div>
            <div class="plot">
              <i v-for="line in 5" :key="line"></i>
              <svg viewBox="0 0 700 230" preserveAspectRatio="none" aria-label="화면 생성 추이 차트">
                <defs>
                  <linearGradient id="areaBlue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stop-color="#1976d2" stop-opacity=".24" />
                    <stop offset="1" stop-color="#1976d2" stop-opacity="0" />
                  </linearGradient>
                </defs>
                <path d="M0 188 L116 166 L233 151 L350 112 L466 124 L583 74 L700 50 L700 230 L0 230 Z" fill="url(#areaBlue)" />
                <polyline points="0,188 116,166 233,151 350,112 466,124 583,74 700,50" fill="none" stroke="#1976d2" stroke-width="4" />
                <polyline points="0,204 116,183 233,169 350,137 466,143 583,103 700,78" fill="none" stroke="#20b7c9" stroke-width="4" stroke-dasharray="8 5" />
                <g fill="#fff" stroke="#1976d2" stroke-width="3">
                  <circle cx="0" cy="188" r="5" /><circle cx="116" cy="166" r="5" />
                  <circle cx="233" cy="151" r="5" /><circle cx="350" cy="112" r="5" />
                  <circle cx="466" cy="124" r="5" /><circle cx="583" cy="74" r="5" />
                  <circle cx="700" cy="50" r="5" />
                </g>
              </svg>
              <div class="x-axis"><span>1월</span><span>2월</span><span>3월</span><span>4월</span><span>5월</span><span>6월</span><span>7월</span></div>
            </div>
          </div>
        </article>

        <article class="panel status-panel">
          <div class="panel-heading">
            <div>
              <h2>작업 상태</h2>
              <p>전체 화면 진행 상태</p>
            </div>
            <q-btn flat round dense icon="more_horiz" />
          </div>
          <div class="donut-area">
            <div class="donut-chart">
              <div><strong>128</strong><span>전체 화면</span></div>
            </div>
            <ul>
              <li v-for="status in statuses" :key="status.label">
                <span><i :style="{ background: status.color }"></i>{{ status.label }}</span>
                <strong>{{ status.value }}<small>{{ status.percent }}%</small></strong>
              </li>
            </ul>
          </div>
        </article>

        <article class="panel component-panel">
          <div class="panel-heading">
            <div>
              <h2>컴포넌트 사용 현황</h2>
              <p>현재 프로젝트에 배치된 주요 컴포넌트</p>
            </div>
            <q-icon name="widgets" size="25px" />
          </div>
          <div class="bar-chart">
            <div v-for="item in componentUsage" :key="item.label">
              <span><q-icon :name="item.icon" />{{ item.label }}</span>
              <div><i :style="{ width: `${item.percent}%`, background: item.color }"></i></div>
              <strong>{{ item.value }}</strong>
            </div>
          </div>
        </article>

        <article class="panel activity-panel">
          <div class="panel-heading">
            <div>
              <h2>최근 생성 화면</h2>
              <p>최근 수정되거나 생성된 페이지 목록</p>
            </div>
            <q-btn flat no-caps color="primary" label="전체 보기" icon-right="east" />
          </div>
          <div class="activity-table">
            <div class="table-head">
              <span>화면명</span><span>유형</span><span>담당자</span><span>수정일</span><span>상태</span>
            </div>
            <div v-for="row in recentScreens" :key="row.name" class="table-row">
              <span class="screen-name">
                <i><q-icon :name="row.icon" /></i>
                <b>{{ row.name }}<small>{{ row.file }}</small></b>
              </span>
              <span>{{ row.type }}</span>
              <span class="owner"><i>{{ row.initial }}</i>{{ row.owner }}</span>
              <span>{{ row.date }}</span>
              <span><em :class="row.statusClass">{{ row.status }}</em></span>
            </div>
          </div>
        </article>
      </section>
    </main>

    <main v-else-if="exampleType === 'layout'" class="layout-example">
      <header class="layout-page-header">
        <div class="example-heading-title">
          <span class="example-heading-icon"><q-icon name="view_quilt" size="30px" /></span>
          <div>
            <h1>Application Layout</h1>
            <span>Header, Drawer, Content, Aside, Footer로 구성된 반응형 화면입니다.</span>
          </div>
        </div>
        <div class="example-header-tools">
          <div class="example-navigation">QUASAR UI TOOL · LAYOUT</div>
          <div class="device-switcher" aria-label="미리보기 화면 크기">
            <button
              v-for="device in devices"
              :key="device.id"
              :class="{ active: previewDevice === device.id }"
              :aria-label="`${device.label} 미리보기`"
              @click="previewDevice = device.id"
            >
              <q-icon :name="device.icon" />
              <span>{{ device.label }}</span>
            </button>
          </div>
        </div>
      </header>

      <section class="layout-workspace">
        <div class="layout-info">
          <span class="live-dot"><i></i>LIVE PREVIEW</span>
          <strong>{{ currentDeviceLabel }} 화면</strong>
          <small>각 영역 위에 마우스를 올리면 역할을 확인할 수 있습니다.</small>
        </div>

        <div class="preview-stage">
          <div class="app-preview" :class="`preview-${previewDevice}`">
            <header class="preview-header" title="Header 영역">
              <div class="preview-brand"><q-icon name="grid_view" /><strong>Q Admin</strong></div>
              <div class="preview-search"><q-icon name="search" /><span>화면 또는 메뉴 검색</span></div>
              <div class="preview-header-actions">
                <q-icon name="notifications_none" />
                <i>MK</i>
                <span>관리자</span>
              </div>
            </header>

            <div class="preview-body">
              <aside class="preview-drawer" title="Left Drawer 영역">
                <div class="drawer-user">
                  <i>MK</i>
                  <span><strong>문관리</strong><small>Administrator</small></span>
                </div>
                <nav>
                  <span class="selected"><q-icon name="dashboard" />Dashboard</span>
                  <span><q-icon name="people" />사용자 관리</span>
                  <span><q-icon name="inventory_2" />상품 관리</span>
                  <span><q-icon name="receipt_long" />주문 관리</span>
                  <span><q-icon name="monitoring" />통계</span>
                </nav>
                <span class="drawer-bottom"><q-icon name="settings" />환경 설정</span>
              </aside>

              <main class="preview-content" title="Main Content 영역">
                <div class="preview-breadcrumb">
                  <span>Home</span><q-icon name="chevron_right" /><strong>Dashboard</strong>
                </div>
                <div class="preview-title">
                  <div><h2>업무 Dashboard</h2><p>오늘의 주요 현황을 확인하세요.</p></div>
                  <button><q-icon name="add" />새 작업</button>
                </div>
                <div class="preview-stats">
                  <div v-for="stat in layoutStats" :key="stat.label">
                    <span :class="stat.class"><q-icon :name="stat.icon" /></span>
                    <small>{{ stat.label }}</small>
                    <strong>{{ stat.value }}</strong>
                  </div>
                </div>
                <div class="preview-main-grid">
                  <div class="preview-chart-card">
                    <strong>주간 처리 현황</strong>
                    <div class="preview-columns">
                      <i v-for="(bar, index) in previewBars" :key="index" :style="{ height: `${bar}%` }"></i>
                    </div>
                    <div class="preview-days"><span>월</span><span>화</span><span>수</span><span>목</span><span>금</span><span>토</span><span>일</span></div>
                  </div>
                  <div class="preview-list-card">
                    <strong>최근 알림</strong>
                    <div v-for="item in layoutNotifications" :key="item.title">
                      <i :class="item.color"><q-icon :name="item.icon" /></i>
                      <span><b>{{ item.title }}</b><small>{{ item.time }}</small></span>
                    </div>
                  </div>
                </div>
              </main>

              <aside class="preview-aside" title="Right Aside 영역">
                <strong>오늘의 일정</strong>
                <div class="mini-calendar">
                  <span v-for="day in ['월','화','수','목','금','토','일']" :key="day">{{ day }}</span>
                  <i v-for="date in 14" :key="date" :class="{ today: date === 8 }">{{ date }}</i>
                </div>
                <strong>진행 중 작업</strong>
                <div class="task-progress" v-for="task in layoutTasks" :key="task.label">
                  <span>{{ task.label }}<b>{{ task.value }}%</b></span>
                  <i><em :style="{ width: `${task.value}%` }"></em></i>
                </div>
              </aside>
            </div>

            <footer class="preview-footer" title="Footer 영역">
              <span>© 2026 Quasar UI Tool</span>
              <span>v1.0.0 · Help · Privacy</span>
            </footer>
          </div>
        </div>
      </section>

      <section class="layout-anatomy">
        <div class="anatomy-heading">
          <p>LAYOUT ANATOMY</p>
          <h2>화면 영역 구성</h2>
          <span>Quasar Layout을 구성하는 주요 영역과 역할입니다.</span>
        </div>
        <div class="anatomy-grid">
          <article v-for="(item, index) in layoutAnatomy" :key="item.title">
            <span :class="item.color"><q-icon :name="item.icon" /></span>
            <div>
              <small>0{{ index + 1 }}</small>
              <h3>{{ item.title }}</h3>
              <p>{{ item.description }}</p>
              <code>{{ item.component }}</code>
            </div>
          </article>
        </div>
      </section>

      <section class="responsive-guide">
        <div>
          <p>RESPONSIVE BEHAVIOR</p>
          <h2>화면 크기에 따라 자동으로 조정됩니다</h2>
        </div>
        <div class="breakpoint-flow">
          <article>
            <q-icon name="desktop_windows" />
            <strong>Desktop</strong>
            <span>≥ 1200px</span>
            <p>좌·우 패널과 전체 콘텐츠 표시</p>
          </article>
          <q-icon name="east" />
          <article>
            <q-icon name="tablet_mac" />
            <strong>Tablet</strong>
            <span>768–1199px</span>
            <p>우측 패널 숨김, Drawer 유지</p>
          </article>
          <q-icon name="east" />
          <article>
            <q-icon name="smartphone" />
            <strong>Mobile</strong>
            <span>&lt; 768px</span>
            <p>Drawer 오버레이 및 단일 열 구성</p>
          </article>
        </div>
      </section>
    </main>

    <main v-else-if="exampleType === 'component'" class="component-example">
      <header class="component-example-header">
        <div class="example-heading-title">
          <span class="example-heading-icon"><q-icon name="widgets" size="30px" /></span>
          <div>
            <h1>Component Studio</h1>
            <span>UI Tool에서 Quasar 컴포넌트를 선택하고 속성과 상태를 실시간으로 확인합니다.</span>
          </div>
        </div>
        <div class="example-header-tools">
          <div class="example-navigation">QUASAR UI TOOL · COMPONENT</div>
          <div class="component-header-actions">
            <q-btn outline color="primary" icon="content_copy" label="JSON 복사" />
            <q-btn unelevated color="primary" icon="code" label="Vue 코드 생성" />
          </div>
        </div>
      </header>

      <section class="component-studio">
        <aside class="component-palette">
          <div class="studio-panel-title">
            <span><q-icon name="widgets" /></span>
            <div><strong>Component Palette</strong><small>사용할 컴포넌트를 선택하세요.</small></div>
          </div>
          <q-input v-model="componentKeyword" dense outlined clearable placeholder="컴포넌트 검색">
            <template #prepend><q-icon name="search" /></template>
          </q-input>
          <div class="component-category-list">
            <button
              v-for="item in filteredComponentCatalog"
              :key="item.id"
              :class="{ active: selectedComponentId === item.id }"
              @click="selectedComponentId = item.id"
            >
              <span :class="item.color"><q-icon :name="item.icon" /></span>
              <div><strong>{{ item.name }}</strong><small>{{ item.tag }}</small></div>
              <q-icon name="chevron_right" />
            </button>
          </div>
        </aside>

        <section class="component-canvas">
          <div class="canvas-toolbar">
            <div>
              <span class="live-dot"><i></i>LIVE PREVIEW</span>
              <strong>{{ selectedComponent.name }}</strong>
            </div>
            <div class="canvas-devices">
              <button v-for="device in devices" :key="device.id" :class="{ active: componentDevice === device.id }" @click="componentDevice = device.id">
                <q-icon :name="device.icon" />
              </button>
            </div>
          </div>
          <div class="component-preview-stage" :class="`component-${componentDevice}`">
            <div class="component-demo-card">
              <div class="demo-label">{{ selectedComponent.tag }}</div>

              <template v-if="selectedComponentId === 'button'">
                <q-btn :color="componentProps.color" :outline="componentProps.outline" :rounded="componentProps.rounded" icon="save" :label="componentProps.label" />
              </template>
              <template v-else-if="selectedComponentId === 'input'">
                <q-input v-model="componentInputValue" :label="componentProps.label" :outlined="componentProps.outline" clearable>
                  <template #prepend><q-icon name="person" /></template>
                </q-input>
              </template>
              <template v-else-if="selectedComponentId === 'select'">
                <q-select v-model="componentSelectValue" :options="componentSelectOptions" :label="componentProps.label" outlined />
              </template>
              <template v-else-if="selectedComponentId === 'card'">
                <q-card class="sample-card">
                  <q-card-section><div class="text-h6">프로젝트 요약</div><div class="text-grey-7">Quasar UI Tool Component</div></q-card-section>
                  <q-separator />
                  <q-card-actions align="right"><q-btn flat color="primary" label="취소" /><q-btn unelevated color="primary" label="확인" /></q-card-actions>
                </q-card>
              </template>
              <template v-else-if="selectedComponentId === 'table'">
                <q-markup-table flat bordered>
                  <thead><tr><th class="text-left">화면명</th><th>상태</th><th>컴포넌트</th></tr></thead>
                  <tbody><tr><td>Dashboard</td><td><q-badge color="positive">완료</q-badge></td><td>24</td></tr><tr><td>User Admin</td><td><q-badge color="primary">진행</q-badge></td><td>18</td></tr></tbody>
                </q-markup-table>
              </template>
              <template v-else>
                <div class="dialog-sample">
                  <div><q-icon name="info" /><strong>저장하시겠습니까?</strong></div>
                  <p>현재 편집 중인 화면 JSON을 저장합니다.</p>
                  <footer><q-btn flat color="grey-7" label="취소" /><q-btn unelevated color="primary" label="저장" /></footer>
                </div>
              </template>
            </div>
          </div>
          <div class="component-code">
            <div><span>Generated JSON</span><q-icon name="data_object" /></div>
            <code>{{ generatedComponentJson }}</code>
          </div>
        </section>

        <aside class="component-properties">
          <div class="studio-panel-title">
            <span><q-icon name="tune" /></span>
            <div><strong>Properties</strong><small>선택한 컴포넌트의 속성입니다.</small></div>
          </div>
          <label><span>Label</span><q-input v-model="componentProps.label" dense outlined /></label>
          <label><span>Color</span><q-select v-model="componentProps.color" :options="componentColorOptions" dense outlined /></label>
          <div class="property-switch"><span><strong>Outlined</strong><small>외곽선 스타일 사용</small></span><q-toggle v-model="componentProps.outline" color="primary" /></div>
          <div class="property-switch"><span><strong>Rounded</strong><small>둥근 모서리 적용</small></span><q-toggle v-model="componentProps.rounded" color="primary" /></div>
          <div class="property-divider"></div>
          <div class="tree-title"><strong>Page Tree</strong><q-icon name="account_tree" /></div>
          <div class="component-tree">
            <span><q-icon name="expand_more" />q-page</span>
            <span><q-icon name="subdirectory_arrow_right" />q-card</span>
            <span class="selected"><q-icon name="subdirectory_arrow_right" />{{ selectedComponent.tag }}</span>
          </div>
        </aside>
      </section>

      <section class="component-feature-cards">
        <article v-for="feature in componentFeatures" :key="feature.title">
          <span :class="feature.color"><q-icon :name="feature.icon" /></span>
          <div><h2>{{ feature.title }}</h2><p>{{ feature.description }}</p></div>
        </article>
      </section>
    </main>

    <main v-else-if="exampleType === 'form'" class="form-example">
      <header class="form-example-header">
        <div class="example-heading-title">
          <span class="example-heading-icon"><q-icon name="dynamic_form" size="30px" /></span>
          <div>
            <h1>Product Form</h1>
            <span>UI Tool의 Form 컴포넌트와 데이터 바인딩으로 구성한 상품 등록 화면입니다.</span>
          </div>
        </div>
        <div class="example-header-tools">
          <div class="example-navigation">QUASAR UI TOOL · FORM</div>
          <div class="form-header-actions">
            <q-btn outline color="primary" icon="visibility" label="미리보기" />
            <q-btn unelevated color="primary" icon="save" label="임시 저장" @click="formSaved = true" />
          </div>
        </div>
      </header>

      <section class="form-progress">
        <div v-for="(step, index) in formSteps" :key="step.label" :class="{ active: formStep >= index + 1 }">
          <span><q-icon :name="formStep > index + 1 ? 'check' : step.icon" /></span>
          <div><small>STEP {{ index + 1 }}</small><strong>{{ step.label }}</strong></div>
          <i v-if="index < formSteps.length - 1"></i>
        </div>
      </section>

      <section class="form-workspace">
        <div class="form-main-card">
          <div class="form-section-heading">
            <span><q-icon name="inventory_2" /></span>
            <div><h2>상품 기본 정보</h2><p><b>*</b> 표시는 필수 입력 항목입니다.</p></div>
          </div>

          <div class="product-form-grid">
            <label class="field-wide">
              <span>상품명 <b>*</b></span>
              <q-input v-model="productForm.name" outlined placeholder="상품명을 입력하세요" :error="formSubmitted && !productForm.name" error-message="상품명은 필수입니다.">
                <template #prepend><q-icon name="sell" /></template>
              </q-input>
            </label>
            <label>
              <span>상품 분류 <b>*</b></span>
              <q-select v-model="productForm.category" :options="productCategoryOptions" outlined placeholder="분류 선택" />
            </label>
            <label>
              <span>판매 상태</span>
              <q-select v-model="productForm.status" :options="productStatusOptions" outlined />
            </label>
            <label>
              <span>판매 가격 <b>*</b></span>
              <q-input v-model.number="productForm.price" type="number" outlined suffix="원" placeholder="0" />
            </label>
            <label>
              <span>재고 수량</span>
              <q-input v-model.number="productForm.stock" type="number" outlined suffix="개" />
            </label>
            <label class="field-wide">
              <span>상품 설명</span>
              <q-input v-model="productForm.description" outlined type="textarea" rows="4" placeholder="상품의 특징과 상세 내용을 입력하세요." counter maxlength="500" />
            </label>
          </div>

          <div class="form-subsection">
            <div class="form-section-heading compact">
              <span><q-icon name="image" /></span>
              <div><h2>상품 이미지</h2><p>대표 이미지를 등록하세요.</p></div>
            </div>
            <div class="image-upload-zone">
              <span><q-icon name="cloud_upload" /></span>
              <strong>이미지를 드래그하거나 클릭하여 업로드</strong>
              <small>PNG, JPG · 최대 10MB · 권장 크기 1200×1200px</small>
              <q-btn outline color="primary" icon="add_photo_alternate" label="파일 선택" />
            </div>
          </div>

          <div class="form-options">
            <div><span><strong>추천 상품</strong><small>메인 화면 추천 영역에 노출합니다.</small></span><q-toggle v-model="productForm.featured" color="primary" /></div>
            <div><span><strong>재고 알림</strong><small>재고가 10개 이하이면 담당자에게 알립니다.</small></span><q-toggle v-model="productForm.stockAlert" color="primary" /></div>
          </div>

          <footer class="form-actions">
            <q-btn flat color="grey-7" icon="restart_alt" label="초기화" @click="resetProductForm" />
            <div>
              <q-btn outline color="primary" label="이전" :disable="formStep === 1" @click="formStep--" />
              <q-btn unelevated color="primary" :label="formStep === 3 ? '등록하기' : '다음 단계'" icon-right="arrow_forward" @click="submitProductForm" />
            </div>
          </footer>
        </div>

        <aside class="form-side-panel">
          <div class="binding-card">
            <div class="side-panel-heading"><span><q-icon name="hub" /></span><div><strong>Data Binding</strong><small>Pinia Store 연결 상태</small></div></div>
            <div class="store-name"><q-icon name="database" /><span><small>STORE</small><strong>useProductStore</strong></span><em>Connected</em></div>
            <ul>
              <li><span>상품명</span><code>product.name</code></li>
              <li><span>상품 분류</span><code>product.category</code></li>
              <li><span>판매 가격</span><code>product.price</code></li>
              <li><span>판매 상태</span><code>product.status</code></li>
            </ul>
          </div>

          <div class="validation-card">
            <div class="side-panel-heading"><span><q-icon name="fact_check" /></span><div><strong>Validation</strong><small>입력값 검증 규칙</small></div></div>
            <div v-for="rule in validationRules" :key="rule.label">
              <q-icon :name="rule.valid ? 'check_circle' : 'radio_button_unchecked'" :class="{ valid: rule.valid }" />
              <span><strong>{{ rule.label }}</strong><small>{{ rule.rule }}</small></span>
            </div>
          </div>

          <div class="form-json-card">
            <div class="side-panel-heading"><span><q-icon name="data_object" /></span><div><strong>Form JSON</strong><small>실시간 데이터 미리보기</small></div></div>
            <code>{{ productFormJson }}</code>
          </div>
        </aside>
      </section>

      <q-banner v-if="formSaved" class="form-save-banner" rounded inline-actions>
        <template #avatar><q-icon name="check_circle" color="positive" /></template>
        입력 중인 상품 정보가 임시 저장되었습니다.
        <template #action><q-btn flat color="primary" label="확인" @click="formSaved = false" /></template>
      </q-banner>
    </main>

    <main v-else-if="exampleType === 'page'" class="page-example">
      <header class="page-example-header">
        <div class="example-heading-title">
          <span class="example-heading-icon"><q-icon name="admin_panel_settings" size="30px" /></span>
          <div>
            <h1>사용자 관리</h1>
            <span>사용자 정보를 조회하고 권한 및 상태를 관리합니다.</span>
          </div>
        </div>
        <div class="example-header-tools">
          <div class="example-navigation">QUASAR UI TOOL · ADMIN</div>
          <div class="admin-header-actions">
            <q-btn outline color="primary" icon="file_download" label="Excel" />
            <q-btn unelevated color="primary" icon="person_add" label="사용자 등록" @click="openNewUser" />
          </div>
        </div>
      </header>

      <section class="page-search-card">
        <div class="search-card-title">
          <span><q-icon name="manage_search" /></span>
          <div><strong>조회 조건</strong><small>검색 조건을 입력한 후 조회 버튼을 클릭하세요.</small></div>
        </div>
        <div class="search-fields">
          <label>
            <span>사용자 구분</span>
            <q-select v-model="pageSearch.type" :options="userTypeOptions" dense outlined clearable placeholder="전체" />
          </label>
          <label>
            <span>사용 상태</span>
            <q-select v-model="pageSearch.status" :options="userStatusOptions" dense outlined clearable placeholder="전체" />
          </label>
          <label class="search-keyword">
            <span>사용자 검색</span>
            <q-input v-model="pageSearch.keyword" dense outlined clearable placeholder="이름, 아이디 또는 이메일" @keyup.enter="applyPageSearch">
              <template #prepend><q-icon name="search" /></template>
            </q-input>
          </label>
          <div class="search-actions">
            <q-btn outline color="grey-7" icon="restart_alt" label="초기화" @click="resetPageSearch" />
            <q-btn unelevated color="primary" icon="search" label="조회" @click="applyPageSearch" />
          </div>
        </div>
      </section>

      <section class="page-summary">
        <article v-for="item in userSummary" :key="item.label">
          <span :class="item.color"><q-icon :name="item.icon" /></span>
          <div><small>{{ item.label }}</small><strong>{{ item.value }}</strong><p>{{ item.caption }}</p></div>
        </article>
      </section>

      <section class="user-list-card">
        <div class="user-list-heading">
          <div>
            <h2>사용자 목록</h2>
            <p>총 <strong>{{ filteredPageRows.length }}</strong>명의 사용자가 조회되었습니다.</p>
          </div>
          <div>
            <q-btn flat round dense icon="filter_list" aria-label="필터" />
            <q-btn flat round dense icon="view_column" aria-label="컬럼 설정" />
            <q-btn flat round dense icon="more_vert" aria-label="더보기" />
          </div>
        </div>

        <div class="user-table-wrap">
          <table class="user-table">
            <thead>
              <tr>
                <th><q-checkbox v-model="selectAllUsers" dense /></th>
                <th>사용자</th>
                <th>부서</th>
                <th>사용자 구분</th>
                <th>권한</th>
                <th>최근 접속</th>
                <th>상태</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="user in filteredPageRows"
                :key="user.id"
                class="clickable-user-row"
                tabindex="0"
                @click="openUserDetail(user)"
                @keyup.enter="openUserDetail(user)"
              >
                <td><q-checkbox v-model="user.selected" dense @click.stop /></td>
                <td>
                  <div class="table-user">
                    <i :style="{ background: user.avatarColor }">{{ user.initial }}</i>
                    <span><strong>{{ user.name }}</strong><small>{{ user.id }} · {{ user.email }}</small></span>
                  </div>
                </td>
                <td><span class="department"><q-icon name="business" />{{ user.department }}</span></td>
                <td>{{ user.type }}</td>
                <td><em class="role-badge" :class="user.roleClass">{{ user.role }}</em></td>
                <td><span class="last-login">{{ user.lastLogin }}<small>{{ user.loginTime }}</small></span></td>
                <td><em class="user-status" :class="user.statusClass"><i></i>{{ user.status }}</em></td>
                <td><q-btn flat round dense icon="more_horiz" @click.stop="openUserDetail(user)" /></td>
              </tr>
              <tr v-if="filteredPageRows.length === 0">
                <td colspan="8" class="empty-users"><q-icon name="search_off" />검색 조건에 맞는 사용자가 없습니다.</td>
              </tr>
            </tbody>
          </table>
        </div>

        <footer class="table-footer">
          <span>선택 {{ selectedUserCount }}명</span>
          <div class="pagination">
            <button disabled><q-icon name="chevron_left" /></button>
            <button class="active">1</button><button>2</button><button>3</button><button>4</button>
            <button><q-icon name="chevron_right" /></button>
          </div>
          <span>페이지당 10개 <q-icon name="expand_more" /></span>
        </footer>
      </section>

      <q-dialog v-model="showUserPanel">
          <q-card class="user-detail-popup">
            <header>
              <div><p>USER DETAIL</p><h2>{{ selectedUser?.name || '신규 사용자 등록' }}</h2></div>
              <q-btn flat round dense icon="close" @click="showUserPanel = false" />
            </header>
            <div class="detail-profile">
              <i :style="{ background: selectedUser?.avatarColor || '#1976d2' }">{{ selectedUser?.initial || '+' }}</i>
              <div><strong>{{ selectedUser?.name || '사용자 정보 입력' }}</strong><span>{{ selectedUser?.email || '새로운 사용자를 등록합니다.' }}</span></div>
            </div>
            <div class="detail-form">
              <label><span>사용자 이름</span><q-input :model-value="selectedUser?.name" outlined dense placeholder="이름 입력" /></label>
              <label><span>이메일</span><q-input :model-value="selectedUser?.email" outlined dense placeholder="email@example.com" /></label>
              <label><span>소속 부서</span><q-select :model-value="selectedUser?.department" :options="departmentOptions" outlined dense placeholder="부서 선택" /></label>
              <div class="detail-form-row">
                <label><span>사용자 구분</span><q-select :model-value="selectedUser?.type" :options="userTypeOptions" outlined dense /></label>
                <label><span>사용 상태</span><q-select :model-value="selectedUser?.status" :options="userStatusOptions" outlined dense /></label>
              </div>
              <label><span>사용 권한</span><q-select :model-value="selectedUser?.role" :options="roleOptions" outlined dense /></label>
              <label><span>설명</span><q-input outlined type="textarea" rows="3" placeholder="사용자에 대한 설명을 입력하세요." /></label>
            </div>
            <footer>
              <q-btn outline color="grey-7" label="취소" @click="showUserPanel = false" />
              <q-btn unelevated color="primary" icon="save" label="저장" @click="showUserPanel = false" />
            </footer>
          </q-card>
      </q-dialog>
    </main>

    <main v-else class="example-placeholder">
      <q-icon name="dashboard_customize" size="68px" />
      <h1>{{ exampleTitle }} 예제</h1>
      <p>Quasar UI Tool로 제작한 {{ exampleTitle }} 예제 화면을 준비하고 있습니다.</p>
      <q-btn color="primary" unelevated label="Dashboard 예제 보기" to="/examples/dashboard" />
    </main>
  </q-page>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const period = ref('최근 7개월')
const previewDevice = ref('desktop')
const componentDevice = ref('desktop')
const componentKeyword = ref('')
const selectedComponentId = ref('button')
const componentInputValue = ref('')
const componentSelectValue = ref('개발팀')
const componentSelectOptions = ['개발팀', '디자인팀', '기획팀', '운영팀']
const componentColorOptions = ['primary', 'secondary', 'positive', 'warning', 'negative']
const componentProps = reactive({ label: '저장하기', color: 'primary', outline: false, rounded: false })
const formStep = ref(1)
const formSubmitted = ref(false)
const formSaved = ref(false)
const productCategoryOptions = ['디지털 기기', '생활용품', '패션', '식품', '도서']
const productStatusOptions = ['판매 준비', '판매 중', '일시 품절', '판매 종료']
const productForm = reactive({
  name: '',
  category: '디지털 기기',
  status: '판매 준비',
  price: 0,
  stock: 50,
  description: '',
  featured: true,
  stockAlert: true
})
const showUserPanel = ref(false)
const selectedUser = ref(null)
const selectAllUsers = ref(false)
const appliedKeyword = ref('')
const appliedType = ref(null)
const appliedStatus = ref(null)
const pageSearch = reactive({ type: null, status: null, keyword: '' })
const periodOptions = ['최근 7일', '최근 30일', '최근 7개월', '최근 1년']

const exampleType = computed(() => route.params.type || 'dashboard')
const exampleTitle = computed(() => {
  const labels = { layout: 'Layout', page: 'Page', component: 'Component', form: 'Form' }
  return labels[exampleType.value] || 'Dashboard'
})

const currentDeviceLabel = computed(
  () => devices.find((device) => device.id === previewDevice.value)?.label || 'Desktop'
)

const devices = [
  { id: 'desktop', label: 'Desktop', icon: 'desktop_windows' },
  { id: 'tablet', label: 'Tablet', icon: 'tablet_mac' },
  { id: 'mobile', label: 'Mobile', icon: 'smartphone' }
]

const componentCatalog = [
  { id: 'button', name: 'Button', tag: 'q-btn', icon: 'smart_button', color: 'palette-blue' },
  { id: 'input', name: 'Input', tag: 'q-input', icon: 'input', color: 'palette-cyan' },
  { id: 'select', name: 'Select', tag: 'q-select', icon: 'arrow_drop_down_circle', color: 'palette-violet' },
  { id: 'card', name: 'Card', tag: 'q-card', icon: 'crop_landscape', color: 'palette-orange' },
  { id: 'table', name: 'Table', tag: 'q-table', icon: 'table_chart', color: 'palette-green' },
  { id: 'dialog', name: 'Dialog', tag: 'q-dialog', icon: 'web_asset', color: 'palette-rose' }
]

const filteredComponentCatalog = computed(() => {
  const keyword = componentKeyword.value.trim().toLowerCase()
  return componentCatalog.filter((item) => !keyword || `${item.name} ${item.tag}`.toLowerCase().includes(keyword))
})

const selectedComponent = computed(
  () => componentCatalog.find((item) => item.id === selectedComponentId.value) || componentCatalog[0]
)

const generatedComponentJson = computed(() => JSON.stringify({
  component: selectedComponent.value.tag,
  props: {
    label: componentProps.label,
    color: componentProps.color,
    outlined: componentProps.outline,
    rounded: componentProps.rounded
  }
}, null, 2))

const componentFeatures = [
  { title: 'Drag & Drop', description: 'Palette에서 선택한 컴포넌트를 캔버스에 빠르게 배치합니다.', icon: 'drag_indicator', color: 'feature-blue' },
  { title: '실시간 속성 편집', description: 'Properties 변경 결과를 비주얼 에디터에서 즉시 확인합니다.', icon: 'tune', color: 'feature-violet' },
  { title: 'JSON · Vue 생성', description: '완성한 화면 정의를 JSON으로 저장하고 Vue 코드로 생성합니다.', icon: 'code', color: 'feature-green' }
]

const formSteps = [
  { label: '기본 정보', icon: 'edit_note' },
  { label: '옵션 설정', icon: 'tune' },
  { label: '검토 및 등록', icon: 'task_alt' }
]

const validationRules = computed(() => [
  { label: '상품명 필수', rule: 'required · 최대 100자', valid: Boolean(productForm.name) },
  { label: '상품 분류', rule: 'categoryId required', valid: Boolean(productForm.category) },
  { label: '판매 가격', rule: '0원 이상 숫자', valid: Number(productForm.price) >= 0 },
  { label: '재고 수량', rule: '0개 이상 정수', valid: Number(productForm.stock) >= 0 }
])

const productFormJson = computed(() => JSON.stringify(productForm, null, 2))

function resetProductForm() {
  Object.assign(productForm, {
    name: '',
    category: '디지털 기기',
    status: '판매 준비',
    price: 0,
    stock: 50,
    description: '',
    featured: true,
    stockAlert: true
  })
  formStep.value = 1
  formSubmitted.value = false
}

function submitProductForm() {
  formSubmitted.value = true
  if (!productForm.name) return
  if (formStep.value < 3) {
    formStep.value += 1
    return
  }
  formSaved.value = true
}

const layoutStats = [
  { label: '신규 주문', value: '248', icon: 'shopping_bag', class: 'stat-blue' },
  { label: '처리 대기', value: '32', icon: 'schedule', class: 'stat-orange' },
  { label: '완료 업무', value: '186', icon: 'task_alt', class: 'stat-green' },
  { label: '신규 문의', value: '17', icon: 'forum', class: 'stat-violet' }
]

const previewBars = [42, 57, 48, 72, 63, 82, 91]

const layoutNotifications = [
  { title: '신규 주문이 등록되었습니다.', time: '5분 전', icon: 'shopping_cart', color: 'notice-blue' },
  { title: '상품 재고를 확인해 주세요.', time: '28분 전', icon: 'inventory', color: 'notice-orange' },
  { title: '월간 보고서가 생성되었습니다.', time: '1시간 전', icon: 'description', color: 'notice-green' }
]

const layoutTasks = [
  { label: '화면 설계', value: 84 },
  { label: '데이터 연동', value: 62 },
  { label: '통합 테스트', value: 38 }
]

const layoutAnatomy = [
  { title: 'Header', description: '브랜드, 검색, 알림과 사용자 메뉴를 표시합니다.', component: '<q-header>', icon: 'web_asset', color: 'anatomy-blue' },
  { title: 'Left Drawer', description: '서비스의 주요 화면으로 이동하는 메뉴입니다.', component: '<q-drawer>', icon: 'view_sidebar', color: 'anatomy-cyan' },
  { title: 'Page Container', description: '라우트에 따라 실제 업무 화면이 표시됩니다.', component: '<q-page-container>', icon: 'dashboard_customize', color: 'anatomy-violet' },
  { title: 'Right Aside', description: '일정, 작업 현황 등 보조 정보를 제공합니다.', component: '<aside>', icon: 'view_week', color: 'anatomy-orange' },
  { title: 'Footer', description: '버전, 저작권 및 부가 링크를 표시합니다.', component: '<q-footer>', icon: 'bottom_navigation', color: 'anatomy-green' }
]

const userTypeOptions = ['내부 사용자', '외부 사용자', '관리자']
const userStatusOptions = ['정상', '대기', '휴면', '정지']
const departmentOptions = ['플랫폼개발팀', '서비스기획팀', '디자인팀', '영업팀', '고객지원팀']
const roleOptions = ['Super Admin', 'Manager', 'Editor', 'Viewer']

const userSummary = [
  { label: '전체 사용자', value: '248', caption: '이번 달 +12명', icon: 'groups', color: 'user-blue' },
  { label: '활성 사용자', value: '219', caption: '전체의 88.3%', icon: 'verified_user', color: 'user-green' },
  { label: '접속 대기', value: '18', caption: '승인 필요 6명', icon: 'schedule', color: 'user-orange' },
  { label: '휴면 · 정지', value: '11', caption: '관리 대상', icon: 'person_off', color: 'user-rose' }
]

const pageUsers = reactive([
  { id: 'kim.doyun', name: '김도윤', initial: '김', email: 'doyun.kim@example.com', department: '플랫폼개발팀', type: '관리자', role: 'Super Admin', roleClass: 'role-admin', lastLogin: '오늘', loginTime: '10:24', status: '정상', statusClass: 'status-active', avatarColor: '#397bd1', selected: false },
  { id: 'lee.seojun', name: '이서준', initial: '이', email: 'seojun.lee@example.com', department: '서비스기획팀', type: '내부 사용자', role: 'Manager', roleClass: 'role-manager', lastLogin: '오늘', loginTime: '09:18', status: '정상', statusClass: 'status-active', avatarColor: '#7655c7', selected: false },
  { id: 'park.jiwoo', name: '박지우', initial: '박', email: 'jiwoo.park@example.com', department: '디자인팀', type: '내부 사용자', role: 'Editor', roleClass: 'role-editor', lastLogin: '어제', loginTime: '16:42', status: '정상', statusClass: 'status-active', avatarColor: '#d77820', selected: false },
  { id: 'choi.harin', name: '최하린', initial: '최', email: 'harin.choi@example.com', department: '영업팀', type: '외부 사용자', role: 'Viewer', roleClass: 'role-viewer', lastLogin: '7월 25일', loginTime: '14:05', status: '대기', statusClass: 'status-wait', avatarColor: '#159174', selected: false },
  { id: 'jung.minseo', name: '정민서', initial: '정', email: 'minseo.jung@example.com', department: '고객지원팀', type: '내부 사용자', role: 'Manager', roleClass: 'role-manager', lastLogin: '7월 21일', loginTime: '11:32', status: '휴면', statusClass: 'status-sleep', avatarColor: '#d2576b', selected: false },
  { id: 'han.yujin', name: '한유진', initial: '한', email: 'yujin.han@example.com', department: '플랫폼개발팀', type: '내부 사용자', role: 'Editor', roleClass: 'role-editor', lastLogin: '7월 18일', loginTime: '08:55', status: '정지', statusClass: 'status-block', avatarColor: '#1687a1', selected: false }
])

const filteredPageRows = computed(() => {
  const keyword = appliedKeyword.value.trim().toLowerCase()
  return pageUsers.filter((user) => {
    const matchesKeyword = !keyword || [user.name, user.id, user.email].some((value) => value.toLowerCase().includes(keyword))
    return matchesKeyword &&
      (!appliedType.value || user.type === appliedType.value) &&
      (!appliedStatus.value || user.status === appliedStatus.value)
  })
})

const selectedUserCount = computed(() => pageUsers.filter((user) => user.selected).length)

watch(selectAllUsers, (selected) => {
  filteredPageRows.value.forEach((user) => {
    user.selected = selected
  })
})

function applyPageSearch() {
  appliedKeyword.value = pageSearch.keyword
  appliedType.value = pageSearch.type
  appliedStatus.value = pageSearch.status
}

function resetPageSearch() {
  Object.assign(pageSearch, { type: null, status: null, keyword: '' })
  applyPageSearch()
}

function openUserDetail(user) {
  selectedUser.value = user
  showUserPanel.value = true
}

function openNewUser() {
  selectedUser.value = null
  showUserPanel.value = true
}

const summaryCards = [
  { label: '전체 화면', value: '128', change: '12.5%', icon: 'dashboard', color: 'blue', bars: [35, 48, 43, 62, 58, 76, 92] },
  { label: 'Vue 생성 완료', value: '96', change: '8.2%', icon: 'code', color: 'cyan', bars: [30, 43, 39, 55, 66, 71, 85] },
  { label: '사용 컴포넌트', value: '1,284', change: '16.8%', icon: 'widgets', color: 'violet', bars: [42, 36, 54, 60, 72, 68, 90] },
  { label: '검증 오류', value: '7', change: '22.4%', icon: 'report_problem', color: 'orange', negative: true, bars: [90, 76, 68, 72, 55, 43, 31] }
]

const statuses = [
  { label: '완료', value: 72, percent: 56, color: '#1976d2' },
  { label: '진행 중', value: 34, percent: 27, color: '#20b7c9' },
  { label: '검토', value: 15, percent: 12, color: '#8b65d6' },
  { label: '오류', value: 7, percent: 5, color: '#f2a341' }
]

const componentUsage = [
  { label: 'Input / Select', value: 486, percent: 92, icon: 'input', color: '#1976d2' },
  { label: 'Table / Grid', value: 302, percent: 72, icon: 'table_chart', color: '#20b7c9' },
  { label: 'Button', value: 241, percent: 58, icon: 'smart_button', color: '#8b65d6' },
  { label: 'Layout', value: 164, percent: 42, icon: 'view_quilt', color: '#f2a341' },
  { label: 'Dialog', value: 91, percent: 28, icon: 'web_asset', color: '#e66676' }
]

const recentScreens = [
  { name: '사용자 관리', file: 'UserManagement.json', type: 'Table', owner: '김도윤', initial: '김', date: '오늘 10:24', status: '완료', statusClass: 'done', icon: 'manage_accounts' },
  { name: '주문 조회', file: 'OrderSearch.json', type: 'Search Grid', owner: '이서준', initial: '이', date: '오늘 09:18', status: '진행 중', statusClass: 'progress', icon: 'receipt_long' },
  { name: '상품 등록', file: 'ProductForm.json', type: 'Form', owner: '박지우', initial: '박', date: '어제 16:42', status: '검토', statusClass: 'review', icon: 'inventory' },
  { name: '매출 현황', file: 'SalesDashboard.json', type: 'Dashboard', owner: '최하린', initial: '최', date: '어제 14:05', status: '오류', statusClass: 'error', icon: 'monitoring' }
]

function refreshDashboard() {
  period.value = period.value
}
</script>

<style scoped>
.examples-page { min-height: 100%; color: #344252; background: #f3f6fa; }
.dashboard { width: calc(100% - 48px); margin: 0 auto; padding: 14px 0 60px; }
.dashboard-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; width: 100%; min-height: 64px; margin: 0 0 16px; }
.dashboard-header h1 { margin: 0; color: #303d49; font-size: 30px; font-weight: 800; }
.dashboard-header .example-heading-title span:not(.example-heading-icon) { display: block; margin-top: 5px; color: #7c8996; font-size: 14px; }
.header-actions { display: flex; gap: 9px; }.header-actions .q-select { width: 150px; }.header-actions :deep(.q-btn) { padding-inline: 17px; border-radius: 8px; font-weight: 700; }
.summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; }
.summary-card { display: flex; align-items: center; gap: 14px; min-height: 126px; padding: 20px; overflow: hidden; border: 1px solid #e0e7ee; border-radius: 13px; background: #fff; box-shadow: 0 6px 18px rgba(31, 60, 86, .05); }
.summary-icon { display: grid; place-items: center; width: 54px; height: 54px; flex: 0 0 54px; border-radius: 14px; }.summary-icon.blue { color: #176fc1; background: #e7f3ff; }.summary-icon.cyan { color: #078a9d; background: #e4f8fa; }.summary-icon.violet { color: #7655c5; background: #f0ebff; }.summary-icon.orange { color: #cf721c; background: #fff0e3; }
.summary-card small { color: #7a8793; font-size: 12px; }.summary-card strong { display: block; margin-top: 3px; color: #263746; font-size: 27px; line-height: 1.1; }.summary-card p { margin: 7px 0 0; color: #1b9b69; font-size: 11px; font-weight: 700; }.summary-card p.negative { color: #e15f68; }.summary-card p span { display: inline; margin-left: 3px; color: #9aa4ad; font-weight: 400; }
.mini-bars { display: flex; align-items: flex-end; gap: 3px; width: 55px; height: 42px; margin-left: auto; opacity: .48; }.mini-bars i { width: 5px; min-height: 5px; border-radius: 5px; background: var(--q-primary); }
.dashboard-grid { display: grid; grid-template-columns: 1.6fr 1fr; gap: 15px; margin-top: 15px; }
.panel { padding: 23px; border: 1px solid #e0e7ee; border-radius: 13px; background: #fff; box-shadow: 0 6px 18px rgba(31, 60, 86, .05); }
.panel-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 14px; }.panel-heading h2 { margin: 0; color: #324151; font-size: 17px; font-weight: 800; }.panel-heading p { margin: 4px 0 0; color: #8a96a1; font-size: 11px; }
.legend { display: flex; gap: 15px; color: #71808d; font-size: 10px; }.legend span { display: flex; align-items: center; gap: 5px; }.legend i { width: 8px; height: 8px; border-radius: 50%; }.legend-blue { background: #1976d2; }.legend-cyan { background: #20b7c9; }
.line-chart { display: grid; grid-template-columns: 28px 1fr; height: 260px; margin-top: 20px; }.y-axis { display: flex; flex-direction: column; justify-content: space-between; padding: 0 0 22px; color: #98a4af; font-size: 9px; }.plot { position: relative; display: flex; flex-direction: column; justify-content: space-between; padding-bottom: 22px; }.plot > i { width: 100%; height: 1px; background: #e8edf1; }.plot svg { position: absolute; inset: 0 0 22px; width: 100%; height: calc(100% - 22px); overflow: visible; }.x-axis { position: absolute; right: 0; bottom: 0; left: 0; display: flex; justify-content: space-between; color: #8c98a3; font-size: 9px; }
.donut-area { display: flex; align-items: center; justify-content: space-around; gap: 25px; min-height: 260px; }.donut-chart { display: grid; place-items: center; width: 160px; height: 160px; border-radius: 50%; background: conic-gradient(#1976d2 0 56%, #20b7c9 56% 83%, #8b65d6 83% 95%, #f2a341 95%); }.donut-chart::before { content: ""; grid-area: 1/1; width: 105px; height: 105px; border-radius: 50%; background: #fff; }.donut-chart div { z-index: 1; grid-area: 1/1; text-align: center; }.donut-chart strong { display: block; color: #2d3d4c; font-size: 27px; }.donut-chart span { color: #8a96a1; font-size: 10px; }
.donut-area ul { display: grid; gap: 11px; min-width: 130px; margin: 0; padding: 0; list-style: none; }.donut-area li { display: flex; justify-content: space-between; gap: 15px; }.donut-area li > span { display: flex; align-items: center; gap: 7px; color: #697885; font-size: 11px; }.donut-area li i { width: 8px; height: 8px; border-radius: 50%; }.donut-area li strong { color: #394958; font-size: 12px; }.donut-area li small { margin-left: 5px; color: #9ba5ad; font-size: 9px; }
.bar-chart { display: grid; gap: 16px; margin-top: 25px; }.bar-chart > div { display: grid; grid-template-columns: 125px 1fr 42px; align-items: center; gap: 12px; }.bar-chart span { display: flex; align-items: center; gap: 7px; color: #62717e; font-size: 11px; }.bar-chart span .q-icon { color: #81909c; }.bar-chart div div { height: 9px; overflow: hidden; border-radius: 8px; background: #edf1f4; }.bar-chart div div i { display: block; height: 100%; border-radius: 8px; }.bar-chart strong { color: #4e5e6c; font-size: 11px; text-align: right; }
.activity-panel { min-width: 0; }.activity-table { margin-top: 17px; overflow-x: auto; }.table-head, .table-row { display: grid; grid-template-columns: 2fr .8fr 1fr .9fr .65fr; align-items: center; min-width: 650px; }.table-head { padding: 9px 12px; color: #8995a0; background: #f6f8fa; font-size: 10px; font-weight: 700; }.table-row { padding: 10px 12px; border-bottom: 1px solid #edf0f3; color: #657481; font-size: 10px; }.table-row:last-child { border: 0; }
.screen-name { display: flex; align-items: center; gap: 9px; }.screen-name > i { display: grid; place-items: center; width: 31px; height: 31px; border-radius: 8px; color: var(--q-primary); background: #e9f3fd; }.screen-name b { color: #40505f; font-size: 11px; }.screen-name small { display: block; margin-top: 2px; color: #9aa4ad; font-size: 8px; font-weight: 400; }.owner { display: flex; align-items: center; gap: 6px; }.owner i { display: grid; place-items: center; width: 24px; height: 24px; border-radius: 50%; color: #4b65a6; background: #e8edf9; font-style: normal; }.table-row em { display: inline-block; padding: 4px 8px; border-radius: 10px; font-style: normal; font-size: 9px; font-weight: 700; }.table-row em.done { color: #13845d; background: #e4f6ed; }.table-row em.progress { color: #176fc1; background: #e5f2fd; }.table-row em.review { color: #7554c6; background: #eee9fb; }.table-row em.error { color: #cf5a65; background: #fdebed; }
.example-placeholder { display: grid; justify-items: center; max-width: 620px; margin: 80px auto; padding: 60px; border: 1px solid #dfe6ed; border-radius: 16px; color: #71808e; background: #fff; text-align: center; }.example-placeholder > .q-icon { color: #b8cee1; }.example-placeholder h1 { margin: 20px 0 5px; color: #354452; }.example-placeholder p { margin: 0 0 24px; }
.layout-example { width: calc(100% - 48px); margin: 0 auto; padding: 14px 0 70px; }
.layout-page-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; width: 100%; min-height: 64px; margin: 0 0 16px; }
.anatomy-heading p, .responsive-guide > div:first-child p { margin: 0 0 4px; color: var(--q-primary); font-size: 11px; font-weight: 800; letter-spacing: .14em; }
.layout-page-header h1 { margin: 0; color: #303d49; font-size: 30px; font-weight: 800; }.layout-page-header .example-heading-title span:not(.example-heading-icon) { display: block; margin-top: 5px; color: #7c8996; font-size: 14px; }
.device-switcher { display: flex; gap: 4px; padding: 4px; border: 1px solid #dce4eb; border-radius: 10px; background: #fff; }
.device-switcher button { display: flex; align-items: center; gap: 6px; padding: 8px 12px; border: 0; border-radius: 7px; color: #7c8994; background: transparent; cursor: pointer; font: inherit; font-size: 11px; }.device-switcher button.active { color: #fff; background: var(--q-primary); box-shadow: 0 4px 10px rgba(25,118,210,.25); }
.layout-workspace { padding: 18px; border: 1px solid #dce4eb; border-radius: 15px; background: #fff; box-shadow: 0 8px 24px rgba(31,60,86,.06); }
.layout-info { display: flex; align-items: center; gap: 13px; padding: 0 3px 14px; }.layout-info strong { color: #42515e; font-size: 13px; }.layout-info small { color: #8d99a3; font-size: 10px; }.live-dot { display: flex; align-items: center; gap: 6px; color: #159269; font-size: 9px; font-weight: 800; letter-spacing: .08em; }.live-dot i { width: 7px; height: 7px; border-radius: 50%; background: #22b87d; box-shadow: 0 0 0 4px #dff7ed; }
.preview-stage { display: grid; place-items: start center; min-height: 640px; padding: 22px; overflow: auto; border-radius: 11px; background: #e9eef3; }
.app-preview { width: 100%; max-width: 1180px; overflow: hidden; border: 1px solid #cbd5de; border-radius: 10px; background: #f4f7fa; box-shadow: 0 18px 40px rgba(32,55,75,.17); transition: width .28s ease; }
.app-preview.preview-tablet { width: 760px; }.app-preview.preview-mobile { width: 370px; }
.preview-header { display: flex; align-items: center; gap: 20px; height: 59px; padding: 0 18px; color: #fff; background: #175fa7; }.preview-brand { display: flex; align-items: center; gap: 8px; min-width: 175px; }.preview-brand strong { font-size: 15px; }.preview-search { display: flex; align-items: center; gap: 7px; width: 280px; padding: 8px 11px; border-radius: 7px; color: rgba(255,255,255,.7); background: rgba(255,255,255,.13); font-size: 9px; }.preview-header-actions { display: flex; align-items: center; gap: 10px; margin-left: auto; font-size: 9px; }.preview-header-actions i { display: grid; place-items: center; width: 28px; height: 28px; border-radius: 50%; color: #175fa7; background: #fff; font-style: normal; font-weight: 800; }
.preview-body { display: grid; grid-template-columns: 180px minmax(0,1fr) 205px; min-height: 510px; }.preview-drawer { display: flex; flex-direction: column; padding: 14px 10px; border-right: 1px solid #dfe6ec; background: #fff; }.drawer-user { display: flex; align-items: center; gap: 9px; padding: 8px 7px 17px; border-bottom: 1px solid #edf0f3; }.drawer-user > i { display: grid; place-items: center; width: 34px; height: 34px; border-radius: 9px; color: #fff; background: linear-gradient(135deg,#1976d2,#54a9ef); font-size: 10px; font-style: normal; font-weight: 800; }.drawer-user span { display: grid; }.drawer-user strong { color: #40505e; font-size: 10px; }.drawer-user small { color: #9aa5ae; font-size: 7px; }
.preview-drawer nav { display: grid; gap: 4px; margin-top: 13px; }.preview-drawer nav span, .drawer-bottom { display: flex; align-items: center; gap: 9px; padding: 10px; border-radius: 6px; color: #6e7c88; font-size: 9px; }.preview-drawer nav span.selected { color: var(--q-primary); background: #e8f3fd; font-weight: 800; }.drawer-bottom { margin-top: auto; }
.preview-content { min-width: 0; padding: 18px; }.preview-breadcrumb { display: flex; align-items: center; gap: 3px; color: #97a2ac; font-size: 7px; }.preview-breadcrumb strong { color: #63717d; }.preview-title { display: flex; align-items: center; justify-content: space-between; margin: 12px 0 15px; }.preview-title h2 { margin: 0; color: #30404f; font-size: 17px; }.preview-title p { margin: 3px 0 0; color: #8d99a3; font-size: 8px; }.preview-title button { display: flex; align-items: center; gap: 4px; padding: 7px 10px; border: 0; border-radius: 6px; color: #fff; background: var(--q-primary); font-size: 8px; }
.preview-stats { display: grid; grid-template-columns: repeat(4,1fr); gap: 8px; }.preview-stats > div { display: grid; grid-template-columns: 31px 1fr; padding: 10px; border: 1px solid #e1e7ec; border-radius: 7px; background: #fff; }.preview-stats > div > span { display: grid; grid-row: 1/3; place-items: center; width: 27px; height: 27px; border-radius: 7px; }.preview-stats small { color: #89959f; font-size: 7px; }.preview-stats strong { color: #334453; font-size: 13px; }.stat-blue { color: #1976d2; background: #e8f3fd; }.stat-orange { color: #d77820; background: #fff0e2; }.stat-green { color: #16835d; background: #e5f7ee; }.stat-violet { color: #7654c7; background: #efeafb; }
.preview-main-grid { display: grid; grid-template-columns: 1.4fr 1fr; gap: 9px; margin-top: 10px; }.preview-chart-card, .preview-list-card { min-height: 220px; padding: 13px; border: 1px solid #e1e7ec; border-radius: 7px; background: #fff; }.preview-chart-card > strong, .preview-list-card > strong { color: #43525f; font-size: 9px; }.preview-columns { display: flex; align-items: flex-end; justify-content: space-around; height: 155px; margin-top: 15px; border-bottom: 1px solid #dfe5ea; background: repeating-linear-gradient(to bottom,#fff,#fff 38px,#edf1f4 39px); }.preview-columns i { width: 16px; border-radius: 4px 4px 0 0; background: linear-gradient(#51a8ec,#1976d2); }.preview-days { display: flex; justify-content: space-around; margin-top: 6px; color: #9ba5ae; font-size: 6px; }
.preview-list-card > div { display: flex; align-items: center; gap: 8px; margin-top: 12px; }.preview-list-card > div > i { display: grid; place-items: center; width: 29px; height: 29px; border-radius: 7px; }.preview-list-card span { display: grid; }.preview-list-card b { color: #53616d; font-size: 8px; }.preview-list-card small { color: #a0a9b1; font-size: 7px; }.notice-blue { color: #1976d2; background: #e7f3fd; }.notice-orange { color: #d3741d; background: #fff0e2; }.notice-green { color: #16835d; background: #e6f6ee; }
.preview-aside { padding: 17px 13px; border-left: 1px solid #dfe6ec; background: #fff; }.preview-aside > strong { display: block; margin-bottom: 11px; color: #465561; font-size: 9px; }.mini-calendar { display: grid; grid-template-columns: repeat(7,1fr); gap: 3px; margin-bottom: 24px; }.mini-calendar span, .mini-calendar i { display: grid; place-items: center; height: 21px; color: #8e99a3; font-size: 6px; font-style: normal; }.mini-calendar i.today { border-radius: 50%; color: #fff; background: var(--q-primary); }.task-progress { margin-bottom: 13px; }.task-progress > span { display: flex; justify-content: space-between; margin-bottom: 5px; color: #6e7c88; font-size: 7px; }.task-progress > span b { color: var(--q-primary); }.task-progress > i { display: block; height: 5px; border-radius: 5px; background: #edf1f4; }.task-progress em { display: block; height: 100%; border-radius: 5px; background: var(--q-primary); }
.preview-footer { display: flex; justify-content: space-between; padding: 9px 18px; border-top: 1px solid #dfe6ec; color: #87939e; background: #fff; font-size: 7px; }
.preview-tablet .preview-body { grid-template-columns: 160px minmax(0,1fr); }.preview-tablet .preview-aside { display: none; }.preview-tablet .preview-search { width: 210px; }
.preview-mobile .preview-header { height: 52px; }.preview-mobile .preview-brand { min-width: auto; }.preview-mobile .preview-brand::before { content: "☰"; }.preview-mobile .preview-search, .preview-mobile .preview-header-actions span, .preview-mobile .preview-drawer, .preview-mobile .preview-aside { display: none; }.preview-mobile .preview-body { display: block; }.preview-mobile .preview-content { padding: 14px; }.preview-mobile .preview-stats { grid-template-columns: repeat(2,1fr); }.preview-mobile .preview-main-grid { grid-template-columns: 1fr; }.preview-mobile .preview-list-card { min-height: 160px; }.preview-mobile .preview-footer { font-size: 6px; }
.layout-anatomy, .responsive-guide { margin-top: 18px; padding: 30px; border: 1px solid #dce4eb; border-radius: 15px; background: #fff; box-shadow: 0 8px 24px rgba(31,60,86,.05); }.anatomy-heading h2, .responsive-guide h2 { margin: 0; color: #30404e; font-size: 23px; }.anatomy-heading > span { color: #86929d; font-size: 12px; }
.anatomy-grid { display: grid; grid-template-columns: repeat(5,1fr); gap: 11px; margin-top: 22px; }.anatomy-grid article { min-width: 0; padding: 17px; border: 1px solid #e1e7ed; border-radius: 10px; }.anatomy-grid article > span { display: grid; place-items: center; width: 43px; height: 43px; margin-bottom: 14px; border-radius: 11px; font-size: 22px; }.anatomy-grid small { color: #a2adb6; font-size: 8px; font-weight: 800; }.anatomy-grid h3 { margin: 3px 0 5px; color: #41515e; font-size: 14px; }.anatomy-grid p { min-height: 48px; margin: 0 0 10px; color: #7a8792; font-size: 10px; line-height: 1.5; }.anatomy-grid code { color: var(--q-primary); font-size: 9px; }.anatomy-blue { color:#1976d2;background:#e7f3fd; }.anatomy-cyan { color:#078b9e;background:#e4f8fa; }.anatomy-violet { color:#7655c5;background:#f0ebff; }.anatomy-orange { color:#d0731c;background:#fff0e2; }.anatomy-green { color:#16835d;background:#e5f7ee; }
.responsive-guide > div:first-child { text-align: center; }.breakpoint-flow { display: flex; align-items: center; justify-content: center; gap: 25px; margin-top: 25px; }.breakpoint-flow article { display: grid; justify-items: center; width: 210px; padding: 22px; border: 1px solid #e0e7ed; border-radius: 11px; }.breakpoint-flow article > .q-icon { margin-bottom: 9px; color: var(--q-primary); font-size: 31px; }.breakpoint-flow strong { color: #3f4f5d; font-size: 14px; }.breakpoint-flow span { margin-top: 2px; color: var(--q-primary); font-size: 9px; font-weight: 700; }.breakpoint-flow p { margin: 8px 0 0; color: #7f8c97; font-size: 10px; text-align: center; }.breakpoint-flow > .q-icon { color: #a8b4bd; }
.component-example { width: calc(100% - 48px); margin: 0 auto; padding: 14px 0 70px; }
.component-example-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; width: 100%; min-height: 64px; margin: 0 0 16px; }
.component-example-header h1 { margin: 0; color: #303d49; font-size: 30px; font-weight: 800; }
.component-example-header .example-heading-title span:not(.example-heading-icon) { display: block; margin-top: 5px; color: #7c8996; font-size: 14px; }
.component-header-actions { display: flex; gap: 9px; }
.component-header-actions :deep(.q-btn) { border-radius: 8px; font-weight: 700; }
.component-studio { display: grid; grid-template-columns: 245px minmax(420px, 1fr) 265px; min-height: 650px; overflow: hidden; border: 1px solid #dce4eb; border-radius: 15px; background: #fff; box-shadow: 0 8px 24px rgba(31,60,86,.07); }
.component-palette, .component-properties { padding: 20px; background: #fff; }
.component-palette { border-right: 1px solid #e3e9ee; }
.component-properties { border-left: 1px solid #e3e9ee; }
.studio-panel-title { display: flex; align-items: center; gap: 10px; margin-bottom: 18px; }
.studio-panel-title > span { display: grid; place-items: center; width: 38px; height: 38px; border-radius: 10px; color: var(--q-primary); background: #e8f3fd; font-size: 20px; }
.studio-panel-title > div { display: grid; }
.studio-panel-title strong { color: #354552; font-size: 14px; }
.studio-panel-title small { margin-top: 2px; color: #929ca5; font-size: 9px; }
.component-category-list { display: grid; gap: 7px; margin-top: 15px; }
.component-category-list button { display: grid; grid-template-columns: 39px 1fr auto; align-items: center; gap: 10px; width: 100%; padding: 10px; border: 1px solid transparent; border-radius: 9px; color: #687783; background: transparent; cursor: pointer; text-align: left; }
.component-category-list button:hover { background: #f5f9fc; }
.component-category-list button.active { color: var(--q-primary); border-color: #bad8f3; background: #ebf5fd; }
.component-category-list button > span { display: grid; place-items: center; width: 39px; height: 39px; border-radius: 10px; font-size: 20px; }
.component-category-list button div { display: grid; }
.component-category-list button strong { color: #40505d; font-size: 12px; }
.component-category-list button small { margin-top: 2px; color: #9aa4ad; font-size: 9px; }
.palette-blue { color:#1976d2;background:#e7f3fd; }.palette-cyan { color:#078b9e;background:#e4f8fa; }.palette-violet { color:#7655c5;background:#f0ebff; }.palette-orange { color:#d0731c;background:#fff0e2; }.palette-green { color:#16835d;background:#e5f7ee; }.palette-rose { color:#cd5a6b;background:#fdebed; }
.component-canvas { display: flex; min-width: 0; flex-direction: column; background: #f4f7fa; }
.canvas-toolbar { display: flex; align-items: center; justify-content: space-between; min-height: 62px; padding: 12px 18px; border-bottom: 1px solid #dce4eb; background: #fff; }
.canvas-toolbar > div:first-child { display: grid; gap: 4px; }
.canvas-toolbar strong { color: #3c4c59; font-size: 13px; }
.canvas-devices { display: flex; gap: 3px; padding: 3px; border-radius: 8px; background: #eef2f5; }
.canvas-devices button { display: grid; place-items: center; width: 31px; height: 29px; border: 0; border-radius: 6px; color: #88949e; background: transparent; cursor: pointer; }
.canvas-devices button.active { color: #fff; background: var(--q-primary); }
.component-preview-stage { display: grid; place-items: center; min-height: 390px; margin: 18px; padding: 28px; border: 1px dashed #c6d2dc; border-radius: 12px; background: repeating-linear-gradient(0deg,transparent,transparent 19px,rgba(113,137,157,.045) 20px), repeating-linear-gradient(90deg,#fff,#fff 19px,rgba(113,137,157,.045) 20px); }
.component-demo-card { position: relative; display: grid; place-items: center; width: min(100%, 560px); min-height: 220px; padding: 45px; border: 1px solid #dfe6ec; border-radius: 12px; background: #fff; box-shadow: 0 12px 30px rgba(36,60,80,.10); transition: width .2s; }
.component-tablet .component-demo-card { width: 430px; }.component-mobile .component-demo-card { width: 280px; padding: 35px 22px; }
.component-demo-card > .q-field, .component-demo-card > .q-card, .component-demo-card > .q-markup-table { width: min(100%, 430px); }
.demo-label { position: absolute; top: 12px; left: 14px; padding: 4px 8px; border-radius: 5px; color: var(--q-primary); background: #eaf4fd; font: 700 9px/1.3 monospace; }
.sample-card { box-shadow: none; }
.dialog-sample { width: min(100%, 400px); padding: 22px; border-radius: 10px; box-shadow: 0 12px 32px rgba(35,55,72,.16); }
.dialog-sample > div { display: flex; align-items: center; gap: 9px; color: #354552; font-size: 16px; }.dialog-sample > div .q-icon { color: var(--q-primary); font-size: 24px; }
.dialog-sample p { margin: 12px 0 20px; color: #7b8791; font-size: 12px; }.dialog-sample footer { display: flex; justify-content: flex-end; gap: 7px; }
.component-code { margin: 0 18px 18px; overflow: hidden; border-radius: 9px; background: #263442; }
.component-code > div { display: flex; justify-content: space-between; padding: 8px 13px; color: #aebdca; background: #1e2a35; font-size: 9px; font-weight: 700; }
.component-code code { display: block; min-height: 105px; padding: 13px; overflow: auto; color: #8fd3ff; font-size: 10px; line-height: 1.55; white-space: pre; }
.component-properties label { display: grid; gap: 6px; margin-top: 14px; }.component-properties label > span { color: #60707c; font-size: 10px; font-weight: 700; }
.property-switch { display: flex; align-items: center; justify-content: space-between; margin-top: 14px; padding: 11px 0; border-bottom: 1px solid #edf1f4; }.property-switch > span { display: grid; }.property-switch strong { color: #4b5a66; font-size: 11px; }.property-switch small { color: #9aa4ad; font-size: 8px; }
.property-divider { height: 1px; margin: 20px 0; background: #e3e8ed; }.tree-title { display: flex; justify-content: space-between; color: #465662; font-size: 12px; }
.component-tree { display: grid; gap: 5px; margin-top: 11px; }.component-tree span { display: flex; align-items: center; gap: 6px; padding: 7px; border-radius: 6px; color: #70808c; font: 10px monospace; }.component-tree span:nth-child(2) { padding-left: 18px; }.component-tree span:nth-child(3) { padding-left: 30px; }.component-tree span.selected { color: var(--q-primary); background: #eaf4fd; font-weight: 700; }
.component-feature-cards { display: grid; grid-template-columns: repeat(3,1fr); gap: 14px; margin-top: 16px; }.component-feature-cards article { display: flex; align-items: center; gap: 14px; padding: 20px; border: 1px solid #dfe6ec; border-radius: 12px; background: #fff; }.component-feature-cards article > span { display: grid; place-items: center; width: 48px; height: 48px; flex: 0 0 48px; border-radius: 12px; font-size: 24px; }.component-feature-cards h2 { margin: 0; color: #3b4b58; font-size: 15px; }.component-feature-cards p { margin: 4px 0 0; color: #84909a; font-size: 10px; line-height: 1.5; }.feature-blue { color:#1976d2;background:#e7f3fd; }.feature-violet { color:#7655c5;background:#f0ebff; }.feature-green { color:#16835d;background:#e5f7ee; }
.form-example { position: relative; width: calc(100% - 48px); margin: 0 auto; padding: 14px 0 70px; }
.form-example-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; width: 100%; min-height: 64px; margin: 0 0 16px; }
.form-example-header h1 { margin: 0; color: #303d49; font-size: 30px; font-weight: 800; }
.form-example-header .example-heading-title span:not(.example-heading-icon) { display: block; margin-top: 5px; color: #7c8996; font-size: 14px; }
.form-header-actions { display: flex; gap: 9px; }.form-header-actions :deep(.q-btn) { border-radius: 8px; font-weight: 700; }
.form-progress { display: grid; grid-template-columns: repeat(3,1fr); margin-bottom: 16px; padding: 18px 28px; border: 1px solid #dce4eb; border-radius: 13px; background: #fff; }
.form-progress > div { position: relative; display: flex; align-items: center; gap: 11px; }.form-progress > div:nth-child(2) { justify-self: center; }.form-progress > div:nth-child(3) { justify-self: end; }
.form-progress > div > span { z-index: 1; display: grid; place-items: center; width: 38px; height: 38px; border-radius: 50%; color: #a0abb4; background: #edf1f4; }.form-progress > div.active > span { color: #fff; background: var(--q-primary); box-shadow: 0 0 0 5px #e5f2fd; }
.form-progress > div > div { display: grid; }.form-progress small { color: #a0abb4; font-size: 8px; font-weight: 800; letter-spacing: .08em; }.form-progress strong { color: #667581; font-size: 12px; }.form-progress > div.active strong { color: #334552; }
.form-progress i { position: absolute; top: 19px; left: calc(100% + 14px); width: clamp(70px, 14vw, 210px); height: 2px; background: #e0e6eb; }
.form-workspace { display: grid; grid-template-columns: minmax(0,1fr) 310px; gap: 16px; }
.form-main-card, .binding-card, .validation-card, .form-json-card { border: 1px solid #dce4eb; border-radius: 13px; background: #fff; box-shadow: 0 6px 18px rgba(31,60,86,.045); }
.form-main-card { padding: 27px; }.form-section-heading { display: flex; align-items: center; gap: 12px; padding-bottom: 19px; border-bottom: 1px solid #e7ecf0; }.form-section-heading > span { display: grid; place-items: center; width: 43px; height: 43px; border-radius: 11px; color: var(--q-primary); background: #e8f3fd; font-size: 22px; }.form-section-heading h2 { margin: 0; color: #344552; font-size: 18px; }.form-section-heading p { margin: 3px 0 0; color: #929ca5; font-size: 10px; }.form-section-heading p b, .product-form-grid label > span b { color: #e25c67; }
.product-form-grid { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 18px; margin-top: 22px; }.product-form-grid label { display: grid; align-content: start; gap: 7px; }.product-form-grid label > span { color: #566673; font-size: 11px; font-weight: 700; }.field-wide { grid-column: 1/3; }
.form-subsection { margin-top: 27px; padding-top: 5px; }.form-section-heading.compact { padding-bottom: 14px; }.form-section-heading.compact > span { width: 39px; height: 39px; font-size: 20px; }.form-section-heading.compact h2 { font-size: 15px; }
.image-upload-zone { display: grid; justify-items: center; margin-top: 17px; padding: 30px; border: 2px dashed #cbd9e4; border-radius: 11px; background: #f8fbfd; text-align: center; }.image-upload-zone > span { display: grid; place-items: center; width: 53px; height: 53px; margin-bottom: 11px; border-radius: 14px; color: var(--q-primary); background: #e5f2fd; font-size: 28px; }.image-upload-zone strong { color: #4b5b68; font-size: 12px; }.image-upload-zone small { margin: 4px 0 14px; color: #98a3ac; font-size: 9px; }
.form-options { display: grid; grid-template-columns: 1fr 1fr; gap: 13px; margin-top: 20px; }.form-options > div { display: flex; align-items: center; justify-content: space-between; padding: 14px; border: 1px solid #e1e7ec; border-radius: 9px; }.form-options span { display: grid; }.form-options strong { color: #4b5a66; font-size: 11px; }.form-options small { margin-top: 3px; color: #98a2aa; font-size: 8px; }
.form-actions { display: flex; justify-content: space-between; margin-top: 26px; padding-top: 20px; border-top: 1px solid #e6ebef; }.form-actions > div { display: flex; gap: 8px; }.form-actions :deep(.q-btn) { border-radius: 8px; font-weight: 700; }
.form-side-panel { display: grid; align-content: start; gap: 14px; }.binding-card, .validation-card, .form-json-card { padding: 19px; }.side-panel-heading { display: flex; align-items: center; gap: 9px; margin-bottom: 15px; }.side-panel-heading > span { display: grid; place-items: center; width: 36px; height: 36px; border-radius: 9px; color: var(--q-primary); background: #e8f3fd; font-size: 19px; }.side-panel-heading > div { display: grid; }.side-panel-heading strong { color: #3e4e5b; font-size: 13px; }.side-panel-heading small { color: #98a2aa; font-size: 8px; }
.store-name { display: grid; grid-template-columns: 34px 1fr auto; align-items: center; gap: 9px; padding: 11px; border-radius: 8px; background: #f4f8fb; }.store-name > .q-icon { color: var(--q-primary); font-size: 24px; }.store-name span { display: grid; }.store-name small { color: #9ba5ad; font-size: 7px; font-weight: 800; }.store-name strong { color: #43535f; font: 10px monospace; }.store-name em { padding: 4px 6px; border-radius: 8px; color: #16835d; background: #e3f5ec; font-size: 7px; font-style: normal; font-weight: 800; }
.binding-card ul { display: grid; gap: 8px; margin: 14px 0 0; padding: 0; list-style: none; }.binding-card li { display: flex; justify-content: space-between; gap: 8px; color: #6f7d88; font-size: 9px; }.binding-card code { color: #3973d3; font-size: 8px; }
.validation-card > div:not(.side-panel-heading) { display: flex; align-items: center; gap: 9px; padding: 8px 0; border-bottom: 1px solid #edf1f4; }.validation-card > div:last-child { border: 0; }.validation-card > div > .q-icon { color: #b8c1c8; }.validation-card > div > .q-icon.valid { color: #22a774; }.validation-card > div > span { display: grid; }.validation-card > div strong { color: #53626e; font-size: 10px; }.validation-card > div small { color: #9ba4ac; font-size: 8px; }
.form-json-card { overflow: hidden; background: #263442; }.form-json-card .side-panel-heading strong { color: #eef5fa; }.form-json-card .side-panel-heading small { color: #9dacb8; }.form-json-card code { display: block; max-height: 220px; overflow: auto; color: #8fd3ff; font-size: 9px; line-height: 1.55; white-space: pre; }
.form-save-banner { position: fixed; z-index: 10; right: 24px; bottom: 24px; min-width: 390px; border: 1px solid #cfe8da; color: #3f5c4d; background: #effaf4; box-shadow: 0 12px 35px rgba(26,70,47,.15); }
.page-example { width: calc(100% - 48px); margin: 0 auto; padding: 14px 0 70px; }
.page-example-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; width: 100%; min-height: 64px; margin: 0 0 16px; }.page-example-header h1 { margin: 0; color: #303d49; font-size: 30px; font-weight: 800; }.page-example-header .example-heading-title span:not(.example-heading-icon) { display: block; margin-top: 5px; color: #7c8996; font-size: 14px; }.admin-header-actions { display: flex; gap: 9px; }.page-example-header :deep(.q-btn) { border-radius: 8px; font-weight: 700; }
.example-heading-title { display: flex; align-items: flex-start; gap: 14px; }
.example-heading-icon { display: grid; place-items: center; align-self: flex-start; width: 56px; height: 56px; flex: 0 0 56px; margin: 20px 0 0; border-radius: 15px; color: #fff !important; background: var(--q-primary); }
.example-heading-title > div { display: flex; min-height: 56px; flex-direction: column; justify-content: center; }
.example-header-tools { display: flex; align-items: flex-end; flex-direction: column; gap: 13px; align-self: flex-start; }
.example-navigation { margin-top: -3px; color: #3973d3; font-size: 16px; font-weight: 800; letter-spacing: .13em; line-height: 1.4; white-space: nowrap; }
.page-search-card { padding: 22px; border: 1px solid #dce4eb; border-radius: 13px; background: #fff; box-shadow: 0 6px 18px rgba(31,60,86,.05); }.search-card-title { display: flex; align-items: center; gap: 11px; margin-bottom: 17px; }.search-card-title > span { display: grid; place-items: center; width: 39px; height: 39px; border-radius: 10px; color: var(--q-primary); background: #e8f3fd; font-size: 21px; }.search-card-title div { display: grid; }.search-card-title strong { color: #3b4a57; font-size: 15px; }.search-card-title small { color: #929ca5; font-size: 10px; }
.search-fields { display: grid; grid-template-columns: 190px 170px minmax(260px,1fr) auto; gap: 13px; align-items: end; }.search-fields label { display: grid; gap: 6px; }.search-fields label > span { color: #657481; font-size: 11px; font-weight: 700; }.search-fields :deep(.q-field__control) { border-radius: 7px; }.search-actions { display: flex; gap: 7px; }.search-actions :deep(.q-btn) { min-height: 40px; padding-inline: 15px; border-radius: 7px; font-weight: 700; }
.page-summary { display: grid; grid-template-columns: repeat(4,1fr); gap: 13px; margin-top: 14px; }.page-summary article { display: flex; align-items: center; gap: 13px; padding: 17px; border: 1px solid #dfe6ed; border-radius: 11px; background: #fff; }.page-summary article > span { display: grid; place-items: center; width: 46px; height: 46px; flex: 0 0 46px; border-radius: 12px; font-size: 23px; }.page-summary article div { display: grid; grid-template-columns: auto auto; align-items: baseline; column-gap: 8px; }.page-summary small { grid-column: 1/3; color: #7b8893; font-size: 10px; }.page-summary strong { color: #2f3f4e; font-size: 23px; }.page-summary p { margin: 0; color: #97a1aa; font-size: 9px; }.user-blue { color:#1976d2;background:#e7f3fd; }.user-green { color:#17825d;background:#e5f7ee; }.user-orange { color:#d3741d;background:#fff0e2; }.user-rose { color:#cf5c6d;background:#fdebed; }
.user-list-card { margin-top: 14px; overflow: hidden; border: 1px solid #dce4eb; border-radius: 13px; background: #fff; box-shadow: 0 6px 18px rgba(31,60,86,.05); }.user-list-heading { display: flex; align-items: center; justify-content: space-between; padding: 19px 22px; border-bottom: 1px solid #e5ebf0; }.user-list-heading h2 { margin: 0; color: #354553; font-size: 17px; }.user-list-heading p { margin: 3px 0 0; color: #88949e; font-size: 10px; }.user-list-heading p strong { color: var(--q-primary); }.user-list-heading > div:last-child { display: flex; gap: 3px; color: #788691; }
.user-table-wrap { overflow-x: auto; }.user-table { width: 100%; min-width: 1020px; border-collapse: collapse; }.user-table th { padding: 11px 13px; color: #7c8994; background: #f6f8fa; font-size: 10px; font-weight: 700; text-align: left; white-space: nowrap; }.user-table td { height: 64px; padding: 9px 13px; border-bottom: 1px solid #edf1f4; color: #64737f; font-size: 10px; }.user-table tbody tr { transition: background .15s; }.user-table tbody tr:hover { background: #f7fbff; }.user-table th:first-child, .user-table td:first-child { width: 45px; text-align: center; }
.table-user { display: flex; align-items: center; gap: 10px; min-width: 220px; }.table-user > i { display: grid; place-items: center; width: 36px; height: 36px; flex: 0 0 36px; border-radius: 10px; color: #fff; font-style: normal; font-weight: 800; }.table-user span, .last-login { display: grid; }.table-user strong { color: #3d4d5b; font-size: 11px; }.table-user small, .last-login small { margin-top: 2px; color: #9aa5ae; font-size: 8px; }.department { display: flex; align-items: center; gap: 5px; }.department .q-icon { color: #91a0ac; }
.role-badge, .user-status { display: inline-flex; align-items: center; padding: 5px 9px; border-radius: 11px; font-size: 9px; font-style: normal; font-weight: 700; white-space: nowrap; }.role-admin { color:#6750b5;background:#eee9fb; }.role-manager { color:#176fc1;background:#e6f2fd; }.role-editor { color:#108262;background:#e4f6ee; }.role-viewer { color:#747f89;background:#eef1f3; }.user-status { gap: 5px; background: transparent; }.user-status i { width: 6px; height: 6px; border-radius: 50%; }.status-active { color:#15825d; }.status-active i { background:#23ad7a; }.status-wait { color:#c4771c; }.status-wait i { background:#eba33d; }.status-sleep { color:#78848d; }.status-sleep i { background:#9ba4ab; }.status-block { color:#d25865; }.status-block i { background:#e56c77; }
.empty-users { padding: 50px !important; color: #929da6 !important; text-align: center; }.empty-users .q-icon { display: block; margin: 0 auto 8px; font-size: 32px; }
.table-footer { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; padding: 14px 20px; color: #84909a; font-size: 9px; }.table-footer > span:last-child { justify-self: end; }.pagination { display: flex; gap: 3px; }.pagination button { display: grid; place-items: center; width: 29px; height: 29px; border: 1px solid #dce4ea; border-radius: 6px; color: #657480; background: #fff; cursor: pointer; }.pagination button.active { color: #fff; border-color: var(--q-primary); background: var(--q-primary); }.pagination button:disabled { color: #c5cdd3; background: #f7f8f9; }
.clickable-user-row { cursor: pointer; }.clickable-user-row:focus { outline: 2px solid rgba(25,118,210,.35); outline-offset: -2px; }
.user-detail-popup { display: flex; flex-direction: column; width: min(620px, calc(100vw - 32px)); max-width: 620px; max-height: calc(100vh - 48px); overflow-y: auto; border-radius: 15px; box-shadow: 0 24px 70px rgba(18,34,48,.28); }.user-detail-popup > header { position: sticky; z-index: 2; top: 0; display: flex; justify-content: space-between; padding: 22px 24px; color: #fff; background: var(--q-primary); }.user-detail-popup header p { margin: 0 0 3px; color: rgba(255,255,255,.7); font-size: 9px; font-weight: 800; letter-spacing: .12em; }.user-detail-popup header h2 { margin: 0; font-size: 21px; }.detail-profile { display: flex; align-items: center; gap: 14px; margin: 23px; padding: 17px; border-radius: 11px; background: #f4f8fb; }.detail-profile > i { display: grid; place-items: center; width: 52px; height: 52px; border-radius: 14px; color: #fff; font-style: normal; font-weight: 800; }.detail-profile div { display: grid; }.detail-profile strong { color: #3c4c59; font-size: 15px; }.detail-profile span { margin-top: 3px; color: #89949e; font-size: 10px; }
.detail-form { display: grid; gap: 16px; padding: 0 23px 25px; }.detail-form label { display: grid; gap: 6px; }.detail-form label > span { color: #596874; font-size: 11px; font-weight: 700; }.detail-form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }.user-detail-popup > footer { position: sticky; bottom: 0; display: flex; justify-content: flex-end; gap: 8px; margin-top: auto; padding: 17px 23px; border-top: 1px solid #e5eaee; background: #fff; }.user-detail-popup footer :deep(.q-btn) { min-width: 86px; border-radius: 7px; font-weight: 700; }
@media (max-width: 1050px) { .summary-grid { grid-template-columns: repeat(2, 1fr); }.dashboard-grid { grid-template-columns: 1fr; } }
@media (max-width: 1100px) { .component-studio { grid-template-columns: 210px minmax(380px,1fr); }.component-properties { grid-column: 1/3; border-top: 1px solid #e3e9ee; border-left: 0; }.component-feature-cards { grid-template-columns: 1fr; } }
@media (max-width: 950px) { .form-workspace { grid-template-columns: 1fr; }.form-side-panel { grid-template-columns: repeat(2,1fr); }.form-json-card { grid-column: 1/3; } }
@media (max-width: 650px) {
  .dashboard { width: min(100% - 28px, 560px); padding-top: 14px; }.dashboard-header { align-items: flex-start; flex-direction: column; }.header-actions { width: 100%; }.header-actions .q-select { flex: 1; }
  .summary-grid { grid-template-columns: 1fr; }.panel { padding: 18px; }.donut-area { flex-direction: column; padding-top: 20px; }.legend { display: none; }
}
@media (max-width: 1050px) { .anatomy-grid { grid-template-columns: repeat(3,1fr); } }
@media (max-width: 1050px) { .search-fields { grid-template-columns: 1fr 1fr; }.search-keyword { grid-column: 1/2; }.page-summary { grid-template-columns: repeat(2,1fr); } }
@media (max-width: 760px) {
  .layout-example, .component-example, .form-example, .page-example { width: min(100% - 28px, 600px); padding-top: 14px; }.layout-page-header, .component-example-header, .form-example-header, .page-example-header { align-items: flex-start; flex-direction: column; }.component-studio { grid-template-columns: 1fr; }.component-palette, .component-properties { grid-column: auto; border: 0; border-bottom: 1px solid #e3e9ee; }.component-header-actions, .form-header-actions { width: 100%; }.component-header-actions .q-btn, .form-header-actions .q-btn { flex: 1; }.form-progress { padding: 15px; }.form-progress > div { justify-self: start !important; }.form-progress > div > div, .form-progress i { display: none; }.product-form-grid, .form-options, .form-side-panel { grid-template-columns: 1fr; }.field-wide, .form-json-card { grid-column: auto; }.form-main-card { padding: 20px; }.form-save-banner { right: 14px; bottom: 14px; left: 14px; min-width: 0; }.preview-stage { justify-content: start; }.app-preview.preview-desktop { width: 920px; }.anatomy-grid { grid-template-columns: repeat(2,1fr); }.breakpoint-flow { flex-direction: column; }.breakpoint-flow > .q-icon { transform: rotate(90deg); }
}
@media (max-width: 600px) { .search-fields { grid-template-columns: 1fr; }.search-keyword { grid-column: auto; }.search-actions { justify-content: flex-end; }.page-summary { grid-template-columns: 1fr; }.table-footer { grid-template-columns: 1fr; justify-items: center; gap: 10px; }.table-footer > span:last-child { justify-self: center; } }
@media (max-width: 480px) { .device-switcher { width: 100%; }.device-switcher button { flex: 1; justify-content: center; }.device-switcher span { display: none; }.layout-anatomy, .responsive-guide { padding: 22px 16px; }.anatomy-grid { grid-template-columns: 1fr; }.anatomy-grid p { min-height: 0; }.example-header-tools, .admin-header-actions { width: 100%; }.admin-header-actions .q-btn { flex: 1; }.example-navigation { font-size: 13px; white-space: normal; }.detail-form-row { grid-template-columns: 1fr; } }
</style>
