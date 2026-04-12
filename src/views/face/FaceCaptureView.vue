<template>
  <section class="face-card">
    <ConsoleHero
      title="人脸采集"
      description="用于录入和核验当前账号的人脸信息，请按提示拍照或上传清晰正面照片。"
      theme="sky"
      :cards="heroCards"
    />

    <div class="face-card__toolbar">
      <button
        type="button"
        class="face-card__toggle"
        :class="{ 'face-card__toggle--active': source === 'camera' }"
        data-testid="source-camera"
        @click="switchSource('camera')"
      >
        摄像头拍照
      </button>
      <button
        type="button"
        class="face-card__toggle"
        :class="{ 'face-card__toggle--active': source === 'upload' }"
        data-testid="source-upload"
        @click="switchSource('upload')"
      >
        本地图片上传
      </button>
    </div>

    <div class="face-card__grid">
      <section class="face-panel">
        <h3>采集方式</h3>

        <div v-if="source === 'camera'" class="face-panel__body">
          <video ref="videoRef" class="face-panel__camera" autoplay muted playsinline></video>
          <div class="face-panel__actions">
            <button
              type="button"
              class="face-card__button"
              data-testid="camera-start-button"
              :disabled="cameraStarting"
              @click="startCamera"
            >
              {{ cameraStarting ? '开启中...' : '开启摄像头' }}
            </button>
            <button
              type="button"
              class="face-card__button face-card__button--secondary"
              data-testid="camera-capture-button"
              :disabled="!hasLiveCamera"
              @click="captureFrame"
            >
              拍照
            </button>
          </div>
          <p v-if="cameraError" class="face-card__error" data-testid="camera-error">{{ cameraError }}</p>
        </div>

        <div v-else class="face-panel__body">
          <label class="face-card__upload" for="face-upload-input">
            选择本地图片
          </label>
          <input
            id="face-upload-input"
            data-testid="face-upload-input"
            class="face-card__upload-input"
            type="file"
            accept="image/*"
            @change="handleUploadChange"
          />
          <p class="face-card__hint">支持常见图片格式；若当前环境启用了活体挑战，请改用摄像头完成实时校验。</p>
          <p v-if="imageData" class="face-card__hint face-card__hint--accent">当前已选本地图片；若提交时提示需要活体，请切回摄像头完成挑战。</p>
          <p v-if="uploadError" class="face-card__error">{{ uploadError }}</p>
        </div>
      </section>

      <section class="face-panel">
        <h3>图像预览</h3>
        <div v-if="imageData" class="face-preview">
          <img :src="imageData" alt="人脸预览" data-testid="face-preview-image" />
        </div>
        <div v-else class="face-preview face-preview--empty">请先拍照或上传图片</div>

        <div v-if="source === 'camera'" class="face-liveness">
          <div class="face-liveness__header">
            <strong>活体挑战</strong>
            <button
              type="button"
              class="face-card__button face-card__button--secondary"
              data-testid="face-liveness-button"
              :disabled="!hasLiveCamera || livenessState.running"
              @click="handleLivenessButton"
            >
              {{ livenessState.running ? '挑战中...' : hasValidLivenessProof ? '重新挑战' : '开始活体挑战' }}
            </button>
          </div>
          <p class="face-card__hint">
            {{ livenessState.message || '提交前会要求完成随机眨眼、转头或张嘴挑战，用于确认真实在场。' }}
          </p>
          <div v-if="livenessState.score !== null" class="face-liveness__score">
            活体分值：{{ formatNumber(livenessState.score) }}
          </div>
          <div v-if="livenessState.actions.length" class="face-liveness__steps">
            <span
              v-for="(action, index) in livenessState.actions"
              :key="`${action}-${index}`"
              :class="[
                'face-liveness__step',
                {
                  'face-liveness__step--completed': index < livenessState.completedCount,
                  'face-liveness__step--active': index === livenessState.currentIndex,
                },
              ]"
            >
              {{ describeLivenessAction(action) }}
            </span>
          </div>
        </div>

        <div class="face-panel__actions face-panel__actions--compact">
          <button
            type="button"
            class="face-card__button"
            data-testid="face-register-button"
            :disabled="!canSubmit"
            @click="submitRegister"
          >
            {{ submittingAction === 'register' ? '录入中...' : '提交录入' }}
          </button>
          <button
            type="button"
            class="face-card__button face-card__button--secondary"
            data-testid="face-verify-button"
            :disabled="!canSubmit"
            @click="submitVerify"
          >
            {{ submittingAction === 'verify' ? '验证中...' : '执行验证' }}
          </button>
          <button
            type="button"
            class="face-card__button face-card__button--ghost"
            data-testid="face-reset-button"
            :disabled="!imageData && !result"
            @click="resetCapture"
          >
            重新采集
          </button>
        </div>

        <p v-if="submitError" class="face-card__error" data-testid="face-submit-error">{{ submitError }}</p>
      </section>
    </div>

    <section class="face-result" v-if="result">
      <h3>处理结果</h3>
      <p class="face-result__message" data-testid="face-result-message">{{ result.message }}</p>
      <div class="face-result__meta">
        <div data-testid="face-result-user-id">当前账号：{{ authStore.realName || '当前用户' }}</div>
        <div v-if="result.provider">识别引擎：{{ formatProvider(result.provider) }}</div>
        <div v-if="result.type === 'register' && result.createTime">录入时间：{{ formatDateTimeDisplay(result.createTime, '--') }}</div>
        <div v-if="result.type === 'register' && result.livenessPassed !== undefined">活体检测：{{ formatBooleanState(result.livenessPassed) }}</div>
        <div v-if="result.type === 'register' && result.livenessScore !== undefined">活体分值：{{ formatNumber(result.livenessScore) }}</div>
        <div v-if="result.type === 'register' && result.qualityScore !== undefined">图像质量：{{ formatNumber(result.qualityScore) }}</div>
        <div v-if="result.type === 'verify'">已建立档案：{{ result.registered ? '是' : '否' }}</div>
        <div v-if="result.type === 'verify'">验证结果：{{ result.matched ? '通过' : '未通过' }}</div>
        <div v-if="result.type === 'verify'">相似度：{{ formatNumber(result.faceScore) }}</div>
        <div v-if="result.type === 'verify'">校验阈值：{{ formatNumber(result.threshold) }}</div>
        <div v-if="result.type === 'verify' && result.livenessPassed !== undefined">活体检测：{{ formatBooleanState(result.livenessPassed) }}</div>
        <div v-if="result.type === 'verify' && result.livenessScore !== undefined">活体分值：{{ formatNumber(result.livenessScore) }}</div>
        <div v-if="result.type === 'verify' && result.qualityScore !== undefined">图像质量：{{ formatNumber(result.qualityScore) }}</div>
      </div>
    </section>
  </section>
