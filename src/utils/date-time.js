export function formatDateTimeDisplay(value, fallback = '--') {
  if (value === null || value === undefined || value === '') {
    return fallback
  }

  const normalized = String(value).trim()
  if (!normalized) {
    return fallback
  }

  const standard = normalized.replace('T', ' ')
  const secondPrecisionMatch = standard.match(/^(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2}:\d{2})/)

  if (secondPrecisionMatch) {
    return `${secondPrecisionMatch[1]} ${secondPrecisionMatch[2]}`
  }

  const minutePrecisionMatch = standard.match(/^(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2})(?!:)/)
  if (minutePrecisionMatch) {
    return `${minutePrecisionMatch[1]} ${minutePrecisionMatch[2]}:00`
  }

  return standard.length > 19 ? standard.slice(0, 19) : standard
}
