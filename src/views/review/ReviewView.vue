<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { useRoute } from 'vue-router'

import ConsoleHero from '../../components/console/ConsoleHero.vue'
import { fetchExceptionDetail } from '../../api/exception'
import {
  fetchLatestReview,
  fetchReviewAssistant,
  submitReview,
  submitReviewFeedback,
} from '../../api/review'
import { formatDateTimeDisplay } from '../../utils/date-time'
import { formatReadableText } from '../../utils/readable-text'

const REVIEW_RESULT_OPTIONS = [
  { value: 'CONFIRMED', label: '确认异常' },
  { value: 'REJECTED', label: '排除异常' },
]

const FEEDBACK_TAG_OPTIONS = [
  { value: 'TRUE_POSITIVE', label: '识别有效' },
  { value: 'FALSE_POSITIVE', label: '识别偏差' },
  { value: 'NEEDS_TUNING', label: '需继续优化' },
]

const REVIEW_RESULT_LABELS = {
  CONFIRMED: '确认异常',
  REJECTED: '排除异常',
}

const FEEDBACK_TAG_LABELS = {
  TRUE_POSITIVE: '识别有效',
  FALSE_POSITIVE: '识别偏差',
  NEEDS_TUNING: '需继续优化',
}

const RISK_LEVEL_LABELS = {
  HIGH: '高风险',
  MEDIUM: '中风险',
  LOW: '低风险',
}

const SOURCE_TYPE_LABELS = {
  MODEL: '综合识别',
  RULE: '规则校验',
  MODEL_FALLBACK: '自动识别',
}

const PROCESS_STATUS_LABELS = {
  PENDING: '待处理',
  REVIEWED: '已复核',
}

const EXCEPTION_TYPE_LABELS = {
  PROXY_CHECKIN: '代打卡',
  CONTINUOUS_LATE: '连续迟到',
  CONTINUOUS_EARLY_LEAVE: '连续早退',
  CONTINUOUS_MULTI_LOCATION_CONFLICT: '连续多地点冲突',
  CONTINUOUS_ILLEGAL_TIME: '连续非法时间打卡',
  CONTINUOUS_REPEAT_CHECK: '连续重复打卡',
  CONTINUOUS_PROXY_CHECKIN: '连续代打卡',
  CONTINUOUS_ATTENDANCE_RISK: '连续综合考勤异常',
  COMPLEX_ATTENDANCE_RISK: '综合识别异常',
  CONTINUOUS_MODEL_RISK: '连续模型风险异常',
  LATE: '迟到',
  EARLY_LEAVE: '早退',
  ILLEGAL_TIME: '非规定时间打卡',
  REPEAT_CHECK: '重复打卡',
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
const assistantDisplayError = computed(() => {
  if (assistantMissing.value) {
    return '当前记录暂无处置参考，请先查看异常详情后再进行后续处理。'
  }

  return assistantError.value
})
const heroCards = computed(() => [
  {
    key: 'exception',
    label: '当前异常',
    value: hasExceptionId.value ? buildCurrentExceptionTitle() : '待选择',
  },
  {
    key: 'assistant',
    label: '处置参考',
    value: assistantMissing.value ? '暂缺' : '可用',
  },
  {
    key: 'latest',
    label: '最新办理',
    value: latestReview.value ? formatLatestReviewSummary(latestReview.value) : '暂无',
  },
])

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
  return label || '未识别'
}

function formatExceptionType(item = {}) {
  const label = resolveLabel(item.type, EXCEPTION_TYPE_LABELS)
  if (label) {
    return label
  }

  if (item.sourceType === 'MODEL' || item.sourceType === 'MODEL_FALLBACK') {
    return '综合识别异常'
  }

  if (item.sourceType === 'RULE') {
    return '规则校验异常'
  }

  return '待核查异常'
}

function formatText(value) {
  return formatReadableText(value, '--')
}

function resolveLabel(value, labelMap) {
  return value ? labelMap[value] || '' : ''
}

