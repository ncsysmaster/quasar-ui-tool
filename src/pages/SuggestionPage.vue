<template>
  <q-page class="suggestion-page">
    <main class="suggestion-content">
      <div class="page-heading">
        <div class="heading-title">
          <span class="heading-icon"><q-icon name="tips_and_updates" size="30px" /></span>
          <h1>개선 제안</h1>
        </div>
        <nav class="breadcrumb" aria-label="현재 위치">
          <span>홈</span>
          <q-icon name="double_arrow" size="20px" />
          <strong>개선 제안</strong>
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
          <q-btn color="primary" unelevated icon="edit" label="제안 등록" @click="openCreate" />
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
              <th class="col-like">공감</th>
              <th class="col-status">상태</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td colspan="8" class="empty-row"><q-spinner size="22px" /> 불러오는 중…</td>
            </tr>
            <tr v-else-if="items.length === 0">
              <td colspan="8" class="empty-row">등록된 제안이 없습니다. 첫 개선 제안을 등록해 보세요.</td>
            </tr>
            <tr v-for="item in items" v-else :key="item.suggestionId" class="board-row" @click="openDetail(item.suggestionId)">
              <td class="col-no">{{ item.suggestionId }}</td>
              <td class="col-category"><span class="chip chip-category">{{ categoryLabel(item.category) }}</span></td>
              <td class="col-title">
                {{ item.title }}
                <q-icon v-if="item.replyYn === 'Y'" name="mark_chat_read" size="15px" class="reply-icon" />
              </td>
              <td class="col-writer">{{ item.writerName || item.writerId }}</td>
              <td class="col-date">{{ formatDate(item.createdAt) }}</td>
              <td class="col-view">{{ item.viewCnt }}</td>
              <td class="col-like">{{ item.likeCnt }}</td>
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

    <!-- 제안 등록 다이얼로그 -->
    <q-dialog v-model="createOpen">
      <q-card class="suggestion-dialog">
        <q-card-section class="dialog-header">
          <h2><q-icon name="edit" size="22px" /> 개선 제안 등록</h2>
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
          <q-input v-model="createForm.content" label="제안 내용 * (현재 불편한 점, 개선 아이디어)" type="textarea" outlined rows="5" />
          <q-input v-model="createForm.expectEffect" label="기대 효과" dense outlined maxlength="1000" />
          <div class="form-row">
            <q-input v-model="createForm.writerId" label="작성자 ID *" dense outlined class="grow" />
            <q-input v-model="createForm.writerName" label="이름" dense outlined class="grow" />
          </div>
          <q-input v-model="createForm.writerEmail" label="이메일 (처리 결과 알림)" dense outlined type="email" />
          <p v-if="createError" class="form-error">{{ createError }}</p>
        </q-card-section>
        <q-card-actions align="right" class="dialog-actions">
          <q-btn v-close-popup flat label="취소" />
          <q-btn color="primary" unelevated label="등록" :loading="saving" @click="submitSuggestion" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- 제안 상세 다이얼로그 -->
    <q-dialog v-model="detailOpen">
      <q-card class="suggestion-dialog suggestion-detail">
        <q-card-section class="dialog-header">
          <h2><q-icon name="tips_and_updates" size="22px" /> 제안 상세</h2>
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
          <div v-if="detail.expectEffect" class="effect-box">
            <strong><q-icon name="trending_up" size="15px" /> 기대 효과</strong>
            <p>{{ detail.expectEffect }}</p>
          </div>

          <div class="like-row">
            <q-btn outline color="primary" icon="thumb_up" :label="`공감 ${detail.likeCnt}`" @click="likeSuggestion" />
          </div>

          <div class="reply-section">
            <h4><q-icon name="support_agent" size="18px" /> 관리자 회신</h4>

            <article v-if="detail.replyContent" class="reply-item">
              <div class="reply-head">
                <strong>{{ detail.replyWriterId }}</strong>
                <span>{{ formatDateTime(detail.replyAt) }}</span>
              </div>
              <p>{{ detail.replyContent }}</p>
            </article>
            <p v-else class="no-reply">아직 회신이 등록되지 않았습니다.</p>

            <div class="reply-form">
              <div class="form-row">
                <q-input v-model="replyForm.replyWriterId" label="회신자 ID *" dense outlined class="grow" />
                <q-select
                  v-model="replyForm.status"
                  :options="replyStatusOptions"
                  label="처리 상태 *"
                  dense outlined emit-value map-options
                  class="grow"
                />
              </div>
              <q-input v-model="replyForm.replyContent" label="회신 내용 *" type="textarea" outlined rows="3" />
              <p v-if="replyError" class="form-error">{{ replyError }}</p>
              <q-btn color="primary" unelevated icon="reply" label="회신 등록" :loading="saving" @click="submitReply" />
            </div>
          </div>
        </q-card-section>

        <q-card-actions align="between" class="dialog-actions">
          <q-btn flat color="negative" icon="delete" label="제안 삭제" @click="removeSuggestion" />
          <q-btn v-close-popup flat label="닫기" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useSuggestionStore } from 'src/store/suggestion/suggestionStore'

