import request from '../utils/request'

export async function loginRequest(payload) {
  const result = await request.post('/auth/login', payload)

  if (result.code !== 200) {
    throw new Error(result.message || '登录失败，请稍后重试')
  }

  return result.data || {
    token: '',
    roleCode: '',
    realName: '',
  }
}