function buildExceptionTitle(item = {}) {
  const riskLabel = resolveLabel(item.riskLevel, RISK_LEVEL_LABELS)
  const typeLabel = formatExceptionType(item)

  if (typeLabel) {
    return `${riskLabel || ''}${typeLabel.endsWith('异常') ? typeLabel : `${typeLabel}异常`}`
  }

  return riskLabel ? `${riskLabel}待核查异常` : '待核查异常'
}

function buildCurrentExceptionTitle() {
  return exceptionDetail.value ? buildExceptionTitle(exceptionDetail.value) : '待加载异常详情'
}

function formatLatestReviewSummary(record = {}) {
  const resultLabel = resolveLabel(record.reviewResult, REVIEW_RESULT_LABELS)
  return resultLabel || '已提交处理意见'
}

function formatScore(value) {
  if (value === null || value === undefined || value === '') {
    return '--'
  }

  return `${value}`
}

function getRiskTagClass(level) {
  if (level === 'HIGH') {
    return 'review-tag--danger'
  }

  if (level === 'MEDIUM') {
    return 'review-tag--warning'
  }

  if (level === 'LOW') {
    return 'review-tag--safe'
  }

  return 'review-tag--neutral'
}

function getStatusTagClass(status) {
  if (status === 'REVIEWED') {
    return 'review-tag--safe'
  }

  if (status === 'PENDING') {
    return 'review-tag--warning'
  }

  return 'review-tag--neutral'
}

function getSourceTagClass(source) {
  if (source === 'MODEL' || source === 'MODEL_FALLBACK') {
    return 'review-tag--info'
  }

  if (source === 'RULE') {
    return 'review-tag--neutral'
  }

  return 'review-tag--neutral'
}

function getReviewResultTagClass(result) {
  if (result === 'CONFIRMED') {
    return 'review-tag--danger'
  }

  if (result === 'REJECTED') {
    return 'review-tag--safe'
  }

  return 'review-tag--neutral'
}

