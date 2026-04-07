import { describe, expect, it } from 'vitest'

import { protectedChildRoutes } from '../../src/router/routes'
import FaceCaptureView from '../../src/views/face/FaceCaptureView.vue'

describe('face route', () => {
  it('maps /face to FE-04 face capture view', () => {
    const faceRoute = protectedChildRoutes.find((route) => route.name === 'face')

    expect(faceRoute).toBeTruthy()
    expect(faceRoute.component).toBe(FaceCaptureView)
  })
})
