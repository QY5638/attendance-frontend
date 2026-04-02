# FE-01 公共壳层与认证模块 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为前端空骨架补齐可运行的 Vue3 后台工程，实现登录、认证持久化、后台壳层、角色菜单和受保护路由，并为后续 FE-02 ~ FE-08 预留入口。

**Architecture:** 使用 `Vite + Vue3 + Vue Router + Pinia + Axios + Element Plus`。路由采用静态路由树，所有菜单直接从路由 `meta` 计算，认证状态集中在 Pinia，401 由统一请求层清理状态并跳回登录页。

**Tech Stack:** Vue3, Vite, Vue Router, Pinia, Axios, Element Plus, Vitest, Vue Test Utils, jsdom

---

### Task 1: 搭建工程与测试基线

**Files:**
- Create: `package.json`
- Create: `vite.config.js`
- Create: `index.html`
- Create: `src/main.js`
- Create: `src/App.vue`

- [ ] **Step 1: 写出最小测试基线配置**

```json
{
  "name": "attendance-frontend",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "test": "vitest --run"
  }
}
```

- [ ] **Step 2: 安装依赖并确认测试框架可执行**

Run: `npm install`
Expected: 安装成功，生成 `node_modules` 与锁文件

- [ ] **Step 3: 补齐 Vite 和应用入口最小实现**

```js
// src/main.js
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import App from './App.vue'
import router from './router'

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.use(ElementPlus)
app.mount('#app')
```

- [ ] **Step 4: 构建一次空应用**

Run: `npm run build`
Expected: Vite 构建成功

### Task 2: 用测试先定义认证与权限计算规则

**Files:**
- Create: `tests/unit/auth-storage.spec.js`
- Create: `tests/unit/router-access.spec.js`
- Create: `src/utils/auth.js`
- Create: `src/router/access.js`

- [ ] **Step 1: 先写本地认证存储失败测试**

```js
import { describe, expect, it, beforeEach } from 'vitest'
import { clearAuthStorage, readAuthStorage, writeAuthStorage } from '../../src/utils/auth'

describe('auth storage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('writes and reads token roleCode and realName', () => {
    writeAuthStorage({ token: 't', roleCode: 'ADMIN', realName: '系统管理员' })
    expect(readAuthStorage()).toEqual({ token: 't', roleCode: 'ADMIN', realName: '系统管理员' })
  })

  it('clears all auth keys', () => {
    writeAuthStorage({ token: 't', roleCode: 'ADMIN', realName: '系统管理员' })
    clearAuthStorage()
    expect(readAuthStorage()).toEqual({ token: '', roleCode: '', realName: '' })
  })
})
```

- [ ] **Step 2: 跑测试确认红灯**

Run: `npm run test -- tests/unit/auth-storage.spec.js`
Expected: FAIL，提示 `../../src/utils/auth` 不存在

- [ ] **Step 3: 补最小实现让测试转绿**

```js
const TOKEN_KEY = 'attendance_token'
const ROLE_KEY = 'attendance_role_code'
const NAME_KEY = 'attendance_real_name'
```

- [ ] **Step 4: 写路由权限计算失败测试**

```js
import { describe, expect, it } from 'vitest'
import { canAccessRoles, getDefaultHomePath, isSupportedRole } from '../../src/router/access'

describe('router access', () => {
  it('supports ADMIN and EMPLOYEE only', () => {
    expect(isSupportedRole('ADMIN')).toBe(true)
    expect(isSupportedRole('EMPLOYEE')).toBe(true)
    expect(isSupportedRole('UNKNOWN')).toBe(false)
  })

  it('maps default home by role', () => {
    expect(getDefaultHomePath('ADMIN')).toBe('/dashboard')
    expect(getDefaultHomePath('EMPLOYEE')).toBe('/attendance')
  })

  it('checks route role access', () => {
    expect(canAccessRoles('ADMIN', ['ADMIN'])).toBe(true)
    expect(canAccessRoles('EMPLOYEE', ['ADMIN'])).toBe(false)
  })
})
```

- [ ] **Step 5: 跑测试确认红灯**

Run: `npm run test -- tests/unit/router-access.spec.js`
Expected: FAIL，提示 `../../src/router/access` 不存在

- [ ] **Step 6: 实现最小权限工具并重跑测试**

