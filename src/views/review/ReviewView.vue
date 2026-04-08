<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

import { fetchExceptionDetail } from '../../api/exception'
import {
  fetchLatestReview,
  fetchReviewAssistant,
  submitReview,
  submitReviewFeedback,
} from '../../api/review'

const REVIEW_RESULT_OPTIONS = [
  { value: 'CONFIRMED', label: '确认异常' },
  { value: 'REJECTED', label: '驳回异常' },
]

const FEEDBACK_TAG_OPTIONS = [
  { value: 'TRUE_POSITIVE', label: '命中有效' },
  { value: 'FALSE_POSITIVE', label: '误报' },
  { value: 'NEEDS_TUNING', label: '需要调优' },
]

const REVIEW_RESULT_LABELS = {
  CONFIRMED: '确认异常',
  REJECTED: '驳回异常',
}

const FEEDBACK_TAG_LABELS = {
  TRUE_POSITIVE: '命中有效',
  FALSE_POSITIVE: '误报',
  NEEDS_TUNING: '需要调优',
}

const RISK_LEVEL_LABELS = {
  HIGH: '高风险',
  MEDIUM: '中风险',
  LOW: '低风险',
}

const SOURCE_TYPE_LABELS = {
  MODEL: '模型判定',
  RULE: '规则判定',
  MODEL_FALLBACK: '模型降级',
}

const PROCESS_STATUS_LABELS = {
  PENDING: '待处理',
  REVIEWED: '已复核',
}

const EXCEPTION_TYPE_LABELS = {
  MULTI_LOCATION_CONFLICT: '多地点异常',
}

const route = useRoute()

const detailLoading = ref(false)
const assistantLoading = ref(false)
const latestLoading = ref(false)
const submitLoading = ref(false)
const feedbackLoading = ref(false)

const detailError = ref('')
const assistantError = ref('')
const latestError = ref('')
const submitError = ref('')
const feedbackError = ref('')
const submitSuccess = ref('')
const feedbackSuccess = ref('')

const exceptionDetail = ref(null)
const assistant = ref(null)
const latestReview = ref(null)

const reviewForm = reactive({
  reviewResult: '',
  reviewComment: '',
  feedbackTag: '',
  strategyFeedback: '',
})

const feedbackForm = reactive({
  feedbackTag: '',
  strategyFeedback: '',
})

let latestRequestId = 0

const exceptionId = computed(() => normalizeQueryValue(route.query.exceptionId))
const hasExceptionId = computed(() => Boolean(exceptionId.value))
const assistantMissing = computed(() => assistantError.value === '复核辅助信息不存在')
const isReviewSubmitBlocked = computed(() => {
  return Boolean(
    !hasExceptionId.value ||
      detailLoading.value ||
      submitLoading.value ||
      detailError.value ||
      assistantLoading.value ||
      assistantMissing.value,
  )
})
const canSubmitReview = computed(() => {
  return Boolean(!isReviewSubmitBlocked.value && reviewForm.reviewResult)
})
const canSubmitLatestFeedback = computed(() => {
  return Boolean(latestReview.value?.id && feedbackForm.feedbackTag && !feedbackLoading.value)
})

function normalizeQueryValue(value) {
  if (Array.isArray(value)) {
    return normalizeQueryValue(value[0])
  }

  if (value === null || value === undefined) {
    return ''
  }

  const normalized = `${value}`.trim()
  return normalized || ''
}

function normalizeText(value) {
  if (value === null || value === undefined) {
    return null
  }

  const normalized = `${value}`.trim()
  return normalized || null
}

function formatDisplayValue(value, labelMap) {
  if (!value) {
    return '--'
  }

  const label = labelMap[value]
  return label || value
}

function formatText(value) {
  return value || '--'
}

function formatScore(value) {
  if (value === null || value === undefined || value === '') {
    return '--'
  }

  return `${value}`
}

function resetReviewForm() {
  reviewForm.reviewResult = ''
  reviewForm.reviewComment = ''
  reviewForm.feedbackTag = ''
  reviewForm.strategyFeedback = ''
}

