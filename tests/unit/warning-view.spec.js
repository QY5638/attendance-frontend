import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  exportStatisticsReport,
  fetchFe06WarningAdvice,
  fetchFe06WarningDashboard,
  fetchFe06WarningList,
  fetchFe06WarningReevaluate,
  messageSuccess,
  routerPush,
  submitReview,
} = vi.hoisted(() => ({
  exportStatisticsReport: vi.fn(),
  fetchFe06WarningAdvice: vi.fn(),
  fetchFe06WarningDashboard: vi.fn(),
  fetchFe06WarningList: vi.fn(),
  fetchFe06WarningReevaluate: vi.fn(),
  messageSuccess: vi.fn(),
  routerPush: vi.fn(),
  submitReview: vi.fn(),
}))

vi.mock('element-plus', () => ({
  ElMessage: {
    success: messageSuccess,
  },
}))

vi.mock('../../src/api/fe06-warning', () => ({
  fetchFe06WarningAdvice,
  fetchFe06WarningDashboard,
  fetchFe06WarningList,
  fetchFe06WarningReevaluate,
}))

vi.mock('../../src/api/review', () => ({
  submitReview,
}))

vi.mock('../../src/api/statistics', () => ({
  exportStatisticsReport,
}))

vi.mock('vue-router', async () => {
  const actual = await vi.importActual('vue-router')

  return {
    ...actual,
    useRouter: () => ({
      push: routerPush,
    }),
  }
})

import WarningView from '../../src/views/warning/WarningView.vue'

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

function createWarningRecord(overrides = {}) {
  return {
    id: 5001,
    exceptionId: 3001,
    exceptionType: 'PROXY_CHECKIN',
    type: 'RISK_WARNING',
    level: 'HIGH',
    status: 'UNPROCESSED',
    priorityScore: 96,
    aiSummary: '设备与地点异常共同提升风险',
    disposeSuggestion: '建议优先人工复核',
    decisionSource: 'MODEL_FUSION',
    sendTime: '2026-04-04 10:00:00',
    overdue: true,
    overdueMinutes: 1560,
    ...overrides,
  }
}

