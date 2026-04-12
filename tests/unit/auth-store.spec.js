import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { createAuthError, loginRequest, logoutRequest } = vi.hoisted(() => ({
  createAuthError: vi.fn((message, field = '') => ({
    type: 'auth',
    field,
    message,
  })),
  loginRequest: vi.fn(),
  logoutRequest: vi.fn(),
}))

vi.mock('../../src/api/auth', () => ({
  createAuthError,
  loginRequest,
  logoutRequest,
}))

import { useAuthStore } from '../../src/store/auth'

describe('auth store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    sessionStorage.clear()
    createAuthError.mockClear()
    loginRequest.mockReset()
    logoutRequest.mockReset()
  })

  it('stores login payload when login succeeds', async () => {
    loginRequest.mockResolvedValue({
      token: 'token-value',
      refreshToken: 'refresh-token-value',
      roleCode: 'ADMIN',
      realName: '系统管理员',
    })

    const store = useAuthStore()
    await store.login({ username: 'admin', password: '123456' })

    expect(store.token).toBe('token-value')
    expect(store.roleCode).toBe('ADMIN')
    expect(store.realName).toBe('系统管理员')
    expect(store.defaultHomePath).toBe('/dashboard')
    expect(sessionStorage.getItem('attendance_token')).toBe('token-value')
    expect(sessionStorage.getItem('attendance_refresh_token')).toBe('refresh-token-value')
    expect(localStorage.getItem('attendance_token')).toBeNull()
  })

  it('rejects login when selected role does not match returned role', async () => {
    loginRequest.mockResolvedValue({
      token: 'token-value',
      refreshToken: 'refresh-token-value',
      roleCode: 'EMPLOYEE',
      realName: '张三',
    })

    const store = useAuthStore()

    await expect(
      store.login({ username: 'zhangsan', password: '123456', expectedRoleCode: 'ADMIN' }),
    ).rejects.toMatchObject({
      field: 'role',
      message: '所选登录身份与账号角色不一致',
    })

    expect(store.token).toBe('')
    expect(store.roleCode).toBe('')
    expect(store.realName).toBe('')
  })

  it('rejects unsupported role and clears state', async () => {
    loginRequest.mockResolvedValue({
      token: 'token-value',
      refreshToken: 'refresh-token-value',
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
    sessionStorage.setItem('attendance_token', 'restored-token')
    sessionStorage.setItem('attendance_refresh_token', 'restored-refresh-token')
    sessionStorage.setItem('attendance_role_code', 'EMPLOYEE')
    sessionStorage.setItem('attendance_real_name', '张三')

    const store = useAuthStore()
    store.restore()

    expect(store.token).toBe('restored-token')
    expect(store.roleCode).toBe('EMPLOYEE')
    expect(store.realName).toBe('张三')
    expect(store.defaultHomePath).toBe('/attendance/checkin')
  })

  it('migrates legacy auth state from local storage on restore', () => {
    localStorage.setItem('attendance_token', 'legacy-token')
    localStorage.setItem('attendance_refresh_token', 'legacy-refresh-token')
    localStorage.setItem('attendance_role_code', 'ADMIN')
    localStorage.setItem('attendance_real_name', '系统管理员')

    const store = useAuthStore()
    store.restore()

    expect(store.token).toBe('legacy-token')
    expect(sessionStorage.getItem('attendance_token')).toBe('legacy-token')
    expect(localStorage.getItem('attendance_token')).toBeNull()
  })

  it('clears persisted session when restored role is unsupported', () => {
    sessionStorage.setItem('attendance_token', 'dirty-token')
    sessionStorage.setItem('attendance_refresh_token', 'dirty-refresh-token')
    sessionStorage.setItem('attendance_role_code', 'GUEST')
    sessionStorage.setItem('attendance_real_name', '脏数据用户')

    const store = useAuthStore()
    store.restore()

    expect(store.token).toBe('')
    expect(store.roleCode).toBe('')
    expect(store.realName).toBe('')
    expect(store.isAuthenticated).toBe(false)
    expect(sessionStorage.getItem('attendance_token')).toBeNull()
    expect(sessionStorage.getItem('attendance_refresh_token')).toBeNull()
    expect(sessionStorage.getItem('attendance_role_code')).toBeNull()
    expect(sessionStorage.getItem('attendance_real_name')).toBeNull()
  })

  it('clears session through clearSession action', () => {
    const store = useAuthStore()
    store.token = 'token-value'
    store.roleCode = 'ADMIN'
    store.realName = '系统管理员'
    sessionStorage.setItem('attendance_token', 'token-value')
    sessionStorage.setItem('attendance_refresh_token', 'refresh-token-value')
    sessionStorage.setItem('attendance_role_code', 'ADMIN')
    sessionStorage.setItem('attendance_real_name', '系统管理员')

    store.clearSession()

    expect(store.token).toBe('')
    expect(store.roleCode).toBe('')
    expect(store.realName).toBe('')
    expect(sessionStorage.getItem('attendance_token')).toBeNull()
    expect(sessionStorage.getItem('attendance_refresh_token')).toBeNull()
    expect(sessionStorage.getItem('attendance_role_code')).toBeNull()
    expect(sessionStorage.getItem('attendance_real_name')).toBeNull()
  })

  it('calls logout api and clears state and storage on logout', async () => {
    logoutRequest.mockResolvedValue(null)
    const store = useAuthStore()
    store.token = 'token-value'
    store.roleCode = 'ADMIN'
    store.realName = '系统管理员'
    sessionStorage.setItem('attendance_token', 'token-value')
    sessionStorage.setItem('attendance_refresh_token', 'refresh-token-value')

    await store.logout()

    expect(store.token).toBe('')
    expect(store.roleCode).toBe('')
    expect(store.realName).toBe('')
    expect(sessionStorage.getItem('attendance_token')).toBeNull()
    expect(sessionStorage.getItem('attendance_refresh_token')).toBeNull()
    expect(logoutRequest).toHaveBeenCalledWith('refresh-token-value')
  })
})
