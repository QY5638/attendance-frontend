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

export async function fetchFe06WarningList(params = {}) {
  const result = await request.get('/warning/list', buildGetConfig(params))
  return unwrapBusinessResponse(result, '获取预警列表失败')
}

export async function fetchFe06WarningDashboard() {
  const result = await request.get('/warning/dashboard')
  return unwrapBusinessResponse(result, '获取预警看板失败')
}

export async function fetchFe06WarningAdvice(id) {
  const result = await request.get(`/warning/${id}/advice`)
  return unwrapBusinessResponse(result, '获取预警建议失败')
}

export async function fetchFe06WarningReevaluate(payload = {}) {
  const result = await request.post('/warning/re-evaluate', {
    warningId: payload.warningId,
    reason: payload.reason || '',
  })

  return unwrapBusinessResponse(result, '预警重评估失败')
}
