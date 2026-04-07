import request from '../utils/request'

function createDepartmentError(message) {
  return {
    type: 'department',
    field: '',
    message: message || '部门操作失败，请稍后重试',
  }
}

function ensureSuccess(result) {
  if (!result || typeof result !== 'object' || result.code !== 200) {
    throw createDepartmentError(result?.message)
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

export async function fetchDepartmentList(params = {}) {
  const result = ensureSuccess(await request.get('/department/list', { params }))
  return normalizeListData(result.data)
}

export async function addDepartment(payload) {
  const result = ensureSuccess(await request.post('/department/add', {
    name: payload.name?.trim(),
    description: payload.description?.trim(),
  }))

  return result.data ?? null
}

export async function updateDepartment(payload) {
  const result = ensureSuccess(await request.put('/department/update', {
    id: payload.id,
    name: payload.name?.trim(),
    description: payload.description?.trim(),
  }))

  return result.data ?? null
}

export async function deleteDepartment(id) {
  const result = ensureSuccess(await request.delete(`/department/${id}`))
  return result.data ?? null
}
