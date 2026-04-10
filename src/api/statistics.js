import request from '../utils/request'

function createApiError(message) {
  return {
    type: 'api',
    field: '',
    message: message || '请求失败，请稍后重试',
  }
}

function unwrapBusinessResponse(result, fallbackMessage) {
  if (!result || typeof result !== 'object' || result.code !== 200) {
    throw createApiError(result?.message || fallbackMessage)
  }

  return result.data
}

function buildGetConfig(params = {}, extra = {}) {
  const hasParams = params && Object.keys(params).length > 0
  const config = hasParams ? { ...extra, params } : { ...extra }

  return Object.keys(config).length ? config : undefined
}

function readHeader(headers, name) {
  if (!headers || !name) {
    return ''
  }

  if (typeof headers.get === 'function') {
    return headers.get(name) || ''
  }

  const normalizedName = name.toLowerCase()
  const matchedKey = Object.keys(headers).find((key) => key.toLowerCase() === normalizedName)
  return matchedKey ? headers[matchedKey] || '' : ''
}

function parseExportFilename(disposition) {
  if (!disposition) {
    return ''
  }

  const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i)
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1])
    } catch {
      return utf8Match[1]
    }
  }

  const filenameMatch = disposition.match(/filename="?([^";]+)"?/i)
  return filenameMatch?.[1] || ''
}

function alignBlobContentType(blob, contentType) {
  if (!(blob instanceof Blob) || !contentType) {
    return blob
  }

  if ((blob.type || '').toLowerCase() === contentType.toLowerCase()) {
    return blob
  }

  return new Blob([blob], { type: contentType })
}

async function readBlobText(blob) {
  if (!(blob instanceof Blob)) {
    return ''
  }

  if (typeof blob.text === 'function') {
    return blob.text()
  }

  if (typeof blob.arrayBuffer === 'function') {
    const buffer = await blob.arrayBuffer()
    return new TextDecoder().decode(buffer)
  }

  if (typeof FileReader === 'function') {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '')
      reader.onerror = () => reject(reader.error)
      reader.readAsText(blob)
    })
  }

  return ''
}

async function readExportErrorMessage(blob, fallbackMessage) {
  if (!(blob instanceof Blob)) {
    return fallbackMessage
  }

  try {
    const text = await readBlobText(blob)
    const payload = JSON.parse(text)
    return payload?.message || fallbackMessage
  } catch {
    return fallbackMessage
  }
}

export async function fetchPersonalStatistics(params = {}) {
  const result = await request.get('/statistics/personal', buildGetConfig(params))
  return unwrapBusinessResponse(result, '获取个人统计失败')
}

export async function fetchDepartmentStatistics(params = {}) {
  const result = await request.get('/statistics/department', buildGetConfig(params))
  return unwrapBusinessResponse(result, '获取部门统计失败')
}

export async function fetchExceptionTrend(params = {}) {
  const result = await request.get('/statistics/exception-trend', buildGetConfig(params))
  return unwrapBusinessResponse(result, '获取异常趋势失败')
}

export async function fetchStatisticsSummary(params = {}) {
  const result = await request.get('/statistics/summary', buildGetConfig(params))
  return unwrapBusinessResponse(result, '获取统计摘要失败')
}

export async function fetchDepartmentRiskBrief(params = {}) {
  const result = await request.get('/statistics/department-risk-brief', buildGetConfig(params))
  return unwrapBusinessResponse(result, '获取部门风险画像失败')
}

export async function fetchDepartmentRiskOverview(params = {}) {
  const result = await request.get('/statistics/department-risk-overview', buildGetConfig(params))
  return unwrapBusinessResponse(result, '获取部门风险概况失败')
}

export async function exportStatisticsReport(params = {}) {
  const result = await request.get(
    '/statistics/export',
    buildGetConfig(params, {
      responseType: 'blob',
      transformResponse: [
        (data, headers) => ({
          blob: data,
          headers,
        }),
      ],
    }),
  )

  const blob = result?.blob instanceof Blob ? result.blob : result
  const contentDisposition = readHeader(result?.headers, 'content-disposition')
  const contentType = readHeader(result?.headers, 'content-type') || blob?.type || ''
  const normalizedContentType = contentType.toLowerCase()

  if (normalizedContentType.includes('application/json')) {
    throw createApiError(await readExportErrorMessage(blob, '导出统计报表失败'))
  }

  return {
    blob: alignBlobContentType(blob, contentType),
    filename: parseExportFilename(contentDisposition) || 'statistics-export.csv',
    contentType,
  }
}