</template>

<script setup>
import { computed, onBeforeUnmount, reactive, ref } from 'vue'

import ConsoleHero from '../../components/console/ConsoleHero.vue'
import { completeFaceLiveness, createFaceLivenessSession, registerFace, verifyFace } from '../../api/face'
import { useAuthStore } from '../../store/auth'
import { formatDateTimeDisplay } from '../../utils/date-time'
import { describeLivenessAction, runFaceLivenessChallenge } from '../../utils/face-liveness'

const source = ref('camera')
const imageData = ref('')
const result = ref(null)
const submitError = ref('')
const uploadError = ref('')
const cameraError = ref('')
const cameraStarting = ref(false)
const submittingAction = ref('')
const videoRef = ref(null)
const streamRef = ref(null)
const authStore = useAuthStore()
const livenessState = reactive({
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

const hasLiveCamera = computed(() => Boolean(streamRef.value))
const canSubmit = computed(() => Boolean(imageData.value) && !submittingAction.value && !livenessState.running)
const hasValidLivenessProof = computed(() => {
  return Boolean(
    livenessState.token &&
      livenessState.imageData === imageData.value &&
      livenessState.expiresAt > Date.now() + 1000,
  )
})
const heroCards = computed(() => [
  {
    key: 'source',
    label: '采集方式',
    value: source.value === 'camera' ? '摄像头拍照' : '本地图片上传',
  },
  {
    key: 'image',
    label: '图像状态',
    value: imageData.value ? '已准备' : '待采集',
  },
  {
    key: 'action',
    label: '当前操作',
    value: submittingAction.value === 'register' ? '提交录入' : submittingAction.value === 'verify' ? '执行验证' : '待处理',
  },
])

function formatNumber(value) {
  return typeof value === 'number' ? value.toFixed(2) : value
}

function formatBooleanState(value) {
  if (value === true) {
    return '通过'
  }

  if (value === false) {
    return '未通过'
  }

  return '--'
}

function formatProvider(provider) {
  if (provider === 'COMPREFACE') {
    return 'CompreFace 本地引擎'
  }

  if (provider === 'ALIYUN_FACEBODY') {
    return '阿里云视觉智能'
  }

  if (provider === 'TEST_STUB') {
    return '测试识别桩'
  }

  return provider || '--'
}

function resolveCameraAccessMessage(error) {
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
  return '无法访问摄像头，请改用本地图片上传'
}

function formatSubmitError(error) {
  const message = error?.message || '请求失败，请稍后重试'
  if (source.value === 'upload' && message.includes('活体')) {
    return `${message}，请切换到摄像头模式完成挑战`
  }
  return message
}

function clearResultState() {
  result.value = null
  submitError.value = ''
}

function resetLivenessState() {
  livenessState.running = false
  livenessState.message = ''
  livenessState.actions = []
  livenessState.currentIndex = -1
  livenessState.completedCount = 0
  livenessState.token = ''
  livenessState.expiresAt = 0
  livenessState.score = null
  livenessState.imageData = ''
}

function updateLivenessProgress(progress = {}) {
  livenessState.actions = Array.isArray(progress.actions) ? progress.actions : livenessState.actions
  livenessState.currentIndex = Number.isFinite(progress.currentIndex) ? progress.currentIndex : livenessState.currentIndex
  livenessState.completedCount = Array.isArray(progress.completedActions)
    ? progress.completedActions.length
    : livenessState.completedCount
  livenessState.message = progress.message || livenessState.message
}

async function startLivenessChallenge() {
  if (livenessState.running) {
    return
  }

  if (!hasLiveCamera.value || !videoRef.value) {
    throw new Error('请先开启摄像头后再开始活体挑战')
  }

  livenessState.running = true
  livenessState.message = '正在创建活体挑战...'
  submitError.value = ''

  try {
    const sessionResponse = await createFaceLivenessSession()
    if (!sessionResponse || typeof sessionResponse !== 'object' || sessionResponse.code !== 200 || !sessionResponse.data) {
      throw new Error(sessionResponse?.message || '活体挑战创建失败，请稍后重试')
    }

    const session = sessionResponse.data
    livenessState.actions = Array.isArray(session.actions) ? session.actions : []
    livenessState.currentIndex = 0
    livenessState.completedCount = 0

    const challengeResult = await runFaceLivenessChallenge({
      videoElement: videoRef.value,
      actions: session.actions,
      onProgress: updateLivenessProgress,
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

    imageData.value = challengeResult.imageData
    livenessState.token = completeResponse.data.livenessToken || ''
    livenessState.expiresAt = Number(completeResponse.data.expiresAt || 0)
    livenessState.score = typeof completeResponse.data.livenessScore === 'number'
      ? completeResponse.data.livenessScore
      : completeResponse.data.livenessScore || null
    livenessState.imageData = challengeResult.imageData
    livenessState.currentIndex = livenessState.actions.length
    livenessState.completedCount = livenessState.actions.length
    livenessState.message = completeResponse.data.message || '活体挑战通过'
    clearResultState()
  } catch (error) {
    resetLivenessState()
    throw error
  } finally {
    livenessState.running = false
  }
}

async function ensureLivenessToken() {
  if (source.value !== 'camera') {
    return ''
  }

  if (hasValidLivenessProof.value) {
    return livenessState.token
  }

  await startLivenessChallenge()
  return livenessState.token
}

async function handleLivenessButton() {
  try {
    await startLivenessChallenge()
  } catch (error) {
    submitError.value = error?.message || '活体挑战失败，请稍后重试'
  }
}

function stopCamera() {
  if (!streamRef.value) {
    return
  }

  streamRef.value.getTracks().forEach((track) => track.stop())
  streamRef.value = null

  if (videoRef.value) {
    videoRef.value.srcObject = null
  }
}

function switchSource(nextSource) {
  if (source.value === nextSource) {
    return
  }

  if (source.value === 'camera') {
    stopCamera()
  }

  source.value = nextSource
  cameraError.value = ''
  uploadError.value = ''
  resetLivenessState()
}

async function startCamera() {
  if (cameraStarting.value) {
    return
  }

  cameraError.value = ''
  cameraStarting.value = true

  try {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('unsupported')
    }

    stopCamera()
    const stream = await navigator.mediaDevices.getUserMedia({ video: true })
    streamRef.value = stream

    if (videoRef.value) {
      videoRef.value.srcObject = stream
    }
  } catch (error) {
    cameraError.value = resolveCameraAccessMessage(error)
  } finally {
    cameraStarting.value = false
  }
}

function captureFrame() {
  if (!videoRef.value || !streamRef.value) {
    return
  }

  const canvas = document.createElement('canvas')
  canvas.width = videoRef.value.videoWidth || 640
  canvas.height = videoRef.value.videoHeight || 480

  const context = canvas.getContext('2d')
  if (!context) {
    cameraError.value = '当前环境暂不支持拍照，请改用本地图片上传'
    return
  }

  context.drawImage(videoRef.value, 0, 0, canvas.width, canvas.height)
  imageData.value = canvas.toDataURL('image/png')
  resetLivenessState()
  clearResultState()
}

function handleUploadChange(event) {
  uploadError.value = ''
  const [file] = event.target?.files || []

  if (!file) {
    return
  }

  if (!file.type.startsWith('image/')) {
    uploadError.value = '请选择图片文件'
    return
  }

  const reader = new FileReader()
  reader.onload = (loadEvent) => {
    imageData.value = loadEvent.target?.result || ''
    resetLivenessState()
    clearResultState()
  }
  reader.readAsDataURL(file)
}

function resetCapture() {
  imageData.value = ''
  uploadError.value = ''
  cameraError.value = ''
  resetLivenessState()
  clearResultState()
}

async function submit(action, request) {
  if (!imageData.value || submittingAction.value) {
    return
  }

  submittingAction.value = action
  submitError.value = ''

  try {
    const livenessToken = await ensureLivenessToken()
    const data = await request(imageData.value, livenessToken)
    result.value = {
      ...data,
      type: action,
    }
  } catch (error) {
    result.value = null
    submitError.value = formatSubmitError(error)
  } finally {
    submittingAction.value = ''
  }
}

function submitRegister() {
  return submit('register', (imageData, livenessToken) => registerFace(imageData, livenessToken))
}

function submitVerify() {
  return submit('verify', (imageData, livenessToken) => verifyFace(imageData, livenessToken))
}

onBeforeUnmount(() => {
  stopCamera()
})
</script>

<style scoped>
.face-card {
  display: grid;
  gap: 20px;
}

.face-card h2,
.face-card h3 {
  margin: 0;
  color: #0f172a;
}

.face-card__toolbar {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
}

.face-card__toggle,
.face-card__button,
.face-card__upload {
  border: none;
  border-radius: 14px;
  cursor: pointer;
  font: inherit;
}

.face-card__toggle {
  padding: 10px 16px;
  background: rgba(47, 105, 178, 0.08);
  color: #245391;
}

.face-card__toggle--active {
  background: #2f69b2;
  color: #ffffff;
}

.face-card__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
}

.face-panel,
.face-result {
  padding: 20px;
  border-radius: 18px;
  background: #ffffff;
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.06);
  border: 1px solid rgba(148, 163, 184, 0.16);
}

.face-panel__body {
  margin-top: 16px;
}

.face-panel__camera,
.face-preview {
  width: 100%;
  min-height: 240px;
  border-radius: 18px;
  background: #e2e8f0;
  overflow: hidden;
}

.face-panel__camera {
  object-fit: cover;
}

.face-preview {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 16px;
}

.face-preview img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.face-preview--empty {
  color: #64748b;
}

.face-panel__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 16px;
}

