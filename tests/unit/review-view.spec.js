import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  fetchExceptionDetail,
  fetchLatestReview,
  fetchReviewAssistant,
  submitReview,
  submitReviewFeedback,
  routeState,
} = vi.hoisted(() => ({
  fetchExceptionDetail: vi.fn(),
  fetchLatestReview: vi.fn(),
  fetchReviewAssistant: vi.fn(),
  submitReview: vi.fn(),
  submitReviewFeedback: vi.fn(),
  routeState: {
    path: '/review',
    query: {},
  },
}))

vi.mock('../../src/api/exception', () => ({
  fetchExceptionDetail,
}))

vi.mock('../../src/api/review', () => ({
  fetchLatestReview,
  fetchReviewAssistant,
  submitReview,
  submitReviewFeedback,
}))

vi.mock('vue-router', async () => {
  const actual = await vi.importActual('vue-router')

  return {
    ...actual,
    useRoute: () => routeState,
  }
})

import ReviewView from '../../src/views/review/ReviewView.vue'

function createExceptionDetail(overrides = {}) {
  return {
    id: 3001,
    recordId: 2001,
    userId: 1001,
    type: 'PROXY_CHECKIN',
    riskLevel: 'HIGH',
    sourceType: 'MODEL',
    description: '疑似代打卡',
    processStatus: 'PENDING',
    createTime: '2026-04-04 09:10:00',
    ...overrides,
  }
}

function createAssistant(overrides = {}) {
  return {
    aiReviewSuggestion: '设备与地点异常共同提升风险；建议优先人工复核',
    similarCaseSummary: '存在相似设备异常与低分值组合案例',
    decisionReason: '规则与模型结论一致，建议人工复核',
    confidenceScore: 92.5,
    ...overrides,
  }
}

function createReviewRecord(overrides = {}) {
  return {
    id: 6001,
    exceptionId: 3001,
    reviewUserId: 9001,
    reviewResult: 'REJECTED',
    reviewComment: '最新复核意见',
    aiReviewSuggestion: '建议结合历史记录再确认',
    similarCaseSummary: '最近一周存在同类场景',
    feedbackTag: 'TRUE_POSITIVE',
    strategyFeedback: '建议保留当前策略',
    reviewTime: '2026-03-26 09:20:00',
    ...overrides,
  }
}

