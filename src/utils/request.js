import axios from 'axios'

import { clearAuthStorage, readAuthStorage } from './auth'

let unauthorizedHandler = null

function createRequestError(type, message) {
  return {
    type,
    message,
    field: '',
  }
}

export function setUnauthorizedHandler(handler) {
  unauthorizedHandler = handler
}

export function handleRequestError(error, handler = unauthorizedHandler) {
  if (error?.response?.status === 401) {
    const normalized = createRequestError('unauthorized', '登录状态已失效，请重新登录')

    clearAuthStorage()
    handler?.(normalized)

    return normalized
  }

  if (error?.code === 'ECONNABORTED') {
    return createRequestError('timeout', '请求超时，请稍后重试')
  }

  if (error?.request && !error?.response) {
    return createRequestError('network', '无法连接到后端服务，请确认接口服务已启动')
  }

  return createRequestError('unknown', '请求失败，请稍后重试')
}

const request = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 10000,
})

request.interceptors.request.use((config) => {
  const { token } = readAuthStorage()

  if (token) {
    config.headers = config.headers || {}
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

request.interceptors.response.use(
  (response) => response.data,
  (error) => Promise.reject(handleRequestError(error)),
)

export default request
