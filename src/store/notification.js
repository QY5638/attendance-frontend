import { defineStore } from 'pinia'

import {
  fetchNotificationUnreadCount,
  openNotificationStream,
} from '../api/notification'
import { readAuthStorage } from '../utils/auth'

export const useNotificationStore = defineStore('notification', {
  state: () => ({
    unreadCount: 0,
    eventVersion: 0,
    stream: null,
    reconnectTimer: null,
  }),

  actions: {
    async refreshUnreadCount() {
      const { token, roleCode } = readAuthStorage()
      if (!token || roleCode !== 'EMPLOYEE') {
        this.unreadCount = 0
        return 0
      }

      try {
        const count = Number(await fetchNotificationUnreadCount())
        this.unreadCount = Number.isFinite(count) ? count : 0
        return this.unreadCount
      } catch {
        return this.unreadCount
      }
    },

    connectStream() {
      const { token, roleCode } = readAuthStorage()
      if (!token || roleCode !== 'EMPLOYEE' || this.stream) {
        return
      }

      try {
        const source = openNotificationStream(token)
        this.stream = source

        source.onmessage = (event) => {
          this.eventVersion += 1

          try {
            const payload = JSON.parse(event?.data || '{}')
            const nextCount = Number(payload?.unreadCount)
            this.unreadCount = Number.isFinite(nextCount) ? nextCount : this.unreadCount
          } catch {
            void this.refreshUnreadCount()
          }
        }

        source.onerror = () => {
          this.closeStream()
          this.scheduleReconnect()
        }
      } catch {
        this.scheduleReconnect()
      }
    },

    scheduleReconnect() {
      if (typeof window === 'undefined' || this.reconnectTimer) {
        return
      }

      const { token, roleCode } = readAuthStorage()
      if (!token || roleCode !== 'EMPLOYEE') {
        return
      }

      this.reconnectTimer = window.setTimeout(() => {
        this.reconnectTimer = null
        this.connectStream()
      }, 5000)
    },

    closeStream() {
      if (this.stream) {
        this.stream.close()
        this.stream = null
      }

      if (typeof window !== 'undefined' && this.reconnectTimer) {
        window.clearTimeout(this.reconnectTimer)
        this.reconnectTimer = null
      }
    },

    reset() {
      this.closeStream()
      this.unreadCount = 0
      this.eventVersion = 0
    },
  },
})
