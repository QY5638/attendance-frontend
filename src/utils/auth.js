export const AUTH_STORAGE_KEYS = {
  token: 'attendance_token',
  refreshToken: 'attendance_refresh_token',
  roleCode: 'attendance_role_code',
  realName: 'attendance_real_name',
}

export function readAuthStorage() {
  return {
    token: localStorage.getItem(AUTH_STORAGE_KEYS.token) || '',
    refreshToken: localStorage.getItem(AUTH_STORAGE_KEYS.refreshToken) || '',
    roleCode: localStorage.getItem(AUTH_STORAGE_KEYS.roleCode) || '',
    realName: localStorage.getItem(AUTH_STORAGE_KEYS.realName) || '',
  }
}

export function writeAuthStorage({ token = '', refreshToken = '', roleCode = '', realName = '' }) {
  localStorage.setItem(AUTH_STORAGE_KEYS.token, token)
  localStorage.setItem(AUTH_STORAGE_KEYS.refreshToken, refreshToken)
  localStorage.setItem(AUTH_STORAGE_KEYS.roleCode, roleCode)
  localStorage.setItem(AUTH_STORAGE_KEYS.realName, realName)
}

export function clearAuthStorage() {
  localStorage.removeItem(AUTH_STORAGE_KEYS.token)
  localStorage.removeItem(AUTH_STORAGE_KEYS.refreshToken)
  localStorage.removeItem(AUTH_STORAGE_KEYS.roleCode)
  localStorage.removeItem(AUTH_STORAGE_KEYS.realName)
}
