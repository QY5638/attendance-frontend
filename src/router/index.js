import { createRouter, createWebHistory } from 'vue-router'

import { useAuthStore } from '../store/auth'
import { setUnauthorizedHandler } from '../utils/request'
import { normalizeRedirectPath, setupRouterGuard } from './guard'
import { appRoutes } from './routes'

export function createAppRouter(pinia) {
  const router = createRouter({
    history: createWebHistory(),
    routes: appRoutes,
  })

  const authStore = useAuthStore(pinia)
  setupRouterGuard(router, authStore)

  setUnauthorizedHandler(() => {
    const currentRoute = router.currentRoute.value
    const redirect = currentRoute.meta?.requiresAuth
      ? normalizeRedirectPath(currentRoute.fullPath || currentRoute.path)
      : ''

    authStore.clearSession()

    if (currentRoute.path === '/login') {
      return
    }

    router.replace({
      path: '/login',
      query: redirect
        ? {
            redirect,
          }
        : undefined,
    })
  })

  return router
}

export default createAppRouter
