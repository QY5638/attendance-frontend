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

export async function fetchExceptionList(params = {}) {
  const result = await request.get('/exception/list', buildGetConfig(params))
  return unwrapBusinessResponse(result, '获取异常列表失败')
}

export async function fetchExceptionDetail(id) {
  const result = await request.get(`/exception/${id}`)
  return unwrapBusinessResponse(result, '获取异常详情失败')
}

export async function fetchExceptionDecisionTrace(id) {
  const result = await request.get(`/exception/${id}/decision-trace`)
  return unwrapBusinessResponse(result, '获取异常决策链失败')
}

export async function fetchExceptionAnalysisBrief(id) {
  const result = await request.get(`/exception/${id}/analysis-brief`)
  return unwrapBusinessResponse(result, '获取异常分析摘要失败')
}

export async function fetchExceptionRuleCheck(payload = {}) {
  const result = await request.post('/exception/rule-check', {
    recordId: payload.recordId,
  })

  return unwrapBusinessResponse(result, '规则校验失败')
}

export async function fetchExceptionComplexCheck(payload = {}) {
  const result = await request.post('/exception/complex-check', {
    recordId: payload.recordId,
    userId: payload.userId,
    riskFeatures: payload.riskFeatures,
  })

  return unwrapBusinessResponse(result, '综合识别失败')
}
