<template>
  <section class="statistics-page">
    <ConsoleHero
      eyebrow="统计分析"
      title="统计分析"
      description="聚焦部门统计、异常趋势、智能解读和报表导出。"
      theme="sky"
      :cards="heroCards"
    >
      <template #actions>
        <div class="statistics-page__actions">
          <el-button plain @click="loadStatistics">刷新</el-button>
          <el-button
            type="primary"
            :loading="exporting"
            data-testid="statistics-export-button"
            @click="handleExport"
          >
            导出报表
          </el-button>
        </div>
      </template>
    </ConsoleHero>

    <el-alert
      v-if="errorMessage"
      :title="errorMessage"
      type="error"
      show-icon
    />

    <el-skeleton v-else-if="loading" :rows="8" animated />

    <template v-else>
      <section class="statistics-spotlight">
        <div class="statistics-spotlight__lead">
          <p class="statistics-spotlight__eyebrow">分析概览</p>
          <h3>先看总体指标，再结合趋势与风险画像判断当天重点</h3>
          <p>统计页用于承接管理者的汇总分析、风险判断和报表导出，和首页工作台保持同一套解读逻辑。</p>
        </div>

        <ConsoleOverviewCards :items="spotlightCards" accent="#0f766e" />
      </section>

      <section data-testid="statistics-overview" class="statistics-section">
        <div class="statistics-section__head">
          <h3>部门统计总览</h3>
          <span>当前部门</span>
        </div>

        <div class="statistics-metric-grid">
          <el-card v-for="item in overviewCards" :key="item.key" class="statistics-metric-card" shadow="hover">
            <p class="statistics-metric-card__label">{{ item.label }}</p>
            <strong class="statistics-metric-card__value">{{ item.value }}</strong>
          </el-card>
        </div>
      </section>

      <section data-testid="statistics-trend" class="statistics-section">
        <div class="statistics-section__head">
          <h3>异常趋势</h3>
          <span>近阶段趋势</span>
        </div>

        <div v-if="trendPoints.length" class="statistics-trend-grid">
          <div v-for="item in trendPoints" :key="item.label" class="statistics-trend-bar">
            <div class="statistics-trend-bar__track">
              <div class="statistics-trend-bar__value" :style="{ height: getBarHeight(item.value) }"></div>
            </div>
            <strong>{{ item.value }}</strong>
            <span>{{ item.label }}</span>
          </div>
        </div>
        <el-empty v-else description="暂无趋势数据" />
      </section>

      <section data-testid="statistics-summary" class="statistics-section statistics-summary-card">
        <div class="statistics-section__head">
          <h3>智能统计解读</h3>
          <span>趋势摘要</span>
        </div>

        <div class="statistics-summary-card__content">
          <p>{{ summaryData.summary || '暂无统计摘要' }}</p>
          <p><strong>重点风险：</strong>{{ summaryData.highlightRisks || '暂无重点风险' }}</p>
          <p><strong>管理建议：</strong>{{ summaryData.manageSuggestion || '暂无管理建议' }}</p>
        </div>
      </section>

      <section data-testid="statistics-risk" class="statistics-section">
        <div class="statistics-section__head">
          <h3>部门风险画像</h3>
          <span>风险简报</span>
        </div>

        <div v-if="riskItems.length" class="statistics-risk-grid">
          <el-card v-for="item in riskItems" :key="item.deptId || item.deptName" class="statistics-risk-card">
            <div class="statistics-risk-card__head">
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
import { ElMessage } from 'element-plus/es/components/message/index.mjs'
import { computed, onMounted, ref } from 'vue'

import ConsoleHero from '../../components/console/ConsoleHero.vue'
import ConsoleOverviewCards from '../../components/console/ConsoleOverviewCards.vue'
import {
  exportStatisticsReport,
  fetchDepartmentRiskBrief,
  fetchDepartmentStatistics,
  fetchExceptionTrend,
  fetchStatisticsSummary,
} from '../../api/statistics'

const loading = ref(true)
const exporting = ref(false)
const errorMessage = ref('')
const overviewCards = ref([])
const trendPoints = ref([])
const riskItems = ref([])
const summaryData = ref({
  summary: '',
  highlightRisks: '',
  manageSuggestion: '',
})
const heroCards = computed(() => [
  {
    key: 'dimension',
    label: '分析维度',
    value: '总览 / 趋势 / 风险',
  },
  {
    key: 'export',
    label: '导出能力',
    value: exporting.value ? '导出中' : '可导出',
  },
])
const spotlightCards = computed(() => [
  {
    key: 'overview',
    label: '总览指标',
    value: `${overviewCards.value.length} 项`,
    desc: '覆盖出勤、异常、比例等关键管理指标',
  },
  {
    key: 'trend',
    label: '趋势样本',
    value: `${trendPoints.value.length} 组`,
    desc: '用于观察异常变化和周期性波动',
  },
  {
    key: 'risk',
    label: '风险画像',
    value: `${riskItems.value.length} 个`,
    desc: '聚焦部门风险热区和管理建议',
  },
])

const METRIC_LABELS = {
  attendanceCount: '出勤次数',
  normalCount: '正常次数',
  exceptionCount: '异常次数',
  attendanceRate: '出勤率',
  exceptionRate: '异常率',
  lateCount: '迟到次数',
  absentCount: '缺勤次数',
}

const maxTrendValue = computed(() => {
  return Math.max(...trendPoints.value.map((item) => item.value), 1)
})

function formatMetricValue(key, value) {
  if (typeof value === 'number' && key.toLowerCase().includes('rate')) {
    return `${Math.round(value * 100)}%`
  }

  return value
}

