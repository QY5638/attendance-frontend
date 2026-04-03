# FE-01 Followup 联调增强 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 FE-01 补齐登录错误归一化、网络异常提示、401 失效回跳和安全 redirect 校验，让前端认证链路更贴近后端真实契约。

**Architecture:** 保持现有 `api -> store -> router -> view` 结构不变。业务登录错误在 `src/api/auth.js` 归一化，请求/网络错误在 `src/utils/request.js` 归一化，redirect 安全规则收口在 `src/router/guard.js`，登录页只消费统一错误对象并执行安全回跳。

**Tech Stack:** Vue3, Vue Router, Pinia, Axios, Element Plus, Vitest, Vue Test Utils, jsdom

---

## File Map

- `src/api/auth.js`: 归一化登录业务错误并输出统一错误对象
- `src/utils/request.js`: 归一化网络/超时/401 错误并驱动未授权处理
- `src/store/auth.js`: 收口清理登录态动作，供手动退出与 401 共用
- `src/router/guard.js`: 实现 redirect 安全校验、登录后跳转目标计算
- `src/router/index.js`: 401 时根据当前受保护路由组装合法 redirect 并跳回登录页
- `src/views/login/LoginView.vue`: 展示字段级/表单级错误，阻止重复提交，成功后安全回跳
- `tests/unit/auth-api.spec.js`: 验证登录业务错误映射
- `tests/unit/request-error.spec.js`: 验证网络/超时/401 归一化与回调行为
- `tests/unit/auth-store.spec.js`: 验证会话清理动作
- `tests/unit/router-guard.spec.js`: 验证 redirect 安全规则与跳转优先级
- `tests/unit/login-view.spec.js`: 验证登录页错误展示与成功回跳

### Task 1: 归一化登录业务错误

**Files:**
- Create: `tests/unit/auth-api.spec.js`
- Modify: `src/api/auth.js`

- [ ] **Step 1: 写出登录业务错误归一化失败测试**

```js
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { post } = vi.hoisted(() => ({ post: vi.fn() }))

vi.mock('../../src/utils/request', () => ({
  default: {
    post,
  },
}))

import { loginRequest } from '../../src/api/auth'

describe('auth api', () => {
  beforeEach(() => {
    post.mockReset()
  })

  it('maps username blank response to field level auth error', async () => {
    post.mockResolvedValue({ code: 400, message: '用户名不能为空' })

    await expect(loginRequest({ username: '', password: '123456' })).rejects.toMatchObject({
      type: 'auth',
      field: 'username',
      message: '用户名不能为空',
    })
  })

  it('maps generic auth failure without field', async () => {
    post.mockResolvedValue({ code: 400, message: '账号已禁用' })

    await expect(loginRequest({ username: 'disabled', password: '123456' })).rejects.toMatchObject({
      type: 'auth',
      field: '',
      message: '账号已禁用',
    })
  })

  it('keeps login success payload unchanged', async () => {
    post.mockResolvedValue({
      code: 200,
      data: { token: 'token-value', roleCode: 'ADMIN', realName: '系统管理员' },
    })

    await expect(loginRequest({ username: 'admin', password: '123456' })).resolves.toEqual({
      token: 'token-value',
      roleCode: 'ADMIN',
      realName: '系统管理员',
    })
  })
})
```

- [ ] **Step 2: 运行测试确认红灯**

Run: `npm run test -- tests/unit/auth-api.spec.js`
Expected: FAIL，现有实现会抛出 `Error`，与期望的 `{ type, field, message }` 对象不一致

- [ ] **Step 3: 在 auth API 中实现最小错误映射**

```js
const AUTH_FIELD_MESSAGE_MAP = {
  用户名不能为空: 'username',
  密码不能为空: 'password',
}

export function createAuthError(message, field = '') {
  return {
    type: 'auth',
    message: message || '登录失败，请稍后重试',
    field,
  }
}

export function normalizeLoginErrorResponse(result = {}) {
  const message = result.message || '登录失败，请稍后重试'

  return createAuthError(message, AUTH_FIELD_MESSAGE_MAP[message] || '')
}

export async function loginRequest(payload) {
  const result = await request.post('/auth/login', payload)

  if (result.code !== 200) {
    throw normalizeLoginErrorResponse(result)
  }

  return result.data || {
    token: '',
    roleCode: '',
    realName: '',
  }
}
```

