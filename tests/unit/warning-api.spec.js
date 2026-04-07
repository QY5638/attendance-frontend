import { beforeEach, describe, expect, it, vi } from 'vitest'

const { requestGet } = vi.hoisted(() => ({
  requestGet: vi.fn(),
}))

vi.mock('../../src/utils/request', () => ({
  default: {
    get: requestGet,
  },
}))

import { fetchWarningList } from '../../src/api/warning'

describe('warning api', () => {
  beforeEach(() => {
    requestGet.mockReset()
  })

  it('requests warning list with caller provided params', async () => {
    requestGet.mockResolvedValue({ code: 200, data: [{ id: 1, level: 'HIGH' }] })

    await expect(fetchWarningList({ pageNum: 1, pageSize: 5 })).resolves.toEqual([
      { id: 1, level: 'HIGH' },
    ])
    expect(requestGet).toHaveBeenCalledWith('/warning/list', {
      params: { pageNum: 1, pageSize: 5 },
    })
  })
})
