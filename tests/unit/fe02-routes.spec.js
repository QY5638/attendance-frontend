import { describe, expect, it } from 'vitest'

import { protectedChildRoutes } from '../../src/router/routes'

describe('fe-02 routes', () => {
  it('maps dashboard and statistics to FE-02 views', () => {
    const dashboardRoute = protectedChildRoutes.find((item) => item.name === 'dashboard')
    const statisticsRoute = protectedChildRoutes.find((item) => item.name === 'statistics')

    expect(dashboardRoute?.path).toBe('dashboard')
    expect(typeof dashboardRoute?.component).toBe('function')
    expect(dashboardRoute?.meta.title).toBe('概览工作台')

    expect(statisticsRoute?.path).toBe('statistics')
    expect(typeof statisticsRoute?.component).toBe('function')
    expect(statisticsRoute?.meta.title).toBe('统计分析')
  })
})
