import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  authStoreRef,
  fetchDepartmentList,
  getAttendanceListRequest,
  getAttendanceDeviceOptionsRequest,
  loadAmapSdk,
  getMyAttendanceRecordRequest,
  submitAttendanceCheckinRequest,
  submitAttendanceRepairRequest,
  verifyFaceRequest,
} = vi.hoisted(() => ({
  authStoreRef: {
    current: {
      roleCode: 'EMPLOYEE',
      realName: '张三',
    },
  },
  fetchDepartmentList: vi.fn(),
  getAttendanceListRequest: vi.fn(),
  getAttendanceDeviceOptionsRequest: vi.fn(),
  loadAmapSdk: vi.fn(),
  getMyAttendanceRecordRequest: vi.fn(),
  submitAttendanceCheckinRequest: vi.fn(),
  submitAttendanceRepairRequest: vi.fn(),
  verifyFaceRequest: vi.fn(),
}))

vi.mock('../../src/store/auth', () => ({
  useAuthStore: () => authStoreRef.current,
}))

vi.mock('../../src/api/attendance', () => ({
  getAttendanceListRequest,
  getAttendanceDeviceOptionsRequest,
  getMyAttendanceRecordRequest,
  submitAttendanceCheckinRequest,
  submitAttendanceRepairRequest,
  verifyFaceRequest,
}))

vi.mock('../../src/api/department', () => ({
  fetchDepartmentList,
}))

vi.mock('../../src/utils/amap', () => ({
  loadAmapSdk,
}))

import AttendanceView from '../../src/views/attendance/AttendanceView.vue'

function createDeferred() {
  let resolve
  let reject

  const promise = new Promise((nextResolve, nextReject) => {
    resolve = nextResolve
    reject = nextReject
  })

  return {
    promise,
    reject,
    resolve,
  }
}

function createApiResponse(data) {
  return {
    code: 200,
    message: 'ok',
    data,
  }
}

function createBusinessFailureResponse(message) {
  return {
    code: 400,
    message,
    data: null,
  }
}

function createRecordResponse(records = [], total = records.length) {
  return {
    code: 200,
    message: 'ok',
    data: {
      records,
      total,
    },
  }
}

async function setFaceImage(wrapper, imageData = 'base64-image') {
  wrapper.vm.checkinForm.imageData = imageData
  await wrapper.vm.$nextTick()
}

