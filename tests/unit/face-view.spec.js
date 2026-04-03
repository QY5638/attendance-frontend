import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { registerFace, verifyFace, getUserMedia } = vi.hoisted(() => ({
  registerFace: vi.fn(),
  verifyFace: vi.fn(),
  getUserMedia: vi.fn(),
}))

vi.mock('../../src/api/face', () => ({
  registerFace,
  verifyFace,
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
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('uploads local image and shows verify result', async () => {
    verifyFace.mockResolvedValue({
      userId: 1001,
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

    expect(verifyFace).toHaveBeenCalledWith('data:image/png;base64,uploaded-face.png')
    expect(wrapper.get('[data-testid="face-result-message"]').text()).toBe('人脸验证通过')
    expect(wrapper.get('[data-testid="face-result-user-id"]').text()).toContain('1001')
  })

  it('starts camera, captures image, submits register request, and stops stream on unmount', async () => {
    const { stream, stop } = createStream()
    getUserMedia.mockResolvedValue(stream)
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

    expect(registerFace).toHaveBeenCalledWith('data:image/png;base64,captured-face')
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
})
