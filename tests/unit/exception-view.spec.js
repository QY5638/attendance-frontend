import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  fetchExceptionAnalysisBrief,
  fetchExceptionComplexCheck,
  fetchExceptionDecisionTrace,
  fetchExceptionDetail,
  fetchExceptionList,
  fetchExceptionRuleCheck,
  routeState,
  routerPush,
  routerReplace,
} = vi.hoisted(() => ({
  fetchExceptionAnalysisBrief: vi.fn(),
  fetchExceptionComplexCheck: vi.fn(),
  fetchExceptionDecisionTrace: vi.fn(),
  fetchExceptionDetail: vi.fn(),
  fetchExceptionList: vi.fn(),
  fetchExceptionRuleCheck: vi.fn(),
  routeState: {
    path: '/exception',
    query: {},
  },
  routerPush: vi.fn(),
  routerReplace: vi.fn(),
}))

vi.mock('../../src/api/exception', () => ({
  fetchExceptionAnalysisBrief,
  fetchExceptionComplexCheck,
  fetchExceptionDecisionTrace,
  fetchExceptionDetail,
  fetchExceptionList,
  fetchExceptionRuleCheck,
}))

vi.mock('vue-router', async () => {
  const actual = await vi.importActual('vue-router')

  return {
    ...actual,
    useRoute: () => routeState,
    useRouter: () => ({
      push: routerPush,
      replace: routerReplace,
    }),
  }
})

import ExceptionView from '../../src/views/exception/ExceptionView.vue'

function createDeferred() {
  let resolve
  let reject

  const promise = new Promise((nextResolve, nextReject) => {
    resolve = nextResolve
    reject = nextReject
  })

  return {
    promise,
    resolve,
    reject,
  }
}

function createListPayload(records = []) {
  return {
    total: records.length,
    records,
  }
}

function createExceptionRecord(overrides = {}) {
  return {
    id: 3001,
    recordId: 2001,
    userId: 1001,
    type: 'PROXY_CHECKIN',
    riskLevel: 'HIGH',
    sourceType: 'MODEL',
    description: '疑似代打卡',
    processStatus: 'PENDING',
    createTime: '2026-04-04 09:10:00',
    ...overrides,
  }
}

function createAnalysisBrief(overrides = {}) {
  return {
    modelConclusion: 'PROXY_CHECKIN',
    reasonSummary: '设备与地点异常共同提升风险',
    actionSuggestion: '建议优先人工复核',
    similarCaseSummary: '存在相似案例',
    promptVersion: 'v1.0',
    confidenceScore: 92.5,
    ...overrides,
  }
}

function createDecisionTrace(overrides = {}) {
  return {
    id: 9501,
    businessType: 'ATTENDANCE_EXCEPTION',
    businessId: 3001,
    ruleResult: '规则识别设备异常',
    modelResult: '模型判定疑似代打卡',
    finalDecision: '最终进入高风险复核',
    confidenceScore: 92.5,
    decisionReason: '规则与模型结论一致',
    ...overrides,
  }
}

