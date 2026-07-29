<template>
  <q-page class="license-page">
    <main class="license-content">
      <header class="license-header">
        <div class="license-heading-title">
          <span class="license-heading-icon"><q-icon name="verified_user" size="30px" /></span>
          <div>
            <h1>라이센스</h1>
            <span>Quasar UI Tool과 생성 결과물의 사용 범위를 안내합니다.</span>
          </div>
        </div>
        <div class="license-header-tools">
          <div class="license-navigation">QUASAR UI TOOL · LICENSE</div>
          <q-badge outline color="primary" class="license-version">
            <q-icon name="sell" /> Version 1.0
          </q-badge>
        </div>
      </header>

      <section class="license-hero">
        <div class="license-hero-icon"><q-icon name="gavel" /></div>
        <div>
          <span>LICENSE SUMMARY</span>
          <h2>만든 화면과 코드는 프로젝트에서 자유롭게 활용하세요.</h2>
          <p>
            Quasar UI Tool로 사용자가 제작한 화면 JSON과 생성된 Vue 코드는 개인·기업 프로젝트에서
            사용할 수 있습니다. 단, Quasar UI Tool 프로그램 자체의 복제·재판매·무단 배포는 허용되지 않습니다.
          </p>
        </div>
        <div class="license-status">
          <q-icon name="check_circle" />
          <span><small>현재 정책</small><strong>프로젝트 사용 가능</strong></span>
        </div>
      </section>

      <section class="license-summary-grid" aria-label="라이센스 핵심 요약">
        <article v-for="item in summaries" :key="item.label">
          <span :class="item.color"><q-icon :name="item.icon" /></span>
          <div><small>{{ item.label }}</small><strong>{{ item.value }}</strong><p>{{ item.caption }}</p></div>
        </article>
      </section>

      <section class="permission-grid">
        <article class="permission-card allowed">
          <header>
            <span><q-icon name="task_alt" /></span>
            <div><p>PERMITTED USE</p><h2>허용되는 사용</h2></div>
          </header>
          <ul>
            <li v-for="item in allowedUses" :key="item"><q-icon name="check_circle" />{{ item }}</li>
          </ul>
        </article>
        <article class="permission-card restricted">
          <header>
            <span><q-icon name="block" /></span>
            <div><p>RESTRICTED USE</p><h2>제한되는 사용</h2></div>
          </header>
          <ul>
            <li v-for="item in restrictedUses" :key="item"><q-icon name="cancel" />{{ item }}</li>
          </ul>
        </article>
      </section>

      <section class="ownership-section">
        <div class="section-heading">
          <span><q-icon name="copyright" /></span>
          <div><p>OUTPUT OWNERSHIP</p><h2>생성 결과물의 권리</h2><small>UI Tool을 통해 만들어진 산출물의 권리 범위입니다.</small></div>
        </div>
        <div class="ownership-flow">
          <article v-for="(item, index) in ownershipItems" :key="item.title">
            <span :class="item.color"><q-icon :name="item.icon" /></span>
            <small>0{{ index + 1 }}</small>
            <h3>{{ item.title }}</h3>
            <p>{{ item.description }}</p>
            <em><q-icon name="verified" />{{ item.badge }}</em>
          </article>
        </div>
      </section>

      <section class="opensource-section">
        <div class="section-heading">
          <span><q-icon name="deployed_code" /></span>
          <div><p>OPEN SOURCE</p><h2>오픈소스 및 외부 라이브러리</h2><small>제품에서 사용하는 주요 기술과 라이센스입니다.</small></div>
        </div>
        <div class="library-table-wrap">
          <table class="library-table">
            <thead><tr><th>구성 요소</th><th>라이센스</th><th>용도</th><th>상태</th></tr></thead>
            <tbody>
              <tr v-for="library in libraries" :key="library.name">
                <td><span :class="library.color"><q-icon :name="library.icon" /></span><strong>{{ library.name }}</strong></td>
                <td><code>{{ library.license }}</code></td>
                <td>{{ library.purpose }}</td>
                <td><em><i></i>확인</em></td>
              </tr>
            </tbody>
          </table>
        </div>
        <p class="library-note"><q-icon name="info" /> 배포 전 각 프로젝트의 최신 라이센스와 적용 조건을 다시 확인해 주세요.</p>
      </section>

      <section class="disclaimer-contact">
        <article class="disclaimer-card">
          <div class="section-heading">
            <span><q-icon name="policy" /></span>
            <div><p>DISCLAIMER</p><h2>면책 및 보증 제한</h2></div>
          </div>
          <ul>
            <li v-for="item in disclaimers" :key="item"><q-icon name="chevron_right" />{{ item }}</li>
          </ul>
          <div class="legal-notice"><q-icon name="balance" />본 화면은 서비스 정책 안내 초안이며, 정식 배포 전 법률 전문가의 검토가 필요합니다.</div>
        </article>

        <article class="contact-card">
          <span class="contact-icon"><q-icon name="support_agent" /></span>
          <p>LICENSE SUPPORT</p>
          <h2>라이센스 관련 도움이 필요하신가요?</h2>
          <span>상업용 이용, 별도 계약 또는 라이센스 위반 신고에 대해 문의해 주세요.</span>
          <a href="mailto:mailmoon@naver.com?subject=Quasar%20UI%20Tool%20라이센스%20문의">
            <q-icon name="mail" />mailmoon@naver.com
          </a>
          <small><q-icon name="schedule" />문의 내용 확인 후 이메일로 답변드립니다.</small>
        </article>
      </section>

      <footer class="license-footer">
        <span>Last updated: 2026.07.28</span>
        <span>Quasar UI Tool License Policy v1.0</span>
      </footer>
    </main>
  </q-page>
