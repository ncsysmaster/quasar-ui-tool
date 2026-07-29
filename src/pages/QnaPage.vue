<template>
  <q-page class="qna-page">
    <main class="qna-content">
      <div class="page-heading">
        <div class="heading-title">
          <span class="heading-icon"><q-icon name="contact_support" size="30px" /></span>
          <h1>질의응답</h1>
        </div>
        <nav class="breadcrumb" aria-label="현재 위치">
          <span>홈</span>
          <q-icon name="double_arrow" size="20px" />
          <strong>질의응답</strong>
        </nav>
      </div>

      <section class="detail-card">
        <div class="board-toolbar">
          <q-select
            v-model="search.category"
            :options="categoryOptions"
            label="분류"
            dense outlined emit-value map-options clearable
            class="filter-select"
          />
          <q-select
            v-model="search.status"
            :options="statusOptions"
            label="상태"
            dense outlined emit-value map-options clearable
            class="filter-select"
          />
          <q-input
            v-model="search.keyword"
            dense outlined clearable
            placeholder="제목 · 작성자 검색"
            class="filter-input"
            @keyup.enter="searchList"
          >
            <template #append><q-icon name="search" /></template>
          </q-input>
          <q-btn color="primary" unelevated label="검색" @click="searchList" />
          <q-space />
          <q-btn color="primary" unelevated icon="edit" label="질문 등록" @click="openCreate" />
        </div>

        <div v-if="errorMessage" class="error-banner">
          <q-icon name="error_outline" size="18px" /> {{ errorMessage }}
        </div>

        <table class="board-table">
          <thead>
            <tr>
              <th class="col-no">번호</th>
              <th class="col-category">분류</th>
              <th class="col-title">제목</th>
              <th class="col-writer">작성자</th>
              <th class="col-date">등록일</th>
              <th class="col-view">조회</th>
              <th class="col-status">상태</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td colspan="7" class="empty-row"><q-spinner size="22px" /> 불러오는 중…</td>
            </tr>
            <tr v-else-if="items.length === 0">
              <td colspan="7" class="empty-row">등록된 질문이 없습니다. 첫 질문을 등록해 보세요.</td>
            </tr>
            <tr v-for="item in items" v-else :key="item.questionId" class="board-row" @click="openDetail(item.questionId)">
              <td class="col-no">{{ item.questionId }}</td>
              <td class="col-category"><span class="chip chip-category">{{ categoryLabel(item.category) }}</span></td>
              <td class="col-title">
                <q-icon v-if="item.secretYn === 'Y'" name="lock" size="14px" class="lock-icon" />
                {{ item.title }}
                <span v-if="item.answerCnt > 0" class="answer-count">[{{ item.answerCnt }}]</span>
              </td>
              <td class="col-writer">{{ item.writerName || item.writerId }}</td>
              <td class="col-date">{{ formatDate(item.createdAt) }}</td>
              <td class="col-view">{{ item.viewCnt }}</td>
              <td class="col-status"><span class="chip" :class="statusClass(item.status)">{{ statusLabel(item.status) }}</span></td>
            </tr>
          </tbody>
        </table>

        <div class="board-footer">
          <q-pagination
            v-model="search.page"
            :max="totalPages"
            :max-pages="7"
            boundary-numbers direction-links
            color="primary"
            @update:model-value="fetchList"
          />
          <span class="total-info">전체 {{ total }}건</span>
        </div>
      </section>
    </main>

    <!-- 질문 등록 다이얼로그 -->
    <q-dialog v-model="createOpen">
      <q-card class="qna-dialog">
        <q-card-section class="dialog-header">
          <h2><q-icon name="edit" size="22px" /> 질문 등록</h2>
          <q-btn v-close-popup flat round dense icon="close" />
        </q-card-section>
        <q-card-section class="dialog-body">
          <q-select
            v-model="createForm.category"
            :options="categoryOptions"
            label="분류 *"
            dense outlined emit-value map-options
          />
          <q-input v-model="createForm.title" label="제목 *" dense outlined maxlength="300" />
          <q-input v-model="createForm.content" label="내용 *" type="textarea" outlined rows="6" />
          <div class="form-row">
            <q-input v-model="createForm.writerId" label="작성자 ID *" dense outlined class="grow" />
            <q-input v-model="createForm.writerName" label="이름" dense outlined class="grow" />
          </div>
          <q-input v-model="createForm.writerEmail" label="이메일 (답변 알림)" dense outlined type="email" />
          <q-checkbox v-model="createSecret" label="비밀글로 등록" dense />
          <p v-if="createError" class="form-error">{{ createError }}</p>
        </q-card-section>
        <q-card-actions align="right" class="dialog-actions">
          <q-btn v-close-popup flat label="취소" />
          <q-btn color="primary" unelevated label="등록" :loading="saving" @click="submitQuestion" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- 질문 상세 다이얼로그 -->
    <q-dialog v-model="detailOpen">
      <q-card class="qna-dialog qna-detail">
        <q-card-section class="dialog-header">
          <h2><q-icon name="help_outline" size="22px" /> 질문 상세</h2>
          <q-btn v-close-popup flat round dense icon="close" />
        </q-card-section>

        <q-card-section v-if="detail" class="dialog-body">
          <div class="detail-title-row">
            <span class="chip chip-category">{{ categoryLabel(detail.category) }}</span>
            <span class="chip" :class="statusClass(detail.status)">{{ statusLabel(detail.status) }}</span>
            <h3>{{ detail.title }}</h3>
          </div>
          <p class="detail-meta">
            {{ detail.writerName || detail.writerId }} · {{ formatDateTime(detail.createdAt) }} · 조회 {{ detail.viewCnt }}
          </p>
          <div class="detail-content">{{ detail.content }}</div>

          <div class="answer-section">
            <h4><q-icon name="question_answer" size="18px" /> 답변 {{ detail.answers?.length || 0 }}건</h4>

            <article v-for="answer in detail.answers" :key="answer.answerId" class="answer-item">
              <div class="answer-head">
                <strong>{{ answer.writerName || answer.writerId }}</strong>
                <span>{{ formatDateTime(answer.createdAt) }}</span>
                <q-btn flat dense round size="sm" icon="delete_outline" @click="removeAnswer(answer.answerId)" />
              </div>
              <p>{{ answer.content }}</p>
            </article>

            <div class="answer-form">
              <div class="form-row">
                <q-input v-model="answerForm.writerId" label="답변자 ID *" dense outlined class="grow" />
                <q-input v-model="answerForm.writerName" label="이름" dense outlined class="grow" />
              </div>
              <q-input v-model="answerForm.content" label="답변 내용 *" type="textarea" outlined rows="3" />
              <p v-if="answerError" class="form-error">{{ answerError }}</p>
              <q-btn color="primary" unelevated icon="reply" label="답변 등록" :loading="saving" @click="submitAnswer" />
            </div>
          </div>
        </q-card-section>

        <q-card-actions align="between" class="dialog-actions">
          <q-btn flat color="negative" icon="delete" label="질문 삭제" @click="removeQuestion" />
          <q-btn v-close-popup flat label="닫기" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { onMounted, reactive, ref, computed } from 'vue'

