import { describe, expect, it } from 'vitest'

import { protectedChildRoutes } from '../../src/router/routes'

describe('face route', () => {
  it('maps /face to FE-04 face capture view', () => {
    const faceRoute = protectedChildRoutes.find((route) => route.name === 'face')

    expect(faceRoute).toBeTruthy()
    expect(faceRoute?.path).toBe('face')
    expect(typeof faceRoute?.component).toBe('function')
    expect(faceRoute?.meta?.moduleCode).toBe('FE-04')
  })
})