</template>

<script setup>
const summaries = [
  { label: '상업적 사용', value: '허용', caption: '개인·기업 프로젝트', icon: 'business_center', color: 'summary-blue' },
  { label: '코드 수정', value: '허용', caption: 'JSON 및 Vue 코드', icon: 'edit', color: 'summary-green' },
  { label: '도구 재판매', value: '제한', caption: '별도 서면 허가 필요', icon: 'storefront', color: 'summary-orange' },
  { label: '저작권 표시', value: '유지', caption: '라이센스 고지 포함', icon: 'copyright', color: 'summary-violet' }
]

const allowedUses = [
  '개인 및 기업 프로젝트에서 사용',
  '생성된 화면의 상업적 서비스 적용',
  '생성된 JSON·Vue 코드 수정 및 확장',
  '회사 내부 시스템에 배포',
  '고객 프로젝트 개발 및 납품'
]

const restrictedUses = [
  'Quasar UI Tool 프로그램 자체의 무단 재판매',
  '제품명과 로고의 무단 변경 또는 사용',
  '저작권·라이센스 고지의 임의 삭제',
  '허가 없는 원본 소스 코드 재배포',
  '법률을 위반하는 서비스 제작에 사용'
]

const ownershipItems = [
  { title: '화면 JSON', description: '사용자가 직접 작성하고 편집한 화면 정의 데이터의 권리는 사용자에게 있습니다.', badge: '사용자 소유', icon: 'data_object', color: 'ownership-blue' },
  { title: '생성 Vue 코드', description: 'UI Tool이 생성한 Vue·Quasar 코드는 사용자 프로젝트에서 수정하고 배포할 수 있습니다.', badge: '상업적 이용 가능', icon: 'code', color: 'ownership-green' },
  { title: 'UI Tool 프로그램', description: '에디터, 확장 프로그램 및 고유 기능의 저작권은 Quasar UI Tool에 있습니다.', badge: '프로그램 권리 보호', icon: 'developer_mode', color: 'ownership-violet' }
]

