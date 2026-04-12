import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { registerFace, verifyFace, createFaceLivenessSession, completeFaceLiveness, fetchFaceRegisterStatus, submitFaceRegisterApply, runFaceLivenessChallenge, getUserMedia } = vi.hoisted(() => ({
  registerFace: vi.fn(),
  verifyFace: vi.fn(),
  createFaceLivenessSession: vi.fn(),
  completeFaceLiveness: vi.fn(),
  fetchFaceRegisterStatus: vi.fn(),
  submitFaceRegisterApply: vi.fn(),
  runFaceLivenessChallenge: vi.fn(),
  getUserMedia: vi.fn(),
}))

vi.mock('../../src/api/face', () => ({
  completeFaceLiveness,
  createFaceLivenessSession,
  fetchFaceRegisterStatus,
  registerFace,
  submitFaceRegisterApply,
  verifyFace,
}))

vi.mock('../../src/utils/face-liveness', () => ({
  describeLivenessAction: (action) => action,
  runFaceLivenessChallenge,
}))

vi.mock('../../src/store/auth', () => ({
  useAuthStore: () => ({
    realName: '张三',
  }),
}))

import FaceCaptureView from '../../src/views/face/FaceCaptureView.vue'

if (!Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'srcObject')) {
  Object.defineProperty(HTMLMediaElement.prototype, 'srcObject', {
    configurable: true,
    writable: true,
    value: null,
  })
}

class MockFileReader {
  readAsDataURL(file) {
    this.result = `data:${file.type};base64,uploaded-${file.name}`
    this.onload?.({ target: { result: this.result } })
  }
}

function mountFaceView() {
  return mount(FaceCaptureView)
}

function createStream() {
  const stop = vi.fn()

  return {
    stream: {
      getTracks: () => [{ stop }],
    },
    stop,
  }
}