function syncFeedbackForm(reviewRecord) {
  feedbackForm.feedbackTag = reviewRecord?.feedbackTag || ''
  feedbackForm.strategyFeedback = reviewRecord?.strategyFeedback || ''
}

function resetState() {
  detailLoading.value = false
  assistantLoading.value = false
  latestLoading.value = false
  submitLoading.value = false
  feedbackLoading.value = false

  detailError.value = ''
  assistantError.value = ''
  latestError.value = ''
  submitError.value = ''
  feedbackError.value = ''
  submitSuccess.value = ''
  feedbackSuccess.value = ''

  exceptionDetail.value = null
  assistant.value = null
  latestReview.value = null

  resetReviewForm()
  syncFeedbackForm(null)
}

function applyLatestReview(reviewRecord) {
  latestReview.value = reviewRecord
  syncFeedbackForm(reviewRecord)
}

async function loadReviewPage(currentExceptionId) {
  const requestId = ++latestRequestId
  detailLoading.value = true
  assistantLoading.value = true
  latestLoading.value = true
  detailError.value = ''
  assistantError.value = ''
  latestError.value = ''
  submitError.value = ''
  feedbackError.value = ''
  submitSuccess.value = ''
  feedbackSuccess.value = ''

  const [detailResult, latestResult, assistantResult] = await Promise.allSettled([
    fetchExceptionDetail(currentExceptionId),
    fetchLatestReview(currentExceptionId),
    fetchReviewAssistant(currentExceptionId),
  ])

  if (requestId !== latestRequestId) {
    return
  }

  detailLoading.value = false
  assistantLoading.value = false
  latestLoading.value = false

  if (detailResult.status === 'fulfilled') {
    exceptionDetail.value = detailResult.value
  } else {
    exceptionDetail.value = null
    detailError.value = detailResult.reason?.message || '异常详情加载失败，请稍后重试'
  }

  if (latestResult.status === 'fulfilled') {
    applyLatestReview(latestResult.value)
  } else {
    applyLatestReview(null)
    latestError.value = latestResult.reason?.message || '最新复核记录加载失败，请稍后重试'
  }

  if (assistantResult.status === 'fulfilled') {
    assistant.value = assistantResult.value
  } else {
    assistant.value = null
    assistantError.value = assistantResult.reason?.message || '复核辅助信息加载失败，请稍后重试'
  }
}

async function handleSubmitReview() {
  if (!canSubmitReview.value) {
    return
  }

  submitLoading.value = true
  submitError.value = ''
  submitSuccess.value = ''
  feedbackError.value = ''
  feedbackSuccess.value = ''

  try {
    const savedReview = await submitReview({
      exceptionId: exceptionId.value,
      reviewResult: reviewForm.reviewResult,
      reviewComment: normalizeText(reviewForm.reviewComment),
    })

    applyLatestReview(savedReview)
    submitSuccess.value = '复核结果已提交'

    if (reviewForm.feedbackTag) {
      const strategyFeedback = normalizeText(reviewForm.strategyFeedback)

      try {
        await submitReviewFeedback({
          reviewId: savedReview.id,
          feedbackTag: reviewForm.feedbackTag,
          strategyFeedback,
        })

        applyLatestReview({
          ...savedReview,
          feedbackTag: reviewForm.feedbackTag,
          strategyFeedback,
        })
        feedbackSuccess.value = '反馈标签已更新'
      } catch (error) {
        feedbackForm.feedbackTag = reviewForm.feedbackTag
        feedbackForm.strategyFeedback = reviewForm.strategyFeedback
        feedbackError.value = error?.message || '复核反馈提交失败，请稍后重试'
      }
    }

    resetReviewForm()
  } catch (error) {
    submitError.value = error?.message || '复核提交失败，请稍后重试'
  } finally {
    submitLoading.value = false
  }
}

