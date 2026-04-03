import { beforeEach, describe, expect, it, vi } from 'vitest'

const { post } = vi.hoisted(() => ({ post: vi.fn() }))

vi.mock('../../src/utils/request', () => ({
  default: {
    post,
  },
}))

import { loginRequest } from '../../src/api/auth'

describe('auth api', () => {
  beforeEach(() => {
    post.mockReset()
  })

  it('maps username blank response to field level auth error', async () => {
    post.mockResolvedValue({ code: 400, message: '用户名不能为空' })

    await expect(loginRequest({ username: '', password: '123456' })).rejects.toMatchObject({
      type: 'auth',
      field: 'username',
      message: '用户名不能为空',
    })
  })

  it('maps password blank response to field level auth error', async () => {
    post.mockResolvedValue({ code: 400, message: '密码不能为空' })

    await expect(loginRequest({ username: 'admin', password: '' })).rejects.toMatchObject({
      type: 'auth',
      field: 'password',
      message: '密码不能为空',
    })
  })

  it('maps generic auth failure without field', async () => {
    post.mockResolvedValue({ code: 400, message: '账号已禁用' })

    await expect(loginRequest({ username: 'disabled', password: '123456' })).rejects.toMatchObject({
      type: 'auth',
      field: '',
      message: '账号已禁用',
    })
  })

  it('keeps login success payload unchanged', async () => {
    post.mockResolvedValue({
      code: 200,
      data: { token: 'token-value', roleCode: 'ADMIN', realName: '系统管理员' },
    })

    await expect(loginRequest({ username: 'admin', password: '123456' })).resolves.toEqual({
      token: 'token-value',
      roleCode: 'ADMIN',
      realName: '系统管理员',
    })
  })

  it('rejects missing login data even when response code is 200', async () => {
    post.mockResolvedValue({ code: 200 })

    await expect(loginRequest({ username: 'admin', password: '123456' })).rejects.toMatchObject({
      type: 'auth',
      field: '',
      message: '登录失败，请稍后重试',
    })
  })

  it.each([undefined, null])('rejects %s login response with fallback auth error', async (result) => {
    post.mockResolvedValue(result)

    await expect(loginRequest({ username: 'admin', password: '123456' })).rejects.toMatchObject({
      type: 'auth',
      field: '',
      message: '登录失败，请稍后重试',
    })
  })
})
