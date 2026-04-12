function resolveStaticAssetPath(relativePath) {
  const base = import.meta.env.BASE_URL || '/'
  return `${base.replace(/\/$/, '')}/${relativePath.replace(/^\//, '')}`
}

let faceLandmarkerPromise = null

const BASELINE_SAMPLE_COUNT = 20
const ACTION_TRANSITION_HOLD_MS = 1200
const MAX_CHALLENGE_DURATION_MS = 60000

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

function distance(pointA, pointB) {
  const deltaX = (pointA?.x || 0) - (pointB?.x || 0)
  const deltaY = (pointA?.y || 0) - (pointB?.y || 0)
  return Math.sqrt(deltaX * deltaX + deltaY * deltaY)
}

function averagePoint(landmarks, indexes) {
  const total = indexes.reduce(
    (accumulator, index) => {
      const point = landmarks[index] || { x: 0, y: 0 }
      accumulator.x += point.x
      accumulator.y += point.y
      return accumulator
    },
    { x: 0, y: 0 },
  )

  return {
    x: total.x / indexes.length,
    y: total.y / indexes.length,
  }
}

function normalizeScore(value, start, end) {
  if (!Number.isFinite(value)) {
    return 0
  }

  if (value <= start) {
    return 0
  }

  if (value >= end) {
    return 1
  }

  return (value - start) / (end - start)
}

function createBlendshapeMap(categories = []) {
  return categories.reduce((accumulator, category) => {
    accumulator[category.categoryName] = category.score
    return accumulator
  }, {})
}

