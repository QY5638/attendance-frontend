<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'

import ConsoleHero from '../../components/console/ConsoleHero.vue'
import { completeFaceLiveness, createFaceLivenessSession } from '../../api/face'
import { useAuthStore } from '../../store/auth'
import {
  getAttendanceListRequest,
  getAttendanceDeviceOptionsRequest,
  getMyAttendanceRecordRequest,
  submitAttendanceCheckinRequest,
  verifyFaceRequest,
} from '../../api/attendance'
import { fetchDepartmentList } from '../../api/department'
import { loadAmapPlugins, loadAmapSdk } from '../../utils/amap'
import { formatDateTimeDisplay } from '../../utils/date-time'
import { getExceptionTypeLabel } from '../../utils/exception-display'
import { describeLivenessAction, runFaceLivenessChallenge } from '../../utils/face-liveness'
import { getTerminalId } from '../../utils/terminal-id'

const props = defineProps({
  viewMode: {
    type: String,
    default: 'auto',
  },
})

const authStore = useAuthStore()
const isAdmin = computed(() => authStore.roleCode === 'ADMIN')
const forcedTab = computed(() => {
  if (props.viewMode === 'checkin') {
    return 'checkin'
  }

  if (props.viewMode === 'records') {
    return 'records'
  }

  return ''
})
const activeTab = ref(isAdmin.value ? 'records' : (forcedTab.value || 'checkin'))
const deviceOptions = ref([])
const departmentOptions = ref([])
const deviceOptionsError = ref('')
const checkinError = ref('')
const recordList = ref([])
const recordTotal = ref(0)
const recordError = ref('')
const recordsLoading = ref(false)
const checkinSubmitting = ref(false)
const faceVerifyLoading = ref(false)
const faceVerifyResult = ref('')
const currentLocationLoading = ref(false)
const currentLocationError = ref('')
const currentLocationSummary = ref('未获取当前位置')
const computerDeviceInfo = ref('设备信息识别中')
const terminalId = ref('终端标识获取中')
const faceInputSource = ref('camera')
const faceCameraStarting = ref(false)
const faceCameraError = ref('')
const faceUploadError = ref('')
const faceVideoRef = ref(null)
const faceStreamRef = ref(null)
const faceLivenessState = reactive({
  running: false,
  message: '',
  actions: [],
  currentIndex: -1,
  completedCount: 0,
  token: '',
  expiresAt: 0,
  score: null,
  imageData: '',
})
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

  if (payload?.livenessPassed === false) {
    return payload.message || '活体预检未通过'
  }

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
const hasValidFaceLivenessProof = computed(() => {
  return Boolean(
    faceLivenessState.token &&
      faceLivenessState.imageData === checkinForm.imageData &&
      faceLivenessState.expiresAt > Date.now() + 1000,
  )
})

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
      faceLivenessState.running ||
      !checkinForm.deviceId ||
      !checkinForm.imageData,
  )
})

const isRepairSubmitDisabled = computed(() => {
  return Boolean(repairSubmitting.value || !repairForm.repairReason.trim())
})

const showTabSwitcher = computed(() => props.viewMode === 'auto')
const showCheckinPanel = computed(() => !isAdmin.value && activeTab.value === 'checkin')
const showRecordPanel = computed(() => isAdmin.value || activeTab.value === 'records')
const pageTitle = computed(() => {
  if (isAdmin.value) {
    return '考勤记录'
  }

  return showCheckinPanel.value ? '考勤打卡' : '考勤记录'
})
const pageDescription = computed(() => {
  if (isAdmin.value) {
    return '支持按人员、部门和时间范围查询考勤记录，便于统一核查。'
  }

  if (showCheckinPanel.value) {
    return '分步骤完成地点确认、活体校验和正式打卡。'
  }

  return '集中查看个人考勤记录，并在需要时提交补卡申请。'
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
      value: computerDeviceInfo.value,
    },
    {
      key: 'terminal',
      label: '本机标识',
      value: terminalId.value,
    },
  ]
})

const CHECK_TYPE_LABELS = {
  IN: '上班打卡',
  OUT: '下班打卡',
}

const RECORD_STATUS_LABELS = {
  NORMAL: '正常',
  ABNORMAL: '异常',
  EXCEPTION: '异常',
  REPAIRED: '已补卡',
  REPAIR_PENDING: '补卡处理中',
  ABSENT: '缺勤',
  LATE: '迟到',
  EARLY_LEAVE: '早退',
}

const REPAIRABLE_RECORD_STATUSES = new Set(['ABNORMAL', 'ABSENT', 'LATE', 'EARLY_LEAVE'])

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

