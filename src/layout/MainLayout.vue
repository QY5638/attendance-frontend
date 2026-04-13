<template>
  <el-container class="layout-shell">
    <el-aside width="248px" class="layout-sidebar">
      <div class="layout-brand">
        <div class="layout-brand__copy">
          <div class="layout-brand__title">企业考勤管理系统</div>
          <div class="layout-brand__subtitle">内部办公平台</div>
        </div>
      </div>

      <div class="layout-menu-groups">
        <section v-for="group in menuGroups" :key="group.name" class="layout-group">
          <div class="layout-group__title">{{ group.name }}</div>

          <el-menu
            :default-active="activePath"
            class="layout-menu"
            router
          >
            <el-menu-item
              v-for="item in group.items"
              :key="item.path"
              :index="item.path"
            >
              <span class="layout-menu__icon">{{ getMenuIcon(item.title) }}</span>
              <span>{{ item.title }}</span>
            </el-menu-item>
          </el-menu>
        </section>
      </div>

    </el-aside>

    <el-container class="layout-content-shell">
      <el-header class="layout-header">
        <div class="layout-header__intro">
          <div class="layout-header__title">{{ currentCategory }}</div>
        </div>

        <div class="layout-header__actions">
          <div class="layout-header__identity">
            <span class="layout-header__identity-label">当前登录</span>
            <strong class="layout-header__name">{{ currentLoginName }}</strong>
          </div>
          <button v-if="showMessageEntry" type="button" class="layout-header__message-button" @click="openMessages">
            <span>消息中心</span>
            <span v-if="unreadCount > 0" class="layout-header__message-badge">{{ unreadCount > 99 ? '99+' : unreadCount }}</span>
          </button>
          <el-tag v-if="showRoleTag" effect="dark" class="layout-header__role-tag">{{ roleLabel }}</el-tag>
          <el-button type="primary" plain @click="handleLogout">退出登录</el-button>
        </div>
      </el-header>

      <el-main class="layout-main">
        <div class="layout-main__viewport">
          <router-view />
        </div>
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { getMenuGroups } from '../router/routes'
import { useAuthStore } from '../store/auth'
import { useNotificationStore } from '../store/notification'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const notificationStore = useNotificationStore()

const menuRoutes = computed(() => {
  const layoutRoute = router.options.routes.find((item) => item.path === '/')
  return (layoutRoute?.children || []).filter((item) => item.meta?.menuGroup)
})

const menuGroups = computed(() => getMenuGroups(menuRoutes.value, authStore.roleCode))
const activePath = computed(() => route.path)
const currentLoginName = computed(() => {
  if (authStore.realName) {
    return authStore.realName
  }

  if (authStore.token) {
    return '当前用户'
  }

  return '未登录用户'
})
const currentCategory = computed(() => route.meta?.menuGroup || route.meta?.title || '管理首页')
const roleLabel = computed(() => {
  if (authStore.roleCode === 'ADMIN') {
    return '管理员'
  }

  if (authStore.roleCode === 'EMPLOYEE') {
    return '员工'
  }

  return '其他角色'
})
const showRoleTag = computed(() => {
  return Boolean(authStore.token) && Boolean(roleLabel.value) && currentLoginName.value !== roleLabel.value
})
const unreadCount = computed(() => Number(notificationStore.unreadCount || 0))
const showMessageEntry = computed(() => Boolean(authStore.token) && authStore.roleCode === 'EMPLOYEE')

const MENU_ICONS = {
  概览工作台: '◫',
  统计分析: '▦',
      用户管理: '◎',
      部门管理: '◌',
      角色管理: '◈',
      人脸采集: '◐',
      考勤打卡: '◫',
      考勤记录: '◧',
      补卡申请: '◭',
      补卡审批: '◬',
      个人中心: '◎',
      消息中心: '◍',
      异常中心: '▲',
      预警列表: '△',
      人工复核: '◇',
      基础配置: '▣',
      方案设置: '◭',
      采集申请: '◈',
      操作记录: '◨',
}

function getMenuIcon(title) {
  return MENU_ICONS[title] || '•'
}

function openMessages() {
  router.push('/messages')
}

async function handleLogout() {
  notificationStore.reset()
  await authStore.logout()
  router.replace('/login')
}

onMounted(() => {
  if (!authStore.token || authStore.roleCode !== 'EMPLOYEE') {
    notificationStore.reset()
    return
  }

  void notificationStore.refreshUnreadCount()
  notificationStore.connectStream()
})

