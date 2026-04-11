<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'

import ConsoleHero from '../../components/console/ConsoleHero.vue'
import { useAuthStore } from '../../store/auth'
import {
  getAttendanceListRequest,
  getAttendanceDeviceOptionsRequest,
  getMyAttendanceRecordRequest,
  submitAttendanceCheckinRequest,
  submitAttendanceRepairRequest,
  verifyFaceRequest,
} from '../../api/attendance'
import { fetchDepartmentList } from '../../api/department'
import { loadAmapPlugins, loadAmapSdk } from '../../utils/amap'
import { formatDateTimeDisplay } from '../../utils/date-time'

const authStore = useAuthStore()
const isAdmin = computed(() => authStore.roleCode === 'ADMIN')

const activeTab = ref(isAdmin.value ? 'records' : 'checkin')
const deviceOptions = ref([])
const departmentOptions = ref([])
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
const currentLocationLoading = ref(false)
const currentLocationError = ref('')
const currentLocationSummary = ref('未获取当前位置')
const faceInputSource = ref('camera')
const faceCameraStarting = ref(false)
const faceCameraError = ref('')
const faceUploadError = ref('')
const faceVideoRef = ref(null)
const faceStreamRef = ref(null)
const deviceMapContainer = ref(null)
const deviceMapError = ref('')
let latestRecordRequestId = 0
let devicePreviewMap = null
let devicePreviewMarker = null

const checkinForm = reactive({
  checkType: 'IN',
  deviceId: '',
  clientLongitude: null,
  clientLatitude: null,
  imageData: '',
})

const recordQuery = reactive({
  pageNum: 1,
  pageSize: 10,
  userId: '',
  deptId: '',
  checkType: '',
  status: '',
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
    throw new Error('打卡地点加载失败，请稍后重试')
  }

  if (payload.length === 0) {
    throw new Error('暂无可用打卡地点，当前暂不可办理打卡')
  }

  return payload.map((item) => ({
    id: item.deviceId,
    name: item.name,
    location: item.location,
    longitude: item.longitude,
    latitude: item.latitude,
    radiusMeters: item.radiusMeters,
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

const selectedDevice = computed(() => deviceOptions.value.find((item) => item.id === checkinForm.deviceId) || null)

const hasLiveFaceCamera = computed(() => Boolean(faceStreamRef.value))

const selectedDeviceLocation = computed(() => selectedDevice.value?.location || '')

const selectedDeviceCoordinate = computed(() => {
  const coordinates = readCoordinatePair(selectedDevice.value)

  if (!coordinates) {
    return ''
  }

  return `${formatCoordinate(coordinates[0])}, ${formatCoordinate(coordinates[1])}`
})
const selectedDeviceRadius = computed(() => selectedDevice.value?.radiusMeters || 30)
const hasSelectedDeviceCoordinates = computed(() => Boolean(readCoordinatePair(selectedDevice.value)))

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

const heroCards = computed(() => {
  if (isAdmin.value) {
    return [
      {
        key: 'mode',
        label: '当前模式',
        value: '记录管理',
      },
      {
        key: 'scope',
        label: '查询范围',
        value: '全员记录',
      },
      {
        key: 'total',
        label: '当前结果',
        value: `${recordTotal.value} 条`,
      },
    ]
  }

  return [
    {
      key: 'tab',
      label: '当前功能',
      value: activeTab.value === 'checkin' ? '打卡办理' : '记录查询',
    },
    {
      key: 'location',
      label: '当前地点',
      value: selectedDevice.value ? (selectedDevice.value.location || selectedDevice.value.name || selectedDevice.value.id) : '未选择',
    },
    {
      key: 'computer',
      label: '当前电脑',
      value: buildComputerDeviceInfo(),
    },
  ]
})

const CHECK_TYPE_LABELS = {
  IN: '上班打卡',
  OUT: '下班打卡',
}

const RECORD_STATUS_LABELS = {
  NORMAL: '正常',
  EXCEPTION: '异常',
  REPAIRED: '已补卡',
  REPAIR_PENDING: '补卡处理中',
  ABSENT: '缺勤',
  LATE: '迟到',
  EARLY_LEAVE: '早退',
}

const EXCEPTION_TYPE_LABELS = {
  MULTI_LOCATION_CONFLICT: '多地点异常',
  PROXY_CHECKIN: '代打卡',
  LATE: '迟到',
  EARLY_LEAVE: '早退',
  ILLEGAL_TIME: '非规定时间打卡',
  REPEAT_CHECK: '重复打卡',
}

function detectBrowserName() {
  if (typeof navigator === 'undefined') {
    return '网页浏览器'
  }

  const userAgent = navigator.userAgent || ''
  if (userAgent.includes('Edg/')) {
    return 'Microsoft Edge'
  }
  if (userAgent.includes('Chrome/')) {
    return 'Google Chrome'
  }
  if (userAgent.includes('Firefox/')) {
    return 'Mozilla Firefox'
  }
  if (userAgent.includes('Safari/') && !userAgent.includes('Chrome/')) {
    return 'Safari'
  }
  return '网页浏览器'
}

function buildComputerDeviceInfo() {
  if (typeof navigator === 'undefined') {
    return '网页端电脑'
  }

  const platform = navigator.userAgentData?.platform || navigator.platform || '未知系统'
  const model = navigator.userAgentData?.model || ''
  const browser = detectBrowserName()
  const resolution = typeof window !== 'undefined' && window.screen?.width && window.screen?.height
    ? `${window.screen.width}x${window.screen.height}`
    : ''

  return [model || platform, browser, resolution].filter(Boolean).join(' · ')
}

async function resolveCurrentLocationLabel(longitude, latitude) {
  try {
    const AMap = await loadAmapPlugins(['AMap.Geocoder'])
    const geocoder = new AMap.Geocoder()
    return await new Promise((resolve, reject) => {
      geocoder.getAddress([longitude, latitude], (status, result) => {
        if (status !== 'complete' || !result?.regeocode) {
          reject(new Error('定位地址解析失败'))
          return
        }
        resolve(result.regeocode.formattedAddress || `${formatCoordinate(longitude)}, ${formatCoordinate(latitude)}`)
      })
    })
  } catch (error) {
    return `${formatCoordinate(longitude)}, ${formatCoordinate(latitude)}`
  }
}

async function ensureCurrentLocation() {
  if (checkinForm.clientLongitude !== null && checkinForm.clientLatitude !== null) {
    return
  }

  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    throw new Error('当前浏览器不支持定位，请更换浏览器或开启定位服务')
  }

  currentLocationLoading.value = true
  currentLocationError.value = ''

  try {
    const position = await new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      })
    })
    checkinForm.clientLongitude = Number(position.coords.longitude)
    checkinForm.clientLatitude = Number(position.coords.latitude)
    currentLocationSummary.value = await resolveCurrentLocationLabel(checkinForm.clientLongitude, checkinForm.clientLatitude)
  } catch (error) {
    throw new Error('未获取当前位置，请允许浏览器定位后重试')
  } finally {
    currentLocationLoading.value = false
  }
}