function detectBrowserVersion() {
  if (typeof navigator === 'undefined') {
    return ''
  }

  const userAgent = navigator.userAgent || ''
  const matchedVersion = userAgent.match(/(Edg|Chrome|Firefox|Version)\/(\d+[\d.]*)/)
  return matchedVersion?.[2] || ''
}

function detectPlatformName(platform, platformVersion) {
  const normalizedPlatform = String(platform || '').toLowerCase()
  const normalizedVersion = String(platformVersion || '').trim()

  if (normalizedPlatform.includes('win')) {
    return normalizedVersion ? `Windows ${normalizedVersion}` : 'Windows'
  }
  if (normalizedPlatform.includes('mac')) {
    return normalizedVersion ? `macOS ${normalizedVersion}` : 'macOS'
  }
  if (normalizedPlatform.includes('linux')) {
    return 'Linux'
  }
  return platform || '未知系统'
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

  const details = []
  details.push(`设备型号 ${model || '未提供（浏览器限制）'}`)
  if (platform) {
    details.push(`系统 ${platform}`)
  }
  if (browser) {
    details.push(`浏览器 ${browser}`)
  }
  if (resolution) {
    details.push(`分辨率 ${resolution}`)
  }

  return details.join(' / ') || '网页端电脑'
}

function resolveFaceCameraAccessMessage(error) {
  const errorName = String(error?.name || '').toLowerCase()
  if (errorName.includes('notallowed') || errorName.includes('security')) {
    return '摄像头权限被拒绝，请允许浏览器访问摄像头后重试'
  }
  if (errorName.includes('notfound') || errorName.includes('overconstrained')) {
    return '未检测到可用摄像头，请确认当前电脑已启用摄像头'
  }
  if (errorName.includes('notreadable') || errorName.includes('trackstart')) {
    return '摄像头当前被其他应用占用，请关闭占用程序后重试'
  }
  return '无法访问摄像头，请确认当前电脑已启用摄像头后重试'
}

function formatFaceSubmitError(error) {
  return error?.message || '请求失败，请稍后重试'
}

