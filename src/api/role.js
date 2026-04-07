import request from '../utils/request'

function createRoleError(message) {
  return {
    type: 'role',
    field: '',
    message: message || '角色操作失败，请稍后重试',
  }
}

function ensureSuccess(result) {
  if (!result || typeof result !== 'object' || result.code !== 200) {
    throw createRoleError(result?.message)
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

export async function fetchRoleList(params = {}) {
  const result = ensureSuccess(await request.get('/role/list', { params }))
  return normalizeListData(result.data)
}

export async function addRole(payload) {
  const result = ensureSuccess(await request.post('/role/add', {
    code: payload.code?.trim(),
    name: payload.name?.trim(),
    description: payload.description?.trim(),
    status: payload.status,
  }))

  return result.data ?? null
}

export async function updateRole(payload) {
  const result = ensureSuccess(await request.put('/role/update', {
    id: payload.id,
    code: payload.code?.trim(),
    name: payload.name?.trim(),
    description: payload.description?.trim(),
    status: payload.status,
  }))

  return result.data ?? null
}

export async function deleteRole(id) {
  const result = ensureSuccess(await request.delete(`/role/${id}`))
  return result.data ?? null
}