function captureVideoFrame(videoElement) {
  const canvas = document.createElement('canvas')
  canvas.width = videoElement.videoWidth || 640
  canvas.height = videoElement.videoHeight || 480
  const context = canvas.getContext('2d')

  if (!context) {
    throw new Error('当前环境暂不支持活体抓拍，请改用兼容浏览器')
  }

  context.drawImage(videoElement, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL('image/png')
}

function createStepState() {
  return {
    closed: false,
    holdFrames: 0,
    bestScore: 0,
    stableFrames: 0,
  }
}

function createQualityCanvas() {
  const canvas = document.createElement('canvas')
  canvas.width = 48
  canvas.height = 36
  const context = canvas.getContext('2d', { willReadFrequently: true })
  return context ? { canvas, context } : null
}

function estimateBrightness(videoElement, qualityCanvas) {
  if (!qualityCanvas?.context) {
    return null
  }

  const { canvas, context } = qualityCanvas
  context.drawImage(videoElement, 0, 0, canvas.width, canvas.height)
  const imageData = context.getImageData(0, 0, canvas.width, canvas.height).data
  let total = 0

  for (let index = 0; index < imageData.length; index += 4) {
    total += imageData[index] * 0.299 + imageData[index + 1] * 0.587 + imageData[index + 2] * 0.114
  }

  return total / Math.max(imageData.length / 4, 1)
}

function buildFaceBounds(landmarks) {
  return landmarks.reduce(
    (bounds, point) => ({
      minX: Math.min(bounds.minX, point?.x ?? 1),
      maxX: Math.max(bounds.maxX, point?.x ?? 0),
      minY: Math.min(bounds.minY, point?.y ?? 1),
      maxY: Math.max(bounds.maxY, point?.y ?? 0),
    }),
    { minX: 1, maxX: 0, minY: 1, maxY: 0 },
  )
}

function evaluateFrameQuality(landmarks, videoElement, qualityCanvas) {
  const bounds = buildFaceBounds(landmarks)
  const widthRatio = bounds.maxX - bounds.minX
  const heightRatio = bounds.maxY - bounds.minY
  const centerX = (bounds.minX + bounds.maxX) / 2
  const centerY = (bounds.minY + bounds.maxY) / 2
  const leftEyeCenter = averagePoint(landmarks, [33, 133])
  const rightEyeCenter = averagePoint(landmarks, [263, 362])
  const rollRadians = Math.atan2(rightEyeCenter.y - leftEyeCenter.y, rightEyeCenter.x - leftEyeCenter.x)
  const brightness = estimateBrightness(videoElement, qualityCanvas)

  if (widthRatio < 0.2 || heightRatio < 0.24) {
    return { passed: false, message: '请靠近摄像头一些，确保脸部占据画面主体' }
  }

  if (widthRatio > 0.78 || heightRatio > 0.88) {
    return { passed: false, message: '请稍微远离摄像头，避免脸部过近导致识别不稳定' }
  }

  if (centerX < 0.34 || centerX > 0.66 || centerY < 0.28 || centerY > 0.72) {
    return { passed: false, message: '请将脸部移动到画面中央并保持稳定' }
  }

  if (Math.abs(rollRadians) > 0.3) {
    return { passed: false, message: '请保持头部水平，不要明显歪头' }
  }

  if (Number.isFinite(brightness) && brightness < 48) {
    return { passed: false, message: '当前画面偏暗，请补充光线后重试' }
  }

  if (Number.isFinite(brightness) && brightness > 225) {
    return { passed: false, message: '当前画面过亮，请避免强逆光或直射灯光' }
  }

  return {
    passed: true,
    message: '画面稳定，正在识别动作...',
    brightness: Number.isFinite(brightness) ? brightness : null,
  }
}

function buildMetrics(landmarks, blendshapeMap) {
  const leftEyeWidth = distance(landmarks[33], landmarks[133])
  const rightEyeWidth = distance(landmarks[263], landmarks[362])
  const leftEyeOpenness = distance(landmarks[159], landmarks[145]) / Math.max(leftEyeWidth, 1e-6)
  const rightEyeOpenness = distance(landmarks[386], landmarks[374]) / Math.max(rightEyeWidth, 1e-6)
  const eyeOpenness = (leftEyeOpenness + rightEyeOpenness) / 2

  const mouthWidth = distance(landmarks[78], landmarks[308])
  const mouthOpenness = distance(landmarks[13], landmarks[14]) / Math.max(mouthWidth, 1e-6)

  const leftEyeCenter = averagePoint(landmarks, [33, 133])
  const rightEyeCenter = averagePoint(landmarks, [263, 362])
  const noseTip = landmarks[1] || averagePoint(landmarks, [1, 4])
  const yawRatio = (noseTip.x - leftEyeCenter.x) / Math.max(rightEyeCenter.x - leftEyeCenter.x, 1e-6)

  return {
    eyeOpenness,
    mouthOpenness,
    yawRatio,
    blinkBlend: Math.max(blendshapeMap.eyeBlinkLeft || 0, blendshapeMap.eyeBlinkRight || 0),
    mouthBlend: Math.max(blendshapeMap.mouthOpen || 0, blendshapeMap.jawOpen || 0),
  }
}

function describeRunningMessage(action, score) {
  const percentage = `${Math.round(Math.max(0, Math.min(score, 1)) * 100)}%`

  switch (action) {
    case 'BLINK':
      return `请快速眨眼，当前完成度 ${percentage}`
    case 'TURN_LEFT':
      return `请按你自己的方向向左转头，当前完成度 ${percentage}`
    case 'TURN_RIGHT':
      return `请按你自己的方向向右转头，当前完成度 ${percentage}`
    case 'MOUTH_OPEN':
      return `请自然张嘴，当前完成度 ${percentage}`
    default:
      return '请根据提示完成动作'
  }
}

function evaluateBlink(metrics, baseline, stepState) {
  const closureScore = Math.max(
    normalizeScore(metrics.blinkBlend, 0.35, 0.85),
    normalizeScore(baseline.eyeOpenness - metrics.eyeOpenness, baseline.eyeOpenness * 0.18, baseline.eyeOpenness * 0.52),
  )

  stepState.bestScore = Math.max(stepState.bestScore, closureScore)
  if (closureScore > 0.55) {
    stepState.closed = true
    stepState.stableFrames += 1
  }

  const reopened = stepState.closed && metrics.eyeOpenness >= baseline.eyeOpenness * 0.82 && metrics.blinkBlend < 0.25
  return {
    score: stepState.bestScore,
    completed: reopened && stepState.bestScore >= 0.68 && stepState.stableFrames >= 4,
    message: describeRunningMessage('BLINK', stepState.bestScore),
  }
}

function evaluateMouthOpen(metrics, baseline, stepState) {
  const ratioScore = normalizeScore(metrics.mouthOpenness / Math.max(baseline.mouthOpenness, 1e-6), 1.55, 2.45)
  const blendScore = normalizeScore(metrics.mouthBlend, 0.32, 0.86)
  const score = Math.max(ratioScore, blendScore)

  stepState.bestScore = Math.max(stepState.bestScore, score)
  if (score > 0.6) {
    stepState.holdFrames += 1
    stepState.stableFrames += 1
  } else {
    stepState.holdFrames = 0
  }

  return {
    score: stepState.bestScore,
    completed: stepState.holdFrames >= 6 && stepState.bestScore >= 0.68,
    message: describeRunningMessage('MOUTH_OPEN', stepState.bestScore),
  }
}

function evaluateTurn(action, metrics, baseline, stepState) {
  const delta = metrics.yawRatio - baseline.yawRatio
  // 左右转头按采集者自己的方向判断，而不是按屏幕左右判断。
  const signedDelta = action === 'TURN_LEFT' ? delta : baseline.yawRatio - metrics.yawRatio
  const score = normalizeScore(signedDelta, 0.08, 0.24)

  stepState.bestScore = Math.max(stepState.bestScore, score)
  if (score > 0.65) {
    stepState.holdFrames += 1
    stepState.stableFrames += 1
  } else {
    stepState.holdFrames = 0
  }

  return {
    score: stepState.bestScore,
    completed: stepState.holdFrames >= 6 && stepState.bestScore >= 0.72,
    message: describeRunningMessage(action, stepState.bestScore),
  }
}

function evaluateAction(action, metrics, baseline, stepState) {
  switch (action) {
    case 'BLINK':
      return evaluateBlink(metrics, baseline, stepState)
    case 'TURN_LEFT':
    case 'TURN_RIGHT':
      return evaluateTurn(action, metrics, baseline, stepState)
    case 'MOUTH_OPEN':
      return evaluateMouthOpen(metrics, baseline, stepState)
    default:
      return {
        score: 0,
        completed: false,
        message: '未知活体动作，请重新开始挑战',
      }
  }
}

async function getFaceLandmarker() {
  if (!faceLandmarkerPromise) {
    faceLandmarkerPromise = (async () => {
      const { FaceLandmarker, FilesetResolver } = await import('@mediapipe/tasks-vision')
      const vision = await FilesetResolver.forVisionTasks(resolveStaticAssetPath('mediapipe/wasm'))

      return FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: resolveStaticAssetPath('models/face_landmarker.task'),
        },
        runningMode: 'VIDEO',
        numFaces: 1,
        outputFaceBlendshapes: true,
      })
    })()
  }

  return faceLandmarkerPromise
}