async function loadComputerDeviceInfo() {
  if (typeof navigator === 'undefined') {
    computerDeviceInfo.value = '网页端电脑'
    return
  }

  let model = navigator.userAgentData?.model || ''
  let platform = navigator.userAgentData?.platform || navigator.platform || '未知系统'
  let platformVersion = ''
  let architecture = ''
  let browser = detectBrowserName()
  let browserVersion = detectBrowserVersion()

  try {
    if (navigator.userAgentData?.getHighEntropyValues) {
      const entropyValues = await navigator.userAgentData.getHighEntropyValues([
        'model',
        'platformVersion',
        'architecture',
        'bitness',
        'fullVersionList',
      ])
      model = entropyValues.model || model
      platformVersion = entropyValues.platformVersion || platformVersion
      architecture = entropyValues.architecture
        ? `${entropyValues.architecture}${entropyValues.bitness ? ` ${entropyValues.bitness}位` : ''}`
        : architecture

      const browserEntry = entropyValues.fullVersionList?.find((item) => {
        return /Edge|Chrome|Firefox|Safari/i.test(item.brand || '')
      })
      if (browserEntry?.brand) {
        browser = browserEntry.brand.replace(/^Microsoft /, '')
      }
      if (browserEntry?.version) {
        browserVersion = browserEntry.version
      }
    }
  } catch (error) {
    // 忽略高熵信息获取失败，回退到浏览器基础能力
  }

  const resolution = typeof window !== 'undefined' && window.screen?.width && window.screen?.height
    ? `${window.screen.width}x${window.screen.height}`
    : ''

  const details = [
    `设备型号 ${model || '未提供（浏览器限制）'}`,
    `系统 ${detectPlatformName(platform, platformVersion)}`,
  ]

  if (architecture) {
    details.push(`架构 ${architecture}`)
  }

  details.push(`浏览器 ${browser}${browserVersion ? ` ${browserVersion}` : ''}`)

  if (resolution) {
    details.push(`分辨率 ${resolution}`)
  }

  computerDeviceInfo.value = details.join(' / ')
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

function resetFaceLivenessState() {
  faceLivenessState.running = false
  faceLivenessState.message = ''
  faceLivenessState.actions = []
  faceLivenessState.currentIndex = -1
  faceLivenessState.completedCount = 0
  faceLivenessState.token = ''
  faceLivenessState.expiresAt = 0
  faceLivenessState.score = null
  faceLivenessState.imageData = ''
}

function updateFaceLivenessProgress(progress = {}) {
  faceLivenessState.actions = Array.isArray(progress.actions) ? progress.actions : faceLivenessState.actions
  faceLivenessState.currentIndex = Number.isFinite(progress.currentIndex) ? progress.currentIndex : faceLivenessState.currentIndex
  faceLivenessState.completedCount = Array.isArray(progress.completedActions)
    ? progress.completedActions.length
    : faceLivenessState.completedCount
  faceLivenessState.message = progress.message || faceLivenessState.message
}

async function startFaceLivenessChallenge() {
  if (faceLivenessState.running) {
    return
  }

  if (!hasLiveFaceCamera.value || !faceVideoRef.value) {
    throw new Error('请先开启摄像头后再开始活体挑战')
  }

  faceLivenessState.running = true
  faceLivenessState.message = '正在创建活体挑战...'
  faceVerifyResult.value = ''

  try {
    const sessionResponse = await createFaceLivenessSession()
    if (!sessionResponse || typeof sessionResponse !== 'object' || sessionResponse.code !== 200 || !sessionResponse.data) {
      throw new Error(sessionResponse?.message || '活体挑战创建失败，请稍后重试')
    }

    const session = sessionResponse.data
    faceLivenessState.actions = Array.isArray(session.actions) ? session.actions : []
    faceLivenessState.currentIndex = 0
    faceLivenessState.completedCount = 0

    const challengeResult = await runFaceLivenessChallenge({
      videoElement: faceVideoRef.value,
      actions: session.actions,
      onProgress: updateFaceLivenessProgress,
    })

    const completeResponse = await completeFaceLiveness({
      sessionId: session.sessionId,
      imageData: challengeResult.imageData,
      startedAt: challengeResult.startedAt,
      completedAt: challengeResult.completedAt,
      sampleCount: challengeResult.sampleCount,
      stableFaceFrames: challengeResult.stableFaceFrames,
      completedActions: challengeResult.completedActions,
      actionScores: challengeResult.actionScores,
    })

    if (!completeResponse || typeof completeResponse !== 'object' || completeResponse.code !== 200 || !completeResponse.data) {
      throw new Error(completeResponse?.message || '活体挑战提交失败，请稍后重试')
    }

    checkinForm.imageData = challengeResult.imageData
    faceLivenessState.token = completeResponse.data.livenessToken || ''
    faceLivenessState.expiresAt = Number(completeResponse.data.expiresAt || 0)
    faceLivenessState.score = typeof completeResponse.data.livenessScore === 'number'
      ? completeResponse.data.livenessScore
      : completeResponse.data.livenessScore || null
    faceLivenessState.imageData = challengeResult.imageData
    faceLivenessState.currentIndex = faceLivenessState.actions.length
    faceLivenessState.completedCount = faceLivenessState.actions.length
    faceLivenessState.message = completeResponse.data.message || '活体挑战通过'
    clearFaceCheckinState()
  } catch (error) {
    resetFaceLivenessState()
    throw error
  } finally {
    faceLivenessState.running = false
  }
}

async function ensureFaceLivenessToken() {
  if (hasValidFaceLivenessProof.value) {
    return faceLivenessState.token
  }

  await startFaceLivenessChallenge()
  return faceLivenessState.token
}

async function handleFaceLivenessButton() {
  try {
    await startFaceLivenessChallenge()
  } catch (error) {
    faceVerifyResult.value = error?.message || '活体挑战失败，请稍后重试'
  }
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
  resetFaceLivenessState()
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
    faceCameraError.value = resolveFaceCameraAccessMessage(error)
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
    faceCameraError.value = '当前环境暂不支持拍照，请确认浏览器支持摄像头采集'
    return
  }

  context.drawImage(faceVideoRef.value, 0, 0, canvas.width, canvas.height)
  checkinForm.imageData = canvas.toDataURL('image/png')
  resetFaceLivenessState()
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
    resetFaceLivenessState()
    clearFaceCheckinState()
  }
  reader.readAsDataURL(file)
}

function resetFaceImage() {
  checkinForm.imageData = ''
  faceCameraError.value = ''
  faceUploadError.value = ''
  resetFaceLivenessState()
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
    return '待核查异常'
  }

  return getExceptionTypeLabel(exceptionType, '待核查异常')
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

function isRepairableRecord(record) {
  return REPAIRABLE_RECORD_STATUSES.has(String(record?.status || '').toUpperCase())
}