function buildRecordQuery() {
  if (isAdmin.value) {
    const normalizedUserId = Number(String(recordQuery.userId || '').trim())
    const normalizedDeptId = Number(recordQuery.deptId)

    return {
      pageNum: recordQuery.pageNum,
      pageSize: recordQuery.pageSize,
      userId: Number.isFinite(normalizedUserId) && normalizedUserId > 0 ? normalizedUserId : undefined,
      deptId: Number.isFinite(normalizedDeptId) && normalizedDeptId > 0 ? normalizedDeptId : undefined,
      checkType: recordQuery.checkType,
      status: recordQuery.status,
      startDate: recordQuery.startDate,
      endDate: recordQuery.endDate,
    }
  }

  return {
    pageNum: recordQuery.pageNum,
    pageSize: recordQuery.pageSize,
    startDate: recordQuery.startDate,
    endDate: recordQuery.endDate,
  }
}

function formatCoordinate(value) {
  if (value === null || value === undefined || value === '') {
    return ''
  }

  const numericValue = Number(value)
  if (!Number.isFinite(numericValue)) {
    return String(value)
  }

  return numericValue.toFixed(6).replace(/0+$/, '').replace(/\.$/, '')
}

function readCoordinatePair(device) {
  if (!device) {
    return null
  }

  if (device.longitude === '' || device.longitude === null || device.longitude === undefined) {
    return null
  }

  if (device.latitude === '' || device.latitude === null || device.latitude === undefined) {
    return null
  }

  const longitude = Number(device.longitude)
  const latitude = Number(device.latitude)
  if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) {
    return null
  }

  return [longitude, latitude]
}

function destroyDevicePreviewMap() {
  if (devicePreviewMap && typeof devicePreviewMap.destroy === 'function') {
    devicePreviewMap.destroy()
  }

  devicePreviewMap = null
  devicePreviewMarker = null
}

function clearFaceCheckinState() {
  checkinError.value = ''
  faceVerifyResult.value = ''
}

function stopFaceCamera() {
  if (!faceStreamRef.value) {
    return
  }

  faceStreamRef.value.getTracks().forEach((track) => track.stop())
  faceStreamRef.value = null

  if (faceVideoRef.value) {
    faceVideoRef.value.srcObject = null
  }
}

function switchFaceSource(nextSource) {
  if (faceInputSource.value === nextSource) {
    return
  }

  if (faceInputSource.value === 'camera') {
    stopFaceCamera()
  }

  faceInputSource.value = nextSource
  faceCameraError.value = ''
  faceUploadError.value = ''
}