async function waitForVideoReady(videoElement) {
  if (videoElement.readyState >= 2 && videoElement.videoWidth > 0 && videoElement.videoHeight > 0) {
    return
  }

  await new Promise((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      cleanup()
      reject(new Error('摄像头画面尚未就绪，请稍后重试'))
    }, 5000)

    function cleanup() {
      window.clearTimeout(timeoutId)
      videoElement.removeEventListener('loadeddata', handleReady)
      videoElement.removeEventListener('playing', handleReady)
    }

    function handleReady() {
      cleanup()
      resolve()
    }

    videoElement.addEventListener('loadeddata', handleReady)
    videoElement.addEventListener('playing', handleReady)
  })
}

export function describeLivenessAction(action) {
  switch (String(action || '').toUpperCase()) {
    case 'BLINK':
      return '快速眨眼'
    case 'TURN_LEFT':
      return '向左转头'
    case 'TURN_RIGHT':
      return '向右转头'
    case 'MOUTH_OPEN':
      return '自然张嘴'
    default:
      return action || '未知动作'
  }
}

export async function runFaceLivenessChallenge({ videoElement, actions = [], onProgress } = {}) {
  if (!videoElement) {
    throw new Error('请先开启摄像头后再进行活体挑战')
  }

  const normalizedActions = actions.length
    ? actions.map((action) => String(action || '').trim().toUpperCase()).filter(Boolean)
    : ['BLINK', 'TURN_LEFT', 'MOUTH_OPEN']

  await waitForVideoReady(videoElement)
  let faceLandmarker

  try {
    faceLandmarker = await getFaceLandmarker()
  } catch {
    throw new Error('活体模型加载失败，请确认当前浏览器支持 WebAssembly 并刷新页面重试')
  }

  return new Promise((resolve, reject) => {
    let animationFrameId = 0
    let lastVideoTime = -1
    let lastActionTransitionAt = 0
    const startedAt = Date.now()
    const baselineSamples = []
    const completedActions = []
    const actionScores = {}
    let currentStepIndex = 0
    let stableFaceFrames = 0
    let sampleCount = 0
    let stepState = createStepState()
    const qualityCanvas = createQualityCanvas()

    function pushProgress(patch = {}) {
      onProgress?.({
        actions: normalizedActions,
        currentIndex: currentStepIndex,
        currentAction: normalizedActions[currentStepIndex] || '',
        completedActions: [...completedActions],
        sampleCount,
        stableFaceFrames,
        ...patch,
      })
    }

    function finish(error) {
      if (animationFrameId) {
        window.cancelAnimationFrame(animationFrameId)
      }
      if (error) {
        reject(error)
      }
    }

    async function loop() {
      try {
        if (Date.now() - startedAt > MAX_CHALLENGE_DURATION_MS) {
          finish(new Error('活体挑战超时，请保持正对摄像头后重新开始'))
          return
        }

        if (videoElement.readyState < 2 || videoElement.videoWidth === 0 || videoElement.videoHeight === 0) {
          pushProgress({ phase: 'waiting', message: '正在等待摄像头画面就绪...' })
          animationFrameId = window.requestAnimationFrame(loop)
          return
        }

        if (videoElement.currentTime === lastVideoTime) {
          animationFrameId = window.requestAnimationFrame(loop)
          return
        }
        lastVideoTime = videoElement.currentTime

        const result = faceLandmarker.detectForVideo(videoElement, performance.now())
        const faceLandmarks = result?.faceLandmarks || []
        if (faceLandmarks.length !== 1) {
          pushProgress({ phase: 'detecting', message: faceLandmarks.length > 1 ? '请保持镜头内仅有一人' : '请正对摄像头并确保光线充足' })
          animationFrameId = window.requestAnimationFrame(loop)
          return
        }

        const landmarks = faceLandmarks[0]
        const blendshapeMap = createBlendshapeMap(result?.faceBlendshapes?.[0]?.categories || [])
        const metrics = buildMetrics(landmarks, blendshapeMap)
        const quality = evaluateFrameQuality(landmarks, videoElement, qualityCanvas)

        if (!quality.passed) {
          pushProgress({ phase: 'positioning', message: quality.message })
          animationFrameId = window.requestAnimationFrame(loop)
          return
        }

        sampleCount += 1
        stableFaceFrames += 1

        if (baselineSamples.length < BASELINE_SAMPLE_COUNT) {
          baselineSamples.push(metrics)
          pushProgress({ phase: 'calibrating', message: `正在建立活体基线（${baselineSamples.length}/${BASELINE_SAMPLE_COUNT}）...` })
          animationFrameId = window.requestAnimationFrame(loop)
          return
        }

        const baseline = baselineSamples.reduce(
          (accumulator, item) => {
            accumulator.eyeOpenness += item.eyeOpenness
            accumulator.mouthOpenness += item.mouthOpenness
            accumulator.yawRatio += item.yawRatio
            return accumulator
          },
          { eyeOpenness: 0, mouthOpenness: 0, yawRatio: 0 },
        )
        baseline.eyeOpenness /= baselineSamples.length
        baseline.mouthOpenness /= baselineSamples.length
        baseline.yawRatio /= baselineSamples.length

        if (Date.now() - lastActionTransitionAt < ACTION_TRANSITION_HOLD_MS) {
          pushProgress({ phase: 'transition', message: '动作已识别，请保持稳定并准备下一步...' })
          animationFrameId = window.requestAnimationFrame(loop)
          return
        }

        const currentAction = normalizedActions[currentStepIndex]
        const evaluation = evaluateAction(currentAction, metrics, baseline, stepState)
        pushProgress({ phase: 'running', message: evaluation.message, score: Number(evaluation.score.toFixed(4)) })

        if (evaluation.completed) {
          completedActions.push(currentAction)
          actionScores[currentAction] = Number(Math.max(evaluation.score, stepState.bestScore).toFixed(4))
          currentStepIndex += 1
          stepState = createStepState()
          lastActionTransitionAt = Date.now()

          if (currentStepIndex >= normalizedActions.length) {
            const imageData = captureVideoFrame(videoElement)
            const completedAt = Date.now()
            if (animationFrameId) {
              window.cancelAnimationFrame(animationFrameId)
            }
            resolve({
              imageData,
              completedActions,
              actionScores,
              sampleCount,
              stableFaceFrames,
              startedAt,
              completedAt,
            })
            return
          }
        }

        animationFrameId = window.requestAnimationFrame(loop)
      } catch (error) {
        finish(error)
      }
    }

    pushProgress({ phase: 'starting', message: '活体挑战即将开始，请保持正对摄像头' })
    animationFrameId = window.requestAnimationFrame(loop)
  })
}
