import { describe, expect, it } from 'vitest'

import { protectedChildRoutes } from '../../src/router/routes'

function findRoute(name) {
  return protectedChildRoutes.find((item) => item.name === name)
}

describe('fe-03 routes', () => {
  it('maps user route to user view', () => {
    expect(findRoute('user')?.path).toBe('user')
    expect(typeof findRoute('user')?.component).toBe('function')
    expect(findRoute('user')?.meta.title).toBe('用户管理')
  })

  it('maps department route to department view', () => {
    expect(findRoute('department')?.path).toBe('department')
    expect(typeof findRoute('department')?.component).toBe('function')
    expect(findRoute('department')?.meta.title).toBe('部门管理')
  })

  it('maps system-role route to role view', () => {
    expect(findRoute('system-role')?.path).toBe('system/role')
    expect(typeof findRoute('system-role')?.component).toBe('function')
    expect(findRoute('system-role')?.meta.title).toBe('角色管理')
  })
})
