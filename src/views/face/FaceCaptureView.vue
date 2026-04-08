<template>
  <section class="face-card">
    <ConsoleHero
      eyebrow="考勤业务"
      title="人脸采集"
      description="用于采集和核验当前账号的人脸信息，请按要求拍照或上传清晰正面照片。"
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
          <p class="face-card__hint">支持常见图片格式，上传后将用于本次录入或验证。</p>
          <p v-if="uploadError" class="face-card__error">{{ uploadError }}</p>
        </div>
      </section>

      <section class="face-panel">
        <h3>图像预览</h3>
        <div v-if="imageData" class="face-preview">
          <img :src="imageData" alt="人脸预览" data-testid="face-preview-image" />
        </div>
        <div v-else class="face-preview face-preview--empty">请先拍照或上传图片</div>

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
        <div data-testid="face-result-user-id">人员编号：{{ result.userId }}</div>
        <div v-if="result.type === 'register' && result.createTime">录入时间：{{ result.createTime }}</div>
        <div v-if="result.type === 'verify'">已建立档案：{{ result.registered ? '是' : '否' }}</div>
        <div v-if="result.type === 'verify'">验证结果：{{ result.matched ? '通过' : '未通过' }}</div>
        <div v-if="result.type === 'verify'">相似度：{{ formatNumber(result.faceScore) }}</div>
        <div v-if="result.type === 'verify'">校验阈值：{{ formatNumber(result.threshold) }}</div>
      </div>
    </section>
  </section>
</template>

<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'

import ConsoleHero from '../../components/console/ConsoleHero.vue'
import { registerFace, verifyFace } from '../../api/face'

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

const hasLiveCamera = computed(() => Boolean(streamRef.value))
const canSubmit = computed(() => Boolean(imageData.value) && !submittingAction.value)
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

function clearResultState() {
  result.value = null
  submitError.value = ''
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
    cameraError.value = '无法访问摄像头，请改用本地图片上传'
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
    clearResultState()
  }
  reader.readAsDataURL(file)
}

function resetCapture() {
  imageData.value = ''
  uploadError.value = ''
  cameraError.value = ''
  clearResultState()
}

async function submit(action, request) {
  if (!imageData.value || submittingAction.value) {
    return
  }

  submittingAction.value = action
  submitError.value = ''

  try {
    const data = await request(imageData.value)
    result.value = {
      ...data,
      type: action,
    }
  } catch (error) {
    result.value = null
    submitError.value = error?.message || '请求失败，请稍后重试'
  } finally {
    submittingAction.value = ''
  }
}

function submitRegister() {
  return submit('register', registerFace)
}

function submitVerify() {
  return submit('verify', verifyFace)
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

@media (max-width: 768px) {
  .face-card {
    gap: 16px;
  }
}
</style>
