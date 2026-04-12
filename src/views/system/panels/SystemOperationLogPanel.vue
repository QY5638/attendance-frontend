<template>
  <section class="panel-card">
    <header class="panel-card__header">
      <div>
        <h2>操作记录</h2>
        <p>用于查询关键操作记录，方便核对经过和追踪问题。</p>
      </div>
      <div class="panel-card__actions">
        <button type="button" class="panel-card__primary" :disabled="exporting" @click="handleExport">
          {{ exporting ? '导出中...' : '导出当前记录' }}
        </button>
      </div>
    </header>

    <section class="panel-card__hero-strip">
      <article v-for="item in summaryCards" :key="item.key">
        <span>{{ item.label }}</span>
        <strong>{{ item.value }}</strong>
      </article>
    </section>

    <p class="panel-card__notice">
      当前支持按分类查看登录、活体、人脸申请、打卡、复核和系统设置等记录，方便日常核对与问题追踪。
    </p>

    <form class="panel-card__filters" @submit.prevent="handleSearch">
      <label>
        <span>操作人</span>
        <input v-model.number="filters.userId" type="number" min="1" placeholder="按操作人筛选" />
      </label>
      <label>
        <span>事件分类</span>
        <select v-model="filters.scope">
          <option value="ALL">全部事件</option>
          <option v-for="option in scopeOptions" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </select>
      </label>
      <label>
        <span>操作类型</span>
        <select v-model="filters.type">
          <option value="">全部动作</option>
          <option v-for="option in actionOptions" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
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
            <th>操作人</th>
            <th>操作类型</th>
            <th>操作摘要</th>
            <th>操作时间</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="4">加载中...</td>
          </tr>
          <tr v-else-if="!rows.length">
            <td colspan="4">暂无记录</td>
          </tr>
          <tr v-for="row in rows" :key="row.id">
            <td>{{ resolveOperationActor(row) }}</td>
            <td>{{ formatOperationType(row.type) }}</td>
            <td>{{ formatOperationSummary(row) }}</td>
            <td>{{ formatDateTime(row.operationTime) }}</td>
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
import { computed, onMounted, reactive, ref, watch } from 'vue'

import { fetchOperationLogList, fetchOperationLogSummary } from '../../../api/system'
import { exportStatisticsReport } from '../../../api/statistics'
import { formatDateTimeDisplay } from '../../../utils/date-time'

const loading = ref(false)
const rows = ref([])
const error = ref('')
const exporting = ref(false)
const summary = ref({
  total: 0,
  typeCounts: {},
})

const filters = reactive({
  userId: '',
  type: '',
  scope: 'ALL',
  startDate: '',
  endDate: '',
})

const pagination = reactive({
  pageNum: 1,
  pageSize: 10,
  total: 0,
})

const totalPages = computed(() => Math.max(1, Math.ceil(pagination.total / pagination.pageSize) || 1))

const OPERATION_TYPE_LABELS = {
  LOGIN: '登录',
  LOGIN_FAILURE: '登录失败',
  LOGIN_LOCKED: '登录受限',
  LOGOUT: '退出登录',
  TOKEN_REFRESH: '登录续期',
  TOKEN_REFRESH_FAILURE: '续期失败',
  CHECKIN: '上班打卡',
  CHECKOUT: '下班打卡',
  ATTENDANCE_APPLY: '补卡申请',
  FACE_REGISTER_APPLY: '人脸重录申请',
  FACE_REGISTER_APPROVE: '人脸重录已通过',
  FACE_REGISTER_REJECT: '人脸重录已驳回',
  WARNING_REEVALUATE: '预警重新判断',
  REVIEW_SUBMIT: '提交复核',
  REVIEW_FEEDBACK: '补充复核说明',
  SYSTEM_CONFIG: '系统设置调整',
  FACE_LIVENESS_SESSION: '开始活体验证',
  FACE_LIVENESS_PASS: '活体验证通过',
  FACE_LIVENESS_FAIL: '活体验证失败',
  FACE_LIVENESS_REJECT: '活体验证被拒绝',
  FACE_LIVENESS_CONSUME: '活体验证已使用',
}

