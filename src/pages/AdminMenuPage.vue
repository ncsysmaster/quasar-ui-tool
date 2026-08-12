<template>
  <q-page class="admin-menu-page">
    <main class="admin-content">
      <section class="admin-heading">
        <div>
          <p class="section-kicker">ADMIN</p>
          <h1>메뉴 관리</h1>
        </div>
        <p>
          상단 네비게이션과 왼쪽 드로어에 표시되는 메뉴를 편집합니다.
          편집 후 <strong>화면에 적용</strong>으로 즉시 확인하고,
          <strong>파일로 저장</strong>한 <code>menus.json</code>을
          프로젝트의 <code>public/menus.json</code>에 넣으면 영구 반영됩니다.
        </p>
      </section>

      <section class="admin-toolbar">
        <q-btn unelevated color="primary" no-caps icon="visibility" label="화면에 적용" @click="applyToScreen" />
        <q-btn outline color="primary" no-caps icon="save" label="파일로 저장" @click="saveToFile" />
        <q-space />
        <q-btn flat color="grey-8" no-caps icon="refresh" label="파일 다시 불러오기" @click="reloadFromFile" />
        <q-btn flat color="grey-8" no-caps icon="settings_backup_restore" label="기본값 복원" @click="restoreDefaults" />
      </section>

      <q-banner v-if="menuStore.errorMessage" dense rounded class="bg-orange-1 text-orange-9 q-mb-md">
        {{ menuStore.errorMessage }}
      </q-banner>

      <section class="menu-editor">
        <div
          v-for="(menu, index) in draft"
          :key="menu._key"
          class="menu-card"
          :class="{ 'menu-hidden': menu.visible === false }"
        >
          <div class="menu-row">
            <q-icon
              class="menu-type-icon"
              :name="menu.type === 'group' ? 'folder' : 'link'"
              size="22px"
            />
            <q-input v-model="menu.label" dense outlined label="메뉴명" class="field-label" />
            <template v-if="menu.type === 'link'">
              <q-input v-model="menu.path" dense outlined label="경로" class="field-path" />
              <q-input v-model="menu.icon" dense outlined label="아이콘" class="field-icon">
                <template #prepend><q-icon :name="menu.icon || 'chevron_right'" /></template>
              </q-input>
            </template>
            <span v-else class="group-count">하위 {{ menu.children.length }}개</span>
            <q-toggle v-model="menu.visible" dense label="표시" />
            <div class="row-actions">
              <q-btn flat round dense icon="arrow_upward" :disable="index === 0" @click="moveItem(draft, index, -1)" />
              <q-btn flat round dense icon="arrow_downward" :disable="index === draft.length - 1" @click="moveItem(draft, index, 1)" />
              <q-btn flat round dense color="negative" icon="delete" @click="removeItem(draft, index)" />
            </div>
          </div>

          <div v-if="menu.type === 'group'" class="child-list">
            <div
              v-for="(child, childIndex) in menu.children"
              :key="child._key"
              class="menu-row child-row"
              :class="{ 'menu-hidden': child.visible === false }"
            >
              <q-icon class="menu-type-icon" name="subdirectory_arrow_right" size="20px" />
              <q-input v-model="child.label" dense outlined label="메뉴명" class="field-label" />
              <q-input v-model="child.path" dense outlined label="경로" class="field-path" />
              <q-input v-model="child.icon" dense outlined label="아이콘" class="field-icon">
                <template #prepend><q-icon :name="child.icon || 'chevron_right'" /></template>
              </q-input>
              <q-toggle v-model="child.visible" dense label="표시" />
              <div class="row-actions">
                <q-btn flat round dense icon="arrow_upward" :disable="childIndex === 0" @click="moveItem(menu.children, childIndex, -1)" />
                <q-btn flat round dense icon="arrow_downward" :disable="childIndex === menu.children.length - 1" @click="moveItem(menu.children, childIndex, 1)" />
                <q-btn flat round dense color="negative" icon="delete" @click="removeItem(menu.children, childIndex)" />
              </div>
            </div>
            <q-btn flat no-caps color="primary" icon="add" label="하위 메뉴 추가" @click="addChild(menu)" />
          </div>
        </div>

        <div class="add-actions">
          <q-btn outline no-caps color="primary" icon="add_link" label="메뉴 추가" @click="addLink" />
          <q-btn outline no-caps color="primary" icon="create_new_folder" label="그룹 추가" @click="addGroup" />
        </div>
      </section>

      <section class="path-help">
        <h2>사용 가능한 경로</h2>
        <div class="path-chips">
          <q-chip
            v-for="path in knownPaths"
            :key="path"
            dense
            clickable
            icon="content_copy"
            @click="copyPath(path)"
          >
            {{ path }}
          </q-chip>
        </div>
      </section>
    </main>
  </q-page>
</template>

<script setup>
import { ref } from 'vue'
import { useQuasar, copyToClipboard } from 'quasar'
import { useMenuStore } from '../store/menu/menuStore'

const $q = useQuasar()
const menuStore = useMenuStore()

// 라우터에 정의된 이동 가능 경로 목록 (경로 입력 참고용)
const knownPaths = [
  '/', '/intro/overview', '/intro/features', '/intro/interface', '/intro/status',
  '/guide', '/examples/dashboard', '/examples/layout', '/examples/page',
  '/examples/component', '/examples/form', '/qna', '/suggestion', '/license',
  '/admin/menus'
]

let keySeq = 0

