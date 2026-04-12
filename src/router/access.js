export const SUPPORTED_ROLE_CODES = ['ADMIN', 'EMPLOYEE']

const DEFAULT_HOME_BY_ROLE = {
  ADMIN: '/dashboard',
  EMPLOYEE: '/attendance/checkin',
}

function normalizeRoutePath(path = '') {
  if (!path) {
    return '/'
  }

  return path.startsWith('/') ? path : `/${path}`
}

export function isSupportedRole(roleCode) {
  return SUPPORTED_ROLE_CODES.includes(roleCode)
}

export function getDefaultHomePath(roleCode) {
  return DEFAULT_HOME_BY_ROLE[roleCode] || '/login'
}

export function canAccessRoles(roleCode, roles = []) {
  if (!roles.length) {
    return true
  }

  return roles.includes(roleCode)
}

export function buildMenuGroups(routes = [], roleCode = '') {
  const groups = new Map()

  routes.forEach((route) => {
    if (route.meta?.hidden || !canAccessRoles(roleCode, route.meta?.roles || [])) {
      return
    }

    const groupName = route.meta?.menuGroup
    if (!groupName) {
      return
    }

    if (!groups.has(groupName)) {
      groups.set(groupName, [])
    }

    groups.get(groupName).push({
      path: normalizeRoutePath(route.path),
      title: route.meta?.title || '',
      moduleCode: route.meta?.moduleCode,
    })
  })

  return Array.from(groups.entries()).map(([name, items]) => ({ name, items }))
}
