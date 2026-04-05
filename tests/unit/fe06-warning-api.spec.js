import { beforeEach, describe, expect, it, vi } from 'vitest'

const { requestGet } = vi.hoisted(() => ({
  requestGet: vi.fn(),
}))

vi.mock('../../src/utils/request', () => ({
  default: {
    get: requestGet,
  },
}))

import { fetchFe06WarningAdvice, fetchFe06WarningList } from '../../src/api/fe06-warning'

describe('fe-06 warning api', () => {
  beforeEach(() => {
    requestGet.mockReset()
  })

  it('requests warning list with caller provided params', async () => {
    requestGet.mockResolvedValue({
      code: 200,
      data: {
        total: 1,
        records: [{ id: 5001, level: 'HIGH' }],
      },
    })

    await expect(fetchFe06WarningList({ pageNum: 1, pageSize: 10, level: 'HIGH' })).resolves.toEqual({
      total: 1,
      records: [{ id: 5001, level: 'HIGH' }],
    })
    expect(requestGet).toHaveBeenCalledWith('/warning/list', {
      params: { pageNum: 1, pageSize: 10, level: 'HIGH' },
    })
  })

  it('requests warning advice by id', async () => {
    requestGet.mockResolvedValue({ code: 200, data: { id: 5001, exceptionId: 3001 } })

    await expect(fetchFe06WarningAdvice(5001)).resolves.toEqual({ id: 5001, exceptionId: 3001 })
    expect(requestGet).toHaveBeenCalledWith('/warning/5001/advice')
  })
})
