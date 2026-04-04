<script setup>
import { computed, onMounted, reactive, ref } from 'vue'

import {
  getAttendanceDeviceOptionsRequest,
  getMyAttendanceRecordRequest,
  submitAttendanceCheckinRequest,
  submitAttendanceRepairRequest,
  verifyFaceRequest,
} from '../../api/attendance'

const activeTab = ref('checkin')
const deviceOptions = ref([])
const deviceOptionsError = ref('')
const checkinError = ref('')
const recordList = ref([])
const recordTotal = ref(0)
const recordError = ref('')
const recordsLoading = ref(false)
const checkinSubmitting = ref(false)
const repairSubmitting = ref(false)
const repairDialogVisible = ref(false)
const repairError = ref('')
const faceVerifyLoading = ref(false)
const faceVerifyResult = ref('')
let latestRecordRequestId = 0

const checkinForm = reactive({
  checkType: 'IN',
  deviceId: '',
  imageData: '',
})

const recordQuery = reactive({
  pageNum: 1,
  pageSize: 10,
  startDate: '',
  endDate: '',
})

const repairForm = reactive({
  checkType: '',
  checkTime: '',
  repairReason: '',
})

function readWrappedData(response) {
  if (!response || typeof response !== 'object') {
    throw new Error('请求失败，请稍后重试')
  }

  if (response.code !== 200) {
    throw new Error(response.message || '请求失败，请稍后重试')
  }

  return response.data
}

function readDeviceOptions(response) {
  const payload = readWrappedData(response)

  if (!Array.isArray(payload)) {
    throw new Error('设备选项加载失败，请稍后重试')
  }

  if (payload.length === 0) {
    throw new Error('暂无可用考勤设备，自助打卡暂不可用')
  }

  return payload.map((item) => ({
    id: item.deviceId,
    name: item.name,
    location: item.location,
  }))
}

function readRecordPage(response) {
  const payload = readWrappedData(response)

  if (!payload || !Array.isArray(payload.records) || typeof payload.total !== 'number') {
    throw new Error('记录加载失败，请稍后重试')
  }

  return {
    records: payload.records,
    total: payload.total,
  }
}

function normalizeFaceVerifyResult(response) {
  const payload = readWrappedData(response)

  if (payload?.matched === true) {
    return '人脸预检通过'
  }

  if (payload?.matched === false) {
    return '人脸预检未通过'
  }

  return '人脸预检已完成'
}

const selectedDeviceLocation = computed(() => {
  const selected = deviceOptions.value.find((item) => item.id === checkinForm.deviceId)

  return selected?.location || ''
})

const isDeviceSelectDisabled = computed(() => Boolean(deviceOptionsError.value))

const isCheckinDisabled = computed(() => {
  return Boolean(
    deviceOptionsError.value ||
      checkinSubmitting.value ||
      !checkinForm.deviceId ||
      !checkinForm.imageData,
  )
})

const isRepairSubmitDisabled = computed(() => {
  return Boolean(repairSubmitting.value || !repairForm.repairReason.trim())
})

const totalPages = computed(() => {
  return Math.max(1, Math.ceil(recordTotal.value / recordQuery.pageSize) || 1)
})

function buildRecordQuery() {
  return {
    pageNum: recordQuery.pageNum,
    pageSize: recordQuery.pageSize,
    startDate: recordQuery.startDate,
    endDate: recordQuery.endDate,
  }
}

async function loadDeviceOptions() {
  deviceOptionsError.value = ''

  try {
    deviceOptions.value = readDeviceOptions(await getAttendanceDeviceOptionsRequest())
  } catch (error) {
    deviceOptions.value = []
    checkinForm.deviceId = ''
    deviceOptionsError.value = error?.message || '设备选项加载失败，请稍后重试'
  }
}

async function loadRecords() {
  const requestId = ++latestRecordRequestId

  recordsLoading.value = true
  recordError.value = ''

  try {
    const response = await getMyAttendanceRecordRequest(buildRecordQuery())
    const normalized = readRecordPage(response)

    if (requestId !== latestRecordRequestId) {
      return
    }

    recordList.value = normalized.records
    recordTotal.value = normalized.total
  } catch (error) {
    if (requestId !== latestRecordRequestId) {
      return
    }

    recordList.value = []
    recordTotal.value = 0
    recordError.value = error?.message || '记录加载失败，请稍后重试'
  } finally {
    if (requestId === latestRecordRequestId) {
      recordsLoading.value = false
    }
  }
}

function handleSearchRecords() {
  recordQuery.pageNum = 1
  return loadRecords()
}

