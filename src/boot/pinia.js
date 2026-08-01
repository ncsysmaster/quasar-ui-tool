import { createPinia } from 'pinia'
import { boot } from 'quasar/wrappers'

// API 기본 주소
// - 운영 빌드(quasar build): 같은 도메인의 /api 상대경로 호출 → CORS 불필요
//   (API가 다른 도메인이면 .env의 QCLI_API_PROD_URL로 지정)
// - 개발(quasar dev): .env의 QCLI_API_BASE_URL (로컬 quasar-server)
const apiEndPoint = import.meta.env.PROD
  ? (import.meta.env.QCLI_API_PROD_URL || '/api')
  : (import.meta.env.QCLI_API_BASE_URL || '/api')

/** null/빈값을 제외한 쿼리 스트링 생성 */
function getQueryParam(params = {}) {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') {
      query.set(key, value)
    }
  })
  const queryString = query.toString()
  return queryString ? `?${queryString}` : ''
}

export default boot(({ app }) => {
  const pinia = createPinia()

  // 모든 Pinia 스토어에서 this.* 로 사용할 수 있는 공통 속성/함수 주입
  pinia.use(() => ({
    apiEndPoint,

    /**
     * URL + 쿼리 파라미터 조합
     * 예) const url = this.getUrlQueryParam('/qna/questions', { page: 1, size: 10 })
     */
    getUrlQueryParam: (url, params = {}) => `${url}${getQueryParam(params)}`,

    /** 공통 fetch 요청 - apiEndPoint를 붙여 호출하고 실패 시 Error를 던진다 */
    request: async (url, options = {}) => {
      const response = await fetch(`${apiEndPoint}${url}`, {
        headers: { 'Content-Type': 'application/json' },
        ...options
      })
      if (!response.ok) {
        let message = `요청 실패 (HTTP ${response.status})`
        try {
          const body = await response.json()
          if (body.message) message = body.message
        } catch { /* 본문 없음 */ }
        throw new Error(message)
      }
      return response.status === 204 ? null : response.json()
    }
  }))

  app.use(pinia)
})