async function handleSubmitLatestFeedback() {
  if (!canSubmitLatestFeedback.value) {
    return
  }

  feedbackLoading.value = true
  feedbackError.value = ''
  feedbackSuccess.value = ''

  try {
    const strategyFeedback = normalizeText(feedbackForm.strategyFeedback)

    await submitReviewFeedback({
      reviewId: latestReview.value.id,
      feedbackTag: feedbackForm.feedbackTag,
      strategyFeedback,
    })

    applyLatestReview({
      ...latestReview.value,
      feedbackTag: feedbackForm.feedbackTag,
      strategyFeedback,
    })
    feedbackSuccess.value = '反馈标签已更新'
  } catch (error) {
    feedbackError.value = error?.message || '复核反馈提交失败，请稍后重试'
  } finally {
    feedbackLoading.value = false
  }
}

watch(
  exceptionId,
  (nextExceptionId) => {
    resetState()

    if (!nextExceptionId) {
      return
    }

    void loadReviewPage(nextExceptionId)
  },
  { immediate: true },
)
</script>

<template>
  <section class="review-page">
    <header class="review-page__header">
      <div>
        <p class="review-page__eyebrow">人工复核</p>
        <h1>人工复核</h1>
        <p>查看异常详情和智能辅助信息，并完成复核处理与反馈记录。</p>
      </div>

      <div class="review-page__summary-grid">
        <article class="review-page__summary-card">
          <span>异常编号</span>
          <strong>{{ hasExceptionId ? exceptionId : '待选择' }}</strong>
        </article>
        <article class="review-page__summary-card">
          <span>智能辅助</span>
          <strong>{{ assistantMissing ? '缺失' : '可用' }}</strong>
        </article>
        <article class="review-page__summary-card">
          <span>最新记录</span>
          <strong>{{ latestReview?.id ? `#${latestReview.id}` : '暂无' }}</strong>
        </article>
      </div>
    </header>

    <section v-if="!hasExceptionId" data-testid="review-empty-state" class="review-panel review-panel--empty">
      <h2>请选择待复核异常</h2>
      <p>请从异常中心或预警列表进入当前页面。</p>
    </section>

    <section v-else data-testid="review-detail-state" class="review-layout">
      <section class="review-panel review-panel--detail">
        <div class="review-panel__head">
          <div>
            <p class="review-panel__eyebrow">异常详情</p>
            <h2>异常 #{{ exceptionId }}</h2>
          </div>
          <span class="review-panel__tag">复核任务</span>
        </div>

        <p v-if="detailLoading" class="review-feedback">异常详情加载中...</p>
        <p v-else-if="detailError" data-testid="review-detail-error" class="review-feedback review-feedback--error">
          {{ detailError }}
        </p>
        <template v-else>
          <dl class="review-detail-grid">
            <div>
              <dt>异常类型</dt>
              <dd>{{ formatDisplayValue(exceptionDetail?.type, EXCEPTION_TYPE_LABELS) }}</dd>
            </div>
            <div>
              <dt>风险等级</dt>
              <dd>{{ formatDisplayValue(exceptionDetail?.riskLevel, RISK_LEVEL_LABELS) }}</dd>
            </div>
            <div>
              <dt>来源</dt>
              <dd>{{ formatDisplayValue(exceptionDetail?.sourceType, SOURCE_TYPE_LABELS) }}</dd>
            </div>
            <div>
              <dt>处理状态</dt>
              <dd>{{ formatDisplayValue(exceptionDetail?.processStatus, PROCESS_STATUS_LABELS) }}</dd>
            </div>
            <div>
              <dt>记录 ID</dt>
              <dd>{{ formatText(exceptionDetail?.recordId) }}</dd>
            </div>
            <div>
              <dt>用户 ID</dt>
              <dd>{{ formatText(exceptionDetail?.userId) }}</dd>
            </div>
          </dl>

          <p class="review-detail-grid__description">{{ formatText(exceptionDetail?.description) }}</p>
        </template>
      </section>

      <section data-testid="review-assistant-card" class="review-panel review-panel--assistant">
        <div class="review-panel__head">
          <div>
            <p class="review-panel__eyebrow">智能复核辅助</p>
            <h2>辅助建议</h2>
          </div>
          <span v-if="assistantMissing" class="review-panel__status review-panel__status--warning">缺失</span>
        </div>

        <p v-if="assistantLoading" class="review-feedback">复核辅助信息加载中...</p>
        <p v-else-if="assistantError" data-testid="review-assistant-error" class="review-feedback review-feedback--error">
          {{ assistantError }}
        </p>
        <dl v-else class="review-detail-grid">
          <div>
            <dt>智能建议</dt>
            <dd>{{ formatText(assistant?.aiReviewSuggestion) }}</dd>
          </div>
          <div>
            <dt>相似案例</dt>
            <dd>{{ formatText(assistant?.similarCaseSummary) }}</dd>
          </div>
          <div>
            <dt>判定依据</dt>
            <dd>{{ formatText(assistant?.decisionReason) }}</dd>
          </div>
          <div>
            <dt>置信度</dt>
            <dd>{{ formatScore(assistant?.confidenceScore) }}</dd>
          </div>
        </dl>
      </section>

      <section class="review-panel review-panel--history">
        <div class="review-panel__head">
          <div>
            <p class="review-panel__eyebrow">最新复核记录</p>
            <h2>当前只展示最新一条</h2>
          </div>
        </div>

        <p v-if="latestLoading" class="review-feedback">最新复核记录加载中...</p>
        <p v-else-if="latestError" class="review-feedback review-feedback--error">{{ latestError }}</p>
        <article v-else-if="latestReview" data-testid="review-latest-card" class="review-latest-card">
          <dl class="review-detail-grid">
            <div>
              <dt>复核结果</dt>
              <dd>{{ formatDisplayValue(latestReview.reviewResult, REVIEW_RESULT_LABELS) }}</dd>
            </div>
            <div>
              <dt>复核时间</dt>
              <dd>{{ formatText(latestReview.reviewTime) }}</dd>
            </div>
            <div>
              <dt>反馈标签</dt>
              <dd>{{ formatDisplayValue(latestReview.feedbackTag, FEEDBACK_TAG_LABELS) }}</dd>
            </div>
            <div>
              <dt>策略反馈</dt>
              <dd>{{ formatText(latestReview.strategyFeedback) }}</dd>
            </div>
            <div class="review-detail-grid__wide">
              <dt>复核意见</dt>
              <dd>{{ formatText(latestReview.reviewComment) }}</dd>
            </div>
            <div class="review-detail-grid__wide">
              <dt>智能建议快照</dt>
              <dd>{{ formatText(latestReview.aiReviewSuggestion) }}</dd>
            </div>
            <div class="review-detail-grid__wide">
              <dt>相似案例快照</dt>
              <dd>{{ formatText(latestReview.similarCaseSummary) }}</dd>
            </div>
          </dl>
        </article>
        <p v-else class="review-feedback">暂无最新复核记录。</p>
      </section>

      <section class="review-panel review-panel--decision">
        <div class="review-panel__head">
          <div>
            <p class="review-panel__eyebrow">新建复核</p>
            <h2>提交复核结果</h2>
          </div>
          <span v-if="assistantMissing" class="review-panel__status review-panel__status--warning">提交阻塞</span>
        </div>

        <p v-if="assistantMissing" class="review-feedback review-feedback--warning">
          当前缺少智能辅助信息，仅支持查看页面内容；如已有最新复核记录，仍可继续提交反馈标签。
        </p>

        <div class="review-form-grid">
          <label class="review-field">
            <span>复核结果</span>
            <select
              v-model="reviewForm.reviewResult"
              data-testid="review-result-select"
              :disabled="isReviewSubmitBlocked"
            >
              <option value="">请选择</option>
              <option v-for="option in REVIEW_RESULT_OPTIONS" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
          </label>

          <label class="review-field review-field--full">
            <span>复核意见</span>
            <textarea
              v-model="reviewForm.reviewComment"
              data-testid="review-comment-input"
              :disabled="isReviewSubmitBlocked"
              rows="4"
              placeholder="可填写人工确认或驳回的依据。"
            />
          </label>

          <div class="review-field review-field--full">
            <span>反馈标签（可选）</span>
            <div class="review-choice-group">
              <label v-for="option in FEEDBACK_TAG_OPTIONS" :key="option.value" class="review-choice">
                <input
                  :data-testid="`review-form-tag-${option.value}`"
                  v-model="reviewForm.feedbackTag"
                  type="radio"
                  name="review-form-feedback-tag"
                  :value="option.value"
                  :disabled="isReviewSubmitBlocked"
                />
                <span>{{ option.label }}</span>
              </label>
            </div>
          </div>

          <label class="review-field review-field--full">
            <span>策略反馈</span>
            <textarea
              v-model="reviewForm.strategyFeedback"
              data-testid="review-form-strategy-input"
              :disabled="isReviewSubmitBlocked || !reviewForm.feedbackTag"
              rows="3"
              placeholder="仅在选择反馈标签后可填写。"
            />
          </label>
        </div>

        <p v-if="submitError" class="review-feedback review-feedback--error">{{ submitError }}</p>
        <p v-else-if="submitSuccess" class="review-feedback review-feedback--success">{{ submitSuccess }}</p>
        <p v-if="feedbackSuccess" class="review-feedback review-feedback--success">{{ feedbackSuccess }}</p>

        <div class="review-actions">
          <button
            type="button"
            data-testid="review-submit-button"
            class="review-actions__primary"
            :disabled="!canSubmitReview"
            @click="handleSubmitReview"
          >
            {{ submitLoading ? '提交中...' : '提交复核' }}
          </button>
        </div>
      </section>

      <section class="review-panel review-panel--feedback-panel">
        <div class="review-panel__head">
          <div>
            <p class="review-panel__eyebrow">反馈学习</p>
            <h2>覆盖最新复核记录的反馈标签</h2>
          </div>
        </div>

        <p v-if="!latestReview" class="review-feedback">暂无最新复核记录，暂不可提交反馈标签。</p>
        <template v-else>
          <div class="review-form-grid">
            <div class="review-field review-field--full">
              <span>反馈标签</span>
              <div class="review-choice-group">
                <label v-for="option in FEEDBACK_TAG_OPTIONS" :key="option.value" class="review-choice">
                  <input
                    :data-testid="`review-feedback-tag-${option.value}`"
                    v-model="feedbackForm.feedbackTag"
                    type="radio"
                    name="review-feedback-tag"
                    :value="option.value"
                    :disabled="feedbackLoading"
                  />
                  <span>{{ option.label }}</span>
                </label>
              </div>
            </div>

            <label class="review-field review-field--full">
              <span>策略反馈</span>
              <textarea
                v-model="feedbackForm.strategyFeedback"
                data-testid="review-feedback-strategy-input"
                :disabled="feedbackLoading || !feedbackForm.feedbackTag"
                rows="3"
                placeholder="仅在选择反馈标签后可填写。"
              />
            </label>
          </div>

          <p v-if="feedbackError" data-testid="review-feedback-error" class="review-feedback review-feedback--error">
            {{ feedbackError }}
          </p>

          <div class="review-actions">
            <button
              type="button"
              data-testid="review-feedback-submit"
              class="review-actions__secondary"
              :disabled="!canSubmitLatestFeedback"
              @click="handleSubmitLatestFeedback"
            >
              {{ feedbackLoading ? '保存中...' : '保存反馈' }}
            </button>
          </div>
        </template>
      </section>
    </section>
  </section>
