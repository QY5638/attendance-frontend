import { describe, expect, it } from 'vitest'

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
})