function buildMetricCards(payload = {}, limit = 6) {
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

function buildOverviewCards(payload = {}) {
  const cards = buildMetricCards(payload)
  const distribution = payload?.exceptionTypeDistribution

  if (!distribution || typeof distribution !== 'object') {
    return cards
  }

  const multiLocationConflictCount = Number(distribution.MULTI_LOCATION_CONFLICT ?? 0)
  cards.push({
    key: 'multiLocationConflictCount',
    label: '多地点异常',
    value: Number.isFinite(multiLocationConflictCount) ? multiLocationConflictCount : 0,
  })

  return cards
}

function normalizeTrendPoints(payload) {
  const source = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.items)
      ? payload.items
      : Array.isArray(payload?.records)
        ? payload.records
        : []

  return source.map((item, index) => {
    const label = item.label || item.date || item.period || item.name || `第${index + 1}项`
    const rawValue = Number(item.value ?? item.count ?? item.total ?? item.exceptionCount ?? 0)

    return {
      label: String(label),
      value: Number.isFinite(rawValue) ? rawValue : 0,
    }
  })
}

function normalizeList(payload) {
  if (Array.isArray(payload)) {
    return payload
  }

  if (Array.isArray(payload?.items)) {
    return payload.items
  }

  if (Array.isArray(payload?.records)) {
    return payload.records
  }

  return []
}

function getBarHeight(value) {
  return `${Math.max((value / maxTrendValue.value) * 100, 8)}%`
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

async function loadStatistics() {
  loading.value = true
  errorMessage.value = ''

  try {
    const [departmentData, trendData, summary, risks] = await Promise.all([
      fetchDepartmentStatistics(),
      fetchExceptionTrend(),
      fetchStatisticsSummary(),
      fetchDepartmentRiskBrief(),
    ])

    overviewCards.value = buildOverviewCards(departmentData)
    trendPoints.value = normalizeTrendPoints(trendData)
    summaryData.value = summary || {}
    riskItems.value = normalizeList(risks)
  } catch (error) {
    errorMessage.value = error?.message || '页面加载失败，请稍后重试'
  } finally {
    loading.value = false
  }
}

async function handleExport() {
  exporting.value = true

  try {
    const { blob, filename } = await exportStatisticsReport()
    downloadBlob(blob, filename)
    ElMessage.success('报表导出已触发')
  } catch (error) {
    ElMessage.error(error?.message || '报表导出失败，请稍后重试')
  } finally {
    exporting.value = false
  }
}

onMounted(() => {
  loadStatistics()
})
</script>

<style scoped>
.statistics-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.statistics-page__actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.statistics-section {
  padding: 24px;
  border-radius: 24px;
  background: #ffffff;
  box-shadow: 0 18px 50px rgba(15, 23, 42, 0.08);
}

.statistics-spotlight {
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(320px, 0.85fr);
  gap: 18px;
}

.statistics-spotlight__lead,
.statistics-spotlight__cards {
  padding: 24px;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.88);
  box-shadow: 0 18px 50px rgba(15, 23, 42, 0.08);
}

.statistics-spotlight__eyebrow {
  margin: 0 0 10px;
  font-size: 12px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #0f766e;
}

.statistics-spotlight__lead h3 {
  margin: 0;
  font-size: clamp(24px, 4vw, 32px);
  line-height: 1.1;
  color: #0f172a;
}

.statistics-spotlight__lead p:last-child {
  margin: 14px 0 0;
  line-height: 1.8;
  color: #475569;
}

.statistics-section__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}

.statistics-section__head h3 {
  margin: 0;
  font-size: 18px;
  color: #0f172a;
}

.statistics-section__head span {
  font-size: 13px;
  color: #64748b;
}

.statistics-metric-grid,
.statistics-risk-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 16px;
}

.statistics-metric-card__label {
  margin: 0 0 10px;
  font-size: 13px;
  color: #64748b;
}

.statistics-metric-card__value {
  font-size: 28px;
  color: #0f172a;
}

.statistics-trend-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(96px, 1fr));
  gap: 16px;
  align-items: end;
}

.statistics-trend-bar {
  display: grid;
  justify-items: center;
  gap: 10px;
}

.statistics-trend-bar__track {
  display: flex;
  align-items: flex-end;
  width: 100%;
  max-width: 72px;
  height: 180px;
  padding: 8px;
  border-radius: 18px;
  background: linear-gradient(180deg, #e2e8f0 0%, #f8fafc 100%);
}

.statistics-trend-bar__value {
  width: 100%;
  border-radius: 12px;
  background: linear-gradient(180deg, #14b8a6 0%, #0f766e 100%);
}

.statistics-trend-bar strong {
  color: #0f172a;
}

.statistics-trend-bar span {
  font-size: 13px;
  color: #64748b;
}

.statistics-summary-card__content {
  display: grid;
  gap: 12px;
  line-height: 1.7;
  color: #334155;
}

.statistics-summary-card__content p,
.statistics-risk-card p {
  margin: 0;
}

.statistics-risk-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.statistics-risk-card__head strong {
  color: #0f172a;
}

.statistics-risk-card__head span {
  color: #0f766e;
  font-weight: 700;
}

.statistics-risk-card p {
  line-height: 1.7;
  color: #475569;
}

@media (max-width: 960px) {
  .statistics-spotlight {
    grid-template-columns: 1fr;
  }

  .statistics-page__actions {
    width: 100%;
    justify-content: flex-start;
    flex-wrap: wrap;
  }
}
</style>
