import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  exportStatisticsReport,
  fetchDepartmentRiskBrief,
  fetchDepartmentStatistics,
  fetchExceptionTrend,
  fetchStatisticsSummary,
  messageError,
  messageSuccess,
} = vi.hoisted(() => ({
  exportStatisticsReport: vi.fn(),
  fetchDepartmentRiskBrief: vi.fn(),
  fetchDepartmentStatistics: vi.fn(),
  fetchExceptionTrend: vi.fn(),
  fetchStatisticsSummary: vi.fn(),
  messageError: vi.fn(),
  messageSuccess: vi.fn(),
}))

vi.mock('element-plus', () => ({
  ElMessage: {
    success: messageSuccess,
    error: messageError,
  },
}))

vi.mock('../../src/api/statistics', () => ({
  exportStatisticsReport,
  fetchDepartmentRiskBrief,
  fetchDepartmentStatistics,
  fetchExceptionTrend,
  fetchStatisticsSummary,
}))

import StatisticsView from '../../src/views/statistics/StatisticsView.vue'

const ElAlertStub = defineComponent({
  props: {
    title: {
      type: String,
      default: '',
    },
  },
  template: '<div class="el-alert">{{ title }}</div>',
})

const ElButtonStub = defineComponent({
  props: {
    loading: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['click'],
  template: '<button type="button" :disabled="loading" @click="$emit(\'click\')"><slot /></button>',
})

const ElCardStub = defineComponent({
  template: '<div class="el-card"><slot /></div>',
})

const ElEmptyStub = defineComponent({
  props: {
    description: {
      type: String,
      default: '',
    },
  },
  template: '<div class="el-empty">{{ description }}</div>',
})

const ElSkeletonStub = defineComponent({
  template: '<div class="el-skeleton">loading</div>',
})

function mountStatisticsView() {
  return mount(StatisticsView, {
    global: {
      stubs: {
        ElAlert: ElAlertStub,
        ElButton: ElButtonStub,
        ElCard: ElCardStub,
        ElEmpty: ElEmptyStub,
        ElSkeleton: ElSkeletonStub,
      },
    },
  })
}

describe('statistics view', () => {
  beforeEach(() => {
    exportStatisticsReport.mockReset()
    fetchDepartmentRiskBrief.mockReset()
    fetchDepartmentStatistics.mockReset()
    fetchExceptionTrend.mockReset()
    fetchStatisticsSummary.mockReset()
    messageError.mockReset()
    messageSuccess.mockReset()

    fetchDepartmentStatistics.mockResolvedValue({
      attendanceRate: 0.92,
      exceptionRate: 0.06,
      exceptionTypeDistribution: {
        MULTI_LOCATION_CONFLICT: 2,
      },
    })
    fetchExceptionTrend.mockResolvedValue([
      { label: '周一', value: 2 },
      { label: '周二', value: 4 },
    ])
    fetchStatisticsSummary.mockResolvedValue({
      summary: '本周异常数较上周增加',
      highlightRisks: '设备异常集中在周二',
      manageSuggestion: '建议复核设备打卡点',
    })
    fetchDepartmentRiskBrief.mockResolvedValue([
      { deptId: 1, deptName: '研发部', riskScore: 76, riskSummary: '中高风险' },
    ])
  })

  it('loads statistics page sections', async () => {
    const wrapper = mountStatisticsView()
    await flushPromises()

    expect(fetchDepartmentStatistics).toHaveBeenCalledTimes(1)
    expect(fetchExceptionTrend).toHaveBeenCalledTimes(1)
    expect(wrapper.get('[data-testid="statistics-overview"]').text()).toContain('92%')
    expect(wrapper.get('[data-testid="statistics-overview"]').text()).toContain('多地点异常')
    expect(wrapper.get('[data-testid="statistics-overview"]').text()).toContain('2')
    expect(wrapper.get('[data-testid="statistics-trend"]').text()).toContain('周一')
    expect(wrapper.get('[data-testid="statistics-risk"]').text()).toContain('研发部')
  })

  it('exports report with basic trigger only', async () => {
    const blob = new Blob(['report'])
    const click = vi.fn()
    const createObjectURL = vi.fn(() => 'blob:demo')
    const revokeObjectURL = vi.fn()
    const originalCreateElement = document.createElement.bind(document)
    const createElementSpy = vi.spyOn(document, 'createElement')

    exportStatisticsReport.mockResolvedValue(blob)
    createElementSpy.mockImplementation((tagName) => {
      if (tagName === 'a') {
        return {
          click,
          download: '',
          href: '',
        }
      }

      return originalCreateElement(tagName)
    })
    global.URL.createObjectURL = createObjectURL
    global.URL.revokeObjectURL = revokeObjectURL

    const wrapper = mountStatisticsView()
    await flushPromises()
    await wrapper.get('[data-testid="statistics-export-button"]').trigger('click')
    await flushPromises()

    expect(exportStatisticsReport).toHaveBeenCalledTimes(1)
    expect(createObjectURL).toHaveBeenCalledWith(blob)
    expect(click).toHaveBeenCalledTimes(1)
    expect(messageSuccess).toHaveBeenCalledTimes(1)

    createElementSpy.mockRestore()
  })
})
