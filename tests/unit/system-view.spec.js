import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  addDevice,
  addPromptTemplate,
  exportStatisticsReport,
  fetchDeviceList,
  fetchFaceRegisterApprovalList,
  fetchExceptionTypeList,
  fetchModelLogList,
  fetchOperationLogList,
  fetchOperationLogSummary,
  fetchPromptTemplateList,
  fetchRiskLevelList,
  fetchRuleList,
  loadAmapPlugins,
  loadAmapSdk,
  reviewFaceRegisterApproval,
  updatePromptTemplate,
  updatePromptTemplateStatus,
} = vi.hoisted(() => ({
  addDevice: vi.fn(),
  addPromptTemplate: vi.fn(),
  exportStatisticsReport: vi.fn(),
  fetchDeviceList: vi.fn(),
  fetchFaceRegisterApprovalList: vi.fn(),
  fetchExceptionTypeList: vi.fn(),
  fetchModelLogList: vi.fn(),
  fetchOperationLogList: vi.fn(),
  fetchOperationLogSummary: vi.fn(),
  fetchPromptTemplateList: vi.fn(),
  fetchRiskLevelList: vi.fn(),
  fetchRuleList: vi.fn(),
  loadAmapPlugins: vi.fn(),
  loadAmapSdk: vi.fn(),
  reviewFaceRegisterApproval: vi.fn(),
  updatePromptTemplate: vi.fn(),
  updatePromptTemplateStatus: vi.fn(),
}))

vi.mock('../../src/api/system', () => ({
  addDevice,
  addPromptTemplate,
  addRule: vi.fn(),
  deleteDevice: vi.fn(),
  fetchDeviceList,
  fetchFaceRegisterApprovalList,
  fetchExceptionTypeList,
  fetchModelLogList,
  fetchOperationLogList,
  fetchOperationLogSummary,
  fetchPromptTemplateList,
  fetchRiskLevelList,
  fetchRuleList,
  reviewFaceRegisterApproval,
  updateDevice: vi.fn(),
  updateDeviceStatus: vi.fn(),
  updateExceptionType: vi.fn(),
  updatePromptTemplate,
  updatePromptTemplateStatus,
  updateRiskLevel: vi.fn(),
  updateRule: vi.fn(),
  updateRuleStatus: vi.fn(),
}))

vi.mock('../../src/api/statistics', () => ({
  exportStatisticsReport,
}))

vi.mock('../../src/utils/amap', () => ({
  loadAmapPlugins,
  loadAmapSdk,
}))

import SystemView from '../../src/views/system/SystemView.vue'
import SystemDevicePanel from '../../src/views/system/panels/SystemDevicePanel.vue'
import SystemExceptionTypePanel from '../../src/views/system/panels/SystemExceptionTypePanel.vue'
import SystemFaceRegisterApprovalPanel from '../../src/views/system/panels/SystemFaceRegisterApprovalPanel.vue'
import SystemOperationLogPanel from '../../src/views/system/panels/SystemOperationLogPanel.vue'
import SystemPromptPanel from '../../src/views/system/panels/SystemPromptPanel.vue'
import SystemModelLogPanel from '../../src/views/system/panels/SystemModelLogPanel.vue'
import SystemRiskLevelPanel from '../../src/views/system/panels/SystemRiskLevelPanel.vue'

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

async function mountPanel(component) {
  const wrapper = mount(component)
  await flushPromises()
  return wrapper
}

