<template>
  <section class="dashboard-page">
    <ConsoleHero
      eyebrow="工作台"
      title="概览工作台"
      :description="isAdmin ? '面向管理员展示统计概览、预警摘要和风险画像。' : '面向员工展示个人统计概览和智能摘要。'"
      theme="indigo"
      :cards="heroCards"
    >
      <template #actions>
        <div class="dashboard-page__actions">
          <el-tag effect="dark" class="dashboard-page__role-tag">{{ roleLabel }}</el-tag>
          <el-button type="primary" plain @click="loadDashboard">刷新</el-button>
        </div>
      </template>
    </ConsoleHero>

    <el-alert
      v-if="errorMessage"
      :title="errorMessage"
      type="error"
      show-icon
      class="dashboard-page__alert"
    />

    <el-skeleton v-else-if="loading" :rows="6" animated />

    <template v-else>
      <section class="dashboard-spotlight">
        <div class="dashboard-spotlight__lead">
          <p class="dashboard-spotlight__eyebrow">{{ isAdmin ? '今日处理重点' : '今日自助入口' }}</p>
          <h3>{{ isAdmin ? '先看预警，再进异常与复核链路' : '先打卡，再检查个人记录与异常状态' }}</h3>
          <p>
            {{ isAdmin ? '当前首页会优先展示统计、预警和风险信息，适合管理员快速进入当天重点处置任务。' : '员工侧保持最短操作链路，进入系统后可直接完成打卡、查看记录并发起补卡。' }}
          </p>
        </div>

        <ConsoleOverviewCards :items="spotlightCards" />
      </section>

      <section data-testid="dashboard-overview" class="dashboard-section">
        <div class="dashboard-section__head">
          <h3>{{ isAdmin ? '统计概览' : '个人概览' }}</h3>
          <span>{{ authStore.realName || '当前用户' }}</span>
        </div>

        <div class="dashboard-metric-grid">
          <el-card v-for="item in overviewCards" :key="item.key" shadow="hover" class="dashboard-metric-card">
            <p class="dashboard-metric-card__label">{{ item.label }}</p>
            <strong class="dashboard-metric-card__value">{{ item.value }}</strong>
          </el-card>
        </div>
      </section>

      <section data-testid="dashboard-summary" class="dashboard-section dashboard-summary-card">
        <div class="dashboard-section__head">
          <h3>智能统计摘要</h3>
          <span>智能解读</span>
        </div>

        <div class="dashboard-summary-card__content">
          <p>{{ summaryData.summary || '暂无统计摘要' }}</p>
          <p><strong>重点风险：</strong>{{ summaryData.highlightRisks || '暂无重点风险' }}</p>
          <p><strong>管理建议：</strong>{{ summaryData.manageSuggestion || '暂无管理建议' }}</p>
        </div>
      </section>

      <section
        v-if="isAdmin"
        data-testid="dashboard-warning"
        class="dashboard-section"
      >
        <div class="dashboard-section__head">
          <h3>预警摘要</h3>
          <span>最近 5 条</span>
        </div>

        <div v-if="warningItems.length" class="dashboard-list">
          <el-card v-for="item in warningItems" :key="item.id || item.exceptionId || item.aiSummary" class="dashboard-list__item">
            <div class="dashboard-list__title">
              <strong>{{ item.level || '未分级' }}</strong>
              <span>#{{ item.id || item.exceptionId || '--' }}</span>
            </div>
            <p>{{ item.aiSummary || item.disposeSuggestion || '暂无预警摘要' }}</p>
          </el-card>
        </div>
        <el-empty v-else description="暂无预警摘要" />
      </section>

      <section
        v-if="isAdmin"
        data-testid="dashboard-risk"
        class="dashboard-section"
      >
        <div class="dashboard-section__head">
          <h3>部门风险画像</h3>
          <span>风险简报</span>
        </div>

        <div v-if="riskItems.length" class="dashboard-list dashboard-list--risk">
          <el-card v-for="item in riskItems" :key="item.deptId || item.deptName" class="dashboard-list__item">
            <div class="dashboard-list__title">
              <strong>{{ item.deptName || '未知部门' }}</strong>
              <span>{{ item.riskScore ?? '--' }}</span>
            </div>
            <p>{{ item.riskSummary || item.manageSuggestion || '暂无风险摘要' }}</p>
          </el-card>
        </div>
        <el-empty v-else description="暂无风险画像" />
      </section>
    </template>
  </section>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'

import ConsoleHero from '../../components/console/ConsoleHero.vue'
import ConsoleOverviewCards from '../../components/console/ConsoleOverviewCards.vue'
import {
  fetchDepartmentRiskBrief,
  fetchDepartmentStatistics,
  fetchPersonalStatistics,
  fetchStatisticsSummary,
} from '../../api/statistics'
import { fetchWarningList } from '../../api/warning'
import { useAuthStore } from '../../store/auth'

const authStore = useAuthStore()

