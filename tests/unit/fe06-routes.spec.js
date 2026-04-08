import { describe, expect, it } from 'vitest'

import { protectedChildRoutes } from '../../src/router/routes'

describe('fe-06 routes', () => {
  it('maps exception and warning routes to FE-06 views', () => {
    const exceptionRoute = protectedChildRoutes.find((item) => item.name === 'exception')
    const warningRoute = protectedChildRoutes.find((item) => item.name === 'warning')

    expect(exceptionRoute?.path).toBe('exception')
    expect(typeof exceptionRoute?.component).toBe('function')
    expect(exceptionRoute?.meta.title).toBe('异常中心')

    expect(warningRoute?.path).toBe('warning')
    expect(typeof warningRoute?.component).toBe('function')
    expect(warningRoute?.meta.title).toBe('预警列表')
  })

  it('keeps FE-06 route metadata aligned with the frozen contract', () => {
    const exceptionRoute = protectedChildRoutes.find((item) => item.name === 'exception')
    const warningRoute = protectedChildRoutes.find((item) => item.name === 'warning')

    expect(exceptionRoute?.meta.roles).toEqual(['ADMIN'])
    expect(exceptionRoute?.meta.menuGroup).toBe('风险与系统')
    expect(exceptionRoute?.meta.moduleCode).toBe('FE-06')

    expect(warningRoute?.meta.roles).toEqual(['ADMIN'])
    expect(warningRoute?.meta.menuGroup).toBe('风险与系统')
    expect(warningRoute?.meta.moduleCode).toBe('FE-06')
  })
})