function getFeedbackTagClass(tag) {
  if (tag === 'TRUE_POSITIVE') {
    return 'review-tag--safe'
  }

  if (tag === 'FALSE_POSITIVE') {
    return 'review-tag--warning'
  }

  if (tag === 'NEEDS_TUNING') {
    return 'review-tag--info'
  }

  return 'review-tag--neutral'
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
    latestError.value = latestResult.reason?.message || '最近复核记录加载失败，请稍后重试'
  }

  if (assistantResult.status === 'fulfilled') {
    assistant.value = assistantResult.value
  } else {
    assistant.value = null
    assistantError.value = assistantResult.reason?.message || '处置参考加载失败，请稍后重试'
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
    submitSuccess.value = '复核结果提交成功'
    ElMessage.success('复核结果提交成功')

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
        feedbackSuccess.value = '补充说明已保存'
        ElMessage.success('补充说明已保存')
      } catch (error) {
        feedbackForm.feedbackTag = reviewForm.feedbackTag
        feedbackForm.strategyFeedback = reviewForm.strategyFeedback
        feedbackError.value = error?.message || '补充说明保存失败，请稍后重试'
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
    feedbackSuccess.value = '补充说明已保存'
    ElMessage.success('补充说明已保存')
  } catch (error) {
    feedbackError.value = error?.message || '补充说明保存失败，请稍后重试'
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
    <ConsoleHero
      title="人工复核"
      description="查看异常详情、处置参考和最近复核记录，并完成复核确认与补充说明。"
      theme="violet"
      :cards="heroCards"
    />

    <section v-if="!hasExceptionId" data-testid="review-empty-state" class="review-panel review-panel--empty">
      <h2>请选择需要复核的记录</h2>
      <p>请从异常中心或预警列表进入当前页面。</p>
    </section>

    <section v-else data-testid="review-detail-state" class="review-layout">
      <section class="review-panel review-panel--detail">
        <div class="review-panel__head">
          <div>
            <p class="review-panel__eyebrow">异常详情</p>
            <h2>{{ buildCurrentExceptionTitle() }}</h2>
          </div>
          <span class="review-panel__tag">待复核</span>
        </div>

        <p v-if="detailLoading" class="review-feedback">异常详情加载中...</p>
        <p v-else-if="detailError" data-testid="review-detail-error" class="review-feedback review-feedback--error">
          {{ detailError }}
        </p>
        <template v-else>
          <dl class="review-detail-grid">
            <div>
              <dt>异常类型</dt>
                <dd>{{ formatExceptionType(exceptionDetail) }}</dd>
            </div>
            <div>
              <dt>风险等级</dt>
              <dd>
                <span :class="['review-tag', getRiskTagClass(exceptionDetail?.riskLevel)]">
                  {{ formatDisplayValue(exceptionDetail?.riskLevel, RISK_LEVEL_LABELS) }}
                </span>
              </dd>
            </div>
            <div>
              <dt>识别方式</dt>
              <dd>
                <span :class="['review-tag', getSourceTagClass(exceptionDetail?.sourceType)]">
                  {{ formatDisplayValue(exceptionDetail?.sourceType, SOURCE_TYPE_LABELS) }}
                </span>
              </dd>
            </div>
            <div>
              <dt>处理状态</dt>
              <dd>
                <span :class="['review-tag', getStatusTagClass(exceptionDetail?.processStatus)]">
                  {{ formatDisplayValue(exceptionDetail?.processStatus, PROCESS_STATUS_LABELS) }}
                </span>
              </dd>
            </div>
          </dl>

          <p class="review-detail-grid__description">{{ formatText(exceptionDetail?.description) }}</p>
        </template>
      </section>

      <section data-testid="review-assistant-card" class="review-panel review-panel--assistant">
        <div class="review-panel__head">
          <div>
            <p class="review-panel__eyebrow">处置参考</p>
            <h2>处置参考</h2>
          </div>
          <span v-if="assistantMissing" class="review-panel__status review-panel__status--warning">暂缺</span>
        </div>

        <p v-if="assistantLoading" class="review-feedback">处置参考加载中...</p>
        <p v-else-if="assistantError" data-testid="review-assistant-error" class="review-feedback review-feedback--error">
          {{ assistantDisplayError }}
        </p>
        <dl v-else class="review-detail-grid">
          <div>
                <dt>参考建议</dt>
            <dd>{{ formatText(assistant?.aiReviewSuggestion) }}</dd>
          </div>
          <div>
              <dt>关联案例</dt>
              <dd>{{ formatText(assistant?.similarCaseSummary) }}</dd>
            </div>
            <div>
              <dt>判定依据</dt>
              <dd>{{ formatText(assistant?.decisionReason) }}</dd>
            </div>
            <div>
              <dt>可信度</dt>
              <dd>{{ formatScore(assistant?.confidenceScore) }}</dd>
            </div>
        </dl>
      </section>

      <section class="review-panel review-panel--history">
        <div class="review-panel__head">
          <div>
            <p class="review-panel__eyebrow">最近复核记录</p>
            <h2>查看最近一次复核结果</h2>
          </div>
        </div>

        <p v-if="latestLoading" class="review-feedback">最近复核记录加载中...</p>
        <p v-else-if="latestError" class="review-feedback review-feedback--error">{{ latestError }}</p>
        <article v-else-if="latestReview" data-testid="review-latest-card" class="review-latest-card">
          <dl class="review-detail-grid">
            <div>
              <dt>复核结果</dt>
              <dd>
                <span :class="['review-tag', getReviewResultTagClass(latestReview.reviewResult)]">
                  {{ formatDisplayValue(latestReview.reviewResult, REVIEW_RESULT_LABELS) }}
                </span>
              </dd>
            </div>
            <div>
              <dt>复核时间</dt>
              <dd>{{ formatDateTimeDisplay(latestReview.reviewTime, '--') }}</dd>
            </div>
            <div>
              <dt>处理评价</dt>
              <dd>
                <span :class="['review-tag', getFeedbackTagClass(latestReview.feedbackTag)]">
                  {{ formatDisplayValue(latestReview.feedbackTag, FEEDBACK_TAG_LABELS) }}
                </span>
              </dd>
            </div>
            <div>
              <dt>补充说明</dt>
              <dd>{{ formatText(latestReview.strategyFeedback) }}</dd>
            </div>
            <div class="review-detail-grid__wide">
              <dt>复核意见</dt>
              <dd>{{ formatText(latestReview.reviewComment) }}</dd>
            </div>
            <div class="review-detail-grid__wide">
              <dt>参考建议记录</dt>
              <dd>{{ formatText(latestReview.aiReviewSuggestion) }}</dd>
            </div>
            <div class="review-detail-grid__wide">
              <dt>案例记录</dt>
              <dd>{{ formatText(latestReview.similarCaseSummary) }}</dd>
            </div>
          </dl>
        </article>
        <p v-else class="review-feedback">暂无最近复核记录。</p>
      </section>

      <section class="review-panel review-panel--decision">
        <div class="review-panel__head">
          <div>
            <p class="review-panel__eyebrow">复核办理</p>
            <h2>提交复核结果</h2>
          </div>
          <span v-if="assistantMissing" class="review-panel__status review-panel__status--warning">暂不可提交</span>
        </div>

        <p v-if="assistantMissing" class="review-feedback review-feedback--warning">
          当前暂无处置参考，暂不可提交新的复核结果；如已存在复核记录，仍可补充后续说明。
        </p>

        <p v-else class="review-form-tip">复核结果为必填项，处理评价和补充说明可按需填写。</p>

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
              placeholder="可填写确认或排除异常的依据说明。"
            />
          </label>

          <div class="review-field review-field--full">
            <span>处理评价（可选）</span>
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
            <span>补充说明</span>
            <textarea
              v-model="reviewForm.strategyFeedback"
              data-testid="review-form-strategy-input"
              :disabled="isReviewSubmitBlocked || !reviewForm.feedbackTag"
              rows="3"
              placeholder="选择处理评价后可补充说明。"
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
            <p class="review-panel__eyebrow">反馈补充</p>
            <h2>补充最近一次处理信息</h2>
          </div>
        </div>

        <p v-if="!latestReview" class="review-feedback">暂无最近复核记录，暂不可补充反馈信息。</p>
        <template v-else>
          <p class="review-form-tip">如需补充处理评价或后续说明，可在下方直接保存。</p>
          <div class="review-form-grid">
            <div class="review-field review-field--full">
              <span>处理评价</span>
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
                <span>补充说明</span>
                <textarea
                  v-model="feedbackForm.strategyFeedback"
                  data-testid="review-feedback-strategy-input"
                  :disabled="feedbackLoading || !feedbackForm.feedbackTag"
                  rows="3"
                  placeholder="选择处理评价后可补充说明。"
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
                {{ feedbackLoading ? '保存中...' : '保存补充' }}
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
  color: #2f69b2;
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
  border: 1px solid rgba(148, 163, 184, 0.16);
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

.review-panel--assistant {
  background: linear-gradient(180deg, #ffffff 0%, #f7fbff 100%);
}

.review-panel--history {
  background: linear-gradient(180deg, #ffffff 0%, #fafbfd 100%);
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

.review-panel__tag {
  color: #245391;
  background: rgba(47, 105, 178, 0.12);
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
  background: rgba(47, 105, 178, 0.06);
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

.review-tag {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 0 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
}

.review-tag--danger {
  background: rgba(239, 68, 68, 0.12);
  color: #b91c1c;
}

.review-tag--warning {
  background: rgba(245, 158, 11, 0.14);
  color: #b45309;
}

.review-tag--safe {
  background: rgba(34, 197, 94, 0.12);
  color: #166534;
}

.review-tag--info {
  background: rgba(47, 105, 178, 0.12);
  color: #245391;
}

.review-tag--neutral {
  background: rgba(148, 163, 184, 0.18);
  color: #475569;
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

.review-form-tip {
  margin: 0 0 16px;
  padding: 12px 14px;
  border-radius: 14px;
  background: rgba(47, 105, 178, 0.08);
  color: #245391;
  line-height: 1.7;
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
  background: linear-gradient(135deg, #245391 0%, #2f69b2 100%);
}

.review-actions__secondary {
  color: #245391;
  background: rgba(47, 105, 178, 0.12);
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