const SCOPE_OPTIONS = [
  { value: 'AUTH', label: '登录相关记录', types: ['LOGIN', 'LOGIN_FAILURE', 'LOGIN_LOCKED', 'LOGOUT', 'TOKEN_REFRESH', 'TOKEN_REFRESH_FAILURE'] },
  { value: 'LIVENESS', label: '活体相关记录', types: ['FACE_LIVENESS_SESSION', 'FACE_LIVENESS_PASS', 'FACE_LIVENESS_FAIL', 'FACE_LIVENESS_REJECT', 'FACE_LIVENESS_CONSUME'] },
  { value: 'ATTENDANCE', label: '打卡事件', types: ['CHECKIN', 'CHECKOUT', 'ATTENDANCE_APPLY'] },
  { value: 'FACE', label: '人脸申请', types: ['FACE_REGISTER_APPLY', 'FACE_REGISTER_APPROVE', 'FACE_REGISTER_REJECT'] },
  { value: 'REVIEW', label: '复核事件', types: ['WARNING_REEVALUATE', 'REVIEW_SUBMIT', 'REVIEW_FEEDBACK'] },
  { value: 'SYSTEM', label: '系统设置记录', types: ['SYSTEM_CONFIG'] },
]

const ACTION_OPTIONS = Object.entries(OPERATION_TYPE_LABELS).map(([value, label]) => ({ value, label }))

const scopeOptions = SCOPE_OPTIONS.map(({ value, label }) => ({ value, label }))

const actionOptions = computed(() => {
  if (filters.scope === 'ALL') {
    return ACTION_OPTIONS
  }

  const scope = SCOPE_OPTIONS.find((item) => item.value === filters.scope)
  if (!scope) {
    return ACTION_OPTIONS
  }

  return ACTION_OPTIONS.filter((option) => scope.types.includes(option.value))
})

const summaryCards = computed(() => {
  const typeCounts = summary.value?.typeCounts || {}

  return [
    {
      key: 'total',
      label: '当前结果总数',
      value: Number(summary.value?.total || 0),
    },
    {
      key: 'auth',
      label: '登录相关记录',
      value: sumTypes(typeCounts, resolveScopeTypes('AUTH')),
    },
    {
      key: 'liveness',
      label: '活体相关记录',
      value: sumTypes(typeCounts, resolveScopeTypes('LIVENESS')),
    },
    {
      key: 'attendance',
      label: '打卡事件',
      value: sumTypes(typeCounts, resolveScopeTypes('ATTENDANCE')),
    },
  ]
})

function resolveScopeTypes(scope) {
  const targetScope = SCOPE_OPTIONS.find((item) => item.value === scope)
  return targetScope ? targetScope.types : []
}

function buildListParams() {
  const params = {
    pageNum: pagination.pageNum,
    pageSize: pagination.pageSize,
  }

  if (filters.userId !== '' && filters.userId !== null && filters.userId !== undefined) {
    params.userId = filters.userId
  }

  if (filters.type.trim()) {
    params.type = filters.type.trim()
  } else if (filters.scope !== 'ALL') {
    params.types = resolveScopeTypes(filters.scope)
  }

  if (filters.startDate) {
    params.startDate = filters.startDate
  }

  if (filters.endDate) {
    params.endDate = filters.endDate
  }

  return params
}

function buildSummaryParams() {
  const params = buildListParams()
  delete params.pageNum
  delete params.pageSize
  return params
}

function buildExportParams() {
  const params = buildSummaryParams()
  if (Array.isArray(params.types)) {
    params.types = params.types.join(',')
  }
  return {
    exportType: 'AUDIT',
    ...params,
  }
}

function formatOperationType(type) {
  return OPERATION_TYPE_LABELS[String(type || '').toUpperCase()] || '其他操作'
}

function formatDateTime(value) {
  return formatDateTimeDisplay(value, '-')
}

function resolveOperationActor(row = {}) {
  if (row.realName) {
    return row.username ? `${row.realName}（${row.username}）` : row.realName
  }

  if (row.username) {
    return row.username
  }

  if (row.userId) {
    return `用户 #${row.userId}`
  }

  return '系统自动生成'
}

