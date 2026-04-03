import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { addDepartment, confirm, deleteDepartment, fetchDepartmentList, messageError, messageSuccess, updateDepartment, validate } = vi.hoisted(() => ({
  addDepartment: vi.fn(),
  confirm: vi.fn(),
  deleteDepartment: vi.fn(),
  fetchDepartmentList: vi.fn(),
  messageError: vi.fn(),
  messageSuccess: vi.fn(),
  updateDepartment: vi.fn(),
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
  addDepartment,
  deleteDepartment,
  fetchDepartmentList,
  updateDepartment,
}))

import DepartmentView from '../../src/views/department/DepartmentView.vue'

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
      type: String,
      default: '',
    },
  },
  emits: ['update:modelValue'],
  template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
})

const ElPaginationStub = defineComponent({
  template: '<div></div>',
})

const ElTableStub = defineComponent({
  template: '<div><slot /></div>',
})

const ElTableColumnStub = defineComponent({
  template: '<div></div>',
})

function mountDepartmentView() {
  return mount(DepartmentView, {
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
        ElPagination: ElPaginationStub,
        ElTable: ElTableStub,
        ElTableColumn: ElTableColumnStub,
      },
    },
  })
}

describe('department view', () => {
  beforeEach(() => {
    addDepartment.mockReset()
    confirm.mockReset()
    deleteDepartment.mockReset()
    fetchDepartmentList.mockReset()
    messageError.mockReset()
    messageSuccess.mockReset()
    updateDepartment.mockReset()
    validate.mockReset()
    validate.mockResolvedValue(true)
    fetchDepartmentList.mockResolvedValue({
      total: 1,
      items: [{ id: 1, name: '研发部', description: '负责系统研发' }],
    })
  })

  it('loads department list on mount', async () => {
    const wrapper = mountDepartmentView()

    await flushPromises()

    expect(fetchDepartmentList).toHaveBeenCalledWith({
      pageNum: 1,
      pageSize: 10,
    })
    expect(wrapper.text()).toContain('部门管理')
  })

  it('falls back to previous page after deleting the last row on current page', async () => {
    confirm.mockResolvedValue(undefined)
    deleteDepartment.mockResolvedValue(undefined)

    const wrapper = mountDepartmentView()

    await flushPromises()
    fetchDepartmentList.mockClear()

    wrapper.vm.pagination.pageNum = 2
    wrapper.vm.rows = [{ id: 2, name: '财务部', description: '负责财务管理' }]

    await wrapper.vm.handleDelete({ id: 2, name: '财务部' })
    await flushPromises()

    expect(deleteDepartment).toHaveBeenCalledWith(2)
    expect(fetchDepartmentList).toHaveBeenCalledWith({
      pageNum: 1,
      pageSize: 10,
    })
  })
})
