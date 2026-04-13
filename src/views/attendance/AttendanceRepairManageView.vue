<script setup>
import { ElMessage, ElMessageBox } from 'element-plus'
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'

import ConsoleHero from '../../components/console/ConsoleHero.vue'
import { getAttendanceRepairListRequest, reviewAttendanceRepairRequest } from '../../api/attendance'
import { fetchDepartmentList } from '../../api/department'
import { formatDateTimeDisplay } from '../../utils/date-time'

const STATUS_LABELS = {
  PENDING: '待处理',
  APPROVED: '已通过',
  REJECTED: '已驳回',
}

const CHECK_TYPE_LABELS = {
  IN: '上班打卡',
  OUT: '下班打卡',
}

const query = reactive({
  pageNum: 1,
  pageSize: 20,
  keyword: '',
  deptId: '',
  checkType: '',
  status: 'PENDING',
  startDate: '',
  endDate: '',
})

const records = ref([])
const total = ref(0)
const departmentOptions = ref([])
const listLoading = ref(false)
const listError = ref('')
const reviewingId = ref('')
const highlightedRecordId = ref('')
let highlightTimer = null

const heroCards = computed(() => {
  const pending = records.value.filter((item) => item.status === 'PENDING').length
  const approved = records.value.filter((item) => item.status === 'APPROVED').length
  const rejected = records.value.filter((item) => item.status === 'REJECTED').length

  return [
    {
      key: 'total',
      label: '当前页申请数',
      value: `${records.value.length} 条`,
    },
    {
      key: 'pending',
      label: '待处理',
      value: `${pending} 条`,
    },
    {
      key: 'done',
      label: '已处理',
      value: `${approved + rejected} 条`,
    },
  ]
})

const totalPages = computed(() => {
  const size = Number(query.pageSize || 0)
  if (!size) {
    return 1
  }
  return Math.max(1, Math.ceil(Number(total.value || 0) / size))
})

function formatDateTime(value) {
  return formatDateTimeDisplay(value, '--')
}

function formatStatus(value) {
  return STATUS_LABELS[value] || '待处理'
}

function formatCheckType(value) {
  return CHECK_TYPE_LABELS[value] || '上班打卡'
}

function unwrapBusinessData(response, fallbackMessage) {
  if (!response || typeof response !== 'object' || response.code !== 200) {
    throw new Error(response?.message || fallbackMessage)
  }
  return response.data
}

function normalizeDeptId(value) {
  const text = String(value || '').trim()
  if (!text) {
    return ''
  }
  const parsed = Number(text)
  return Number.isFinite(parsed) ? parsed : ''
}

async function loadDepartmentOptions() {
  try {
    const payload = await fetchDepartmentList({})
    departmentOptions.value = Array.isArray(payload?.items) ? payload.items : []
  } catch {
    departmentOptions.value = []
  }
}

async function loadRepairList() {
  listLoading.value = true
  listError.value = ''

  try {
    const data = unwrapBusinessData(
      await getAttendanceRepairListRequest({
        pageNum: query.pageNum,
        pageSize: query.pageSize,
        keyword: query.keyword.trim(),
        deptId: normalizeDeptId(query.deptId),
        checkType: query.checkType,
        status: query.status,
        startDate: query.startDate,
        endDate: query.endDate,
      }),
      '补卡申请列表加载失败',
    )
    records.value = Array.isArray(data?.records) ? data.records : []
    total.value = Number(data?.total || 0)
  } catch (error) {
    records.value = []
    total.value = 0
    listError.value = error?.message || '补卡申请列表加载失败'
  } finally {
    listLoading.value = false
  }
}

function handleSearch() {
  query.pageNum = 1
  void loadRepairList()
}

function handleReset() {
  query.pageNum = 1
  query.pageSize = 20
  query.keyword = ''
  query.deptId = ''
  query.checkType = ''
  query.status = 'PENDING'
  query.startDate = ''
  query.endDate = ''
  void loadRepairList()
}

function changePage(nextPage) {
  if (nextPage < 1 || nextPage > totalPages.value || nextPage === query.pageNum) {
    return
  }
  query.pageNum = nextPage
  void loadRepairList()
}

function highlightReviewedRow(recordId) {
  highlightedRecordId.value = String(recordId || '')
  if (typeof window === 'undefined') {
    return
  }
  if (highlightTimer) {
    window.clearTimeout(highlightTimer)
    highlightTimer = null
  }
  highlightTimer = window.setTimeout(() => {
    highlightedRecordId.value = ''
    highlightTimer = null
  }, 3600)
}

async function approveRepair(item) {
  if (!item?.id || reviewingId.value) {
    return
  }

  try {
    await ElMessageBox.confirm(
      `确认通过补卡申请 #${item.id} 吗？通过后会生成一条补卡记录。`,
      '通过补卡申请',
      {
        confirmButtonText: '确认通过',
        cancelButtonText: '取消',
        type: 'warning',
      },
    )
  } catch {
    return
  }

  reviewingId.value = String(item.id)
  try {
    unwrapBusinessData(
      await reviewAttendanceRepairRequest(item.id, {
        status: 'APPROVED',
        reviewComment: '',
      }),
      '补卡申请处理失败',
    )
    ElMessage.success('补卡申请已通过')
    await loadRepairList()
    highlightReviewedRow(item.id)
  } catch (error) {
    ElMessage.error(error?.message || '补卡申请处理失败')
  } finally {
    reviewingId.value = ''
  }
}

