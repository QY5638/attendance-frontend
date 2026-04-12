import request from '../utils/request'

const FALLBACK_MESSAGE_MAP = {
  register: '人脸录入失败，请稍后重试',
  verify: '人脸验证失败，请稍后重试',
  status: '人脸采集状态加载失败，请稍后重试',
  apply: '人脸重录申请提交失败，请稍后重试',
}

export function createFaceError(action, message) {
  return {
    type: 'face',
    action,
    message: message || FALLBACK_MESSAGE_MAP[action] || '请求失败，请稍后重试',
  }
}

function normalizeFaceError(action, result = {}) {
  const response = result && typeof result === 'object' ? result : {}
  return createFaceError(action, response.message)
}

function trimString(value) {
  return typeof value === 'string' ? value.trim() : value
}

async function submitFace(action, url, imageData) {
  const result = await request.post(url, imageData)

  if (!result || typeof result !== 'object' || result.code !== 200 || !result.data) {
    throw normalizeFaceError(action, result)
  }

  return result.data
}

async function requestFaceData(action, requestPromise) {
  const result = await requestPromise

  if (!result || typeof result !== 'object' || result.code !== 200) {
    throw normalizeFaceError(action, result)
  }

  return result.data || {}
}

export function createFaceLivenessSession() {
  return request.post('/face/liveness/session', {})
}

export function completeFaceLiveness(payload) {
  return request.post('/face/liveness/complete', payload)
}

export function fetchFaceRegisterStatus() {
  return requestFaceData('status', request.get('/face/register-approval/status'))
}

export function submitFaceRegisterApply(reason) {
  return requestFaceData('apply', request.post('/face/register-approval/apply', {
    reason: trimString(reason),
  }))
}

export function registerFace(imageData, livenessToken = '') {
  const payload = { imageData }
  if (livenessToken) {
    payload.livenessToken = livenessToken
  }
  return submitFace('register', '/face/register', payload)
}

export function verifyFace(imageData, livenessToken = '') {
  const payload = { imageData }
  if (livenessToken) {
    payload.livenessToken = livenessToken
  }
  return submitFace('verify', '/face/verify', payload)
}
