import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { loginRequest } = vi.hoisted(() => ({
  loginRequest: vi.fn(),
}))

vi.mock('../../src/api/auth', () => ({
  loginRequest,
}))

import { useAuthStore } from '../../src/store/auth'

describe('auth store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    loginRequest.mockReset()
  })

  it('stores login payload when login succeeds', async () => {
    loginRequest.mockResolvedValue({
      token: 'token-value',
      roleCode: 'ADMIN',
      realName: '系统管理员',
    })

    const store = useAuthStore()
    await store.login({ username: 'admin', password: '123456' })

    expect(store.token).toBe('token-value')
    expect(store.roleCode).toBe('ADMIN')
    expect(store.realName).toBe('系统管理员')
    expect(store.defaultHomePath).toBe('/dashboard')
    expect(localStorage.getItem('attendance_token')).toBe('token-value')
  })

  it('rejects unsupported role and clears state', async () => {
    loginRequest.mockResolvedValue({
      token: 'token-value',
      roleCode: 'GUEST',
      realName: '游客',
    })

    const store = useAuthStore()

    await expect(store.login({ username: 'guest', password: '123456' })).rejects.toThrow(
      '当前账号暂无系统访问权限',
    )

    expect(store.token).toBe('')
    expect(store.roleCode).toBe('')
    expect(store.realName).toBe('')
  })

  it('restores persisted auth state', () => {
    localStorage.setItem('attendance_token', 'restored-token')
    localStorage.setItem('attendance_role_code', 'EMPLOYEE')
    localStorage.setItem('attendance_real_name', '张三')

    const store = useAuthStore()
    store.restore()

    expect(store.token).toBe('restored-token')
    expect(store.roleCode).toBe('EMPLOYEE')
    expect(store.realName).toBe('张三')
    expect(store.defaultHomePath).toBe('/attendance')
  })

  it('clears persisted session when restored role is unsupported', () => {
    localStorage.setItem('attendance_token', 'dirty-token')
    localStorage.setItem('attendance_role_code', 'GUEST')
    localStorage.setItem('attendance_real_name', '脏数据用户')

    const store = useAuthStore()
    store.restore()

    expect(store.token).toBe('')
    expect(store.roleCode).toBe('')
    expect(store.realName).toBe('')
    expect(store.isAuthenticated).toBe(false)
    expect(localStorage.getItem('attendance_token')).toBeNull()
    expect(localStorage.getItem('attendance_role_code')).toBeNull()
    expect(localStorage.getItem('attendance_real_name')).toBeNull()
  })

  it('clears session through clearSession action', () => {
    const store = useAuthStore()
    store.token = 'token-value'
    store.roleCode = 'ADMIN'
    store.realName = '系统管理员'
    localStorage.setItem('attendance_token', 'token-value')
    localStorage.setItem('attendance_role_code', 'ADMIN')
    localStorage.setItem('attendance_real_name', '系统管理员')

    store.clearSession()

    expect(store.token).toBe('')
    expect(store.roleCode).toBe('')
    expect(store.realName).toBe('')
    expect(localStorage.getItem('attendance_token')).toBeNull()
    expect(localStorage.getItem('attendance_role_code')).toBeNull()
    expect(localStorage.getItem('attendance_real_name')).toBeNull()
  })

  it('clears state and storage on logout', () => {
    const store = useAuthStore()
    store.token = 'token-value'
    store.roleCode = 'ADMIN'
    store.realName = '系统管理员'
    localStorage.setItem('attendance_token', 'token-value')

    store.logout()

    expect(store.token).toBe('')
    expect(store.roleCode).toBe('')
    expect(store.realName).toBe('')
    expect(localStorage.getItem('attendance_token')).toBeNull()
  })
})
