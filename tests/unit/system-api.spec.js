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
  addDevice,
  addRule,
  deleteDevice,
  fetchDeviceList,
  fetchExceptionTypeList,
  fetchOperationLogList,
  fetchRiskLevelList,
  fetchRuleList,
  updateDevice,
  updateDeviceStatus,
  updateExceptionType,
  updateRiskLevel,
  updateRule,
  updateRuleStatus,
} from '../../src/api/system'

describe('system api', () => {
  beforeEach(() => {
    del.mockReset()
    get.mockReset()
    post.mockReset()
    put.mockReset()
  })

  it('normalizes device list array response', async () => {
    get.mockResolvedValue({
      code: 200,
      data: [{ deviceId: 'DEV-001', name: '前台机' }],
    })

    await expect(fetchDeviceList({ pageNum: 1, pageSize: 10 })).resolves.toEqual({
      total: 1,
      items: [{ deviceId: 'DEV-001', name: '前台机' }],
    })
    expect(get).toHaveBeenCalledWith('/device/list', {
      params: {
        pageNum: 1,
        pageSize: 10,
      },
    })
  })

  it('normalizes paged rule list response', async () => {
    get.mockResolvedValue({
      code: 200,
      data: {
        total: 2,
        records: [{ id: 1, name: '标准规则' }],
      },
    })

    await expect(fetchRuleList({ pageNum: 1, pageSize: 10, status: 1 })).resolves.toEqual({
      total: 2,
      items: [{ id: 1, name: '标准规则' }],
    })
    expect(get).toHaveBeenCalledWith('/rule/list', {
      params: {
        pageNum: 1,
        pageSize: 10,
        status: 1,
      },
    })
  })

  it('posts trimmed device payload to add endpoint', async () => {
    post.mockResolvedValue({ code: 200, data: null })

    await addDevice({
      deviceId: ' DEV-009 ',
      name: ' 南门设备 ',
      location: ' 大厅 ',
      description: ' 新增设备 ',
      status: 1,
    })

    expect(post).toHaveBeenCalledWith('/device/add', {
      deviceId: 'DEV-009',
      name: '南门设备',
      location: '大厅',
      description: '新增设备',
      status: 1,
    })
  })

  it('sends device status update with deviceId', async () => {
    put.mockResolvedValue({ code: 200, data: null })

    await updateDeviceStatus({ deviceId: 'DEV-010', status: 0 })

    expect(put).toHaveBeenCalledWith('/device/status', {
      deviceId: 'DEV-010',
      status: 0,
    })
  })

  it('supports rule create update and status endpoints', async () => {
    post.mockResolvedValue({ code: 200, data: null })
    put.mockResolvedValue({ code: 200, data: null })

    await addRule({
      name: ' 工作日 ',
      startTime: '09:00:00',
      endTime: '18:00:00',
      lateThreshold: 10,
      earlyThreshold: 10,
      repeatLimit: 3,
    })
    await updateRule({
      id: 1,
      name: ' 工作日2 ',
      startTime: '09:30:00',
      endTime: '18:30:00',
      lateThreshold: 20,
      earlyThreshold: 15,
      repeatLimit: 4,
      status: 1,
    })
    await updateRuleStatus({ id: 1, status: 0 })

    expect(post).toHaveBeenCalledWith('/rule/add', {
      name: '工作日',
      startTime: '09:00:00',
      endTime: '18:00:00',
      lateThreshold: 10,
      earlyThreshold: 10,
      repeatLimit: 3,
    })
    expect(put).toHaveBeenNthCalledWith(1, '/rule/update', {
      id: 1,
      name: '工作日2',
      startTime: '09:30:00',
      endTime: '18:30:00',
      lateThreshold: 20,
      earlyThreshold: 15,
      repeatLimit: 4,
      status: 1,
    })
    expect(put).toHaveBeenNthCalledWith(2, '/rule/status', {
      id: 1,
      status: 0,
    })
  })

  it('supports risk level and exception type queries and updates', async () => {
    get.mockResolvedValueOnce({
      code: 200,
      data: {
        total: 1,
        records: [{ code: 'HIGH', name: '高风险' }],
      },
    })
    get.mockResolvedValueOnce({
      code: 200,
      data: {
        total: 1,
        records: [{ code: 'LATE', name: '迟到' }],
      },
    })
    put.mockResolvedValue({ code: 200, data: null })

    await expect(fetchRiskLevelList({ pageNum: 1, pageSize: 10, status: 1 })).resolves.toEqual({
      total: 1,
      items: [{ code: 'HIGH', name: '高风险' }],
    })
    await expect(fetchExceptionTypeList({ pageNum: 1, pageSize: 10 })).resolves.toEqual({
      total: 1,
      items: [{ code: 'LATE', name: '迟到' }],
    })
    await updateRiskLevel({ code: 'HIGH', name: '高风险', description: '需要优先人工复核', status: 1 })
    await updateExceptionType({ code: 'LATE', name: '迟到', description: '超过阈值', status: 1 })

    expect(get).toHaveBeenNthCalledWith(1, '/system/risk-level/list', {
      params: {
        pageNum: 1,
        pageSize: 10,
        status: 1,
      },
    })
    expect(get).toHaveBeenNthCalledWith(2, '/system/exception-type/list', {
      params: {
        pageNum: 1,
        pageSize: 10,
      },
    })
    expect(put).toHaveBeenNthCalledWith(1, '/system/risk-level/update', {
      code: 'HIGH',
      name: '高风险',
      description: '需要优先人工复核',
      status: 1,
    })
    expect(put).toHaveBeenNthCalledWith(2, '/system/exception-type/update', {
      code: 'LATE',
      name: '迟到',
      description: '超过阈值',
      status: 1,
    })
  })

  it('passes operation log query params through', async () => {
    get.mockResolvedValue({
      code: 200,
      data: {
        total: 1,
        records: [{ id: 1, type: 'LOGIN' }],
      },
    })

    await expect(fetchOperationLogList({
      pageNum: 2,
      pageSize: 20,
      userId: 1001,
      type: 'LOGIN',
      startDate: '2026-04-01',
      endDate: '2026-04-04',
    })).resolves.toEqual({
      total: 1,
      items: [{ id: 1, type: 'LOGIN' }],
    })

    expect(get).toHaveBeenCalledWith('/log/operation/list', {
      params: {
        pageNum: 2,
        pageSize: 20,
        userId: 1001,
        type: 'LOGIN',
        startDate: '2026-04-01',
        endDate: '2026-04-04',
      },
    })
  })

  it('updates device and deletes by device id', async () => {
    put.mockResolvedValue({ code: 200, data: null })
    del.mockResolvedValue({ code: 200, data: null })

    await updateDevice({
      deviceId: ' DEV-011 ',
      name: ' 东门设备 ',
      location: ' 东门 ',
      description: ' 调整位置 ',
      status: 0,
    })
    await deleteDevice('DEV-011')

    expect(put).toHaveBeenCalledWith('/device/update', {
      deviceId: 'DEV-011',
      name: '东门设备',
      location: '东门',
      description: '调整位置',
      status: 0,
    })
    expect(del).toHaveBeenCalledWith('/device/DEV-011')
  })
})
