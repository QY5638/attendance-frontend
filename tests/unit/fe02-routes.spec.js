import { describe, expect, it } from 'vitest'

import DashboardView from '../../src/views/dashboard/DashboardView.vue'
import StatisticsView from '../../src/views/statistics/StatisticsView.vue'
import { protectedChildRoutes } from '../../src/router/routes'

describe('fe-02 routes', () => {
  it('maps dashboard and statistics to FE-02 views', () => {
    const dashboardRoute = protectedChildRoutes.find((item) => item.name === 'dashboard')
    const statisticsRoute = protectedChildRoutes.find((item) => item.name === 'statistics')

    expect(dashboardRoute.component).toBe(DashboardView)
    expect(statisticsRoute.component).toBe(StatisticsView)
  })
})