</template>

<style scoped>
.review-page {
  display: grid;
  gap: 24px;
}

.review-page__header {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(280px, 0.9fr);
  gap: 18px;
  padding: 28px;
  border-radius: 28px;
  background: linear-gradient(135deg, #111827 0%, #4f46e5 100%);
  color: #f8fafc;
  box-shadow: 0 24px 60px rgba(79, 70, 229, 0.16);
}

.review-page__header h1 {
  margin: 0;
  font-size: 32px;
  color: #ffffff;
}

.review-page__header p:last-child {
  margin: 12px 0 0;
  color: rgba(226, 232, 240, 0.9);
  line-height: 1.7;
}

.review-page__summary-grid {
  display: grid;
  gap: 12px;
}

.review-page__summary-card {
  padding: 18px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.review-page__summary-card span,
.review-page__summary-card strong {
  display: block;
}

.review-page__summary-card span {
  font-size: 12px;
  color: rgba(191, 219, 254, 0.82);
}

.review-page__summary-card strong {
  margin-top: 10px;
  font-size: 22px;
  line-height: 1.3;
}

.review-page__eyebrow,
.review-panel__eyebrow {
  margin: 0 0 10px;
  font-size: 13px;
  color: #6366f1;
}

.review-page__eyebrow {
  color: #c7d2fe;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.review-layout {
  display: grid;
  gap: 24px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.review-panel {
  padding: 24px;
  border-radius: 24px;
  background: linear-gradient(145deg, #ffffff 0%, #f8fafc 100%);
  box-shadow: 0 24px 80px rgba(15, 23, 42, 0.08);
}

.review-panel--empty {
  text-align: center;
}

.review-panel--detail,
.review-panel--decision,
.review-panel--feedback-panel {
  grid-column: 1 / -1;
}

.review-panel--decision,
.review-panel--feedback-panel {
  background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
}

.review-panel__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
}

.review-panel__head h2 {
  margin: 0;
  font-size: 24px;
  color: #0f172a;
}

.review-panel__tag,
.review-panel__status {
  display: inline-flex;
  align-items: center;
  min-height: 32px;
  padding: 0 12px;
  border-radius: 999px;
  font-size: 13px;
  color: #334155;
  background: rgba(148, 163, 184, 0.18);
}

.review-panel__status--warning {
  color: #92400e;
  background: rgba(251, 191, 36, 0.18);
}

.review-detail-grid,
.review-form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
}

.review-detail-grid div,
.review-field {
  display: grid;
  gap: 8px;
  padding: 16px;
  border-radius: 18px;
  background: rgba(99, 102, 241, 0.06);
}

.review-detail-grid dt,
.review-field span {
  font-size: 12px;
  color: #64748b;
}

.review-detail-grid dd {
  margin: 0;
  color: #0f172a;
  line-height: 1.7;
}

.review-detail-grid__description,
.review-detail-grid__wide,
.review-field--full {
  grid-column: 1 / -1;
}

.review-detail-grid__description {
  margin: 16px 0 0;
  color: #334155;
  line-height: 1.8;
}

.review-field select,
.review-field textarea {
  width: 100%;
  border: 1px solid rgba(148, 163, 184, 0.45);
  border-radius: 14px;
  padding: 12px 14px;
  font: inherit;
  color: #0f172a;
  background: #ffffff;
  resize: vertical;
}

.review-field select:disabled,
.review-field textarea:disabled {
  color: #94a3b8;
  background: #f8fafc;
}

.review-choice-group {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.review-choice {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 999px;
  background: #ffffff;
  color: #334155;
}

.review-feedback {
  margin: 0;
  line-height: 1.7;
  color: #475569;
}

.review-feedback--error {
  color: #b91c1c;
}

.review-feedback--warning {
  color: #92400e;
}

.review-feedback--success {
  color: #047857;
}

.review-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
}

.review-actions button {
  border: none;
  border-radius: 999px;
  padding: 12px 18px;
  font: inherit;
  cursor: pointer;
}

.review-actions button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.review-actions__primary {
  color: #ffffff;
  background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
}

.review-actions__secondary {
  color: #0f172a;
  background: rgba(99, 102, 241, 0.12);
}

@media (max-width: 768px) {
  .review-page__header,
  .review-layout {
    grid-template-columns: 1fr;
  }

  .review-panel {
    padding: 18px;
  }

  .review-panel__head {
    flex-direction: column;
  }

  .review-choice-group {
    flex-direction: column;
  }

  .review-actions {
    justify-content: stretch;
  }

  .review-actions button {
    width: 100%;
  }
}
</style>
