<template>
  <section class="exception-page">
    <ConsoleHero
      title="异常中心"
      description="集中查看异常记录、分析摘要和处置依据，并支持进入复核流程。"
      theme="indigo"
    >
      <template #actions>
        <button type="button" data-testid="exception-refresh" class="exception-page__refresh" @click="loadExceptionList">
          刷新
        </button>
      </template>
    </ConsoleHero>

    <ConsoleOverviewCards :items="overviewItems" />

    <section class="exception-filter-card">
      <div class="exception-filter-grid">
        <label class="exception-filter-field">
          <span>异常类型</span>
          <select v-model="queryForm.type" data-testid="exception-filter-type">
            <option value="">全部</option>
            <option value="PROXY_CHECKIN">代打卡</option>
            <option value="CONTINUOUS_LATE">连续迟到</option>
            <option value="CONTINUOUS_EARLY_LEAVE">连续早退</option>
            <option value="CONTINUOUS_MULTI_LOCATION_CONFLICT">连续多地点冲突</option>
            <option value="CONTINUOUS_ILLEGAL_TIME">连续非法时间打卡</option>
            <option value="CONTINUOUS_REPEAT_CHECK">连续重复打卡</option>
            <option value="CONTINUOUS_PROXY_CHECKIN">连续代打卡</option>
            <option value="CONTINUOUS_ATTENDANCE_RISK">连续综合考勤异常</option>
            <option value="COMPLEX_ATTENDANCE_RISK">综合识别异常</option>
            <option value="CONTINUOUS_MODEL_RISK">连续模型风险异常</option>
            <option value="LATE">迟到</option>
            <option value="EARLY_LEAVE">早退</option>
            <option value="ILLEGAL_TIME">非规定时间打卡</option>
            <option value="REPEAT_CHECK">重复打卡</option>
            <option value="MULTI_LOCATION_CONFLICT">多地点异常</option>
          </select>
        </label>

        <label class="exception-filter-field">
          <span>风险等级</span>
          <select v-model="queryForm.riskLevel" data-testid="exception-filter-risk-level">
            <option value="">全部</option>
            <option value="HIGH">高风险</option>
            <option value="MEDIUM">中风险</option>
            <option value="LOW">低风险</option>
          </select>
        </label>

        <label class="exception-filter-field">
          <span>处理状态</span>
          <select v-model="queryForm.processStatus" data-testid="exception-filter-process-status">
            <option value="">全部</option>
            <option value="PENDING">待处理</option>
            <option value="REVIEWED">已复核</option>
          </select>
        </label>

        <label class="exception-filter-field">
          <span>人员</span>
          <input v-model="queryForm.userId" data-testid="exception-filter-user-id" type="text" placeholder="按人员筛选" />
        </label>
      </div>

      <div class="exception-filter-actions">
        <button type="button" data-testid="exception-search" class="exception-filter-actions__primary" @click="handleSearch">
          查询
        </button>
      </div>
    </section>

    <section class="exception-list-card">
      <div class="exception-list-card__head">
        <h3>异常列表</h3>
        <span>共 {{ listTotal }} 条</span>
      </div>

      <p v-if="listError" data-testid="exception-list-error" class="exception-feedback exception-feedback--error">
        {{ listError }}
      </p>
      <p v-else-if="listLoading" data-testid="exception-list-loading" class="exception-feedback">异常列表加载中...</p>
      <p v-else-if="!exceptionList.length" data-testid="exception-list-empty" class="exception-feedback">暂无异常记录</p>

      <div v-else data-testid="exception-list" class="exception-list">
        <article v-for="item in exceptionList" :key="item.id" class="exception-item">
          <div class="exception-item__main">
            <div class="exception-item__title-row">
                <strong>{{ buildExceptionTitle(item) }}</strong>
              <span>{{ formatDateTime(item.createTime) }}</span>
            </div>

            <dl class="exception-item__grid">
              <div>
                <dt>异常类型</dt>
                <dd>{{ formatExceptionType(item) }}</dd>
              </div>
              <div>
                <dt>风险等级</dt>
                <dd>
                  <span :class="['exception-tag', getRiskTagClass(item.riskLevel)]">
                    {{ formatDisplayValue(item.riskLevel, RISK_LEVEL_LABELS) }}
                  </span>
                </dd>
              </div>
              <div>
                <dt>识别方式</dt>
                <dd>
                  <span :class="['exception-tag', getSourceTagClass(item.sourceType)]">
                    {{ formatDisplayValue(item.sourceType, SOURCE_TYPE_LABELS) }}
                  </span>
                </dd>
              </div>
              <div>
                <dt>处理状态</dt>
                <dd>
                  <span :class="['exception-tag', getProcessTagClass(item.processStatus)]">
                    {{ formatDisplayValue(item.processStatus, PROCESS_STATUS_LABELS) }}
                  </span>
                </dd>
              </div>
            </dl>

            <p class="exception-item__description">{{ formatReadableText(item.description, '暂无情况说明') }}</p>
          </div>

          <button
            :data-testid="`exception-open-detail-${item.id}`"
            type="button"
            class="exception-item__action"
            @click="openExceptionDetail(item.id)"
          >
            查看异常详情
          </button>
        </article>
      </div>
    </section>

    <section v-if="detailVisible" data-testid="exception-detail-dialog" class="exception-detail-dialog">
      <div class="exception-detail-dialog__backdrop" @click="closeExceptionDetail"></div>

      <div class="exception-detail-dialog__panel">
        <header class="exception-detail-dialog__header">
          <div>
            <p class="exception-page__eyebrow">异常详情</p>
            <h3>{{ formatSelectedExceptionTitle() }}</h3>
          </div>

          <div class="exception-detail-dialog__actions">
            <button
              :data-testid="`exception-open-review-${selectedExceptionId}`"
              type="button"
              class="exception-detail-dialog__review"
              @click="jumpToReview(selectedExceptionId)"
            >
              提交复核
            </button>
            <button type="button" data-testid="exception-detail-close" class="exception-detail-dialog__close" @click="closeExceptionDetail">
              关闭
            </button>
          </div>
        </header>

        <p v-if="detailLoading" data-testid="exception-detail-loading" class="exception-feedback">异常详情加载中...</p>
        <p v-else-if="detailError" class="exception-feedback exception-feedback--error">{{ detailError }}</p>

        <template v-else>
          <section class="exception-detail-section">
            <div class="exception-detail-section__head">
              <h4>基础信息</h4>
              <span>{{ exceptionDetail ? formatDateTime(exceptionDetail.createTime) : '--' }}</span>
            </div>

            <dl class="exception-detail-grid">
              <div>
                <dt>异常类型</dt>
                <dd>{{ formatExceptionType(exceptionDetail) }}</dd>
              </div>
              <div>
                <dt>风险等级</dt>
                <dd>
                  <span :class="['exception-tag', getRiskTagClass(exceptionDetail?.riskLevel)]">
                    {{ formatDisplayValue(exceptionDetail?.riskLevel, RISK_LEVEL_LABELS) }}
                  </span>
                </dd>
              </div>
              <div>
                <dt>识别方式</dt>
                <dd>
                  <span :class="['exception-tag', getSourceTagClass(exceptionDetail?.sourceType)]">
                    {{ formatDisplayValue(exceptionDetail?.sourceType, SOURCE_TYPE_LABELS) }}
                  </span>
                </dd>
              </div>
              <div>
                <dt>处理状态</dt>
                <dd>
                  <span :class="['exception-tag', getProcessTagClass(exceptionDetail?.processStatus)]">
                    {{ formatDisplayValue(exceptionDetail?.processStatus, PROCESS_STATUS_LABELS) }}
                  </span>
                </dd>
              </div>
            </dl>

            <p class="exception-detail-section__description">{{ formatReadableText(exceptionDetail?.description, '暂无情况说明') }}</p>
          </section>

          <section class="exception-detail-section">
            <div class="exception-detail-section__head">
              <h4>重新识别</h4>
              <span>{{ hasCheckContext() ? '基于当前打卡记录重新识别' : '缺少记录信息' }}</span>
            </div>

            <p class="exception-feedback">可基于当前考勤记录重新执行规则校验或综合识别，用于辅助核查当前异常。</p>
            <p v-if="manualCheckError" data-testid="exception-manual-check-error" class="exception-feedback exception-feedback--error">
              {{ manualCheckError }}
            </p>

            <div class="exception-manual-check__actions">
              <button
                data-testid="exception-run-rule-check"
                type="button"
                class="exception-manual-check__button exception-manual-check__button--secondary"
                :disabled="!hasCheckContext() || ruleCheckLoading"
                @click="runRuleCheck"
              >
                {{ ruleCheckLoading ? '校验中...' : '规则校验' }}
              </button>
              <button
                data-testid="exception-run-complex-check"
                type="button"
                class="exception-manual-check__button"
                :disabled="!hasCheckContext() || complexCheckLoading"
                @click="runComplexCheck"
              >
                {{ complexCheckLoading ? '识别中...' : '综合识别' }}
              </button>
            </div>

            <div v-if="ruleCheckResult || complexCheckResult" class="exception-manual-check__grid">
              <article v-if="ruleCheckResult" data-testid="exception-rule-check-card" class="exception-manual-check__card">
                <div class="exception-manual-check__card-head">
                  <strong>规则校验结果</strong>
                  <span :class="['exception-tag', getSourceTagClass(ruleCheckResult.sourceType)]">
                    {{ formatDisplayValue(ruleCheckResult.sourceType, SOURCE_TYPE_LABELS) }}
                  </span>
                </div>
                <p><strong>异常类型：</strong>{{ formatDisplayValue(ruleCheckResult.type, EXCEPTION_TYPE_LABELS) }}</p>
                <p><strong>风险等级：</strong>{{ formatDisplayValue(ruleCheckResult.riskLevel, RISK_LEVEL_LABELS) }}</p>
                <p><strong>处理状态：</strong>{{ formatDisplayValue(ruleCheckResult.processStatus, PROCESS_STATUS_LABELS) }}</p>
                <p><strong>识别结论：</strong>{{ buildExceptionTitle(ruleCheckResult) }}</p>
              </article>

              <article v-if="complexCheckResult" data-testid="exception-complex-check-card" class="exception-manual-check__card">
                <div class="exception-manual-check__card-head">
                  <strong>综合识别结果</strong>
                  <span :class="['exception-tag', getSourceTagClass(complexCheckResult.sourceType)]">
                    {{ formatDisplayValue(complexCheckResult.sourceType, SOURCE_TYPE_LABELS) }}
                  </span>
                </div>
                <p><strong>异常类型：</strong>{{ formatDisplayValue(complexCheckResult.type, EXCEPTION_TYPE_LABELS) }}</p>
                <p><strong>风险等级：</strong>{{ formatDisplayValue(complexCheckResult.riskLevel, RISK_LEVEL_LABELS) }}</p>
                <p><strong>系统结论：</strong>{{ formatDecisionLabel(complexCheckResult.modelConclusion) }}</p>
                <p><strong>说明摘要：</strong>{{ formatReadableText(complexCheckResult.reasonSummary) }}</p>
                <p><strong>处理建议：</strong>{{ formatReadableText(complexCheckResult.actionSuggestion) }}</p>
                <p><strong>可信度：</strong>{{ formatScore(complexCheckResult.confidenceScore) }}</p>
              </article>
            </div>
          </section>

          <section class="exception-detail-section">
            <div class="exception-detail-section__head">
              <h4>分析摘要</h4>
              <span>{{ analysisBrief?.promptVersion ? `分析版本 ${analysisBrief.promptVersion}` : '未记录版本' }}</span>
            </div>

            <p v-if="analysisError" data-testid="exception-analysis-error" class="exception-feedback exception-feedback--error">
              {{ analysisError }}
            </p>
            <div v-else-if="analysisBrief" class="exception-summary-grid">
              <div>
                <dt>系统结论</dt>
                <dd>{{ formatDecisionLabel(analysisBrief.modelConclusion) }}</dd>
              </div>
              <div>
                <dt>可信度</dt>
                <dd>{{ formatScore(analysisBrief.confidenceScore) }}</dd>
              </div>
              <div>
                <dt>说明摘要</dt>
                <dd>{{ formatReadableText(analysisBrief.reasonSummary) }}</dd>
              </div>
              <div>
                <dt>处理建议</dt>
                <dd>{{ formatReadableText(analysisBrief.actionSuggestion) }}</dd>
              </div>
              <div>
                <dt>关联案例</dt>
                <dd>{{ formatReadableText(analysisBrief.similarCaseSummary) }}</dd>
              </div>
            </div>
            <p v-else class="exception-feedback">暂无分析摘要</p>
          </section>

          <section class="exception-detail-section">
            <div class="exception-detail-section__head">
              <h4>处理依据</h4>
              <span>{{ decisionTraceList.length }} 条</span>
            </div>

            <p v-if="decisionTraceError" class="exception-feedback exception-feedback--error">{{ decisionTraceError }}</p>
            <p v-else-if="!decisionTraceList.length" class="exception-feedback">暂无处理依据记录</p>
            <div v-else class="exception-trace-list">
              <article v-for="item in decisionTraceList" :key="item.id || `${item.businessType}-${item.businessId}`" class="exception-trace-item">
                <div class="exception-trace-item__head">
                  <strong>{{ formatDecisionLabel(item.finalDecision, '未生成最终结论') }}</strong>
                  <span>{{ formatScore(item.confidenceScore) }}</span>
                </div>
                <p><strong>规则校验：</strong>{{ formatReadableText(item.ruleResult) }}</p>
                <p><strong>综合识别：</strong>{{ formatReadableText(item.modelResult) }}</p>
                <p><strong>判定依据：</strong>{{ formatReadableText(item.decisionReason) }}</p>
              </article>
            </div>
          </section>
        </template>
      </div>
    </section>
  </section>
