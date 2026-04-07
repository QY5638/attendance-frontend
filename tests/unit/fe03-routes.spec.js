import { describe, expect, it } from 'vitest'

import DepartmentView from '../../src/views/department/DepartmentView.vue'
import RoleView from '../../src/views/role/RoleView.vue'
import UserView from '../../src/views/user/UserView.vue'
import { protectedChildRoutes } from '../../src/router/routes'

function findRoute(name) {
  return protectedChildRoutes.find((item) => item.name === name)
}

describe('fe-03 routes', () => {
  it('maps user route to user view', () => {
    expect(findRoute('user')?.component).toBe(UserView)
  })

  it('maps department route to department view', () => {
    expect(findRoute('department')?.component).toBe(DepartmentView)
  })

  it('maps system-role route to role view', () => {
    expect(findRoute('system-role')?.component).toBe(RoleView)
  })
})
