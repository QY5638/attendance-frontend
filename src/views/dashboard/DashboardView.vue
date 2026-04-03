<template>
  <section class="dashboard-page">
    <header class="dashboard-page__header">
      <div>
        <p class="dashboard-page__eyebrow">FE-02 概览与统计模块</p>
        <h2 class="dashboard-page__title">概览工作台</h2>
        <p class="dashboard-page__desc">
          {{ isAdmin ? '面向管理员的统计概览、预警摘要与风险画像。' : '面向员工的个人统计概览与 AI 摘要。' }}
        </p>
      </div>

      <div class="dashboard-page__actions">
        <el-tag type="info">{{ authStore.roleCode || 'UNKNOWN' }}</el-tag>
        <el-button type="primary" plain @click="loadDashboard">刷新</el-button>
      </div>
    </header>

    <el-alert
      v-if="errorMessage"
      :title="errorMessage"
      type="error"
      show-icon
      class="dashboard-page__alert"
    />

    <el-skeleton v-else-if="loading" :rows="6" animated />

    <template v-else>
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
          <h3>AI 统计摘要</h3>
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

.dashboard-page__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 24px;
  border-radius: 24px;
  background: linear-gradient(135deg, #111827 0%, #1d4ed8 100%);
  color: #f8fafc;
}

.dashboard-page__eyebrow {
  margin: 0 0 8px;
  font-size: 13px;
  color: rgba(226, 232, 240, 0.82);
}

.dashboard-page__title {
  margin: 0;
  font-size: 30px;
}

.dashboard-page__desc {
  margin: 10px 0 0;
  max-width: 640px;
  line-height: 1.7;
  color: rgba(226, 232, 240, 0.9);
}

.dashboard-page__actions {
  display: flex;
  align-items: center;
  gap: 12px;
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
  .dashboard-page__header {
    flex-direction: column;
  }

  .dashboard-page__actions {
    width: 100%;
    justify-content: flex-start;
    flex-wrap: wrap;
  }
}
</style>
