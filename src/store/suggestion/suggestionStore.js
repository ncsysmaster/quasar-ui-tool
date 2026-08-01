import { defineStore } from 'pinia'

export const useSuggestionStore = defineStore('suggestion', {
  state: () => ({
    // 목록 조회 조건 (페이징 + 검색)
    search: { page: 1, size: 10, category: null, status: null, keyword: '' },
    items: [],
    total: 0,
    detail: null,
    loading: false,
    saving: false,
    errorMessage: ''
  }),

  getters: {
    totalPages: (state) => Math.max(1, Math.ceil(state.total / state.search.size))
  },

  actions: {
    /** 제안 목록 조회 */
    async fetchList() {
      this.loading = true
      this.errorMessage = ''
      try {
        const url = this.getUrlQueryParam('/suggestions', {
          page: this.search.page,
          size: this.search.size,
          category: this.search.category,
          status: this.search.status,
          keyword: this.search.keyword
        })
        const data = await this.request(url)
        this.items = data.items || []
        this.total = data.total || 0
      } catch (error) {
        this.errorMessage = `목록을 불러오지 못했습니다. 서버(8081) 실행 여부를 확인해 주세요. (${error.message})`
        this.items = []
        this.total = 0
      } finally {
        this.loading = false
      }
    },

    /** 1페이지부터 다시 조회 */
    searchList() {
      this.search.page = 1
      return this.fetchList()
    },

    /** 제안 상세 조회 (성공 여부 반환) */
    async openDetail(suggestionId) {
      try {
        this.detail = await this.request(`/suggestions/${suggestionId}`)
        return true
      } catch (error) {
        this.errorMessage = `상세 내용을 불러오지 못했습니다. (${error.message})`
        return false
      }
    },

    /** 제안 등록 (실패 시 Error throw) */
    async submitSuggestion(payload) {
      this.saving = true
      try {
        await this.request('/suggestions', {
          method: 'POST',
          body: JSON.stringify(payload)
        })
        await this.searchList()
      } finally {
        this.saving = false
      }
    },

    /** 공감(추천) 증가 (실패 시 Error throw) */
    async likeSuggestion() {
      this.detail = await this.request(`/suggestions/${this.detail.suggestionId}/like`, {
        method: 'POST'
      })
      this.fetchList()
    },

    /** 관리자 회신 등록 (실패 시 Error throw) */
    async submitReply(payload) {
      this.saving = true
      try {
        this.detail = await this.request(`/suggestions/${this.detail.suggestionId}/reply`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        })
        this.fetchList()
      } finally {
        this.saving = false
      }
    },

    /** 제안 삭제 (실패 시 Error throw) */
    async removeSuggestion() {
      await this.request(`/suggestions/${this.detail.suggestionId}`, { method: 'DELETE' })
      this.detail = null
      this.fetchList()
    }
  }
})
