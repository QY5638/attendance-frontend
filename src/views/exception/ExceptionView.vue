<template>
  <section class="exception-page">
    <header class="exception-page__header">
      <div>
        <p class="exception-page__eyebrow">FE-06 异常与预警模块</p>
        <h2 class="exception-page__title">异常中心</h2>
        <p class="exception-page__desc">查看异常列表、AI 判定摘要与决策链，仅提供只读分析能力。</p>
      </div>

      <button type="button" data-testid="exception-refresh" class="exception-page__refresh" @click="loadExceptionList">
        刷新
      </button>
    </header>

    <section class="exception-filter-card">
      <div class="exception-filter-grid">
        <label class="exception-filter-field">
          <span>异常类型</span>
          <select v-model="queryForm.type" data-testid="exception-filter-type">
            <option value="">全部</option>
            <option value="PROXY_CHECKIN">PROXY_CHECKIN</option>
            <option value="LATE">LATE</option>
            <option value="EARLY_LEAVE">EARLY_LEAVE</option>
            <option value="ILLEGAL_TIME">ILLEGAL_TIME</option>
            <option value="REPEAT_CHECK">REPEAT_CHECK</option>
            <option value="MULTI_LOCATION_CONFLICT">MULTI_LOCATION_CONFLICT</option>
          </select>
        </label>

        <label class="exception-filter-field">
          <span>风险等级</span>
          <select v-model="queryForm.riskLevel" data-testid="exception-filter-risk-level">
            <option value="">全部</option>
            <option value="HIGH">HIGH</option>
            <option value="MEDIUM">MEDIUM</option>
            <option value="LOW">LOW</option>
          </select>
        </label>

        <label class="exception-filter-field">
          <span>处理状态</span>
          <select v-model="queryForm.processStatus" data-testid="exception-filter-process-status">
            <option value="">全部</option>
            <option value="PENDING">PENDING</option>
            <option value="REVIEWED">REVIEWED</option>
          </select>
        </label>

        <label class="exception-filter-field">
          <span>用户 ID</span>
          <input v-model="queryForm.userId" data-testid="exception-filter-user-id" type="text" placeholder="按用户 ID 查询" />
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
              <strong>#{{ item.id }}</strong>
              <span>{{ formatDateTime(item.createTime) }}</span>
            </div>

            <dl class="exception-item__grid">
              <div>
                <dt>异常类型</dt>
                <dd>{{ formatDisplayValue(item.type, EXCEPTION_TYPE_LABELS) }}</dd>
              </div>
              <div>
                <dt>风险等级</dt>
                <dd>{{ formatDisplayValue(item.riskLevel, RISK_LEVEL_LABELS) }}</dd>
              </div>
              <div>
                <dt>来源</dt>
                <dd>{{ formatDisplayValue(item.sourceType, SOURCE_TYPE_LABELS) }}</dd>
              </div>
              <div>
                <dt>处理状态</dt>
                <dd>{{ formatDisplayValue(item.processStatus, PROCESS_STATUS_LABELS) }}</dd>
              </div>
              <div>
                <dt>记录 ID</dt>
                <dd>{{ item.recordId ?? '--' }}</dd>
              </div>
              <div>
                <dt>用户 ID</dt>
                <dd>{{ item.userId ?? '--' }}</dd>
              </div>
            </dl>

            <p class="exception-item__description">{{ item.description || '暂无异常描述' }}</p>
          </div>

          <button
            :data-testid="`exception-open-detail-${item.id}`"
            type="button"
            class="exception-item__action"
            @click="openExceptionDetail(item.id)"
          >
            查看详情
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
            <h3>异常 #{{ selectedExceptionId }}</h3>
          </div>

          <button type="button" data-testid="exception-detail-close" class="exception-detail-dialog__close" @click="closeExceptionDetail">
            关闭
          </button>
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
                <dd>{{ exceptionDetail?.recordId ?? '--' }}</dd>
              </div>
              <div>
                <dt>用户 ID</dt>
                <dd>{{ exceptionDetail?.userId ?? '--' }}</dd>
              </div>
            </dl>

            <p class="exception-detail-section__description">{{ exceptionDetail?.description || '暂无异常描述' }}</p>
          </section>

          <section class="exception-detail-section">
            <div class="exception-detail-section__head">
              <h4>AI 判定摘要</h4>
              <span>{{ analysisBrief?.promptVersion || '无 Prompt 版本' }}</span>
            </div>

            <p v-if="analysisError" data-testid="exception-analysis-error" class="exception-feedback exception-feedback--error">
              {{ analysisError }}
            </p>
            <div v-else-if="analysisBrief" class="exception-summary-grid">
              <div>
                <dt>模型结论</dt>
                <dd>{{ analysisBrief.modelConclusion || '--' }}</dd>
              </div>
              <div>
                <dt>置信度</dt>
                <dd>{{ formatScore(analysisBrief.confidenceScore) }}</dd>
              </div>
              <div>
                <dt>理由摘要</dt>
                <dd>{{ analysisBrief.reasonSummary || '--' }}</dd>
              </div>
              <div>
                <dt>处理建议</dt>
                <dd>{{ analysisBrief.actionSuggestion || '--' }}</dd>
              </div>
              <div>
                <dt>相似案例</dt>
                <dd>{{ analysisBrief.similarCaseSummary || '--' }}</dd>
              </div>
            </div>
            <p v-else class="exception-feedback">暂无 AI 摘要</p>
          </section>

          <section class="exception-detail-section">
            <div class="exception-detail-section__head">
              <h4>决策链</h4>
              <span>{{ decisionTraceList.length }} 条</span>
            </div>

            <p v-if="decisionTraceError" class="exception-feedback exception-feedback--error">{{ decisionTraceError }}</p>
            <p v-else-if="!decisionTraceList.length" class="exception-feedback">暂无决策链记录</p>
            <div v-else class="exception-trace-list">
              <article v-for="item in decisionTraceList" :key="item.id || `${item.businessType}-${item.businessId}`" class="exception-trace-item">
                <div class="exception-trace-item__head">
                  <strong>{{ item.finalDecision || '未生成最终结论' }}</strong>
                  <span>{{ formatScore(item.confidenceScore) }}</span>
                </div>
                <p><strong>规则结果：</strong>{{ item.ruleResult || '--' }}</p>
                <p><strong>模型结果：</strong>{{ item.modelResult || '--' }}</p>
                <p><strong>判定依据：</strong>{{ item.decisionReason || '--' }}</p>
              </article>
            </div>
          </section>
        </template>
      </div>
    </section>
  </section>
