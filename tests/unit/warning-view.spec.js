import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  fetchFe06WarningAdvice,
  fetchFe06WarningList,
  routerPush,
} = vi.hoisted(() => ({
  fetchFe06WarningAdvice: vi.fn(),
  fetchFe06WarningList: vi.fn(),
  routerPush: vi.fn(),
}))

vi.mock('../../src/api/fe06-warning', () => ({
  fetchFe06WarningAdvice,
  fetchFe06WarningList,
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
    type: 'RISK_WARNING',
    level: 'HIGH',
    status: 'UNPROCESSED',
    priorityScore: 96,
    aiSummary: '设备与地点异常共同提升风险',
    disposeSuggestion: '建议优先人工复核',
    decisionSource: 'MODEL_FUSION',
    sendTime: '2026-04-04 10:00:00',
    ...overrides,
  }
}

describe('warning view', () => {
  beforeEach(() => {
    routerPush.mockReset()
    fetchFe06WarningList.mockReset()
    fetchFe06WarningAdvice.mockReset()

    fetchFe06WarningList.mockResolvedValue(createListPayload([createWarningRecord()]))
    fetchFe06WarningAdvice.mockResolvedValue({
      id: 5001,
      exceptionId: 3001,
      priorityScore: 96,
      aiSummary: '设备与地点异常共同提升风险',
      disposeSuggestion: '建议优先人工复核',
      decisionSource: 'MODEL_FUSION',
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
    expect(wrapper.get('[data-testid="warning-list"]').text()).toContain('5001')
    expect(wrapper.get('[data-testid="warning-list"]').text()).toContain('3001')
    expect(wrapper.get('[data-testid="warning-list"]').text()).toContain('UNPROCESSED')
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
    expect(wrapper.get('[data-testid="warning-advice-dialog"]').text()).toContain('MODEL_FUSION')
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

    await wrapper.get('[data-testid="warning-open-review-3001"]').trigger('click')

    expect(routerPush).toHaveBeenCalledWith({
      path: '/review',
      query: { exceptionId: '3001' },
    })
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
    expect(listText).toContain('RISK_WARNING · 风险预警')
    expect(listText).toContain('HIGH · 高风险')
    expect(listText).toContain('UNPROCESSED · 待处理')
    expect(listText).toContain('CUSTOM_WARNING')
    expect(listText).toContain('UNKNOWN_LEVEL')
    expect(listText).toContain('CUSTOM_STATUS')
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
    expect(listText).toContain('MULTI_LOCATION_CONFLICT · 多地点异常')
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
    expect(adviceText).toContain('3002')
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
})
