import axios from 'axios'

import { clearAuthStorage, readAuthStorage, writeAuthStorage } from './auth'

let unauthorizedHandler = null
let refreshPromise = null

const BACKEND_MESSAGE_MAP = {
  'bad request': '请求参数不合法，请检查后重试',
  unauthorized: '登录状态已失效，请重新登录',
  forbidden: '当前账号无权执行此操作',
  'server error': '服务器异常，请稍后重试',
}

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

function normalizeBackendMessage(message) {
  if (typeof message !== 'string') {
    return ''
  }

  const normalized = message.trim()
  if (!normalized) {
    return ''
  }

  const mapped = BACKEND_MESSAGE_MAP[normalized.toLowerCase()]
  return mapped || normalized
}

function createUnauthorizedError(handler = unauthorizedHandler) {
  const normalized = createRequestError('unauthorized', '登录状态已失效，请重新登录')

  clearAuthStorage()
  handler?.(normalized)

  return normalized
}

export function handleRequestError(error, handler = unauthorizedHandler) {
  if (error?.response?.status === 401) {
    return createUnauthorizedError(handler)
  }

  if (error?.response?.status === 403) {
    return createRequestError('forbidden', normalizeBackendMessage(error?.response?.data?.message) || '当前账号无权执行此操作')
  }

  if (error?.code === 'ECONNABORTED') {
    return createRequestError('timeout', '请求超时，请稍后重试')
  }

  if (error?.request && !error?.response) {
    return createRequestError('network', '无法连接到后端服务，请确认接口服务已启动')
  }

  const backendMessage = normalizeBackendMessage(error?.response?.data?.message)
  if (backendMessage) {
    return createRequestError('unknown', backendMessage)
  }

  if (error?.response?.status >= 500) {
    return createRequestError('unknown', '服务器异常，请稍后重试')
  }

  return createRequestError('unknown', '请求失败，请稍后重试')
}

const request = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 10000,
})

const refreshClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 10000,
})

function shouldSkipRefresh(config = {}) {
  const url = String(config?.url || '')
  return url.includes('/auth/login') || url.includes('/auth/refresh')
}

async function refreshSessionTokens() {
  const storage = readAuthStorage()

  if (!storage.refreshToken) {
    throw createRequestError('unauthorized', '登录状态已失效，请重新登录')
  }

  if (!refreshPromise) {
    refreshPromise = refreshClient
      .post('/auth/refresh', { refreshToken: storage.refreshToken })
      .then((response) => {
        const result = response?.data

        if (!result || typeof result !== 'object' || result.code !== 200 || !result.data?.token) {
          throw createRequestError('unauthorized', result?.message || '登录状态已失效，请重新登录')
        }

        const nextStorage = {
          token: result.data.token || '',
          refreshToken: result.data.refreshToken || storage.refreshToken,
          roleCode: result.data.roleCode || storage.roleCode,
          realName: result.data.realName || storage.realName,
        }

        writeAuthStorage(nextStorage)
        return nextStorage
      })
      .finally(() => {
        refreshPromise = null
      })
  }

  return refreshPromise
}

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
  async (error) => {
    const originalConfig = error?.config || {}

    if (error?.response?.status === 401 && !originalConfig.__isRetryRequest && !shouldSkipRefresh(originalConfig)) {
      try {
        const nextStorage = await refreshSessionTokens()
        originalConfig.__isRetryRequest = true
        originalConfig.headers = originalConfig.headers || {}
        originalConfig.headers.Authorization = `Bearer ${nextStorage.token}`
        return request(originalConfig)
      } catch {
        return Promise.reject(createUnauthorizedError())
      }
    }

    return Promise.reject(handleRequestError(error))
  },
)

export default request
