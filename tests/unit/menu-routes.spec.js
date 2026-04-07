import { describe, expect, it } from 'vitest'

import AttendanceView from '../../src/views/attendance/AttendanceView.vue'
import { getMenuGroups, protectedChildRoutes } from '../../src/router/routes'

describe('menu routes', () => {
  it('filters admin menu without employee-only face route', () => {
    const groups = getMenuGroups(protectedChildRoutes, 'ADMIN')
    const paths = groups.flatMap((group) => group.items.map((item) => item.path))

    expect(paths).toContain('/dashboard')
    expect(paths).toContain('/system')
    expect(paths).not.toContain('/face')
  })

  it('keeps employee menu scoped to personal features', () => {
    const groups = getMenuGroups(protectedChildRoutes, 'EMPLOYEE')
    const paths = groups.flatMap((group) => group.items.map((item) => item.path))

    expect(paths).toContain('/dashboard')
    expect(paths).toContain('/attendance')
    expect(paths).toContain('/face')
    expect(paths).not.toContain('/statistics')
    expect(paths).not.toContain('/user')
  })

  it('uses AttendanceView for attendance route', () => {
    const attendanceRoute = protectedChildRoutes.find((route) => route.path === 'attendance')

    expect(attendanceRoute?.component).toBe(AttendanceView)
  })

  it('keeps attendance route metadata aligned with FE-05 contract', () => {
    const attendanceRoute = protectedChildRoutes.find((route) => route.path === 'attendance')

    expect(attendanceRoute?.meta.roles).toEqual(['ADMIN', 'EMPLOYEE'])
    expect(attendanceRoute?.meta.menuGroup).toBe('考勤业务')
    expect(attendanceRoute?.meta.moduleCode).toBe('FE-05')
  })
})