- [ ] **Step 4: 重新运行 auth API 测试**

Run: `npm run test -- tests/unit/auth-api.spec.js`
Expected: PASS

- [ ] **Step 5: 提交本任务**

```bash
git add tests/unit/auth-api.spec.js src/api/auth.js
git commit -m "feat: 归一化 FE-01 登录业务错误"
```

### Task 2: 归一化网络异常、超时和 401

**Files:**
- Create: `tests/unit/request-error.spec.js`
- Modify: `src/utils/request.js`

- [ ] **Step 1: 写出请求错误归一化失败测试**

```js
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { handleRequestError } from '../../src/utils/request'

describe('request error normalization', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('maps timeout to timeout error object', () => {
    expect(handleRequestError({ code: 'ECONNABORTED' })).toEqual({
      type: 'timeout',
      message: '请求超时，请稍后重试',
      field: '',
    })
  })

  it('maps network failure to service unavailable message', () => {
    expect(handleRequestError({ request: {}, response: undefined })).toEqual({
      type: 'network',
      message: '无法连接到后端服务，请确认接口服务已启动',
      field: '',
    })
  })

  it('clears auth storage and calls unauthorized handler on 401', () => {
    const handler = vi.fn()
    localStorage.setItem('attendance_token', 'expired-token')

    const normalized = handleRequestError({ response: { status: 401 } }, handler)

    expect(normalized).toEqual({
      type: 'unauthorized',
      message: '登录状态已失效，请重新登录',
      field: '',
    })
    expect(localStorage.getItem('attendance_token')).toBeNull()
    expect(handler).toHaveBeenCalledWith(normalized)
  })
})
```

- [ ] **Step 2: 运行测试确认红灯**

Run: `npm run test -- tests/unit/request-error.spec.js`
Expected: FAIL，当前 `src/utils/request.js` 未导出 `handleRequestError`

- [ ] **Step 3: 在 request 层实现最小错误归一化**

```js
function createRequestError(type, message) {
  return {
    type,
    message,
    field: '',
  }
}

export function handleRequestError(error, handler = unauthorizedHandler) {
  let normalized

  if (error?.response?.status === 401) {
    clearAuthStorage()
    normalized = createRequestError('unauthorized', '登录状态已失效，请重新登录')
    handler?.(normalized)
    return normalized
  }

  if (error?.code === 'ECONNABORTED') {
    return createRequestError('timeout', '请求超时，请稍后重试')
  }

  if (!error?.response) {
    return createRequestError('network', '无法连接到后端服务，请确认接口服务已启动')
  }

  return createRequestError('unknown', '请求失败，请稍后重试')
}

request.interceptors.response.use(
  (response) => response.data,
  (error) => Promise.reject(handleRequestError(error)),
)
```

- [ ] **Step 4: 重新运行 request 测试**

Run: `npm run test -- tests/unit/request-error.spec.js`
Expected: PASS

- [ ] **Step 5: 提交本任务**

```bash
git add tests/unit/request-error.spec.js src/utils/request.js
git commit -m "feat: 归一化 FE-01 请求异常与 401 行为"
```

### Task 3: 收紧 redirect 安全规则与 401 回跳

**Files:**
- Modify: `src/store/auth.js`
- Modify: `src/router/guard.js`
- Modify: `src/router/index.js`
- Modify: `tests/unit/auth-store.spec.js`
- Modify: `tests/unit/router-guard.spec.js`

- [ ] **Step 1: 写出 redirect 安全规则与会话清理失败测试**

```js
import { describe, expect, it } from 'vitest'

import {
  normalizeRedirectPath,
  resolveGuardNavigation,
  resolvePostLoginPath,
} from '../../src/router/guard'

describe('router guard', () => {
  it('drops unsafe redirect targets', () => {
    expect(normalizeRedirectPath('http://evil.example')).toBe('')
    expect(normalizeRedirectPath('//evil.example')).toBe('')
    expect(normalizeRedirectPath('/login')).toBe('')
  })

  it('keeps safe in-app redirect targets', () => {
    expect(normalizeRedirectPath('/attendance?tab=history')).toBe('/attendance?tab=history')
  })

  it('falls back to default home when login redirect is unsafe', () => {
    expect(resolvePostLoginPath('http://evil.example', '/dashboard')).toBe('/dashboard')
  })

  it('adds redirect for unauthenticated protected route', () => {
    expect(
      resolveGuardNavigation({
        isAuthenticated: false,
        canAccess: false,
        defaultHomePath: '/dashboard',
        to: { path: '/warning', fullPath: '/warning?level=high', meta: { requiresAuth: true } },
      }),
    ).toEqual({ path: '/login', query: { redirect: '/warning?level=high' } })
  })
})
```