async function startFaceCamera() {
  if (faceCameraStarting.value) {
    return
  }

  faceCameraStarting.value = true
  faceCameraError.value = ''

  try {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('unsupported')
    }

    stopFaceCamera()
    const stream = await navigator.mediaDevices.getUserMedia({ video: true })
    faceStreamRef.value = stream

    if (faceVideoRef.value) {
      faceVideoRef.value.srcObject = stream
    }
  } catch (error) {
    faceCameraError.value = '无法访问摄像头，请改用本地图片上传'
  } finally {
    faceCameraStarting.value = false
  }
}

function captureFaceFrame() {
  if (!faceVideoRef.value || !faceStreamRef.value) {
    return
  }

  const canvas = document.createElement('canvas')
  canvas.width = faceVideoRef.value.videoWidth || 640
  canvas.height = faceVideoRef.value.videoHeight || 480

  const context = canvas.getContext('2d')
  if (!context) {
    faceCameraError.value = '当前环境暂不支持拍照，请改用本地图片上传'
    return
  }

  context.drawImage(faceVideoRef.value, 0, 0, canvas.width, canvas.height)
  checkinForm.imageData = canvas.toDataURL('image/png')
  clearFaceCheckinState()
}

function handleFaceUploadChange(event) {
  faceUploadError.value = ''
  const [file] = event.target?.files || []

  if (!file) {
    return
  }

  if (!file.type.startsWith('image/')) {
    faceUploadError.value = '请选择图片文件'
    return
  }

  const reader = new FileReader()
  reader.onload = (loadEvent) => {
    checkinForm.imageData = loadEvent.target?.result || ''
    clearFaceCheckinState()
  }
  reader.readAsDataURL(file)
}

function resetFaceImage() {
  checkinForm.imageData = ''
  faceCameraError.value = ''
  faceUploadError.value = ''
  clearFaceCheckinState()
}

function resetCurrentLocation() {
  checkinForm.clientLongitude = null
  checkinForm.clientLatitude = null
  currentLocationSummary.value = '未获取当前位置'
  currentLocationError.value = ''
}

async function syncSelectedDeviceMap() {
  const coordinates = readCoordinatePair(selectedDevice.value)

  if (activeTab.value !== 'checkin' || !coordinates) {
    deviceMapError.value = ''
    destroyDevicePreviewMap()
    return
  }

  await nextTick()
  if (!deviceMapContainer.value) {
    return
  }

  try {
    deviceMapError.value = ''
    const AMap = await loadAmapSdk()
    if (!deviceMapContainer.value) {
      return
    }

    if (!devicePreviewMap) {
      devicePreviewMap = new AMap.Map(deviceMapContainer.value, {
        resizeEnable: true,
        zoom: 15,
        center: coordinates,
      })
      devicePreviewMarker = new AMap.Marker({
        map: devicePreviewMap,
        position: coordinates,
      })
    }

    devicePreviewMap.setCenter?.(coordinates)
    devicePreviewMarker?.setPosition?.(coordinates)
  } catch (error) {
    destroyDevicePreviewMap()
    deviceMapError.value = error?.message || '地点地图加载失败'
  }
}

async function loadDeviceOptions() {
  deviceOptionsError.value = ''

  try {
    deviceOptions.value = readDeviceOptions(await getAttendanceDeviceOptionsRequest())
  } catch (error) {
    deviceOptions.value = []
    checkinForm.deviceId = ''
    deviceOptionsError.value = error?.message || '打卡地点加载失败，请稍后重试'
  }
}

async function fetchAllDepartmentOptions(pageSize = 200) {
  const items = []
  let pageNum = 1
  let total = 0

  do {
    const result = await fetchDepartmentList({ pageNum, pageSize })
    const currentItems = Array.isArray(result.items) ? result.items : []

    total = Number(result.total || currentItems.length)
    items.push(...currentItems)
    pageNum += 1

    if (!currentItems.length) {
      break
    }
  } while (items.length < total)

  return items
}

async function loadDepartmentOptions() {
  try {
    departmentOptions.value = await fetchAllDepartmentOptions()
  } catch (error) {
    departmentOptions.value = []
  }
}

