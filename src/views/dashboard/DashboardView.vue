<template>
  <section class="dashboard-page">
    <ConsoleHero
      eyebrow="工作台"
      title="概览工作台"
      :description="isAdmin ? '用于查看运行概况、重点预警和待处理事项。' : '用于查看个人考勤概况、当日提醒和常用入口。'"
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
          <p class="dashboard-spotlight__eyebrow">{{ isAdmin ? '今日重点' : '今日事项' }}</p>
          <h3>{{ isAdmin ? '优先处理预警与待办复核事项' : '先完成打卡，再核对个人记录' }}</h3>
          <p>
            {{ isAdmin ? '首页优先展示整体指标、预警概况和风险概况，便于管理人员快速进入当天重点处置任务。' : '员工侧保留常用业务入口，进入系统后可直接完成打卡、查看记录并处理个人异常。' }}
          </p>
        </div>

        <ConsoleOverviewCards :items="spotlightCards" />
      </section>

      <section data-testid="dashboard-overview" class="dashboard-section">
        <div class="dashboard-section__head">
          <h3>{{ isAdmin ? '统计概览' : '个人概览' }}</h3>
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
          <h3>综合摘要</h3>
          <span>系统汇总</span>
        </div>

        <div class="dashboard-summary-card__content">
          <p>{{ summaryData.summary || '暂无概述信息' }}</p>
          <p><strong>重点关注：</strong>{{ summaryData.highlightRisks || '暂无重点关注内容' }}</p>
          <p><strong>处理建议：</strong>{{ summaryData.manageSuggestion || '暂无处理建议' }}</p>
        </div>
      </section>

      <section
        v-if="isAdmin"
        data-testid="dashboard-warning"
        class="dashboard-section"
      >
        <div class="dashboard-section__head">
          <h3>预警概况</h3>
          <span>最近 5 条记录</span>
        </div>

        <div v-if="warningItems.length" class="dashboard-list">
          <el-card v-for="item in warningItems" :key="item.id || item.exceptionId || item.aiSummary" class="dashboard-list__item">
            <div class="dashboard-list__title">
              <strong>{{ item.level || '未分级' }}</strong>
              <span>编号 {{ item.id || item.exceptionId || '--' }}</span>
            </div>
            <p>{{ item.aiSummary || item.disposeSuggestion || '暂无摘要说明' }}</p>
          </el-card>
        </div>
        <el-empty v-else description="暂无摘要说明" />
      </section>

      <section
        v-if="isAdmin"
        data-testid="dashboard-risk"
        class="dashboard-section"
      >
        <div class="dashboard-section__head">
          <h3>部门风险概况</h3>
          <span>风险简报</span>
        </div>

        <div v-if="riskItems.length" class="dashboard-list dashboard-list--risk">
          <el-card v-for="item in riskItems" :key="item.deptId || item.deptName" class="dashboard-list__item">
            <div class="dashboard-list__title">
              <strong>{{ item.deptName || '未知部门' }}</strong>
              <span>{{ item.riskScore ?? '--' }}</span>
            </div>
            <p>{{ item.riskSummary || item.manageSuggestion || '暂无情况说明' }}</p>
          </el-card>
        </div>
        <el-empty v-else description="暂无风险概况" />
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
    label: '当前身份',
    value: roleLabel.value,
  },
  {
    key: 'workspace',
    label: '工作场景',
    value: isAdmin.value ? '管理处置工作区' : '员工业务工作区',
  },
])
const spotlightCards = computed(() => {
  if (isAdmin.value) {
    return [
      {
        label: '预警概况',
        value: `${warningItems.value.length} 条`,
        desc: '首页仅保留最近 5 条需要关注的记录',
      },
      {
        label: '风险概况',
        value: `${riskItems.value.length} 个`,
        desc: '用于快速识别重点部门和管理建议',
      },
      {
        label: '综合摘要',
        value: summaryData.value.summary ? '已生成' : '待生成',
        desc: '汇总趋势变化、重点关注和处理建议',
      },
    ]
  }

  return [
    {
      label: '当前账号',
      value: authStore.realName || '当前用户',
      desc: '登录后默认进入个人业务页面',
    },
    {
      label: '个人概况',
      value: overviewCards.value.length ? '已同步' : '待同步',
      desc: '用于查看近期出勤、异常和缺勤情况',
    },
    {
      label: '综合摘要',
      value: summaryData.value.summary ? '已生成' : '待生成',
      desc: '给出近期考勤变化和注意事项',
    },
  ]
})

const METRIC_LABELS = {
  realName: '姓名',
  recordCount: '记录总数',
  attendanceCount: '出勤次数',
  normalCount: '正常次数',
  exceptionCount: '异常次数',
  analysisCount: '分析次数',
  warningCount: '预警次数',
  reviewCount: '复核次数',
  closedLoopCount: '闭环次数',
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
    .filter(([key]) => !['userId', 'deptId', 'deptName', 'realName'].includes(key))
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
