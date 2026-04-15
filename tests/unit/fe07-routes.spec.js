import { describe, expect, it } from 'vitest'

import { protectedChildRoutes } from '../../src/router/routes'

describe('fe-07 routes', () => {
  it('maps review route to ReviewView', () => {
    const reviewRoute = protectedChildRoutes.find((item) => item.name === 'review')

    expect(reviewRoute?.path).toBe('review')
    expect(typeof reviewRoute?.component).toBe('function')
    expect(reviewRoute?.meta?.title).toBe('人工复核')
  })

  it('keeps FE-07 route metadata aligned with the frozen contract', () => {
    const reviewRoute = protectedChildRoutes.find((item) => item.name === 'review')

    expect(reviewRoute?.meta.roles).toEqual(['ADMIN'])
    expect(reviewRoute?.meta.menuGroup).toBe('风险处置')
    expect(reviewRoute?.meta.moduleCode).toBe('FE-07')
  })
})
