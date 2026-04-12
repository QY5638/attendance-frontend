import { beforeEach, describe, expect, it } from 'vitest'

import { clearAuthStorage, readAuthStorage, writeAuthStorage } from '../../src/utils/auth'

describe('auth storage', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
  })

  it('writes and reads token roleCode and realName in session storage', () => {
    writeAuthStorage({
      token: 'token-value',
      refreshToken: 'refresh-token-value',
      roleCode: 'ADMIN',
      realName: '系统管理员',
    })

    expect(sessionStorage.getItem('attendance_token')).toBe('token-value')
    expect(localStorage.getItem('attendance_token')).toBeNull()

    expect(readAuthStorage()).toEqual({
      token: 'token-value',
      refreshToken: 'refresh-token-value',
      roleCode: 'ADMIN',
      realName: '系统管理员',
    })
  })

  it('migrates legacy local storage auth data into session storage', () => {
    localStorage.setItem('attendance_token', 'legacy-token')
    localStorage.setItem('attendance_refresh_token', 'legacy-refresh-token')
    localStorage.setItem('attendance_role_code', 'EMPLOYEE')
    localStorage.setItem('attendance_real_name', '张三')

    expect(readAuthStorage()).toEqual({
      token: 'legacy-token',
      refreshToken: 'legacy-refresh-token',
      roleCode: 'EMPLOYEE',
      realName: '张三',
    })

    expect(sessionStorage.getItem('attendance_token')).toBe('legacy-token')
    expect(localStorage.getItem('attendance_token')).toBeNull()
  })

  it('clears all auth keys', () => {
    writeAuthStorage({
      token: 'token-value',
      refreshToken: 'refresh-token-value',
      roleCode: 'ADMIN',
      realName: '系统管理员',
    })

    clearAuthStorage()

    expect(readAuthStorage()).toEqual({
      token: '',
      refreshToken: '',
      roleCode: '',
      realName: '',
    })
    expect(sessionStorage.getItem('attendance_token')).toBeNull()
    expect(localStorage.getItem('attendance_token')).toBeNull()
  })
})
