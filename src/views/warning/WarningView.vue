<template>
  <section class="warning-page">
    <header class="warning-page__header">
      <div>
        <p class="warning-page__eyebrow">风险预警</p>
        <h2 class="warning-page__title">预警列表</h2>
        <p class="warning-page__desc">展示预警摘要、优先级和处置建议，并支持只读跳转到异常详情。</p>
      </div>

      <button type="button" data-testid="warning-refresh" class="warning-page__refresh" @click="loadWarningList">
        刷新
      </button>
    </header>

    <ConsoleOverviewCards :items="overviewItems" accent="#0f766e" />

    <section class="warning-filter-card">
      <div class="warning-filter-grid">
        <label class="warning-filter-field">
          <span>风险等级</span>
          <select v-model="queryForm.level" data-testid="warning-filter-level">
            <option value="">全部</option>
            <option value="HIGH">高风险</option>
            <option value="MEDIUM">中风险</option>
            <option value="LOW">低风险</option>
          </select>
        </label>

        <label class="warning-filter-field">
          <span>处理状态</span>
          <select v-model="queryForm.status" data-testid="warning-filter-status">
            <option value="">全部</option>
            <option value="UNPROCESSED">待处理</option>
            <option value="PROCESSED">已处理</option>
          </select>
        </label>

        <label class="warning-filter-field">
          <span>预警类型</span>
          <select v-model="queryForm.type" data-testid="warning-filter-type">
            <option value="">全部</option>
            <option value="RISK_WARNING">风险预警</option>
            <option value="ATTENDANCE_WARNING">考勤预警</option>
          </select>
        </label>
      </div>

      <div class="warning-filter-actions">
        <button type="button" data-testid="warning-search" class="warning-filter-actions__primary" @click="handleSearch">
          查询
        </button>
      </div>
    </section>

    <section class="warning-list-card">
      <div class="warning-list-card__head">
        <h3>预警列表</h3>
        <span>共 {{ listTotal }} 条</span>
      </div>

      <p v-if="listError" data-testid="warning-list-error" class="warning-feedback warning-feedback--error">
        {{ listError }}
      </p>
      <p v-else-if="listLoading" data-testid="warning-list-loading" class="warning-feedback">预警列表加载中...</p>
      <p v-else-if="!warningList.length" data-testid="warning-list-empty" class="warning-feedback">暂无预警记录</p>

      <div v-else data-testid="warning-list" class="warning-list">
        <article v-for="item in warningList" :key="item.id" class="warning-item">
          <div class="warning-item__main">
            <div class="warning-item__title-row">
              <strong>#{{ item.id }}</strong>
              <span>{{ formatDateTime(item.sendTime) }}</span>
            </div>

            <dl class="warning-item__grid">
              <div>
                <dt>关联异常</dt>
                <dd>{{ item.exceptionId ?? '--' }}</dd>
              </div>
              <div>
                <dt>异常类型</dt>
                <dd>{{ formatDisplayValue(item.exceptionType, WARNING_EXCEPTION_TYPE_LABELS) }}</dd>
              </div>
              <div>
                <dt>预警类型</dt>
                <dd>{{ formatDisplayValue(item.type, WARNING_TYPE_LABELS) }}</dd>
              </div>
              <div>
                <dt>风险等级</dt>
                <dd>{{ formatDisplayValue(item.level, WARNING_LEVEL_LABELS) }}</dd>
              </div>
              <div>
                <dt>处理状态</dt>
                <dd>{{ formatDisplayValue(item.status, WARNING_STATUS_LABELS) }}</dd>
              </div>
              <div>
                <dt>优先级</dt>
                <dd>{{ item.priorityScore ?? '--' }}</dd>
              </div>
            </dl>

            <p class="warning-item__summary">{{ item.aiSummary || item.disposeSuggestion || '暂无预警摘要' }}</p>
          </div>

          <div class="warning-item__actions">
            <button
              :data-testid="`warning-open-advice-${item.id}`"
              type="button"
              class="warning-item__action"
              @click="openAdvice(item.id)"
            >
              查看建议
            </button>
            <button
              :data-testid="`warning-open-exception-${item.exceptionId}`"
              type="button"
              class="warning-item__action warning-item__action--secondary"
              @click="jumpToException(item.exceptionId)"
            >
              查看关联异常
            </button>
            <button
              :data-testid="`warning-open-review-${item.exceptionId}`"
              type="button"
              class="warning-item__action warning-item__action--review"
              @click="jumpToReview(item.exceptionId)"
            >
              去复核
            </button>
          </div>
        </article>
      </div>
    </section>

    <section v-if="adviceVisible" data-testid="warning-advice-dialog" class="warning-advice-dialog">
      <div class="warning-advice-dialog__backdrop" @click="closeAdvice"></div>

      <div class="warning-advice-dialog__panel">
        <header class="warning-advice-dialog__header">
          <div>
            <p class="warning-page__eyebrow">预警建议</p>
            <h3>预警 #{{ selectedWarningId }}</h3>
          </div>

          <button type="button" class="warning-advice-dialog__close" @click="closeAdvice">关闭</button>
        </header>

        <p v-if="adviceLoading" class="warning-feedback">预警建议加载中...</p>
        <p v-else-if="adviceError" data-testid="warning-advice-error" class="warning-feedback warning-feedback--error">
          {{ adviceError }}
        </p>
        <div v-else-if="adviceDetail" class="warning-advice-grid">
          <div>
            <dt>关联异常</dt>
            <dd>{{ adviceDetail.exceptionId ?? '--' }}</dd>
          </div>
          <div>
            <dt>优先级</dt>
            <dd>{{ adviceDetail.priorityScore ?? '--' }}</dd>
          </div>
          <div>
            <dt>决策来源</dt>
            <dd>{{ formatDisplayValue(adviceDetail.decisionSource, DECISION_SOURCE_LABELS) }}</dd>
          </div>
          <div>
            <dt>智能摘要</dt>
            <dd>{{ adviceDetail.aiSummary || '--' }}</dd>
          </div>
          <div>
            <dt>处置建议</dt>
            <dd>{{ adviceDetail.disposeSuggestion || '--' }}</dd>
          </div>
        </div>
        <p v-else class="warning-feedback">暂无预警建议</p>
      </div>
    </section>
  </section>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'