const API_BASE = 'http://localhost:8081/api/qna'

const categoryOptions = [
  { label: '일반', value: 'GENERAL' },
  { label: '설치', value: 'INSTALL' },
  { label: '사용법', value: 'USAGE' },
  { label: '오류', value: 'ERROR' },
  { label: '기능요청', value: 'FEATURE' }
]
const statusOptions = [
  { label: '답변대기', value: 'WAITING' },
  { label: '답변완료', value: 'ANSWERED' },
  { label: '종료', value: 'CLOSED' }
]

const search = reactive({ page: 1, size: 10, category: null, status: null, keyword: '' })
const items = ref([])
const total = ref(0)
const loading = ref(false)
const saving = ref(false)
const errorMessage = ref('')

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / search.size)))

const createOpen = ref(false)
const createSecret = ref(false)
const createError = ref('')
const createForm = reactive({
  category: 'GENERAL', title: '', content: '', writerId: '', writerName: '', writerEmail: ''
})

const detailOpen = ref(false)
const detail = ref(null)
const answerError = ref('')
const answerForm = reactive({ writerId: '', writerName: '', content: '' })

function categoryLabel(value) {
  return categoryOptions.find((option) => option.value === value)?.label || value
}
function statusLabel(value) {
  return statusOptions.find((option) => option.value === value)?.label || value
}
function statusClass(value) {
  return { WAITING: 'chip-waiting', ANSWERED: 'chip-answered', CLOSED: 'chip-closed' }[value] || ''
}
function formatDate(value) {
  return value ? String(value).slice(0, 10) : ''
}
function formatDateTime(value) {
  return value ? String(value).slice(0, 16).replace('T', ' ') : ''
}

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
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