describe('face capture view', () => {
  beforeEach(() => {
    registerFace.mockReset()
    verifyFace.mockReset()
    createFaceLivenessSession.mockReset()
    completeFaceLiveness.mockReset()
    fetchFaceRegisterStatus.mockReset()
    runFaceLivenessChallenge.mockReset()
    submitFaceRegisterApply.mockReset()
    getUserMedia.mockReset()
    vi.restoreAllMocks()
    vi.stubGlobal('FileReader', MockFileReader)
    Object.defineProperty(global.navigator, 'mediaDevices', {
      configurable: true,
      value: {
        getUserMedia,
      },
    })
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      drawImage: vi.fn(),
    })
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/png;base64,captured-face')
    fetchFaceRegisterStatus.mockResolvedValue({
      userId: 1001,
      registered: false,
      requiresApproval: false,
      canRegister: true,
      canApply: false,
      status: 'NONE',
      message: '当前账号尚未录入人脸，可直接进行人脸采集',
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('uploads local image and shows verify result', async () => {
    verifyFace.mockResolvedValue({
      userId: 123456789,
      registered: true,
      matched: true,
      faceScore: 98.56,
      threshold: 85,
      message: '人脸验证通过',
    })

    const wrapper = mountFaceView()
    await wrapper.get('[data-testid="source-upload"]').trigger('click')

    const input = wrapper.get('[data-testid="face-upload-input"]')
    const file = new File(['face'], 'face.png', { type: 'image/png' })
    Object.defineProperty(input.element, 'files', {
      configurable: true,
      value: [file],
    })

    await input.trigger('change')
    await flushPromises()

    expect(wrapper.get('[data-testid="face-preview-image"]').attributes('src')).toBe(
      'data:image/png;base64,uploaded-face.png',
    )

    await wrapper.get('[data-testid="face-verify-button"]').trigger('click')
    await flushPromises()

    expect(verifyFace).toHaveBeenCalledWith('data:image/png;base64,uploaded-face.png', '')
    expect(wrapper.get('[data-testid="face-result-message"]').text()).toBe('人脸验证通过')
    expect(wrapper.get('[data-testid="face-result-user-id"]').text()).toContain('当前账号：张三')
  })

  it('starts camera, captures image, submits register request, and stops stream on unmount', async () => {
    const { stream, stop } = createStream()
    getUserMedia.mockResolvedValue(stream)
    createFaceLivenessSession.mockResolvedValue({
      code: 200,
      data: {
        sessionId: 'liveness-session-1',
        actions: ['BLINK', 'MOUTH_OPEN'],
      },
    })
    runFaceLivenessChallenge.mockResolvedValue({
      imageData: 'data:image/png;base64,liveness-face',
      startedAt: 1,
      completedAt: 2,
      sampleCount: 20,
      stableFaceFrames: 18,
      completedActions: ['BLINK', 'MOUTH_OPEN'],
      actionScores: {
        BLINK: 0.9,
        MOUTH_OPEN: 0.92,
      },
    })
    completeFaceLiveness.mockResolvedValue({
      code: 200,
      data: {
        livenessToken: 'liveness-token',
        expiresAt: Date.now() + 60000,
        livenessScore: 91.5,
        message: '活体挑战通过',
      },
    })
    registerFace.mockResolvedValue({
      userId: 1001,
      registered: true,
      message: '人脸录入成功',
      createTime: '2026-04-03T20:00:00',
    })

    const wrapper = mountFaceView()

    await wrapper.get('[data-testid="camera-start-button"]').trigger('click')
    await flushPromises()
    await wrapper.get('[data-testid="camera-capture-button"]').trigger('click')
    await flushPromises()

    expect(wrapper.get('[data-testid="face-preview-image"]').attributes('src')).toBe(
      'data:image/png;base64,captured-face',
    )

    await wrapper.get('[data-testid="face-register-button"]').trigger('click')
    await flushPromises()

    expect(registerFace).toHaveBeenCalledWith('data:image/png;base64,liveness-face', 'liveness-token')
    expect(wrapper.get('[data-testid="face-result-message"]').text()).toBe('人脸录入成功')

    wrapper.unmount()
    expect(stop).toHaveBeenCalledTimes(1)
  })

  it('shows fallback camera error when camera access fails', async () => {
    getUserMedia.mockRejectedValue(new Error('denied'))

    const wrapper = mountFaceView()
    await wrapper.get('[data-testid="camera-start-button"]').trigger('click')
    await flushPromises()

    expect(wrapper.get('[data-testid="camera-error"]').text()).toContain('无法访问摄像头')
    expect(wrapper.get('[data-testid="source-upload"]').exists()).toBe(true)
  })

  it('locks duplicate verify submits while request is pending', async () => {
    let resolveVerify
    verifyFace.mockReturnValue(
      new Promise((resolve) => {
        resolveVerify = resolve
      }),
    )

    const wrapper = mountFaceView()
    await wrapper.get('[data-testid="source-upload"]').trigger('click')

    const input = wrapper.get('[data-testid="face-upload-input"]')
    const file = new File(['face'], 'face.png', { type: 'image/png' })
    Object.defineProperty(input.element, 'files', {
      configurable: true,
      value: [file],
    })

    await input.trigger('change')
    await flushPromises()

    const verifyButton = wrapper.get('[data-testid="face-verify-button"]')
    verifyButton.element.click()
    verifyButton.element.click()
    await flushPromises()

    expect(verifyFace).toHaveBeenCalledTimes(1)

    resolveVerify({
      userId: 1001,
      registered: true,
      matched: false,
      faceScore: 60,
      threshold: 85,
      message: '人脸验证未通过',
    })
    await flushPromises()

    expect(wrapper.get('[data-testid="face-result-message"]').text()).toBe('人脸验证未通过')
  })

  it('requires approval request before re-register when face is already recorded', async () => {
    fetchFaceRegisterStatus.mockResolvedValueOnce({
      userId: 1001,
      registered: true,
      requiresApproval: true,
      canRegister: false,
      canApply: true,
      status: 'USED',
      message: '当前账号已录入人脸，如需重新采集，请先提交申请并等待管理员审批',
    })
    submitFaceRegisterApply.mockResolvedValue({
      userId: 1001,
      registered: true,
      requiresApproval: true,
      canRegister: false,
      canApply: false,
      status: 'PENDING',
      message: '已提交人脸重录申请，请等待管理员审批',
      reason: '照片更新',
    })

    const wrapper = mountFaceView()
    await flushPromises()

    expect(wrapper.get('[data-testid="face-register-approval-status"]').text()).toContain('已使用')
    expect(wrapper.text()).toContain('当前账号已录入人脸')
    expect(wrapper.get('[data-testid="face-register-button"]').attributes('disabled')).toBeDefined()

    await wrapper.get('[data-testid="face-register-apply-reason"]').setValue('照片更新')
    await wrapper.get('[data-testid="face-register-apply-button"]').trigger('click')
    await flushPromises()

    expect(submitFaceRegisterApply).toHaveBeenCalledWith('照片更新')
    expect(wrapper.get('[data-testid="face-register-approval-status"]').text()).toContain('待审批')
    expect(wrapper.text()).toContain('人脸重录申请已提交，请等待管理员审批')
  })
})