async function loadRecords() {
  const requestId = ++latestRecordRequestId

  recordsLoading.value = true
  recordError.value = ''

  try {
    const response = await (isAdmin.value
      ? getAttendanceListRequest(buildRecordQuery())
      : getMyAttendanceRecordRequest(buildRecordQuery()))
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

function handleResetRecords() {
  recordQuery.pageNum = 1
  recordQuery.pageSize = 10
  recordQuery.userId = ''
  recordQuery.deptId = ''
  recordQuery.checkType = ''
  recordQuery.status = ''
  recordQuery.startDate = ''
  recordQuery.endDate = ''
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

function formatExceptionType(exceptionType) {
  if (!exceptionType) {
    return '-'
  }

  return EXCEPTION_TYPE_LABELS[exceptionType] || '其他异常'
}

function formatCheckType(checkType) {
  return CHECK_TYPE_LABELS[checkType] || '其他类型'
}

function formatDateTime(value) {
  return formatDateTimeDisplay(value, '--')
}

function formatRecordStatus(status) {
  if (!status) {
    return '-'
  }

  return RECORD_STATUS_LABELS[status] || '其他状态'
}

function formatComputerDevice(deviceInfo) {
  if (!deviceInfo) {
    return '--'
  }

  return deviceInfo
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
    await ensureCurrentLocation()
    const response = await verifyFaceRequest({
      imageData: checkinForm.imageData,
    })

    faceVerifyResult.value = normalizeFaceVerifyResult(response)
  } catch (error) {
    currentLocationError.value = error?.message || ''
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
    await ensureCurrentLocation()
    readWrappedData(
      await submitAttendanceCheckinRequest({
        checkType: checkinForm.checkType,
        deviceId: checkinForm.deviceId,
        deviceInfo: buildComputerDeviceInfo(),
        clientLongitude: checkinForm.clientLongitude,
        clientLatitude: checkinForm.clientLatitude,
        imageData: checkinForm.imageData,
      }),
    )
    await loadRecords()
    if (recordError.value) {
      checkinError.value = recordError.value
    }
    resetCurrentLocation()
  } catch (error) {
    currentLocationError.value = error?.message || ''
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
  if (isAdmin.value) {
    void Promise.allSettled([loadDepartmentOptions(), loadRecords()])
    return
  }

  void Promise.allSettled([loadDeviceOptions(), loadRecords()])
})

watch(() => checkinForm.deviceId, () => {
  resetCurrentLocation()
  void syncSelectedDeviceMap()
})

watch(activeTab, (tab) => {
  if (tab !== 'checkin') {
    stopFaceCamera()
    destroyDevicePreviewMap()
    return
  }

  void syncSelectedDeviceMap()
})

onBeforeUnmount(() => {
  stopFaceCamera()
  destroyDevicePreviewMap()
})
</script>

<template>
  <section class="attendance-view">
    <ConsoleHero
      title="考勤记录"
      :description="isAdmin ? '支持按人员、部门和时间范围查询考勤记录，便于统一核查。' : '完成打卡、补卡申请和个人记录查询，相关办理集中在当前页面完成。'"
      theme="indigo"
      :cards="heroCards"
    />

    <div class="attendance-tabs" role="tablist" aria-label="考勤页面切换">
      <button
        v-if="!isAdmin"
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
        {{ isAdmin ? '记录管理' : '记录' }}
      </button>
    </div>

    <section v-if="!isAdmin && activeTab === 'checkin'" data-testid="attendance-checkin-panel" class="attendance-panel">
      <section class="attendance-card attendance-card--soft">
        <div class="attendance-card__head">
          <div>
            <p class="attendance-card__eyebrow">打卡信息</p>
            <h2>选择打卡类型与地点</h2>
          </div>
          <span class="attendance-card__badge">信息确认</span>
        </div>

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
          <span>打卡地点</span>
          <select v-model="checkinForm.deviceId" data-testid="attendance-device-select" :disabled="isDeviceSelectDisabled">
            <option value="">请选择打卡地点</option>
            <option v-for="item in deviceOptions" :key="item.id" :value="item.id">
              {{ item.location || item.name || item.id }}
            </option>
          </select>
        </label>

        <p data-testid="attendance-computer-device" class="attendance-hint">
          当前电脑：{{ buildComputerDeviceInfo() }}
        </p>

        <p v-if="selectedDeviceLocation" data-testid="attendance-device-location" class="attendance-hint">
          打卡地点：{{ selectedDeviceLocation }}（允许半径 {{ selectedDeviceRadius }} 米）
        </p>

        <p v-if="selectedDeviceCoordinate" data-testid="attendance-device-coordinate" class="attendance-hint">
          地点经纬度：{{ selectedDeviceCoordinate }}
        </p>

        <div class="attendance-location-actions">
          <button
            type="button"
            data-testid="attendance-current-location-button"
            :disabled="currentLocationLoading"
            @click="ensureCurrentLocation"
          >
            {{ currentLocationLoading ? '定位中...' : '获取当前位置' }}
          </button>
          <span class="attendance-hint">当前位置：{{ currentLocationSummary }}</span>
        </div>

        <p v-if="currentLocationError" data-testid="attendance-current-location-error" class="attendance-error">
          {{ currentLocationError }}
        </p>

        <div v-if="checkinForm.deviceId" class="attendance-map-card">
          <div v-if="deviceMapError" data-testid="attendance-device-map-error" class="attendance-error">
            {{ deviceMapError }}
          </div>
          <p v-else-if="!hasSelectedDeviceCoordinates" data-testid="attendance-device-map-empty" class="attendance-hint">
            当前打卡地点未配置地图坐标，暂无法展示地图预览
          </p>
          <div v-else ref="deviceMapContainer" data-testid="attendance-device-map" class="attendance-device-map"></div>
        </div>
      </section>

      <section class="attendance-face-card attendance-card">
        <div class="attendance-face-card__header">
          <div>
            <p class="attendance-card__eyebrow">人脸采集</p>
            <h2>采集人脸图像</h2>
          </div>
          <div class="attendance-face-source-switch">
            <button
              type="button"
              class="attendance-face-source-switch__button"
              :class="{ 'attendance-face-source-switch__button--active': faceInputSource === 'camera' }"
              data-testid="attendance-face-source-camera"
              @click="switchFaceSource('camera')"
            >
              摄像头拍照
            </button>
            <button
              type="button"
              class="attendance-face-source-switch__button"
              :class="{ 'attendance-face-source-switch__button--active': faceInputSource === 'upload' }"
              data-testid="attendance-face-source-upload"
              @click="switchFaceSource('upload')"
            >
              本地图片上传
            </button>
          </div>
        </div>

        <div v-if="faceInputSource === 'camera'" class="attendance-face-capture">
          <video ref="faceVideoRef" class="attendance-face-camera" autoplay muted playsinline></video>
          <div class="attendance-face-actions">
            <button
              type="button"
              data-testid="attendance-face-camera-start"
              :disabled="faceCameraStarting"
              @click="startFaceCamera"
            >
              {{ faceCameraStarting ? '开启中...' : '开启摄像头' }}
            </button>
            <button
              type="button"
              data-testid="attendance-face-camera-capture"
              :disabled="!hasLiveFaceCamera"
              @click="captureFaceFrame"
            >
              拍照
            </button>
            <button
              type="button"
              data-testid="attendance-face-reset"
              :disabled="!checkinForm.imageData"
              @click="resetFaceImage"
            >
              清空图像
            </button>
          </div>
          <p v-if="faceCameraError" data-testid="attendance-face-camera-error" class="attendance-error">
            {{ faceCameraError }}
          </p>
        </div>

        <div v-else class="attendance-face-capture">
          <label class="attendance-face-upload" for="attendance-face-upload-input">选择本地图片</label>
          <input
            id="attendance-face-upload-input"
            data-testid="attendance-face-upload-input"
            type="file"
            accept="image/*"
            @change="handleFaceUploadChange"
          />
          <button
            type="button"
            data-testid="attendance-face-reset"
            :disabled="!checkinForm.imageData"
            @click="resetFaceImage"
          >
            清空图像
          </button>
          <p class="attendance-hint">上传后将直接用于本次打卡的人脸校验。</p>
          <p v-if="faceUploadError" data-testid="attendance-face-upload-error" class="attendance-error">
            {{ faceUploadError }}
          </p>
        </div>

        <div v-if="checkinForm.imageData" class="attendance-face-preview">
          <img :src="checkinForm.imageData" alt="打卡人脸预览" data-testid="attendance-face-preview" />
        </div>
        <p v-else data-testid="attendance-image-input" class="attendance-hint">请先拍照或上传图片</p>
      </section>

      <section class="attendance-card attendance-card--soft">
        <div class="attendance-card__head">
          <div>
            <p class="attendance-card__eyebrow">提交确认</p>
            <h2>完成人脸校验并提交打卡</h2>
          </div>
          <span class="attendance-card__badge">办理提交</span>
        </div>

        <button
          data-testid="attendance-face-verify-button"
          type="button"
          :disabled="faceVerifyLoading || !checkinForm.imageData"
          @click="handleVerifyFace"
        >
          先行校验
        </button>

        <p v-if="faceVerifyResult" data-testid="attendance-face-verify-result" class="attendance-hint">
          {{ faceVerifyResult }}
        </p>

        <div class="attendance-face-card__tips">
          <span>建议先进行人脸校验，再正式提交打卡。</span>
          <span>如摄像头不可用，可切换为本地图片上传。</span>
        </div>

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
    </section>

    <section v-else data-testid="attendance-record-panel" class="attendance-panel">
      <section class="attendance-card attendance-card--soft">
        <div class="attendance-card__head">
          <div>
            <p class="attendance-card__eyebrow">记录查询</p>
            <h2>{{ isAdmin ? '查询人员考勤记录' : '查询个人考勤记录' }}</h2>
          </div>
          <span class="attendance-card__badge">{{ isAdmin ? '支持筛选' : '支持补卡' }}</span>
        </div>

        <div class="attendance-record-filters">
          <div :class="['attendance-record-filters__fields', { 'attendance-record-filters__fields--admin': isAdmin }]">
          <label v-if="isAdmin" class="attendance-field">
            <span>人员</span>
            <input
              v-model="recordQuery.userId"
              data-testid="attendance-record-user-id-input"
              type="text"
              inputmode="numeric"
            />
          </label>

          <label v-if="isAdmin" class="attendance-field">
            <span>部门</span>
            <select v-model="recordQuery.deptId" data-testid="attendance-record-dept-id-input">
              <option value="">全部</option>
              <option v-for="department in departmentOptions" :key="department.id" :value="String(department.id)">
                {{ department.name }}
              </option>
            </select>
          </label>

          <label v-if="isAdmin" class="attendance-field">
            <span>打卡类型</span>
            <select v-model="recordQuery.checkType" data-testid="attendance-record-check-type-select">
              <option value="">全部</option>
              <option value="IN">上班打卡</option>
              <option value="OUT">下班打卡</option>
            </select>
          </label>

          <label v-if="isAdmin" class="attendance-field">
            <span>处理状态</span>
            <select v-model="recordQuery.status" data-testid="attendance-record-status-select">
              <option value="">全部</option>
              <option value="NORMAL">正常</option>
              <option value="EXCEPTION">异常</option>
              <option value="REPAIRED">已补卡</option>
              <option value="REPAIR_PENDING">补卡处理中</option>
              <option value="ABSENT">缺勤</option>
              <option value="LATE">迟到</option>
              <option value="EARLY_LEAVE">早退</option>
            </select>
          </label>

          <label class="attendance-field">
            <span>开始日期</span>
            <input
              v-model="recordQuery.startDate"
              :data-empty="String(!recordQuery.startDate)"
              data-testid="attendance-start-date-input"
              type="date"
            />
          </label>

          <label class="attendance-field">
            <span>结束日期</span>
            <input
              v-model="recordQuery.endDate"
              :data-empty="String(!recordQuery.endDate)"
              data-testid="attendance-end-date-input"
              type="date"
            />
          </label>
          </div>
        </div>

        <div class="attendance-record-filters__actions">
          <button
            data-testid="attendance-record-reset"
            class="attendance-record-toolbar__button"
            type="button"
            @click="handleResetRecords"
          >
            重置筛选
          </button>
          <button
            data-testid="attendance-record-search"
            class="attendance-record-toolbar__button attendance-record-toolbar__button--primary"
            type="button"
            @click="handleSearchRecords"
          >
            查询
          </button>
        </div>

        <div v-if="recordError" data-testid="attendance-record-error" class="attendance-error">
          {{ recordError }}
        </div>

        <div class="attendance-record-toolbar">
          <div class="attendance-record-toolbar__meta">
            <p data-testid="attendance-record-total">共 {{ recordTotal }} 条</p>
            <label class="attendance-record-toolbar__page-size">
              <span>每页：</span>
              <select v-model.number="recordQuery.pageSize" data-testid="attendance-page-size-select">
                <option :value="10">10</option>
                <option :value="20">20</option>
                <option :value="50">50</option>
              </select>
            </label>
          </div>

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

          <div class="attendance-record-toolbar__placeholder"></div>
        </div>

        <table class="attendance-record-table">
        <thead>
          <tr>
            <th v-if="isAdmin">姓名</th>
            <th>打卡类型</th>
            <th>时间</th>
            <th v-if="isAdmin">打卡地点</th>
            <th v-if="isAdmin">电脑设备</th>
            <th>状态</th>
            <th>异常识别</th>
            <th v-if="!isAdmin">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="!recordError && !recordsLoading && recordList.length === 0">
            <td data-testid="attendance-record-empty" :colspan="isAdmin ? 7 : 5">暂无记录</td>
          </tr>
          <tr v-for="record in recordList" :key="record.id">
            <td v-if="isAdmin">{{ record.realName || '--' }}</td>
            <td>{{ formatCheckType(record.checkType) }}</td>
            <td>{{ formatDateTime(record.checkTime) }}</td>
            <td v-if="isAdmin">{{ record.location || '--' }}</td>
            <td v-if="isAdmin">{{ formatComputerDevice(record.deviceInfo) }}</td>
            <td>{{ formatRecordStatus(record.status) }}</td>
            <td :data-testid="`attendance-record-exception-${record.id}`">{{ formatExceptionType(record.exceptionType) }}</td>
            <td v-if="!isAdmin">
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
    </section>

    <div v-if="repairDialogVisible" class="attendance-repair-dialog">
      <div class="attendance-repair-dialog__backdrop" @click="repairDialogVisible = false"></div>
      <div data-testid="attendance-repair-dialog" class="attendance-repair-dialog__panel">
        <div class="attendance-card__head attendance-card__head--dialog">
          <div>
            <p class="attendance-card__eyebrow">补卡申请</p>
            <h2>填写补卡说明</h2>
          </div>
          <button type="button" class="attendance-repair-dialog__close" @click="repairDialogVisible = false">关闭</button>
        </div>

        <div class="attendance-repair-dialog__meta">
          <p>打卡类型：{{ formatCheckType(repairForm.checkType) }}</p>
          <p>打卡时间：{{ formatDateTime(repairForm.checkTime) }}</p>
        </div>

        <div v-if="repairError" data-testid="attendance-repair-error" class="attendance-error">
          {{ repairError }}
        </div>

        <label class="attendance-field">
          <span>补卡说明</span>
          <textarea v-model="repairForm.repairReason" data-testid="attendance-repair-reason-input" rows="3" />
        </label>

        <div class="attendance-repair-dialog__actions">
          <button type="button" @click="repairDialogVisible = false">取消</button>
          <button
            data-testid="attendance-repair-submit"
            type="button"
            :disabled="isRepairSubmitDisabled"
            @click="handleSubmitRepair"
          >
            提交申请
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.attendance-view {
  display: grid;
  gap: 20px;
}

.attendance-tabs {
  display: flex;
  gap: 8px;
}

.attendance-tabs button {
  min-width: 120px;
  min-height: 44px;
  padding: 0 18px;
  border: 1px solid rgba(47, 105, 178, 0.16);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.88);
  color: #334155;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.06);
  transition: all 0.2s ease;
}

.attendance-tabs button[aria-pressed='true'] {
  border-color: transparent;
  background: linear-gradient(135deg, #245391 0%, #2f69b2 100%);
  color: #ffffff;
}

.attendance-panel {
  display: grid;
  gap: 18px;
}

.attendance-card {
  padding: 22px;
  border-radius: 24px;
  background: #ffffff;
  box-shadow: 0 18px 50px rgba(15, 23, 42, 0.08);
}

.attendance-card--soft {
  background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
}

.attendance-card__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;
}

.attendance-card__head--dialog {
  margin-bottom: 14px;
}

.attendance-card__eyebrow {
  margin: 0 0 8px;
  font-size: 12px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #2f69b2;
}

.attendance-card__head h2 {
  margin: 0;
  font-size: 22px;
  color: #0f172a;
}

.attendance-card__badge {
  padding: 8px 12px;
  border-radius: 999px;
  background: rgba(47, 105, 178, 0.08);
  color: #245391;
  font-size: 12px;
  white-space: nowrap;
}

.attendance-field {
  display: grid;
  gap: 8px;
  min-width: 0;
}

.attendance-field span {
  color: #334155;
  font-size: 13px;
}

.attendance-field select,
.attendance-field input,
.attendance-field textarea,
.attendance-card > button,
.attendance-panel > button,
.attendance-face-actions button,
.attendance-face-source-switch__button,
.attendance-face-upload,
.attendance-record-toolbar__button,
.attendance-pagination button,
.attendance-record-table button,
.attendance-repair-dialog button {
  font: inherit;
}

.attendance-field select,
.attendance-field input,
.attendance-field textarea,
.attendance-card > button,
.attendance-panel > button,
.attendance-face-actions button,
.attendance-face-source-switch__button,
.attendance-face-upload,
.attendance-record-toolbar__button,
.attendance-pagination button,
.attendance-record-table button,
.attendance-repair-dialog button {
  min-height: 44px;
  width: 100%;
  padding: 10px 14px;
  border: 1px solid rgba(148, 163, 184, 0.34);
  border-radius: 14px;
  background: #ffffff;
}

.attendance-card > button,
.attendance-panel > button,
.attendance-face-actions button,
.attendance-face-source-switch__button,
.attendance-face-upload,
.attendance-record-toolbar__button,
.attendance-pagination button,
.attendance-record-table button,
.attendance-repair-dialog button {
  cursor: pointer;
  transition: all 0.2s ease;
}

.attendance-panel > button,
.attendance-card > button,
.attendance-repair-dialog button[data-testid='attendance-repair-submit'] {
  border-color: transparent;
  background: linear-gradient(135deg, #245391 0%, #2f69b2 100%);
  color: #ffffff;
  box-shadow: 0 8px 18px rgba(47, 105, 178, 0.18);
}

.attendance-record-toolbar__button--primary {
  border: 0;
  border-radius: 12px;
  background: #2f69b2;
  color: #ffffff;
  box-shadow: none;
}

.attendance-record-filters {
  display: grid;
  gap: 14px;
}

.attendance-record-filters__fields {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px 16px;
}

.attendance-record-filters__fields--admin {
  grid-template-columns: repeat(6, minmax(0, 1fr));
}

.attendance-record-filters__actions {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 12px;
  margin-top: 10px;
}

.attendance-record-toolbar {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: center;
  gap: 16px;
  margin: 24px 0 6px;
}

.attendance-record-toolbar__meta {
  display: flex;
  align-items: center;
  gap: 18px;
  justify-self: start;
  flex-wrap: wrap;
}

.attendance-record-toolbar__meta p {
  margin: 0;
  color: #334155;
  font-weight: 600;
}

.attendance-record-toolbar__page-size {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #64748b;
}

.attendance-record-toolbar__page-size select {
  min-width: 96px;
  width: 96px;
}

.attendance-record-toolbar__button {
  min-width: 112px;
  min-height: 40px;
  width: auto;
  padding: 10px 16px;
  border: 1px solid rgba(47, 105, 178, 0.18);
  border-radius: 12px;
  background: #ffffff;
  color: #245391;
  font-weight: 600;
  box-shadow: 0 6px 14px rgba(15, 23, 42, 0.04);
}

@media (max-width: 1120px) {
  .attendance-record-filters__fields--admin,
  .attendance-record-filters__fields {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .attendance-record-toolbar {
    grid-template-columns: 1fr;
    justify-items: start;
  }

  .attendance-record-filters__actions {
    justify-content: flex-end;
  }

  .attendance-pagination {
    justify-self: center;
  }
}

.attendance-map-card {
  display: grid;
  gap: 8px;
  padding: 12px;
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 18px;
  background: linear-gradient(180deg, #f8fbff 0%, #ffffff 100%);
}

.attendance-face-card {
  display: grid;
  gap: 12px;
}

.attendance-face-card__header {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: space-between;
  align-items: center;
}

.attendance-face-source-switch {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.attendance-face-source-switch__button--active {
  color: #ffffff;
  background: linear-gradient(135deg, #245391 0%, #2f69b2 100%);
}

.attendance-face-capture {
  display: grid;
  gap: 12px;
}

.attendance-face-camera,
.attendance-face-preview {
  width: 100%;
  min-height: 240px;
  border-radius: 18px;
  background: #f5f7fa;
  overflow: hidden;
}

.attendance-face-camera {
  object-fit: cover;
}

.attendance-face-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.attendance-face-upload {
  display: inline-flex;
  width: fit-content;
  color: #ffffff;
  background: linear-gradient(135deg, #245391 0%, #2f69b2 100%);
  cursor: pointer;
}

.attendance-face-preview img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.attendance-device-map {
  min-height: 240px;
  border-radius: 18px;
  overflow: hidden;
}

.attendance-pagination {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: nowrap;
}

.attendance-pagination button {
  width: auto;
  min-width: 96px;
  flex: 0 0 auto;
}

.attendance-pagination span {
  min-width: 88px;
  padding: 10px 14px;
  border-radius: 14px;
  background: rgba(47, 105, 178, 0.08);
  color: #245391;
  text-align: center;
  font-weight: 600;
}

.attendance-pagination button:disabled {
  cursor: not-allowed;
  color: #94a3b8;
  background: #f8fafc;
  border-color: rgba(148, 163, 184, 0.2);
  box-shadow: none;
}

.attendance-record-table {
  width: 100%;
  border-collapse: collapse;
  overflow: hidden;
  border-radius: 18px;
  background: #ffffff;
}

.attendance-record-table th,
.attendance-record-table td {
  padding: 14px 16px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.16);
  text-align: left;
}

.attendance-record-table th {
  background: #f8fafc;
  color: #475569;
  font-size: 13px;
}

.attendance-error {
  padding: 12px 14px;
  color: #b91c1c;
  background: rgba(248, 113, 113, 0.12);
  border-radius: 16px;
}

.attendance-hint {
  margin: 0;
  color: #64748b;
  line-height: 1.7;
}

.attendance-repair-dialog {
  position: fixed;
  inset: 0;
  z-index: 30;
}

.attendance-repair-dialog__backdrop {
  position: absolute;
  inset: 0;
  background: rgba(15, 23, 42, 0.48);
}

.attendance-repair-dialog__panel {
  position: relative;
  z-index: 1;
  width: min(560px, calc(100vw - 32px));
  margin: 64px auto;
  display: grid;
  gap: 14px;
  padding: 22px;
  border-radius: 24px;
  background: #ffffff;
  box-shadow: 0 18px 50px rgba(15, 23, 42, 0.12);
}

.attendance-repair-dialog__meta {
  display: grid;
  gap: 8px;
  padding: 14px 16px;
  border-radius: 16px;
  background: #f8fafc;
  color: #334155;
}

.attendance-repair-dialog__meta p {
  margin: 0;
}

.attendance-repair-dialog__actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  flex-wrap: wrap;
}

.attendance-repair-dialog__close {
  min-height: 40px;
}

.attendance-face-card__tips {
  display: grid;
  gap: 8px;
  padding: 14px 16px;
  border-radius: 16px;
  background: rgba(47, 105, 178, 0.08);
  color: #245391;
  font-size: 13px;
}

@media (max-width: 960px) {
  .attendance-card__head {
    flex-direction: column;
  }

  .attendance-record-filters__fields {
    grid-template-columns: 1fr;
  }

  .attendance-record-toolbar__meta {
    width: 100%;
    justify-content: space-between;
  }

  .attendance-record-filters__actions {
    width: 100%;
    justify-content: flex-end;
    flex-wrap: wrap;
  }

  .attendance-pagination {
    width: 100%;
    justify-content: center;
  }

  .attendance-record-toolbar__button {
    flex: 1 1 160px;
  }

  .attendance-repair-dialog__actions button,
  .attendance-repair-dialog__close {
    width: 100%;
  }
}
</style>
