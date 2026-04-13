import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  exportStatisticsReport,
  fetchDepartmentRiskOverview,
  fetchDepartmentStatistics,
  fetchExceptionTrend,
  fetchExceptionTypeTrend,
  fetchOperationLogSummary,
  fetchStatisticsSummary,
  messageError,
  messageSuccess,
} = vi.hoisted(() => ({
  exportStatisticsReport: vi.fn(),
  fetchDepartmentRiskOverview: vi.fn(),
  fetchDepartmentStatistics: vi.fn(),
  fetchExceptionTrend: vi.fn(),
  fetchExceptionTypeTrend: vi.fn(),
  fetchOperationLogSummary: vi.fn(),
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
  fetchDepartmentRiskOverview,
  fetchDepartmentStatistics,
  fetchExceptionTrend,
  fetchExceptionTypeTrend,
  fetchStatisticsSummary,
}))

vi.mock('../../src/api/system', () => ({
  fetchOperationLogSummary,
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
    fetchDepartmentRiskOverview.mockReset()
    fetchDepartmentStatistics.mockReset()
    fetchExceptionTrend.mockReset()
    fetchExceptionTypeTrend.mockReset()
    fetchOperationLogSummary.mockReset()
    fetchStatisticsSummary.mockReset()
    messageError.mockReset()
    messageSuccess.mockReset()

    fetchDepartmentStatistics.mockResolvedValue({
      attendanceRate: 0.92,
      exceptionRate: 0.06,
      highRiskCount: 3,
      exceptionTypeDistribution: {
        MULTI_LOCATION_CONFLICT: 2,
        CONTINUOUS_LATE: 3,
        CONTINUOUS_REPEAT_CHECK: 1,
      },
    })
    fetchExceptionTrend.mockResolvedValue({
      periodType: 'DAY',
      points: [
        { date: '周一', exceptionCount: 2 },
        { date: '周二', exceptionCount: 4 },
      ],
    })
    fetchExceptionTypeTrend.mockResolvedValue({
      periodType: 'DAY',
      labels: ['周一', '周二'],
      items: [
        { type: 'CONTINUOUS_LATE', totalCount: 3, values: [1, 2] },
        { type: 'CONTINUOUS_REPEAT_CHECK', totalCount: 1, values: [0, 1] },
      ],
    })
    fetchStatisticsSummary.mockResolvedValue({
      summary: '本周异常数较上周增加',
      highlightRisks: '设备异常集中在周二',
      manageSuggestion: '建议复核设备打卡点',
    })
    fetchDepartmentRiskOverview.mockResolvedValue([
      { deptId: 1, deptName: '研发部', riskScore: 76, riskSummary: '中高风险' },
    ])
    fetchOperationLogSummary.mockResolvedValue({
      total: 12,
      typeCounts: {
        LOGIN: 3,
        FACE_LIVENESS_PASS: 4,
        FACE_LIVENESS_REJECT: 1,
        CHECKIN: 2,
        TOKEN_REFRESH: 2,
      },
    })
  })

  it('loads statistics page sections', async () => {
    const wrapper = mountStatisticsView()
    await flushPromises()

    expect(fetchDepartmentStatistics).toHaveBeenCalledTimes(1)
    expect(fetchExceptionTrend).toHaveBeenCalledTimes(1)
    expect(wrapper.get('[data-testid="statistics-overview"]').text()).toContain('92%')
    expect(wrapper.get('[data-testid="statistics-overview"]').text()).toContain('高风险数量')
    expect(wrapper.get('[data-testid="statistics-overview"]').text()).toContain('多地点异常')
    expect(wrapper.get('[data-testid="statistics-overview"]').text()).toContain('2')
    expect(wrapper.get('[data-testid="statistics-overview"]').text()).not.toContain('highRiskCount')
    expect(wrapper.get('[data-testid="statistics-exception-types"]').text()).toContain('连续迟到')
    expect(wrapper.get('[data-testid="statistics-exception-types"]').text()).toContain('连续重复打卡')
    expect(wrapper.get('[data-testid="statistics-exception-types"]').html()).toContain('statistics-type-trend-bars')
    expect(wrapper.get('[data-testid="statistics-trend"]').text()).toContain('周一')
    expect(wrapper.get('[data-testid="statistics-runtime-events"]').text()).toContain('关键记录总数')
    expect(wrapper.get('[data-testid="statistics-runtime-events"]').text()).toContain('12')
    expect(wrapper.get('[data-testid="statistics-runtime-events"]').text()).toContain('活体验证记录')
    expect(wrapper.get('[data-testid="statistics-runtime-events"]').text()).toContain('活体通过')
    expect(wrapper.get('[data-testid="statistics-runtime-events"]').text()).toContain('登录续期')
    expect(wrapper.get('[data-testid="statistics-continuous-patterns"]').text()).toContain('连续迟到')
    expect(wrapper.get('[data-testid="statistics-continuous-patterns"]').text()).toContain('连续重复打卡')
    expect(wrapper.get('[data-testid="statistics-risk"]').text()).toContain('研发部')
  })

  it('renders exception trend when backend returns points payload', async () => {
    fetchExceptionTrend.mockResolvedValue({
      periodType: 'DAY',
      points: [
        { date: '2026-03-25', exceptionCount: 1 },
        { date: '2026-03-26', exceptionCount: 3 },
      ],
    })
    fetchExceptionTypeTrend.mockResolvedValue({
      periodType: 'DAY',
      labels: ['2026-03-25', '2026-03-26'],
      items: [
        { type: 'MULTI_LOCATION_CONFLICT', totalCount: 2, values: [1, 1] },
      ],
    })

    const wrapper = mountStatisticsView()
    await flushPromises()

    expect(wrapper.get('[data-testid="statistics-trend"]').text()).toContain('03-25')
    expect(wrapper.get('[data-testid="statistics-trend"]').text()).toContain('03-26')
    expect(wrapper.get('[data-testid="statistics-trend"]').text()).toContain('2026-03-26')
    expect(wrapper.get('[data-testid="statistics-trend"]').text()).toContain('1')
    expect(wrapper.get('[data-testid="statistics-trend"]').text()).toContain('3')
  })

  it('keeps statistics page available when department risk brief request fails', async () => {
    fetchDepartmentRiskOverview.mockRejectedValue(new Error('获取部门风险概况失败'))

    const wrapper = mountStatisticsView()
    await flushPromises()

    expect(wrapper.find('.el-alert').exists()).toBe(false)
    expect(wrapper.get('[data-testid="statistics-overview"]').text()).toContain('92%')
    expect(wrapper.get('[data-testid="statistics-trend"]').text()).toContain('周一')
    expect(wrapper.get('[data-testid="statistics-risk"]').text()).toContain('暂无风险概况')
  })

  it('shows all departments on statistics risk section', async () => {
    fetchDepartmentRiskOverview.mockResolvedValue([
      { deptId: 2, deptName: '行政部', riskScore: 88, riskSummary: '高风险' },
      { deptId: 1, deptName: '技术部', riskScore: 82, riskSummary: '中高风险' },
      { deptId: 3, deptName: '财务部', riskScore: 73, riskSummary: '中风险' },
      { deptId: 4, deptName: '市场部', riskScore: 69, riskSummary: '关注' },
    ])

    const wrapper = mountStatisticsView()
    await flushPromises()

    expect(wrapper.get('[data-testid="statistics-risk"]').text()).toContain('全部部门')
    expect(wrapper.findAll('[data-testid="statistics-risk"] .el-card')).toHaveLength(4)
    expect(wrapper.get('[data-testid="statistics-risk"]').text()).toContain('行政部')
    expect(wrapper.get('[data-testid="statistics-risk"]').text()).toContain('技术部')
    expect(wrapper.get('[data-testid="statistics-risk"]').text()).toContain('财务部')
    expect(wrapper.get('[data-testid="statistics-risk"]').text()).toContain('市场部')
  })

  it('exports report with backend provided filename', async () => {
    const blob = new Blob([
      '部门统计报表\n导出时间,2026-04-10 10:00:00\n\n汇总概况\n部门范围,考勤记录数,异常记录数,系统处理次数,预警记录数,复核记录数,闭环记录数\n全部部门,15,24,13,24,5,5\n\n部门明细\n序号,部门编号,部门名称,考勤记录数,异常记录数,系统处理次数,预警记录数,复核记录数,闭环记录数\n1,1,研发部,9,12,8,12,3,3\n2,2,行政部,6,12,5,12,2,2',
    ], { type: 'text/csv;charset=UTF-8' })

    exportStatisticsReport.mockResolvedValue({
      blob,
      filename: 'statistics-export.csv',
      contentType: 'text/csv;charset=UTF-8',
    })

    const wrapper = mountStatisticsView()
    await flushPromises()
    await wrapper.get('[data-testid="statistics-export-button"]').trigger('click')
    await flushPromises()

    expect(exportStatisticsReport).toHaveBeenCalledWith({ exportType: 'DEPARTMENT' })
  })
})
