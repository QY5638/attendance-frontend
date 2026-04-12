<template>
  <section class="system-view">
    <ConsoleHero
      title="系统配置"
      description="统一维护基础配置、分析方案和运行记录，便于集中核查系统状态。"
      theme="violet"
      :cards="heroCards"
    />

    <ConsoleOverviewCards :items="overviewItems" />

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
import { computed, defineAsyncComponent, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import ConsoleHero from '../../components/console/ConsoleHero.vue'
import ConsoleOverviewCards from '../../components/console/ConsoleOverviewCards.vue'

const SystemDevicePanel = defineAsyncComponent(() => import('./panels/SystemDevicePanel.vue'))
const SystemRulePanel = defineAsyncComponent(() => import('./panels/SystemRulePanel.vue'))
const SystemPromptPanel = defineAsyncComponent(() => import('./panels/SystemPromptPanel.vue'))
const SystemRiskLevelPanel = defineAsyncComponent(() => import('./panels/SystemRiskLevelPanel.vue'))
const SystemExceptionTypePanel = defineAsyncComponent(() => import('./panels/SystemExceptionTypePanel.vue'))
const SystemFaceRegisterApprovalPanel = defineAsyncComponent(() => import('./panels/SystemFaceRegisterApprovalPanel.vue'))
const SystemModelLogPanel = defineAsyncComponent(() => import('./panels/SystemModelLogPanel.vue'))
const SystemOperationLogPanel = defineAsyncComponent(() => import('./panels/SystemOperationLogPanel.vue'))

const route = useRoute()
const router = useRouter()

const navItems = [
  { key: 'device', label: '打卡地点管理', desc: '地点档案与启停状态', component: SystemDevicePanel },
  { key: 'rule', label: '规则配置', desc: '考勤规则与阈值管理', component: SystemRulePanel },
  { key: 'prompt', label: '分析方案', desc: '方案维护、编辑与启停管理', component: SystemPromptPanel },
  { key: 'risk-level', label: '风险等级', desc: '风险名称、说明与状态', component: SystemRiskLevelPanel },
  { key: 'exception-type', label: '异常类型', desc: '异常类别说明与状态', component: SystemExceptionTypePanel },
  { key: 'face-approval', label: '人脸申请', desc: '员工重录申请与审批处理', component: SystemFaceRegisterApprovalPanel },
  { key: 'model-log', label: '处理记录', desc: '查看分析过程、结果与耗时', component: SystemModelLogPanel },
  { key: 'operation-log', label: '业务记录', desc: '关键业务操作记录查询', component: SystemOperationLogPanel },
]

const validKeys = navItems.map((item) => item.key)

const activeTab = computed(() => {
  const tab = typeof route.query.tab === 'string' ? route.query.tab : ''
  return validKeys.includes(tab) ? tab : 'device'
})

const activeItem = computed(() => {
  return navItems.find((item) => item.key === activeTab.value) || navItems[0]
})

const heroCards = computed(() => [
  {
    key: 'current',
    label: '当前分类',
    value: activeItem.value.label,
  },
  {
    key: 'scope',
    label: '配置范围',
    value: `${navItems.length} 个配置域`,
  },
])

const overviewItems = computed(() => [
  {
    key: 'current',
    label: '当前子页',
    value: activeItem.value.label,
    desc: activeItem.value.desc,
  },
  {
    key: 'scope',
    label: '配置范围',
    value: '7 个配置域',
    desc: '覆盖打卡地点、规则、方案、风险分级、分析记录与业务日志。',
  },
  {
    key: 'suggestion',
    label: '使用建议',
    value: '先配置后核查',
    desc: '建议先完成基础配置，再结合分析记录和业务日志进行核查。',
  },
])

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
