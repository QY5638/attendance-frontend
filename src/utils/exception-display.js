export const RISK_LEVEL_LABELS = Object.freeze({
  HIGH: '高风险',
  MEDIUM: '中风险',
  LOW: '低风险',
})

export const EXCEPTION_TYPE_LABELS = Object.freeze({
  PROXY_CHECKIN: '可疑代打卡',
  CONTINUOUS_LATE: '多次迟到',
  CONTINUOUS_EARLY_LEAVE: '多次早退',
  CONTINUOUS_MULTI_LOCATION_CONFLICT: '多次异地打卡',
  CONTINUOUS_ILLEGAL_TIME: '多次异常时段打卡',
  CONTINUOUS_REPEAT_CHECK: '多次重复打卡',
  CONTINUOUS_PROXY_CHECKIN: '多次可疑代打卡',
  CONTINUOUS_ATTENDANCE_RISK: '多次异常打卡',
  COMPLEX_ATTENDANCE_RISK: '可疑打卡',
  CONTINUOUS_MODEL_RISK: '多次可疑打卡',
  LATE: '迟到',
  EARLY_LEAVE: '早退',
  ILLEGAL_TIME: '异常时段打卡',
  REPEAT_CHECK: '重复打卡',
  MULTI_LOCATION_CONFLICT: '异地打卡',
  ABSENT: '缺勤',
  MISSING_CHECKOUT: '未打下班卡',
  NORMAL: '正常',
})

export const EXCEPTION_TYPE_OPTIONS = Object.freeze([
  'PROXY_CHECKIN',
  'CONTINUOUS_LATE',
  'CONTINUOUS_EARLY_LEAVE',
  'CONTINUOUS_MULTI_LOCATION_CONFLICT',
  'CONTINUOUS_ILLEGAL_TIME',
  'CONTINUOUS_REPEAT_CHECK',
  'CONTINUOUS_PROXY_CHECKIN',
  'CONTINUOUS_ATTENDANCE_RISK',
  'COMPLEX_ATTENDANCE_RISK',
  'CONTINUOUS_MODEL_RISK',
  'LATE',
  'EARLY_LEAVE',
  'ILLEGAL_TIME',
  'REPEAT_CHECK',
  'MULTI_LOCATION_CONFLICT',
  'ABSENT',
  'MISSING_CHECKOUT',
].map((value) => ({
  value,
  label: EXCEPTION_TYPE_LABELS[value],
})))

export const CONTINUOUS_EXCEPTION_TYPES = Object.freeze([
  'CONTINUOUS_LATE',
  'CONTINUOUS_EARLY_LEAVE',
  'CONTINUOUS_MULTI_LOCATION_CONFLICT',
  'CONTINUOUS_ILLEGAL_TIME',
  'CONTINUOUS_REPEAT_CHECK',
  'CONTINUOUS_PROXY_CHECKIN',
  'CONTINUOUS_ATTENDANCE_RISK',
  'CONTINUOUS_MODEL_RISK',
])

function normalizeExceptionTarget(target) {
  if (typeof target === 'string') {
    return {
      type: target,
      sourceType: '',
      riskLevel: '',
      username: '',
      realName: '',
      userId: '',
    }
  }

  return {
    type: target?.type || target?.exceptionType || '',
    sourceType: target?.sourceType || target?.exceptionSourceType || '',
    riskLevel: target?.riskLevel || '',
    username: target?.username || '',
    realName: target?.realName || '',
    userId: target?.userId || '',
  }
}

export function formatExceptionOwner(target, fallback = '--') {
  const normalizedTarget = normalizeExceptionTarget(target)

  if (normalizedTarget.realName) {
    return normalizedTarget.realName
  }

  if (normalizedTarget.username) {
    return normalizedTarget.username
  }

  if (normalizedTarget.userId) {
    return `用户 ${normalizedTarget.userId}`
  }

  return fallback
}

export function getExceptionTypeLabel(type, fallback = '') {
  if (!type) {
    return fallback
  }

  return EXCEPTION_TYPE_LABELS[type] || fallback
}

export function formatExceptionType(target, options = {}) {
  const { fallback = '待核查异常', unknownFallback = fallback } = options
  const normalizedTarget = normalizeExceptionTarget(target)
  const label = getExceptionTypeLabel(normalizedTarget.type)

  if (label) {
    return label
  }

  if (normalizedTarget.sourceType === 'MODEL' || normalizedTarget.sourceType === 'MODEL_FALLBACK') {
    return '综合识别异常'
  }

  if (normalizedTarget.sourceType === 'RULE') {
    return '规则校验异常'
  }

  return unknownFallback
}

export function buildExceptionTitle(target, options = {}) {
  const { fallback = '待核查异常' } = options
  const normalizedTarget = normalizeExceptionTarget(target)
  const riskLabel = normalizedTarget.riskLevel ? RISK_LEVEL_LABELS[normalizedTarget.riskLevel] || '' : ''
  const typeLabel = formatExceptionType(normalizedTarget, {
    fallback,
    unknownFallback: fallback,
  })
  const ownerLabel = formatExceptionOwner(normalizedTarget, '')

  if (typeLabel) {
    const coreTitle = typeLabel === '正常'
      ? `${riskLabel || ''}${typeLabel}`
      : `${riskLabel || ''}${typeLabel.endsWith('异常') ? typeLabel : `${typeLabel}异常`}`
    return ownerLabel ? `${ownerLabel} · ${coreTitle}` : coreTitle
  }

  const fallbackTitle = riskLabel ? `${riskLabel}${fallback}` : fallback
  return ownerLabel ? `${ownerLabel} · ${fallbackTitle}` : fallbackTitle
}

export function buildExceptionRelation(target, fallback = '关联异常记录') {
  const typeLabel = formatExceptionType(target, {
    fallback: '',
    unknownFallback: '',
  })

  if (!typeLabel) {
    return fallback
  }

  return typeLabel.endsWith('异常') ? typeLabel : `${typeLabel}异常`
}
