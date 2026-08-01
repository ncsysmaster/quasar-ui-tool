<template>
  <q-page class="home-page">
    <main class="home-content">
      <section class="product-intro" aria-labelledby="product-title">
        <img class="tool-logo" :src="toolLogo" alt="Quasar UI Tool 로고" />
        <div class="product-copy">
          <h1 id="product-title">Quasar UI Tool</h1>
          <p class="product-name">Quasar UI TOOL</p>
          <p class="product-summary">
            VS Code editor integration for Quasar UI page JSON files.
          </p>
        </div>
      </section>

      <section class="extension-intro" aria-labelledby="extension-title">
        <h2 id="extension-title">Quasar UI Tool VS Code Extension</h2>
        <p>
          This extension opens <code>src/pages/*.json</code> files with a visual
          editor inside VS Code and provides a Quasar Tool Activity Bar container.
        </p>
      </section>

      <section class="development-section" aria-labelledby="development-title">
        <h2 id="development-title">Run In Development</h2>
        <ol>
          <li>Open this repository in VS Code.</li>
          <li>Run the <strong>Run Quasar UI Tool Extension</strong> launch configuration.</li>
          <li>
            In the Extension Development Host, open
            <code>src/pages/IndexPage.json</code>.
          </li>
          <li>
            Choose <strong>Open With… → Quasar UI Tool Editor</strong> if the
            visual editor is not selected automatically.
          </li>
          <li>
            Open the Quasar Tool Activity Bar item to use Component Palette,
            Properties, Page Tree, and DataSet views.
          </li>
        </ol>
      </section>

      <section class="resource-section" aria-labelledby="resources-title">
        <div class="resource-heading">
          <div>
            <p class="section-kicker">GET STARTED</p>
            <h2 id="resources-title">Start building with Quasar UI Tool</h2>
          </div>
          <p>필요한 메뉴로 바로 이동해 Quasar UI Tool을 시작해 보세요.</p>
        </div>

        <div class="resource-grid">
          <router-link
            v-for="resource in internalResources"
            :key="resource.title"
            class="resource-card"
            :to="resource.to"
          >
            <span class="resource-icon" :class="resource.accent">
              <q-icon :name="resource.icon" size="28px" />
            </span>
            <span class="resource-content">
              <strong>{{ resource.title }}</strong>
              <small>{{ resource.description }}</small>
            </span>
            <q-icon class="arrow-icon" name="arrow_forward" size="20px" />
          </router-link>

          <a
            v-for="resource in contactResources"
            :key="resource.title"
            class="resource-card"
            :href="resource.href"
          >
            <span class="resource-icon" :class="resource.accent">
              <q-icon :name="resource.icon" size="28px" />
            </span>
            <span class="resource-content">
              <strong>{{ resource.title }}</strong>
              <small>{{ resource.description }}</small>
            </span>
            <q-icon class="arrow-icon" name="open_in_new" size="20px" />
          </a>

          <a
            class="resource-card"
            :href="extensionDownloadUrl"
            download="quasar-tool-vscode-0.1.0.vsix"
          >
            <span class="resource-icon accent-violet">
              <q-icon name="download" size="28px" />
            </span>
            <span class="resource-content">
              <strong>Extension Download</strong>
              <small>VS Code Extension 설치 파일을 다운로드합니다.</small>
            </span>
            <q-icon class="arrow-icon" name="file_download" size="20px" />
          </a>
        </div>
      </section>
    </main>
  </q-page>
</template>

<script setup>
import toolLogo from '../../docs/QuasarUiTool.png'
import extensionDownloadUrl from '../../vscode-extension/quasar-tool-vscode-0.1.0.vsix?url'

const internalResources = [
  {
    title: 'Quick Start',
    description: '설치부터 첫 화면 생성까지 빠르게 시작합니다.',
    icon: 'rocket_launch',
    accent: 'accent-blue',
    to: '/guide'
  },
  {
    title: 'UI Tool Guide',
    description: '에디터 구성과 주요 기능을 확인합니다.',
    icon: 'menu_book',
    accent: 'accent-cyan',
    to: '/intro/features'
  },
  {
    title: 'Examples',
    description: '컴포넌트와 화면 구성 예제를 살펴봅니다.',
    icon: 'dashboard_customize',
    accent: 'accent-orange',
    to: '/examples/dashboard'
  },
  {
    title: '질의응답',
    description: '설치 및 사용 중 궁금한 내용을 질문하고 답변을 확인합니다.',
    icon: 'contact_support',
    accent: 'accent-indigo',
    to: '/qna'
  },
  {
    title: '개선 제안',
    description: '새로운 기능이나 사용성 개선 의견을 제안하고 처리 현황을 확인합니다.',
    icon: 'tips_and_updates',
    accent: 'accent-yellow',
    to: '/suggestion'
  }
]

const contactResources = [
  {
    title: '사용자 등록',
    description: 'Quasar UI Tool 사용자 등록을 요청합니다.',
    icon: 'person_add',
    accent: 'accent-rose',
    href: 'mailto:mailmoon@naver.com?subject=%5BQuasar%20UI%20Tool%20사용자%20등록%20요청%5D'
  },
  {
    title: 'Email',
    description: 'mailmoon@naver.com으로 직접 문의합니다.',
    icon: 'mail',
    accent: 'accent-green',
    href: 'mailto:mailmoon@naver.com?subject=Quasar%20UI%20Tool%20문의'
  },
]
</script>

<style scoped>
.home-page {
  color: #4f4f4f;
  background: #fff;
}

.home-content {
  width: min(1180px, calc(100% - 48px));
  margin: 0 auto;
  padding: 34px 0 72px;
}

.product-intro {
  display: flex;
  align-items: center;
  gap: 28px;
}

.tool-logo {
  width: 122px;
  height: 122px;
  border-radius: 21px;
  object-fit: cover;
  box-shadow: 0 7px 18px rgba(8, 39, 83, 0.16);
}

.product-copy h1 {
  margin: 0 0 2px;
  color: #505050;
  font-size: 27px;
  font-weight: 700;
  line-height: 1.25;
}

.product-name,
.product-summary {
  margin: 0;
  color: #555;
  font-size: 22px;
  line-height: 1.38;
}

.extension-intro {
  margin-top: 20px;
}

.extension-intro h2,
.development-section h2 {
  margin: 0;
  color: #3d4650;
  font-size: 28px;
  font-weight: 700;
}

.extension-intro p {
  margin: 12px 0 0;
  color: #4f4f4f;
  font-size: 18px;
  line-height: 1.7;
}

.extension-intro code,
.development-section code {
  color: inherit;
  font-family: inherit;
}

.development-section {
  margin-top: 26px;
  padding-left: 7px;
}

.development-section ol {
  margin: 22px 0 0;
  padding-left: 14px;
  color: #555;
  font-size: 18px;
  line-height: 1.62;
}

.development-section strong {
  font-weight: 400;
}

.resource-section {
  margin-top: 60px;
  padding-top: 38px;
  border-top: 1px solid #e1e6ec;
}

.resource-heading {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
}

.section-kicker {
  margin: 0 0 5px;
  color: var(--q-primary);
  font-size: 14px;
  font-weight: 800;
  letter-spacing: 0.13em;
}

.resource-heading h2 {
  margin: 0;
  color: #303b47;
  font-size: 29px;
  font-weight: 700;
}

.resource-heading > p {
  margin: 0;
  color: #7a8490;
  font-size: 16px;
}

.resource-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 15px;
  margin-top: 23px;
}

.resource-card {
  display: flex;
  align-items: center;
  gap: 16px;
  min-height: 102px;
  padding: 19px 20px;
  border: 1px solid #dfe6ed;
  border-radius: 12px;
  color: inherit;
  background: #fff;
  box-shadow: 0 7px 22px rgba(29, 61, 91, 0.05);
  text-decoration: none;
  transition:
    transform 160ms ease,
    border-color 160ms ease,
    box-shadow 160ms ease;
}

.resource-card:hover {
  border-color: rgba(25, 118, 210, 0.45);
  box-shadow: 0 12px 28px rgba(29, 76, 119, 0.11);
  transform: translateY(-2px);
}

.resource-icon {
  display: grid;
  place-items: center;
  width: 54px;
  height: 54px;
  flex: 0 0 54px;
  border-radius: 14px;
}

.accent-blue {
  color: #176cc0;
  background: #e7f3ff;
}

.accent-cyan {
  color: #0088a6;
  background: #e5f8fb;
}

.accent-orange {
  color: #d46a17;
  background: #fff1e5;
}

.accent-violet {
  color: #7253c9;
  background: #f0ebff;
}

.accent-green {
  color: #16835c;
  background: #e6f7ef;
}

.accent-indigo {
  color: #4d5fc1;
  background: #eceffd;
}

.accent-yellow {
  color: #b7790b;
  background: #fff6d9;
}

.accent-rose {
  color: #bd4565;
  background: #fdebf0;
}

.resource-content {
  display: grid;
  gap: 6px;
  min-width: 0;
}

.resource-content strong {
  color: #344251;
  font-size: 19px;
}

.resource-content small {
  color: #78838f;
  font-size: 15px;
  line-height: 1.55;
}

.arrow-icon {
  margin-left: auto;
  color: #9aa5af;
}

@media (max-width: 760px) {
  .home-content {
    width: min(100% - 30px, 560px);
    padding-top: 26px;
  }

  .product-intro {
    align-items: flex-start;
    gap: 18px;
  }

  .tool-logo {
    width: 94px;
    height: 94px;
    border-radius: 17px;
  }

  .product-copy h1 {
    font-size: 22px;
  }

  .product-name,
  .product-summary {
    font-size: 17px;
  }

  .extension-intro h2,
  .development-section h2 {
    font-size: 24px;
  }

  .extension-intro p,
  .development-section ol {
    font-size: 16px;
  }

  .resource-heading {
    align-items: flex-start;
    flex-direction: column;
    gap: 8px;
  }

  .resource-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 430px) {
  .product-intro {
    flex-direction: column;
  }

  .development-section {
    padding-left: 0;
  }

  .resource-card {
    padding-inline: 16px;
  }
}
</style>
