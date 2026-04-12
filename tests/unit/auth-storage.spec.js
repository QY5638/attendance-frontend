import { beforeEach, describe, expect, it } from 'vitest'

import { clearAuthStorage, readAuthStorage, writeAuthStorage } from '../../src/utils/auth'

describe('auth storage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('writes and reads token roleCode and realName', () => {
    writeAuthStorage({
      token: 'token-value',
      refreshToken: 'refresh-token-value',
      roleCode: 'ADMIN',
      realName: '系统管理员',
    })

    expect(readAuthStorage()).toEqual({
      token: 'token-value',
      refreshToken: 'refresh-token-value',
      roleCode: 'ADMIN',
      realName: '系统管理员',
    })
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
  })
})