const isAdmin = computed(() => authStore.roleCode === 'ADMIN')
const roleLabel = computed(() => (isAdmin.value ? '管理员' : '员工'))
const loading = ref(true)
const errorMessage = ref('')
const overviewCards = ref([])
const warningItems = ref([])
const riskItems = ref([])
const summaryData = ref({
  summary: '',
  highlightRisks: '',
  manageSuggestion: '',
})
const heroCards = computed(() => [
  {
    key: 'role',
    label: '当前角色',
    value: roleLabel.value,
  },
    {
      key: 'workspace',
      label: '功能区域',
      value: isAdmin.value ? '风险处置工作台' : '员工自助工作台',
    },
])
const spotlightCards = computed(() => {
  if (isAdmin.value) {
    return [
      {
        label: '预警摘要',
        value: `${warningItems.value.length} 条`,
        desc: '首页仅保留最近 5 条高关注记录',
      },
      {
        label: '风险画像',
        value: `${riskItems.value.length} 个`,
        desc: '快速识别部门风险热区与管理建议',
      },
      {
        label: '智能摘要',
        value: summaryData.value.summary ? '已生成' : '待生成',
        desc: '汇总趋势、重点风险与处置建议',
      },
    ]
  }

  return [
    {
        label: '登录身份',
        value: authStore.realName || '当前用户',
        desc: '默认会跳转到员工侧打卡工作区',
      },
    {
      label: '个人摘要',
      value: overviewCards.value.length ? '已同步' : '待同步',
      desc: '用于查看个人近期出勤、异常与缺勤情况',
    },
      {
        label: '智能解读',
        value: summaryData.value.summary ? '已生成' : '待生成',
        desc: '给出近期考勤趋势和注意事项',
      },
  ]
})

const METRIC_LABELS = {
  attendanceCount: '出勤次数',
  normalCount: '正常次数',
  exceptionCount: '异常次数',
  attendanceRate: '出勤率',
  exceptionRate: '异常率',
  lateCount: '迟到次数',
  absentCount: '缺勤次数',
}

function formatMetricValue(key, value) {
  if (typeof value === 'number' && key.toLowerCase().includes('rate')) {
    return `${Math.round(value * 100)}%`
  }

  return value
}

function buildMetricCards(payload = {}, limit = 4) {
  return Object.entries(payload)
    .filter(([, value]) => ['string', 'number'].includes(typeof value))
    .filter(([key]) => !['userId', 'deptId', 'deptName'].includes(key))
    .slice(0, limit)
    .map(([key, value]) => ({
      key,
      label: METRIC_LABELS[key] || key,
      value: formatMetricValue(key, value),
    }))
}

function normalizeList(payload, limit) {
  const source = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.records)
      ? payload.records
      : Array.isArray(payload?.items)
        ? payload.items
        : []

  return source.slice(0, limit)
}

async function loadDashboard() {
  loading.value = true
  errorMessage.value = ''

  try {
    if (isAdmin.value) {
      const [departmentData, summary, risks] = await Promise.all([
        fetchDepartmentStatistics(),
        fetchStatisticsSummary(),
        fetchDepartmentRiskBrief(),
      ])
      const warnings = await fetchWarningList({ pageNum: 1, pageSize: 5 }).catch(() => [])

      overviewCards.value = buildMetricCards(departmentData)
      summaryData.value = summary || {}
      warningItems.value = normalizeList(warnings, 5)
      riskItems.value = normalizeList(risks, 3)
      return
    }

    const [personalData, summary] = await Promise.all([
      fetchPersonalStatistics(),
      fetchStatisticsSummary(),
    ])

    overviewCards.value = buildMetricCards(personalData)
    summaryData.value = summary || {}
    warningItems.value = []
    riskItems.value = []
  } catch (error) {
    errorMessage.value = error?.message || '页面加载失败，请稍后重试'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadDashboard()
})
</script>

<style scoped>
.dashboard-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.dashboard-page__actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.dashboard-page__role-tag {
  border: none;
  background: rgba(15, 23, 42, 0.24);
}

.dashboard-page__alert {
  margin-bottom: 4px;
}

.dashboard-section {
  padding: 24px;
  border-radius: 24px;
  background: #ffffff;
  box-shadow: 0 18px 50px rgba(15, 23, 42, 0.08);
}

.dashboard-spotlight {
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(320px, 0.85fr);
  gap: 18px;
}

.dashboard-spotlight__lead,
.dashboard-spotlight__cards {
  padding: 24px;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.82);
  box-shadow: 0 18px 50px rgba(15, 23, 42, 0.08);
  backdrop-filter: blur(12px);
}

.dashboard-spotlight__eyebrow {
  margin: 0 0 10px;
  font-size: 12px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #4f46e5;
}

.dashboard-spotlight__lead h3 {
  margin: 0;
  font-size: clamp(24px, 4vw, 32px);
  line-height: 1.1;
  color: #0f172a;
}

.dashboard-spotlight__lead p:last-child {
  margin: 14px 0 0;
  line-height: 1.8;
  color: #475569;
}

.dashboard-section__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}

.dashboard-section__head h3 {
  margin: 0;
  font-size: 18px;
  color: #0f172a;
}

.dashboard-section__head span {
  font-size: 13px;
  color: #64748b;
}

.dashboard-metric-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 16px;
}

.dashboard-metric-card {
  border: 1px solid rgba(99, 102, 241, 0.08);
}

.dashboard-metric-card__label {
  margin: 0 0 10px;
  font-size: 13px;
  color: #64748b;
}

.dashboard-metric-card__value {
  font-size: 28px;
  color: #0f172a;
}

.dashboard-summary-card__content {
  display: grid;
  gap: 12px;
  line-height: 1.7;
  color: #334155;
}

.dashboard-summary-card {
  background: linear-gradient(135deg, #fff 0%, #f8fbff 100%);
}

.dashboard-summary-card__content p {
  margin: 0;
}

.dashboard-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 16px;
}

.dashboard-list__item {
  border: 1px solid rgba(15, 23, 42, 0.06);
}

.dashboard-list__title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.dashboard-list__item p {
  margin: 0;
  line-height: 1.7;
  color: #475569;
}

@media (max-width: 960px) {
  .dashboard-spotlight {
    grid-template-columns: 1fr;
  }

  .dashboard-page__actions {
    width: 100%;
    justify-content: flex-start;
    flex-wrap: wrap;
  }
}
</style>
