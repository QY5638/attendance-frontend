import { describe, expect, it } from 'vitest'

import {
  buildMenuGroups,
  canAccessRoles,
  getDefaultHomePath,
  isSupportedRole,
} from '../../src/router/access'

describe('router access helpers', () => {
  it('supports ADMIN and EMPLOYEE only', () => {
    expect(isSupportedRole('ADMIN')).toBe(true)
    expect(isSupportedRole('EMPLOYEE')).toBe(true)
    expect(isSupportedRole('UNKNOWN')).toBe(false)
  })

  it('maps default home by role', () => {
    expect(getDefaultHomePath('ADMIN')).toBe('/dashboard')
    expect(getDefaultHomePath('EMPLOYEE')).toBe('/attendance')
    expect(getDefaultHomePath('UNKNOWN')).toBe('/login')
  })

  it('checks route role access', () => {
    expect(canAccessRoles('ADMIN', ['ADMIN'])).toBe(true)
    expect(canAccessRoles('EMPLOYEE', ['ADMIN'])).toBe(false)
    expect(canAccessRoles('EMPLOYEE', [])).toBe(true)
  })

  it('builds grouped menus for the current role', () => {
    const groups = buildMenuGroups(
      [
        {
          path: 'dashboard',
          meta: { title: '工作台', menuGroup: '工作台', roles: ['ADMIN', 'EMPLOYEE'] },
        },
        {
          path: 'statistics',
          meta: { title: '统计分析', menuGroup: '工作台', roles: ['ADMIN'] },
        },
        {
          path: 'face',
          meta: { title: '人脸采集', menuGroup: '考勤业务', roles: ['EMPLOYEE'] },
        },
      ],
      'EMPLOYEE',
    )

    expect(groups).toEqual([
      {
        name: '工作台',
        items: [
          {
            path: '/dashboard',
            title: '工作台',
            moduleCode: undefined,
          },
        ],
      },
      {
        name: '考勤业务',
        items: [
          {
            path: '/face',
            title: '人脸采集',
            moduleCode: undefined,
          },
        ],
      },
    ])
  })
})