const suggestionStore = useSuggestionStore()
const { search, items, total, detail, loading, saving, errorMessage, totalPages } =
  storeToRefs(suggestionStore)

const categoryOptions = [
  { label: '기능 추가', value: 'FEATURE' },
  { label: '사용성 개선', value: 'IMPROVE' },
  { label: '성능', value: 'PERFORMANCE' },
  { label: '디자인·UI', value: 'DESIGN' },
  { label: '기타', value: 'ETC' }
]
const statusOptions = [
  { label: '접수', value: 'RECEIVED' },
  { label: '검토중', value: 'REVIEWING' },
  { label: '반영예정', value: 'ACCEPTED' },
  { label: '반영완료', value: 'APPLIED' },
  { label: '미채택', value: 'REJECTED' }
]
const replyStatusOptions = statusOptions.filter((option) => option.value !== 'RECEIVED')

const createOpen = ref(false)
const createError = ref('')
const createForm = reactive({
  category: 'FEATURE', title: '', content: '', expectEffect: '', writerId: '', writerName: '', writerEmail: ''
})

const detailOpen = ref(false)
const replyError = ref('')
const replyForm = reactive({ replyWriterId: '', status: 'REVIEWING', replyContent: '' })

function categoryLabel(value) {
  return categoryOptions.find((option) => option.value === value)?.label || value
}
function statusLabel(value) {
  return statusOptions.find((option) => option.value === value)?.label || value
}
function statusClass(value) {
  return {
    RECEIVED: 'chip-received',
    REVIEWING: 'chip-reviewing',
    ACCEPTED: 'chip-accepted',
    APPLIED: 'chip-applied',
    REJECTED: 'chip-rejected'
  }[value] || ''
}
function formatDate(value) {
  return value ? String(value).slice(0, 10) : ''
}
function formatDateTime(value) {
  return value ? String(value).slice(0, 16).replace('T', ' ') : ''
}

function fetchList() {
  return suggestionStore.fetchList()
}

function searchList() {
  return suggestionStore.searchList()
}

function openCreate() {
  Object.assign(createForm, {
    category: 'FEATURE', title: '', content: '', expectEffect: '', writerId: '', writerName: '', writerEmail: ''
  })
  createError.value = ''
  createOpen.value = true
}

async function submitSuggestion() {
  if (!createForm.title.trim() || !createForm.content.trim() || !createForm.writerId.trim()) {
    createError.value = '제목, 제안 내용, 작성자 ID는 필수 입력입니다.'
    return
  }
  createError.value = ''
  try {
    await suggestionStore.submitSuggestion({ ...createForm })
    createOpen.value = false
  } catch (error) {
    createError.value = error.message
  }
}

async function openDetail(suggestionId) {
  replyError.value = ''
  Object.assign(replyForm, { replyWriterId: '', status: 'REVIEWING', replyContent: '' })
  if (await suggestionStore.openDetail(suggestionId)) {
    detailOpen.value = true
  }
}

