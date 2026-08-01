import { defineStore } from 'pinia'

export const useQnaStore = defineStore('qna', {
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
    /** 질문 목록 조회 */
    async fetchList() {
      this.loading = true
      this.errorMessage = ''
      try {
        // 공통 함수(boot/pinia.js 주입)로 쿼리 파라미터 URL 생성
        const url = this.getUrlQueryParam('/qna/questions', {
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

    /** 질문 상세 조회 (성공 여부 반환) */
    async openDetail(questionId) {
      try {
        this.detail = await this.request(`/qna/questions/${questionId}`)
        return true
      } catch (error) {
        this.errorMessage = `상세 내용을 불러오지 못했습니다. (${error.message})`
        return false
      }
    },

    /** 현재 상세 질문 다시 조회 */
    async refreshDetail() {
      if (!this.detail) return
      this.detail = await this.request(`/qna/questions/${this.detail.questionId}`)
    },

    /** 질문 등록 (실패 시 Error throw) */
    async submitQuestion(payload) {
      this.saving = true
      try {
        await this.request('/qna/questions', {
          method: 'POST',
          body: JSON.stringify(payload)
        })
        await this.searchList()
      } finally {
        this.saving = false
      }
    },

    /** 답변 등록 (실패 시 Error throw) */
    async submitAnswer(payload) {
      this.saving = true
      try {
        await this.request(`/qna/questions/${this.detail.questionId}/answers`, {
          method: 'POST',
          body: JSON.stringify(payload)
        })
        await this.refreshDetail()
        this.fetchList()
      } finally {
        this.saving = false
      }
    },

    /** 답변 삭제 (실패 시 Error throw) */
    async removeAnswer(answerId) {
      await this.request(`/qna/answers/${answerId}`, { method: 'DELETE' })
      await this.refreshDetail()
      this.fetchList()
    },

    /** 질문 삭제 (실패 시 Error throw) */
    async removeQuestion() {
      await this.request(`/qna/questions/${this.detail.questionId}`, { method: 'DELETE' })
      this.detail = null
      this.fetchList()
    }
  }
})
