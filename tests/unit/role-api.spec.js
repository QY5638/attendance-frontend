import { beforeEach, describe, expect, it, vi } from 'vitest'

const { del, get, post, put } = vi.hoisted(() => ({
  del: vi.fn(),
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
}))

vi.mock('../../src/utils/request', () => ({
  default: {
    get,
    post,
    put,
    delete: del,
  },
}))

import { addRole, deleteRole, fetchRoleList, updateRole } from '../../src/api/role'

describe('role api', () => {
  beforeEach(() => {
    del.mockReset()
    get.mockReset()
    post.mockReset()
    put.mockReset()
  })

  it('normalizes paged role list response', async () => {
    get.mockResolvedValue({
      code: 200,
      data: {
        total: 2,
        records: [{ id: 1, code: 'ADMIN', name: '管理员', status: 1 }],
      },
    })

    await expect(fetchRoleList({ pageNum: 1, pageSize: 10 })).resolves.toEqual({
      total: 2,
      items: [{ id: 1, code: 'ADMIN', name: '管理员', status: 1 }],
    })
  })

  it('posts add payload to add endpoint', async () => {
    post.mockResolvedValue({ code: 200, data: null })

    await addRole({
      code: 'HR',
      name: '人事专员',
      description: '负责人事与考勤管理',
      status: 1,
    })

    expect(post).toHaveBeenCalledWith('/role/add', {
      code: 'HR',
      name: '人事专员',
      description: '负责人事与考勤管理',
      status: 1,
    })
  })

  it('puts update payload to update endpoint', async () => {
    put.mockResolvedValue({ code: 200, data: null })

    await updateRole({
      id: 2,
      code: 'HR',
      name: '人事主管',
      description: '负责人事、考勤与复核管理',
      status: 1,
    })

    expect(put).toHaveBeenCalledWith('/role/update', {
      id: 2,
      code: 'HR',
      name: '人事主管',
      description: '负责人事、考勤与复核管理',
      status: 1,
    })
  })

  it('calls delete endpoint with role id', async () => {
    del.mockResolvedValue({ code: 200, data: null })

    await deleteRole(2)

    expect(del).toHaveBeenCalledWith('/role/2')
  })
})