onBeforeUnmount(() => {
  notificationStore.closeStream()
})
</script>

<style scoped>
.layout-shell {
  height: 100vh;
  overflow: hidden;
  background:
    radial-gradient(circle at top left, rgba(47, 105, 178, 0.1), transparent 30%),
    radial-gradient(circle at right center, rgba(15, 95, 148, 0.08), transparent 26%),
    linear-gradient(180deg, #f3f6fb 0%, #f7f9fc 52%, #eef3f9 100%);
}

.layout-sidebar {
  display: flex;
  height: 100vh;
  flex-direction: column;
  overflow: hidden;
  border-right: 1px solid rgba(15, 23, 42, 0.08);
  background: linear-gradient(180deg, #18304d 0%, #233f61 100%);
  color: #e2e8f0;
}

.layout-content-shell {
  min-width: 0;
  height: 100vh;
  overflow: hidden;
}

.layout-brand {
  padding: 20px 18px 14px;
  border-bottom: 1px solid rgba(226, 232, 240, 0.12);
}

.layout-brand__copy {
  min-width: 0;
}

.layout-brand__title {
  font-size: 17px;
  font-weight: 700;
  line-height: 1.4;
}

.layout-brand__subtitle {
  margin-top: 4px;
  font-size: 12px;
  color: rgba(226, 232, 240, 0.72);
}

.layout-menu-groups {
  flex: 1;
  overflow-y: auto;
  padding: 10px 12px 20px;
}

.layout-group + .layout-group {
  margin-top: 12px;
}

.layout-group__title {
  padding: 10px 12px;
  font-size: 12px;
  letter-spacing: 0.08em;
  color: rgba(148, 163, 184, 0.9);
}

.layout-menu {
  border-right: 0;
  background: transparent;
}

.layout-menu :deep(.el-menu-item) {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 48px;
  margin-bottom: 6px;
  border-radius: 14px;
  color: #e2e8f0;
  transition: background-color 0.2s ease, transform 0.2s ease;
}

.layout-menu :deep(.el-menu-item:hover) {
  background: rgba(255, 255, 255, 0.08);
}

.layout-menu :deep(.el-menu-item.is-active) {
  background: linear-gradient(135deg, rgba(47, 105, 178, 0.52), rgba(15, 95, 148, 0.28));
  color: #ffffff;
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.18);
}

.layout-menu__icon {
  width: 18px;
  display: inline-grid;
  place-items: center;
  color: rgba(191, 219, 254, 0.9);
}

.layout-header {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 24px;
  border-bottom: 1px solid rgba(15, 23, 42, 0.06);
  background: rgba(255, 255, 255, 0.86);
  backdrop-filter: blur(10px);
}

.layout-header__intro {
  min-width: 0;
}

.layout-header__title {
  font-size: 20px;
  font-weight: 700;
  color: #0f172a;
}

.layout-header__desc {
  margin-top: 4px;
  font-size: 13px;
  color: #64748b;
}

.layout-header__actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.layout-header__message-button {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  min-height: 40px;
  padding: 0 14px;
  border: 1px solid rgba(47, 105, 178, 0.18);
  border-radius: 999px;
  background: rgba(47, 105, 178, 0.08);
  color: #245391;
  font-weight: 600;
  cursor: pointer;
}

.layout-header__message-badge {
  min-width: 24px;
  padding: 4px 8px;
  border-radius: 999px;
  background: #dc2626;
  color: #ffffff;
  font-size: 12px;
  text-align: center;
}

.layout-header__identity {
  min-width: 120px;
  padding: 10px 14px;
  border-radius: 14px;
  background: rgba(47, 105, 178, 0.08);
}

.layout-header__identity-label {
  display: block;
  margin-bottom: 6px;
  font-size: 12px;
  color: #64748b;
}

.layout-header__name {
  color: #334155;
  font-weight: 600;
}

.layout-header__role-tag {
  min-height: 38px;
  padding-inline: 14px;
  border: none;
  background: linear-gradient(135deg, #245391 0%, #2f69b2 100%);
}

.layout-main {
  min-height: 0;
  overflow: hidden;
  padding: 24px;
}

.layout-main__viewport {
  height: 100%;
  min-height: 0;
  overflow: auto;
}

@media (max-width: 960px) {
  .layout-header {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