function changePage(nextPageNum) {
  const pageNum = Math.min(Math.max(1, nextPageNum), totalPages.value)

  if (pageNum === recordQuery.pageNum) {
    return Promise.resolve()
  }

  recordQuery.pageNum = pageNum

  return loadRecords()
}

function openRepairDialog(record) {
  repairForm.checkType = record?.checkType || ''
  repairForm.checkTime = record?.checkTime || ''
  repairForm.repairReason = ''
  repairError.value = ''
  repairDialogVisible.value = true
}

async function handleVerifyFace() {
  if (!checkinForm.imageData || faceVerifyLoading.value) {
    return
  }

  faceVerifyLoading.value = true

  try {
    const response = await verifyFaceRequest({
      imageData: checkinForm.imageData,
    })

    faceVerifyResult.value = normalizeFaceVerifyResult(response)
  } catch (error) {
    faceVerifyResult.value = error?.message || '人脸预检失败'
  } finally {
    faceVerifyLoading.value = false
  }
}

async function handleSubmitCheckin() {
  if (isCheckinDisabled.value) {
    return
  }

  checkinSubmitting.value = true
  checkinError.value = ''

  try {
    readWrappedData(
      await submitAttendanceCheckinRequest({
        checkType: checkinForm.checkType,
        deviceId: checkinForm.deviceId,
        imageData: checkinForm.imageData,
      }),
    )
    await loadRecords()
    if (recordError.value) {
      checkinError.value = recordError.value
    }
  } catch (error) {
    checkinError.value = error?.message || '打卡失败，请稍后重试'
  } finally {
    checkinSubmitting.value = false
  }
}

async function handleSubmitRepair() {
  if (isRepairSubmitDisabled.value) {
    return
  }

  repairSubmitting.value = true
  repairError.value = ''

  try {
    readWrappedData(
      await submitAttendanceRepairRequest({
        checkType: repairForm.checkType,
        checkTime: repairForm.checkTime,
        repairReason: repairForm.repairReason,
      }),
    )
    repairDialogVisible.value = false
    await loadRecords()
  } catch (error) {
    repairError.value = error?.message || '补卡失败，请稍后重试'
  } finally {
    repairSubmitting.value = false
  }
}

onMounted(() => {
  void Promise.allSettled([loadDeviceOptions(), loadRecords()])
})
</script>

