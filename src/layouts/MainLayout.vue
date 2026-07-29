<template>
  <q-layout view="hHh Lpr fFf" class="site-layout">
    <q-header elevated class="site-header">
      <q-toolbar class="site-toolbar">
        <router-link class="brand-link" to="/">Quasar UI Builder</router-link>
        <q-btn
          class="menu-button"
          flat
          round
          dense
          icon="menu"
          aria-label="왼쪽 메뉴 열기"
          @click="leftDrawerOpen = !leftDrawerOpen"
        />
        <q-space />

        <nav class="desktop-nav" aria-label="주요 메뉴">
          <q-btn-dropdown flat no-caps label="UI TOOL 소개">
            <q-list class="nav-dropdown">
              <q-item
                v-for="item in introMenus"
                :key="item.path"
                v-close-popup
                clickable
                :to="item.path"
              >
                <q-item-section>{{ item.label }}</q-item-section>
              </q-item>
            </q-list>
          </q-btn-dropdown>
          <q-btn flat no-caps label="가이드" to="/guide" />
          <q-btn-dropdown flat no-caps label="예제">
            <q-list class="nav-dropdown">
              <q-item
                v-for="item in exampleMenus"
                :key="item.path"
                v-close-popup
                clickable
                :to="item.path"
              >
                <q-item-section>{{ item.label }}</q-item-section>
              </q-item>
            </q-list>
          </q-btn-dropdown>
          <q-btn flat no-caps label="질의응답" to="/qna" />
          <q-btn flat no-caps label="라이센스" to="/license" />
        </nav>
      </q-toolbar>
    </q-header>

    <q-drawer
      v-model="leftDrawerOpen"
      side="left"
      bordered
      :overlay="$q.screen.lt.md"
      :width="280"
      class="left-drawer"
    >
      <div class="drawer-header">
        <router-link class="drawer-home-link" to="/" @click="closeDrawerOnMobile">
          <div class="drawer-logo"><q-icon name="widgets" size="24px" /></div>
          <div>
            <strong>Quasar UI Tool</strong>
            <span>Navigation</span>
          </div>
        </router-link>
      </div>

      <q-list padding class="drawer-menu">
        <q-item-label header>UI TOOL 소개</q-item-label>
        <q-item
          v-for="item in introMenus"
          :key="item.path"
          clickable
          :to="item.path"
          active-class="drawer-item-active"
          @click="closeDrawerOnMobile"
        >
          <q-item-section avatar><q-icon :name="item.icon" /></q-item-section>
          <q-item-section>{{ item.label }}</q-item-section>
        </q-item>

        <q-separator spaced />
        <q-item
          clickable
          to="/guide"
          active-class="drawer-item-active"
          @click="closeDrawerOnMobile"
        >
          <q-item-section avatar><q-icon name="menu_book" /></q-item-section>
          <q-item-section>가이드</q-item-section>
        </q-item>

        <q-item-label header>예제</q-item-label>
        <q-item
          v-for="item in exampleMenus"
          :key="`drawer-${item.path}`"
          clickable
          :to="item.path"
          active-class="drawer-item-active"
          @click="closeDrawerOnMobile"
        >
          <q-item-section avatar><q-icon name="chevron_right" /></q-item-section>
          <q-item-section>{{ item.label }}</q-item-section>
        </q-item>

        <q-separator spaced />
        <q-item
          clickable
          to="/qna"
          active-class="drawer-item-active"
          @click="closeDrawerOnMobile"
        >
          <q-item-section avatar><q-icon name="contact_support" /></q-item-section>
          <q-item-section>질의응답</q-item-section>
        </q-item>
        <q-item
          clickable
          to="/license"
          active-class="drawer-item-active"
          @click="closeDrawerOnMobile"
        >
          <q-item-section avatar><q-icon name="verified_user" /></q-item-section>
          <q-item-section>라이센스</q-item-section>
        </q-item>
      </q-list>
    </q-drawer>

    <q-page-container><router-view /></q-page-container>
  </q-layout>
</template>

<script setup>
import { ref } from 'vue'
import { useQuasar } from 'quasar'

const $q = useQuasar()
const leftDrawerOpen = ref(false)

const introMenus = [
  { label: '도구 소개', path: '/intro/overview', icon: 'info' },
  { label: '주요 기능', path: '/intro/features', icon: 'extension' },
  { label: '화면 구성', path: '/intro/interface', icon: 'dashboard' },
  { label: '개발 현황', path: '/intro/status', icon: 'update' }
]

const exampleMenus = [
  { label: 'Dashboard', path: '/examples/dashboard' },
  { label: 'Layout', path: '/examples/layout' },
  { label: 'Admin', path: '/examples/page' },
  { label: 'Component', path: '/examples/component' },
  { label: 'Form', path: '/examples/form' }
]

function closeDrawerOnMobile() {
  if ($q.screen.lt.md) leftDrawerOpen.value = false
}
</script>

<style scoped>
.site-layout { background: #fff; }
.site-header, .site-toolbar { background: var(--q-primary); }
.site-toolbar { min-height: 72px; width: 100%; padding: 0 24px; }
.brand-link { color: #fff; font-size: 28px; font-weight: 500; text-decoration: none; }
.menu-button { margin-left: 14px; color: #fff; }
.desktop-nav { display: flex; align-items: stretch; height: 72px; }
.desktop-nav :deep(.q-btn) {
  min-height: 72px;
  padding: 0 24px;
  color: #fff;
  font-size: 18px;
  font-weight: 700;
}
.nav-dropdown { min-width: 190px; }
.left-drawer { background: #fff; }
.drawer-header {
  display: flex;
  align-items: center;
  min-height: 76px;
  padding: 10px 12px;
  color: #fff;
  background: var(--q-primary);
}
.drawer-home-link {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 4px 6px;
  border-radius: 9px;
  color: #fff;
  text-decoration: none;
  transition: background .15s ease;
}
.drawer-home-link:hover,
.drawer-home-link:focus-visible {
  background: rgba(255, 255, 255, .12);
  outline: none;
}
.drawer-home-link > div:nth-child(2) { display: grid; flex: 1; }
.drawer-header strong { font-size: 17px; }
.drawer-header span { color: rgba(255, 255, 255, 0.74); font-size: 12px; }
.drawer-logo {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.17);
}
.drawer-menu :deep(.q-item) {
  min-height: 48px;
  margin: 2px 8px;
  border-radius: 8px;
  color: #4e5c69;
  font-size: 15px;
}
.drawer-menu :deep(.q-item__section--avatar) { min-width: 38px; color: #748393; }
.drawer-menu :deep(.q-item__label--header) {
  padding: 20px 20px 7px;
  color: #919ca6;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.06em;
}
.drawer-menu :deep(.drawer-item-active) {
  color: var(--q-primary);
  background: #e9f3fd;
  font-weight: 700;
}
.drawer-menu :deep(.drawer-item-active .q-item__section--avatar) { color: var(--q-primary); }

@media (max-width: 760px) {
  .site-toolbar { min-height: 58px; padding: 0 10px 0 16px; }
  .brand-link { font-size: 20px; }
  .menu-button { order: -1; margin: 0 8px 0 0; }
  .desktop-nav { display: none; }
}
</style>
