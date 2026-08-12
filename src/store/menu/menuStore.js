import { defineStore } from 'pinia'

// public/menus.json 조회 실패 시 사용하는 기본 메뉴 (파일과 동일 구조)
const DEFAULT_MENUS = [
  {
    type: 'group',
    label: 'UI TOOL 소개',
    visible: true,
    children: [
      { label: '도구 소개', path: '/intro/overview', icon: 'info', visible: true },
      { label: '주요 기능', path: '/intro/features', icon: 'extension', visible: true },
      { label: '화면 구성', path: '/intro/interface', icon: 'dashboard', visible: true },
      { label: '개발 현황', path: '/intro/status', icon: 'update', visible: true }
    ]
  },
  { type: 'link', label: '가이드', path: '/guide', icon: 'menu_book', visible: true },
  {
    type: 'group',
    label: '예제',
    visible: true,
    children: [
      { label: 'Dashboard', path: '/examples/dashboard', icon: 'chevron_right', visible: true },
      { label: 'Layout', path: '/examples/layout', icon: 'chevron_right', visible: true },
      { label: 'Admin', path: '/examples/page', icon: 'chevron_right', visible: true },
      { label: 'Component', path: '/examples/component', icon: 'chevron_right', visible: true },
      { label: 'Form', path: '/examples/form', icon: 'chevron_right', visible: true }
    ]
  },
  { type: 'link', label: '질의응답', path: '/qna', icon: 'contact_support', visible: true },
  { type: 'link', label: '개선 제안', path: '/suggestion', icon: 'tips_and_updates', visible: true },
  { type: 'link', label: '라이센스', path: '/license', icon: 'verified_user', visible: true },
  { type: 'link', label: '메뉴 관리', path: '/admin/menus', icon: 'edit_note', visible: true }
]

export const useMenuStore = defineStore('menu', {
  state: () => ({
    menus: structuredClone(DEFAULT_MENUS),
    loaded: false,
    loading: false,
    errorMessage: ''
  }),

  getters: {
    /** visible=false 항목을 제외한 화면 표시용 메뉴 */
    visibleMenus: (state) =>
      state.menus
        .filter((menu) => menu.visible !== false)
        .map((menu) =>
          menu.type === 'group'
            ? { ...menu, children: (menu.children || []).filter((child) => child.visible !== false) }
            : menu
        )
        .filter((menu) => menu.type !== 'group' || menu.children.length > 0)
  },

  actions: {
    /** public/menus.json 조회 (실패 시 기본 메뉴 유지) */
    async loadMenus() {
      if (this.loading) return
      this.loading = true
      this.errorMessage = ''
      try {
        // 캐시된 이전 파일을 보지 않도록 timestamp 쿼리를 붙인다
        const response = await fetch(`menus.json?t=${Date.now()}`)
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const data = await response.json()
        if (!Array.isArray(data.menus)) throw new Error('menus 배열이 없습니다')
        this.menus = data.menus
      } catch (error) {
        this.errorMessage = `menus.json을 불러오지 못해 기본 메뉴를 사용합니다. (${error.message})`
      } finally {
        this.loaded = true
        this.loading = false
      }
    },

    /** 기본 메뉴 구조 복사본 반환 (관리 화면의 "기본값 복원"용) */
    getDefaultMenus() {
      return structuredClone(DEFAULT_MENUS)
    }
  }
})