</template>

<script setup>
import { ElMessage } from 'element-plus'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import ConsoleHero from '../../components/console/ConsoleHero.vue'
import ConsoleOverviewCards from '../../components/console/ConsoleOverviewCards.vue'
import {
  fetchExceptionAnalysisBrief,
  fetchExceptionComplexCheck,
  fetchExceptionDecisionTrace,
  fetchExceptionDetail,
  fetchExceptionList,
  fetchExceptionRuleCheck,
} from '../../api/exception'
import { formatDateTimeDisplay } from '../../utils/date-time'
import { formatReadableText } from '../../utils/readable-text'

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

const INTERFACE_ERROR_MESSAGES = {
  'server error': '服务器异常，请稍后重试',
}

const route = useRoute()
const router = useRouter()

const queryForm = reactive({
  pageNum: 1,
  pageSize: 10,
  type: '',
  riskLevel: '',
  processStatus: '',
  userId: '',
})

const listLoading = ref(false)
const listError = ref('')
const listTotal = ref(0)
const exceptionList = ref([])

const detailVisible = ref(false)
const detailLoading = ref(false)
const detailError = ref('')
const selectedExceptionId = ref('')
const exceptionDetail = ref(null)
const analysisBrief = ref(null)
const analysisError = ref('')
const decisionTraceList = ref([])
const decisionTraceError = ref('')
const ruleCheckLoading = ref(false)
const complexCheckLoading = ref(false)
const manualCheckError = ref('')
const ruleCheckResult = ref(null)
const complexCheckResult = ref(null)
let latestDetailRequestId = 0