<template>
  <section class="attendance-view">
    <header class="attendance-view__header">
      <h1>考勤自助</h1>
      <p>同页完成打卡与个人记录查询。</p>
    </header>

    <div class="attendance-tabs" role="tablist" aria-label="考勤功能切换">
      <button
        data-testid="attendance-tab-checkin"
        type="button"
        role="tab"
        :aria-pressed="String(activeTab === 'checkin')"
        @click="activeTab = 'checkin'"
      >
        打卡
      </button>
      <button
        data-testid="attendance-tab-records"
        type="button"
        role="tab"
        :aria-pressed="String(activeTab === 'records')"
        @click="activeTab = 'records'"
      >
        记录
      </button>
    </div>

    <section v-if="activeTab === 'checkin'" data-testid="attendance-checkin-panel" class="attendance-panel">
      <div v-if="deviceOptionsError" data-testid="attendance-device-blocking-error" class="attendance-error">
        {{ deviceOptionsError }}
      </div>

      <label class="attendance-field">
        <span>打卡类型</span>
        <select v-model="checkinForm.checkType" data-testid="attendance-check-type-select">
          <option value="IN">上班打卡</option>
          <option value="OUT">下班打卡</option>
        </select>
      </label>

      <label class="attendance-field">
        <span>考勤设备</span>
        <select v-model="checkinForm.deviceId" data-testid="attendance-device-select" :disabled="isDeviceSelectDisabled">
          <option value="">请选择设备</option>
          <option v-for="item in deviceOptions" :key="item.id" :value="item.id">
            {{ item.name || item.id }}
          </option>
        </select>
      </label>

      <p v-if="selectedDeviceLocation" data-testid="attendance-device-location" class="attendance-hint">
        设备位置：{{ selectedDeviceLocation }}
      </p>

      <label class="attendance-field">
        <span>人脸图像</span>
        <textarea
          v-model="checkinForm.imageData"
          data-testid="attendance-image-input"
          rows="4"
          placeholder="请输入 base64 图像数据"
        />
      </label>

      <button
        data-testid="attendance-face-verify-button"
        type="button"
        :disabled="faceVerifyLoading || !checkinForm.imageData"
        @click="handleVerifyFace"
      >
        辅助预检
      </button>

      <p v-if="faceVerifyResult" data-testid="attendance-face-verify-result" class="attendance-hint">
        {{ faceVerifyResult }}
      </p>

      <div v-if="checkinError" data-testid="attendance-checkin-error" class="attendance-error">
        {{ checkinError }}
      </div>

      <button
        data-testid="attendance-checkin-submit"
        type="button"
        :disabled="isCheckinDisabled"
        @click="handleSubmitCheckin"
      >
        提交打卡
      </button>
    </section>

    <section v-else data-testid="attendance-record-panel" class="attendance-panel">
      <div class="attendance-record-filters">
        <label class="attendance-field">
          <span>开始日期</span>
          <input v-model="recordQuery.startDate" data-testid="attendance-start-date-input" type="date" />
        </label>

        <label class="attendance-field">
          <span>结束日期</span>
          <input v-model="recordQuery.endDate" data-testid="attendance-end-date-input" type="date" />
        </label>

        <label class="attendance-field">
          <span>每页条数</span>
          <select v-model.number="recordQuery.pageSize" data-testid="attendance-page-size-select">
            <option :value="10">10</option>
            <option :value="20">20</option>
            <option :value="50">50</option>
          </select>
        </label>

        <button data-testid="attendance-record-search" type="button" @click="handleSearchRecords">
          查询记录
        </button>
      </div>

      <div v-if="recordError" data-testid="attendance-record-error" class="attendance-error">
        {{ recordError }}
      </div>

      <p data-testid="attendance-record-total">共 {{ recordTotal }} 条</p>

      <div class="attendance-pagination">
        <button
          data-testid="attendance-page-prev"
          type="button"
          :disabled="recordQuery.pageNum <= 1"
          @click="changePage(recordQuery.pageNum - 1)"
        >
          上一页
        </button>
        <span data-testid="attendance-current-page">第 {{ recordQuery.pageNum }} 页</span>
        <button
          data-testid="attendance-page-next"
          type="button"
          :disabled="recordQuery.pageNum >= totalPages"
          @click="changePage(recordQuery.pageNum + 1)"
        >
          下一页
        </button>
      </div>

      <table class="attendance-record-table">
        <thead>
          <tr>
            <th>打卡类型</th>
            <th>时间</th>
            <th>状态</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="!recordError && !recordsLoading && recordList.length === 0">
            <td data-testid="attendance-record-empty" colspan="4">暂无记录</td>
          </tr>
          <tr v-for="record in recordList" :key="record.id">
            <td>{{ record.checkType }}</td>
            <td>{{ record.checkTime }}</td>
            <td>{{ record.status || '-' }}</td>
            <td>
              <button
                :data-testid="`attendance-repair-open-${record.id}`"
                type="button"
                @click="openRepairDialog(record)"
              >
                申请补卡
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </section>

    <div v-if="repairDialogVisible" data-testid="attendance-repair-dialog" class="attendance-repair-dialog">
      <p>补卡类型：{{ repairForm.checkType }}</p>
      <p>补卡时间：{{ repairForm.checkTime }}</p>
      <div v-if="repairError" data-testid="attendance-repair-error" class="attendance-error">
        {{ repairError }}
      </div>
      <label class="attendance-field">
        <span>补卡原因</span>
        <textarea v-model="repairForm.repairReason" data-testid="attendance-repair-reason-input" rows="3" />
      </label>
      <button
        data-testid="attendance-repair-submit"
        type="button"
        :disabled="isRepairSubmitDisabled"
        @click="handleSubmitRepair"
      >
        提交补卡
      </button>
    </div>
  </section>
</template>

<style scoped>
.attendance-view {
  display: grid;
  gap: 16px;
}

.attendance-view__header h1,
.attendance-view__header p {
  margin: 0;
}

.attendance-tabs {
  display: flex;
  gap: 8px;
}

.attendance-panel {
  display: grid;
  gap: 12px;
}

.attendance-field {
  display: grid;
  gap: 4px;
}

.attendance-record-filters {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
}

.attendance-pagination {
  display: flex;
  gap: 12px;
  align-items: center;
}

.attendance-record-table {
  width: 100%;
  border-collapse: collapse;
}

.attendance-record-table th,
.attendance-record-table td {
  padding: 8px;
  border: 1px solid #dcdfe6;
  text-align: left;
}

.attendance-error {
  padding: 12px;
  color: #c45656;
  background: #fef0f0;
  border: 1px solid #fbc4c4;
}

.attendance-hint {
  margin: 0;
  color: #606266;
}

.attendance-repair-dialog {
  display: grid;
  gap: 12px;
  padding: 16px;
  border: 1px solid #dcdfe6;
  background: #ffffff;
}
</style>
