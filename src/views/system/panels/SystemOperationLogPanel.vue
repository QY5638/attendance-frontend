<template>
  <section class="panel-card">
    <header class="panel-card__header">
      <div>
        <h2>操作日志</h2>
        <p>对接 `GET /api/log/operation/list`，用于系统审计查询。</p>
      </div>
    </header>

    <p class="panel-card__notice">
      当前日志覆盖范围以登录、打卡、补卡申请、预警重评估、复核提交和复核反馈为主，不承诺覆盖系统配置修改日志。
    </p>

    <form class="panel-card__filters" @submit.prevent="handleSearch">
      <label>
        <span>用户 ID</span>
        <input v-model.number="filters.userId" type="number" min="1" placeholder="如 1001" />
      </label>
      <label>
        <span>操作类型</span>
        <input v-model="filters.type" type="text" placeholder="如 LOGIN / CHECKIN" />
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
            <th>ID</th>
            <th>用户 ID</th>
            <th>类型</th>
            <th>内容</th>
            <th>操作时间</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="5">加载中...</td>
          </tr>
          <tr v-else-if="!rows.length">
            <td colspan="5">暂无日志数据</td>
          </tr>
          <tr v-for="row in rows" :key="row.id">
            <td>{{ row.id }}</td>
            <td>{{ row.userId ?? '-' }}</td>
            <td>{{ row.type || '-' }}</td>
            <td>{{ row.content || '-' }}</td>
            <td>{{ row.operationTime || '-' }}</td>
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
    error.value = requestError?.message || '操作日志加载失败'
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
  background: rgba(99, 102, 241, 0.1);
  color: #3730a3;
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
  background: linear-gradient(135deg, #4338ca 0%, #6366f1 100%) !important;
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
