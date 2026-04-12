export const AUTH_STORAGE_KEYS = {
  token: 'attendance_token',
  refreshToken: 'attendance_refresh_token',
  roleCode: 'attendance_role_code',
  realName: 'attendance_real_name',
}

function createEmptyAuthStorage() {
  return {
    token: '',
    refreshToken: '',
    roleCode: '',
    realName: '',
  }
}

function getSessionStorageSafe() {
  if (typeof window === 'undefined' || !window.sessionStorage) {
    return null
  }

  return window.sessionStorage
}

function getLocalStorageSafe() {
  if (typeof window === 'undefined' || !window.localStorage) {
    return null
  }

  return window.localStorage
}

function readFromStorage(storage) {
  if (!storage) {
    return createEmptyAuthStorage()
  }

  return {
    token: storage.getItem(AUTH_STORAGE_KEYS.token) || '',
    refreshToken: storage.getItem(AUTH_STORAGE_KEYS.refreshToken) || '',
    roleCode: storage.getItem(AUTH_STORAGE_KEYS.roleCode) || '',
    realName: storage.getItem(AUTH_STORAGE_KEYS.realName) || '',
  }
}

function hasAuthData(data) {
  return Boolean(data.token || data.refreshToken || data.roleCode || data.realName)
}

function clearStorage(storage) {
  if (!storage) {
    return
  }

  storage.removeItem(AUTH_STORAGE_KEYS.token)
  storage.removeItem(AUTH_STORAGE_KEYS.refreshToken)
  storage.removeItem(AUTH_STORAGE_KEYS.roleCode)
  storage.removeItem(AUTH_STORAGE_KEYS.realName)
}

export function readAuthStorage() {
  const sessionStorage = getSessionStorageSafe()
  const sessionData = readFromStorage(sessionStorage)

  if (hasAuthData(sessionData)) {
    return sessionData
  }

  const localStorage = getLocalStorageSafe()
  const localData = readFromStorage(localStorage)

  if (!hasAuthData(localData)) {
    return localData
  }

  if (sessionStorage) {
    writeAuthStorage(localData)
  }
  clearStorage(localStorage)
  return localData
}

export function writeAuthStorage({ token = '', refreshToken = '', roleCode = '', realName = '' }) {
  const sessionStorage = getSessionStorageSafe()
  if (sessionStorage) {
    sessionStorage.setItem(AUTH_STORAGE_KEYS.token, token)
    sessionStorage.setItem(AUTH_STORAGE_KEYS.refreshToken, refreshToken)
    sessionStorage.setItem(AUTH_STORAGE_KEYS.roleCode, roleCode)
    sessionStorage.setItem(AUTH_STORAGE_KEYS.realName, realName)
  }

  clearStorage(getLocalStorageSafe())
}

export function clearAuthStorage() {
  clearStorage(getSessionStorageSafe())
  clearStorage(getLocalStorageSafe())
}
