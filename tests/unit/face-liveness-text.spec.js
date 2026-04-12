import { describe, expect, it } from 'vitest'

import { describeLivenessAction } from '../../src/utils/face-liveness'

describe('face liveness action text', () => {
  it('uses participant perspective for turn actions', () => {
    expect(describeLivenessAction('TURN_LEFT')).toBe('向左转头')
    expect(describeLivenessAction('TURN_RIGHT')).toBe('向右转头')
  })
})