const overviewItems = computed(() => [
  {
    key: 'total',
    label: '异常总数',
    value: `${listTotal.value}`,
    desc: '按当前筛选条件汇总',
  },
  {
    key: 'filter',
    label: '当前筛选',
    value:
      EXCEPTION_TYPE_LABELS[queryForm.type] ||
      RISK_LEVEL_LABELS[queryForm.riskLevel] ||
      PROCESS_STATUS_LABELS[queryForm.processStatus] ||
      queryForm.userId ||
      '全部异常',
    desc: '支持按类型、风险、状态和人员维度查看',
  },
  {
    key: 'entry',
    label: '处置入口',
    value: detailVisible.value ? formatSelectedExceptionTitle() : '待选择异常',
    desc: '详情中可直接进入人工复核页面',
  },
])

function buildListQuery() {
  return {
    pageNum: queryForm.pageNum,
    pageSize: queryForm.pageSize,
    type: queryForm.type,
    riskLevel: queryForm.riskLevel,
    processStatus: queryForm.processStatus,
    userId: queryForm.userId.trim(),
  }
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

function formatDecisionLabel(value, fallback = '--') {
  if (!value) {
    return fallback
  }

  const normalizedValue = `${value}`.trim()
  if (!normalizedValue) {
    return fallback
  }

  return EXCEPTION_TYPE_LABELS[normalizedValue] || normalizedValue
}

function normalizeInterfaceMessage(message, fallbackMessage) {
  if (!message) {
    return fallbackMessage
  }

  return INTERFACE_ERROR_MESSAGES[message] || message
}

function formatDateTime(value) {
  return formatDateTimeDisplay(value, '--')
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

function formatSelectedExceptionTitle() {
  if (exceptionDetail.value) {
    return buildExceptionTitle(exceptionDetail.value)
  }

  const currentItem = exceptionList.value.find((item) => `${item.id}` === `${selectedExceptionId.value}`)
  return currentItem ? buildExceptionTitle(currentItem) : '待核查异常'
}

function formatScore(value) {
  if (value === null || value === undefined || value === '') {
    return '--'
  }

  return `${value}`
}

function hasCheckContext() {
  return Boolean(exceptionDetail.value?.recordId)
}

function buildCheckPayload() {
  const recordId = exceptionDetail.value?.recordId === null || exceptionDetail.value?.recordId === undefined
    ? ''
    : `${exceptionDetail.value.recordId}`.trim()

  return {
    recordId,
  }
}

function getRiskTagClass(level) {
  if (level === 'HIGH') {
    return 'exception-tag--danger'
  }

  if (level === 'MEDIUM') {
    return 'exception-tag--warning'
  }

  if (level === 'LOW') {
    return 'exception-tag--safe'
  }

  return 'exception-tag--neutral'
}

function getProcessTagClass(status) {
  if (status === 'REVIEWED') {
    return 'exception-tag--safe'
  }

  if (status === 'PENDING') {
    return 'exception-tag--warning'
  }

  return 'exception-tag--neutral'
}

function getSourceTagClass(source) {
  if (source === 'RULE') {
    return 'exception-tag--neutral'
  }

  if (source === 'MODEL' || source === 'MODEL_FALLBACK') {
    return 'exception-tag--info'
  }

  return 'exception-tag--neutral'
}

async function loadExceptionList() {
  listLoading.value = true
  listError.value = ''

  try {
    const payload = await fetchExceptionList(buildListQuery())
    exceptionList.value = Array.isArray(payload?.records) ? payload.records : []
    listTotal.value = typeof payload?.total === 'number' ? payload.total : exceptionList.value.length
  } catch (error) {
    exceptionList.value = []
    listTotal.value = 0
    listError.value = error?.message || '获取异常列表失败'
  } finally {
    listLoading.value = false
  }
}

function handleSearch() {
  queryForm.pageNum = 1
  return loadExceptionList()
}

async function openExceptionDetail(id) {
  return loadExceptionDetail(id, true)
}

async function loadExceptionDetail(id, resetManualResults = false) {
  const requestId = ++latestDetailRequestId

  selectedExceptionId.value = id
  detailVisible.value = true
  detailLoading.value = true
  detailError.value = ''
  exceptionDetail.value = null
  analysisBrief.value = null
  analysisError.value = ''
  decisionTraceList.value = []
  decisionTraceError.value = ''
  manualCheckError.value = ''
  if (resetManualResults) {
    ruleCheckResult.value = null
    complexCheckResult.value = null
  }

  const [detailResult, analysisResult, traceResult] = await Promise.allSettled([
    fetchExceptionDetail(id),
    fetchExceptionAnalysisBrief(id),
    fetchExceptionDecisionTrace(id),
  ])

  if (requestId !== latestDetailRequestId) {
    return
  }

  if (detailResult.status === 'fulfilled') {
    exceptionDetail.value = detailResult.value
  } else {
    detailError.value = detailResult.reason?.message || '获取异常详情失败'
  }

  if (analysisResult.status === 'fulfilled') {
    analysisBrief.value = analysisResult.value
  } else {
    analysisError.value = analysisResult.reason?.message || '获取分析摘要失败'
  }

  if (traceResult.status === 'fulfilled') {
    decisionTraceList.value = Array.isArray(traceResult.value) ? traceResult.value : []
  } else {
    decisionTraceError.value = traceResult.reason?.message || '获取处理依据失败'
  }

  detailLoading.value = false
}

async function refreshExceptionDetailAfterCheck(preferredExceptionId) {
  await loadExceptionList()

  const preferredId = preferredExceptionId === null || preferredExceptionId === undefined ? '' : `${preferredExceptionId}`.trim()
  const nextException = exceptionList.value.find((item) => `${item.id}` === preferredId)
    || exceptionList.value.find((item) => item.recordId === exceptionDetail.value?.recordId)

  if (!nextException) {
    return
  }

  await loadExceptionDetail(nextException.id, false)
}

function closeExceptionDetail() {
  detailVisible.value = false
  latestDetailRequestId += 1

  if (!route.query?.exceptionId) {
    return
  }

  const nextQuery = { ...route.query }
  delete nextQuery.exceptionId

  router.replace({
    path: route.path,
    query: nextQuery,
  })
}

function jumpToReview(exceptionId) {
  const normalizedId = exceptionId === null || exceptionId === undefined ? '' : `${exceptionId}`.trim()

  if (!normalizedId || normalizedId === 'null' || normalizedId === 'undefined') {
    return
  }

  router.push({
    path: '/review',
    query: {
      exceptionId: normalizedId,
    },
  })
}

async function runRuleCheck() {
  if (!hasCheckContext() || ruleCheckLoading.value) {
    return
  }

  ruleCheckLoading.value = true
  manualCheckError.value = ''

  try {
    ruleCheckResult.value = await fetchExceptionRuleCheck({
      recordId: buildCheckPayload().recordId,
    })
    ElMessage.success('规则校验已完成')
    await refreshExceptionDetailAfterCheck(ruleCheckResult.value?.exceptionId)
  } catch (error) {
    manualCheckError.value = normalizeInterfaceMessage(error?.message, '规则校验失败')
  } finally {
    ruleCheckLoading.value = false
  }
}

async function runComplexCheck() {
  if (!hasCheckContext() || complexCheckLoading.value) {
    return
  }

  complexCheckLoading.value = true
  manualCheckError.value = ''

  try {
    complexCheckResult.value = await fetchExceptionComplexCheck(buildCheckPayload())
    ElMessage.success('综合识别已完成')
    await refreshExceptionDetailAfterCheck(complexCheckResult.value?.exceptionId)
  } catch (error) {
    manualCheckError.value = normalizeInterfaceMessage(error?.message, '综合识别失败')
  } finally {
    complexCheckLoading.value = false
  }
}

watch(
  () => route.query?.exceptionId,
  (exceptionId) => {
    const normalizedValue = Array.isArray(exceptionId) ? exceptionId[0] : exceptionId
    const normalizedId = normalizedValue === null || normalizedValue === undefined ? '' : `${normalizedValue}`.trim()

    if (!normalizedId || normalizedId === 'null' || normalizedId === 'undefined') {
      return
    }

    openExceptionDetail(normalizedId)
  },
  { immediate: true },
)

onMounted(() => {
  loadExceptionList()
})
</script>

<style scoped>
.exception-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.exception-page__header,
.exception-list-card__head,
.exception-detail-section__head,
.exception-detail-dialog__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.exception-page__header {
  padding: 28px;
  border-radius: 28px;
  background: linear-gradient(135deg, #0f172a 0%, #4338ca 100%);
  color: #f8fafc;
  box-shadow: 0 24px 60px rgba(67, 56, 202, 0.16);
}

.exception-detail-dialog__actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.exception-page__eyebrow {
  margin: 0 0 8px;
  font-size: 12px;
  font-weight: 700;
  color: #2f69b2;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.exception-page__title,
.exception-list-card__head h3,
.exception-detail-section__head h4,
.exception-detail-dialog__header h3 {
  margin: 0;
  color: #0f172a;
}

.exception-page__title {
  color: #ffffff;
}

.exception-page__desc,
.exception-list-card__head span,
.exception-detail-section__head span {
  margin: 8px 0 0;
  color: #64748b;
}

.exception-page__desc {
  color: rgba(226, 232, 240, 0.88);
}

.exception-page__refresh,
.exception-filter-actions__primary,
.exception-item__action,
.exception-detail-dialog__review,
.exception-detail-dialog__close {
  border: 0;
  border-radius: 12px;
  background: #2f69b2;
  color: #ffffff;
  cursor: pointer;
  transition: all 0.2s ease;
}

.exception-page__refresh,
.exception-filter-actions__primary,
.exception-item__action,
.exception-detail-dialog__review,
.exception-detail-dialog__close {
  padding: 10px 16px;
}

.exception-detail-dialog__review {
  background: #0f172a;
}

.exception-manual-check__actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.exception-manual-check__button {
  border: 0;
  border-radius: 12px;
  padding: 10px 16px;
  background: #2f69b2;
  color: #ffffff;
  cursor: pointer;
  transition: all 0.2s ease;
}

.exception-manual-check__button--secondary {
  background: rgba(47, 105, 178, 0.12);
  color: #245391;
}

.exception-manual-check__button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.exception-filter-card,
.exception-list-card,
.exception-detail-dialog__panel {
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 20px;
  background: #ffffff;
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.08);
}

.exception-filter-card,
.exception-list-card {
  padding: 20px;
}

.exception-filter-grid,
.exception-detail-grid,
.exception-summary-grid,
.exception-manual-check__grid {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
}

.exception-manual-check__grid {
  margin-top: 16px;
}

.exception-manual-check__card {
  padding: 16px;
  border-radius: 16px;
  border: 1px solid rgba(148, 163, 184, 0.16);
  background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
}

.exception-manual-check__card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.exception-manual-check__card-head strong {
  color: #0f172a;
}

.exception-manual-check__card p {
  margin: 8px 0 0;
  color: #334155;
}

.exception-filter-field,
.exception-detail-grid div,
.exception-summary-grid div,
.exception-item__grid div {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.exception-filter-field span,
.exception-item__grid dt,
.exception-detail-grid dt,
.exception-summary-grid dt {
  font-size: 12px;
  font-weight: 700;
  color: #64748b;
}

.exception-filter-field input,
.exception-filter-field select {
  min-height: 40px;
  border: 1px solid rgba(148, 163, 184, 0.35);
  border-radius: 12px;
  padding: 0 12px;
}

.exception-filter-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}

.exception-feedback {
  margin: 0;
  border-radius: 14px;
  background: #f8fafc;
  padding: 14px 16px;
  color: #475569;
}

.exception-feedback--error {
  background: #fef2f2;
  color: #b91c1c;
}

.exception-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.exception-item {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  border-radius: 18px;
  background: linear-gradient(180deg, #f8fafc 0%, #ffffff 100%);
  border: 1px solid rgba(148, 163, 184, 0.16);
  padding: 18px;
}

.exception-item__main {
  flex: 1;
  display: grid;
  gap: 12px;
}

.exception-item__title-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
}

.exception-item__title-row strong,
.exception-item__title-row span {
  display: inline-flex;
  align-items: center;
  min-height: 30px;
  padding: 0 10px;
  border-radius: 999px;
}

.exception-item__title-row strong {
  background: rgba(47, 105, 178, 0.08);
  color: #245391;
}

.exception-item__title-row span {
  background: #f8fafc;
  color: #64748b;
}

.exception-item__grid {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(auto-fit, minmax(132px, 1fr));
  margin: 0;
}

.exception-item__grid dd,
.exception-detail-grid dd,
.exception-summary-grid dd {
  margin: 0;
  color: #0f172a;
}

.exception-tag {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 0 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
}

.exception-tag--danger {
  background: rgba(239, 68, 68, 0.12);
  color: #b91c1c;
}

.exception-tag--warning {
  background: rgba(245, 158, 11, 0.14);
  color: #b45309;
}

.exception-tag--safe {
  background: rgba(34, 197, 94, 0.12);
  color: #166534;
}

.exception-tag--info {
  background: rgba(47, 105, 178, 0.12);
  color: #245391;
}

.exception-tag--neutral {
  background: rgba(148, 163, 184, 0.18);
  color: #475569;
}

.exception-item__description,
.exception-detail-section__description,
.exception-trace-item p {
  margin: 0;
  color: #334155;
}

.exception-item__description {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.exception-detail-dialog {
  position: fixed;
  inset: 0;
  z-index: 30;
}

.exception-detail-dialog__backdrop {
  position: absolute;
  inset: 0;
  background: rgba(15, 23, 42, 0.54);
}

.exception-detail-dialog__panel {
  position: relative;
  z-index: 1;
  width: min(960px, calc(100vw - 32px));
  max-height: calc(100vh - 32px);
  overflow-y: auto;
  margin: 16px auto;
  padding: 24px;
  border-radius: 28px;
  background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
}

.exception-detail-section + .exception-detail-section {
  margin-top: 20px;
}

.exception-trace-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.exception-trace-item {
  border-radius: 16px;
  background: rgba(47, 105, 178, 0.06);
  padding: 16px;
}

.exception-trace-item__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

@media (max-width: 960px) {
  .exception-item,
  .exception-page__header,
  .exception-list-card__head,
  .exception-detail-section__head,
  .exception-detail-dialog__header,
  .exception-manual-check__card-head {
    flex-direction: column;
  }

  .exception-item__action,
  .exception-page__refresh,
  .exception-filter-actions__primary,
  .exception-detail-dialog__close,
  .exception-manual-check__button {
    width: 100%;
  }
}
</style>