async function likeSuggestion() {
  try {
    await suggestionStore.likeSuggestion()
  } catch (error) {
    replyError.value = error.message
  }
}

async function submitReply() {
  if (!replyForm.replyContent.trim() || !replyForm.replyWriterId.trim()) {
    replyError.value = '회신자 ID와 회신 내용은 필수 입력입니다.'
    return
  }
  replyError.value = ''
  try {
    await suggestionStore.submitReply({ ...replyForm })
  } catch (error) {
    replyError.value = error.message
  }
}

async function removeSuggestion() {
  if (!window.confirm('이 제안을 삭제하시겠습니까?')) return
  try {
    await suggestionStore.removeSuggestion()
    detailOpen.value = false
  } catch (error) {
    replyError.value = error.message
  }
}

onMounted(fetchList)
</script>

<style scoped>
.suggestion-page { color: #3f4c59; background: #f6f8fb; }
.suggestion-content { width: calc(100% - 48px); margin: 0 auto; padding: 14px 0 56px; }
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
.col-category { width: 100px; }
.col-title { color: #303d49; font-weight: 600; }
.col-writer { width: 110px; }
.col-date { width: 110px; color: #74808b; }
.col-view, .col-like { width: 60px; color: #74808b; text-align: center; }
.col-status { width: 96px; }
.empty-row { padding: 44px 0; color: #8b98a4; text-align: center; }
.reply-icon { margin-left: 5px; color: #1d7a46; }

.chip {
  display: inline-block; padding: 3px 10px; border-radius: 20px;
  font-size: 12px; font-weight: 700; white-space: nowrap;
}
.chip-category { color: #4d5fc1; background: #eceffd; }
.chip-received { color: #66727e; background: #eef1f4; }
.chip-reviewing { color: #b7790b; background: #fff3d6; }
.chip-accepted { color: #176cc0; background: #e7f3ff; }
.chip-applied { color: #1d7a46; background: #dcf3e5; }
.chip-rejected { color: #b03a2e; background: #fdeeec; }

.board-footer { display: flex; align-items: center; justify-content: center; gap: 16px; margin-top: 20px; position: relative; }
.total-info { position: absolute; right: 0; color: #8b98a4; font-size: 13px; }

/* 다이얼로그 */
.suggestion-dialog { width: 620px; max-width: 94vw; border-radius: 14px; }
.suggestion-detail { width: 720px; }
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
.effect-box { padding: 12px 14px; border: 1px solid #d8e8f7; border-radius: 10px; background: #f4faff; }
.effect-box strong { display: flex; align-items: center; gap: 5px; color: #176cc0; font-size: 13.5px; }
.effect-box p { margin: 6px 0 0; color: #4e5c69; font-size: 14.5px; line-height: 1.6; }
.like-row { display: flex; justify-content: center; padding: 4px 0; }

.reply-section h4 {
  display: flex; align-items: center; gap: 6px;
  margin: 8px 0 10px; color: #3c4955; font-size: 16px; font-weight: 800;
}
.reply-item { margin-bottom: 10px; padding: 12px 14px; border: 1px solid #dcebdd; border-radius: 10px; background: #f4faf5; }
.reply-head { display: flex; align-items: center; gap: 10px; margin-bottom: 5px; }
.reply-head strong { color: #1d7a46; font-size: 14px; }
.reply-head span { color: #8b98a4; font-size: 12.5px; }
.reply-item p { margin: 0; font-size: 14.5px; line-height: 1.65; white-space: pre-wrap; }
.no-reply { margin: 0 0 10px; color: #8b98a4; font-size: 14px; }
.reply-form { display: flex; flex-direction: column; gap: 10px; margin-top: 6px; padding-top: 14px; border-top: 1px dashed #dfe5eb; }
.reply-form .q-btn { align-self: flex-end; }

@media (max-width: 760px) {
  .suggestion-content { width: calc(100% - 28px); padding-top: 14px; }
  .page-heading { flex-wrap: wrap; }
  .detail-card { padding: 18px 14px; }
  .filter-select, .filter-input { width: 100%; }
  .col-date, .col-view, .col-like, .col-writer { display: none; }
}
</style>
