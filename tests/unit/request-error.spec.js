import { beforeEach, describe, expect, it, vi } from 'vitest'

import * as requestModule from '../../src/utils/request'

describe('request error normalization', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
    requestModule.setUnauthorizedHandler(null)
  })

  it('maps timeout to timeout error object', () => {
    expect(requestModule.handleRequestError?.({ code: 'ECONNABORTED' })).toEqual({
      type: 'timeout',
      message: '请求超时，请稍后重试',
      field: '',
    })
  })

  it('maps network failure to service unavailable message', () => {
    expect(requestModule.handleRequestError?.({ request: {}, response: undefined })).toEqual({
      type: 'network',
      message: '无法连接到后端服务，请确认接口服务已启动',
      field: '',
    })
  })

  it('maps unexpected errors without request or response to unknown', () => {
    expect(requestModule.handleRequestError?.(new Error('boom'))).toEqual({
      type: 'unknown',
      message: '请求失败，请稍后重试',
      field: '',
    })
  })

  it('maps backend english server error message to readable chinese text', () => {
    expect(requestModule.handleRequestError?.({
      response: {
        status: 500,
        data: {
          message: 'server error',
        },
      },
    })).toEqual({
      type: 'unknown',
      message: '服务器异常，请稍后重试',
      field: '',
    })
  })

  it('prefers backend chinese business message when present', () => {
    expect(requestModule.handleRequestError?.({
      response: {
        status: 400,
        data: {
          message: '打卡地点已停用，不能打卡',
        },
      },
    })).toEqual({
      type: 'unknown',
      message: '打卡地点已停用，不能打卡',
      field: '',
    })
  })

  it('clears auth storage and calls unauthorized handler on 401', () => {
    const handler = vi.fn()
    requestModule.setUnauthorizedHandler(handler)
    sessionStorage.setItem('attendance_token', 'expired-token')
    sessionStorage.setItem('attendance_refresh_token', 'expired-refresh-token')
    sessionStorage.setItem('attendance_role_code', 'ADMIN')
    sessionStorage.setItem('attendance_real_name', '系统管理员')

    const normalized = requestModule.handleRequestError?.({ response: { status: 401 } })

    expect(normalized).toEqual({
      type: 'unauthorized',
      message: '登录状态已失效，请重新登录',
      field: '',
    })
    expect(sessionStorage.getItem('attendance_token')).toBeNull()
    expect(sessionStorage.getItem('attendance_refresh_token')).toBeNull()
    expect(sessionStorage.getItem('attendance_role_code')).toBeNull()
    expect(sessionStorage.getItem('attendance_real_name')).toBeNull()
    expect(handler).toHaveBeenCalledWith(normalized)
  })

  it('maps 403 to forbidden error object with chinese message', () => {
    expect(requestModule.handleRequestError?.({
      response: {
        status: 403,
        data: {
          message: 'forbidden',
        },
      },
    })).toEqual({
      type: 'forbidden',
      message: '当前账号无权执行此操作',
      field: '',
    })
  })
})
