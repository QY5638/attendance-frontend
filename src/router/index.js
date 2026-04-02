import { createRouter, createWebHistory } from 'vue-router'

import { useAuthStore } from '../store/auth'
import { setUnauthorizedHandler } from '../utils/request'
import { setupRouterGuard } from './guard'
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
    authStore.logout()

    if (currentRoute.path === '/login') {
      return
    }

    router.replace({
      path: '/login',
      query: currentRoute.fullPath
        ? {
            redirect: currentRoute.fullPath,
          }
        : undefined,
    })
  })

  return router
}

export default createAppRouter
