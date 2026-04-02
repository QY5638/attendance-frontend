<template>
  <el-container class="layout-shell">
    <el-aside :width="collapsed ? '76px' : '248px'" class="layout-sidebar">
      <div class="layout-brand">
        <div class="layout-brand__title">考勤预警系统</div>
        <div v-if="!collapsed" class="layout-brand__subtitle">FE-01 公共壳层</div>
      </div>

      <div class="layout-toggle">
        <el-button text @click="collapsed = !collapsed">
          {{ collapsed ? '展开菜单' : '收起菜单' }}
        </el-button>
      </div>

      <div class="layout-menu-groups">
        <section v-for="group in menuGroups" :key="group.name" class="layout-group">
          <div v-if="!collapsed" class="layout-group__title">{{ group.name }}</div>

          <el-menu
            :default-active="activePath"
            class="layout-menu"
            :collapse="collapsed"
            router
          >
            <el-menu-item
              v-for="item in group.items"
              :key="item.path"
              :index="item.path"
            >
              <span>{{ item.title }}</span>
            </el-menu-item>
          </el-menu>
        </section>
      </div>
    </el-aside>

    <el-container>
      <el-header class="layout-header">
        <div>
          <div class="layout-header__title">后台管理台</div>
          <div class="layout-header__desc">基于角色控制菜单与受保护路由</div>
        </div>

        <div class="layout-header__actions">
          <el-tag type="info">{{ authStore.roleCode || '未识别角色' }}</el-tag>
          <span class="layout-header__name">{{ authStore.realName || '未登录用户' }}</span>
          <el-button type="primary" plain @click="handleLogout">退出登录</el-button>
        </div>
      </el-header>

      <el-main class="layout-main">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { getMenuGroups } from '../router/routes'
import { useAuthStore } from '../store/auth'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const collapsed = ref(false)

const menuRoutes = computed(() => {
  const layoutRoute = router.options.routes.find((item) => item.path === '/')
  return (layoutRoute?.children || []).filter((item) => item.meta?.menuGroup)
})

const menuGroups = computed(() => getMenuGroups(menuRoutes.value, authStore.roleCode))
const activePath = computed(() => route.path)

function handleLogout() {
  authStore.logout()
  router.replace('/login')
}
</script>

<style scoped>
.layout-shell {
  min-height: 100vh;
  background: #eef2ff;
}

.layout-sidebar {
  display: flex;
  flex-direction: column;
  border-right: 1px solid rgba(15, 23, 42, 0.08);
  background: linear-gradient(180deg, #0f172a 0%, #111c44 100%);
  color: #e2e8f0;
}

.layout-brand {
  padding: 24px 20px 12px;
}

.layout-brand__title {
  font-size: 18px;
  font-weight: 700;
}

.layout-brand__subtitle {
  margin-top: 8px;
  font-size: 13px;
  color: rgba(226, 232, 240, 0.72);
}

.layout-toggle {
  padding: 0 16px 12px;
}

.layout-toggle :deep(.el-button) {
  width: 100%;
  color: #cbd5e1;
}

.layout-menu-groups {
  flex: 1;
  overflow-y: auto;
  padding: 0 12px 20px;
}

.layout-group + .layout-group {
  margin-top: 12px;
}

.layout-group__title {
  padding: 10px 12px;
  font-size: 12px;
  color: rgba(148, 163, 184, 0.9);
}

.layout-menu {
  border-right: 0;
  background: transparent;
}

.layout-menu :deep(.el-menu-item) {
  margin-bottom: 6px;
  border-radius: 10px;
  color: #e2e8f0;
}

.layout-menu :deep(.el-menu-item.is-active) {
  background: rgba(99, 102, 241, 0.28);
  color: #ffffff;
}

.layout-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 24px;
  border-bottom: 1px solid rgba(15, 23, 42, 0.06);
  background: rgba(255, 255, 255, 0.82);
  backdrop-filter: blur(10px);
}

.layout-header__title {
  font-size: 20px;
  font-weight: 700;
  color: #0f172a;
}

.layout-header__desc {
  margin-top: 6px;
  font-size: 13px;
  color: #64748b;
}

.layout-header__actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.layout-header__name {
  color: #334155;
  font-weight: 600;
}

.layout-main {
  padding: 24px;
}

@media (max-width: 960px) {
  .layout-header {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
