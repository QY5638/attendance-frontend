import { fileURLToPath, URL } from 'node:url'

import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { configDefaults } from 'vitest/config'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [vue()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      proxy: {
        '/api': {
          target: env.VITE_API_PROXY_TARGET || 'http://127.0.0.1:8080',
          changeOrigin: true,
        },
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            const normalizedId = id.replace(/\\/g, '/')

            if (!normalizedId.includes('/node_modules/')) {
              return
            }

            if (
              normalizedId.includes('/node_modules/vue/') ||
              normalizedId.includes('/node_modules/@vue/') ||
              normalizedId.includes('/node_modules/vue-router/') ||
              normalizedId.includes('/node_modules/pinia/')
            ) {
              return 'vue-core'
            }

            if (normalizedId.includes('/node_modules/axios/')) {
              return 'network'
            }
          },
        },
      },
    },
    test: {
      environment: 'jsdom',
      globals: true,
      clearMocks: true,
      exclude: [...configDefaults.exclude, '.worktrees/**'],
    },
  }
})
