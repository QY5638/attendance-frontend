import { describe, expect, it } from 'vitest'

import { resolveGuardNavigation } from '../../src/router/guard'

describe('router guard', () => {
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
})