async function rejectRepair(item) {
  if (!item?.id || reviewingId.value) {
    return
  }

  let promptResult
  try {
    promptResult = await ElMessageBox.prompt('请填写驳回说明（员工会收到该说明）', '驳回补卡申请', {
      confirmButtonText: '确认驳回',
      cancelButtonText: '取消',
      inputPlaceholder: '请输入驳回原因',
      inputPattern: /\S+/,
      inputErrorMessage: '驳回说明不能为空',
    })
  } catch {
    return
  }

  const reviewComment = String(promptResult?.value || '').trim()
  if (!reviewComment) {
    return
  }

  reviewingId.value = String(item.id)
  try {
    unwrapBusinessData(
      await reviewAttendanceRepairRequest(item.id, {
        status: 'REJECTED',
        reviewComment,
      }),
      '补卡申请处理失败',
    )
    ElMessage.success('补卡申请已驳回')
    await loadRepairList()
    highlightReviewedRow(item.id)
  } catch (error) {
    ElMessage.error(error?.message || '补卡申请处理失败')
  } finally {
    reviewingId.value = ''
  }
}

onMounted(() => {
  void loadDepartmentOptions()
  void loadRepairList()
})

onBeforeUnmount(() => {
  if (typeof window !== 'undefined' && highlightTimer) {
    window.clearTimeout(highlightTimer)
    highlightTimer = null
  }
})
</script>

<template>
  <section class="repair-manage-view">
    <ConsoleHero
      title="补卡审批"
      description="管理员在此统一处理员工补卡申请，审批结果会自动回告员工消息中心。"
      theme="indigo"
      :cards="heroCards"
    />

    <section class="repair-manage-card">
      <h2>筛选条件</h2>
      <div class="repair-manage-filters">
        <label>
          <span>员工姓名</span>
          <input v-model="query.keyword" type="text" placeholder="输入员工姓名搜索" />
        </label>

        <label>
          <span>部门</span>
          <select v-model="query.deptId">
            <option value="">全部部门</option>
            <option v-for="department in departmentOptions" :key="department.id" :value="String(department.id)">
              {{ department.name }}
            </option>
          </select>
        </label>

        <label>
          <span>打卡类型</span>
          <select v-model="query.checkType">
            <option value="">全部</option>
            <option value="IN">上班打卡</option>
            <option value="OUT">下班打卡</option>
          </select>
        </label>

        <label>
          <span>申请状态</span>
          <select v-model="query.status">
            <option value="">全部</option>
            <option value="PENDING">待处理</option>
            <option value="APPROVED">已通过</option>
            <option value="REJECTED">已驳回</option>
          </select>
        </label>

        <label>
          <span>开始日期</span>
          <input v-model="query.startDate" :data-empty="String(!query.startDate)" type="date" />
        </label>

        <label>
          <span>结束日期</span>
          <input v-model="query.endDate" :data-empty="String(!query.endDate)" type="date" />
        </label>
      </div>

      <div class="repair-manage-actions">
        <button type="button" @click="handleReset">重置</button>
        <button type="button" class="repair-manage-actions__primary" @click="handleSearch">查询</button>
      </div>
    </section>

    <section class="repair-manage-card">
      <div class="repair-manage-list-head">
        <h2>补卡申请列表</h2>
        <span>共 {{ total }} 条</span>
      </div>

      <p v-if="listError" class="repair-manage-feedback repair-manage-feedback--error">{{ listError }}</p>
      <p v-else-if="listLoading" class="repair-manage-feedback">补卡申请加载中...</p>

      <div v-else class="repair-manage-table-wrap">
        <table class="repair-manage-table">
          <thead>
            <tr>
              <th>申请ID</th>
              <th>员工</th>
              <th>部门</th>
              <th>打卡类型</th>
              <th>补卡时间</th>
              <th>补卡说明</th>
              <th>申请状态</th>
              <th>申请时间</th>
              <th>关联记录</th>
              <th>操作</th>
            </tr>
          </thead>

          <tbody>
            <tr v-if="!records.length">
              <td colspan="10">暂无补卡申请</td>
            </tr>

            <tr v-for="item in records" :key="item.id" :class="{ 'repair-manage-table__row--highlight': highlightedRecordId === String(item.id) }">
              <td>{{ item.id }}</td>
              <td>{{ item.realName || '--' }}</td>
              <td>{{ item.deptName || '--' }}</td>
              <td>{{ formatCheckType(item.checkType) }}</td>
              <td>{{ formatDateTime(item.checkTime) }}</td>
              <td class="repair-manage-table__reason">{{ item.repairReason || '--' }}</td>
              <td>
                <span :class="['repair-manage-status', `repair-manage-status--${String(item.status || '').toLowerCase()}`]">
                  {{ formatStatus(item.status) }}
                </span>
              </td>
              <td>{{ formatDateTime(item.createTime) }}</td>
              <td>{{ item.recordId || '--' }}</td>
              <td>
                <div v-if="item.status === 'PENDING'" class="repair-manage-table__actions">
                  <button type="button" :disabled="reviewingId === String(item.id)" class="repair-manage-table__approve" @click="approveRepair(item)">
                    通过
                  </button>
                  <button type="button" :disabled="reviewingId === String(item.id)" class="repair-manage-table__reject" @click="rejectRepair(item)">
                    驳回
                  </button>
                </div>
                <span v-else>--</span>
              </td>
            </tr>
          </tbody>
        </table>

        <div class="repair-manage-pagination">
          <button type="button" :disabled="query.pageNum <= 1" @click="changePage(query.pageNum - 1)">上一页</button>
          <span>第 {{ query.pageNum }} / {{ totalPages }} 页</span>
          <button type="button" :disabled="query.pageNum >= totalPages" @click="changePage(query.pageNum + 1)">下一页</button>
        </div>
      </div>
    </section>
  </section>
