import { defineStore } from 'pinia'

import { loginRequest } from '../api/auth'
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
      const data = await loginRequest(payload)

      if (!isSupportedRole(data.roleCode)) {
        this.logout()
        throw new Error('当前账号暂无系统访问权限')
      }

      this.token = data.token || ''
      this.roleCode = data.roleCode || ''
      this.realName = data.realName || ''
      this.restored = true

      writeAuthStorage({
        token: this.token,
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
      this.token = data.token
      this.roleCode = data.roleCode
      this.realName = data.realName
      this.restored = true
    },

    logout() {
      this.token = ''
      this.roleCode = ''
      this.realName = ''
      this.restored = true
      clearAuthStorage()
    },

    hasRole(roles = []) {
      return canAccessRoles(this.roleCode, roles)
    },
  },
})
