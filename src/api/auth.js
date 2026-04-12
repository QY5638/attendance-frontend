import request from '../utils/request'

const AUTH_FIELD_MESSAGE_MAP = {
  用户名不能为空: 'username',
  密码不能为空: 'password',
  刷新令牌不能为空: 'refreshToken',
}

export function createAuthError(message, field = '') {
  return {
    type: 'auth',
    field,
    message: message || '登录失败，请稍后重试',
  }
}

export function normalizeLoginErrorResponse(result = {}) {
  const response = result && typeof result === 'object' ? result : {}
  const message = response.message || '登录失败，请稍后重试'

  return createAuthError(message, AUTH_FIELD_MESSAGE_MAP[message] || '')
}

export async function loginRequest(payload) {
  const result = await request.post('/auth/login', payload)

  if (!result || typeof result !== 'object' || result.code !== 200 || !result.data) {
    throw normalizeLoginErrorResponse(result)
  }

  return result.data
}

export async function refreshTokenRequest(refreshToken) {
  const result = await request.post('/auth/refresh', { refreshToken })

  if (!result || typeof result !== 'object' || result.code !== 200 || !result.data) {
    throw createAuthError(result?.message || '登录状态已失效，请重新登录', AUTH_FIELD_MESSAGE_MAP[result?.message] || '')
  }

  return result.data
}

export async function logoutRequest(refreshToken = '') {
  const result = await request.post('/auth/logout', refreshToken ? { refreshToken } : {})

  if (!result || typeof result !== 'object' || result.code !== 200) {
    throw createAuthError(result?.message || '退出登录失败，请稍后重试')
  }

  return result.data
}