async function handleVerifyFace() {
  if (!checkinForm.imageData || faceVerifyLoading.value) {
    return
  }

  faceVerifyLoading.value = true

  try {
    await loadComputerDeviceInfo()
    terminalId.value = getTerminalId()
    await ensureCurrentLocation()
    const livenessToken = await ensureFaceLivenessToken()
    const response = await verifyFaceRequest({
      imageData: checkinForm.imageData,
      livenessToken,
      consumeLiveness: false,
    })

    faceVerifyResult.value = normalizeFaceVerifyResult(response)
  } catch (error) {
    currentLocationError.value = error?.message || ''
    faceVerifyResult.value = formatFaceSubmitError(error)
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
    await loadComputerDeviceInfo()
    await ensureCurrentLocation()
    const livenessToken = await ensureFaceLivenessToken()
    readWrappedData(
      await submitAttendanceCheckinRequest({
        checkType: checkinForm.checkType,
        deviceId: checkinForm.deviceId,
        deviceInfo: computerDeviceInfo.value,
        terminalId: terminalId.value,
        clientLongitude: checkinForm.clientLongitude,
        clientLatitude: checkinForm.clientLatitude,
        imageData: checkinForm.imageData,
        livenessToken,
      }),
    )
    if (showTabSwitcher.value || showRecordPanel.value) {
      await loadRecords()
      if (recordError.value) {
        checkinError.value = recordError.value
      }
    }
    ElMessage.success('打卡提交成功')
    resetCurrentLocation()
  } catch (error) {
    currentLocationError.value = error?.message || ''
    checkinError.value = formatFaceSubmitError(error)
  } finally {
    checkinSubmitting.value = false
  }
}

onMounted(() => {
  void loadComputerDeviceInfo()
  terminalId.value = getTerminalId()
  if (isAdmin.value) {
    void Promise.allSettled([loadDepartmentOptions(), loadRecords()])
    return
  }

  if (showTabSwitcher.value) {
    void Promise.allSettled([loadDeviceOptions(), loadRecords()])
    return
  }

  const tasks = []
  if (showCheckinPanel.value) {
    tasks.push(loadDeviceOptions())
  }
  if (showRecordPanel.value) {
    tasks.push(loadRecords())
  }
  void Promise.allSettled(tasks)
})

watch(forcedTab, (nextTab) => {
  if (!nextTab) {
    return
  }

  activeTab.value = nextTab
})

watch(showCheckinPanel, (visible) => {
  if (isAdmin.value || !visible) {
    return
  }

  if (!deviceOptions.value.length && !deviceOptionsError.value) {
    void loadDeviceOptions()
  }
})

