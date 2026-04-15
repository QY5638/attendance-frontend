import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { getMyAttendanceRecordRequest, submitAttendanceRepairRequest } = vi.hoisted(() => ({
  getMyAttendanceRecordRequest: vi.fn(),
  submitAttendanceRepairRequest: vi.fn(),
}))

vi.mock('../../src/api/attendance', () => ({
  getMyAttendanceRecordRequest,
  submitAttendanceRepairRequest,
}))

vi.mock('vue-router', async () => {
  const actual = await vi.importActual('vue-router')

  return {
    ...actual,
    useRoute: () => ({ query: {} }),
  }
})

import AttendanceRepairView from '../../src/views/attendance/AttendanceRepairView.vue'

function createRecordResponse(records = []) {
  return {
    code: 200,
    data: {
      total: records.length,
      records,
    },
  }
}

describe('attendance repair view', () => {
  beforeEach(() => {
    getMyAttendanceRecordRequest.mockReset()
    submitAttendanceRepairRequest.mockReset()
    getMyAttendanceRecordRequest.mockResolvedValue(createRecordResponse([
      {
        id: 1,
        checkType: 'IN',
        checkTime: '2026-04-12T15:20:45',
        status: 'ABNORMAL',
      },
      {
        id: 2,
        checkType: 'OUT',
        checkTime: '2026-04-12 18:00:00',
        status: 'NORMAL',
      },
    ]))
    submitAttendanceRepairRequest.mockResolvedValue({
      code: 200,
      data: null,
    })
  })

  it('loads repairable references and submits manual repair request', async () => {
    const wrapper = mount(AttendanceRepairView)
    await flushPromises()

    expect(wrapper.text()).toContain('补卡申请')
    expect(wrapper.text()).toContain('近期异常记录')
    expect(wrapper.text()).toContain('上班打卡')
    expect(wrapper.text()).not.toContain('下班打卡完成')

    await wrapper.get('[data-testid="attendance-repair-page-check-time"]').setValue('2026-04-12T10:07:46')
    await wrapper.get('[data-testid="attendance-repair-page-reason"]').setValue('我今天需要补卡')
    await wrapper.get('[data-testid="attendance-repair-page-submit"]').trigger('click')
    await flushPromises()

    expect(submitAttendanceRepairRequest).toHaveBeenCalledWith({
      checkType: 'IN',
      checkTime: '2026-04-12 10:07:46',
      repairReason: '我今天需要补卡',
    })
    expect(wrapper.text()).toContain('补卡申请已提交（编号 --），请等待后续处理结果')
  })
})
