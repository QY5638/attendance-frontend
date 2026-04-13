import { describe, expect, it } from 'vitest'

import { getMenuGroups, protectedChildRoutes } from '../../src/router/routes'

describe('menu routes', () => {
  it('filters admin menu without employee-only face route', () => {
    const groups = getMenuGroups(protectedChildRoutes, 'ADMIN')
    const paths = groups.flatMap((group) => group.items.map((item) => item.path))
    const names = groups.map((group) => group.name)

    expect(paths).toContain('/dashboard')
    expect(paths).toContain('/system/basic')
    expect(paths).toContain('/system/prompt')
    expect(paths).toContain('/system/approval')
    expect(paths).toContain('/system/logs')
    expect(paths).not.toContain('/face')
    expect(names).toEqual(['工作台', '组织管理', '考勤管理', '风险处置', '系统配置'])
    expect(groups.find((group) => group.name === '考勤管理')?.items.map((item) => item.title)).toContain('操作记录')
  })

  it('keeps employee menu scoped to personal features', () => {
    const groups = getMenuGroups(protectedChildRoutes, 'EMPLOYEE')
    const paths = groups.flatMap((group) => group.items.map((item) => item.path))

    expect(paths).toContain('/dashboard')
    expect(paths).toContain('/attendance/checkin')
    expect(paths).toContain('/attendance/records')
    expect(paths).toContain('/attendance/repair')
    expect(paths).toContain('/face')
    expect(paths).toContain('/profile')
    expect(paths).not.toContain('/statistics')
    expect(paths).not.toContain('/user')
  })

  it('uses AttendanceView for attendance route', () => {
    const attendanceRoute = protectedChildRoutes.find((route) => route.path === 'attendance')

    expect(attendanceRoute?.name).toBe('attendance')
    expect(typeof attendanceRoute?.component).toBe('function')
  })

  it('keeps attendance route metadata aligned with FE-05 contract', () => {
    const attendanceRoute = protectedChildRoutes.find((route) => route.path === 'attendance')
    const attendanceCheckinRoute = protectedChildRoutes.find((route) => route.path === 'attendance/checkin')
    const attendanceRecordsRoute = protectedChildRoutes.find((route) => route.path === 'attendance/records')
    const attendanceRepairRoute = protectedChildRoutes.find((route) => route.path === 'attendance/repair')

    expect(attendanceRoute?.meta.roles).toEqual(['ADMIN'])
    expect(attendanceRoute?.meta.menuGroup).toBe('考勤管理')
    expect(attendanceRoute?.meta.moduleCode).toBe('FE-05')
    expect(attendanceCheckinRoute?.meta.roles).toEqual(['EMPLOYEE'])
    expect(attendanceRecordsRoute?.meta.roles).toEqual(['EMPLOYEE'])
    expect(attendanceRepairRoute?.meta.roles).toEqual(['EMPLOYEE'])
  })
})
