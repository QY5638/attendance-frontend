import request from '../utils/request'

const LEGACY_FEEDBACK_TAG = 'CONFIRMED_EFFECTIVE'
const TRUE_POSITIVE = 'TRUE_POSITIVE'

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

function normalizeFeedbackTag(feedbackTag) {
  if (feedbackTag === LEGACY_FEEDBACK_TAG) {
    return TRUE_POSITIVE
  }

  return feedbackTag
}

function normalizeReviewRecord(record) {
  if (!record || typeof record !== 'object') {
    return record
  }

  return {
    ...record,
    feedbackTag: normalizeFeedbackTag(record.feedbackTag),
  }
}

export async function fetchLatestReview(exceptionId) {
  const result = await request.get(`/review/${exceptionId}`)
  return normalizeReviewRecord(unwrapBusinessResponse(result, '获取最新复核记录失败'))
}

export async function fetchReviewAssistant(exceptionId) {
  const result = await request.get(`/review/${exceptionId}/assistant`)
  return unwrapBusinessResponse(result, '获取复核辅助信息失败')
}

export async function submitReview(payload = {}) {
  const result = await request.post('/review/submit', {
    exceptionId: payload.exceptionId,
    reviewResult: payload.reviewResult,
    reviewComment: payload.reviewComment,
  })

  return normalizeReviewRecord(unwrapBusinessResponse(result, '提交复核失败'))
}

export async function submitReviewFeedback(payload = {}) {
  const result = await request.post('/review/feedback', {
    reviewId: payload.reviewId,
    feedbackTag: normalizeFeedbackTag(payload.feedbackTag),
    strategyFeedback: payload.strategyFeedback,
  })

  return unwrapBusinessResponse(result, '提交复核反馈失败')
}
