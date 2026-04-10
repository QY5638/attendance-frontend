const TEXT_REPLACEMENTS = [
  ['recordId=', '记录编号：'],
  ['userId=', '员工编号：'],
  ['checkType=IN', '打卡类型：上班打卡'],
  ['checkType=OUT', '打卡类型：下班打卡'],
  ['checkType=', '打卡类型：'],
  ['checkTime=', '打卡时间：'],
  ['deviceId=', '打卡地点编号：'],
  ['location=', '打卡地点：'],
  ['longitude=', '经度：'],
  ['latitude=', '纬度：'],
  ['faceScore=', '服务端人脸分数：'],
  ['clientFaceScore=', '客户端人脸分数：'],
  ['clientDeviceChanged=', '客户端电脑设备是否变化：'],
  ['clientLocationChanged=', '客户端打卡地点是否变化：'],
  ['clientHistoryAbnormalCount=', '客户端历史异常次数：'],
  ['actualHistoryAbnormalCount=', '数据库历史异常次数：'],
  ['promptVersion=', '提示词版本：'],
  ['promptFingerprint=', '提示词指纹：'],
  ['llmProvider=', '模型提供方：'],
  ['=true', '：是'],
  ['=false', '：否'],
  ['=null', '：未提供'],
  ['null', '未提供'],
  ['PROXY_CHECKIN', '代打卡'],
  ['MULTI_LOCATION_CONFLICT', '多地点异常'],
  ['EARLY_LEAVE', '早退'],
  ['ILLEGAL_TIME', '非规定时间打卡'],
  ['REPEAT_CHECK', '重复打卡'],
  ['LATE', '迟到'],
  ['HIGH', '高风险'],
  ['MEDIUM', '中风险'],
  ['LOW', '低风险'],
]

function buildReadableJsonSummary(value) {
  if (!value || typeof value !== 'object') {
    return null
  }

  const lines = []
  if (value.conclusion) {
    lines.push(`系统结论：${formatReadableText(value.conclusion, '')}`)
  }
  if (value.riskLevel) {
    lines.push(`风险等级：${formatReadableText(value.riskLevel, '')}`)
  }
  if (value.confidenceScore !== null && value.confidenceScore !== undefined && value.confidenceScore !== '') {
    lines.push(`可信度：${value.confidenceScore}`)
  }
  if (value.decisionReason) {
    lines.push(`判定依据：${formatReadableText(value.decisionReason, '')}`)
  }
  if (value.reasonSummary) {
    lines.push(`说明摘要：${formatReadableText(value.reasonSummary, '')}`)
  }
  if (value.actionSuggestion) {
    lines.push(`处理建议：${formatReadableText(value.actionSuggestion, '')}`)
  }

  return lines.length ? lines.join('；') : null
}

export function formatReadableText(value, fallback = '--') {
  if (value === null || value === undefined || value === '') {
    return fallback
  }

  const normalizedText = String(value).trim()
  if (!normalizedText) {
    return fallback
  }

  if ((normalizedText.startsWith('{') && normalizedText.endsWith('}')) || (normalizedText.startsWith('[') && normalizedText.endsWith(']'))) {
    try {
      const parsed = JSON.parse(normalizedText)
      const readableJsonSummary = buildReadableJsonSummary(parsed)
      if (readableJsonSummary) {
        return readableJsonSummary
      }
    } catch (error) {
      // ignore json parse error and continue with string replacement
    }
  }

  let result = normalizedText
  for (const [source, target] of TEXT_REPLACEMENTS) {
    result = result.split(source).join(target)
  }

  if (result.includes('：') && result.includes(', ')) {
    result = result.split(', ').join('；')
  }

  return result
}