describe('exception view', () => {
  beforeEach(() => {
    routeState.path = '/exception'
    routeState.query = {}
    routerPush.mockReset()
    routerReplace.mockReset()
    fetchExceptionList.mockReset()
    fetchExceptionDetail.mockReset()
    fetchExceptionDecisionTrace.mockReset()
    fetchExceptionAnalysisBrief.mockReset()
    fetchExceptionRuleCheck.mockReset()
    fetchExceptionComplexCheck.mockReset()

    fetchExceptionList.mockResolvedValue(createListPayload([createExceptionRecord()]))
    fetchExceptionDetail.mockResolvedValue(createExceptionRecord())
    fetchExceptionDecisionTrace.mockResolvedValue([createDecisionTrace()])
    fetchExceptionAnalysisBrief.mockResolvedValue(createAnalysisBrief())
    fetchExceptionRuleCheck.mockResolvedValue({
      exceptionId: 3001,
      type: 'PROXY_CHECKIN',
      riskLevel: 'HIGH',
      sourceType: 'RULE',
      processStatus: 'PENDING',
    })
    fetchExceptionComplexCheck.mockResolvedValue({
      exceptionId: 3001,
      type: 'PROXY_CHECKIN',
      riskLevel: 'HIGH',
      sourceType: 'MODEL',
      processStatus: 'PENDING',
      modelConclusion: 'PROXY_CHECKIN',
      reasonSummary: '重新识别后仍为高风险',
      actionSuggestion: '建议优先人工复核',
      confidenceScore: 95.2,
    })
  })

  it('loads exception list on mount and renders list fields', async () => {
    const wrapper = mount(ExceptionView)
    await flushPromises()

    expect(fetchExceptionList).toHaveBeenCalledWith({
      pageNum: 1,
      pageSize: 10,
      type: '',
      riskLevel: '',
      processStatus: '',
      userId: '',
    })
    expect(wrapper.get('[data-testid="exception-list"]').text()).toContain('高风险代打卡异常')
    expect(wrapper.get('[data-testid="exception-list"]').text()).toContain('代打卡')
    expect(wrapper.get('[data-testid="exception-list"]').text()).toContain('待处理')
  })

  it('replaces raw exception ids with readable exception subjects', async () => {
    fetchExceptionList.mockResolvedValueOnce(createListPayload([
      createExceptionRecord({
        id: 123456789,
        recordId: 987654321,
        userId: 456789012,
      }),
    ]))
    fetchExceptionDetail.mockResolvedValueOnce(createExceptionRecord({
      id: 123456789,
      recordId: 987654321,
      userId: 456789012,
    }))

    const wrapper = mount(ExceptionView)
    await flushPromises()

    const listText = wrapper.get('[data-testid="exception-list"]').text()
    expect(listText).toContain('高风险代打卡异常')
    expect(listText).not.toContain('123456789')

    await wrapper.get('[data-testid="exception-open-detail-123456789"]').trigger('click')
    await flushPromises()

    const detailText = wrapper.get('[data-testid="exception-detail-dialog"]').text()
    expect(detailText).toContain('高风险代打卡异常')
    expect(detailText).toContain('基于当前打卡记录重新识别')
    expect(detailText).not.toContain('123456789')
  })

  it('submits filters and refreshes the list with caller input', async () => {
    const wrapper = mount(ExceptionView)
    await flushPromises()

    await wrapper.get('[data-testid="exception-filter-type"]').setValue('LATE')
    await wrapper.get('[data-testid="exception-filter-risk-level"]').setValue('HIGH')
    await wrapper.get('[data-testid="exception-filter-process-status"]').setValue('PENDING')
    await wrapper.get('[data-testid="exception-filter-user-id"]').setValue('1001')
    await wrapper.get('[data-testid="exception-search"]').trigger('click')
    await flushPromises()

    expect(fetchExceptionList).toHaveBeenNthCalledWith(2, {
      pageNum: 1,
      pageSize: 10,
      type: 'LATE',
      riskLevel: 'HIGH',
      processStatus: 'PENDING',
      userId: '1001',
    })
  })

  it('opens detail dialog and requests detail, analysis brief and decision trace', async () => {
    const wrapper = mount(ExceptionView)
    await flushPromises()

    await wrapper.get('[data-testid="exception-open-detail-3001"]').trigger('click')
    await flushPromises()

    expect(fetchExceptionDetail).toHaveBeenCalledWith(3001)
    expect(fetchExceptionAnalysisBrief).toHaveBeenCalledWith(3001)
    expect(fetchExceptionDecisionTrace).toHaveBeenCalledWith(3001)
    expect(wrapper.get('[data-testid="exception-detail-dialog"]').text()).toContain('疑似代打卡')
    expect(wrapper.get('[data-testid="exception-detail-dialog"]').text()).toContain('设备与地点异常共同提升风险')
    expect(wrapper.get('[data-testid="exception-detail-dialog"]').text()).toContain('最终进入高风险复核')
  })

  it('navigates to review page from exception detail with stable exceptionId query', async () => {
    const wrapper = mount(ExceptionView)
    await flushPromises()

    await wrapper.get('[data-testid="exception-open-detail-3001"]').trigger('click')
    await flushPromises()

    await wrapper.get('[data-testid="exception-open-review-3001"]').trigger('click')

    expect(routerPush).toHaveBeenCalledWith({
      path: '/review',
      query: { exceptionId: '3001' },
    })
  })

  it('auto opens detail when exceptionId exists in query and clears the query when closed', async () => {
    routeState.query = {
      exceptionId: '3001',
      source: 'warning',
    }

    const wrapper = mount(ExceptionView)
    await flushPromises()

    expect(fetchExceptionDetail).toHaveBeenCalledWith('3001')
    expect(wrapper.get('[data-testid="exception-detail-dialog"]').exists()).toBe(true)

    await wrapper.get('[data-testid="exception-detail-close"]').trigger('click')

    expect(routerReplace).toHaveBeenCalledWith({
      path: '/exception',
      query: { source: 'warning' },
    })
  })

  it('normalizes exceptionId from query before opening detail automatically', async () => {
    routeState.query = {
      exceptionId: [' 3001 ', '3002'],
    }

    mount(ExceptionView)
    await flushPromises()

    expect(fetchExceptionDetail).toHaveBeenCalledWith('3001')
    expect(fetchExceptionAnalysisBrief).toHaveBeenCalledWith('3001')
    expect(fetchExceptionDecisionTrace).toHaveBeenCalledWith('3001')
  })

  it('keeps detail available when analysis brief request fails and only downgrades the summary section', async () => {
    fetchExceptionAnalysisBrief.mockRejectedValueOnce({
      message: '异常分析摘要不存在',
    })

    const wrapper = mount(ExceptionView)
    await flushPromises()

    await wrapper.get('[data-testid="exception-open-detail-3001"]').trigger('click')
    await flushPromises()

    expect(wrapper.get('[data-testid="exception-detail-dialog"]').text()).toContain('疑似代打卡')
    expect(wrapper.get('[data-testid="exception-detail-dialog"]').text()).toContain('最终进入高风险复核')
    expect(wrapper.get('[data-testid="exception-analysis-error"]').text()).toContain('异常分析摘要不存在')
  })

  it('shows empty state and list error independently', async () => {
    fetchExceptionList.mockReset()
    fetchExceptionList.mockResolvedValueOnce(createListPayload([]))
      .mockRejectedValueOnce({ message: '获取异常列表失败' })

    const wrapper = mount(ExceptionView)
    await flushPromises()

    expect(wrapper.get('[data-testid="exception-list-empty"]').text()).toContain('暂无异常记录')

    await wrapper.get('[data-testid="exception-refresh"]').trigger('click')
    await flushPromises()

    expect(wrapper.get('[data-testid="exception-list-error"]').text()).toContain('获取异常列表失败')
  })

  it('renders raw codes with lightweight Chinese fallback for known values and preserves unknown values', async () => {
    fetchExceptionList.mockResolvedValueOnce(createListPayload([
      createExceptionRecord(),
      createExceptionRecord({
        id: 3003,
        type: 'MULTI_LOCATION_CONFLICT',
        sourceType: 'RULE',
        description: '短时间内在多个地点完成打卡，判定为空间冲突',
      }),
      createExceptionRecord({
        id: 3002,
        type: 'CUSTOM_TYPE',
        riskLevel: 'UNKNOWN_LEVEL',
        sourceType: 'CUSTOM_SOURCE',
        processStatus: 'CUSTOM_STATUS',
      }),
    ]))

    const wrapper = mount(ExceptionView)
    await flushPromises()

    const listText = wrapper.get('[data-testid="exception-list"]').text()
    expect(listText).toContain('代打卡')
    expect(listText).toContain('多地点异常')
    expect(listText).toContain('高风险')
    expect(listText).toContain('待处理')
    expect(listText).toContain('未识别')
  })

  it('keeps the latest detail selection when older slower detail requests resolve later', async () => {
    const firstDetail = createDeferred()
    const firstAnalysis = createDeferred()
    const firstTrace = createDeferred()
    const secondDetail = createDeferred()
    const secondAnalysis = createDeferred()
    const secondTrace = createDeferred()

    fetchExceptionList.mockResolvedValueOnce(createListPayload([
      createExceptionRecord(),
      createExceptionRecord({
        id: 3002,
        description: '第二条异常',
        type: 'LATE',
      }),
    ]))
    fetchExceptionDetail
      .mockReturnValueOnce(firstDetail.promise)
      .mockReturnValueOnce(secondDetail.promise)
    fetchExceptionAnalysisBrief
      .mockReturnValueOnce(firstAnalysis.promise)
      .mockReturnValueOnce(secondAnalysis.promise)
    fetchExceptionDecisionTrace
      .mockReturnValueOnce(firstTrace.promise)
      .mockReturnValueOnce(secondTrace.promise)

    const wrapper = mount(ExceptionView)
    await flushPromises()

    await wrapper.get('[data-testid="exception-open-detail-3001"]').trigger('click')
    await wrapper.get('[data-testid="exception-open-detail-3002"]').trigger('click')

    secondDetail.resolve(createExceptionRecord({ id: 3002, description: '第二条异常', type: 'LATE' }))
    secondAnalysis.resolve(createAnalysisBrief({ modelConclusion: 'LATE', reasonSummary: '第二条摘要' }))
    secondTrace.resolve([createDecisionTrace({ id: 9502, finalDecision: '第二条决策链' })])
    await flushPromises()

    firstDetail.resolve(createExceptionRecord({ id: 3001, description: '第一条异常' }))
    firstAnalysis.resolve(createAnalysisBrief({ reasonSummary: '第一条摘要' }))
    firstTrace.resolve([createDecisionTrace({ id: 9501, finalDecision: '第一条决策链' })])
    await flushPromises()

    const detailText = wrapper.get('[data-testid="exception-detail-dialog"]').text()
    expect(detailText).toContain('第二条异常')
    expect(detailText).toContain('第二条摘要')
    expect(detailText).toContain('第二条决策链')
    expect(detailText).not.toContain('第一条异常')
    expect(detailText).not.toContain('第一条摘要')
    expect(detailText).not.toContain('第一条决策链')
  })

  it('runs rule check and complex check from detail dialog', async () => {
    const wrapper = mount(ExceptionView)
    await flushPromises()

    await wrapper.get('[data-testid="exception-open-detail-3001"]').trigger('click')
    await flushPromises()

    await wrapper.get('[data-testid="exception-run-rule-check"]').trigger('click')
    await flushPromises()

    expect(fetchExceptionRuleCheck).toHaveBeenCalledWith({ recordId: 2001 })
    expect(wrapper.get('[data-testid="exception-rule-check-card"]').text()).toContain('规则校验结果')
    expect(wrapper.get('[data-testid="exception-rule-check-card"]').text()).toContain('代打卡')

    await wrapper.get('[data-testid="exception-run-complex-check"]').trigger('click')
    await flushPromises()

    expect(fetchExceptionComplexCheck).toHaveBeenCalledWith({ recordId: 2001 })
    expect(wrapper.get('[data-testid="exception-complex-check-card"]').text()).toContain('综合识别结果')
    expect(wrapper.get('[data-testid="exception-complex-check-card"]').text()).toContain('重新识别后仍为高风险')
  })

  it('renders english conclusion codes and server error in Chinese on detail dialog', async () => {
    fetchExceptionDetail.mockResolvedValueOnce(createExceptionRecord({ id: 3001, type: 'LATE' }))
    fetchExceptionAnalysisBrief.mockResolvedValueOnce(createAnalysisBrief({ modelConclusion: 'EARLY_LEAVE' }))
    fetchExceptionDecisionTrace.mockResolvedValueOnce([
      createDecisionTrace({ id: 9501, finalDecision: 'PROXY_CHECKIN', modelResult: 'MULTI_LOCATION_CONFLICT' }),
    ])
    fetchExceptionComplexCheck.mockRejectedValueOnce({ message: 'server error' })

    const wrapper = mount(ExceptionView)
    await flushPromises()

    await wrapper.get('[data-testid="exception-open-detail-3001"]').trigger('click')
    await flushPromises()

    const detailText = wrapper.get('[data-testid="exception-detail-dialog"]').text()
    expect(detailText).toContain('早退')
    expect(detailText).toContain('代打卡')
    expect(detailText).toContain('多地点异常')

    await wrapper.get('[data-testid="exception-run-complex-check"]').trigger('click')
    await flushPromises()

    expect(wrapper.get('[data-testid="exception-manual-check-error"]').text()).toContain('服务器异常，请稍后重试')
  })

  it('refreshes detail sections and switches to latest model exception after complex check succeeds', async () => {
    fetchExceptionList
      .mockResolvedValueOnce(createListPayload([createExceptionRecord({ id: 3001, recordId: 2001 })]))
      .mockResolvedValueOnce(createListPayload([
        createExceptionRecord({ id: 4001, recordId: 2001, type: 'LATE', sourceType: 'MODEL' }),
        createExceptionRecord({ id: 3001, recordId: 2001 }),
      ]))
    fetchExceptionDetail
      .mockResolvedValueOnce(createExceptionRecord({ id: 3001, recordId: 2001, type: 'PROXY_CHECKIN' }))
      .mockResolvedValueOnce(createExceptionRecord({ id: 4001, recordId: 2001, type: 'LATE', sourceType: 'MODEL', description: '新综合识别结果' }))
    fetchExceptionAnalysisBrief
      .mockResolvedValueOnce(createAnalysisBrief({ modelConclusion: 'PROXY_CHECKIN', reasonSummary: '旧分析摘要' }))
      .mockResolvedValueOnce(createAnalysisBrief({ modelConclusion: 'LATE', reasonSummary: '新分析摘要' }))
    fetchExceptionDecisionTrace
      .mockResolvedValueOnce([createDecisionTrace({ id: 9501, finalDecision: 'PROXY_CHECKIN' })])
      .mockResolvedValueOnce([createDecisionTrace({ id: 9601, finalDecision: 'LATE', modelResult: 'LATE' })])
    fetchExceptionComplexCheck.mockResolvedValueOnce({
      exceptionId: 4001,
      type: 'LATE',
      riskLevel: 'MEDIUM',
      sourceType: 'MODEL',
      processStatus: 'PENDING',
      modelConclusion: 'LATE',
      reasonSummary: '新综合识别摘要',
      actionSuggestion: '建议关注',
      confidenceScore: 71.2,
    })

    const wrapper = mount(ExceptionView)
    await flushPromises()

    await wrapper.get('[data-testid="exception-open-detail-3001"]').trigger('click')
    await flushPromises()
    await wrapper.get('[data-testid="exception-run-complex-check"]').trigger('click')
    await flushPromises()

    expect(fetchExceptionList).toHaveBeenCalledTimes(2)
    expect(fetchExceptionDetail).toHaveBeenLastCalledWith(4001)
    expect(fetchExceptionAnalysisBrief).toHaveBeenLastCalledWith(4001)
    expect(fetchExceptionDecisionTrace).toHaveBeenLastCalledWith(4001)
    const detailText = wrapper.get('[data-testid="exception-detail-dialog"]').text()
    expect(detailText).toContain('新综合识别结果')
    expect(detailText).toContain('新分析摘要')
    expect(detailText).toContain('迟到')
  })
})