async function fetchList() {
  loading.value = true
  errorMessage.value = ''
  try {
    const params = new URLSearchParams({ page: search.page, size: search.size })
    if (search.category) params.set('category', search.category)
    if (search.status) params.set('status', search.status)
    if (search.keyword) params.set('keyword', search.keyword)
    const data = await request(`/questions?${params}`)
    items.value = data.items || []
    total.value = data.total || 0
  } catch (error) {
    errorMessage.value = `목록을 불러오지 못했습니다. 서버(8081) 실행 여부를 확인해 주세요. (${error.message})`
    items.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

function searchList() {
  search.page = 1
  fetchList()
}

function openCreate() {
  Object.assign(createForm, {
    category: 'GENERAL', title: '', content: '', writerId: '', writerName: '', writerEmail: ''
  })
  createSecret.value = false
  createError.value = ''
  createOpen.value = true
}

async function submitQuestion() {
  if (!createForm.title.trim() || !createForm.content.trim() || !createForm.writerId.trim()) {
    createError.value = '제목, 내용, 작성자 ID는 필수 입력입니다.'
    return
  }
  saving.value = true
  createError.value = ''
  try {
    await request('/questions', {
      method: 'POST',
      body: JSON.stringify({ ...createForm, secretYn: createSecret.value ? 'Y' : 'N' })
    })
    createOpen.value = false
    searchList()
  } catch (error) {
    createError.value = error.message
  } finally {
    saving.value = false
  }
}

async function openDetail(questionId) {
  answerError.value = ''
  Object.assign(answerForm, { writerId: '', writerName: '', content: '' })
  try {
    detail.value = await request(`/questions/${questionId}`)
    detailOpen.value = true
  } catch (error) {
    errorMessage.value = `상세 내용을 불러오지 못했습니다. (${error.message})`
  }
}

async function refreshDetail() {
  if (!detail.value) return
  detail.value = await request(`/questions/${detail.value.questionId}`)
}

async function submitAnswer() {
  if (!answerForm.content.trim() || !answerForm.writerId.trim()) {
    answerError.value = '답변자 ID와 답변 내용은 필수 입력입니다.'
    return
  }
  saving.value = true
  answerError.value = ''
  try {
    await request(`/questions/${detail.value.questionId}/answers`, {
      method: 'POST',
      body: JSON.stringify(answerForm)
    })
    Object.assign(answerForm, { writerId: '', writerName: '', content: '' })
    await refreshDetail()
    fetchList()
  } catch (error) {
    answerError.value = error.message
  } finally {
    saving.value = false
  }
}

async function removeAnswer(answerId) {
  if (!window.confirm('이 답변을 삭제하시겠습니까?')) return
  try {
    await request(`/answers/${answerId}`, { method: 'DELETE' })
    await refreshDetail()
    fetchList()
  } catch (error) {
    answerError.value = error.message
  }
}

async function removeQuestion() {
  if (!window.confirm('이 질문을 삭제하시겠습니까?')) return
  try {
    await request(`/questions/${detail.value.questionId}`, { method: 'DELETE' })
    detailOpen.value = false
    fetchList()
  } catch (error) {
    answerError.value = error.message
  }
}

onMounted(fetchList)
</script>

<style scoped>
.qna-page { color: #3f4c59; background: #f6f8fb; }
.qna-content { width: calc(100% - 48px); margin: 0 auto; padding: 14px 0 56px; }
.page-heading { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 16px; }
.heading-title { display: flex; align-items: center; gap: 14px; }
.heading-icon {
  display: grid;
  place-items: center;
  width: 56px;
  height: 56px;
  border-radius: 15px;
  color: #fff;
  background: var(--q-primary);
}
.page-heading h1 { margin: 0; color: #303d49; font-size: 30px; font-weight: 800; }
.breadcrumb { display: flex; align-items: center; gap: 9px; align-self: flex-start; margin-top: -6px; color: #66727e; font-size: 18px; font-weight: 700; }
.breadcrumb .q-icon { color: var(--q-primary); }
.breadcrumb strong { color: #303d49; font-weight: 800; }
.detail-card { padding: 26px 28px; border: 1px solid #dfe5eb; border-radius: 14px; background: #fff; box-shadow: 0 10px 28px rgba(42, 66, 88, .06); }

.board-toolbar { display: flex; align-items: center; gap: 10px; margin-bottom: 18px; flex-wrap: wrap; }
.filter-select { width: 140px; }
.filter-input { width: 240px; }

.error-banner {
  display: flex; align-items: center; gap: 7px;
  margin-bottom: 14px; padding: 10px 14px;
  border: 1px solid #f3c1bb; border-radius: 8px;
  color: #b03a2e; background: #fdeeec; font-size: 14px;
}

.board-table { width: 100%; border-collapse: collapse; }
.board-table th {
  padding: 11px 10px; border-top: 2px solid #3c4955; border-bottom: 1px solid #dfe5eb;
  color: #4e5c69; font-size: 14px; font-weight: 700; text-align: left; white-space: nowrap;
}
.board-table td { padding: 12px 10px; border-bottom: 1px solid #eaeef2; font-size: 14.5px; }
.board-row { cursor: pointer; transition: background 120ms ease; }
.board-row:hover { background: #f4f8fc; }
.col-no { width: 64px; color: #8b98a4; }
.col-category { width: 90px; }
.col-title { color: #303d49; font-weight: 600; }
.col-writer { width: 110px; }
.col-date { width: 110px; color: #74808b; }
.col-view { width: 64px; color: #74808b; text-align: center; }
.col-status { width: 96px; }
.empty-row { padding: 44px 0; color: #8b98a4; text-align: center; }
.lock-icon { margin-right: 4px; color: #b7790b; }
.answer-count { margin-left: 5px; color: var(--q-primary); font-weight: 800; }

.chip {
  display: inline-block; padding: 3px 10px; border-radius: 20px;
  font-size: 12px; font-weight: 700; white-space: nowrap;
}
.chip-category { color: #4d5fc1; background: #eceffd; }
.chip-waiting { color: #b7790b; background: #fff3d6; }
.chip-answered { color: #1d7a46; background: #dcf3e5; }
.chip-closed { color: #66727e; background: #eef1f4; }

.board-footer { display: flex; align-items: center; justify-content: center; gap: 16px; margin-top: 20px; position: relative; }
.total-info { position: absolute; right: 0; color: #8b98a4; font-size: 13px; }

/* 다이얼로그 */
.qna-dialog { width: 620px; max-width: 94vw; border-radius: 14px; }
.qna-detail { width: 720px; }
.dialog-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 20px; border-bottom: 1px solid #e8edf1;
}
.dialog-header h2 { display: flex; align-items: center; gap: 8px; margin: 0; color: #303d49; font-size: 19px; font-weight: 800; }
.dialog-body { display: flex; flex-direction: column; gap: 13px; padding: 20px; max-height: 68vh; overflow-y: auto; }
.dialog-actions { padding: 12px 16px; border-top: 1px solid #e8edf1; }
.form-row { display: flex; gap: 10px; }
.form-row .grow { flex: 1; }
.form-error { margin: 0; color: #b03a2e; font-size: 13.5px; }

.detail-title-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.detail-title-row h3 { flex-basis: 100%; margin: 6px 0 0; color: #303d49; font-size: 21px; font-weight: 800; }
.detail-meta { margin: 0; color: #8b98a4; font-size: 13.5px; }
.detail-content {
  padding: 16px; border: 1px solid #e8edf1; border-radius: 10px;
  background: #fafbfd; font-size: 15px; line-height: 1.7; white-space: pre-wrap;
}

.answer-section h4 {
  display: flex; align-items: center; gap: 6px;
  margin: 8px 0 10px; color: #3c4955; font-size: 16px; font-weight: 800;
}
.answer-item { margin-bottom: 10px; padding: 12px 14px; border: 1px solid #dcebdd; border-radius: 10px; background: #f4faf5; }
.answer-head { display: flex; align-items: center; gap: 10px; margin-bottom: 5px; }
.answer-head strong { color: #1d7a46; font-size: 14px; }
.answer-head span { color: #8b98a4; font-size: 12.5px; }
.answer-head .q-btn { margin-left: auto; color: #9aa5af; }
.answer-item p { margin: 0; font-size: 14.5px; line-height: 1.65; white-space: pre-wrap; }
.answer-form { display: flex; flex-direction: column; gap: 10px; margin-top: 14px; padding-top: 14px; border-top: 1px dashed #dfe5eb; }
.answer-form .q-btn { align-self: flex-end; }

@media (max-width: 760px) {
  .qna-content { width: calc(100% - 28px); padding-top: 14px; }
  .page-heading { flex-wrap: wrap; }
  .detail-card { padding: 18px 14px; }
  .filter-select, .filter-input { width: 100%; }
  .col-date, .col-view, .col-writer { display: none; }
}
</style>