const libraries = [
  { name: 'Quasar Framework', license: 'MIT', purpose: 'UI Framework', icon: 'widgets', color: 'library-blue' },
  { name: 'Vue.js', license: 'MIT', purpose: 'Frontend Framework', icon: 'code', color: 'library-green' },
  { name: 'Pinia', license: 'MIT', purpose: 'State Management', icon: 'database', color: 'library-yellow' },
  { name: 'Material Icons', license: 'Apache 2.0', purpose: 'Icon System', icon: 'interests', color: 'library-violet' },
  { name: 'VS Code API', license: 'Microsoft Terms', purpose: 'Extension API', icon: 'terminal', color: 'library-cyan' }
]

const disclaimers = [
  'Quasar UI Tool은 현재 상태 그대로 제공되며 특정 목적에 대한 완전한 적합성을 보증하지 않습니다.',
  '생성 코드의 적용과 배포 전 사용자가 직접 기능·보안·품질을 검토해야 합니다.',
  '데이터 손실, 생성 코드 오류 및 프로젝트 적용으로 발생한 간접 손해의 책임은 제한됩니다.',
  '업데이트 과정에서 일부 기능과 지원 범위가 변경될 수 있습니다.'
]
</script>

<style scoped>
.license-page { min-height: 100%; color: #344252; background: #f3f6fa; }
.license-content { width: calc(100% - 48px); margin: 0 auto; padding: 14px 0 48px; }
.license-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; min-height: 64px; margin-bottom: 16px; }
.license-heading-title { display: flex; align-items: flex-start; gap: 14px; }
.license-heading-icon { display: grid; place-items: center; width: 56px; height: 56px; flex: 0 0 56px; margin-top: 20px; border-radius: 15px; color: #fff; background: var(--q-primary); }
.license-heading-title > div { display: flex; min-height: 56px; flex-direction: column; justify-content: center; }
.license-header h1 { margin: 0; color: #303d49; font-size: 30px; font-weight: 800; }
.license-heading-title div > span { display: block; margin-top: 5px; color: #7c8996; font-size: 14px; }
.license-header-tools { display: flex; align-items: flex-end; flex-direction: column; gap: 13px; }
.license-navigation { margin-top: -3px; color: #3973d3; font-size: 16px; font-weight: 800; letter-spacing: .13em; line-height: 1.4; white-space: nowrap; }
.license-version { display: flex; align-items: center; gap: 5px; padding: 7px 10px; border-radius: 8px; font-weight: 700; }
.license-hero { display: grid; grid-template-columns: 72px minmax(0,1fr) auto; align-items: center; gap: 21px; padding: 30px; border-radius: 15px; color: #fff; background: linear-gradient(125deg,#1768b6,#3989d4); box-shadow: 0 12px 30px rgba(25,103,177,.22); }
.license-hero-icon { display: grid; place-items: center; width: 72px; height: 72px; border-radius: 18px; background: rgba(255,255,255,.15); font-size: 37px; }
.license-hero > div:nth-child(2) > span, .section-heading p, .contact-card > p { margin: 0 0 4px; font-size: 9px; font-weight: 800; letter-spacing: .14em; }
.license-hero h2 { margin: 0; font-size: 23px; }.license-hero p { max-width: 780px; margin: 8px 0 0; color: rgba(255,255,255,.8); font-size: 12px; line-height: 1.65; }
.license-status { display: flex; align-items: center; gap: 9px; min-width: 190px; padding: 14px; border-radius: 10px; background: rgba(255,255,255,.13); }.license-status > .q-icon { font-size: 28px; }.license-status span { display: grid; }.license-status small { color: rgba(255,255,255,.68); font-size: 8px; }.license-status strong { font-size: 12px; }
.license-summary-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 13px; margin-top: 15px; }.license-summary-grid article { display: flex; align-items: center; gap: 13px; padding: 18px; border: 1px solid #dfe6ed; border-radius: 11px; background: #fff; }.license-summary-grid article > span { display: grid; place-items: center; width: 48px; height: 48px; flex: 0 0 48px; border-radius: 12px; font-size: 24px; }.license-summary-grid article div { display: grid; }.license-summary-grid small { color: #89959f; font-size: 9px; }.license-summary-grid strong { color: #344552; font-size: 19px; }.license-summary-grid p { margin: 1px 0 0; color: #98a2aa; font-size: 8px; }
.summary-blue { color:#1976d2;background:#e7f3fd; }.summary-green { color:#16835d;background:#e5f7ee; }.summary-orange { color:#d0731c;background:#fff0e2; }.summary-violet { color:#7655c5;background:#f0ebff; }
.permission-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 15px; }.permission-card { padding: 24px; border: 1px solid #dfe6ed; border-radius: 13px; background: #fff; }.permission-card header { display: flex; align-items: center; gap: 12px; padding-bottom: 17px; border-bottom: 1px solid #e7ecf0; }.permission-card header > span { display: grid; place-items: center; width: 45px; height: 45px; border-radius: 12px; font-size: 24px; }.permission-card header p { margin: 0; font-size: 8px; font-weight: 800; letter-spacing: .13em; }.permission-card h2 { margin: 2px 0 0; color: #344552; font-size: 18px; }.permission-card ul { display: grid; gap: 12px; margin: 19px 0 0; padding: 0; list-style: none; }.permission-card li { display: flex; align-items: center; gap: 9px; color: #657580; font-size: 11px; }.allowed header > span { color:#16835d;background:#e5f7ee; }.allowed header p, .allowed li .q-icon { color:#16835d; }.restricted header > span { color:#d2634f;background:#fcebe7; }.restricted header p, .restricted li .q-icon { color:#d2634f; }
.ownership-section, .opensource-section { margin-top: 15px; padding: 26px; border: 1px solid #dfe6ed; border-radius: 13px; background: #fff; }.section-heading { display: flex; align-items: center; gap: 12px; }.section-heading > span { display: grid; place-items: center; width: 43px; height: 43px; border-radius: 11px; color: var(--q-primary); background: #e8f3fd; font-size: 22px; }.section-heading p { color: var(--q-primary); }.section-heading h2 { margin: 0; color: #344552; font-size: 19px; }.section-heading small { color: #929da6; font-size: 9px; }
.ownership-flow { display: grid; grid-template-columns: repeat(3,1fr); gap: 13px; margin-top: 22px; }.ownership-flow article { position: relative; padding: 21px; border: 1px solid #e0e7ed; border-radius: 11px; }.ownership-flow article > span { display: grid; place-items: center; width: 47px; height: 47px; border-radius: 12px; font-size: 24px; }.ownership-flow article > small { position: absolute; top: 19px; right: 20px; color: #d6dde3; font-size: 22px; font-weight: 800; }.ownership-flow h3 { margin: 14px 0 6px; color: #3e4e5b; font-size: 15px; }.ownership-flow p { min-height: 50px; margin: 0 0 14px; color: #7b8994; font-size: 10px; line-height: 1.6; }.ownership-flow em { display: inline-flex; align-items: center; gap: 4px; padding: 5px 8px; border-radius: 9px; color: #1a7f5e; background: #e5f6ee; font-size: 8px; font-style: normal; font-weight: 700; }
.ownership-blue { color:#1976d2;background:#e7f3fd; }.ownership-green { color:#16835d;background:#e5f7ee; }.ownership-violet { color:#7655c5;background:#f0ebff; }
.library-table-wrap { margin-top: 20px; overflow-x: auto; border: 1px solid #e0e6eb; border-radius: 10px; }.library-table { width: 100%; min-width: 700px; border-collapse: collapse; }.library-table th { padding: 11px 15px; color: #778590; background: #f5f8fa; font-size: 9px; text-align: left; }.library-table td { padding: 12px 15px; border-top: 1px solid #e9edf1; color: #667681; font-size: 10px; }.library-table td:first-child { display: flex; align-items: center; gap: 10px; }.library-table td:first-child span { display: grid; place-items: center; width: 32px; height: 32px; border-radius: 8px; font-size: 17px; }.library-table td:first-child strong { color: #40505d; }.library-table code { padding: 4px 7px; border-radius: 5px; color: #3973d3; background: #edf5fd; font-size: 9px; }.library-table em { display: inline-flex; align-items: center; gap: 5px; color: #16835d; font-size: 9px; font-style: normal; }.library-table em i { width: 6px; height: 6px; border-radius: 50%; background: #24ad7a; }.library-blue { color:#1976d2;background:#e7f3fd; }.library-green { color:#16835d;background:#e5f7ee; }.library-yellow { color:#ba8213;background:#fff5d9; }.library-violet { color:#7655c5;background:#f0ebff; }.library-cyan { color:#078b9e;background:#e4f8fa; }
.library-note { display: flex; align-items: center; gap: 6px; margin: 13px 0 0; color: #8a96a0; font-size: 9px; }
.disclaimer-contact { display: grid; grid-template-columns: 1.4fr 1fr; gap: 15px; margin-top: 15px; }.disclaimer-card, .contact-card { padding: 25px; border: 1px solid #dfe6ed; border-radius: 13px; background: #fff; }.disclaimer-card ul { display: grid; gap: 9px; margin: 18px 0; padding: 0; list-style: none; }.disclaimer-card li { display: flex; gap: 5px; color: #6f7e89; font-size: 10px; line-height: 1.5; }.disclaimer-card li .q-icon { color: var(--q-primary); }.legal-notice { display: flex; align-items: center; gap: 7px; padding: 11px; border-radius: 8px; color: #a06a1b; background: #fff5df; font-size: 9px; }
.contact-card { color: #fff; background: linear-gradient(140deg,#283e56,#1c6aab); }.contact-icon { display: grid; place-items: center; width: 49px; height: 49px; margin-bottom: 15px; border-radius: 13px; background: rgba(255,255,255,.14); font-size: 25px; }.contact-card > p { color: #8ecaff; }.contact-card h2 { margin: 0; font-size: 19px; }.contact-card > span:not(.contact-icon) { display: block; margin-top: 8px; color: rgba(255,255,255,.7); font-size: 10px; line-height: 1.6; }.contact-card a { display: flex; align-items: center; justify-content: center; gap: 7px; margin-top: 18px; padding: 11px; border-radius: 8px; color: #1d639d; background: #fff; font-size: 11px; font-weight: 800; text-decoration: none; }.contact-card > small { display: flex; align-items: center; justify-content: center; gap: 5px; margin-top: 10px; color: rgba(255,255,255,.57); font-size: 8px; }
.license-footer { display: flex; justify-content: space-between; margin-top: 15px; padding: 13px 4px; color: #929da6; font-size: 9px; }
@media (max-width: 900px) { .license-summary-grid { grid-template-columns: repeat(2,1fr); }.ownership-flow { grid-template-columns: 1fr; }.ownership-flow p { min-height: 0; }.disclaimer-contact { grid-template-columns: 1fr; }.license-hero { grid-template-columns: 60px 1fr; }.license-status { grid-column: 1/3; } }
@media (max-width: 650px) { .license-content { width: min(100% - 28px,560px); }.license-header { flex-direction: column; }.license-header-tools { width: 100%; align-items: flex-start; }.license-navigation { font-size: 13px; white-space: normal; }.license-hero { grid-template-columns: 1fr; padding: 23px; }.license-status { grid-column: auto; }.license-summary-grid, .permission-grid { grid-template-columns: 1fr; }.license-heading-title > div > span { font-size: 12px; }.license-version { display: none; }.license-footer { flex-direction: column; gap: 5px; } }
</style>
