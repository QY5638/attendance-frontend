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

function buildGetConfig(params = {}, extra = {}) {
  const hasParams = params && Object.keys(params).length > 0
  const config = hasParams ? { ...extra, params } : { ...extra }

  return Object.keys(config).length ? config : undefined
}

export async function fetchPersonalStatistics(params = {}) {
  const result = await request.get('/statistics/personal', buildGetConfig(params))
  return unwrapBusinessResponse(result, '获取个人统计失败')
}

export async function fetchDepartmentStatistics(params = {}) {
  const result = await request.get('/statistics/department', buildGetConfig(params))
  return unwrapBusinessResponse(result, '获取部门统计失败')
}

export async function fetchExceptionTrend(params = {}) {
  const result = await request.get('/statistics/exception-trend', buildGetConfig(params))
  return unwrapBusinessResponse(result, '获取异常趋势失败')
}

export async function fetchStatisticsSummary(params = {}) {
  const result = await request.get('/statistics/summary', buildGetConfig(params))
  return unwrapBusinessResponse(result, '获取统计摘要失败')
}

export async function fetchDepartmentRiskBrief(params = {}) {
  const result = await request.get('/statistics/department-risk-brief', buildGetConfig(params))
  return unwrapBusinessResponse(result, '获取部门风险画像失败')
}

export function exportStatisticsReport(params = {}) {
  return request.get('/statistics/export', buildGetConfig(params, { responseType: 'blob' }))
}
