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

import {
  addDepartment,
  deleteDepartment,
  fetchDepartmentList,
  updateDepartment,
} from '../../src/api/department'

describe('department api', () => {
  beforeEach(() => {
    del.mockReset()
    get.mockReset()
    post.mockReset()
    put.mockReset()
  })

  it('normalizes array department list response', async () => {
    get.mockResolvedValue({
      code: 200,
      data: [{ id: 1, name: '研发部', description: '负责系统研发' }],
    })

    await expect(fetchDepartmentList({ keyword: '研发' })).resolves.toEqual({
      total: 1,
      items: [{ id: 1, name: '研发部', description: '负责系统研发' }],
    })
  })

  it('posts add payload to add endpoint', async () => {
    post.mockResolvedValue({ code: 200, data: null })

    await addDepartment({
      name: '财务部',
      description: '负责财务管理',
    })

    expect(post).toHaveBeenCalledWith('/department/add', {
      name: '财务部',
      description: '负责财务管理',
    })
  })

  it('puts update payload to update endpoint', async () => {
    put.mockResolvedValue({ code: 200, data: null })

    await updateDepartment({
      id: 2,
      name: '人力资源部',
      description: '负责人力资源与培训',
    })

    expect(put).toHaveBeenCalledWith('/department/update', {
      id: 2,
      name: '人力资源部',
      description: '负责人力资源与培训',
    })
  })

  it('calls delete endpoint with department id', async () => {
    del.mockResolvedValue({ code: 200, data: null })

    await deleteDepartment(2)

    expect(del).toHaveBeenCalledWith('/department/2')
  })
})
