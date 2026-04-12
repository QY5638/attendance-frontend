<template>
  <section class="panel-card">
    <header class="panel-card__header">
      <div>
        <h2>人脸申请</h2>
        <p>处理员工在已有旧人脸档案时发起的重录申请。</p>
      </div>
    </header>

    <section class="panel-card__hero-strip panel-card__hero-strip--single">
      <article>
        <span>审批目标</span>
        <strong>员工重录申请</strong>
      </article>
    </section>

    <form class="panel-card__filters" @submit.prevent="handleSearch">
      <label>
        <span>状态</span>
        <select v-model="filters.status">
          <option value="">全部状态</option>
          <option value="PENDING">待审批</option>
          <option value="APPROVED">已通过</option>
          <option value="REJECTED">已驳回</option>
          <option value="USED">已使用</option>
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
            <th>申请人</th>
            <th>部门</th>
            <th>申请说明</th>
            <th>状态</th>
            <th>申请时间</th>
            <th>审批备注</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="7">加载中...</td>
          </tr>
          <tr v-else-if="!rows.length">
            <td colspan="7">暂无人脸重录申请</td>
          </tr>
          <tr v-for="row in rows" :key="row.id">
            <td>{{ row.userName || '-' }}</td>
            <td>{{ row.departmentName || '-' }}</td>
            <td>{{ row.reason || '-' }}</td>
            <td>
              <span :class="['panel-card__status', getStatusClass(row.status)]">
                {{ formatStatus(row.status) }}
              </span>
            </td>
            <td>{{ formatDateTime(row.createTime) }}</td>
            <td>{{ row.reviewComment || '-' }}</td>
            <td>
              <button v-if="row.status === 'PENDING'" type="button" @click="openReviewDialog(row)">审批</button>
              <span v-else>{{ row.reviewUserName || '-' }}</span>
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
            <strong>审批人脸重录申请</strong>
            <p>审批通过后，员工可重新进入人脸采集页面提交录入。</p>
          </div>
          <button type="button" class="panel-card__icon-btn" @click="dialogVisible = false">关闭</button>
        </div>

        <form class="panel-card__dialog-form" @submit.prevent="handleSubmit">
          <label>
            <span>申请人</span>
            <input :value="form.userName" type="text" disabled />
          </label>
          <label>
            <span>部门</span>
            <input :value="form.departmentName" type="text" disabled />
          </label>
          <label class="panel-card__full-width">
            <span>申请说明</span>
            <textarea :value="form.reason" rows="3" disabled></textarea>
          </label>
          <label>
            <span>审批结果</span>
            <select v-model="form.status">
              <option value="APPROVED">通过</option>
              <option value="REJECTED">驳回</option>
            </select>
          </label>
          <label class="panel-card__full-width">
            <span>审批备注</span>
            <textarea v-model="form.reviewComment" rows="3" placeholder="可选填写审批意见"></textarea>
          </label>
          <div class="panel-card__dialog-actions panel-card__full-width">
            <button type="button" @click="dialogVisible = false">取消</button>
            <button type="submit" class="panel-card__primary" :disabled="submitting">
              {{ submitting ? '提交中...' : '提交审批' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'

import { fetchFaceRegisterApprovalList, reviewFaceRegisterApproval } from '../../../api/system'
import { formatDateTimeDisplay } from '../../../utils/date-time'

const loading = ref(false)
const submitting = ref(false)
const dialogVisible = ref(false)
const rows = ref([])
const error = ref('')
const notice = ref('')

const filters = reactive({
  status: 'PENDING',
})

const pagination = reactive({
  pageNum: 1,
  pageSize: 10,
  total: 0,
})

const form = reactive({
  id: null,
  userName: '',
  departmentName: '',
  reason: '',
  status: 'APPROVED',
  reviewComment: '',
})

const totalPages = computed(() => Math.max(1, Math.ceil(pagination.total / pagination.pageSize) || 1))

function buildListParams() {
  const params = {
    pageNum: pagination.pageNum,
    pageSize: pagination.pageSize,
  }

  if (filters.status) {
    params.status = filters.status
  }

  return params
}

async function loadList() {
  loading.value = true
  error.value = ''

  try {
    const { total, items } = await fetchFaceRegisterApprovalList(buildListParams())
    rows.value = items
    pagination.total = total
  } catch (requestError) {
    rows.value = []
    pagination.total = 0
    error.value = requestError?.message || '人脸申请列表加载失败'
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
  filters.status = 'PENDING'
  pagination.pageNum = 1
  notice.value = ''
  void loadList()
}

function openReviewDialog(row) {
  form.id = row.id
  form.userName = row.userName || '-'
  form.departmentName = row.departmentName || '-'
  form.reason = row.reason || ''
  form.status = 'APPROVED'
  form.reviewComment = ''
  dialogVisible.value = true
}

function formatStatus(status) {
  const normalized = String(status || '').toUpperCase()
  if (normalized === 'PENDING') {
    return '待审批'
  }
  if (normalized === 'APPROVED') {
    return '已通过'
  }
  if (normalized === 'REJECTED') {
    return '已驳回'
  }
  if (normalized === 'USED') {
    return '已使用'
  }
  return '未知状态'
}

function getStatusClass(status) {
  const normalized = String(status || '').toUpperCase()
  if (normalized === 'PENDING') {
    return 'is-pending'
  }
  if (normalized === 'APPROVED') {
    return 'is-active'
  }
  if (normalized === 'REJECTED') {
    return 'is-rejected'
  }
  return 'is-inactive'
}

function formatDateTime(value) {
  return formatDateTimeDisplay(value, '-')
}

async function handleSubmit() {
  if (submitting.value || !form.id) {
    return
  }

  submitting.value = true
  error.value = ''

  try {
    await reviewFaceRegisterApproval({
      id: form.id,
      status: form.status,
      reviewComment: form.reviewComment,
    })
    dialogVisible.value = false
    notice.value = form.status === 'APPROVED' ? '人脸重录申请已审批通过' : '人脸重录申请已驳回'
    ElMessage.success(notice.value)
    await loadList()
  } catch (requestError) {
    error.value = requestError?.message || '人脸申请审批失败'
  } finally {
    submitting.value = false
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
  background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
  box-shadow: 0 18px 60px rgba(15, 23, 42, 0.08);
}

.panel-card__hero-strip {
  display: grid;
  gap: 12px;
  margin-bottom: 18px;
}

.panel-card__hero-strip article {
  padding: 16px 18px;
  border-radius: 18px;
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(79, 70, 229, 0.08));
}

.panel-card__hero-strip span {
  display: block;
  font-size: 12px;
  color: #6366f1;
}

.panel-card__hero-strip strong {
  display: block;
  margin-top: 8px;
  color: #0f172a;
}

.panel-card__hero-strip--single {
  grid-template-columns: minmax(0, 320px);
}

.panel-card__filters,
.panel-card__dialog-form {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.panel-card__filters {
  margin-bottom: 18px;
}

.panel-card__filters label,
.panel-card__dialog-form label {
  display: grid;
  gap: 8px;
  color: #475569;
}

.panel-card__filters span,
.panel-card__dialog-form span {
  font-size: 13px;
}

.panel-card__filters input,
.panel-card__filters select,
.panel-card__dialog-form input,
.panel-card__dialog-form select,
.panel-card__dialog-form textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid rgba(148, 163, 184, 0.32);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.92);
  color: #0f172a;
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
  padding: 12px 10px;
  border-bottom: 1px solid rgba(226, 232, 240, 0.9);
  text-align: left;
  vertical-align: top;
}

.panel-card__feedback {
  margin-bottom: 16px;
}

.panel-card__feedback--error {
  color: #dc2626;
}

.panel-card__feedback--success {
  color: #15803d;
}

.panel-card__status {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 12px;
}

.panel-card__status.is-pending {
  background: rgba(245, 158, 11, 0.14);
  color: #b45309;
}

.panel-card__status.is-active {
  background: rgba(34, 197, 94, 0.14);
  color: #15803d;
}

.panel-card__status.is-rejected {
  background: rgba(239, 68, 68, 0.14);
  color: #b91c1c;
}

.panel-card__status.is-inactive {
  background: rgba(148, 163, 184, 0.16);
  color: #475569;
}

.panel-card__footer,
.panel-card__header,
.panel-card__dialog-head,
.panel-card__actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.panel-card__header {
  margin-bottom: 16px;
}

.panel-card__header h2,
.panel-card__dialog-head strong {
  margin: 0;
  color: #0f172a;
}

.panel-card__header p,
.panel-card__dialog-head p {
  margin: 6px 0 0;
  color: #64748b;
}

.panel-card__footer {
  margin-top: 18px;
}

.panel-card__modal {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(15, 23, 42, 0.42);
  z-index: 80;
}

.panel-card__dialog {
  width: min(720px, 100%);
  padding: 24px;
  border-radius: 24px;
  background: #ffffff;
  box-shadow: 0 24px 80px rgba(15, 23, 42, 0.18);
}

.panel-card__dialog-form {
  margin-top: 20px;
}

.panel-card__dialog-actions {
  justify-content: flex-end;
}

.panel-card__full-width {
  grid-column: 1 / -1;
}

.panel-card__icon-btn,
.panel-card__actions button,
.panel-card__table button {
  padding: 9px 14px;
  border: none;
  border-radius: 12px;
  background: rgba(148, 163, 184, 0.16);
  color: #334155;
  cursor: pointer;
}

.panel-card__primary {
  background: linear-gradient(135deg, #4f46e5 0%, #4338ca 100%) !important;
  color: #ffffff !important;
}

@media (max-width: 768px) {
  .panel-card__filters,
  .panel-card__dialog-form {
    grid-template-columns: 1fr;
  }

  .panel-card__modal {
    padding: 16px;
  }

  .panel-card__header,
  .panel-card__footer,
  .panel-card__dialog-head,
  .panel-card__actions {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