function formatOperationSummary(row = {}) {
  const content = String(row.content || '').trim()
  if (!content) {
    return '-'
  }

  const actor = resolveOperationActor(row)
  const rawActor = row.realName || row.username || ''
  const withoutActor = rawActor && content.startsWith(rawActor)
    ? content.slice(rawActor.length)
    : content
  return withoutActor.replace(/\d+$/g, '') || withoutActor
}

function normalizeTypeFilter() {
  if (!filters.type) {
    return
  }

  if (filters.scope === 'ALL') {
    return
  }

  const scopeTypes = resolveScopeTypes(filters.scope)
  if (!scopeTypes.includes(filters.type)) {
    filters.type = ''
  }
}

function sumTypes(typeCounts, types) {
  return types.reduce((total, type) => total + Number(typeCounts?.[type] || 0), 0)
}

function downloadBlob(blob, filename) {
  if (!(blob instanceof Blob) || typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') {
    return false
  }

  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
  return true
}

async function loadList() {
  loading.value = true
  error.value = ''

  try {
    const [listResult, summaryResult] = await Promise.all([
      fetchOperationLogList(buildListParams()),
      fetchOperationLogSummary(buildSummaryParams()),
    ])
    const { total, items } = listResult
    rows.value = items
    pagination.total = total
    summary.value = summaryResult || { total: 0, typeCounts: {} }
  } catch (requestError) {
    rows.value = []
    pagination.total = 0
    summary.value = { total: 0, typeCounts: {} }
    error.value = requestError?.message || '操作记录加载失败'
  } finally {
    loading.value = false
  }
}

async function handleExport() {
  exporting.value = true

  try {
    const { blob, filename } = await exportStatisticsReport(buildExportParams())
    downloadBlob(blob, filename || '操作记录报表.csv')
  } catch (requestError) {
    error.value = requestError?.message || '操作记录导出失败'
  } finally {
    exporting.value = false
  }
}

function handleSearch() {
  pagination.pageNum = 1
  void loadList()
}

function handleReset() {
  filters.userId = ''
  filters.type = ''
  filters.scope = 'ALL'
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

watch(
  () => filters.scope,
  () => {
    normalizeTypeFilter()
  },
)
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
  grid-template-columns: repeat(4, minmax(0, 1fr));
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
  font-size: 22px;
  color: #0f172a;
}

.panel-card__header p {
  margin: 8px 0 0;
  color: #64748b;
  line-height: 1.6;
}

.panel-card__notice {
  margin: 0 0 16px;
  padding: 12px 14px;
  border-radius: 14px;
  background: rgba(47, 105, 178, 0.1);
  color: #245391;
  line-height: 1.7;
}

.panel-card__filters {
  align-items: end;
  flex-wrap: wrap;
  margin-bottom: 16px;
}

.panel-card__filters label {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 180px;
  color: #334155;
  font-size: 14px;
}

.panel-card input,
.panel-card select,
.panel-card button {
  font: inherit;
}

.panel-card input,
.panel-card select {
  padding: 10px 12px;
  border: 1px solid rgba(148, 163, 184, 0.35);
  border-radius: 12px;
  background: #ffffff;
}

.panel-card button {
  padding: 10px 14px;
  border: 0;
  border-radius: 12px;
  background: rgba(148, 163, 184, 0.18);
  color: #0f172a;
  cursor: pointer;
}

.panel-card button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.panel-card__primary {
  background: linear-gradient(135deg, #245391 0%, #2f69b2 100%) !important;
  color: #ffffff !important;
}

.panel-card__feedback {
  margin: 0 0 16px;
  padding: 12px 14px;
  border-radius: 14px;
}

.panel-card__feedback--error {
  background: rgba(248, 113, 113, 0.12);
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
  border-bottom: 1px solid rgba(226, 232, 240, 0.8);
  text-align: left;
  vertical-align: top;
}

.panel-card__footer {
  margin-top: 16px;
}

@media (max-width: 960px) {
  .panel-card__hero-strip {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .panel-card__header,
  .panel-card__footer {
    flex-direction: column;
    align-items: flex-start;
  }
}

@media (max-width: 640px) {
  .panel-card__hero-strip {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
