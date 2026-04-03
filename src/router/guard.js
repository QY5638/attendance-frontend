export function normalizeRedirectPath(redirect) {
  if (typeof redirect !== 'string' || !redirect.startsWith('/') || redirect.startsWith('//')) {
    return ''
  }

  if (redirect === '/login' || redirect.startsWith('/login?') || redirect.startsWith('/login#')) {
    return ''
  }

  return redirect
}

export function resolvePostLoginPath(redirect, defaultHomePath) {
  return normalizeRedirectPath(redirect) || defaultHomePath
}

export function resolveGuardNavigation({
  isAuthenticated,
  canAccess,
  defaultHomePath,
  to,
}) {
  if (to.meta?.requiresAuth && !isAuthenticated) {
    const redirect = normalizeRedirectPath(to.fullPath || to.path)

    return {
      path: '/login',
      query: redirect
        ? {
            redirect,
          }
        : undefined,
    }
  }

  if (isAuthenticated && (to.path === '/login' || to.path === '/')) {
    return { path: defaultHomePath }
  }

  if (to.meta?.requiresAuth && !canAccess) {
    return { path: '/403' }
  }

  return true
}

export function setupRouterGuard(router, authStore) {
  router.beforeEach((to) => {
    authStore.restore()

    const canAccess = authStore.hasRole(to.meta?.roles || [])
    return resolveGuardNavigation({
      isAuthenticated: authStore.isAuthenticated,
      canAccess,
      defaultHomePath: authStore.defaultHomePath,
      to,
    })
  })
}