```js
it('clears session through clearSession action', () => {
  const store = useAuthStore()
  store.token = 'token-value'
  store.roleCode = 'ADMIN'
  store.realName = '系统管理员'
  localStorage.setItem('attendance_token', 'token-value')

  store.clearSession()

  expect(store.token).toBe('')
  expect(localStorage.getItem('attendance_token')).toBeNull()
})
```

- [ ] **Step 2: 运行测试确认红灯**

Run: `npm run test -- tests/unit/router-guard.spec.js tests/unit/auth-store.spec.js`
Expected: FAIL，当前 guard 未导出 `normalizeRedirectPath` / `resolvePostLoginPath`，store 也没有 `clearSession`

- [ ] **Step 3: 实现 redirect 校验和统一清理动作**

```js
export function normalizeRedirectPath(redirect) {
  if (typeof redirect !== 'string' || !redirect.startsWith('/') || redirect.startsWith('//')) {
    return ''
  }

  if (redirect === '/login' || /^https?:\/\//i.test(redirect)) {
    return ''
  }

  return redirect
}

export function resolvePostLoginPath(redirect, defaultHomePath) {
  return normalizeRedirectPath(redirect) || defaultHomePath
}

export function resolveGuardNavigation({ isAuthenticated, canAccess, defaultHomePath, to }) {
  if (to.meta?.requiresAuth && !isAuthenticated) {
    const redirect = normalizeRedirectPath(to.fullPath || to.path)
    return redirect ? { path: '/login', query: { redirect } } : { path: '/login' }
  }

  if (isAuthenticated && (to.path === '/login' || to.path === '/')) {
    return { path: defaultHomePath }
  }

  if (to.meta?.requiresAuth && !canAccess) {
    return { path: '/403' }
  }

  return true
}
```

```js
clearSession() {
  this.token = ''
  this.roleCode = ''
  this.realName = ''
  this.restored = true
  clearAuthStorage()
},

logout() {
  this.clearSession()
}
```

```js
setUnauthorizedHandler(() => {
  const currentRoute = router.currentRoute.value
  const redirect = currentRoute.meta?.requiresAuth
    ? normalizeRedirectPath(currentRoute.fullPath || currentRoute.path)
    : ''

  authStore.clearSession()

  router.replace(redirect ? { path: '/login', query: { redirect } } : { path: '/login' })
})
```

- [ ] **Step 4: 重新运行 guard 与 store 测试**

Run: `npm run test -- tests/unit/router-guard.spec.js tests/unit/auth-store.spec.js`
Expected: PASS

- [ ] **Step 5: 提交本任务**

```bash
git add src/store/auth.js src/router/guard.js src/router/index.js tests/unit/auth-store.spec.js tests/unit/router-guard.spec.js
git commit -m "feat: 收紧 FE-01 redirect 安全规则与会话回跳"
```

### Task 4: 完善登录页交互与最终回归验证

**Files:**
- Create: `tests/unit/login-view.spec.js`
- Modify: `src/views/login/LoginView.vue`

- [ ] **Step 1: 写出登录页交互失败测试**

