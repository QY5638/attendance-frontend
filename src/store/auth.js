import { defineStore } from 'pinia'

import { createAuthError, loginRequest, logoutRequest } from '../api/auth'
import { canAccessRoles, getDefaultHomePath, isSupportedRole } from '../router/access'
import { clearAuthStorage, readAuthStorage, writeAuthStorage } from '../utils/auth'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: '',
    roleCode: '',
    realName: '',
    restored: false,
  }),

  getters: {
    isAuthenticated: (state) => Boolean(state.token),
    defaultHomePath: (state) => getDefaultHomePath(state.roleCode),
  },

  actions: {
    async login(payload) {
      const { expectedRoleCode = '', ...loginPayload } = payload || {}
      const data = await loginRequest(loginPayload)

      if (!isSupportedRole(data.roleCode)) {
        this.logout()
        throw new Error('当前账号暂无系统访问权限')
      }

      if (expectedRoleCode && data.roleCode !== expectedRoleCode) {
        this.logout()
        throw createAuthError('所选登录身份与账号角色不一致', 'role')
      }

      this.token = data.token || ''
      this.roleCode = data.roleCode || ''
      this.realName = data.realName || ''
      this.restored = true

      writeAuthStorage({
        token: this.token,
        refreshToken: data.refreshToken || '',
        roleCode: this.roleCode,
        realName: this.realName,
      })

      return data
    },

    restore() {
      if (this.restored) {
        return
      }

      const data = readAuthStorage()

      if ((data.token || data.roleCode || data.realName) && !isSupportedRole(data.roleCode)) {
        this.clearSession()
        return
      }

      this.token = data.token
      this.roleCode = data.roleCode
      this.realName = data.realName
      this.restored = true
    },

    clearSession() {
      this.token = ''
      this.roleCode = ''
      this.realName = ''
      this.restored = true
      clearAuthStorage()
    },

    async logout() {
      const { refreshToken } = readAuthStorage()

      try {
        if (this.token || refreshToken) {
          await logoutRequest(refreshToken)
        }
      } catch {
        // 退出接口失败时仍然清空本地会话，避免界面停留在过期状态。
      } finally {
        this.clearSession()
      }
    },

    hasRole(roles = []) {
      return canAccessRoles(this.roleCode, roles)
    },
  },
})