describe('warning view', () => {
  beforeEach(() => {
    routerPush.mockReset()
    exportStatisticsReport.mockReset()
    fetchFe06WarningList.mockReset()
    fetchFe06WarningAdvice.mockReset()
    fetchFe06WarningDashboard.mockReset()
    fetchFe06WarningReevaluate.mockReset()
    submitReview.mockReset()
    messageSuccess.mockReset()

    fetchFe06WarningList.mockResolvedValue(createListPayload([createWarningRecord()]))
    fetchFe06WarningDashboard.mockResolvedValue({
      recentDays: 7,
      totalCount: 6,
      processedCount: 3,
      unprocessedCount: 3,
      highRiskCount: 2,
      overdueCount: 1,
      overdue24To48Count: 1,
      overdue48To72Count: 0,
      overdueOver72Count: 0,
      criticalRiskUserCount: 0,
      highRiskUserCount: 1,
      mediumRiskUserCount: 0,
      lowRiskUserCount: 0,
      slaTargetHours: 24,
      withinSlaCount: 2,
      overSlaCount: 1,
      processedRate: 50,
      withinSlaRate: 66.67,
      averageProcessMinutes: 32.5,
      trendPoints: [
        { dateLabel: '2026-04-08', totalCount: 1, processedCount: 1, unprocessedCount: 0, highRiskCount: 0 },
        { dateLabel: '2026-04-09', totalCount: 2, processedCount: 1, unprocessedCount: 1, highRiskCount: 1 },
        { dateLabel: '2026-04-10', totalCount: 3, processedCount: 1, unprocessedCount: 2, highRiskCount: 1 },
      ],
      exceptionTrendItems: [
        { type: 'CONTINUOUS_LATE', totalCount: 2, highRiskCount: 1, dailyCounts: [0, 0, 1, 0, 0, 1, 0] },
        { type: 'CONTINUOUS_PROXY_CHECKIN', totalCount: 1, highRiskCount: 1, dailyCounts: [0, 0, 0, 1, 0, 0, 0] },
      ],
      topRiskUsers: [
        { key: '1001', label: '张三（zhangsan）', count: 3, highRiskCount: 2 },
      ],
      userPortraits: [
        {
          userId: 1001,
          username: 'zhangsan',
          realName: '张三',
          riskTier: 'HIGH',
          totalWarnings: 3,
          highRiskWarnings: 2,
          unprocessedWarnings: 2,
          overdueWarnings: 1,
          latestExceptionType: 'CONTINUOUS_LATE',
          latestWarningLevel: 'HIGH',
          latestWarningTime: '2026-04-10 08:00:00',
        },
      ],
      topExceptionTypes: [
        { key: 'CONTINUOUS_LATE', label: 'CONTINUOUS_LATE', count: 2, highRiskCount: 1 },
      ],
      overdueItems: [
        { warningId: 5008, title: 'CONTINUOUS_LATE', realName: '张三', sendTime: '2026-04-09 08:00:00', overdueMinutes: 1560 },
      ],
    })
    fetchFe06WarningAdvice.mockResolvedValue({
      id: 5001,
      exceptionId: 3001,
      type: 'RISK_WARNING',
      level: 'HIGH',
      status: 'UNPROCESSED',
      priorityScore: 96,
      aiSummary: '设备与地点异常共同提升风险',
      disposeSuggestion: '建议优先人工复核',
      decisionSource: 'MODEL_FUSION',
      realName: '张三',
      username: 'zhangsan',
      checkTime: '2026-04-04 09:00:00',
      location: '办公区A',
      faceScore: 92.5,
      exceptionSourceType: 'MODEL',
      exceptionProcessStatus: 'PENDING',
      exceptionDescription: '疑似代打卡',
      modelConclusion: '疑似代打卡风险较高',
      confidenceScore: 92.5,
      decisionReason: '设备与地点异常共同提升风险',
      similarCaseSummary: '近期同设备存在多账号快速切换',
      reviewResult: 'CONFIRMED',
      reviewUserName: '系统管理员',
      reviewComment: '已确认异常',
    })
    fetchFe06WarningReevaluate.mockResolvedValue(createWarningRecord({
      status: 'PROCESSED',
      aiSummary: '已完成重新评估',
      disposeSuggestion: '建议结合最新情况处理',
    }))
    submitReview.mockResolvedValue({
      id: 6001,
      exceptionId: 3001,
      reviewResult: 'CONFIRMED',
      reviewComment: '已在预警页确认异常',
    })
    exportStatisticsReport.mockResolvedValue({
      blob: new Blob(['预警看板报表'], { type: 'text/csv;charset=UTF-8' }),
      filename: 'warning-dashboard.csv',
      contentType: 'text/csv;charset=UTF-8',
    })
  })

  it('loads warning list on mount and renders list fields', async () => {
    const wrapper = mount(WarningView)
    await flushPromises()

    expect(fetchFe06WarningList).toHaveBeenCalledWith({
      pageNum: 1,
      pageSize: 10,
      level: '',
      status: '',
      type: '',
    })
    expect(fetchFe06WarningDashboard).toHaveBeenCalledTimes(1)
    expect(wrapper.get('[data-testid="warning-list"]').text()).toContain('高风险代打卡预警')
    expect(wrapper.get('[data-testid="warning-list"]').text()).toContain('代打卡异常')
    expect(wrapper.get('[data-testid="warning-list"]').text()).toContain('待处理')
    expect(wrapper.get('[data-testid="warning-list"]').text()).toContain('超时')
    expect(wrapper.get('[data-testid="warning-dashboard"]').text()).toContain('预警总量')
    expect(wrapper.get('[data-testid="warning-dashboard"]').text()).toContain('高风险 1')
    expect(wrapper.get('[data-testid="warning-dashboard"]').text()).toContain('平均处置时长')
    expect(wrapper.get('[data-testid="warning-dashboard"]').text()).toContain('处置 SLA 统计')
    expect(wrapper.get('[data-testid="warning-dashboard"]').text()).toContain('按时关闭')
    expect(wrapper.get('[data-testid="warning-dashboard"]').text()).toContain('超时关闭')
    expect(wrapper.get('[data-testid="warning-dashboard"]').text()).toContain('66.67%')
    expect(wrapper.get('[data-testid="warning-dashboard"]').text()).toContain('2026-04-10')
    expect(wrapper.get('[data-testid="warning-dashboard"]').text()).toContain('高风险人员排行')
    expect(wrapper.get('[data-testid="warning-dashboard"]').text()).toContain('张三（zhangsan）')
    expect(wrapper.get('[data-testid="warning-dashboard"]').text()).toContain('异常人员画像')
    expect(wrapper.get('[data-testid="warning-dashboard"]').text()).toContain('总预警 3')
    expect(wrapper.get('[data-testid="warning-dashboard"]').text()).toContain('高风险')
    expect(wrapper.get('[data-testid="warning-dashboard"]').text()).toContain('异常类型排行')
    expect(wrapper.get('[data-testid="warning-dashboard"]').text()).toContain('连续迟到')
    expect(wrapper.get('[data-testid="warning-dashboard"]').html()).toContain('warning-type-trend')
    expect(wrapper.get('[data-testid="warning-dashboard"]').text()).toContain('处置超时提醒')
    expect(wrapper.get('[data-testid="warning-dashboard"]').text()).toContain('24-48h')
    expect(wrapper.get('[data-testid="warning-continuous-trend"]').text()).toContain('连续代打卡')
  })

  it('opens portrait dialog and loads warning archive by user id', async () => {
    const wrapper = mount(WarningView)
    await flushPromises()

    await wrapper.find('.warning-portrait-item').trigger('click')
    await flushPromises()

    expect(fetchFe06WarningList).toHaveBeenNthCalledWith(2, {
      pageNum: 1,
      pageSize: 5,
      userId: 1001,
    })
    expect(wrapper.get('[data-testid="warning-portrait-dialog"]').text()).toContain('风险人员档案')
    expect(wrapper.get('[data-testid="warning-portrait-dialog"]').text()).toContain('张三（zhangsan）')
    expect(wrapper.get('[data-testid="warning-portrait-dialog"]').text()).toContain('高风险代打卡预警')
    expect(wrapper.get('[data-testid="warning-portrait-dialog"]').text()).toContain('自动处置建议')
    expect(wrapper.get('[data-testid="warning-portrait-dialog"]').text()).toContain('超时预警')
    expect(wrapper.get('[data-testid="warning-portrait-dialog"]').text()).toContain('高风险')
    expect(wrapper.get('[data-testid="warning-portrait-dialog"]').text()).toContain('处置时间线')
    expect(wrapper.get('[data-testid="warning-portrait-dialog"]').text()).toContain('超时 26 小时')
    expect(wrapper.get('[data-testid="warning-portrait-dialog"]').text()).toContain('一个工作日内完成快速复核')
  })

  it('applies portrait suggestion into quick review comment', async () => {
    const wrapper = mount(WarningView)
    await flushPromises()

    await wrapper.find('.warning-portrait-item').trigger('click')
    await flushPromises()

    await wrapper.find('.warning-portrait-suggestion-item button').trigger('click')
    await flushPromises()

    expect(wrapper.get('[data-testid="warning-quick-review-comment"]').element.value).toContain('超时预警')
  })

  it('exports warning dashboard summary to csv', async () => {
    const createObjectURL = vi.fn(() => 'blob:warning-dashboard')
    const revokeObjectURL = vi.fn()
    globalThis.URL.createObjectURL = createObjectURL
    globalThis.URL.revokeObjectURL = revokeObjectURL

    const click = vi.fn()
    const originalCreateElement = document.createElement.bind(document)
    const createElementSpy = vi.spyOn(document, 'createElement').mockImplementation((tagName) => {
      if (tagName === 'a') {
        return {
          click,
          set href(value) {
            this._href = value
          },
          set download(value) {
            this._download = value
          },
        }
      }
      return originalCreateElement(tagName)
    })

    const wrapper = mount(WarningView)
    await flushPromises()

    await wrapper.get('[data-testid="warning-export-dashboard"]').trigger('click')

    expect(exportStatisticsReport).toHaveBeenCalledWith({ exportType: 'WARNING_DASHBOARD' })
    expect(createObjectURL).toHaveBeenCalledTimes(1)
    expect(click).toHaveBeenCalledTimes(1)
    expect(messageSuccess).toHaveBeenCalledWith('预警看板已导出')

    createElementSpy.mockRestore()
  })

  it('replaces raw warning ids with readable warning subjects', async () => {
    fetchFe06WarningList.mockResolvedValueOnce(createListPayload([
      createWarningRecord({
        id: 123456789,
        exceptionId: 987654321,
        exceptionType: 'MULTI_LOCATION_CONFLICT',
        type: 'ATTENDANCE_WARNING',
      }),
    ]))
    fetchFe06WarningAdvice.mockResolvedValueOnce({
      id: 123456789,
      exceptionId: 987654321,
      priorityScore: 96,
      aiSummary: '设备与地点异常共同提升风险',
      disposeSuggestion: '建议优先人工复核',
      decisionSource: 'MODEL_FUSION',
    })

    const wrapper = mount(WarningView)
    await flushPromises()

    const listText = wrapper.get('[data-testid="warning-list"]').text()
    expect(listText).toContain('高风险多地点异常预警')
    expect(listText).toContain('多地点异常')
    expect(listText).not.toContain('123456789')
    expect(listText).not.toContain('987654321')

    await wrapper.get('[data-testid="warning-open-advice-123456789"]').trigger('click')
    await flushPromises()

    const adviceText = wrapper.get('[data-testid="warning-advice-dialog"]').text()
    expect(adviceText).toContain('高风险多地点异常预警')
    expect(adviceText).toContain('多地点异常')
  })

  it('submits filters and refreshes the warning list', async () => {
    const wrapper = mount(WarningView)
    await flushPromises()

    await wrapper.get('[data-testid="warning-filter-level"]').setValue('HIGH')
    await wrapper.get('[data-testid="warning-filter-status"]').setValue('UNPROCESSED')
    await wrapper.get('[data-testid="warning-filter-type"]').setValue('RISK_WARNING')
    await wrapper.get('[data-testid="warning-search"]').trigger('click')
    await flushPromises()

    expect(fetchFe06WarningList).toHaveBeenNthCalledWith(2, {
      pageNum: 1,
      pageSize: 10,
      level: 'HIGH',
      status: 'UNPROCESSED',
      type: 'RISK_WARNING',
    })
  })

  it('opens advice dialog and requests warning advice by id', async () => {
    const wrapper = mount(WarningView)
    await flushPromises()

    await wrapper.get('[data-testid="warning-open-advice-5001"]').trigger('click')
    await flushPromises()

    expect(fetchFe06WarningAdvice).toHaveBeenCalledWith(5001)
    expect(wrapper.get('[data-testid="warning-advice-dialog"]').text()).toContain('设备与地点异常共同提升风险')
    expect(wrapper.get('[data-testid="warning-advice-dialog"]').text()).toContain('综合识别')
    expect(wrapper.get('[data-testid="warning-advice-dialog"]').text()).toContain('张三（zhangsan）')
    expect(wrapper.get('[data-testid="warning-advice-dialog"]').text()).toContain('办公区A')
    expect(wrapper.get('[data-testid="warning-advice-dialog"]').text()).toContain('疑似代打卡风险较高')
    expect(wrapper.get('[data-testid="warning-advice-dialog"]').text()).toContain('系统管理员')
  })

  it('navigates to exception detail using read only query jump', async () => {
    const wrapper = mount(WarningView)
    await flushPromises()

    await wrapper.get('[data-testid="warning-open-exception-3001"]').trigger('click')

    expect(routerPush).toHaveBeenCalledWith({
      path: '/exception',
      query: { exceptionId: '3001' },
    })
  })

  it('navigates to review page directly from warning list with stable exceptionId query', async () => {
    const wrapper = mount(WarningView)
    await flushPromises()

    await wrapper.get('[data-testid="warning-open-review-page-3001"]').trigger('click')

    expect(routerPush).toHaveBeenCalledWith({
      path: '/review',
      query: { exceptionId: '3001' },
    })
  })

  it('submits quick review directly from warning list and refreshes advice when opened', async () => {
    const wrapper = mount(WarningView)
    await flushPromises()

    await wrapper.get('[data-testid="warning-open-advice-5001"]').trigger('click')
    await flushPromises()

    await wrapper.get('[data-testid="warning-open-review-3001"]').trigger('click')
    await wrapper.get('[data-testid="warning-quick-review-result"]').setValue('REJECTED')
    await wrapper.get('[data-testid="warning-quick-review-comment"]').setValue('已核对证据链，当前排除异常')
    await wrapper.get('[data-testid="warning-quick-review-submit"]').trigger('click')
    await flushPromises()

    expect(submitReview).toHaveBeenCalledWith({
      exceptionId: '3001',
      reviewResult: 'REJECTED',
      reviewComment: '已核对证据链，当前排除异常',
    })
    expect(fetchFe06WarningList).toHaveBeenCalledTimes(2)
    expect(fetchFe06WarningAdvice).toHaveBeenCalledTimes(2)
    expect(messageSuccess).toHaveBeenCalledWith('预警已完成快速复核')
  })

  it('shows empty state, list error and advice error independently', async () => {
    fetchFe06WarningList.mockReset()
    fetchFe06WarningAdvice.mockReset()
    fetchFe06WarningList.mockResolvedValueOnce(createListPayload([]))
      .mockResolvedValueOnce(createListPayload([createWarningRecord()]))
      .mockRejectedValueOnce({ message: '获取预警列表失败' })
    fetchFe06WarningAdvice.mockRejectedValueOnce({ message: '获取预警建议失败' })

    const wrapper = mount(WarningView)
    await flushPromises()

    expect(wrapper.get('[data-testid="warning-list-empty"]').text()).toContain('暂无预警记录')

    await wrapper.get('[data-testid="warning-refresh"]').trigger('click')
    await flushPromises()

    await wrapper.get('[data-testid="warning-open-advice-5001"]').trigger('click')
    await flushPromises()

    expect(wrapper.get('[data-testid="warning-advice-error"]').text()).toContain('获取预警建议失败')

    await wrapper.get('[data-testid="warning-refresh"]').trigger('click')
    await flushPromises()

    expect(wrapper.get('[data-testid="warning-list-error"]').text()).toContain('获取预警列表失败')
  })

  it('renders raw codes with lightweight Chinese fallback for known values and preserves unknown values', async () => {
    fetchFe06WarningList.mockResolvedValueOnce(createListPayload([
      createWarningRecord(),
      createWarningRecord({
        id: 5002,
        exceptionId: 3002,
        type: 'CUSTOM_WARNING',
        level: 'UNKNOWN_LEVEL',
        status: 'CUSTOM_STATUS',
      }),
    ]))

    const wrapper = mount(WarningView)
    await flushPromises()

    const listText = wrapper.get('[data-testid="warning-list"]').text()
    expect(listText).toContain('风险预警')
    expect(listText).toContain('高风险')
    expect(listText).toContain('待处理')
    expect(listText).toContain('未识别')
  })

  it('renders multi location conflict label when warning list carries exception type', async () => {
    fetchFe06WarningList.mockResolvedValueOnce(createListPayload([
      createWarningRecord({
        id: 5004,
        exceptionId: 3004,
        type: 'ATTENDANCE_WARNING',
        exceptionType: 'MULTI_LOCATION_CONFLICT',
      }),
    ]))

    const wrapper = mount(WarningView)
    await flushPromises()

    const listText = wrapper.get('[data-testid="warning-list"]').text()
    expect(listText).toContain('多地点异常')
  })

  it('keeps the latest advice selection when older slower advice requests resolve later', async () => {
    const firstAdvice = createDeferred()
    const secondAdvice = createDeferred()

    fetchFe06WarningList.mockResolvedValueOnce(createListPayload([
      createWarningRecord(),
      createWarningRecord({
        id: 5002,
        exceptionId: 3002,
        aiSummary: '第二条预警摘要',
        exceptionType: 'MULTI_LOCATION_CONFLICT',
        type: 'ATTENDANCE_WARNING',
      }),
    ]))
    fetchFe06WarningAdvice
      .mockReturnValueOnce(firstAdvice.promise)
      .mockReturnValueOnce(secondAdvice.promise)

    const wrapper = mount(WarningView)
    await flushPromises()

    await wrapper.get('[data-testid="warning-open-advice-5001"]').trigger('click')
    await wrapper.get('[data-testid="warning-open-advice-5002"]').trigger('click')

    secondAdvice.resolve({
      id: 5002,
      exceptionId: 3002,
      priorityScore: 88,
      aiSummary: '第二条预警摘要',
      disposeSuggestion: '第二条建议',
      decisionSource: 'RULE',
    })
    await flushPromises()

    firstAdvice.resolve({
      id: 5001,
      exceptionId: 3001,
      priorityScore: 96,
      aiSummary: '第一条预警摘要',
      disposeSuggestion: '第一条建议',
      decisionSource: 'MODEL_FUSION',
    })
    await flushPromises()

    const adviceText = wrapper.get('[data-testid="warning-advice-dialog"]').text()
    expect(adviceText).toContain('高风险多地点异常预警')
    expect(adviceText).toContain('第二条预警摘要')
    expect(adviceText).toContain('第二条建议')
    expect(adviceText).not.toContain('第一条预警摘要')
    expect(adviceText).not.toContain('第一条建议')
  })

  it('does not navigate when the related exception id is missing', async () => {
    fetchFe06WarningList.mockResolvedValueOnce(createListPayload([
      createWarningRecord({ id: 5003, exceptionId: null }),
    ]))

    const wrapper = mount(WarningView)
    await flushPromises()

    await wrapper.get('[data-testid="warning-open-exception-null"]').trigger('click')

    expect(routerPush).not.toHaveBeenCalled()
  })

  it('opens reevaluate dialog and submits reevaluation request', async () => {
    fetchFe06WarningList
      .mockResolvedValueOnce(createListPayload([createWarningRecord()]))
      .mockResolvedValueOnce(createListPayload([
        createWarningRecord({
          status: 'PROCESSED',
          aiSummary: '已完成重新评估',
          disposeSuggestion: '建议结合最新情况处理',
        }),
      ]))

    const wrapper = mount(WarningView)
    await flushPromises()

    await wrapper.get('[data-testid="warning-open-reevaluate-5001"]').trigger('click')
    await wrapper.get('[data-testid="warning-reevaluate-reason-input"]').setValue('补充现场情况后重新评估')
    await wrapper.get('[data-testid="warning-reevaluate-submit"]').trigger('click')
    await flushPromises()

    expect(fetchFe06WarningReevaluate).toHaveBeenCalledWith({
      warningId: '5001',
      reason: '补充现场情况后重新评估',
    })
    expect(fetchFe06WarningList).toHaveBeenCalledTimes(2)
    expect(messageSuccess).toHaveBeenCalledWith('预警已完成重新评估')
    expect(wrapper.text()).toContain('已处理')
  })
})
