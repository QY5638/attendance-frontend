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
    expect(getDefaultHomePath('EMPLOYEE')).toBe('/attendance/checkin')
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
        {
          path: 'attendance/checkin',
          meta: { title: '考勤打卡', menuGroup: '考勤业务', roles: ['EMPLOYEE'] },
        },
        {
          path: 'attendance/repair',
          meta: { title: '补卡申请', menuGroup: '考勤业务', roles: ['EMPLOYEE'] },
        },
        {
          path: 'profile',
          meta: { title: '个人中心', menuGroup: '个人服务', roles: ['EMPLOYEE'] },
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
          {
            path: '/attendance/checkin',
            title: '考勤打卡',
            moduleCode: undefined,
          },
          {
            path: '/attendance/repair',
            title: '补卡申请',
            moduleCode: undefined,
          },
        ],
      },
      {
        name: '个人服务',
        items: [
          {
            path: '/profile',
            title: '个人中心',
            moduleCode: undefined,
          },
        ],
      },
    ])
  })
})
