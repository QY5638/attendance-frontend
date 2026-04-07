import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { addRole, confirm, deleteRole, fetchRoleList, messageError, messageSuccess, updateRole, validate } = vi.hoisted(() => ({
  addRole: vi.fn(),
  confirm: vi.fn(),
  deleteRole: vi.fn(),
  fetchRoleList: vi.fn(),
  messageError: vi.fn(),
  messageSuccess: vi.fn(),
  updateRole: vi.fn(),
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

vi.mock('../../src/api/role', () => ({
  addRole,
  deleteRole,
  fetchRoleList,
  updateRole,
}))

import RoleView from '../../src/views/role/RoleView.vue'

const ElButtonStub = defineComponent({
  emits: ['click'],
  template: '<button type="button" @click="$emit(\'click\')"><slot /></button>',
})

const ElCardStub = defineComponent({
  template: '<div><slot name="header" /><slot /></div>',
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

const ElPaginationStub = defineComponent({
  template: '<div></div>',
})

const ElRadioGroupStub = defineComponent({
  template: '<div><slot /></div>',
})

const ElRadioStub = defineComponent({
  template: '<label><slot /></label>',
})

const ElSelectStub = defineComponent({
  template: '<div><slot /></div>',
})

const ElOptionStub = defineComponent({
  template: '<div></div>',
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

function mountRoleView() {
  return mount(RoleView, {
    global: {
      directives: {
        loading: {},
      },
      stubs: {
        ElButton: ElButtonStub,
        ElCard: ElCardStub,
        ElDialog: ElDialogStub,
        ElForm: ElFormStub,
        ElFormItem: ElFormItemStub,
        ElInput: ElInputStub,
        ElOption: ElOptionStub,
        ElPagination: ElPaginationStub,
        ElRadio: ElRadioStub,
        ElRadioGroup: ElRadioGroupStub,
        ElSelect: ElSelectStub,
        ElTable: ElTableStub,
        ElTableColumn: ElTableColumnStub,
        ElTag: ElTagStub,
      },
    },
  })
}

describe('role view', () => {
  beforeEach(() => {
    addRole.mockReset()
    confirm.mockReset()
    deleteRole.mockReset()
    fetchRoleList.mockReset()
    messageError.mockReset()
    messageSuccess.mockReset()
    updateRole.mockReset()
    validate.mockReset()
    validate.mockResolvedValue(true)
    fetchRoleList.mockResolvedValue({
      total: 1,
      items: [{ id: 1, code: 'ADMIN', name: '管理员', description: '系统管理员', status: 1 }],
    })
  })

  it('loads role list on mount', async () => {
    const wrapper = mountRoleView()

    await flushPromises()

    expect(fetchRoleList).toHaveBeenCalledWith({
      pageNum: 1,
      pageSize: 10,
    })
    expect(wrapper.text()).toContain('角色管理')
  })

  it('keeps selected status filter when searching', async () => {
    const wrapper = mountRoleView()

    await flushPromises()
    fetchRoleList.mockClear()

    wrapper.vm.filters.keyword = ' HR '
    wrapper.vm.filters.status = 0
    wrapper.vm.handleSearch()
    await flushPromises()

    expect(fetchRoleList).toHaveBeenCalledWith({
      pageNum: 1,
      pageSize: 10,
      keyword: 'HR',
      status: 0,
    })
  })

  it('falls back to previous page after deleting the last row on current page', async () => {
    confirm.mockResolvedValue(undefined)
    deleteRole.mockResolvedValue(undefined)

    const wrapper = mountRoleView()

    await flushPromises()
    fetchRoleList.mockClear()

    wrapper.vm.pagination.pageNum = 2
    wrapper.vm.rows = [{ id: 2, name: '人事主管', code: 'HR', status: 1 }]

    await wrapper.vm.handleDelete({ id: 2, name: '人事主管' })
    await flushPromises()

    expect(deleteRole).toHaveBeenCalledWith(2)
    expect(fetchRoleList).toHaveBeenCalledWith({
      pageNum: 1,
      pageSize: 10,
    })
  })
})
