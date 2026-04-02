import axios from 'axios'

import { clearAuthStorage, readAuthStorage } from './auth'

let unauthorizedHandler = null

export function setUnauthorizedHandler(handler) {
  unauthorizedHandler = handler
}

const request = axios.create({
  baseURL: '/api',
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
  (error) => {
    if (error?.response?.status === 401) {
      clearAuthStorage()

      if (unauthorizedHandler) {
        unauthorizedHandler()
      }
    }

    return Promise.reject(error)
  },
)

export default request
