import { beforeEach, describe, expect, it, vi } from 'vitest'

const { requestGet } = vi.hoisted(() => ({
  requestGet: vi.fn(),
}))

vi.mock('../../src/utils/request', () => ({
  default: {
    get: requestGet,
  },
}))

import {
  exportStatisticsReport,
  fetchDepartmentRiskOverview,
  fetchDepartmentStatistics,
  fetchExceptionTrend,
  fetchPersonalStatistics,
  fetchStatisticsSummary,
} from '../../src/api/statistics'

describe('statistics api', () => {
  beforeEach(() => {
    requestGet.mockReset()
  })

  it('requests personal statistics without forcing userId', async () => {
    requestGet.mockResolvedValue({ code: 200, data: { attendanceRate: 0.98 } })

    await expect(fetchPersonalStatistics()).resolves.toEqual({ attendanceRate: 0.98 })
    expect(requestGet).toHaveBeenCalledWith('/statistics/personal', undefined)
  })

  it('unwraps department statistics business response', async () => {
    requestGet.mockResolvedValue({ code: 200, data: { exceptionCount: 2 } })

    await expect(fetchDepartmentStatistics()).resolves.toEqual({ exceptionCount: 2 })
    expect(requestGet).toHaveBeenCalledWith('/statistics/department', undefined)
  })

  it('requests exception trend and summary endpoints', async () => {
    requestGet
      .mockResolvedValueOnce({ code: 200, data: [{ label: '周一', value: 1 }] })
      .mockResolvedValueOnce({ code: 200, data: { summary: '整体稳定' } })
      .mockResolvedValueOnce({ code: 200, data: [{ deptId: 1, deptName: '研发部' }] })

    await expect(fetchExceptionTrend()).resolves.toEqual([{ label: '周一', value: 1 }])
    await expect(fetchStatisticsSummary()).resolves.toEqual({ summary: '整体稳定' })
    await expect(fetchDepartmentRiskOverview()).resolves.toEqual([{ deptId: 1, deptName: '研发部' }])

    expect(requestGet).toHaveBeenNthCalledWith(1, '/statistics/exception-trend', undefined)
    expect(requestGet).toHaveBeenNthCalledWith(2, '/statistics/summary', undefined)
    expect(requestGet).toHaveBeenNthCalledWith(3, '/statistics/department-risk-overview', undefined)
  })

  it('preserves backend export filename and content type', async () => {
    const blob = new Blob(['demo'])
    requestGet.mockResolvedValue({
      blob,
      headers: {
        'content-disposition': 'attachment; filename=statistics-export.csv',
        'content-type': 'text/csv;charset=UTF-8',
      },
    })

    const result = await exportStatisticsReport()

    expect(result.filename).toBe('statistics-export.csv')
    expect(result.contentType).toBe('text/csv;charset=UTF-8')
    expect(result.blob).toBeInstanceOf(Blob)
    expect(result.blob.type.toLowerCase()).toContain('text/csv')
    expect(requestGet).toHaveBeenCalledWith(
      '/statistics/export',
      expect.objectContaining({
        responseType: 'blob',
        transformResponse: expect.any(Array),
      }),
    )
  })

  it('throws business error when export returns json blob', async () => {
    requestGet.mockResolvedValue({
      blob: new Blob([JSON.stringify({ code: 400, message: '导出数据量过大，请缩小查询范围' })], {
        type: 'application/json;charset=UTF-8',
      }),
      headers: {
        'content-type': 'application/json;charset=UTF-8',
      },
    })

    await expect(exportStatisticsReport()).rejects.toEqual({
      type: 'api',
      field: '',
      message: '导出数据量过大，请缩小查询范围',
    })
  })
})
