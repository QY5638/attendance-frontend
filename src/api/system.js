import request from '../utils/request'

function createSystemError(message) {
  return {
    type: 'system',
    field: '',
    message: message || '系统配置操作失败，请稍后重试',
  }
}

function ensureSuccess(result) {
  if (!result || typeof result !== 'object' || result.code !== 200) {
    throw createSystemError(result?.message)
  }

  return result
}

function normalizeListData(data) {
  if (Array.isArray(data)) {
    return {
      total: data.length,
      items: data,
    }
  }

  if (data && Array.isArray(data.records)) {
    return {
      total: Number(data.total || data.records.length),
      items: data.records,
    }
  }

  return {
    total: 0,
    items: [],
  }
}

function trimString(value) {
  return typeof value === 'string' ? value.trim() : value
}

function normalizeCoordinate(value) {
  if (typeof value !== 'string') {
    return value
  }

  const trimmed = value.trim()
  return trimmed === '' ? undefined : trimmed
}

function compactPayload(payload = {}) {
  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined && value !== null && value !== ''),
  )
}

function normalizeDevicePayload(payload = {}) {
  return compactPayload({
    deviceId: trimString(payload.deviceId),
    name: trimString(payload.name),
    location: trimString(payload.location),
    longitude: normalizeCoordinate(payload.longitude),
    latitude: normalizeCoordinate(payload.latitude),
    description: trimString(payload.description),
    status: payload.status,
  })
}

function normalizeRulePayload(payload = {}) {
  return compactPayload({
    id: payload.id,
    name: trimString(payload.name),
    startTime: trimString(payload.startTime),
    endTime: trimString(payload.endTime),
    lateThreshold: payload.lateThreshold,
    earlyThreshold: payload.earlyThreshold,
    repeatLimit: payload.repeatLimit,
    status: payload.status,
  })
}

function normalizeConfigPayload(payload = {}) {
  return compactPayload({
    code: trimString(payload.code),
    name: trimString(payload.name),
    description: trimString(payload.description),
    status: payload.status,
  })
}

function normalizeListQuery(params = {}) {
  return compactPayload({
    pageNum: params.pageNum,
    pageSize: params.pageSize,
    keyword: trimString(params.keyword),
    status: params.status,
    userId: params.userId,
    type: trimString(params.type),
    startDate: trimString(params.startDate),
    endDate: trimString(params.endDate),
  })
}

export async function fetchDeviceList(params = {}) {
  const result = ensureSuccess(await request.get('/device/list', { params: normalizeListQuery(params) }))
  return normalizeListData(result.data)
}

export async function addDevice(payload) {
  const result = ensureSuccess(await request.post('/device/add', normalizeDevicePayload(payload)))
  return result.data ?? null
}

export async function updateDevice(payload) {
  const result = ensureSuccess(await request.put('/device/update', normalizeDevicePayload(payload)))
  return result.data ?? null
}

export async function updateDeviceStatus(payload) {
  const result = ensureSuccess(await request.put('/device/status', {
    deviceId: trimString(payload?.deviceId),
    status: payload?.status,
  }))
  return result.data ?? null
}

export async function deleteDevice(deviceId) {
  const result = ensureSuccess(await request.delete(`/device/${deviceId}`))
  return result.data ?? null
}

export async function fetchRuleList(params = {}) {
  const result = ensureSuccess(await request.get('/rule/list', { params: normalizeListQuery(params) }))
  return normalizeListData(result.data)
}

export async function addRule(payload) {
  const result = ensureSuccess(await request.post('/rule/add', normalizeRulePayload(payload)))
  return result.data ?? null
}

export async function updateRule(payload) {
  const result = ensureSuccess(await request.put('/rule/update', normalizeRulePayload(payload)))
  return result.data ?? null
}

export async function updateRuleStatus(payload) {
  const result = ensureSuccess(await request.put('/rule/status', {
    id: payload?.id,
    status: payload?.status,
  }))
  return result.data ?? null
}

export async function fetchRiskLevelList(params = {}) {
  const result = ensureSuccess(await request.get('/system/risk-level/list', { params: normalizeListQuery(params) }))
  return normalizeListData(result.data)
}

export async function updateRiskLevel(payload) {
  const result = ensureSuccess(await request.put('/system/risk-level/update', normalizeConfigPayload(payload)))
  return result.data ?? null
}

export async function fetchExceptionTypeList(params = {}) {
  const result = ensureSuccess(await request.get('/system/exception-type/list', { params: normalizeListQuery(params) }))
  return normalizeListData(result.data)
}

export async function updateExceptionType(payload) {
  const result = ensureSuccess(await request.put('/system/exception-type/update', normalizeConfigPayload(payload)))
  return result.data ?? null
}

export async function fetchOperationLogList(params = {}) {
  const result = ensureSuccess(await request.get('/log/operation/list', { params: normalizeListQuery(params) }))
  return normalizeListData(result.data)
}
