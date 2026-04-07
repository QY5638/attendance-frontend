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

import { addUser, deleteUser, fetchUserList, updateUser } from '../../src/api/user'

describe('user api', () => {
  beforeEach(() => {
    del.mockReset()
    get.mockReset()
    post.mockReset()
    put.mockReset()
  })

  it('normalizes array list response', async () => {
    get.mockResolvedValue({
      code: 200,
      data: [{ id: 1, username: 'zhangsan' }],
    })

    await expect(fetchUserList({ pageNum: 1, pageSize: 10 })).resolves.toEqual({
      total: 1,
      items: [{ id: 1, username: 'zhangsan' }],
    })
  })

  it('normalizes paged list response', async () => {
    get.mockResolvedValue({
      code: 200,
      data: {
        total: 3,
        records: [{ id: 1, username: 'zhangsan' }],
      },
    })

    await expect(fetchUserList({ pageNum: 1, pageSize: 10 })).resolves.toEqual({
      total: 3,
      items: [{ id: 1, username: 'zhangsan' }],
    })
  })

  it('omits blank password on update', async () => {
    put.mockResolvedValue({ code: 200, data: null })

    await updateUser({
      id: 1,
      username: 'zhangsan',
      password: '   ',
      realName: '张三',
      gender: '男',
      phone: '13800000000',
      deptId: 2,
      roleId: 3,
      status: 1,
    })

    expect(put).toHaveBeenCalledWith('/user/update', {
      id: 1,
      username: 'zhangsan',
      realName: '张三',
      gender: '男',
      phone: '13800000000',
      deptId: 2,
      roleId: 3,
      status: 1,
    })
  })

  it('posts add payload to add endpoint', async () => {
    post.mockResolvedValue({ code: 200, data: null })

    await addUser({
      username: 'lisi',
      password: '123456',
      realName: '李四',
      gender: '女',
      phone: '13800000001',
      deptId: 1,
      roleId: 2,
      status: 1,
    })

    expect(post).toHaveBeenCalledWith('/user/add', {
      username: 'lisi',
      password: '123456',
      realName: '李四',
      gender: '女',
      phone: '13800000001',
      deptId: 1,
      roleId: 2,
      status: 1,
    })
  })

  it('calls delete endpoint with user id', async () => {
    del.mockResolvedValue({ code: 200, data: null })

    await deleteUser(1001)

    expect(del).toHaveBeenCalledWith('/user/1001')
  })
})
