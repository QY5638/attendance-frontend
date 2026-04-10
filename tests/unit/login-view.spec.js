import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { login, messageError, messageSuccess, replace, resolvePostLoginPath, routeQueryRef, validate } = vi.hoisted(() => ({
  login: vi.fn(),
  messageError: vi.fn(),
  messageSuccess: vi.fn(),
  replace: vi.fn(),
  resolvePostLoginPath: vi.fn((redirect, defaultHomePath) => redirect || defaultHomePath),
  routeQueryRef: {
    current: {
      redirect: '/attendance?tab=history',
    },
  },
  validate: vi.fn(),
}))

vi.mock('vue-router', () => ({
  useRoute: () => ({
    query: routeQueryRef.current,
  }),
  useRouter: () => ({ replace }),
}))

vi.mock('element-plus', () => ({
  ElMessage: {
    error: messageError,
    success: messageSuccess,
  },
}))

vi.mock('../../src/router/guard', () => ({
  resolvePostLoginPath,
}))

vi.mock('../../src/store/auth', () => ({
  useAuthStore: () => ({
    login,
    defaultHomePath: '/dashboard',
  }),
}))

import LoginView from '../../src/views/login/LoginView.vue'

const ElCardStub = defineComponent({
  template: '<div><slot name="header" /><slot /></div>',
})

const ElFormStub = defineComponent({
  setup(_, { expose }) {
    expose({
      validate,
    })

    return {}
  },
  template: '<form @submit.prevent><slot /></form>',
})

const ElFormItemStub = defineComponent({
  props: {
    prop: {
      type: String,
      default: '',
    },
    error: {
      type: String,
      default: '',
    },
  },
  template:
    '<div><slot /><span v-if="error" :data-testid="`${prop}-error`" class="field-error">{{ error }}</span></div>',
})