/** 편집용 복사본에 v-for key/누락 필드를 채워 넣는다 (반응형 프록시 제거를 위해 JSON 복제) */
function toDraft(menus) {
  return JSON.parse(JSON.stringify(menus)).map((menu) => ({
    ...menu,
    _key: ++keySeq,
    visible: menu.visible !== false,
    children: (menu.children || []).map((child) => ({
      ...child,
      _key: ++keySeq,
      visible: child.visible !== false
    }))
  }))
}

/** 편집용 필드(_key 등)를 제거한 저장용 구조 반환 */
function toMenus(draftMenus) {
  return draftMenus.map((menu) => {
    if (menu.type === 'group') {
      return {
        type: 'group',
        label: menu.label,
        visible: menu.visible,
        children: menu.children.map(({ label, path, icon, visible }) => ({ label, path, icon, visible }))
      }
    }
    const { label, path, icon, visible } = menu
    return { type: 'link', label, path, icon, visible }
  })
}

const draft = ref([])

async function initDraft() {
  if (!menuStore.loaded) await menuStore.loadMenus()
  draft.value = toDraft(menuStore.menus)
}
initDraft()

function moveItem(list, index, delta) {
  const target = index + delta
  ;[list[index], list[target]] = [list[target], list[index]]
}

function removeItem(list, index) {
  list.splice(index, 1)
}

function addLink() {
  draft.value.push({ _key: ++keySeq, type: 'link', label: '새 메뉴', path: '/', icon: 'chevron_right', visible: true, children: [] })
}

function addGroup() {
  draft.value.push({ _key: ++keySeq, type: 'group', label: '새 그룹', visible: true, children: [] })
}

function addChild(menu) {
  menu.children.push({ _key: ++keySeq, label: '새 메뉴', path: '/', icon: 'chevron_right', visible: true })
}

/** 현재 편집 내용을 스토어에 반영해 네비게이션에서 즉시 확인 */
function applyToScreen() {
  menuStore.menus = toMenus(draft.value)
  $q.notify({ type: 'positive', message: '현재 화면에 적용했습니다. (새로고침하면 menus.json 기준으로 돌아갑니다)' })
}

/** menus.json 형식으로 파일 저장 (File System Access 미지원 브라우저는 다운로드) */
async function saveToFile() {
  const json = JSON.stringify({ menus: toMenus(draft.value) }, null, 2)
  if (window.showSaveFilePicker) {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: 'menus.json',
        types: [{ description: 'JSON', accept: { 'application/json': ['.json'] } }]
      })
      const writable = await handle.createWritable()
      await writable.write(json)
      await writable.close()
      $q.notify({ type: 'positive', message: 'menus.json을 저장했습니다. public/menus.json에 넣으면 사이트에 반영됩니다.' })
      return
    } catch (error) {
      if (error.name === 'AbortError') return
    }
  }
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = 'menus.json'
  anchor.click()
  URL.revokeObjectURL(url)
  $q.notify({ type: 'positive', message: 'menus.json을 다운로드했습니다. public/menus.json에 넣으면 사이트에 반영됩니다.' })
}

async function reloadFromFile() {
  await menuStore.loadMenus()
  draft.value = toDraft(menuStore.menus)
  $q.notify({ message: 'menus.json을 다시 불러왔습니다.' })
}

function restoreDefaults() {
  draft.value = toDraft(menuStore.getDefaultMenus())
  $q.notify({ message: '기본 메뉴 구성으로 되돌렸습니다. 저장 전까지 파일에는 반영되지 않습니다.' })
}

function copyPath(path) {
  copyToClipboard(path).then(() => $q.notify({ message: `${path} 복사됨`, timeout: 900 }))
}
</script>

<style scoped>
.admin-menu-page { background: #fff; }
.admin-content { max-width: 1080px; margin: 0 auto; padding: 40px 24px 72px; }
.section-kicker { margin: 0; color: #6f8093; font-size: 12px; font-weight: 700; letter-spacing: .1em; }
.admin-heading h1 { margin: 4px 0 10px; font-size: 30px; font-weight: 700; }
.admin-heading p { max-width: 760px; color: #55636f; line-height: 1.6; }
.admin-heading code { padding: 1px 6px; border-radius: 5px; background: #eef3f8; font-size: 13px; }
.admin-toolbar { display: flex; flex-wrap: wrap; gap: 8px; margin: 18px 0 20px; }
.menu-editor { display: grid; gap: 12px; }
.menu-card { padding: 12px 14px; border: 1px solid #dfe6ec; border-radius: 12px; background: #fbfcfe; }
.menu-row { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; }
.menu-type-icon { color: #748393; }
.field-label { width: 190px; }
.field-path { width: 230px; }
.field-icon { width: 190px; }
.group-count { color: #8a97a3; font-size: 13px; }
.row-actions { display: flex; margin-left: auto; }
.menu-hidden > .menu-type-icon,
.menu-hidden.child-row { opacity: .55; }
.child-list { display: grid; gap: 8px; margin: 12px 0 0 30px; padding-top: 12px; border-top: 1px dashed #dfe6ec; justify-items: start; }
.child-row { width: 100%; }
.add-actions { display: flex; gap: 8px; margin-top: 4px; }
.path-help { margin-top: 36px; }
.path-help h2 { margin: 0 0 10px; font-size: 18px; }
.path-chips { display: flex; flex-wrap: wrap; gap: 6px; }

@media (max-width: 760px) {
  .field-label, .field-path, .field-icon { width: 100%; }
  .row-actions { margin-left: 0; }
}
</style>
