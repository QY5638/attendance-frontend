<template>
  <section class="system-view">
    <header class="system-view__hero">
      <div>
        <p class="system-view__eyebrow">FE-08 系统配置模块</p>
        <h1>系统配置</h1>
        <p class="system-view__desc">
          保持 `/system` 单路由，在页面内部组织二级导航和子页容器，避免侵入全局菜单与壳层逻辑。
        </p>
      </div>
      <div class="system-view__meta">
        <span>当前入口：/system</span>
        <strong>{{ activeItem.label }}</strong>
      </div>
    </header>

    <nav class="system-view__tabs" aria-label="系统配置子页切换">
      <button
        v-for="item in navItems"
        :key="item.key"
        :data-tab="item.key"
        type="button"
        class="system-view__tab"
        :class="{ 'system-view__tab--active': item.key === activeTab }"
        @click="handleTabChange(item.key)"
      >
        <span>{{ item.label }}</span>
        <small>{{ item.desc }}</small>
      </button>
    </nav>

    <section class="system-view__panel">
      <component :is="activeItem.component" :key="activeTab" />
    </section>
  </section>
</template>

<script setup>
import { computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import SystemDevicePanel from './panels/SystemDevicePanel.vue'
import SystemExceptionTypePanel from './panels/SystemExceptionTypePanel.vue'
import SystemModelLogPanel from './panels/SystemModelLogPanel.vue'
import SystemOperationLogPanel from './panels/SystemOperationLogPanel.vue'
import SystemPromptPanel from './panels/SystemPromptPanel.vue'
import SystemRiskLevelPanel from './panels/SystemRiskLevelPanel.vue'
import SystemRulePanel from './panels/SystemRulePanel.vue'

const route = useRoute()
const router = useRouter()

const navItems = [
  { key: 'device', label: '设备管理', desc: '设备主数据与启停状态', component: SystemDevicePanel },
  { key: 'rule', label: '规则配置', desc: '考勤规则与阈值管理', component: SystemRulePanel },
  { key: 'prompt', label: '提示词模板', desc: '契约已预留，等待后端补齐', component: SystemPromptPanel },
  { key: 'risk-level', label: '风险等级', desc: '风险名称、说明与状态', component: SystemRiskLevelPanel },
  { key: 'exception-type', label: '异常类型', desc: '异常枚举说明与状态', component: SystemExceptionTypePanel },
  { key: 'model-log', label: '模型日志', desc: '契约已预留，等待后端补齐', component: SystemModelLogPanel },
  { key: 'operation-log', label: '操作日志', desc: '用户操作审计查询', component: SystemOperationLogPanel },
]

const validKeys = navItems.map((item) => item.key)

const activeTab = computed(() => {
  const tab = typeof route.query.tab === 'string' ? route.query.tab : ''
  return validKeys.includes(tab) ? tab : 'device'
})

const activeItem = computed(() => {
  return navItems.find((item) => item.key === activeTab.value) || navItems[0]
})

watch(
  () => route.query.tab,
  (tab) => {
    if (typeof tab === 'string' && tab && !validKeys.includes(tab)) {
      router.replace({
        path: route.path,
        query: {
          ...route.query,
          tab: 'device',
        },
      })
    }
  },
  {
    immediate: true,
  },
)

function handleTabChange(tab) {
  if (tab === activeTab.value) {
    return
  }

  router.replace({
    path: route.path,
    query: {
      ...route.query,
      tab,
    },
  })
}
</script>

<style scoped>
.system-view {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.system-view__hero {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  padding: 28px;
  border-radius: 28px;
  background: linear-gradient(145deg, #ffffff 0%, #eff6ff 55%, #eef2ff 100%);
  box-shadow: 0 24px 80px rgba(15, 23, 42, 0.08);
}

.system-view__eyebrow {
  margin: 0 0 10px;
  color: #4f46e5;
  font-size: 13px;
  font-weight: 600;
}

.system-view h1 {
  margin: 0;
  font-size: 30px;
  color: #0f172a;
}

.system-view__desc {
  max-width: 760px;
  margin: 14px 0 0;
  line-height: 1.8;
  color: #475569;
}

.system-view__meta {
  min-width: 220px;
  padding: 18px 20px;
  border-radius: 20px;
  background: rgba(79, 70, 229, 0.08);
}

.system-view__meta span {
  display: block;
  margin-bottom: 8px;
  font-size: 12px;
  color: #64748b;
}

.system-view__meta strong {
  font-size: 18px;
  color: #0f172a;
}

.system-view__tabs {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}

.system-view__tab {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  padding: 16px;
  border: 1px solid rgba(148, 163, 184, 0.24);
  border-radius: 18px;
  background: #ffffff;
  color: #0f172a;
  cursor: pointer;
  transition: 0.2s ease;
}

.system-view__tab:hover {
  border-color: rgba(79, 70, 229, 0.28);
  transform: translateY(-1px);
}

.system-view__tab--active {
  border-color: transparent;
  background: linear-gradient(135deg, #4338ca 0%, #6366f1 100%);
  color: #ffffff;
  box-shadow: 0 18px 40px rgba(79, 70, 229, 0.24);
}

.system-view__tab span {
  font-size: 15px;
  font-weight: 700;
}

.system-view__tab small {
  font-size: 12px;
  opacity: 0.78;
  text-align: left;
}

.system-view__panel {
  min-height: 420px;
}

@media (max-width: 960px) {
  .system-view__hero {
    flex-direction: column;
  }

  .system-view__meta {
    min-width: 0;
  }
}
</style>