const ElInputStub = defineComponent({
  props: {
    modelValue: {
      type: String,
      default: '',
    },
    type: {
      type: String,
      default: 'text',
    },
  },
  emits: ['update:modelValue'],
  template:
    '<input :type="type" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
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

const ElAlertStub = defineComponent({
  props: {
    title: {
      type: String,
      default: '',
    },
  },
  template: '<div class="form-error">{{ title }}</div>',
})

function mountLoginView() {
  return mount(LoginView, {
    global: {
      stubs: {
        ElAlert: ElAlertStub,
        ElButton: ElButtonStub,
        ElCard: ElCardStub,
        ElForm: ElFormStub,
        ElFormItem: ElFormItemStub,
        ElInput: ElInputStub,
      },
    },
  })
}

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

function getUsernameInput(wrapper) {
  return wrapper.get('[data-testid="login-username-input"]')
}

function getPasswordInput(wrapper) {
  return wrapper.get('[data-testid="login-password-input"]')
}

function getSubmitButton(wrapper) {
  return wrapper.get('[data-testid="login-submit-button"]')
}

function getRoleButton(wrapper, roleCode) {
  return wrapper.get(`[data-testid="login-role-${roleCode.toLowerCase()}-button"]`)
}

describe('login view', () => {
  beforeEach(() => {
    login.mockReset()
    messageError.mockReset()
    messageSuccess.mockReset()
    replace.mockReset()
    resolvePostLoginPath.mockReset()
    resolvePostLoginPath.mockImplementation((redirect, defaultHomePath) => redirect || defaultHomePath)
    routeQueryRef.current = {
      redirect: '/attendance?tab=history',
    }
    validate.mockReset()
    validate.mockResolvedValue(true)
  })

  it('trims username and redirects with resolved post-login path after success', async () => {
    login.mockResolvedValue(undefined)
    resolvePostLoginPath.mockReturnValue('/attendance?tab=history')

    const wrapper = mountLoginView()

    await getRoleButton(wrapper, 'ADMIN').trigger('click')
    await getUsernameInput(wrapper).setValue(' admin ')
    await getPasswordInput(wrapper).setValue('123456')
    await getSubmitButton(wrapper).trigger('click')
    await flushPromises()

    expect(login).toHaveBeenCalledWith({
      username: 'admin',
      password: '123456',
      expectedRoleCode: 'ADMIN',
    })
    expect(resolvePostLoginPath).toHaveBeenCalledWith('/attendance?tab=history', '/dashboard')
    expect(replace).toHaveBeenCalledWith('/attendance?tab=history')
  })

  it('renders the simplified enterprise portal copy on the left panel', () => {
    const wrapper = mountLoginView()

    expect(wrapper.text()).toContain('企业考勤管理系统')
    expect(wrapper.text()).toContain('常用业务')
    expect(wrapper.text()).toContain('登录要求')
    expect(wrapper.text()).toContain('管理员')
    expect(wrapper.text()).toContain('员工')
    expect(wrapper.text()).not.toContain('适用范围')
    expect(wrapper.text()).not.toContain('内部办公统一登录入口')
  })

  it('requires selecting a role before submitting', async () => {
    const wrapper = mountLoginView()

    await getUsernameInput(wrapper).setValue('admin')
    await getPasswordInput(wrapper).setValue('123456')
    await getSubmitButton(wrapper).trigger('click')
    await flushPromises()

    expect(wrapper.get('[data-testid="login-role-error"]').text()).toBe('请选择登录身份')
    expect(login).not.toHaveBeenCalled()
  })

  it('renders field-level submit errors without redirecting', async () => {
    login.mockRejectedValue({
      type: 'auth',
      field: 'username',
      message: '用户名不能为空',
    })

    const wrapper = mountLoginView()

    await getRoleButton(wrapper, 'ADMIN').trigger('click')
    await getUsernameInput(wrapper).setValue('   ')
    await getPasswordInput(wrapper).setValue('123456')
    await getSubmitButton(wrapper).trigger('click')
    await flushPromises()

    expect(wrapper.get('[data-testid="username-error"]').text()).toBe('用户名不能为空')
    expect(wrapper.find('[data-testid="login-form-error"]').exists()).toBe(false)
    expect(replace).not.toHaveBeenCalled()
  })

  it('renders form-level submit errors in alert without redirecting', async () => {
    login.mockRejectedValue({
      type: 'auth',
      field: '',
      message: '账号已禁用',
    })

    const wrapper = mountLoginView()

    await getRoleButton(wrapper, 'ADMIN').trigger('click')
    await getUsernameInput(wrapper).setValue('disabled')
    await getPasswordInput(wrapper).setValue('123456')
    await getSubmitButton(wrapper).trigger('click')
    await flushPromises()

    expect(wrapper.get('[data-testid="login-form-error"]').text()).toBe('账号已禁用')
    expect(wrapper.find('[data-testid="username-error"]').exists()).toBe(false)
    expect(replace).not.toHaveBeenCalled()
  })

  it('locks duplicate submits before validation finishes and releases after invalid validation', async () => {
    const pendingValidation = createDeferred()

    validate.mockReturnValueOnce(pendingValidation.promise)
    validate.mockResolvedValueOnce(true)
    login.mockResolvedValue(undefined)

    const wrapper = mountLoginView()

    await getRoleButton(wrapper, 'ADMIN').trigger('click')
    await getUsernameInput(wrapper).setValue('admin')
    await getPasswordInput(wrapper).setValue('123456')

    const submitButton = getSubmitButton(wrapper)
    submitButton.element.click()
    submitButton.element.click()
    await flushPromises()

    expect(validate).toHaveBeenCalledTimes(1)
    expect(login).not.toHaveBeenCalled()

    pendingValidation.resolve(false)
    await flushPromises()

    submitButton.element.click()
    await flushPromises()

    expect(validate).toHaveBeenCalledTimes(2)
    expect(login).toHaveBeenCalledTimes(1)
  })

  it('clears stale field submit errors before a successful retry resolves', async () => {
    const pendingLogin = createDeferred()

    login
      .mockRejectedValueOnce({
        type: 'auth',
        field: 'username',
        message: '用户名不能为空',
      })
      .mockImplementationOnce(() => pendingLogin.promise)

    const wrapper = mountLoginView()

    await getRoleButton(wrapper, 'ADMIN').trigger('click')
    await getUsernameInput(wrapper).setValue('admin')
    await getPasswordInput(wrapper).setValue('123456')
    await getSubmitButton(wrapper).trigger('click')
    await flushPromises()

    expect(wrapper.get('[data-testid="username-error"]').text()).toBe('用户名不能为空')

    getSubmitButton(wrapper).element.click()
    await flushPromises()

    expect(wrapper.find('[data-testid="username-error"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="login-form-error"]').exists()).toBe(false)

    pendingLogin.resolve(undefined)
    await flushPromises()

    expect(replace).toHaveBeenCalledWith('/attendance?tab=history')
  })
})