watch(showRecordPanel, (visible) => {
  if (!visible) {
    return
  }

  if (!recordList.value.length && !recordsLoading.value && !recordError.value) {
    void loadRecords()
  }
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
      :title="pageTitle"
      :description="pageDescription"
      theme="indigo"
      :cards="heroCards"
    />

    <div v-if="showTabSwitcher" class="attendance-tabs" role="tablist" aria-label="考勤页面切换">
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

    <section v-if="showCheckinPanel" data-testid="attendance-checkin-panel" class="attendance-panel">
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
          当前电脑：{{ computerDeviceInfo }}
        </p>

        <p data-testid="attendance-terminal-id" class="attendance-hint">
          本机标识：{{ terminalId }}
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

      <div class="attendance-checkin-grid">
        <section class="attendance-face-card attendance-card">
          <div class="attendance-card__head attendance-card__head--checkin-grid">
            <div>
              <p class="attendance-card__eyebrow">人脸采集</p>
              <h2>采集人脸图像</h2>
            </div>
            <span class="attendance-card__badge">活体验证</span>
          </div>
          <p class="attendance-checkin-grid__intro">打卡必须通过摄像头完成人脸活体检测，本地图片上传不可用于正式打卡。</p>

          <div class="attendance-face-capture">
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

          <div class="attendance-face-liveness">
            <div class="attendance-face-liveness__header">
              <strong>活体挑战</strong>
              <button
                type="button"
                data-testid="attendance-face-liveness-button"
                :disabled="!hasLiveFaceCamera || faceLivenessState.running"
                @click="handleFaceLivenessButton"
              >
                {{ faceLivenessState.running ? '挑战中...' : hasValidFaceLivenessProof ? '重新挑战' : '开始活体挑战' }}
              </button>
            </div>
            <p class="attendance-hint">
              {{ faceLivenessState.message || '打卡前必须先完成随机活体挑战，再进行人脸预检或正式提交。' }}
            </p>
            <p v-if="faceLivenessState.score !== null" class="attendance-hint attendance-hint--accent">
              活体分值：{{ Number(faceLivenessState.score).toFixed(2) }}
            </p>
            <div v-if="faceLivenessState.actions.length" class="attendance-face-liveness__steps">
              <span
                v-for="(action, index) in faceLivenessState.actions"
                :key="`${action}-${index}`"
                :class="[
                  'attendance-face-liveness__step',
                  {
                    'attendance-face-liveness__step--completed': index < faceLivenessState.completedCount,
                    'attendance-face-liveness__step--active': index === faceLivenessState.currentIndex,
                  },
                ]"
              >
                {{ describeLivenessAction(action) }}
              </span>
            </div>
          </div>
        </section>

        <section class="attendance-card attendance-card--soft attendance-preview-card">
          <div class="attendance-card__head attendance-card__head--checkin-grid">
            <div>
              <p class="attendance-card__eyebrow">图像预览</p>
              <h2>确认预览并提交打卡</h2>
            </div>
            <span class="attendance-card__badge">打卡提交</span>
          </div>
          <p class="attendance-checkin-grid__intro">拍照后右侧会展示当前抓拍结果，便于在预检通过后再正式提交打卡。</p>

          <div v-if="checkinForm.imageData && !faceLivenessState.running" class="attendance-face-preview">
            <img :src="checkinForm.imageData" alt="打卡人脸预览" data-testid="attendance-face-preview" />
          </div>
          <div v-else class="attendance-face-preview attendance-face-preview--empty" data-testid="attendance-image-input">
            {{ faceLivenessState.running ? '活体挑战进行中，请跟随提示完成动作' : '请先开启摄像头拍照，再完成活体挑战' }}
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
            <span>打卡前必须完成活体挑战，人脸预检通过后再正式提交。</span>
            <span>右侧预览会展示当前抓拍结果，便于提交前再次确认。</span>
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
      </div>
    </section>

    <section v-if="showRecordPanel" data-testid="attendance-record-panel" class="attendance-panel">
      <section class="attendance-card attendance-card--soft">
        <div class="attendance-card__head">
          <div>
            <p class="attendance-card__eyebrow">记录查询</p>
            <h2>{{ isAdmin ? '查询人员考勤记录' : '查询个人考勤记录' }}</h2>
          </div>
          <span class="attendance-card__badge">{{ isAdmin ? '支持筛选' : '仅查看记录' }}</span>
        </div>

        <p v-if="!isAdmin" class="attendance-hint attendance-record__hint">补卡申请已拆分为独立页面；当前列表仅标记可补卡记录，正常记录不再显示补卡入口。</p>

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
            <th v-if="!isAdmin">补卡标记</th>
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
              <span v-if="isRepairableRecord(record)" :data-testid="`attendance-repair-tag-${record.id}`" class="attendance-record-tag">可补卡</span>
            </td>
          </tr>
        </tbody>
        </table>
      </section>
    </section>
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
  .attendance-checkin-grid,
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

.attendance-checkin-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 20px;
}

.attendance-face-card {
  display: grid;
  gap: 12px;
}

.attendance-preview-card {
  display: grid;
  gap: 16px;
  align-content: start;
}

.attendance-card__head--checkin-grid {
  margin-bottom: 0;
  align-items: flex-start;
}

.attendance-checkin-grid__intro {
  margin: 0;
  min-height: 48px;
  color: #64748b;
  line-height: 1.7;
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
  aspect-ratio: 4 / 3;
  min-height: 200px;
  max-height: min(50vh, 320px);
  border-radius: 18px;
  background: #0f172a;
  overflow: hidden;
}

.attendance-face-camera {
  display: block;
  object-fit: contain;
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

.attendance-face-liveness {
  display: grid;
  gap: 10px;
  padding: 14px 16px;
  border-radius: 16px;
  border: 1px solid rgba(47, 105, 178, 0.12);
  background: rgba(47, 105, 178, 0.06);
}

.attendance-face-liveness__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.attendance-face-liveness__steps {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.attendance-face-liveness__step {
  padding: 8px 12px;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.06);
  color: #475569;
  font-size: 13px;
}

.attendance-face-liveness__step--active {
  background: rgba(37, 83, 145, 0.14);
  color: #1d4f8f;
}

.attendance-face-liveness__step--completed {
  background: rgba(22, 163, 74, 0.14);
  color: #15803d;
}

.attendance-face-preview img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
  background: #0f172a;
}

.attendance-face-preview--empty {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  color: #64748b;
  text-align: center;
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

.attendance-hint--accent {
  color: #245391;
  font-weight: 600;
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

  .attendance-checkin-grid__intro {
    min-height: 0;
  }

  .attendance-record-filters__fields,
  .attendance-checkin-grid {
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
