export const AUTH_STORAGE_KEYS = {
  token: 'attendance_token',
  roleCode: 'attendance_role_code',
  realName: 'attendance_real_name',
}

export function readAuthStorage() {
  return {
    token: localStorage.getItem(AUTH_STORAGE_KEYS.token) || '',
    roleCode: localStorage.getItem(AUTH_STORAGE_KEYS.roleCode) || '',
    realName: localStorage.getItem(AUTH_STORAGE_KEYS.realName) || '',
  }
}

export function writeAuthStorage({ token = '', roleCode = '', realName = '' }) {
  localStorage.setItem(AUTH_STORAGE_KEYS.token, token)
  localStorage.setItem(AUTH_STORAGE_KEYS.roleCode, roleCode)
  localStorage.setItem(AUTH_STORAGE_KEYS.realName, realName)
}

export function clearAuthStorage() {
  localStorage.removeItem(AUTH_STORAGE_KEYS.token)
  localStorage.removeItem(AUTH_STORAGE_KEYS.roleCode)
  localStorage.removeItem(AUTH_STORAGE_KEYS.realName)
}