import ConsoleOverviewCards from '../../components/console/ConsoleOverviewCards.vue'
import { fetchFe06WarningAdvice, fetchFe06WarningList } from '../../api/fe06-warning'

const WARNING_TYPE_LABELS = {
  RISK_WARNING: '风险预警',
  ATTENDANCE_WARNING: '考勤预警',
}

const WARNING_EXCEPTION_TYPE_LABELS = {
  MULTI_LOCATION_CONFLICT: '多地点异常',
}

const WARNING_LEVEL_LABELS = {
  HIGH: '高风险',
  MEDIUM: '中风险',
  LOW: '低风险',
}

const WARNING_STATUS_LABELS = {
  UNPROCESSED: '待处理',
  PROCESSED: '已处理',
}

const DECISION_SOURCE_LABELS = {
  MODEL_FUSION: '模型融合',
  RULE: '规则判定',
}

const router = useRouter()

const queryForm = reactive({
  pageNum: 1,
  pageSize: 10,
  level: '',
  status: '',
  type: '',
})

const listLoading = ref(false)
const listError = ref('')
const listTotal = ref(0)
const warningList = ref([])

const adviceVisible = ref(false)
const adviceLoading = ref(false)
const adviceError = ref('')
const selectedWarningId = ref('')
const adviceDetail = ref(null)
let latestAdviceRequestId = 0

const overviewItems = computed(() => [
  {
    key: 'total',
    label: '预警总数',
    value: `${listTotal.value}`,
    desc: '按当前筛选条件统计',
  },
  {
    key: 'filter',
    label: '当前筛选',
    value:
      WARNING_LEVEL_LABELS[queryForm.level] ||
      WARNING_STATUS_LABELS[queryForm.status] ||
      WARNING_TYPE_LABELS[queryForm.type] ||
      '全部预警',
    desc: '支持按风险等级、状态与预警类型组合查看',
  },
  {
    key: 'advice',
    label: '建议弹层',
    value: adviceVisible.value ? `预警 #${selectedWarningId.value}` : '待查看建议',
    desc: '可在建议中直接跳转异常详情或人工复核',
  },
])

function buildListQuery() {
  return {
    pageNum: queryForm.pageNum,
    pageSize: queryForm.pageSize,
    level: queryForm.level,
    status: queryForm.status,
    type: queryForm.type,
  }
}

function formatDisplayValue(value, labelMap) {
  if (!value) {
    return '--'
  }

  const label = labelMap[value]
  return label || value
}

function formatDateTime(value) {
  return value || '--'
}

async function loadWarningList() {
  listLoading.value = true
  listError.value = ''

  try {
    const payload = await fetchFe06WarningList(buildListQuery())
    warningList.value = Array.isArray(payload?.records) ? payload.records : []
    listTotal.value = typeof payload?.total === 'number' ? payload.total : warningList.value.length
  } catch (error) {
    warningList.value = []
    listTotal.value = 0
    listError.value = error?.message || '获取预警列表失败'
  } finally {
    listLoading.value = false
  }
}

function handleSearch() {
  queryForm.pageNum = 1
  return loadWarningList()
}

async function openAdvice(id) {
  const requestId = ++latestAdviceRequestId

  selectedWarningId.value = id
  adviceVisible.value = true
  adviceLoading.value = true
  adviceError.value = ''
  adviceDetail.value = null

  try {
    const payload = await fetchFe06WarningAdvice(id)

    if (requestId !== latestAdviceRequestId) {
      return
    }

    adviceDetail.value = payload
  } catch (error) {
    if (requestId !== latestAdviceRequestId) {
      return
    }

    adviceError.value = error?.message || '获取预警建议失败'
  } finally {
    if (requestId === latestAdviceRequestId) {
      adviceLoading.value = false
    }
  }
}

