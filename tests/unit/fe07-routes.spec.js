import { describe, expect, it } from 'vitest'

import { protectedChildRoutes } from '../../src/router/routes'
import ReviewView from '../../src/views/review/ReviewView.vue'

describe('fe-07 routes', () => {
  it('maps review route to ReviewView', () => {
    const reviewRoute = protectedChildRoutes.find((item) => item.name === 'review')

    expect(reviewRoute?.component).toBe(ReviewView)
  })

  it('keeps FE-07 route metadata aligned with the frozen contract', () => {
    const reviewRoute = protectedChildRoutes.find((item) => item.name === 'review')

    expect(reviewRoute?.meta.roles).toEqual(['ADMIN'])
    expect(reviewRoute?.meta.menuGroup).toBe('风险与系统')
    expect(reviewRoute?.meta.moduleCode).toBe('FE-07')
  })
})