describe('system view', () => {
  beforeEach(() => {
    addDevice.mockReset()
    addPromptTemplate.mockReset()
    exportStatisticsReport.mockReset()
    fetchDeviceList.mockReset()
    fetchFaceRegisterApprovalList.mockReset()
    fetchExceptionTypeList.mockReset()
    fetchModelLogList.mockReset()
    fetchOperationLogList.mockReset()
    fetchOperationLogSummary.mockReset()
    fetchPromptTemplateList.mockReset()
    fetchRiskLevelList.mockReset()
    fetchRuleList.mockReset()
    loadAmapPlugins.mockReset()
    loadAmapSdk.mockReset()
    reviewFaceRegisterApproval.mockReset()
    updatePromptTemplate.mockReset()
    updatePromptTemplateStatus.mockReset()

    fetchDeviceList.mockResolvedValue({
      total: 1,
      items: [{ deviceId: 'LOC-A', name: '行政办公区主点位', location: '办公区A', longitude: 116.397128, latitude: 39.916527, radiusMeters: 30, status: 1, description: '默认地点' }],
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
    fetchFaceRegisterApprovalList.mockResolvedValue({
      total: 1,
      items: [{ id: 1, userId: 1001, userName: '张三', departmentName: '技术部', reason: '需要重新采集照片', status: 'PENDING', reviewComment: '', createTime: '2026-04-05T09:00:00' }],
    })
    fetchOperationLogList.mockResolvedValue({
      total: 1,
      items: [{ id: 202604050099, userId: 20261001, username: 'admin', realName: '系统管理员', type: 'LOGIN', content: '系统管理员登录系统，账号=admin，IP=127.0.0.1', operationTime: '2026-04-04 09:00:00' }],
    })
    fetchOperationLogSummary.mockResolvedValue({
      total: 3,
      typeCounts: {
        LOGIN: 1,
        FACE_LIVENESS_PASS: 1,
        CHECKIN: 1,
      },
    })
    fetchModelLogList.mockResolvedValue({
      total: 1,
      items: [
        {
          id: 11,
          businessType: 'ATTENDANCE_ANALYSIS',
          businessId: 20260405001,
          promptTemplateId: 123456789,
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
    exportStatisticsReport.mockResolvedValue({
      blob: new Blob(['id,type\n1,LOGIN'], { type: 'text/csv' }),
      filename: '业务记录报表.csv',
      contentType: 'text/csv',
    })
    reviewFaceRegisterApproval.mockResolvedValue(null)
    updatePromptTemplate.mockResolvedValue(null)
    updatePromptTemplateStatus.mockResolvedValue(null)
    loadAmapSdk.mockResolvedValue({
      Map: vi.fn(() => ({
        destroy: vi.fn(),
        setCenter: vi.fn(),
      })),
      Marker: vi.fn(() => ({
        setPosition: vi.fn(),
      })),
    })
    loadAmapPlugins.mockResolvedValue({
      Geocoder: vi.fn(() => ({
        getLocation: vi.fn((keyword, callback) => callback('complete', {
          geocodes: [{ formattedAddress: '办公区C', location: { lng: 116.397128, lat: 39.916527 } }],
        })),
        getAddress: vi.fn((coords, callback) => callback('complete', {
          regeocode: { formattedAddress: '办公区C', pois: [{ name: '办公区C' }] },
        })),
      })),
    })
  })

  it('loads device panel by default', async () => {
    const { wrapper } = await mountSystemView('/system')

    expect(wrapper.text()).toContain('系统配置')
    expect(wrapper.text()).toContain('打卡地点管理')
    expect(wrapper.get('[data-tab="device"]').text()).toContain('地点档案与启停状态')
  })

  it('switches to rule panel by query tab', async () => {
    const { router, wrapper } = await mountSystemView('/system')

    await wrapper.get('[data-tab="rule"]').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.query.tab).toBe('rule')
    expect(wrapper.get('[data-tab="rule"]').text()).toContain('考勤规则与阈值管理')
  })

  it('falls back invalid tab to device', async () => {
    const { router, wrapper } = await mountSystemView('/system?tab=unknown')

    expect(router.currentRoute.value.query.tab).toBe('device')
    expect(wrapper.get('[data-tab="device"]').classes()).toContain('system-view__tab--active')
    expect(fetchRuleList).not.toHaveBeenCalled()
  })

  it('loads prompt panel with real backend data', async () => {
    const wrapper = await mountPanel(SystemPromptPanel)

    expect(fetchPromptTemplateList).toHaveBeenCalledWith({
      pageNum: 1,
      pageSize: 10,
    })
    expect(wrapper.text()).toContain('复杂异常分析')
    expect(wrapper.text()).toContain('分析方案')
  })

  it('loads model log panel with real backend data', async () => {
    const wrapper = await mountPanel(SystemModelLogPanel)

    expect(fetchModelLogList).toHaveBeenCalledWith({
      pageNum: 1,
      pageSize: 10,
    })
    expect(wrapper.text()).toContain('考勤分析')
    expect(wrapper.text()).toContain('考勤分析记录：近 7 日打卡摘要')
    expect(wrapper.text()).toContain('已关联分析方案')
    expect(wrapper.text()).toContain('识别出连续晚到风险')
    expect(wrapper.text()).toContain('系统分析记录')
  })

  it('loads face register approval panel with pending request', async () => {
    const wrapper = await mountPanel(SystemFaceRegisterApprovalPanel)

    expect(fetchFaceRegisterApprovalList).toHaveBeenCalledWith({
      pageNum: 1,
      pageSize: 10,
      status: 'PENDING',
    })
    expect(wrapper.text()).toContain('人脸申请')
    expect(wrapper.text()).toContain('张三')
    expect(wrapper.text()).toContain('需要重新采集照片')
  })

  it('loads operation log panel with readable actor and summary', async () => {
    const wrapper = await mountPanel(SystemOperationLogPanel)

    expect(fetchOperationLogList).toHaveBeenCalledWith({
      pageNum: 1,
      pageSize: 10,
    })
    expect(fetchOperationLogSummary).toHaveBeenCalledWith({})
    expect(wrapper.text()).toContain('系统管理员（admin）')
    expect(wrapper.text()).toContain('登录系统')
    expect(wrapper.text()).toContain('登录')
    expect(wrapper.text()).toContain('活体验证事件')
    expect(wrapper.text()).toContain('登录与身份事件')
  })

  it('filters operation log panel by liveness scope', async () => {
    const wrapper = await mountPanel(SystemOperationLogPanel)

    await wrapper.get('select').setValue('LIVENESS')
    await wrapper.get('form').trigger('submit.prevent')
    await flushPromises()

    expect(fetchOperationLogList).toHaveBeenLastCalledWith({
      pageNum: 1,
      pageSize: 10,
      types: [
        'FACE_LIVENESS_SESSION',
        'FACE_LIVENESS_PASS',
        'FACE_LIVENESS_FAIL',
        'FACE_LIVENESS_REJECT',
        'FACE_LIVENESS_CONSUME',
      ],
    })
    expect(fetchOperationLogSummary).toHaveBeenLastCalledWith({
      types: [
        'FACE_LIVENESS_SESSION',
        'FACE_LIVENESS_PASS',
        'FACE_LIVENESS_FAIL',
        'FACE_LIVENESS_REJECT',
        'FACE_LIVENESS_CONSUME',
      ],
    })
  })

  it('exports current operation log filters through statistics export api', async () => {
    globalThis.URL.createObjectURL = vi.fn(() => 'blob:system-log-export')
    globalThis.URL.revokeObjectURL = vi.fn()

    const click = vi.fn()
    const originalCreateElement = document.createElement.bind(document)
    const createElementSpy = vi.spyOn(document, 'createElement').mockImplementation((tagName) => {
      if (tagName === 'a') {
        return {
          click,
          set href(value) {
            this._href = value
          },
          get href() {
            return this._href
          },
          set download(value) {
            this._download = value
          },
          get download() {
            return this._download
          },
        }
      }

      return originalCreateElement(tagName)
    })

    const wrapper = await mountPanel(SystemOperationLogPanel)
    await wrapper.findAll('button').find((button) => button.text() === '导出当前记录').trigger('click')
    await flushPromises()

    expect(exportStatisticsReport).toHaveBeenCalledWith({ exportType: 'AUDIT' })
    expect(click).toHaveBeenCalledTimes(1)

    createElementSpy.mockRestore()
  })

  it('shows maintained notice on risk level panel', async () => {
    const wrapper = await mountPanel(SystemRiskLevelPanel)

    expect(wrapper.text()).toContain('调整后将用于系统风险识别和页面展示')
    expect(wrapper.text()).toContain('高风险')
    expect(fetchRiskLevelList).toHaveBeenCalledWith({
      pageNum: 1,
      pageSize: 10,
    })
  })

  it('shows exception type panel with system code and customer display name', async () => {
    fetchExceptionTypeList.mockResolvedValueOnce({
      total: 1,
      items: [{ code: 'COMPLEX_ATTENDANCE_RISK', name: '综合识别异常', description: '模型识别出的综合异常', status: 1 }],
    })

    const wrapper = await mountPanel(SystemExceptionTypePanel)

    expect(fetchExceptionTypeList).toHaveBeenCalledWith({
      pageNum: 1,
      pageSize: 10,
    })
    expect(wrapper.text()).toContain('系统编码')
    expect(wrapper.text()).toContain('客户显示名称')
    expect(wrapper.text()).toContain('COMPLEX_ATTENDANCE_RISK')
    expect(wrapper.text()).toContain('综合识别异常')
  })

  it('opens location dialog, searches by map name and submits radius payload', async () => {
    const wrapper = await mountPanel(SystemDevicePanel)

    const createButton = wrapper.findAll('button').find((button) => button.text() === '新增地点')
    await createButton.trigger('click')
    await flushPromises()

    expect(loadAmapSdk).toHaveBeenCalledTimes(1)

    await wrapper.get('input[placeholder="例如 LOC-A"]').setValue('LOC-C')
    await wrapper.get('input[placeholder="例如 行政办公区主点位"]').setValue('市场办公区备用点位')
    await wrapper.get('input[placeholder="输入真实地图地点名称，例如 办公区A"]').setValue('办公区C')
    await wrapper.findAll('button').find((button) => button.text() === '按地点名称定位').trigger('click')
    await flushPromises()
    await wrapper.get('input[placeholder="最多50米"]').setValue('40')

    await wrapper.get('.panel-card__dialog-form').trigger('submit.prevent')
    await flushPromises()

    expect(addDevice).toHaveBeenCalledWith({
      deviceId: 'LOC-C',
      name: '市场办公区备用点位',
      location: '办公区C',
      longitude: '116.397128',
      latitude: '39.916527',
      radiusMeters: 40,
      description: '办公区C',
      status: 1,
    })
  })
})
