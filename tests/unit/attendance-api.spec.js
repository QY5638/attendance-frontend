import { beforeEach, describe, expect, it, vi } from 'vitest'

const { get, post } = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
}))

vi.mock('../../src/utils/request', () => ({
  default: {
    get,
    post,
  },
}))

import {
  getAttendanceDeviceOptionsRequest,
  getMyAttendanceRecordRequest,
  submitAttendanceCheckinRequest,
  submitAttendanceRepairRequest,
  verifyFaceRequest,
} from '../../src/api/attendance'

describe('attendance api', () => {
  beforeEach(() => {
    get.mockReset()
    post.mockReset()
  })

  it('gets punch location options from the attendance device options endpoint', async () => {
    const response = [{ deviceId: 'LOC-A', name: '行政办公区主点位', location: '办公区A' }]
    get.mockResolvedValue(response)

    await expect(getAttendanceDeviceOptionsRequest()).resolves.toEqual(response)
    expect(get).toHaveBeenCalledWith('/attendance/device-options')
  })

  it('posts checkin with selected location and computer device info', async () => {
    post.mockResolvedValue({ code: 200 })

    await submitAttendanceCheckinRequest({
      checkType: 'IN',
      deviceId: 'LOC-A',
      deviceInfo: '系统 Windows 11 / 浏览器 Google Chrome / 分辨率 1920x1080',
      terminalId: 'terminal-fixed-id',
      imageData: 'base64-image',
      userId: 1001,
      location: 'front-desk',
    })

    expect(post).toHaveBeenCalledWith('/attendance/checkin', {
      checkType: 'IN',
      deviceId: 'LOC-A',
      deviceInfo: '系统 Windows 11 / 浏览器 Google Chrome / 分辨率 1920x1080',
      terminalId: 'terminal-fixed-id',
      imageData: 'base64-image',
    })
  })

  it('gets current user attendance records from the self service endpoint with query params', async () => {
    const response = { records: [{ id: 1 }] }
    get.mockResolvedValue(response)

    await expect(
      getMyAttendanceRecordRequest({
        pageNum: 2,
        pageSize: 20,
        startDate: '2026-04-01',
        endDate: '2026-04-30',
        keyword: 'ignore-me',
      }),
    ).resolves.toEqual(response)

    expect(get).toHaveBeenCalledWith('/attendance/record/me', {
      params: {
        pageNum: 2,
        pageSize: 20,
        startDate: '2026-04-01',
        endDate: '2026-04-30',
      },
    })
  })

  it('drops empty start and end dates while keeping paging params for my attendance record request', async () => {
    const response = { records: [] }
    get.mockResolvedValue(response)

    await expect(
      getMyAttendanceRecordRequest({
        pageNum: 1,
        pageSize: 10,
        startDate: '',
        endDate: '',
      }),
    ).resolves.toEqual(response)

    expect(get).toHaveBeenCalledWith('/attendance/record/me', {
      params: {
        pageNum: 1,
        pageSize: 10,
      },
    })
  })

  it('posts repair payload to the self service repair endpoint with whitelisted fields only', async () => {
    const payload = {
      checkType: 'IN',
      checkTime: '2026-04-04 09:00:00',
      repairReason: '设备离线，补卡申请',
      userId: 1001,
      status: 'PENDING',
    }
    post.mockResolvedValue({ code: 200 })

    await submitAttendanceRepairRequest(payload)

    expect(post).toHaveBeenCalledWith('/attendance/repair', {
      checkType: 'IN',
      checkTime: '2026-04-04 09:00:00',
      repairReason: '设备离线，补卡申请',
    })
  })

  it('passes through repair request rejection without rewriting it', async () => {
    const error = new Error('repair failed')
    post.mockRejectedValue(error)

    await expect(
      submitAttendanceRepairRequest({
        checkType: 'OUT',
        checkTime: '2026-04-04 18:00:00',
        repairReason: '漏签退补卡',
        draft: true,
      }),
    ).rejects.toBe(error)

    expect(post).toHaveBeenCalledWith('/attendance/repair', {
      checkType: 'OUT',
      checkTime: '2026-04-04 18:00:00',
      repairReason: '漏签退补卡',
    })
  })

  it('posts face verify with image data only', async () => {
    post.mockResolvedValue({ matched: true })

    await verifyFaceRequest({
      imageData: 'base64-image',
      score: 0.98,
      deviceId: 'DEVICE-01',
    })

    expect(post).toHaveBeenCalledWith('/face/verify', {
      imageData: 'base64-image',
    })
  })

  it('passes through non-consuming liveness verify payload for preview checks', async () => {
    post.mockResolvedValue({ matched: true })

    await verifyFaceRequest({
      imageData: 'base64-image',
      livenessToken: 'liveness-token',
      consumeLiveness: false,
    })

    expect(post).toHaveBeenCalledWith('/face/verify', {
      imageData: 'base64-image',
      livenessToken: 'liveness-token',
      consumeLiveness: false,
    })
  })
})
