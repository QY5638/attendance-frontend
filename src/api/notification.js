import request from '../utils/request'

function createApiError(message) {
  return {
    type: 'api',
    field: '',
    message: message || '请求失败，请稍后重试',
  }
}

function unwrapBusinessResponse(result, fallbackMessage) {
  if (!result || typeof result !== 'object' || result.code !== 200) {
    throw createApiError(result?.message || fallbackMessage)
  }

  return result.data
}

function buildGetConfig(params = {}) {
  if (!params || Object.keys(params).length === 0) {
    return undefined
  }

  return { params }
}

function buildStreamBaseUrl() {
  const baseUrl = import.meta.env.VITE_API_BASE_URL || '/api'

  if (typeof window === 'undefined') {
    return baseUrl.replace(/\/$/, '')
  }

  return new URL(baseUrl.replace(/\/$/, ''), window.location.origin).toString().replace(/\/$/, '')
}

export async function fetchNotificationList(params = {}) {
  const result = await request.get('/notification/list', buildGetConfig(params))
  return unwrapBusinessResponse(result, '获取通知列表失败')
}

export async function fetchNotificationUnreadCount() {
  const result = await request.get('/notification/unread-count')
  return unwrapBusinessResponse(result, '获取未读通知数失败')
}

export async function fetchNotificationDetail(id) {
  const result = await request.get(`/notification/${id}`)
  return unwrapBusinessResponse(result, '获取通知详情失败')
}

export async function markNotificationRead(id) {
  const result = await request.post(`/notification/${id}/read`, {})
  return unwrapBusinessResponse(result, '标记通知已读失败')
}

export async function markAllNotificationsRead() {
  const result = await request.post('/notification/read-all', {})
  return unwrapBusinessResponse(result, '全部标记已读失败')
}

export function openNotificationStream(token) {
  if (typeof EventSource === 'undefined') {
    throw new Error('当前环境不支持实时通知')
  }

  const streamUrl = `${buildStreamBaseUrl()}/notification/stream?token=${encodeURIComponent(token || '')}`
  return new EventSource(streamUrl)
}