.face-panel__actions--compact {
  margin-top: 20px;
}

.face-card__button {
  padding: 10px 16px;
  background: #2f69b2;
  color: #ffffff;
}

.face-card__button--secondary {
  background: #0f172a;
}

.face-card__button--ghost {
  background: rgba(148, 163, 184, 0.16);
  color: #334155;
}

.face-card__button:disabled,
.face-card__toggle:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.face-card__upload {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 10px 16px;
  background: #2f69b2;
  color: #ffffff;
}

.face-card__upload-input {
  display: block;
  margin-top: 12px;
}

.face-card__hint {
  margin: 12px 0 0;
  color: #64748b;
  line-height: 1.6;
}

.face-card__hint--accent {
  color: #245391;
}

.face-card__error {
  margin: 12px 0 0;
  color: #dc2626;
}

.face-result {
  margin-top: 0;
}

.face-result__message {
  margin: 16px 0;
  font-size: 18px;
  font-weight: 600;
  color: #0f172a;
}

.face-result__meta {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
  color: #334155;
}

.face-liveness {
  margin-top: 18px;
  padding: 14px 16px;
  border-radius: 16px;
  background: rgba(47, 105, 178, 0.06);
  border: 1px solid rgba(47, 105, 178, 0.12);
}

.face-liveness__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.face-liveness__score {
  margin-top: 10px;
  color: #245391;
  font-weight: 600;
}

.face-liveness__steps {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 12px;
}

.face-liveness__step {
  padding: 8px 12px;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.06);
  color: #475569;
  font-size: 13px;
}

.face-liveness__step--active {
  background: rgba(37, 83, 145, 0.14);
  color: #1d4f8f;
}

.face-liveness__step--completed {
  background: rgba(22, 163, 74, 0.14);
  color: #15803d;
}

@media (max-width: 768px) {
  .face-card {
    gap: 16px;
  }
}
</style>
