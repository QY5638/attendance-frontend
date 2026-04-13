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

export async function fetchWarningInteractions(warningId) {
  const result = await request.get(`/warning/${warningId}/interactions`)
  return unwrapBusinessResponse(result, '获取预警交互记录失败')
}

export async function requestWarningExplanation(warningId, payload = {}) {
  const result = await request.post(`/warning/${warningId}/request-explanation`, {
    content: payload.content || '',
    deadlineHours: payload.deadlineHours,
  })
  return unwrapBusinessResponse(result, '发起说明请求失败')
}

export async function replyWarningExplanation(warningId, payload = {}) {
  const result = await request.post(`/warning/${warningId}/reply`, {
    content: payload.content || '',
  })
  return unwrapBusinessResponse(result, '提交说明失败')
}

export async function runAbsenceCheck() {
  const result = await request.post('/warning/run-absence-check', {})
  return unwrapBusinessResponse(result, '执行缺勤检查失败')
}
