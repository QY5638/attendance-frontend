import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  authStoreRef,
  fetchDepartmentRiskBrief,
  fetchDepartmentStatistics,
  fetchPersonalStatistics,
  fetchStatisticsSummary,
  fetchWarningList,
} = vi.hoisted(() => ({
  authStoreRef: {
    current: {
      roleCode: 'EMPLOYEE',
      realName: '张三',
    },
  },
  fetchDepartmentRiskBrief: vi.fn(),
  fetchDepartmentStatistics: vi.fn(),
  fetchPersonalStatistics: vi.fn(),
  fetchStatisticsSummary: vi.fn(),
  fetchWarningList: vi.fn(),
}))

vi.mock('../../src/store/auth', () => ({
  useAuthStore: () => authStoreRef.current,
}))

vi.mock('../../src/api/statistics', () => ({
  fetchDepartmentRiskBrief,
  fetchDepartmentStatistics,
  fetchPersonalStatistics,
  fetchStatisticsSummary,
}))

vi.mock('../../src/api/warning', () => ({
  fetchWarningList,
}))

import DashboardView from '../../src/views/dashboard/DashboardView.vue'

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
  template: '<button type="button"><slot /></button>',
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
  template: '<div class="el-empty"><slot />{{ description }}</div>',
})

const ElSkeletonStub = defineComponent({
  template: '<div class="el-skeleton">loading</div>',
})

const ElTagStub = defineComponent({
  template: '<span class="el-tag"><slot /></span>',
})

function mountDashboardView() {
  return mount(DashboardView, {
    global: {
      stubs: {
        ElAlert: ElAlertStub,
        ElButton: ElButtonStub,
        ElCard: ElCardStub,
        ElEmpty: ElEmptyStub,
        ElSkeleton: ElSkeletonStub,
        ElTag: ElTagStub,
      },
    },
  })
}

describe('dashboard view', () => {
  beforeEach(() => {
    authStoreRef.current = { roleCode: 'EMPLOYEE', realName: '张三' }
    fetchDepartmentRiskBrief.mockReset()
    fetchDepartmentStatistics.mockReset()
    fetchPersonalStatistics.mockReset()
    fetchStatisticsSummary.mockReset()
    fetchWarningList.mockReset()
  })

  it('loads employee dashboard without warning summary', async () => {
    fetchPersonalStatistics.mockResolvedValue({ attendanceRate: 0.96, exceptionCount: 1 })
    fetchStatisticsSummary.mockResolvedValue({
      summary: '本周整体稳定',
      highlightRisks: '存在一次迟到',
      manageSuggestion: '继续保持',
    })

    const wrapper = mountDashboardView()
    await flushPromises()

    expect(fetchPersonalStatistics).toHaveBeenCalledTimes(1)
    expect(fetchDepartmentStatistics).not.toHaveBeenCalled()
    expect(fetchWarningList).not.toHaveBeenCalled()
    expect(wrapper.get('[data-testid="dashboard-overview"]').text()).toContain('96%')
    expect(wrapper.get('[data-testid="dashboard-summary"]').text()).toContain('本周整体稳定')
    expect(wrapper.find('[data-testid="dashboard-warning"]').exists()).toBe(false)
  })

  it('loads admin dashboard with warnings and department risk brief', async () => {
    authStoreRef.current = { roleCode: 'ADMIN', realName: '管理员' }
    fetchDepartmentStatistics.mockResolvedValue({ attendanceRate: 0.91, exceptionRate: 0.08 })
    fetchStatisticsSummary.mockResolvedValue({
      summary: '部门异常率上升',
      highlightRisks: '连续三天设备异常',
      manageSuggestion: '优先排查设备',
    })
    fetchWarningList.mockResolvedValue([{ id: 1, level: 'HIGH', aiSummary: '高风险异常' }])
    fetchDepartmentRiskBrief.mockResolvedValue([{ deptId: 1, deptName: '研发部', riskScore: 82 }])

    const wrapper = mountDashboardView()
    await flushPromises()

    expect(fetchDepartmentStatistics).toHaveBeenCalledTimes(1)
    expect(fetchWarningList).toHaveBeenCalledWith({ pageNum: 1, pageSize: 5 })
    expect(wrapper.get('[data-testid="dashboard-warning"]').text()).toContain('高风险异常')
    expect(wrapper.get('[data-testid="dashboard-risk"]').text()).toContain('研发部')
  })

  it('keeps core admin sections visible when warning summary request fails', async () => {
    authStoreRef.current = { roleCode: 'ADMIN', realName: '管理员' }
    fetchDepartmentStatistics.mockResolvedValue({ attendanceRate: 0.91, exceptionRate: 0.08 })
    fetchStatisticsSummary.mockResolvedValue({
      summary: '部门异常率上升',
      highlightRisks: '连续三天设备异常',
      manageSuggestion: '优先排查设备',
    })
    fetchWarningList.mockRejectedValue(new Error('获取预警列表失败'))
    fetchDepartmentRiskBrief.mockResolvedValue([{ deptId: 1, deptName: '研发部', riskScore: 82 }])

    const wrapper = mountDashboardView()
    await flushPromises()

    expect(wrapper.find('.el-alert').exists()).toBe(false)
    expect(wrapper.get('[data-testid="dashboard-summary"]').text()).toContain('部门异常率上升')
    expect(wrapper.get('[data-testid="dashboard-risk"]').text()).toContain('研发部')
    expect(wrapper.get('[data-testid="dashboard-warning"]').text()).toContain('暂无预警摘要')
  })
})
