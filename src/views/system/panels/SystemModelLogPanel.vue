<template>
  <section class="panel-card">
    <header class="panel-card__header">
      <div>
        <h2>系统分析记录</h2>
        <p>用于查看系统分析过程、所用分析方案、执行耗时与结果说明。</p>
      </div>
      <span class="panel-card__summary">共 {{ pagination.total }} 条</span>
    </header>

    <section class="panel-card__hero-strip">
      <article>
        <span>记录类型</span>
        <strong>系统分析记录</strong>
      </article>
      <article>
        <span>主要用途</span>
        <strong>查看分析场景、结果与耗时</strong>
      </article>
    </section>

    <form class="panel-card__filters" @submit.prevent="handleSearch">
      <label>
        <span>分析场景</span>
        <input v-model="filters.businessType" type="text" placeholder="请输入分析场景关键字" />
      </label>
      <label>
        <span>关联记录编号</span>
        <input v-model="filters.businessId" type="text" placeholder="按关联记录编号筛选" />
      </label>
      <label>
        <span>分析方案编号</span>
        <input v-model="filters.promptTemplateId" type="text" placeholder="按分析方案编号筛选" />
      </label>
      <label>
        <span>执行状态</span>
        <select v-model="filters.status">
          <option value="">全部状态</option>
          <option value="SUCCESS">成功</option>
          <option value="FAILED">失败</option>
        </select>
      </label>
      <label>
        <span>开始日期</span>
        <input v-model="filters.startDate" :data-empty="String(!filters.startDate)" type="date" />
      </label>
      <label>
        <span>结束日期</span>
        <input v-model="filters.endDate" :data-empty="String(!filters.endDate)" type="date" />
      </label>
      <div class="panel-card__actions">
        <button type="submit" class="panel-card__primary">查询</button>
        <button type="button" @click="handleReset">重置</button>
      </div>
    </form>

    <p v-if="error" class="panel-card__feedback panel-card__feedback--error">{{ error }}</p>

    <div class="panel-card__table-wrapper">
      <table class="panel-card__table">
        <thead>
          <tr>
            <th>分析场景</th>
            <th>关联记录</th>
            <th>分析方案</th>
            <th>执行状态</th>
            <th>执行耗时</th>
            <th>输入概述</th>
            <th>分析结果</th>
            <th>创建时间</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="8">加载中...</td>
          </tr>
          <tr v-else-if="!rows.length">
            <td colspan="8">暂无系统分析记录</td>
          </tr>
          <tr v-for="row in rows" :key="row.id">
            <td>
              <span :class="['panel-card__scene-tag', getBusinessTypeClass(row.businessType)]">
                {{ formatBusinessType(row.businessType) }}
              </span>
            </td>
            <td>{{ formatBusinessReference(row) }}</td>
            <td>{{ formatPromptReference(row) }}</td>
            <td>
              <span :class="['panel-card__status', getModelStatusClass(row.status)]">
                {{ formatModelStatus(row.status) }}
              </span>
            </td>
            <td>{{ formatLatency(row.latencyMs) }}</td>
            <td>
              <p class="panel-card__summary-text">{{ formatReadableText(row.inputSummary, '-') }}</p>
            </td>
            <td>
              <p class="panel-card__summary-text">{{ resolveResultText(row) }}</p>
            </td>
            <td>{{ formatDateTime(row.createTime) }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <footer class="panel-card__footer">
      <span>第 {{ pagination.pageNum }} / {{ totalPages }} 页，共 {{ pagination.total }} 条</span>
      <div class="panel-card__actions">
        <button type="button" :disabled="pagination.pageNum <= 1" @click="changePage(-1)">上一页</button>
        <button type="button" :disabled="pagination.pageNum >= totalPages" @click="changePage(1)">下一页</button>
      </div>
    </footer>
  </section>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'

import { fetchModelLogList } from '../../../api/system'
import { formatDateTimeDisplay } from '../../../utils/date-time'
import { formatReadableText } from '../../../utils/readable-text'

const loading = ref(false)
const rows = ref([])
const error = ref('')

const filters = reactive({
  businessType: '',
  businessId: '',
  promptTemplateId: '',
  status: '',
  startDate: '',
  endDate: '',
})

const pagination = reactive({
  pageNum: 1,
  pageSize: 10,
  total: 0,
})

const totalPages = computed(() => Math.max(1, Math.ceil(pagination.total / pagination.pageSize) || 1))

const MODEL_STATUS_LABELS = {
  SUCCESS: '成功',
  FAILED: '失败',
  RUNNING: '执行中',
  PENDING: '待执行',
}

function buildListParams() {
  const params = {
    pageNum: pagination.pageNum,
    pageSize: pagination.pageSize,
  }

  if (filters.businessType.trim()) {
    params.businessType = filters.businessType
  }

  if (filters.businessId.trim()) {
    params.businessId = filters.businessId
  }

  if (filters.promptTemplateId.trim()) {
    params.promptTemplateId = filters.promptTemplateId
  }

  if (filters.status) {
    params.status = filters.status
  }

  if (filters.startDate) {
    params.startDate = filters.startDate
  }

  if (filters.endDate) {
    params.endDate = filters.endDate
  }

  return params
}

function formatDateTime(value) {
  return formatDateTimeDisplay(value, '-')
}

function formatLatency(value) {
  const latency = Number(value)
  return Number.isFinite(latency) ? `${latency} ms` : '-'
}

function formatBusinessReference(row = {}) {
  const sceneLabel = formatBusinessType(row.businessType)
  if (row.inputSummary) {
    return `${sceneLabel === '-' ? '当前记录' : `${sceneLabel}记录`}：${row.inputSummary}`
  }

  return sceneLabel === '-' ? '当前记录' : `${sceneLabel}记录`
}

function formatPromptReference(row = {}) {
  return row.promptTemplateId ? '已关联分析方案' : '使用系统默认方案'
}

function resolveResultText(row) {
  if (row.status === 'FAILED') {
    return row.errorMessage || '-'
  }

  if (row.status === 'RUNNING' || row.status === 'PENDING') {
    return formatReadableText(row.outputSummary, '处理中')
  }

  return formatReadableText(row.outputSummary, '-')
}

function formatModelStatus(status) {
  return MODEL_STATUS_LABELS[String(status || '').toUpperCase()] || '未识别'
}

function getModelStatusClass(status) {
  const normalized = String(status || '').toUpperCase()

  if (normalized === 'SUCCESS') {
    return 'is-active'
  }

  if (normalized === 'RUNNING' || normalized === 'PENDING') {
    return 'is-pending'
  }

  return 'is-inactive'
}

function formatBusinessType(value) {
  const normalized = String(value || '').toUpperCase()

  if (!normalized) {
    return '-'
  }

  if (normalized.includes('EXCEPTION')) {
    return '异常处理'
  }

  if (normalized.includes('WARNING')) {
    return '预警处置'
  }

  if (normalized.includes('REVIEW')) {
    return '复核办理'
  }

  if (normalized.includes('ATTENDANCE')) {
    return '考勤分析'
  }

  if (normalized.includes('STATISTIC')) {
    return '统计分析'
  }

  return '其他业务'
}

function getBusinessTypeClass(value) {
  const normalized = String(value || '').toUpperCase()

  if (normalized.includes('EXCEPTION')) {
    return 'panel-card__scene-tag--danger'
  }

  if (normalized.includes('WARNING')) {
    return 'panel-card__scene-tag--warning'
  }

  if (normalized.includes('REVIEW')) {
    return 'panel-card__scene-tag--info'
  }

  if (normalized.includes('STATISTIC')) {
    return 'panel-card__scene-tag--safe'
  }

  return 'panel-card__scene-tag--neutral'
}

async function loadList() {
  loading.value = true
  error.value = ''

  try {
    const { total, items } = await fetchModelLogList(buildListParams())
    rows.value = items
    pagination.total = total
  } catch (requestError) {
    rows.value = []
    pagination.total = 0
    error.value = requestError?.message || '系统分析记录加载失败'
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  pagination.pageNum = 1
  void loadList()
}

function handleReset() {
  filters.businessType = ''
  filters.businessId = ''
  filters.promptTemplateId = ''
  filters.status = ''
  filters.startDate = ''
  filters.endDate = ''
  pagination.pageNum = 1
  void loadList()
}

function changePage(step) {
  const nextPage = Math.min(Math.max(1, pagination.pageNum + step), totalPages.value)

  if (nextPage === pagination.pageNum) {
    return
  }

  pagination.pageNum = nextPage
  void loadList()
}

onMounted(() => {
  void loadList()
})
</script>

<style scoped>
.panel-card {
  padding: 24px;
  border-radius: 24px;
  background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
  box-shadow: 0 18px 60px rgba(15, 23, 42, 0.08);
}

.panel-card__hero-strip {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 18px;
}

.panel-card__hero-strip article {
  padding: 16px 18px;
  border-radius: 18px;
  background: rgba(47, 105, 178, 0.08);
}

.panel-card__hero-strip span,
.panel-card__hero-strip strong {
  display: block;
}

.panel-card__hero-strip span {
  font-size: 12px;
  color: #2f69b2;
}

.panel-card__hero-strip strong {
  margin-top: 8px;
  color: #0f172a;
}

.panel-card__header,
.panel-card__footer,
.panel-card__filters,
.panel-card__actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.panel-card__header {
  margin-bottom: 16px;
}

.panel-card__header h2 {
  margin: 0;
  color: #0f172a;
}

.panel-card__header p {
  margin: 8px 0 0;
  color: #64748b;
}

.panel-card__summary {
  padding: 8px 12px;
  border-radius: 999px;
  background: rgba(47, 105, 178, 0.08);
  color: #245391;
  font-size: 13px;
  font-weight: 600;
}

.panel-card__filters {
  flex-wrap: wrap;
  margin-bottom: 16px;
}

.panel-card__filters label {
  display: flex;
  min-width: 180px;
  flex: 1 1 180px;
  flex-direction: column;
  gap: 8px;
  color: #334155;
  font-size: 13px;
}

.panel-card__filters input,
.panel-card__filters select {
  padding: 10px 12px;
  border: 1px solid rgba(148, 163, 184, 0.4);
  border-radius: 12px;
  font-size: 14px;
}

.panel-card__actions {
  justify-content: flex-end;
  align-self: flex-end;
}

.panel-card__actions button,
.panel-card__table button {
  padding: 10px 14px;
  border: none;
  border-radius: 12px;
  background: rgba(15, 23, 42, 0.06);
  color: #0f172a;
  cursor: pointer;
}

.panel-card__primary {
  background: linear-gradient(135deg, #245391 0%, #2f69b2 100%);
  color: #ffffff;
}

.panel-card__actions button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.panel-card__feedback {
  margin: 0 0 16px;
  padding: 12px 14px;
  border-radius: 14px;
  font-size: 14px;
}

.panel-card__feedback--error {
  background: rgba(239, 68, 68, 0.12);
  color: #b91c1c;
}

.panel-card__table-wrapper {
  overflow-x: auto;
}

.panel-card__table {
  width: 100%;
  border-collapse: collapse;
}

.panel-card__table th,
.panel-card__table td {
  padding: 14px 12px;
  border-bottom: 1px solid rgba(226, 232, 240, 0.9);
  text-align: left;
  vertical-align: top;
  color: #0f172a;
  font-size: 14px;
}

.panel-card__table th {
  color: #64748b;
  font-size: 13px;
  font-weight: 600;
}

.panel-card__status {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
}

.panel-card__status.is-active {
  background: rgba(34, 197, 94, 0.12);
  color: #15803d;
}

.panel-card__status.is-inactive {
  background: rgba(239, 68, 68, 0.12);
  color: #b91c1c;
}

.panel-card__status.is-pending {
  background: rgba(245, 158, 11, 0.14);
  color: #b45309;
}

.panel-card__scene-tag {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 0 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
}

.panel-card__scene-tag--danger {
  background: rgba(239, 68, 68, 0.12);
  color: #b91c1c;
}

.panel-card__scene-tag--warning {
  background: rgba(245, 158, 11, 0.14);
  color: #b45309;
}

.panel-card__scene-tag--info {
  background: rgba(47, 105, 178, 0.12);
  color: #245391;
}

.panel-card__scene-tag--safe {
  background: rgba(34, 197, 94, 0.12);
  color: #166534;
}

.panel-card__scene-tag--neutral {
  background: rgba(148, 163, 184, 0.18);
  color: #475569;
}

.panel-card__summary-text {
  margin: 0;
  color: #334155;
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.panel-card__footer {
  margin-top: 16px;
}

@media (max-width: 960px) {
  .panel-card__header,
  .panel-card__footer {
    flex-direction: column;
    align-items: flex-start;
  }

  .panel-card__actions {
    width: 100%;
    justify-content: flex-start;
  }
}
</style>