function closeAdvice() {
  adviceVisible.value = false
  latestAdviceRequestId += 1
}

function jumpToException(exceptionId) {
  const normalizedId = exceptionId === null || exceptionId === undefined ? '' : `${exceptionId}`.trim()

  if (!normalizedId || normalizedId === 'null' || normalizedId === 'undefined') {
    return
  }

  router.push({
    path: '/exception',
    query: {
      exceptionId: normalizedId,
    },
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

onMounted(() => {
  loadWarningList()
})
</script>

<style scoped>
.warning-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.warning-overview-item {
  --console-overview-accent: #0f766e;
}

.warning-page__header,
.warning-list-card__head,
.warning-advice-dialog__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.warning-page__header {
  padding: 28px;
  border-radius: 28px;
  background: linear-gradient(135deg, #052e2b 0%, #0f766e 100%);
  color: #f8fafc;
  box-shadow: 0 24px 60px rgba(15, 118, 110, 0.16);
}

.warning-page__eyebrow {
  margin: 0 0 8px;
  font-size: 12px;
  font-weight: 700;
  color: #0ea5e9;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.warning-page__title,
.warning-list-card__head h3,
.warning-advice-dialog__header h3 {
  margin: 0;
  color: #0f172a;
}

.warning-page__title {
  color: #ffffff;
}

.warning-page__desc,
.warning-list-card__head span {
  margin: 8px 0 0;
  color: #64748b;
}

.warning-page__desc {
  color: rgba(226, 232, 240, 0.88);
}

.warning-page__refresh,
.warning-filter-actions__primary,
.warning-item__action,
.warning-advice-dialog__close {
  border: 0;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.warning-page__refresh,
.warning-filter-actions__primary,
.warning-item__action,
.warning-advice-dialog__close {
  padding: 10px 16px;
}

.warning-page__refresh,
.warning-filter-actions__primary,
.warning-item__action,
.warning-advice-dialog__close {
  background: #0f766e;
  color: #ffffff;
}

.warning-item__action--secondary {
  background: #0f172a;
}

.warning-item__action--review {
  background: #0f766e;
}

.warning-filter-card,
.warning-list-card,
.warning-advice-dialog__panel {
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 20px;
  background: #ffffff;
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.08);
}

.warning-filter-card,
.warning-list-card {
  padding: 20px;
}

.warning-filter-grid,
.warning-advice-grid,
.warning-item__grid {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
}

.warning-filter-field,
.warning-advice-grid div,
.warning-item__grid div {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.warning-filter-field span,
.warning-item__grid dt,
.warning-advice-grid dt {
  font-size: 12px;
  font-weight: 700;
  color: #64748b;
}

.warning-filter-field input,
.warning-filter-field select {
  min-height: 40px;
  border: 1px solid rgba(148, 163, 184, 0.35);
  border-radius: 12px;
  padding: 0 12px;
}

.warning-filter-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}

.warning-feedback {
  margin: 0;
  border-radius: 14px;
  background: #f8fafc;
  padding: 14px 16px;
  color: #475569;
}

.warning-feedback--error {
  background: #fef2f2;
  color: #b91c1c;
}

.warning-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.warning-item {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  border-radius: 18px;
  background: linear-gradient(180deg, #f8fafc 0%, #ffffff 100%);
  border: 1px solid rgba(148, 163, 184, 0.16);
  padding: 18px;
}

.warning-item__main {
  flex: 1;
}

.warning-item__title-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.warning-item__grid {
  margin: 0;
}

.warning-item__grid dd,
.warning-advice-grid dd {
  margin: 0;
  color: #0f172a;
}

.warning-item__summary {
  margin: 16px 0 0;
  color: #334155;
}

.warning-item__actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.warning-advice-dialog {
  position: fixed;
  inset: 0;
  z-index: 30;
}

.warning-advice-dialog__backdrop {
  position: absolute;
  inset: 0;
  background: rgba(15, 23, 42, 0.54);
}

.warning-advice-dialog__panel {
  position: relative;
  z-index: 1;
  width: min(840px, calc(100vw - 32px));
  max-height: calc(100vh - 32px);
  overflow-y: auto;
  margin: 16px auto;
  padding: 24px;
  border-radius: 28px;
  background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
}

@media (max-width: 960px) {
  .warning-item,
  .warning-page__header,
  .warning-list-card__head,
  .warning-advice-dialog__header {
    flex-direction: column;
  }

  .warning-item__actions,
  .warning-page__refresh,
  .warning-filter-actions__primary,
  .warning-item__action,
  .warning-advice-dialog__close {
    width: 100%;
  }
}
</style>
