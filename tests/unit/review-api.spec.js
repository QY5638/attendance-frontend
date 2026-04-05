import { beforeEach, describe, expect, it, vi } from 'vitest'

const { get, post } = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
}))

vi.mock('../../src/utils/request', () => ({
  default: {
    get,
    post,
  },
}))

import {
  fetchLatestReview,
  fetchReviewAssistant,
  submitReview,
  submitReviewFeedback,
} from '../../src/api/review'

describe('review api', () => {
  beforeEach(() => {
    get.mockReset()
    post.mockReset()
  })

  it('requests latest review by exception id and normalizes legacy feedback tag', async () => {
    get.mockResolvedValue({
      code: 200,
      data: {
        id: 6001,
        exceptionId: 3001,
        feedbackTag: 'CONFIRMED_EFFECTIVE',
      },
    })

    await expect(fetchLatestReview(3001)).resolves.toEqual({
      id: 6001,
      exceptionId: 3001,
      feedbackTag: 'TRUE_POSITIVE',
    })
    expect(get).toHaveBeenCalledWith('/review/3001')
  })

  it('requests review assistant by exception id', async () => {
    const response = {
      aiReviewSuggestion: '建议优先人工复核',
      similarCaseSummary: '存在相似案例',
      decisionReason: '规则与模型结论一致',
      confidenceScore: 92.5,
    }
    get.mockResolvedValue({ code: 200, data: response })

    await expect(fetchReviewAssistant(3001)).resolves.toEqual(response)
    expect(get).toHaveBeenCalledWith('/review/3001/assistant')
  })

  it('posts review submit payload with FE-07 whitelisted fields only', async () => {
    post.mockResolvedValue({
      code: 200,
      data: {
        id: 6001,
        exceptionId: 3001,
        reviewResult: 'CONFIRMED',
      },
    })

    await submitReview({
      exceptionId: 3001,
      reviewResult: 'CONFIRMED',
      reviewComment: '人工确认异常',
      reviewUserId: 9001,
      feedbackTag: 'FALSE_POSITIVE',
    })

    expect(post).toHaveBeenCalledWith('/review/submit', {
      exceptionId: 3001,
      reviewResult: 'CONFIRMED',
      reviewComment: '人工确认异常',
    })
  })

  it('posts review feedback payload and maps legacy tag to true positive', async () => {
    post.mockResolvedValue({ code: 200, data: null })

    await submitReviewFeedback({
      reviewId: 6001,
      feedbackTag: 'CONFIRMED_EFFECTIVE',
      strategyFeedback: '建议保留当前策略',
      ignoredField: 'should-not-be-sent',
    })

    expect(post).toHaveBeenCalledWith('/review/feedback', {
      reviewId: 6001,
      feedbackTag: 'TRUE_POSITIVE',
      strategyFeedback: '建议保留当前策略',
    })
  })
})
