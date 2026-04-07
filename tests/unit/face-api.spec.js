import { beforeEach, describe, expect, it, vi } from 'vitest'

const { post } = vi.hoisted(() => ({ post: vi.fn() }))

vi.mock('../../src/utils/request', () => ({
  default: {
    post,
  },
}))

import { registerFace, verifyFace } from '../../src/api/face'

describe('face api', () => {
  beforeEach(() => {
    post.mockReset()
  })

  it('submits register request with imageData only', async () => {
    post.mockResolvedValue({
      code: 200,
      data: {
        userId: 1001,
        registered: true,
        message: '人脸录入成功',
        createTime: '2026-04-03T20:00:00',
      },
    })

    await expect(registerFace('base64-register')).resolves.toEqual({
      userId: 1001,
      registered: true,
      message: '人脸录入成功',
      createTime: '2026-04-03T20:00:00',
    })
    expect(post).toHaveBeenCalledWith('/face/register', {
      imageData: 'base64-register',
    })
  })

  it('submits verify request with imageData only', async () => {
    post.mockResolvedValue({
      code: 200,
      data: {
        userId: 1001,
        registered: true,
        matched: true,
        faceScore: 98.56,
        threshold: 85,
        message: '人脸验证通过',
      },
    })

    await expect(verifyFace('base64-verify')).resolves.toEqual({
      userId: 1001,
      registered: true,
      matched: true,
      faceScore: 98.56,
      threshold: 85,
      message: '人脸验证通过',
    })
    expect(post).toHaveBeenCalledWith('/face/verify', {
      imageData: 'base64-verify',
    })
  })

  it('maps register business failure to face error', async () => {
    post.mockResolvedValue({ code: 400, message: '人脸图像不能为空' })

    await expect(registerFace('')).rejects.toMatchObject({
      type: 'face',
      action: 'register',
      message: '人脸图像不能为空',
    })
  })

  it('rejects verify response without data with fallback face error', async () => {
    post.mockResolvedValue({ code: 200 })

    await expect(verifyFace('base64-verify')).rejects.toMatchObject({
      type: 'face',
      action: 'verify',
      message: '人脸验证失败，请稍后重试',
    })
  })
})
