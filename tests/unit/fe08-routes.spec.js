import { describe, expect, it } from 'vitest'

import SystemView from '../../src/views/system/SystemView.vue'
import { protectedChildRoutes } from '../../src/router/routes'

describe('fe-08 routes', () => {
  it('keeps system as a single protected route for admin only', () => {
    const systemRoute = protectedChildRoutes.find((item) => item.name === 'system')
    const fe08Paths = protectedChildRoutes
      .filter((item) => item.meta?.moduleCode === 'FE-08')
      .map((item) => item.path)

    expect(systemRoute?.path).toBe('system')
    expect(systemRoute?.meta?.roles).toEqual(['ADMIN'])
    expect(systemRoute?.meta?.moduleCode).toBe('FE-08')
    expect(systemRoute?.component).toBe(SystemView)
    expect(fe08Paths).toEqual(['system'])
  })
})
