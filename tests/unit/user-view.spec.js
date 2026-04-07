import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  addUser,
  confirm,
  deleteUser,
  fetchDepartmentList,
  fetchRoleList,
  fetchUserList,
  messageError,
  messageSuccess,
  updateUser,
  validate,
} = vi.hoisted(() => ({
  addUser: vi.fn(),
  confirm: vi.fn(),
  deleteUser: vi.fn(),
  fetchDepartmentList: vi.fn(),
  fetchRoleList: vi.fn(),
  fetchUserList: vi.fn(),
  messageError: vi.fn(),
  messageSuccess: vi.fn(),
  updateUser: vi.fn(),
  validate: vi.fn(),
}))

vi.mock('element-plus', () => ({
  ElMessage: {
    error: messageError,
    success: messageSuccess,
  },
  ElMessageBox: {
    confirm,
  },
}))

vi.mock('../../src/api/department', () => ({
  fetchDepartmentList,
}))

vi.mock('../../src/api/role', () => ({
  fetchRoleList,
}))

vi.mock('../../src/api/user', () => ({
  addUser,
  deleteUser,
  fetchUserList,
  updateUser,
}))

import UserView from '../../src/views/user/UserView.vue'

const ElButtonStub = defineComponent({
  emits: ['click'],
  template: '<button type="button" @click="$emit(\'click\')"><slot /></button>',
})

const ElCardStub = defineComponent({
  template: '<div><slot name="header" /><slot /></div>',
})

const ElColStub = defineComponent({
  template: '<div><slot /></div>',
})

const ElDialogStub = defineComponent({
  props: {
    modelValue: {
      type: Boolean,
      default: false,
    },
  },
  template: '<div v-if="modelValue"><slot /><slot name="footer" /></div>',
})

const ElFormStub = defineComponent({
  setup(_, { expose }) {
    expose({ validate })
    return {}
  },
  template: '<form><slot /></form>',
})

const ElFormItemStub = defineComponent({
  template: '<div><slot /></div>',
})

const ElInputStub = defineComponent({
  props: {
    modelValue: {
      type: [String, Number],
      default: '',
    },
  },
  emits: ['update:modelValue'],
  template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
})

const ElOptionStub = defineComponent({
  template: '<div></div>',
})

const ElPaginationStub = defineComponent({
  template: '<div></div>',
})

const ElRadioGroupStub = defineComponent({
  template: '<div><slot /></div>',
})

const ElRadioStub = defineComponent({
  template: '<label><slot /></label>',
})

const ElRowStub = defineComponent({
  template: '<div><slot /></div>',
})

const ElSelectStub = defineComponent({
  template: '<div><slot /></div>',
})

const ElTableStub = defineComponent({
  template: '<div><slot /></div>',
})

const ElTableColumnStub = defineComponent({
  template: '<div></div>',
})

const ElTagStub = defineComponent({
  template: '<span><slot /></span>',
})

function mountUserView() {
  return mount(UserView, {
    global: {
      directives: {
        loading: {},
      },
      stubs: {
        ElButton: ElButtonStub,
        ElCard: ElCardStub,
        ElCol: ElColStub,
        ElDialog: ElDialogStub,
        ElForm: ElFormStub,
        ElFormItem: ElFormItemStub,
        ElInput: ElInputStub,
        ElOption: ElOptionStub,
        ElPagination: ElPaginationStub,
        ElRadio: ElRadioStub,
        ElRadioGroup: ElRadioGroupStub,
        ElRow: ElRowStub,
        ElSelect: ElSelectStub,
        ElTable: ElTableStub,
        ElTableColumn: ElTableColumnStub,
        ElTag: ElTagStub,
      },
    },
  })
}

describe('user view', () => {
  beforeEach(() => {
    addUser.mockReset()
    confirm.mockReset()
    deleteUser.mockReset()
    fetchDepartmentList.mockReset()
    fetchRoleList.mockReset()
    fetchUserList.mockReset()
    messageError.mockReset()
    messageSuccess.mockReset()
    updateUser.mockReset()
    validate.mockReset()
    validate.mockResolvedValue(true)
    fetchDepartmentList.mockResolvedValue({
      total: 1,
      items: [{ id: 1, name: '研发部' }],
    })
    fetchRoleList.mockResolvedValue({
      total: 1,
      items: [{ id: 2, name: '管理员' }],
    })
    fetchUserList.mockResolvedValue({
      total: 1,
      items: [{ id: 1, username: 'zhangsan', realName: '张三', deptId: 1, roleId: 2, status: 1 }],
    })
  })

  it('loads options and user list on mount', async () => {
    const wrapper = mountUserView()

    await flushPromises()

    expect(fetchDepartmentList).toHaveBeenCalledWith({ pageNum: 1, pageSize: 200 })
    expect(fetchRoleList).toHaveBeenCalledWith({ pageNum: 1, pageSize: 200 })
    expect(fetchUserList).toHaveBeenCalledWith({
      pageNum: 1,
      pageSize: 10,
    })
    expect(wrapper.text()).toContain('用户管理')
  })

  it('loads all paged options for department and role selectors', async () => {
    fetchDepartmentList
      .mockResolvedValueOnce({
        total: 201,
        items: Array.from({ length: 200 }, (_, index) => ({ id: index + 1, name: `部门${index + 1}` })),
      })
      .mockResolvedValueOnce({
        total: 201,
        items: [{ id: 201, name: '部门201' }],
      })

    fetchRoleList
      .mockResolvedValueOnce({
        total: 201,
        items: Array.from({ length: 200 }, (_, index) => ({ id: index + 1, name: `角色${index + 1}` })),
      })
      .mockResolvedValueOnce({
        total: 201,
        items: [{ id: 201, name: '角色201' }],
      })

    mountUserView()

    await flushPromises()

    expect(fetchDepartmentList).toHaveBeenNthCalledWith(1, { pageNum: 1, pageSize: 200 })
    expect(fetchDepartmentList).toHaveBeenNthCalledWith(2, { pageNum: 2, pageSize: 200 })
    expect(fetchRoleList).toHaveBeenNthCalledWith(1, { pageNum: 1, pageSize: 200 })
    expect(fetchRoleList).toHaveBeenNthCalledWith(2, { pageNum: 2, pageSize: 200 })
  })

  it('keeps selected dept and status filters when searching', async () => {
    const wrapper = mountUserView()

    await flushPromises()
    fetchUserList.mockClear()

    wrapper.vm.filters.keyword = ' zhang '
    wrapper.vm.filters.deptId = 3
    wrapper.vm.filters.status = 0
    wrapper.vm.handleSearch()
    await flushPromises()

    expect(fetchUserList).toHaveBeenCalledWith({
      pageNum: 1,
      pageSize: 10,
      keyword: 'zhang',
      deptId: 3,
      status: 0,
    })
  })

  it('falls back to previous page after deleting the last row on current page', async () => {
    confirm.mockResolvedValue(undefined)
    deleteUser.mockResolvedValue(undefined)

    const wrapper = mountUserView()

    await flushPromises()
    fetchUserList.mockClear()

    wrapper.vm.pagination.pageNum = 2
    wrapper.vm.rows = [{ id: 1, username: 'zhangsan', realName: '张三' }]

    await wrapper.vm.handleDelete({ id: 1, username: 'zhangsan', realName: '张三' })
    await flushPromises()

    expect(deleteUser).toHaveBeenCalledWith(1)
    expect(fetchUserList).toHaveBeenCalledWith({
      pageNum: 1,
      pageSize: 10,
    })
  })
})