describe('attendance view', () => {
  beforeEach(() => {
    authStoreRef.current = { roleCode: 'EMPLOYEE', realName: '张三' }
    fetchDepartmentList.mockReset()
    fetchDepartmentList.mockResolvedValue({
      total: 2,
      items: [
        { id: 1, name: '研发部' },
        { id: 2, name: '行政部' },
      ],
    })
    getAttendanceListRequest.mockReset()
    getAttendanceListRequest.mockResolvedValue(createRecordResponse())
    getAttendanceDeviceOptionsRequest.mockReset()
    getAttendanceDeviceOptionsRequest.mockResolvedValue(createApiResponse([]))
    loadAmapSdk.mockReset()
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
    getMyAttendanceRecordRequest.mockReset()
    getMyAttendanceRecordRequest.mockResolvedValue(createRecordResponse())
    submitAttendanceCheckinRequest.mockReset()
    submitAttendanceCheckinRequest.mockResolvedValue(createApiResponse(null))
    submitAttendanceRepairRequest.mockReset()
    submitAttendanceRepairRequest.mockResolvedValue(createApiResponse(null))
    verifyFaceRequest.mockReset()
    verifyFaceRequest.mockResolvedValue(createApiResponse({ matched: true }))
  })

  it('loads admin attendance records with management filters and hides checkin tab', async () => {
    authStoreRef.current = { roleCode: 'ADMIN', realName: '管理员' }
    getAttendanceListRequest.mockResolvedValueOnce(createRecordResponse([
      {
        id: 1,
        userId: 1001,
        realName: '张三',
        checkType: 'IN',
        checkTime: '2026-04-04T09:00:00',
        deviceId: 'DEV-001',
        location: '办公区A',
        status: 'NORMAL',
        exceptionType: 'MULTI_LOCATION_CONFLICT',
      },
    ], 1))

    const wrapper = mount(AttendanceView)
    await flushPromises()

    expect(wrapper.find('[data-testid="attendance-tab-checkin"]').exists()).toBe(false)
    expect(getAttendanceDeviceOptionsRequest).not.toHaveBeenCalled()
    expect(fetchDepartmentList).toHaveBeenCalledWith({ pageNum: 1, pageSize: 200 })
    expect(getAttendanceListRequest).toHaveBeenCalledWith({
      pageNum: 1,
      pageSize: 10,
      userId: undefined,
      deptId: undefined,
      checkType: '',
      status: '',
      startDate: '',
      endDate: '',
    })
    expect(wrapper.get('[data-testid="attendance-record-dept-id-input"]').text()).toContain('全部')
    expect(wrapper.get('[data-testid="attendance-record-dept-id-input"]').html()).toContain('研发部')
    expect(wrapper.text()).toContain('张三')
    expect(wrapper.text()).toContain('办公区A')
  })

  it('submits admin record filters with text user input and selected department', async () => {
    authStoreRef.current = { roleCode: 'ADMIN', realName: '管理员' }

    const wrapper = mount(AttendanceView)
    await flushPromises()
    getAttendanceListRequest.mockClear()

    await wrapper.get('[data-testid="attendance-record-user-id-input"]').setValue('1001')
    await wrapper.get('[data-testid="attendance-record-dept-id-input"]').setValue('2')
    await wrapper.get('[data-testid="attendance-record-check-type-select"]').setValue('IN')
    await wrapper.get('[data-testid="attendance-record-status-select"]').setValue('NORMAL')
    await wrapper.get('[data-testid="attendance-record-search"]').trigger('click')
    await flushPromises()

    expect(getAttendanceListRequest).toHaveBeenCalledWith({
      pageNum: 1,
      pageSize: 10,
      userId: 1001,
      deptId: 2,
      checkType: 'IN',
      status: 'NORMAL',
      startDate: '',
      endDate: '',
    })
  })

  it('resets admin record filters back to defaults', async () => {
    authStoreRef.current = { roleCode: 'ADMIN', realName: '管理员' }

    const wrapper = mount(AttendanceView)
    await flushPromises()
    getAttendanceListRequest.mockClear()

    await wrapper.get('[data-testid="attendance-record-user-id-input"]').setValue('1001')
    await wrapper.get('[data-testid="attendance-record-dept-id-input"]').setValue('2')
    await wrapper.get('[data-testid="attendance-record-check-type-select"]').setValue('OUT')
    await wrapper.get('[data-testid="attendance-record-status-select"]').setValue('EXCEPTION')
    await wrapper.get('[data-testid="attendance-start-date-input"]').setValue('2026-04-01')
    await wrapper.get('[data-testid="attendance-end-date-input"]').setValue('2026-04-30')
    await wrapper.get('[data-testid="attendance-page-size-select"]').setValue('20')

    await wrapper.get('[data-testid="attendance-record-reset"]').trigger('click')
    await flushPromises()

    expect(getAttendanceListRequest).toHaveBeenCalledWith({
      pageNum: 1,
      pageSize: 10,
      userId: undefined,
      deptId: undefined,
      checkType: '',
      status: '',
      startDate: '',
      endDate: '',
    })
    expect(wrapper.get('[data-testid="attendance-record-user-id-input"]').element.value).toBe('')
    expect(wrapper.get('[data-testid="attendance-record-dept-id-input"]').element.value).toBe('')
    expect(wrapper.get('[data-testid="attendance-page-size-select"]').element.value).toBe('10')
  })

  it('renders dual tabs, defaults to checkin and loads devices with records in parallel on mount', async () => {
    const pendingDevices = createDeferred()
    const pendingRecords = createDeferred()

    getAttendanceDeviceOptionsRequest.mockReturnValueOnce(pendingDevices.promise)
    getMyAttendanceRecordRequest.mockReturnValueOnce(pendingRecords.promise)

    const wrapper = mount(AttendanceView)

    expect(wrapper.get('[data-testid="attendance-tab-checkin"]').attributes('aria-pressed')).toBe('true')
    expect(wrapper.get('[data-testid="attendance-tab-records"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="attendance-checkin-panel"]').exists()).toBe(true)
    expect(getAttendanceDeviceOptionsRequest).toHaveBeenCalledTimes(1)
    expect(getMyAttendanceRecordRequest).toHaveBeenCalledTimes(1)
    expect(getMyAttendanceRecordRequest).toHaveBeenCalledWith({
      pageNum: 1,
      pageSize: 10,
      startDate: '',
      endDate: '',
    })

    pendingDevices.resolve(createApiResponse([]))
    pendingRecords.resolve(createRecordResponse())
    await flushPromises()
  })

  it('shows selected device location and runs face verify from an explicit precheck action with result feedback', async () => {
    getAttendanceDeviceOptionsRequest.mockResolvedValueOnce(createApiResponse([
      {
        deviceId: 'DEVICE-01',
        name: '前台设备',
        location: '一楼前台',
        longitude: 116.397128,
        latitude: 39.916527,
      },
    ]))
    getMyAttendanceRecordRequest.mockResolvedValueOnce(createRecordResponse())
    verifyFaceRequest.mockResolvedValueOnce(
      createApiResponse({
        matched: true,
        score: 0.98,
      }),
    )

    const wrapper = mount(AttendanceView)
    await flushPromises()

    await wrapper.get('[data-testid="attendance-device-select"]').setValue('DEVICE-01')
    await setFaceImage(wrapper)

    expect(wrapper.get('[data-testid="attendance-device-select"]').text()).toContain('前台设备')
    expect(wrapper.get('[data-testid="attendance-device-location"]').text()).toContain('一楼前台')
    expect(wrapper.get('[data-testid="attendance-face-verify-button"]').attributes('disabled')).toBeUndefined()

    expect(wrapper.find('[data-testid="attendance-face-verify-result"]').exists()).toBe(false)

    await wrapper.get('[data-testid="attendance-face-verify-button"]').trigger('click')
    await flushPromises()

    expect(verifyFaceRequest).toHaveBeenCalledWith({
      imageData: 'base64-image',
    })
    expect(wrapper.get('[data-testid="attendance-face-verify-result"]').text()).toContain('通过')
  })

  it('renders a real map preview for the selected device when coordinates are available', async () => {
    getAttendanceDeviceOptionsRequest.mockResolvedValueOnce(createApiResponse([
      {
        deviceId: 'DEVICE-01',
        name: '前台设备',
        location: '一楼前台',
        longitude: 116.397128,
        latitude: 39.916527,
      },
    ]))
    getMyAttendanceRecordRequest.mockResolvedValueOnce(createRecordResponse())

    const wrapper = mount(AttendanceView)
    await flushPromises()

    await wrapper.get('[data-testid="attendance-device-select"]').setValue('DEVICE-01')
    await flushPromises()

    expect(loadAmapSdk).toHaveBeenCalledTimes(1)
    expect(wrapper.get('[data-testid="attendance-device-coordinate"]').text()).toContain('116.397128')
    expect(wrapper.get('[data-testid="attendance-device-map"]').exists()).toBe(true)
  })

  it('submits checkin without implicitly triggering face verify and refreshes records after success', async () => {
    getAttendanceDeviceOptionsRequest.mockResolvedValueOnce(createApiResponse([
      {
        deviceId: 'DEVICE-01',
        name: '前台设备',
        location: '一楼前台',
      },
    ]))
    getMyAttendanceRecordRequest
      .mockResolvedValueOnce(createRecordResponse())
      .mockResolvedValueOnce(createRecordResponse([{ id: 1 }]))

    const wrapper = mount(AttendanceView)
    await flushPromises()

    await wrapper.get('[data-testid="attendance-device-select"]').setValue('DEVICE-01')
    await setFaceImage(wrapper)
    await wrapper.get('[data-testid="attendance-checkin-submit"]').trigger('click')
    await flushPromises()

    expect(verifyFaceRequest).not.toHaveBeenCalled()
    expect(submitAttendanceCheckinRequest).toHaveBeenCalledWith({
      checkType: 'IN',
      deviceId: 'DEVICE-01',
      imageData: 'base64-image',
    })
    expect(getMyAttendanceRecordRequest).toHaveBeenCalledTimes(2)
  })

  it('shows a visible error and does not refresh records when checkin returns a wrapped business failure', async () => {
    getAttendanceDeviceOptionsRequest.mockResolvedValueOnce(createApiResponse([
      {
        deviceId: 'DEVICE-01',
        name: '前台设备',
        location: '一楼前台',
      },
    ]))
    getMyAttendanceRecordRequest.mockResolvedValueOnce(createRecordResponse())
    submitAttendanceCheckinRequest.mockResolvedValueOnce(createBusinessFailureResponse('今日已完成上班打卡'))

    const wrapper = mount(AttendanceView)
    await flushPromises()

    await wrapper.get('[data-testid="attendance-device-select"]').setValue('DEVICE-01')
    await setFaceImage(wrapper)
    await wrapper.get('[data-testid="attendance-checkin-submit"]').trigger('click')
    await flushPromises()

    expect(wrapper.get('[data-testid="attendance-checkin-error"]').text()).toContain('今日已完成上班打卡')
    expect(getMyAttendanceRecordRequest).toHaveBeenCalledTimes(1)
  })

  it('shows a blocking prompt and disables device selection with checkin submit in the device loading error state', async () => {
    getAttendanceDeviceOptionsRequest.mockRejectedValueOnce({
      message: '设备选项加载失败，请稍后重试',
    })

    const wrapper = mount(AttendanceView)
    await flushPromises()

    await setFaceImage(wrapper)

    expect(wrapper.get('[data-testid="attendance-device-blocking-error"]').text()).toContain(
      '设备选项加载失败，请稍后重试',
    )
    expect(wrapper.get('[data-testid="attendance-device-select"]').attributes('disabled')).toBeDefined()
    expect(wrapper.get('[data-testid="attendance-checkin-submit"]').attributes('disabled')).toBeDefined()

    await wrapper.get('[data-testid="attendance-checkin-submit"]').trigger('click')

    expect(submitAttendanceCheckinRequest).not.toHaveBeenCalled()
  })

  it('treats an empty wrapped device option list as a blocking unavailable state', async () => {
    getAttendanceDeviceOptionsRequest.mockResolvedValueOnce(createApiResponse([]))

    const wrapper = mount(AttendanceView)
    await flushPromises()

    expect(wrapper.get('[data-testid="attendance-device-blocking-error"]').text()).toContain(
      '暂无可用考勤设备，当前暂不可办理打卡',
    )
    expect(wrapper.get('[data-testid="attendance-device-select"]').attributes('disabled')).toBeDefined()
    expect(wrapper.get('[data-testid="attendance-checkin-submit"]').attributes('disabled')).toBeDefined()
  })

  it('shows a record loading error instead of the empty-state copy when wrapped record loading fails', async () => {
    getAttendanceDeviceOptionsRequest.mockResolvedValueOnce(createApiResponse([]))
    getMyAttendanceRecordRequest.mockRejectedValueOnce({
      message: '记录加载失败，请稍后重试',
    })

    const wrapper = mount(AttendanceView)
    await flushPromises()
    await wrapper.get('[data-testid="attendance-tab-records"]').trigger('click')

    expect(wrapper.get('[data-testid="attendance-record-error"]').text()).toContain('记录加载失败，请稍后重试')
    expect(wrapper.find('[data-testid="attendance-record-empty"]').exists()).toBe(false)
  })

  it('requests wrapped records with filters and supports page number changes', async () => {
    const records = [
      {
        id: 1,
        checkType: 'OUT',
        checkTime: '2026-04-04 18:00:00',
        status: 'NORMAL',
        exceptionType: 'MULTI_LOCATION_CONFLICT',
      },
    ]

    getMyAttendanceRecordRequest
      .mockResolvedValueOnce(createRecordResponse(records, 21))
      .mockResolvedValueOnce(createRecordResponse(records, 21))
      .mockResolvedValueOnce(createRecordResponse(records, 21))

    const wrapper = mount(AttendanceView)
    await flushPromises()

    await wrapper.get('[data-testid="attendance-tab-records"]').trigger('click')
    await wrapper.get('[data-testid="attendance-start-date-input"]').setValue('2026-04-01')
    await wrapper.get('[data-testid="attendance-end-date-input"]').setValue('2026-04-30')
    await wrapper.get('[data-testid="attendance-record-search"]').trigger('click')
    await flushPromises()

    expect(wrapper.get('[data-testid="attendance-record-total"]').text()).toContain('21')
    expect(wrapper.text()).toContain('多地点异常')
    expect(getMyAttendanceRecordRequest).toHaveBeenNthCalledWith(2, {
      pageNum: 1,
      pageSize: 10,
      startDate: '2026-04-01',
      endDate: '2026-04-30',
    })

    await wrapper.get('[data-testid="attendance-page-next"]').trigger('click')
    await flushPromises()

    expect(getMyAttendanceRecordRequest).toHaveBeenNthCalledWith(3, {
      pageNum: 2,
      pageSize: 10,
      startDate: '2026-04-01',
      endDate: '2026-04-30',
    })
    expect(wrapper.get('[data-testid="attendance-current-page"]').text()).toContain('2')
  })

  it('keeps the latest records when an older slower record request resolves after a newer refresh', async () => {
    const firstRecords = createDeferred()
    const secondRecords = createDeferred()

    getAttendanceDeviceOptionsRequest.mockResolvedValueOnce(createApiResponse([
      {
        deviceId: 'DEVICE-01',
        name: '前台设备',
        location: '一楼前台',
      },
    ]))
    getMyAttendanceRecordRequest
      .mockReturnValueOnce(firstRecords.promise)
      .mockReturnValueOnce(secondRecords.promise)

    const wrapper = mount(AttendanceView)
    await flushPromises()

    await wrapper.get('[data-testid="attendance-tab-records"]').trigger('click')
    await wrapper.get('[data-testid="attendance-record-search"]').trigger('click')

    secondRecords.resolve(
      createRecordResponse([
        {
          id: 2,
          checkType: 'IN',
          checkTime: '2026-04-05 09:00:00',
          status: 'NORMAL',
        },
      ]),
    )
    await flushPromises()

    expect(wrapper.text()).toContain('2026-04-05 09:00:00')
    expect(wrapper.text()).not.toContain('2026-04-04 09:00:00')

    firstRecords.resolve(
      createRecordResponse([
        {
          id: 1,
          checkType: 'IN',
          checkTime: '2026-04-04 09:00:00',
          status: 'NORMAL',
        },
      ]),
    )
    await flushPromises()

    expect(wrapper.text()).toContain('2026-04-05 09:00:00')
    expect(wrapper.text()).not.toContain('2026-04-04 09:00:00')
  })

  it('submits a repair request from wrapped records and refreshes records after success', async () => {
    const records = [
      {
        id: 1,
        checkType: 'OUT',
        checkTime: '2026-04-04 18:00:00',
        status: 'NORMAL',
      },
    ]

    getMyAttendanceRecordRequest
      .mockResolvedValueOnce(createRecordResponse(records))
      .mockResolvedValueOnce(createRecordResponse(records))

    const wrapper = mount(AttendanceView)
    await flushPromises()

    await wrapper.get('[data-testid="attendance-tab-records"]').trigger('click')

    await wrapper.get('[data-testid="attendance-repair-open-1"]').trigger('click')

    expect(wrapper.get('[data-testid="attendance-repair-dialog"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="attendance-repair-submit"]').attributes('disabled')).toBeDefined()

    await wrapper.get('[data-testid="attendance-repair-reason-input"]').setValue('漏签退补卡')
    expect(wrapper.get('[data-testid="attendance-repair-submit"]').attributes('disabled')).toBeUndefined()
    await wrapper.get('[data-testid="attendance-repair-submit"]').trigger('click')
    await flushPromises()

    expect(submitAttendanceRepairRequest).toHaveBeenCalledWith({
      checkType: 'OUT',
      checkTime: '2026-04-04 18:00:00',
      repairReason: '漏签退补卡',
    })
    expect(getMyAttendanceRecordRequest).toHaveBeenCalledTimes(2)
    expect(getMyAttendanceRecordRequest).toHaveBeenLastCalledWith({
      pageNum: 1,
      pageSize: 10,
      startDate: '',
      endDate: '',
    })
  })

  it('keeps the repair dialog open and shows a visible error without refreshing records when repair returns a wrapped business failure', async () => {
    const records = [
      {
        id: 1,
        checkType: 'OUT',
        checkTime: '2026-04-04 18:00:00',
        status: 'NORMAL',
      },
    ]

    getMyAttendanceRecordRequest.mockResolvedValueOnce(createRecordResponse(records))
    submitAttendanceRepairRequest.mockResolvedValueOnce(createBusinessFailureResponse('当前记录无需补卡'))

    const wrapper = mount(AttendanceView)
    await flushPromises()

    await wrapper.get('[data-testid="attendance-tab-records"]').trigger('click')
    await wrapper.get('[data-testid="attendance-repair-open-1"]').trigger('click')
    await wrapper.get('[data-testid="attendance-repair-reason-input"]').setValue('重复提交补卡')
    await wrapper.get('[data-testid="attendance-repair-submit"]').trigger('click')
    await flushPromises()

    expect(wrapper.get('[data-testid="attendance-repair-dialog"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="attendance-repair-error"]').text()).toContain('当前记录无需补卡')
    expect(getMyAttendanceRecordRequest).toHaveBeenCalledTimes(1)
  })

  it('shows a visible refresh failure on the checkin tab when record refresh fails after a successful checkin', async () => {
    getAttendanceDeviceOptionsRequest.mockResolvedValueOnce(createApiResponse([
      {
        deviceId: 'DEVICE-01',
        name: '前台设备',
        location: '一楼前台',
      },
    ]))
    getMyAttendanceRecordRequest
      .mockResolvedValueOnce(createRecordResponse())
      .mockRejectedValueOnce({
        message: '记录刷新失败，请稍后重试',
      })

    const wrapper = mount(AttendanceView)
    await flushPromises()

    await wrapper.get('[data-testid="attendance-device-select"]').setValue('DEVICE-01')
    await setFaceImage(wrapper)
    await wrapper.get('[data-testid="attendance-checkin-submit"]').trigger('click')
    await flushPromises()

    expect(wrapper.get('[data-testid="attendance-checkin-panel"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="attendance-checkin-error"]').text()).toContain('记录刷新失败，请稍后重试')
    expect(wrapper.find('[data-testid="attendance-record-error"]').exists()).toBe(false)
  })
})
