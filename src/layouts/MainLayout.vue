<template>
  <q-layout view="hHh Lpr fFf">
    <q-header elevated>
      <q-toolbar>
        <q-toolbar-title>Quasar UI Builder</q-toolbar-title>

        <q-btn-dropdown flat stretch label="UI TOOL 소개">
          <q-list dense>
            <q-item v-close-popup clickable to="/intro/development-standards">
              <q-item-section>개발표준</q-item-section>
            </q-item>
            <q-item v-close-popup clickable to="/intro/requirements">
              <q-item-section>요구사항 목록</q-item-section>
            </q-item>
            <q-item v-close-popup clickable to="/intro/features">
              <q-item-section>기능목록</q-item-section>
            </q-item>
          </q-list>
        </q-btn-dropdown>

        <q-btn flat stretch label="가이드" to="/guide" />

        <q-btn-dropdown flat stretch label="예제">
          <q-list dense>
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

        <q-btn flat stretch label="라이센트" to="/license" />
      </q-toolbar>
    </q-header>

    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup>
const exampleMenus = [
  { label: '기본 대시보드', path: '/examples/dashboard' },
  { label: '레이아웃', path: '/examples/layout' },
  { label: '페이지', path: '/examples/page' },
  { label: '콤포넌트', path: '/examples/component' },
  { label: '콘텐츠', path: '/examples/content' },
  { label: '폼', path: '/examples/form' },
  { label: '지원', path: '/examples/support' }
]
</script>
