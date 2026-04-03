import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  appRoutes,
  createRouter,
  createWebHistory,
  currentRouteRef,
  mockAuthStore,
  mockRouter,
  setUnauthorizedHandler,
  unauthorizedHandlerRef,
  useAuthStore,
} = vi.hoisted(() => {
  const currentRouteRef = {
    value: {
      path: '/login',
      fullPath: '/login',
      meta: {},
    },
  }

  const mockRouter = {
    beforeEach: vi.fn(),
    currentRoute: currentRouteRef,
    replace: vi.fn(),
  }

  const mockAuthStore = {
    clearSession: vi.fn(),
    defaultHomePath: '/dashboard',
    hasRole: vi.fn(() => true),
    isAuthenticated: false,
    restore: vi.fn(),
  }

  return {
    appRoutes: [],
    createRouter: vi.fn(() => mockRouter),
    createWebHistory: vi.fn(() => ({ type: 'history' })),
    currentRouteRef,
    mockAuthStore,
    mockRouter,
    setUnauthorizedHandler: vi.fn((handler) => {
      unauthorizedHandlerRef.current = handler
    }),
    unauthorizedHandlerRef: {
      current: null,
    },
    useAuthStore: vi.fn(() => mockAuthStore),
  }
})

vi.mock('vue-router', () => ({
  createRouter,
  createWebHistory,
}))

vi.mock('../../src/store/auth', () => ({
  useAuthStore,
}))

vi.mock('../../src/utils/request', () => ({
  setUnauthorizedHandler,
}))

vi.mock('../../src/router/routes', () => ({
  appRoutes,
}))

import { createAppRouter } from '../../src/router/index'
import {
  normalizeRedirectPath,
  resolveGuardNavigation,
  resolvePostLoginPath,
} from '../../src/router/guard'

describe('router guard', () => {
  beforeEach(() => {
    createRouter.mockClear()
    createWebHistory.mockClear()
    useAuthStore.mockClear()
    setUnauthorizedHandler.mockClear()
    mockRouter.beforeEach.mockReset()
    mockRouter.replace.mockReset()
    mockAuthStore.clearSession.mockReset()
    mockAuthStore.hasRole.mockReset()
    mockAuthStore.hasRole.mockReturnValue(true)
    mockAuthStore.restore.mockReset()
    mockAuthStore.defaultHomePath = '/dashboard'
    mockAuthStore.isAuthenticated = false
    currentRouteRef.value = {
      path: '/login',
      fullPath: '/login',
      meta: {},
    }
    unauthorizedHandlerRef.current = null
  })

  it('drops unsafe redirect targets', () => {
    expect(normalizeRedirectPath('http://evil.example')).toBe('')
    expect(normalizeRedirectPath('//evil.example')).toBe('')
    expect(normalizeRedirectPath('/login')).toBe('')
    expect(normalizeRedirectPath('/login?redirect=/dashboard')).toBe('')
    expect(normalizeRedirectPath('/login#form')).toBe('')
  })

  it('keeps safe in-app redirect targets', () => {
    expect(normalizeRedirectPath('/attendance?tab=history')).toBe('/attendance?tab=history')
  })

  it('falls back to default home when login redirect is unsafe', () => {
    expect(resolvePostLoginPath('http://evil.example', '/dashboard')).toBe('/dashboard')
  })

  it('redirects unauthenticated protected route to login', () => {
    expect(
      resolveGuardNavigation({
        isAuthenticated: false,
        canAccess: false,
        defaultHomePath: '/dashboard',
        to: {
          path: '/dashboard',
          fullPath: '/dashboard',
          meta: { requiresAuth: true },
        },
      }),
    ).toEqual({
      path: '/login',
      query: { redirect: '/dashboard' },
    })
  })

  it('adds redirect for unauthenticated protected route', () => {
    expect(
      resolveGuardNavigation({
        isAuthenticated: false,
        canAccess: false,
        defaultHomePath: '/dashboard',
        to: {
          path: '/warning',
          fullPath: '/warning?level=high',
          meta: { requiresAuth: true },
        },
      }),
    ).toEqual({
      path: '/login',
      query: { redirect: '/warning?level=high' },
    })
  })

  it('redirects authenticated users away from login page', () => {
    expect(
      resolveGuardNavigation({
        isAuthenticated: true,
        canAccess: true,
        defaultHomePath: '/attendance',
        to: {
          path: '/login',
          fullPath: '/login',
          meta: {},
        },
      }),
    ).toEqual({ path: '/attendance' })
  })

  it('redirects root path to the role default home', () => {
    expect(
      resolveGuardNavigation({
        isAuthenticated: true,
        canAccess: true,
        defaultHomePath: '/attendance',
        to: {
          path: '/',
          fullPath: '/',
          meta: { requiresAuth: true },
        },
      }),
    ).toEqual({ path: '/attendance' })
  })

  it('redirects forbidden route to 403', () => {
    expect(
      resolveGuardNavigation({
        isAuthenticated: true,
        canAccess: false,
        defaultHomePath: '/dashboard',
        to: {
          path: '/user',
          fullPath: '/user',
          meta: { requiresAuth: true },
        },
      }),
    ).toEqual({ path: '/403' })
  })

  it('allows authenticated and authorized navigation', () => {
    expect(
      resolveGuardNavigation({
        isAuthenticated: true,
        canAccess: true,
        defaultHomePath: '/dashboard',
        to: {
          path: '/dashboard',
          fullPath: '/dashboard',
          meta: { requiresAuth: true },
        },
      }),
    ).toBe(true)
  })

  it('adds safe redirect to login on 401 for protected route', () => {
    createAppRouter()
    currentRouteRef.value = {
      path: '/warning',
      fullPath: '/warning?level=high',
      meta: { requiresAuth: true },
    }

    unauthorizedHandlerRef.current?.()

    expect(mockAuthStore.clearSession).toHaveBeenCalledTimes(1)
    expect(mockRouter.replace).toHaveBeenCalledWith({
      path: '/login',
      query: { redirect: '/warning?level=high' },
    })
  })

  it('drops redirect on 401 for public route', () => {
    createAppRouter()
    currentRouteRef.value = {
      path: '/about',
      fullPath: '/about?from=home',
      meta: {},
    }

    unauthorizedHandlerRef.current?.()

    expect(mockRouter.replace).toHaveBeenCalledWith({
      path: '/login',
    })
  })

  it('does not redirect on 401 when already on login page', () => {
    createAppRouter()
    currentRouteRef.value = {
      path: '/login',
      fullPath: '/login?redirect=/dashboard',
      meta: {},
    }

    unauthorizedHandlerRef.current?.()

    expect(mockAuthStore.clearSession).toHaveBeenCalledTimes(1)
    expect(mockRouter.replace).not.toHaveBeenCalled()
  })
})
