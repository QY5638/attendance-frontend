<template>
  <section class="panel-card">
    <header class="panel-card__header">
      <div>
        <h2>模型日志</h2>
        <p>查询模型调用记录、模板引用、耗时与执行状态。</p>
      </div>
      <span class="panel-card__summary">共 {{ pagination.total }} 条</span>
    </header>

    <form class="panel-card__filters" @submit.prevent="handleSearch">
      <label>
        <span>业务类型</span>
        <input v-model="filters.businessType" type="text" placeholder="如 ATTENDANCE_ANALYSIS" />
      </label>
      <label>
        <span>业务 ID</span>
        <input v-model="filters.businessId" type="text" placeholder="请输入业务 ID" />
      </label>
      <label>
        <span>模板 ID</span>
        <input v-model="filters.promptTemplateId" type="text" placeholder="请输入模板 ID" />
      </label>
      <label>
        <span>状态</span>
        <select v-model="filters.status">
          <option value="">全部状态</option>
          <option value="SUCCESS">成功</option>
          <option value="FAILED">失败</option>
        </select>
      </label>
      <label>
        <span>开始日期</span>
        <input v-model="filters.startDate" type="date" />
      </label>
      <label>
        <span>结束日期</span>
        <input v-model="filters.endDate" type="date" />
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
            <th>业务类型</th>
            <th>业务 ID</th>
            <th>模板 ID</th>
            <th>状态</th>
            <th>耗时</th>
            <th>输入摘要</th>
            <th>输出 / 错误</th>
            <th>创建时间</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="8">加载中...</td>
          </tr>
          <tr v-else-if="!rows.length">
            <td colspan="8">暂无模型日志</td>
          </tr>
          <tr v-for="row in rows" :key="row.id">
            <td>{{ row.businessType || '-' }}</td>
            <td>{{ row.businessId ?? '-' }}</td>
            <td>{{ row.promptTemplateId ?? '-' }}</td>
            <td>
              <span :class="['panel-card__status', row.status === 'SUCCESS' ? 'is-active' : 'is-inactive']">
                {{ row.status === 'SUCCESS' ? '成功' : '失败' }}
              </span>
            </td>
            <td>{{ formatLatency(row.latencyMs) }}</td>
            <td>{{ row.inputSummary || '-' }}</td>
            <td>{{ resolveResultText(row) }}</td>
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
  if (!value) {
    return '-'
  }

  return String(value).replace('T', ' ').slice(0, 19)
}

function formatLatency(value) {
  const latency = Number(value)
  return Number.isFinite(latency) ? `${latency} ms` : '-'
}

function resolveResultText(row) {
  if (row.status === 'FAILED') {
    return row.errorMessage || '-'
  }

  return row.outputSummary || '-'
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
    error.value = requestError?.message || '模型日志加载失败'
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
  background: #ffffff;
  box-shadow: 0 18px 60px rgba(15, 23, 42, 0.08);
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
  background: rgba(79, 70, 229, 0.08);
  color: #4338ca;
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
  background: linear-gradient(135deg, #4338ca 0%, #6366f1 100%);
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