describe('review view', () => {
  beforeEach(() => {
    routeState.path = '/review'
    routeState.query = {}

    fetchExceptionDetail.mockReset()
    fetchLatestReview.mockReset()
    fetchReviewAssistant.mockReset()
    submitReview.mockReset()
    submitReviewFeedback.mockReset()

    fetchExceptionDetail.mockResolvedValue(createExceptionDetail())
    fetchLatestReview.mockResolvedValue(createReviewRecord())
    fetchReviewAssistant.mockResolvedValue(createAssistant())
    submitReview.mockResolvedValue(createReviewRecord({
      id: 7001,
      reviewResult: 'CONFIRMED',
      reviewComment: '人工确认异常',
      feedbackTag: null,
      strategyFeedback: null,
    }))
    submitReviewFeedback.mockResolvedValue(null)
  })

  it('shows empty state and skips review flow when exceptionId is missing', async () => {
    const wrapper = mount(ReviewView)
    await flushPromises()

    expect(fetchExceptionDetail).not.toHaveBeenCalled()
    expect(fetchLatestReview).not.toHaveBeenCalled()
    expect(fetchReviewAssistant).not.toHaveBeenCalled()
    expect(wrapper.get('[data-testid="review-empty-state"]').text()).toContain('/review?exceptionId=')
  })

  it('loads exception detail, assistant and latest review when exceptionId exists', async () => {
    routeState.query = {
      exceptionId: '3001',
    }

    const wrapper = mount(ReviewView)
    await flushPromises()

    expect(fetchExceptionDetail).toHaveBeenCalledWith('3001')
    expect(fetchLatestReview).toHaveBeenCalledWith('3001')
    expect(fetchReviewAssistant).toHaveBeenCalledWith('3001')
    expect(wrapper.get('[data-testid="review-detail-state"]').text()).toContain('疑似代打卡')
    expect(wrapper.get('[data-testid="review-assistant-card"]').text()).toContain('设备与地点异常共同提升风险')
    expect(wrapper.get('[data-testid="review-latest-card"]').text()).toContain('最新复核意见')
  })

  it('blocks new review submit when assistant is missing but still allows feedback on the latest review', async () => {
    routeState.query = {
      exceptionId: '3001',
    }
    fetchReviewAssistant.mockRejectedValueOnce({
      message: '复核辅助信息不存在',
    })

    const wrapper = mount(ReviewView)
    await flushPromises()

    expect(wrapper.get('[data-testid="review-assistant-error"]').text()).toContain('复核辅助信息不存在')
    expect(wrapper.get('[data-testid="review-submit-button"]').attributes('disabled')).toBeDefined()

    await wrapper.get('[data-testid="review-feedback-tag-NEEDS_TUNING"]').setValue(true)
    await wrapper.get('[data-testid="review-feedback-strategy-input"]').setValue('缺少 assistant 仍允许反馈')
    await wrapper.get('[data-testid="review-feedback-submit"]').trigger('click')
    await flushPromises()

    expect(submitReview).not.toHaveBeenCalled()
    expect(submitReviewFeedback).toHaveBeenCalledWith({
      reviewId: 6001,
      feedbackTag: 'NEEDS_TUNING',
      strategyFeedback: '缺少 assistant 仍允许反馈',
    })
  })

  it('keeps review submit available when assistant request fails for a non-missing error', async () => {
    routeState.query = {
      exceptionId: '3001',
    }
    fetchLatestReview.mockResolvedValueOnce(null)
    fetchReviewAssistant.mockRejectedValueOnce({
      message: '获取复核辅助信息失败',
    })

    const wrapper = mount(ReviewView)
    await flushPromises()

    await wrapper.get('[data-testid="review-result-select"]').setValue('CONFIRMED')

    expect(wrapper.get('[data-testid="review-assistant-error"]').text()).toContain('获取复核辅助信息失败')
    expect(wrapper.get('[data-testid="review-submit-button"]').attributes('disabled')).toBeUndefined()
  })

  it('submits review without calling feedback api when no feedback tag is selected', async () => {
    routeState.query = {
      exceptionId: '3001',
    }
    fetchLatestReview.mockResolvedValueOnce(null)

    const wrapper = mount(ReviewView)
    await flushPromises()

    await wrapper.get('[data-testid="review-result-select"]').setValue('CONFIRMED')
    await wrapper.get('[data-testid="review-comment-input"]').setValue('人工确认异常')
    await wrapper.get('[data-testid="review-submit-button"]').trigger('click')
    await flushPromises()

    expect(submitReview).toHaveBeenCalledWith({
      exceptionId: '3001',
      reviewResult: 'CONFIRMED',
      reviewComment: '人工确认异常',
    })
    expect(submitReviewFeedback).not.toHaveBeenCalled()
    expect(wrapper.get('[data-testid="review-latest-card"]').text()).toContain('人工确认异常')
  })

  it('submits feedback after new review when a feedback tag is selected', async () => {
    routeState.query = {
      exceptionId: '3001',
    }
    fetchLatestReview.mockResolvedValueOnce(null)

    const wrapper = mount(ReviewView)
    await flushPromises()

    await wrapper.get('[data-testid="review-result-select"]').setValue('CONFIRMED')
    await wrapper.get('[data-testid="review-comment-input"]').setValue('人工确认异常')
    await wrapper.get('[data-testid="review-form-tag-FALSE_POSITIVE"]').setValue(true)
    await wrapper.get('[data-testid="review-form-strategy-input"]').setValue('建议降低此类规则敏感度')
    await wrapper.get('[data-testid="review-submit-button"]').trigger('click')
    await flushPromises()

    expect(submitReview).toHaveBeenCalledWith({
      exceptionId: '3001',
      reviewResult: 'CONFIRMED',
      reviewComment: '人工确认异常',
    })
    expect(submitReviewFeedback).toHaveBeenCalledWith({
      reviewId: 7001,
      feedbackTag: 'FALSE_POSITIVE',
      strategyFeedback: '建议降低此类规则敏感度',
    })
  })

  it('keeps the saved latest review visible when optional feedback submission fails', async () => {
    routeState.query = {
      exceptionId: '3001',
    }
    fetchLatestReview.mockResolvedValueOnce(null)
    submitReviewFeedback.mockRejectedValueOnce({
      message: '反馈保存失败',
    })

    const wrapper = mount(ReviewView)
    await flushPromises()

    await wrapper.get('[data-testid="review-result-select"]').setValue('CONFIRMED')
    await wrapper.get('[data-testid="review-comment-input"]').setValue('人工确认异常')
    await wrapper.get('[data-testid="review-form-tag-FALSE_POSITIVE"]').setValue(true)
    await wrapper.get('[data-testid="review-form-strategy-input"]').setValue('建议降低此类规则敏感度')
    await wrapper.get('[data-testid="review-submit-button"]').trigger('click')
    await flushPromises()

    expect(wrapper.get('[data-testid="review-latest-card"]').text()).toContain('人工确认异常')
    expect(wrapper.get('[data-testid="review-feedback-error"]').text()).toContain('反馈保存失败')
    expect(wrapper.text()).toContain('复核结果已提交')
  })
})
