export function resolveGuardNavigation({
  isAuthenticated,
  canAccess,
  defaultHomePath,
  to,
}) {
  if (to.meta?.requiresAuth && !isAuthenticated) {
    return {
      path: '/login',
      query: {
        redirect: to.fullPath || to.path,
      },
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