```js
import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const replace = vi.fn()
const login = vi.fn()

vi.mock('vue-router', () => ({
  useRouter: () => ({ replace }),
  useRoute: () => ({ query: { redirect: '/attendance?tab=history' } }),
}))

vi.mock('../../src/store/auth', () => ({
  useAuthStore: () => ({
    login,
    defaultHomePath: '/dashboard',
  }),
}))

import LoginView from '../../src/views/login/LoginView.vue'

describe('login view', () => {
  beforeEach(() => {
    replace.mockReset()
    login.mockReset()
  })

  it('redirects to safe redirect after successful login', async () => {
    login.mockResolvedValue(undefined)

    const wrapper = mount(LoginView, {
      global: {
        stubs: {
          ElCard: { template: '<div><slot /><slot name="header" /></div>' },
          ElForm: { template: '<form><slot /></form>', methods: { validate: () => Promise.resolve(true) } },
          ElFormItem: { props: ['error'], template: '<div><slot /><span class="field-error">{{ error }}</span></div>' },
          ElInput: { props: ['modelValue'], emits: ['update:modelValue'], template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />' },
          ElButton: { template: '<button @click="$emit(\'click\')"><slot /></button>' },
          ElAlert: { props: ['title'], template: '<div class="form-error">{{ title }}</div>' },
        },
      },
    })

    await wrapper.find('input').setValue(' admin ')
    await wrapper.findAll('input')[1].setValue('123456')
    await wrapper.find('button').trigger('click')
    await flushPromises()

    expect(login).toHaveBeenCalledWith({ username: 'admin', password: '123456' })
    expect(replace).toHaveBeenCalledWith('/attendance?tab=history')
  })

  it('renders field level login error without redirecting', async () => {
    login.mockRejectedValue({ type: 'auth', field: 'username', message: '用户名不能为空' })

    const wrapper = mount(LoginView, {
      global: {
        stubs: {
          ElCard: { template: '<div><slot /><slot name="header" /></div>' },
          ElForm: { template: '<form><slot /></form>', methods: { validate: () => Promise.resolve(true) } },
          ElFormItem: { props: ['error'], template: '<div><slot /><span class="field-error">{{ error }}</span></div>' },
          ElInput: { props: ['modelValue'], emits: ['update:modelValue'], template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />' },
          ElButton: { template: '<button @click="$emit(\'click\')"><slot /></button>' },
          ElAlert: { props: ['title'], template: '<div class="form-error">{{ title }}</div>' },
        },
      },
    })

    await wrapper.find('button').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('用户名不能为空')
    expect(replace).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: 运行测试确认红灯**

Run: `npm run test -- tests/unit/login-view.spec.js`
Expected: FAIL，当前登录页仍使用原始 `redirect`，也没有字段级/表单级错误展示

- [ ] **Step 3: 在登录页实现最小交互增强**

```vue
<el-form-item label="用户名" prop="username" :error="fieldErrors.username">
  <el-input v-model="form.username" placeholder="请输入用户名" clearable />
</el-form-item>

<el-form-item label="密码" prop="password" :error="fieldErrors.password">
  <el-input v-model="form.password" placeholder="请输入密码" show-password clearable />
</el-form-item>

<el-alert
  v-if="formError"
  class="login-page__error"
  type="error"
  :closable="false"
  :title="formError"
/>
```

```js
import { reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { resolvePostLoginPath } from '../../router/guard'

const formError = ref('')
const fieldErrors = reactive({ username: '', password: '' })

function clearSubmitErrors() {
  formError.value = ''
  fieldErrors.username = ''
  fieldErrors.password = ''
}

function applySubmitError(error) {
  if (error?.field && Object.prototype.hasOwnProperty.call(fieldErrors, error.field)) {
    fieldErrors[error.field] = error.message || '登录失败，请稍后重试'
    return
  }

  formError.value = error?.message || '登录失败，请稍后重试'
}

async function handleSubmit() {
  if (submitting.value) {
    return
  }

  clearSubmitErrors()
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) {
    return
  }

  submitting.value = true

  try {
    await authStore.login({ username: form.username.trim(), password: form.password })
    ElMessage.success('登录成功')
    router.replace(resolvePostLoginPath(route.query.redirect, authStore.defaultHomePath))
  } catch (error) {
    applySubmitError(error)
  } finally {
    submitting.value = false
  }
}
```

- [ ] **Step 4: 运行登录页测试、完整测试和构建**

Run: `npm run test -- tests/unit/login-view.spec.js`
Expected: PASS

Run: `npm run test`
Expected: PASS，所有单元测试通过

Run: `npm run build`
Expected: PASS，构建成功，允许保留现有 chunk size warning

- [ ] **Step 5: 提交本任务**

```bash
git add src/views/login/LoginView.vue tests/unit/login-view.spec.js
git commit -m "feat: 增强 FE-01 登录交互与安全回跳"
```
