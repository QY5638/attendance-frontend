import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { getAttendanceRepairListRequest, reviewAttendanceRepairRequest, fetchDepartmentList } = vi.hoisted(() => ({
  getAttendanceRepairListRequest: vi.fn(),
  reviewAttendanceRepairRequest: vi.fn(),
  fetchDepartmentList: vi.fn(),
}))

vi.mock('../../src/api/attendance', () => ({
  getAttendanceRepairListRequest,
  reviewAttendanceRepairRequest,
}))

vi.mock('../../src/api/department', () => ({
  fetchDepartmentList,
}))

import AttendanceRepairManageView from '../../src/views/attendance/AttendanceRepairManageView.vue'

function createRepairListResponse(records = []) {
  return {
    code: 200,
    data: {
      total: records.length,
      records,
    },
  }
}

describe('attendance repair manage view', () => {
  beforeEach(() => {
    getAttendanceRepairListRequest.mockReset()
    reviewAttendanceRepairRequest.mockReset()
    fetchDepartmentList.mockReset()

    getAttendanceRepairListRequest.mockResolvedValue(createRepairListResponse([
      {
        id: '2045316138647810049',
        userId: '1001',
        realName: '张三',
        deptName: '技术部',
        checkType: 'OUT',
        checkTime: '2026-04-17T07:39:15',
        repairReason: '真实链路复核补卡样本',
        status: 'APPROVED',
        createTime: '2026-04-18T09:39:02',
      },
    ]))
    fetchDepartmentList.mockResolvedValue({
      items: [{ id: 1001, name: '技术部' }],
    })
  })

  it('queries all repair statuses after clearing status filter', async () => {
    const wrapper = mount(AttendanceRepairManageView)
    await flushPromises()

    expect(getAttendanceRepairListRequest).toHaveBeenCalledWith({
      pageNum: 1,
      pageSize: 20,
      keyword: '',
      deptId: '',
      checkType: '',
      status: 'PENDING',
      startDate: '',
      endDate: '',
    })

    await wrapper.findAll('select')[2].setValue('')
    await wrapper.findAll('button').find((button) => button.text() === '查询').trigger('click')
    await flushPromises()

    expect(getAttendanceRepairListRequest).toHaveBeenLastCalledWith({
      pageNum: 1,
      pageSize: 20,
      keyword: '',
      deptId: '',
      checkType: '',
      status: '',
      startDate: '',
      endDate: '',
    })
  })

  it('queries approved repair records with approved status filter', async () => {
    const wrapper = mount(AttendanceRepairManageView)
    await flushPromises()

    await wrapper.findAll('select')[2].setValue('APPROVED')
    await wrapper.findAll('button').find((button) => button.text() === '查询').trigger('click')
    await flushPromises()

    expect(getAttendanceRepairListRequest).toHaveBeenLastCalledWith({
      pageNum: 1,
      pageSize: 20,
      keyword: '',
      deptId: '',
      checkType: '',
      status: 'APPROVED',
      startDate: '',
      endDate: '',
    })
  })
})
