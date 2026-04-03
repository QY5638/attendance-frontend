import request from '../utils/request'

const AUTH_FIELD_MESSAGE_MAP = {
  用户名不能为空: 'username',
  密码不能为空: 'password',
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
