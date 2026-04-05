<template>
  <section class="panel-card">
    <header class="panel-card__header">
      <div>
        <h2>规则配置</h2>
        <p>维护考勤时间窗、迟到早退阈值和重复打卡限制。</p>
      </div>
      <button type="button" class="panel-card__primary" @click="openCreateDialog">新增规则</button>
    </header>

    <form class="panel-card__filters" @submit.prevent="handleSearch">
      <label>
        <span>关键词</span>
        <input v-model="filters.keyword" type="text" placeholder="规则名称" />
      </label>
      <label>
        <span>状态</span>
        <select v-model="filters.status">
          <option value="">全部状态</option>
          <option :value="1">启用</option>
          <option :value="0">停用</option>
        </select>
      </label>
      <div class="panel-card__actions">
        <button type="submit" class="panel-card__primary">查询</button>
        <button type="button" @click="handleReset">重置</button>
      </div>
    </form>

    <p v-if="error" class="panel-card__feedback panel-card__feedback--error">{{ error }}</p>
    <p v-else-if="notice" class="panel-card__feedback panel-card__feedback--success">{{ notice }}</p>

    <div class="panel-card__table-wrapper">
      <table class="panel-card__table">
        <thead>
          <tr>
            <th>名称</th>
            <th>上班时间</th>
            <th>下班时间</th>
            <th>迟到阈值</th>
            <th>早退阈值</th>
            <th>重复限制</th>
            <th>状态</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="8">加载中...</td>
          </tr>
          <tr v-else-if="!rows.length">
            <td colspan="8">暂无规则数据</td>
          </tr>
          <tr v-for="row in rows" :key="row.id">
            <td>{{ row.name || '-' }}</td>
            <td>{{ row.startTime || '-' }}</td>
            <td>{{ row.endTime || '-' }}</td>
            <td>{{ row.lateThreshold ?? '-' }}</td>
            <td>{{ row.earlyThreshold ?? '-' }}</td>
            <td>{{ row.repeatLimit ?? '-' }}</td>
            <td>
              <span :class="['panel-card__status', row.status === 1 ? 'is-active' : 'is-inactive']">
                {{ row.status === 1 ? '启用' : '停用' }}
              </span>
            </td>
            <td>
              <div class="panel-card__actions">
                <button type="button" @click="openEditDialog(row)">编辑</button>
                <button type="button" @click="handleToggleStatus(row)">
                  {{ row.status === 1 ? '停用' : '启用' }}
                </button>
              </div>
            </td>
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

    <div v-if="dialogVisible" class="panel-card__modal">
      <div class="panel-card__dialog">
        <div class="panel-card__dialog-head">
          <div>
            <strong>{{ editingId ? '编辑规则' : '新增规则' }}</strong>
            <p>规则配置属于 FE-08 管理能力，不承载异常处理和复核流程。</p>
          </div>
          <button type="button" class="panel-card__icon-btn" @click="dialogVisible = false">关闭</button>
        </div>

        <form class="panel-card__dialog-form" @submit.prevent="handleSubmit">
          <label>
            <span>规则名称</span>
            <input v-model="form.name" type="text" placeholder="请输入规则名称" />
          </label>
          <label>
            <span>状态</span>
            <select v-model="form.status">
              <option :value="1">启用</option>
              <option :value="0">停用</option>
            </select>
          </label>
          <label>
            <span>上班时间</span>
            <input v-model="form.startTime" type="time" step="1" />
          </label>
          <label>
            <span>下班时间</span>
            <input v-model="form.endTime" type="time" step="1" />
          </label>
          <label>
            <span>迟到阈值（分钟）</span>
            <input v-model.number="form.lateThreshold" type="number" min="0" />
          </label>
          <label>
            <span>早退阈值（分钟）</span>
            <input v-model.number="form.earlyThreshold" type="number" min="0" />
          </label>
          <label>
            <span>重复限制（分钟）</span>
            <input v-model.number="form.repeatLimit" type="number" min="0" />
          </label>
          <div class="panel-card__dialog-actions panel-card__full-width">
            <button type="button" @click="dialogVisible = false">取消</button>
            <button type="submit" class="panel-card__primary" :disabled="submitting">
              {{ submitting ? '保存中...' : '保存' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'

import { addRule, fetchRuleList, updateRule, updateRuleStatus } from '../../../api/system'

const loading = ref(false)
const submitting = ref(false)
const dialogVisible = ref(false)
const editingId = ref(null)
const rows = ref([])
const error = ref('')
const notice = ref('')

const filters = reactive({
  keyword: '',
  status: '',
})

const pagination = reactive({
  pageNum: 1,
  pageSize: 10,
  total: 0,
})

const form = reactive({
  name: '',
  startTime: '09:00:00',
  endTime: '18:00:00',
  lateThreshold: 10,
  earlyThreshold: 10,
  repeatLimit: 3,
  status: 1,
})

const totalPages = computed(() => Math.max(1, Math.ceil(pagination.total / pagination.pageSize) || 1))

function buildListParams() {
  const params = {
    pageNum: pagination.pageNum,
    pageSize: pagination.pageSize,
  }

  if (filters.keyword.trim()) {
    params.keyword = filters.keyword.trim()
  }

  if (filters.status !== '' && filters.status !== null && filters.status !== undefined) {
    params.status = filters.status
  }

  return params
}

function resetForm() {
  editingId.value = null
  form.name = ''
  form.startTime = '09:00:00'
  form.endTime = '18:00:00'
  form.lateThreshold = 10
  form.earlyThreshold = 10
  form.repeatLimit = 3
  form.status = 1
}

async function loadList() {
  loading.value = true
  error.value = ''

  try {
    const { total, items } = await fetchRuleList(buildListParams())
    rows.value = items
    pagination.total = total
  } catch (requestError) {
    rows.value = []
    pagination.total = 0
    error.value = requestError?.message || '规则列表加载失败'
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  pagination.pageNum = 1
  notice.value = ''
  void loadList()
}

function handleReset() {
  filters.keyword = ''
  filters.status = ''
  pagination.pageNum = 1
  notice.value = ''
  void loadList()
}

function openCreateDialog() {
  resetForm()
  dialogVisible.value = true
}

function openEditDialog(row) {
  editingId.value = row.id
  form.name = row.name || ''
  form.startTime = row.startTime || '09:00:00'
  form.endTime = row.endTime || '18:00:00'
  form.lateThreshold = row.lateThreshold ?? 10
  form.earlyThreshold = row.earlyThreshold ?? 10
  form.repeatLimit = row.repeatLimit ?? 3
  form.status = row.status ?? 1
  dialogVisible.value = true
}

async function handleSubmit() {
  if (submitting.value) {
    return
  }

  if (!form.name.trim() || !form.startTime || !form.endTime) {
    error.value = '请完整填写规则名称和时间范围'
    return
  }

  submitting.value = true
  error.value = ''

  try {
    if (editingId.value) {
      await updateRule({
        id: editingId.value,
        ...form,
      })
      notice.value = '规则更新成功'
    } else {
      await addRule(form)
      notice.value = '规则创建成功'
    }

    dialogVisible.value = false
    await loadList()
  } catch (requestError) {
    error.value = requestError?.message || '规则保存失败'
  } finally {
    submitting.value = false
  }
}

async function handleToggleStatus(row) {
  error.value = ''
  notice.value = ''

  try {
    await updateRuleStatus({
      id: row.id,
      status: row.status === 1 ? 0 : 1,
    })
    notice.value = `规则“${row.name}”状态已更新`
    await loadList()
  } catch (requestError) {
    error.value = requestError?.message || '规则状态更新失败'
  }
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
.panel-card__actions,
.panel-card__dialog-head,
.panel-card__dialog-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.panel-card__header {
  margin-bottom: 20px;
}

.panel-card__header h2 {
  margin: 0;
  font-size: 22px;
  color: #0f172a;
}

.panel-card__header p,
.panel-card__dialog-head p {
  margin: 8px 0 0;
  color: #64748b;
  line-height: 1.6;
}

.panel-card__filters {
  align-items: end;
  flex-wrap: wrap;
  margin-bottom: 16px;
}

.panel-card__filters label,
.panel-card__dialog-form label {
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

.panel-card__feedback--success {
  background: rgba(34, 197, 94, 0.12);
  color: #166534;
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

.panel-card__status {
  display: inline-flex;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
}

.panel-card__status.is-active {
  background: rgba(34, 197, 94, 0.12);
  color: #166534;
}

.panel-card__status.is-inactive {
  background: rgba(148, 163, 184, 0.18);
  color: #475569;
}

.panel-card__actions {
  flex-wrap: wrap;
}

.panel-card__footer {
  margin-top: 16px;
}

.panel-card__modal {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(15, 23, 42, 0.42);
}

.panel-card__dialog {
  width: min(720px, 100%);
  padding: 24px;
  border-radius: 24px;
  background: #ffffff;
  box-shadow: 0 24px 80px rgba(15, 23, 42, 0.18);
}

.panel-card__dialog-form {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  margin-top: 20px;
}

.panel-card__full-width {
  grid-column: 1 / -1;
}

.panel-card__icon-btn {
  background: rgba(148, 163, 184, 0.16) !important;
}

@media (max-width: 960px) {
  .panel-card__header,
  .panel-card__footer,
  .panel-card__dialog-head {
    flex-direction: column;
    align-items: flex-start;
  }

  .panel-card__dialog-form {
    grid-template-columns: 1fr;
  }
}
</style>
