import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  fetchDeviceList,
  fetchExceptionTypeList,
  fetchOperationLogList,
  fetchRiskLevelList,
  fetchRuleList,
} = vi.hoisted(() => ({
  fetchDeviceList: vi.fn(),
  fetchExceptionTypeList: vi.fn(),
  fetchOperationLogList: vi.fn(),
  fetchRiskLevelList: vi.fn(),
  fetchRuleList: vi.fn(),
}))

vi.mock('../../src/api/system', () => ({
  addDevice: vi.fn(),
  addRule: vi.fn(),
  deleteDevice: vi.fn(),
  fetchDeviceList,
  fetchExceptionTypeList,
  fetchOperationLogList,
  fetchRiskLevelList,
  fetchRuleList,
  updateDevice: vi.fn(),
  updateDeviceStatus: vi.fn(),
  updateExceptionType: vi.fn(),
  updateRiskLevel: vi.fn(),
  updateRule: vi.fn(),
  updateRuleStatus: vi.fn(),
}))

import SystemView from '../../src/views/system/SystemView.vue'

async function mountSystemView(path = '/system') {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: '/system',
        component: SystemView,
      },
    ],
  })

  await router.push(path)
  await router.isReady()

  const wrapper = mount(SystemView, {
    global: {
      plugins: [router],
    },
  })

  await flushPromises()

  return { router, wrapper }
}

describe('system view', () => {
  beforeEach(() => {
    fetchDeviceList.mockReset()
    fetchExceptionTypeList.mockReset()
    fetchOperationLogList.mockReset()
    fetchRiskLevelList.mockReset()
    fetchRuleList.mockReset()

    fetchDeviceList.mockResolvedValue({
      total: 1,
      items: [{ deviceId: 'DEV-001', name: '前台考勤机1', location: '办公区A', status: 1, description: '默认设备' }],
    })
    fetchRuleList.mockResolvedValue({
      total: 1,
      items: [{ id: 1, name: '标准规则', startTime: '09:00:00', endTime: '18:00:00', lateThreshold: 10, earlyThreshold: 10, repeatLimit: 3, status: 1 }],
    })
    fetchRiskLevelList.mockResolvedValue({
      total: 1,
      items: [{ code: 'HIGH', name: '高风险', description: '需要优先人工复核', status: 1 }],
    })
    fetchExceptionTypeList.mockResolvedValue({
      total: 1,
      items: [{ code: 'LATE', name: '迟到', description: '超过阈值', status: 1 }],
    })
    fetchOperationLogList.mockResolvedValue({
      total: 1,
      items: [{ id: 1, userId: 1001, type: 'LOGIN', content: '管理员登录系统', operationTime: '2026-04-04 09:00:00' }],
    })
  })

  it('loads device panel by default', async () => {
    const { wrapper } = await mountSystemView('/system')

    expect(wrapper.text()).toContain('系统配置')
    expect(wrapper.text()).toContain('设备管理')
    expect(wrapper.text()).toContain('前台考勤机1')
    expect(fetchDeviceList).toHaveBeenCalledWith({
      pageNum: 1,
      pageSize: 10,
    })
  })

  it('switches to rule panel by query tab', async () => {
    const { router, wrapper } = await mountSystemView('/system')

    await wrapper.get('[data-tab="rule"]').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.query.tab).toBe('rule')
    expect(wrapper.text()).toContain('标准规则')
    expect(fetchRuleList).toHaveBeenCalledWith({
      pageNum: 1,
      pageSize: 10,
    })
  })

  it('falls back invalid tab to device', async () => {
    const { router, wrapper } = await mountSystemView('/system?tab=unknown')

    expect(router.currentRoute.value.query.tab).toBe('device')
    expect(wrapper.text()).toContain('前台考勤机1')
    expect(fetchRuleList).not.toHaveBeenCalled()
  })

  it('shows contract empty states for prompt and model log without new requests', async () => {
    const { wrapper } = await mountSystemView('/system')

    fetchDeviceList.mockClear()
    fetchRuleList.mockClear()
    fetchRiskLevelList.mockClear()
    fetchExceptionTypeList.mockClear()
    fetchOperationLogList.mockClear()

    await wrapper.get('[data-tab="prompt"]').trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('/api/system/prompt/list')
    expect(fetchDeviceList).not.toHaveBeenCalled()
    expect(fetchRuleList).not.toHaveBeenCalled()
    expect(fetchRiskLevelList).not.toHaveBeenCalled()
    expect(fetchExceptionTypeList).not.toHaveBeenCalled()
    expect(fetchOperationLogList).not.toHaveBeenCalled()

    await wrapper.get('[data-tab="model-log"]').trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('/api/system/model-log/list')
    expect(fetchDeviceList).not.toHaveBeenCalled()
    expect(fetchRuleList).not.toHaveBeenCalled()
    expect(fetchRiskLevelList).not.toHaveBeenCalled()
    expect(fetchExceptionTypeList).not.toHaveBeenCalled()
    expect(fetchOperationLogList).not.toHaveBeenCalled()
  })

  it('shows non persistent notice on risk level panel', async () => {
    const { wrapper } = await mountSystemView('/system')

    await wrapper.get('[data-tab="risk-level"]').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('当前非持久化配置')
    expect(wrapper.text()).toContain('高风险')
    expect(fetchRiskLevelList).toHaveBeenCalledWith({
      pageNum: 1,
      pageSize: 10,
    })
  })
})
