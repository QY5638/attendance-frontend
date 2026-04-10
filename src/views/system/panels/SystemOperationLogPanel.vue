<template>
  <section class="panel-card">
    <header class="panel-card__header">
      <div>
        <h2>业务记录</h2>
        <p>用于查询关键业务办理记录，便于审计和问题追踪。</p>
      </div>
    </header>

    <section class="panel-card__hero-strip">
      <article>
        <span>内容分类</span>
        <strong>办理记录</strong>
      </article>
      <article>
        <span>覆盖范围</span>
        <strong>登录 / 打卡 / 复核等关键业务</strong>
      </article>
    </section>

    <p class="panel-card__notice">
      当前主要记录登录、打卡、补卡、预警和复核等关键办理动作，便于日常审计与问题追踪。
    </p>

    <form class="panel-card__filters" @submit.prevent="handleSearch">
      <label>
        <span>办理人</span>
        <input v-model.number="filters.userId" type="number" min="1" placeholder="按办理人筛选" />
      </label>
      <label>
        <span>办理动作</span>
        <input v-model="filters.type" type="text" placeholder="请输入办理动作关键字" />
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
            <th>办理人</th>
            <th>办理动作</th>
            <th>办理摘要</th>
            <th>办理时间</th>
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
import { computed, onMounted, reactive, ref } from 'vue'

import { fetchOperationLogList } from '../../../api/system'
import { formatDateTimeDisplay } from '../../../utils/date-time'

const loading = ref(false)
const rows = ref([])
const error = ref('')

const filters = reactive({
  userId: '',
  type: '',
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
  LOGOUT: '退出登录',
  CHECKIN: '上班打卡',
  CHECKOUT: '下班打卡',
  ATTENDANCE_APPLY: '补卡申请',
  WARNING_REEVALUATE: '预警处理',
  REVIEW_SUBMIT: '复核办理',
  REVIEW_FEEDBACK: '复核补充',
  SYSTEM_CONFIG: '系统配置',
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
  }

  if (filters.startDate) {
    params.startDate = filters.startDate
  }

  if (filters.endDate) {
    params.endDate = filters.endDate
  }

  return params
}

function formatOperationType(type) {
  return OPERATION_TYPE_LABELS[String(type || '').toUpperCase()] || '其他操作'
}

function formatDateTime(value) {
  return formatDateTimeDisplay(value, '-')
}

function resolveOperationActor(row = {}) {
  const content = String(row.content || '').trim()
  const markers = ['登录系统', '退出系统', '上班打卡', '下班打卡', '提交补卡申请', '重新评估预警', '复核异常记录', '提交复核反馈', '修改系统配置']

  for (const marker of markers) {
    const markerIndex = content.indexOf(marker)
    if (markerIndex > 0) {
      return content.slice(0, markerIndex)
    }
  }

  return '当前办理人'
}

function formatOperationSummary(row = {}) {
  const content = String(row.content || '').trim()
  if (!content) {
    return '-'
  }

  const actor = resolveOperationActor(row)
  const withoutActor = actor && actor !== '当前办理人' && content.startsWith(actor)
    ? content.slice(actor.length)
    : content
  return withoutActor.replace(/\d+$/g, '') || withoutActor
}

async function loadList() {
  loading.value = true
  error.value = ''

  try {
    const { total, items } = await fetchOperationLogList(buildListParams())
    rows.value = items
    pagination.total = total
  } catch (requestError) {
    rows.value = []
    pagination.total = 0
    error.value = requestError?.message || '业务记录加载失败'
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  pagination.pageNum = 1
  void loadList()
}

function handleReset() {
  filters.userId = ''
  filters.type = ''
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
.panel-card button {
  font: inherit;
}

.panel-card input {
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
  .panel-card__header,
  .panel-card__footer {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
