import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  addDevice,
  addPromptTemplate,
  fetchDeviceList,
  fetchExceptionTypeList,
  fetchModelLogList,
  fetchOperationLogList,
  fetchPromptTemplateList,
  fetchRiskLevelList,
  fetchRuleList,
  loadAmapSdk,
  updatePromptTemplate,
  updatePromptTemplateStatus,
} = vi.hoisted(() => ({
  addDevice: vi.fn(),
  addPromptTemplate: vi.fn(),
  fetchDeviceList: vi.fn(),
  fetchExceptionTypeList: vi.fn(),
  fetchModelLogList: vi.fn(),
  fetchOperationLogList: vi.fn(),
  fetchPromptTemplateList: vi.fn(),
  fetchRiskLevelList: vi.fn(),
  fetchRuleList: vi.fn(),
  loadAmapSdk: vi.fn(),
  updatePromptTemplate: vi.fn(),
  updatePromptTemplateStatus: vi.fn(),
}))

vi.mock('../../src/api/system', () => ({
  addDevice,
  addPromptTemplate,
  addRule: vi.fn(),
  deleteDevice: vi.fn(),
  fetchDeviceList,
  fetchExceptionTypeList,
  fetchModelLogList,
  fetchOperationLogList,
  fetchPromptTemplateList,
  fetchRiskLevelList,
  fetchRuleList,
  updateDevice: vi.fn(),
  updateDeviceStatus: vi.fn(),
  updateExceptionType: vi.fn(),
  updatePromptTemplate,
  updatePromptTemplateStatus,
  updateRiskLevel: vi.fn(),
  updateRule: vi.fn(),
  updateRuleStatus: vi.fn(),
}))

vi.mock('../../src/utils/amap', () => ({
  loadAmapSdk,
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
    addDevice.mockReset()
    addPromptTemplate.mockReset()
    fetchDeviceList.mockReset()
    fetchExceptionTypeList.mockReset()
    fetchModelLogList.mockReset()
    fetchOperationLogList.mockReset()
    fetchPromptTemplateList.mockReset()
    fetchRiskLevelList.mockReset()
    fetchRuleList.mockReset()
    loadAmapSdk.mockReset()
    updatePromptTemplate.mockReset()
    updatePromptTemplateStatus.mockReset()

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
    fetchModelLogList.mockResolvedValue({
      total: 1,
      items: [
        {
          id: 11,
          businessType: 'ATTENDANCE_ANALYSIS',
          businessId: 20260405001,
          promptTemplateId: 1,
          inputSummary: '近 7 日打卡摘要',
          outputSummary: '识别出连续晚到风险',
          status: 'SUCCESS',
          latencyMs: 520,
          errorMessage: '',
          createTime: '2026-04-05T10:30:00',
        },
      ],
    })
    fetchPromptTemplateList.mockResolvedValue({
      total: 1,
      items: [
        {
          id: 1,
          code: 'ATTENDANCE_ANALYSIS',
          name: '复杂异常分析',
          sceneType: 'ATTENDANCE_ANALYSIS',
          version: 'v1',
          content: '请结合打卡记录分析异常原因',
          status: 'ENABLED',
          remark: '默认模板',
          updateTime: '2026-04-05T12:00:00',
        },
      ],
    })
    addDevice.mockResolvedValue(null)
    addPromptTemplate.mockResolvedValue(null)
    updatePromptTemplate.mockResolvedValue(null)
    updatePromptTemplateStatus.mockResolvedValue(null)
    loadAmapSdk.mockResolvedValue({
      Map: vi.fn(() => ({
        destroy: vi.fn(),
        on: vi.fn(),
        setCenter: vi.fn(),
      })),
      Marker: vi.fn(() => ({
        setPosition: vi.fn(),
      })),
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

  it('loads prompt template panel with real backend data', async () => {
    const { wrapper } = await mountSystemView('/system')

    await wrapper.get('[data-tab="prompt"]').trigger('click')
    await flushPromises()

    expect(fetchPromptTemplateList).toHaveBeenCalledWith({
      pageNum: 1,
      pageSize: 10,
    })
    expect(wrapper.text()).toContain('复杂异常分析')
    expect(wrapper.get('[data-tab="prompt"]').text()).toContain('模板列表、编辑与启停管理')
  })

  it('loads model log panel with real backend data', async () => {
    const { wrapper } = await mountSystemView('/system')

    await wrapper.get('[data-tab="model-log"]').trigger('click')
    await flushPromises()

    expect(fetchModelLogList).toHaveBeenCalledWith({
      pageNum: 1,
      pageSize: 10,
    })
    expect(wrapper.text()).toContain('ATTENDANCE_ANALYSIS')
    expect(wrapper.text()).toContain('识别出连续晚到风险')
    expect(wrapper.get('[data-tab="model-log"]').text()).toContain('模型调用记录查询与状态追踪')
  })

  it('shows persisted notice on risk level panel', async () => {
    const { wrapper } = await mountSystemView('/system')

    await wrapper.get('[data-tab="risk-level"]').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('当前配置已持久化到数据库')
    expect(wrapper.text()).toContain('高风险')
    expect(fetchRiskLevelList).toHaveBeenCalledWith({
      pageNum: 1,
      pageSize: 10,
    })
  })

  it('opens device dialog, loads amap sdk and submits coordinates with device payload', async () => {
    const { wrapper } = await mountSystemView('/system')

    const createButton = wrapper.findAll('button').find((button) => button.text() === '新增设备')
    await createButton.trigger('click')
    await flushPromises()

    expect(loadAmapSdk).toHaveBeenCalledTimes(1)

    await wrapper.get('input[placeholder="如 DEV-001"]').setValue('DEV-010')
    await wrapper.get('input[placeholder="请输入设备名称"]').setValue('后门考勤机')
    await wrapper.get('input[placeholder="请输入设备位置"]').setValue('办公区C')
    await wrapper.get('[data-testid="system-device-longitude-input"]').setValue('116.397128')
    await wrapper.get('[data-testid="system-device-latitude-input"]').setValue('39.916527')

    await wrapper.get('.panel-card__dialog-form').trigger('submit.prevent')
    await flushPromises()

    expect(addDevice).toHaveBeenCalledWith({
      deviceId: 'DEV-010',
      name: '后门考勤机',
      location: '办公区C',
      longitude: '116.397128',
      latitude: '39.916527',
      description: '',
      status: 1,
    })
  })
})
