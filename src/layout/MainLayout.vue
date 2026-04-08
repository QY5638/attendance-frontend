<template>
  <el-container class="layout-shell">
    <el-aside :width="collapsed ? '76px' : '248px'" class="layout-sidebar">
      <div class="layout-brand">
        <div class="layout-brand__mark">勤</div>
        <div v-if="!collapsed" class="layout-brand__copy">
          <div class="layout-brand__title">企业考勤管理系统</div>
          <div class="layout-brand__subtitle">内部办公平台</div>
        </div>
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
              <span class="layout-menu__icon">{{ getMenuIcon(item.title) }}</span>
              <span>{{ item.title }}</span>
            </el-menu-item>
          </el-menu>
        </section>
      </div>

      <div v-if="!collapsed" class="layout-sidebar__footer">
        <span>当前角色</span>
        <strong>{{ roleLabel }}</strong>
      </div>
    </el-aside>

    <el-container>
      <el-header class="layout-header">
        <div class="layout-header__intro">
          <div class="layout-header__eyebrow">{{ currentSection }}</div>
          <div class="layout-header__title">{{ currentTitle }}</div>
          <div class="layout-header__desc">{{ currentDescription }}</div>
        </div>

        <div class="layout-header__actions">
          <div class="layout-header__identity">
            <span class="layout-header__identity-label">当前登录</span>
            <strong class="layout-header__name">{{ authStore.realName || '未登录用户' }}</strong>
          </div>
          <el-tag effect="dark" class="layout-header__role-tag">{{ roleLabel }}</el-tag>
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
const currentTitle = computed(() => route.meta?.title || '管理首页')
const currentSection = computed(() => route.meta?.menuGroup || '工作区')
const currentDescription = computed(() => {
  const descriptions = {
    概览工作台: '集中查看运行概况、重点提醒和常用入口。',
    统计分析: '查看部门指标、趋势变化和综合分析结果。',
    用户管理: '维护人员资料、所属部门和角色信息。',
    部门管理: '维护组织部门资料，便于统一归口管理。',
    角色管理: '维护岗位角色资料和页面访问范围。',
    人脸采集: '完成人脸信息采集与资料更新。',
    考勤记录: '支持打卡、记录查询和补卡申请等日常业务。',
    异常中心: '集中处理异常记录、查看原因并进入复核。',
    预警列表: '查看预警信息、处置建议和相关异常。',
    人工复核: '结合辅助意见完成复核处理和反馈。',
    系统配置: '维护基础配置、分析模板和运行记录。',
  }

  return descriptions[route.meta?.title] || '集中展示当前页面的主要信息和常用操作。'
})
const roleLabel = computed(() => {
  if (authStore.roleCode === 'ADMIN') {
    return '管理员'
  }

  if (authStore.roleCode === 'EMPLOYEE') {
    return '员工'
  }

  return '其他角色'
})

const MENU_ICONS = {
  概览工作台: '◫',
  统计分析: '▦',
  用户管理: '◎',
  部门管理: '◌',
  角色管理: '◈',
  人脸采集: '◐',
  考勤记录: '◧',
  异常中心: '▲',
  预警列表: '△',
  人工复核: '◇',
  系统配置: '▣',
}

function getMenuIcon(title) {
  return MENU_ICONS[title] || '•'
}

function handleLogout() {
  authStore.logout()
  router.replace('/login')
}
</script>

<style scoped>
.layout-shell {
  min-height: 100vh;
  background:
    radial-gradient(circle at top left, rgba(47, 105, 178, 0.1), transparent 30%),
    radial-gradient(circle at right center, rgba(15, 95, 148, 0.08), transparent 26%),
    linear-gradient(180deg, #f3f6fb 0%, #f7f9fc 52%, #eef3f9 100%);
}

.layout-sidebar {
  display: flex;
  flex-direction: column;
  border-right: 1px solid rgba(15, 23, 42, 0.08);
  background: linear-gradient(180deg, #18304d 0%, #233f61 100%);
  color: #e2e8f0;
}

.layout-brand {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 24px 20px 16px;
}

.layout-brand__mark {
  width: 40px;
  height: 40px;
  display: grid;
  place-items: center;
  border-radius: 12px;
  background: linear-gradient(135deg, rgba(125, 211, 252, 0.24), rgba(47, 105, 178, 0.34));
  color: #f8fafc;
  font-weight: 800;
  letter-spacing: 0.08em;
}

.layout-brand__copy {
  min-width: 0;
}

.layout-brand__title {
  font-size: 18px;
  font-weight: 700;
}

.layout-brand__subtitle {
  margin-top: 6px;
  font-size: 12px;
  color: rgba(226, 232, 240, 0.72);
}

.layout-toggle {
  padding: 0 16px 16px;
}

.layout-toggle :deep(.el-button) {
  width: 100%;
  min-height: 40px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.08);
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

.layout-sidebar__footer {
  margin: 0 16px 18px;
  padding: 14px 16px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.06);
}

.layout-sidebar__footer span {
  display: block;
  margin-bottom: 8px;
  font-size: 12px;
  color: rgba(191, 219, 254, 0.72);
}

.layout-sidebar__footer strong {
  color: #f8fafc;
}

.layout-header {
  display: flex;
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

.layout-header__eyebrow {
  margin-bottom: 8px;
  font-size: 13px;
  color: #2f69b2;
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
  justify-content: flex-end;
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
  padding: 24px;
}

@media (max-width: 960px) {
  .layout-header {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