</template>

<style scoped>
.repair-manage-view {
  display: grid;
  gap: 20px;
}

.repair-manage-card {
  padding: 20px;
  border-radius: 22px;
  background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
  box-shadow: 0 18px 50px rgba(15, 23, 42, 0.08);
}

.repair-manage-card h2 {
  margin: 0;
  font-size: 20px;
  color: #0f172a;
}

.repair-manage-filters {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
  margin-top: 14px;
}

.repair-manage-filters label {
  display: grid;
  gap: 6px;
}

.repair-manage-filters span {
  font-size: 13px;
  color: #334155;
}

.repair-manage-filters input,
.repair-manage-filters select,
.repair-manage-actions button,
.repair-manage-pagination button,
.repair-manage-table__actions button {
  font: inherit;
}

.repair-manage-filters input,
.repair-manage-filters select {
  min-height: 40px;
  padding: 8px 12px;
  border: 1px solid rgba(148, 163, 184, 0.34);
  border-radius: 12px;
  background: #ffffff;
}

.repair-manage-actions {
  margin-top: 14px;
  display: flex;
  gap: 10px;
}

.repair-manage-actions button,
.repair-manage-pagination button,
.repair-manage-table__actions button {
  min-height: 38px;
  padding: 0 14px;
  border: 1px solid rgba(148, 163, 184, 0.34);
  border-radius: 10px;
  background: #ffffff;
  color: #334155;
  cursor: pointer;
}

.repair-manage-actions__primary,
.repair-manage-table__approve {
  border-color: transparent !important;
  background: linear-gradient(135deg, #245391 0%, #2f69b2 100%) !important;
  color: #ffffff !important;
}

.repair-manage-table__reject {
  border-color: rgba(239, 68, 68, 0.42) !important;
  color: #b91c1c !important;
  background: rgba(254, 226, 226, 0.4) !important;
}

.repair-manage-list-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.repair-manage-list-head span {
  color: #64748b;
  font-size: 13px;
}

.repair-manage-feedback {
  margin: 14px 0 0;
  color: #64748b;
}

.repair-manage-feedback--error {
  color: #b91c1c;
}

.repair-manage-table-wrap {
  margin-top: 14px;
  display: grid;
  gap: 12px;
}

.repair-manage-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.repair-manage-table th,
.repair-manage-table td {
  padding: 10px 8px;
  border-bottom: 1px solid rgba(226, 232, 240, 0.86);
  text-align: left;
  vertical-align: top;
}

.repair-manage-table th {
  color: #475569;
  font-weight: 600;
}

.repair-manage-table__row--highlight {
  animation: repair-manage-row-highlight 3.2s ease;
}

.repair-manage-table__reason {
  max-width: 240px;
  color: #334155;
  line-height: 1.5;
}

.repair-manage-status {
  display: inline-flex;
  align-items: center;
  min-height: 26px;
  padding: 0 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
}

.repair-manage-status--pending {
  color: #92400e;
  background: rgba(251, 191, 36, 0.2);
}

.repair-manage-status--approved {
  color: #166534;
  background: rgba(34, 197, 94, 0.18);
}

.repair-manage-status--rejected {
  color: #b91c1c;
  background: rgba(248, 113, 113, 0.16);
}

.repair-manage-table__actions {
  display: flex;
  gap: 8px;
}

.repair-manage-pagination {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 10px;
  color: #475569;
}

@media (max-width: 960px) {
  .repair-manage-table {
    min-width: 980px;
  }

  .repair-manage-card {
    overflow-x: auto;
  }
}

@keyframes repair-manage-row-highlight {
  0% {
    background: rgba(191, 219, 254, 0.72);
  }

  100% {
    background: transparent;
  }
}
</style>
