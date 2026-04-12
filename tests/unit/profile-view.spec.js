import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { fetchCurrentUserProfile, updateCurrentUserProfile, messageSuccess, validate, authStoreRef } = vi.hoisted(() => ({
  fetchCurrentUserProfile: vi.fn(),
  updateCurrentUserProfile: vi.fn(),
  messageSuccess: vi.fn(),
  validate: vi.fn(),
  authStoreRef: {
    current: {
      realName: '张三',
      updateIdentity: vi.fn(),
    },
  },
}))

vi.mock('element-plus', () => ({
  ElMessage: {
    success: messageSuccess,
  },
}))

vi.mock('../../src/api/user', () => ({
  fetchCurrentUserProfile,
  updateCurrentUserProfile,
}))

vi.mock('../../src/store/auth', () => ({
  useAuthStore: () => authStoreRef.current,
}))

import ProfileView from '../../src/views/profile/ProfileView.vue'

const ConsoleHeroStub = defineComponent({
  props: {
    title: { type: String, default: '' },
  },
  template: '<div data-testid="console-hero">{{ title }}<slot /></div>',
})

const ElCardStub = defineComponent({
  template: '<div><slot name="header" /><slot /></div>',
})

const ElFormStub = defineComponent({
  setup(_, { expose }) {
    expose({ validate })
    return {}
  },
  template: '<form><slot /></form>',
})

const ElRowStub = defineComponent({ template: '<div><slot /></div>' })
const ElColStub = defineComponent({ template: '<div><slot /></div>' })
const ElAlertStub = defineComponent({ props: { title: { type: String, default: '' } }, template: '<div>{{ title }}</div>' })
const ElFormItemStub = defineComponent({ template: '<div><slot /></div>' })
const ElRadioGroupStub = defineComponent({
  props: { modelValue: { type: String, default: '' } },
  emits: ['update:modelValue'],
  template: '<div><slot /></div>',
})
const ElRadioStub = defineComponent({ template: '<label><slot /></label>' })
const ElInputStub = defineComponent({
  props: {
    modelValue: { type: String, default: '' },
  },
  emits: ['update:modelValue'],
  template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
})
const ElButtonStub = defineComponent({
  props: { loading: { type: Boolean, default: false } },
  emits: ['click'],
  template: '<button type="button" :disabled="loading" @click="$emit(\'click\')"><slot /></button>',
})

function mountProfileView() {
  return mount(ProfileView, {
    global: {
      directives: {
        loading: () => {},
      },
      stubs: {
        ConsoleHero: ConsoleHeroStub,
        ElAlert: ElAlertStub,
        ElButton: ElButtonStub,
        ElCard: ElCardStub,
        ElCol: ElColStub,
        ElForm: ElFormStub,
        ElFormItem: ElFormItemStub,
        ElInput: ElInputStub,
        ElRadio: ElRadioStub,
        ElRadioGroup: ElRadioGroupStub,
        ElRow: ElRowStub,
      },
    },
  })
}

describe('profile view', () => {
  beforeEach(() => {
    fetchCurrentUserProfile.mockReset()
    updateCurrentUserProfile.mockReset()
    messageSuccess.mockReset()
    validate.mockReset()
    validate.mockResolvedValue(true)
    authStoreRef.current = {
      realName: '张三',
      updateIdentity: vi.fn(),
    }
    fetchCurrentUserProfile.mockResolvedValue({
      id: 1001,
      username: 'zhangsan',
      realName: '张三',
      gender: '男',
      phone: '13800000000',
      deptName: '研发部',
      roleName: '员工',
      status: 1,
      createTime: '2026-04-01T09:00:00',
    })
    updateCurrentUserProfile.mockResolvedValue({
      id: 1001,
      username: 'zhangsan',
      realName: '张三丰',
      gender: '男',
      phone: '13900000000',
      deptName: '研发部',
      roleName: '员工',
      status: 1,
      createTime: '2026-04-01T09:00:00',
    })
  })

  it('loads profile and submits self update', async () => {
    const wrapper = mountProfileView()
    await flushPromises()

    expect(fetchCurrentUserProfile).toHaveBeenCalledTimes(1)
    expect(wrapper.text()).toContain('个人中心')
    expect(wrapper.text()).toContain('研发部')

    const inputs = wrapper.findAll('input')
    await inputs[2].setValue('张三丰')
    await inputs[3].setValue('13900000000')
    await inputs[4].setValue('new-password')
    await wrapper.get('[data-testid="profile-submit-button"]').trigger('click')
    await flushPromises()

    expect(updateCurrentUserProfile).toHaveBeenCalledWith({
      realName: '张三丰',
      gender: '男',
      phone: '13900000000',
      password: 'new-password',
    })
    expect(authStoreRef.current.updateIdentity).toHaveBeenCalledWith({ realName: '张三丰' })
    expect(messageSuccess).toHaveBeenCalledWith('个人资料已更新')
  })
})
