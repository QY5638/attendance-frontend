import { describe, expect, it } from 'vitest'

import { protectedChildRoutes } from '../../src/router/routes'

describe('fe-08 routes', () => {
  it('keeps FE-08 system routes protected for admin only', () => {
    const systemRoute = protectedChildRoutes.find((item) => item.name === 'system')
    const fe08Routes = protectedChildRoutes
      .filter((item) => item.meta?.moduleCode === 'FE-08')
    const fe08Paths = fe08Routes.map((item) => item.path)

    expect(systemRoute?.path).toBe('system')
    expect(systemRoute?.meta?.roles).toEqual(['ADMIN'])
    expect(systemRoute?.meta?.hidden).toBe(true)
    expect(fe08Paths).toEqual(['system/basic', 'system/prompt', 'system/approval', 'system/logs'])
    fe08Routes.forEach((route) => {
      expect(route?.meta?.roles).toEqual(['ADMIN'])
      expect(typeof route?.component).toBe('function')
    })
  })
})
