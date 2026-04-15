import { EXCEPTION_TYPE_LABELS, RISK_LEVEL_LABELS } from './exception-display'

const EXCEPTION_TYPE_TEXT_REPLACEMENTS = Object.entries(EXCEPTION_TYPE_LABELS)
const RISK_LEVEL_TEXT_REPLACEMENTS = Object.entries(RISK_LEVEL_LABELS)

const TEXT_REPLACEMENTS = [
  ['recordId=', '记录编号：'],
  ['recordId', '记录编号'],
  ['userId=', '员工编号：'],
  ['checkType=IN', '打卡类型：上班打卡'],
  ['checkType=OUT', '打卡类型：下班打卡'],
  ['checkType=', '打卡类型：'],
  ['checkTime=', '打卡时间：'],
  ['deviceId=', '打卡地点编号：'],
  ['deviceId', '打卡地点编号'],
  ['location=', '打卡地点：'],
  ['longitude和latitude', '位置信息'],
  ['longitude and latitude', '位置信息'],
  ['longitude与latitude', '位置信息'],
  ['longitude=', '位置信息：'],
  ['latitude=', ''],
  ['longitude', '位置信息'],
  ['latitude', ''],
  ['faceScore=', '服务端人脸分数：'],
  ['clientFaceScore=', '客户端人脸分数：'],
  ['clientFaceScore', '客户端人脸分数'],
  ['faceScore', '人脸分数'],
  ['clientDeviceChanged=', '客户端电脑设备是否变化：'],
  ['clientLocationChanged=', '客户端打卡地点是否变化：'],
  ['clientHistoryAbnormalCount=', '客户端历史异常次数：'],
  ['actualHistoryAbnormalCount=', '数据库历史异常次数：'],
  ['clientDeviceChanged', '客户端电脑设备是否变化'],
  ['clientLocationChanged', '客户端打卡地点是否变化'],
  ['clientHistoryAbnormalCount', '客户端历史异常次数'],
  ['actualHistoryAbnormalCount', '数据库历史异常次数'],
  ['promptVersion=', '分析版本：'],
  ['promptFingerprint=', '系统校验标识：'],
  ['llmProvider=', '模型来源：'],
  ['=true', '：是'],
  ['=false', '：否'],
  ['=null', '：未提供'],
  ['null', '未提供'],
  ...EXCEPTION_TYPE_TEXT_REPLACEMENTS,
  ...RISK_LEVEL_TEXT_REPLACEMENTS,
]

const REGEX_TEXT_REPLACEMENTS = [
  [/人脸分数\s*[≥>]=?\s*(\d+(?:\.\d+)?)/g, '人脸分数达到$1分以上'],
  [/数据库历史异常次数[:：=]\s*(\d+)\s*提示/g, '数据库历史异常次数为$1，提示'],
  [/客户端历史异常次数[:：=]\s*(\d+)\s*提示/g, '客户端历史异常次数为$1，提示'],
  [/经纬度为未提供/g, '位置信息缺失'],
  [/经度和纬度为未提供/g, '位置信息缺失'],
  [/位置信息为未提供/g, '位置信息缺失'],
  [/经度[:：]\s*[^；,]+[；,]\s*纬度[:：]\s*[^；,。]+/g, '地图位置已记录'],
  [/位置信息[:：]\s*[^；,。]+[；,]\s*[:：]?\s*[^；,。]+/g, '地图位置已记录'],
  [/客户端人脸分数为空/g, '客户端人脸分数缺失'],
  [/其余字段无明显高危信号/g, '其余信息未发现明显高风险信号'],
  [/提示版本与指纹正常/g, '系统版本与校验信息正常'],
  [/高风险风险/g, '高风险'],
  [/中风险风险/g, '中风险'],
  [/低风险风险/g, '低风险'],
  [/至少一次异常行为（如代打卡、环境异常等）/g, '至少出现过一次异常打卡行为'],
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
  if (value.similarCaseSummary) {
    lines.push(`关联案例：${formatReadableText(value.similarCaseSummary, '')}`)
  }

  return lines.length ? lines.join('；') : null
}

function looksLikeQuestionPlaceholder(value) {
  if (!value) {
    return false
  }

  let placeholderCount = 0
  let meaningfulCount = 0
  for (const char of value) {
    if (/\s/.test(char) || ',，.。;；:：!！()（）'.includes(char)) {
      continue
    }
    meaningfulCount += 1
    if (char === '?' || char === '？' || char === '�') {
      placeholderCount += 1
    }
  }
  return meaningfulCount >= 3 && placeholderCount === meaningfulCount
}

export function formatReadableText(value, fallback = '--') {
  if (value === null || value === undefined || value === '') {
    return fallback
  }

  const normalizedText = String(value).trim()
  if (!normalizedText) {
    return fallback
  }

  if (looksLikeQuestionPlaceholder(normalizedText)) {
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

  for (const [pattern, replacement] of REGEX_TEXT_REPLACEMENTS) {
    result = result.replace(pattern, replacement)
  }

  if (result.includes('：') && result.includes(', ')) {
    result = result.split(', ').join('；')
  }

  return result
}