</template>

<script setup>
import { onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import {
  fetchExceptionAnalysisBrief,
  fetchExceptionDecisionTrace,
  fetchExceptionDetail,
  fetchExceptionList,
} from '../../api/exception'

const EXCEPTION_TYPE_LABELS = {
  PROXY_CHECKIN: '代打卡',
  LATE: '迟到',
  EARLY_LEAVE: '早退',
  ILLEGAL_TIME: '非法时间',
  REPEAT_CHECK: '重复打卡',
  MULTI_LOCATION_CONFLICT: '多地点异常',
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
let latestDetailRequestId = 0

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
  return label ? `${value} · ${label}` : value
}

function formatDateTime(value) {
  return value || '--'
}

function formatScore(value) {
  if (value === null || value === undefined || value === '') {
    return '--'
  }

  return `${value}`
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
    analysisError.value = analysisResult.reason?.message || '获取异常分析摘要失败'
  }

  if (traceResult.status === 'fulfilled') {
    decisionTraceList.value = Array.isArray(traceResult.value) ? traceResult.value : []
  } else {
    decisionTraceError.value = traceResult.reason?.message || '获取异常决策链失败'
  }

  detailLoading.value = false
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

watch(
  () => route.query?.exceptionId,
  (exceptionId) => {
    const normalizedId = exceptionId === null || exceptionId === undefined ? '' : `${exceptionId}`.trim()

    if (!normalizedId || normalizedId === 'null' || normalizedId === 'undefined') {
      return
    }

    openExceptionDetail(exceptionId)
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

.exception-page__eyebrow {
  margin: 0 0 8px;
  font-size: 12px;
  font-weight: 700;
  color: #6366f1;
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

.exception-page__desc,
.exception-list-card__head span,
.exception-detail-section__head span {
  margin: 8px 0 0;
  color: #64748b;
}

.exception-page__refresh,
.exception-filter-actions__primary,
.exception-item__action,
.exception-detail-dialog__close {
  border: 0;
  border-radius: 12px;
  background: #4f46e5;
  color: #ffffff;
  cursor: pointer;
}

.exception-page__refresh,
.exception-filter-actions__primary,
.exception-item__action,
.exception-detail-dialog__close {
  padding: 10px 16px;
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
.exception-summary-grid {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
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
  background: #f8fafc;
  padding: 18px;
}

.exception-item__main {
  flex: 1;
}

.exception-item__title-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.exception-item__grid {
  display: grid;
  gap: 14px;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  margin: 0;
}

.exception-item__grid dd,
.exception-detail-grid dd,
.exception-summary-grid dd {
  margin: 0;
  color: #0f172a;
}

.exception-item__description,
.exception-detail-section__description,
.exception-trace-item p {
  margin: 16px 0 0;
  color: #334155;
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
  background: #f8fafc;
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
  .exception-detail-dialog__header {
    flex-direction: column;
  }

  .exception-item__action,
  .exception-page__refresh,
  .exception-filter-actions__primary,
  .exception-detail-dialog__close {
    width: 100%;
  }
}
</style>
