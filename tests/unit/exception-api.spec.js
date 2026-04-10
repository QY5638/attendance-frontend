import { beforeEach, describe, expect, it, vi } from 'vitest'

const { requestGet, requestPost } = vi.hoisted(() => ({
  requestGet: vi.fn(),
  requestPost: vi.fn(),
}))

vi.mock('../../src/utils/request', () => ({
  default: {
    get: requestGet,
    post: requestPost,
  },
}))

import {
  fetchExceptionAnalysisBrief,
  fetchExceptionComplexCheck,
  fetchExceptionDecisionTrace,
  fetchExceptionDetail,
  fetchExceptionList,
  fetchExceptionRuleCheck,
} from '../../src/api/exception'

describe('exception api', () => {
  beforeEach(() => {
    requestGet.mockReset()
    requestPost.mockReset()
  })

  it('requests exception list with caller provided params', async () => {
    requestGet.mockResolvedValue({
      code: 200,
      data: {
        total: 1,
        records: [{ id: 3001, type: 'PROXY_CHECKIN' }],
      },
    })

    await expect(fetchExceptionList({ pageNum: 1, pageSize: 10, riskLevel: 'HIGH' })).resolves.toEqual({
      total: 1,
      records: [{ id: 3001, type: 'PROXY_CHECKIN' }],
    })
    expect(requestGet).toHaveBeenCalledWith('/exception/list', {
      params: { pageNum: 1, pageSize: 10, riskLevel: 'HIGH' },
    })
  })

  it('requests exception detail by id', async () => {
    requestGet.mockResolvedValue({ code: 200, data: { id: 3001, type: 'PROXY_CHECKIN' } })

    await expect(fetchExceptionDetail(3001)).resolves.toEqual({ id: 3001, type: 'PROXY_CHECKIN' })
    expect(requestGet).toHaveBeenCalledWith('/exception/3001')
  })

  it('requests exception decision trace by id', async () => {
    requestGet.mockResolvedValue({ code: 200, data: [{ id: 9501, finalDecision: '最终进入高风险复核' }] })

    await expect(fetchExceptionDecisionTrace(3001)).resolves.toEqual([
      { id: 9501, finalDecision: '最终进入高风险复核' },
    ])
    expect(requestGet).toHaveBeenCalledWith('/exception/3001/decision-trace')
  })

  it('requests exception analysis brief by id', async () => {
    requestGet.mockResolvedValue({ code: 200, data: { modelConclusion: 'PROXY_CHECKIN' } })

    await expect(fetchExceptionAnalysisBrief(3001)).resolves.toEqual({ modelConclusion: 'PROXY_CHECKIN' })
    expect(requestGet).toHaveBeenCalledWith('/exception/3001/analysis-brief')
  })

  it('requests exception rule check by record id', async () => {
    requestPost.mockResolvedValue({ code: 200, data: { exceptionId: 3001, sourceType: 'RULE' } })

    await expect(fetchExceptionRuleCheck({ recordId: 2001 })).resolves.toEqual({ exceptionId: 3001, sourceType: 'RULE' })
    expect(requestPost).toHaveBeenCalledWith('/exception/rule-check', {
      recordId: 2001,
    })
  })

  it('requests exception complex check by record and user id', async () => {
    requestPost.mockResolvedValue({ code: 200, data: { exceptionId: 3001, sourceType: 'MODEL' } })

    await expect(fetchExceptionComplexCheck({ recordId: 2001, userId: 1001 })).resolves.toEqual({ exceptionId: 3001, sourceType: 'MODEL' })
    expect(requestPost).toHaveBeenCalledWith('/exception/complex-check', {
      recordId: 2001,
      userId: 1001,
      riskFeatures: undefined,
    }, {
      timeout: 70000,
    })
  })
})