Run: `npm run test -- tests/unit/auth-storage.spec.js tests/unit/router-access.spec.js`
Expected: PASS

### Task 3: 用测试定义登录态与守卫行为

**Files:**
- Create: `tests/unit/auth-store.spec.js`
- Create: `tests/unit/router-guard.spec.js`
- Create: `src/api/auth.js`
- Create: `src/store/auth.js`
- Create: `src/router/guard.js`
- Modify: `src/main.js`

- [ ] **Step 1: 先写认证 store 失败测试**

```js
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../src/api/auth', () => ({ loginRequest: vi.fn() }))

describe('auth store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
  })

  it('stores login payload when login succeeds', async () => {
    // 省略：mock loginRequest 返回 token/roleCode/realName，并断言 store 状态
  })
})
```

- [ ] **Step 2: 跑测试确认红灯**

Run: `npm run test -- tests/unit/auth-store.spec.js`
Expected: FAIL，提示 `useAuthStore` 未实现

- [ ] **Step 3: 写守卫失败测试**

```js
import { describe, expect, it } from 'vitest'
import { resolveGuardNavigation } from '../../src/router/guard'

describe('router guard', () => {
  it('redirects unauthenticated protected route to login', () => {
    expect(resolveGuardNavigation({ isAuthenticated: false, to: { path: '/dashboard', meta: { requiresAuth: true } } })).toEqual({ path: '/login', query: { redirect: '/dashboard' } })
  })
})
```

- [ ] **Step 4: 跑测试确认红灯**

Run: `npm run test -- tests/unit/router-guard.spec.js`
Expected: FAIL，提示 `resolveGuardNavigation` 未实现

- [ ] **Step 5: 实现最小 store、登录 API 和守卫计算函数**

```js
export function resolveGuardNavigation({ isAuthenticated, to, canAccess, defaultHomePath }) {
  if (to.meta?.requiresAuth && !isAuthenticated) {
    return { path: '/login', query: { redirect: to.fullPath || to.path } }
  }
  if (isAuthenticated && to.path === '/login') {
    return { path: defaultHomePath }
  }
  if (to.meta?.requiresAuth && !canAccess) {
    return { path: '/403' }
  }
  return true
}
```

- [ ] **Step 6: 重跑认证与守卫单测**

Run: `npm run test -- tests/unit/auth-store.spec.js tests/unit/router-guard.spec.js`
Expected: PASS

### Task 4: 实现页面、壳层与路由集成

**Files:**
- Create: `tests/unit/menu-routes.spec.js`
- Create: `src/router/routes.js`
- Create: `src/router/index.js`
- Create: `src/layout/MainLayout.vue`
- Create: `src/views/login/LoginView.vue`
- Create: `src/views/placeholder/ModulePlaceholderView.vue`
- Create: `src/views/error/ForbiddenView.vue`

- [ ] **Step 1: 先写菜单路由失败测试**

```js
import { describe, expect, it } from 'vitest'
import { getMenuGroups, protectedChildRoutes } from '../../src/router/routes'

describe('menu routes', () => {
  it('filters admin menu without employee-only face route', () => {
    const groups = getMenuGroups(protectedChildRoutes, 'ADMIN')
    const paths = groups.flatMap((group) => group.items.map((item) => item.path))
    expect(paths).toContain('/dashboard')
    expect(paths).not.toContain('/face')
  })
})
```

- [ ] **Step 2: 跑测试确认红灯**

Run: `npm run test -- tests/unit/menu-routes.spec.js`
Expected: FAIL，提示路由表或菜单工具未实现

- [ ] **Step 3: 实现静态路由、壳层和页面**

```js
// 路由子项至少包含 dashboard、statistics、user、department、system/role、face、attendance、exception、warning、review、system
// 每项声明 requiresAuth/title/menuGroup/moduleCode/roles
```

- [ ] **Step 4: 跑完整测试**

Run: `npm run test`
Expected: PASS

- [ ] **Step 5: 跑构建验证**

Run: `npm run build`
Expected: PASS

- [ ] **Step 6: 人工检查关键行为**

检查项：
- 未登录访问后台页跳 `/login`
- `ADMIN` 可见管理菜单但不可见 `/face`
- `EMPLOYEE` 可见 `/face` 与 `/attendance`
- 访问无权限页面跳 `/403`
- 登录态刷新后可恢复
