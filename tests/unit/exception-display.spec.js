import { describe, expect, it } from 'vitest'

import {
  buildExceptionRelation,
  buildExceptionTitle,
  formatExceptionType,
  getExceptionTypeLabel,
} from '../../src/utils/exception-display'

describe('exception display', () => {
  it('formats known exception type to readable Chinese', () => {
    expect(getExceptionTypeLabel('PROXY_CHECKIN')).toBe('可疑代打卡')
    expect(formatExceptionType({ type: 'CONTINUOUS_MODEL_RISK' })).toBe('多次可疑打卡')
  })

  it('falls back to readable source based type when code is unknown', () => {
    expect(formatExceptionType({ type: 'UNKNOWN_CODE', sourceType: 'MODEL' })).toBe('综合识别异常')
    expect(formatExceptionType({ type: 'UNKNOWN_CODE', sourceType: 'RULE' })).toBe('规则校验异常')
  })

  it('builds title without duplicated exception suffix', () => {
    expect(buildExceptionTitle({ type: 'COMPLEX_ATTENDANCE_RISK', riskLevel: 'MEDIUM' })).toBe('中风险可疑打卡异常')
    expect(buildExceptionTitle({ type: 'PROXY_CHECKIN', riskLevel: 'HIGH' })).toBe('高风险可疑代打卡异常')
  })

  it('builds relation label without duplicated exception suffix', () => {
    expect(buildExceptionRelation({ type: 'COMPLEX_ATTENDANCE_RISK' })).toBe('可疑打卡异常')
    expect(buildExceptionRelation({ type: 'PROXY_CHECKIN' })).toBe('可疑代打卡异常')
  })
})
