import request from '../utils/request'

function createUserError(message) {
  return {
    type: 'user',
    field: '',
    message: message || '用户操作失败，请稍后重试',
  }
}

function ensureSuccess(result) {
  if (!result || typeof result !== 'object' || result.code !== 200) {
    throw createUserError(result?.message)
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

function normalizeUserPayload(payload = {}, isEdit = false) {
  const next = {
    id: payload.id,
    username: payload.username?.trim(),
    realName: payload.realName?.trim(),
    gender: payload.gender,
    phone: payload.phone?.trim(),
    deptId: payload.deptId,
    roleId: payload.roleId,
    status: payload.status,
  }

  const password = payload.password?.trim()
  if (!isEdit || password) {
    next.password = password
  }

  return Object.fromEntries(Object.entries(next).filter(([, value]) => value !== undefined))
}

function normalizeProfilePayload(payload = {}) {
  return Object.fromEntries(Object.entries({
    realName: payload.realName?.trim(),
    gender: payload.gender,
    phone: payload.phone?.trim(),
    password: payload.password?.trim(),
  }).filter(([, value]) => value !== undefined))
}

export async function fetchUserList(params = {}) {
  const result = ensureSuccess(await request.get('/user/list', { params }))
  return normalizeListData(result.data)
}

export async function addUser(payload) {
  const result = ensureSuccess(await request.post('/user/add', normalizeUserPayload(payload)))
  return result.data ?? null
}

export async function updateUser(payload) {
  const result = ensureSuccess(await request.put('/user/update', normalizeUserPayload(payload, true)))
  return result.data ?? null
}

export async function fetchCurrentUserProfile() {
  const result = ensureSuccess(await request.get('/user/me'))
  return result.data ?? null
}

export async function updateCurrentUserProfile(payload) {
  const result = ensureSuccess(await request.put('/user/me', normalizeProfilePayload(payload)))
  return result.data ?? null
}

export async function deleteUser(id) {
  const result = ensureSuccess(await request.delete(`/user/${id}`))
  return result.data ?? null
}
