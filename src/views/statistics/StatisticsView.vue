<template>
  <section class="statistics-page">
    <ConsoleHero
      title="统计分析"
      description="集中查看部门指标、趋势变化、风险概况和报表导出。"
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
          <h3>先看总体指标，再结合趋势变化判断当日重点</h3>
          <p>统计页用于承接管理层的汇总分析、风险研判和报表输出，并与首页工作台保持一致的信息结构。</p>
        </div>

        <div class="statistics-spotlight__cards">
          <ConsoleOverviewCards :items="spotlightCards" accent="#0f766e" />
        </div>
      </section>

      <section data-testid="statistics-overview" class="statistics-section">
        <div class="statistics-section__head">
          <h3>部门统计总览</h3>
          <span>核心指标</span>
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

        <div v-if="trendChartPoints.length" class="statistics-trend-chart">
          <div class="statistics-trend-chart__canvas" @mouseleave="handleTrendLeave">
            <svg class="statistics-trend-chart__svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
              <defs>
                <linearGradient id="statisticsTrendArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="#14b8a6" stop-opacity="0.32" />
                  <stop offset="100%" stop-color="#14b8a6" stop-opacity="0.03" />
                </linearGradient>
              </defs>
              <line
                v-for="line in trendGridLines"
                :key="line"
                class="statistics-trend-chart__grid-line"
                x1="8"
                x2="92"
                :y1="line"
                :y2="line"
              />
              <path :d="trendAreaPath" class="statistics-trend-chart__area" />
              <path :d="trendLinePath" class="statistics-trend-chart__line" />
            </svg>

            <button
              v-for="(item, index) in trendChartPoints"
              :key="item.label"
              type="button"
              class="statistics-trend-chart__point"
              :class="{ 'statistics-trend-chart__point--active': activeTrendIndex === index }"
              :style="{ left: `${item.x}%`, top: `${item.y}%` }"
              @mouseenter="setActiveTrend(index)"
              @focus="setActiveTrend(index)"
            >
              <span class="statistics-trend-chart__point-core"></span>
            </button>

            <div
              v-if="activeTrendPoint"
              class="statistics-trend-chart__tooltip"
              :style="{ left: activeTrendPoint.tooltipLeft }"
            >
              <p class="statistics-trend-chart__tooltip-label">{{ activeTrendPoint.fullLabel }}</p>
              <strong>{{ activeTrendPoint.value }} 起异常</strong>
              <div class="statistics-trend-chart__tooltip-grid">
                <span>记录 {{ activeTrendPoint.recordCount }}</span>
                <span>分析 {{ activeTrendPoint.analysisCount }}</span>
                <span>预警 {{ activeTrendPoint.warningCount }}</span>
                <span>复核 {{ activeTrendPoint.reviewCount }}</span>
                <span>闭环 {{ activeTrendPoint.closedLoopCount }}</span>
              </div>
            </div>
          </div>

          <div class="statistics-trend-chart__axis">
            <button
              v-for="(item, index) in trendChartPoints"
              :key="`${item.label}-${index}`"
              type="button"
              class="statistics-trend-chart__axis-item"
              :class="{ 'statistics-trend-chart__axis-item--active': activeTrendIndex === index }"
              @mouseenter="setActiveTrend(index)"
              @focus="setActiveTrend(index)"
            >
              <span>{{ item.displayLabel }}</span>
              <strong>{{ item.value }}</strong>
            </button>
          </div>
        </div>
        <el-empty v-else description="暂无趋势数据" />
      </section>

      <section data-testid="statistics-summary" class="statistics-section statistics-summary-card">
        <div class="statistics-section__head">
          <h3>分析概述</h3>
          <span>系统汇总</span>
        </div>

        <div class="statistics-summary-card__content">
          <p>{{ summaryData.summary || '暂无概述信息' }}</p>
          <p><strong>重点关注：</strong>{{ summaryData.highlightRisks || '暂无重点关注内容' }}</p>
          <p><strong>处理建议：</strong>{{ summaryData.manageSuggestion || '暂无处理建议' }}</p>
        </div>
      </section>

      <section data-testid="statistics-risk" class="statistics-section">
        <div class="statistics-section__head">
          <h3>部门风险概况</h3>
          <span>全部部门</span>
        </div>

        <div v-if="riskItems.length" class="statistics-risk-grid">
          <el-card v-for="item in riskItems" :key="item.deptId || item.deptName" class="statistics-risk-card">
            <div class="statistics-risk-card__head">
              <strong>{{ item.deptName || '未知部门' }}</strong>
              <span>{{ formatRiskScore(item.riskScore) }}</span>
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
import { ElMessage } from 'element-plus'
import { computed, onMounted, ref } from 'vue'

import ConsoleHero from '../../components/console/ConsoleHero.vue'
import ConsoleOverviewCards from '../../components/console/ConsoleOverviewCards.vue'
import {
  exportStatisticsReport,
  fetchDepartmentRiskOverview,
  fetchDepartmentStatistics,
  fetchExceptionTrend,
  fetchStatisticsSummary,
} from '../../api/statistics'

const loading = ref(true)
const exporting = ref(false)
const errorMessage = ref('')
const DEFAULT_EXPORT_TYPE = 'DEPARTMENT'
const DEFAULT_EXPORT_CSV_FILENAME = '统计报表.csv'
const DEFAULT_EXPORT_XLSX_FILENAME = '部门统计报表.xlsx'
const overviewCards = ref([])
const trendPoints = ref([])
const riskItems = ref([])
const activeTrendIndex = ref(0)
const summaryData = ref({
  summary: '',
  highlightRisks: '',
  manageSuggestion: '',
})
const heroCards = computed(() => [
  {
    key: 'dimension',
    label: '分析视角',
    value: '总览 / 趋势 / 风险',
  },
  {
    key: 'export',
    label: '报表状态',
    value: exporting.value ? '导出中' : '可导出',
  },
])
const spotlightCards = computed(() => [
  {
    key: 'overview',
    label: '总览指标',
    value: `${overviewCards.value.length} 项`,
    desc: '覆盖出勤、异常和比例等关键管理指标',
  },
  {
    key: 'trend',
    label: '趋势样本',
    value: `${trendPoints.value.length} 组`,
    desc: '用于观察异常变化和阶段波动',
  },
  {
    key: 'risk',
    label: '风险概况',
    value: `${riskItems.value.length} 个`,
    desc: '展示全部部门的风险概况和管理建议',
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

const METRIC_PHRASE_LABELS = {
  closed_loop: '闭环',
  high_risk: '高风险',
  medium_risk: '中风险',
  low_risk: '低风险',
}

const METRIC_TOKEN_LABELS = {
  record: '记录',
  attendance: '出勤',
  normal: '正常',
  exception: '异常',
  analysis: '分析',
  warning: '预警',
  review: '复核',
  closed: '闭环',
  loop: '闭环',
  late: '迟到',
  absent: '缺勤',
  dept: '部门',
  department: '部门',
  user: '人员',
  high: '高',
  medium: '中',
  low: '低',
  risk: '风险',
  processed: '已处理',
  unprocessed: '待处理',
}

const maxTrendValue = computed(() => {
  return Math.max(...trendPoints.value.map((item) => item.value), 1)
})

const trendGridLines = [18, 35, 52, 69, 86]

const trendChartPoints = computed(() => {
  if (!trendPoints.value.length) {
    return []
  }

  return trendPoints.value.map((item, index) => {
    const x = trendPoints.value.length === 1 ? 50 : 10 + (index * 80) / (trendPoints.value.length - 1)
    const y = 82 - ((item.value || 0) / maxTrendValue.value) * 54

    return {
      ...item,
      x,
      y,
      tooltipLeft: `${Math.min(Math.max(x, 18), 82)}%`,
    }
  })
})

const trendLinePath = computed(() => {
  if (!trendChartPoints.value.length) {
    return ''
  }

  return trendChartPoints.value
    .map((item, index) => `${index === 0 ? 'M' : 'L'} ${item.x} ${item.y}`)
    .join(' ')
})

const trendAreaPath = computed(() => {
  if (!trendChartPoints.value.length) {
    return ''
  }

  const firstPoint = trendChartPoints.value[0]
  const lastPoint = trendChartPoints.value[trendChartPoints.value.length - 1]
  const linePath = trendChartPoints.value
    .map((item, index) => `${index === 0 ? 'M' : 'L'} ${item.x} ${item.y}`)
    .join(' ')

  return `${linePath} L ${lastPoint.x} 86 L ${firstPoint.x} 86 Z`
})

const activeTrendPoint = computed(() => {
  if (!trendChartPoints.value.length) {
    return null
  }

  return trendChartPoints.value[Math.min(activeTrendIndex.value, trendChartPoints.value.length - 1)]
})

function formatMetricValue(key, value) {
  if (typeof value === 'number' && key.toLowerCase().includes('rate')) {
    return `${Math.round(value * 100)}%`
  }

  return value
}

function splitMetricKey(key) {
  return String(key || '')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((item) => item.toLowerCase())
}

function translateMetricTokens(tokens) {
  if (!tokens.length) {
    return ''
  }

  const phraseLabel = METRIC_PHRASE_LABELS[tokens.join('_')]
  if (phraseLabel) {
    return phraseLabel
  }

  return tokens.map((token) => METRIC_TOKEN_LABELS[token]).filter(Boolean).join('')
}

function resolveMetricLabel(key) {
  if (METRIC_LABELS[key]) {
    return METRIC_LABELS[key]
  }

  const tokens = splitMetricKey(key)
  if (!tokens.length) {
    return key
  }

  const suffix = tokens[tokens.length - 1]
  const baseLabel = translateMetricTokens(tokens.slice(0, -1))

  if (suffix === 'count' && baseLabel) {
    return `${baseLabel}数量`
  }

  if (suffix === 'rate' && baseLabel) {
    return `${baseLabel}率`
  }

  if (suffix === 'total' && baseLabel) {
    return `${baseLabel}总数`
  }

  return translateMetricTokens(tokens) || key
}

function buildMetricCards(payload = {}, limit = 6) {
  return Object.entries(payload)
    .filter(([, value]) => ['string', 'number'].includes(typeof value))
    .filter(([key]) => !['userId', 'deptId', 'deptName'].includes(key))
    .slice(0, limit)
    .map(([key, value]) => ({
      key,
      label: resolveMetricLabel(key),
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

function formatTrendLabel(label) {
  const normalizedLabel = String(label || '').trim()
  const dayMatch = normalizedLabel.match(/^\d{4}-(\d{2})-(\d{2})$/)
  if (dayMatch) {
    return `${dayMatch[1]}-${dayMatch[2]}`
  }

  const monthMatch = normalizedLabel.match(/^\d{4}-(\d{2})$/)
  if (monthMatch) {
    return `${monthMatch[1]}月`
  }

  return normalizedLabel
}

function normalizeTrendPoints(payload) {
  const source = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.points)
      ? payload.points
    : Array.isArray(payload?.items)
      ? payload.items
      : Array.isArray(payload?.records)
        ? payload.records
        : []

  return source.map((item, index) => {
    const label = item.label || item.date || item.period || item.name || `第${index + 1}项`
    const recordCount = Number(item.recordCount ?? 0)
    const exceptionCount = Number(item.exceptionCount ?? item.value ?? item.count ?? item.total ?? 0)
    const analysisCount = Number(item.analysisCount ?? 0)
    const warningCount = Number(item.warningCount ?? 0)
    const reviewCount = Number(item.reviewCount ?? 0)
    const closedLoopCount = Number(item.closedLoopCount ?? 0)
    const rawValue = Number(item.value ?? item.count ?? item.total ?? exceptionCount ?? 0)

    return {
      label: String(label),
      displayLabel: formatTrendLabel(label),
      fullLabel: String(label),
      value: Number.isFinite(rawValue) ? rawValue : 0,
      recordCount: Number.isFinite(recordCount) ? recordCount : 0,
      exceptionCount: Number.isFinite(exceptionCount) ? exceptionCount : 0,
      analysisCount: Number.isFinite(analysisCount) ? analysisCount : 0,
      warningCount: Number.isFinite(warningCount) ? warningCount : 0,
      reviewCount: Number.isFinite(reviewCount) ? reviewCount : 0,
      closedLoopCount: Number.isFinite(closedLoopCount) ? closedLoopCount : 0,
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

function normalizeRiskItems(payload) {
  if (Array.isArray(payload)) {
    return payload
  }

  if (payload && typeof payload === 'object') {
    return [payload]
  }

  return []
}

function setActiveTrend(index) {
  activeTrendIndex.value = index
}

function handleTrendLeave() {
  activeTrendIndex.value = Math.max(trendChartPoints.value.length - 1, 0)
}

function formatRiskScore(value) {
  const score = Number(value)

  if (!Number.isFinite(score)) {
    return '--'
  }

  return `${score} 分`
}

function downloadBlob(blob, filename) {
  if (typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') {
    return false
  }

  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
  return true
}

function resolveExportMimeType(contentType) {
  if (!contentType) {
    return 'text/csv'
  }

  return String(contentType).split(';')[0] || 'text/csv'
}

function resolveExportExtension(filename, contentType) {
  const matchedExtension = String(filename || '').match(/\.[^.]+$/)
  if (matchedExtension?.[0]) {
    return matchedExtension[0]
  }

  return resolveExportMimeType(contentType).includes('csv') ? '.csv' : '.txt'
}

function resolveExportFilename(filename, contentType) {
  const normalizedName = String(filename || '').trim()
  if (!normalizedName || normalizedName === 'statistics-export.csv') {
    return resolveExportMimeType(contentType).includes('sheet')
      ? DEFAULT_EXPORT_XLSX_FILENAME
      : DEFAULT_EXPORT_CSV_FILENAME
  }

  return normalizedName
}

function replaceDepartmentExportHeader(text) {
  const source = String(text || '')
  const header = 'deptId,deptName,recordCount,exceptionCount,analysisCount,warningCount,reviewCount,closedLoopCount'
  if (!source.includes(header)) {
    return source
  }

  return source.replace(
    /deptId,deptName,recordCount,exceptionCount,analysisCount,warningCount,reviewCount,closedLoopCount/g,
    '部门编号,部门名称,考勤记录数,异常记录数,分析记录数,预警记录数,复核记录数,闭环记录数',
  )
}

async function normalizeExportBlob(blob, contentType) {
  if (!(blob instanceof Blob)) {
    return blob
  }

  const mimeType = resolveExportMimeType(contentType)
  if (!mimeType.includes('csv')) {
    return blob
  }

  const text = await blob.text()
  const normalizedText = replaceDepartmentExportHeader(text).replace(/^\uFEFF/, '')
  return new Blob([`\uFEFF${normalizedText}`], { type: `${mimeType};charset=UTF-8` })
}

async function saveBlob(blob, filename, contentType) {
  const saveFilePicker = typeof globalThis.showSaveFilePicker === 'function'
    ? globalThis.showSaveFilePicker.bind(globalThis)
    : typeof window !== 'undefined' && typeof window.showSaveFilePicker === 'function'
      ? window.showSaveFilePicker.bind(window)
      : null

  if (saveFilePicker) {
    try {
      const handle = await saveFilePicker({
        suggestedName: filename,
        types: [
          {
            description: '统计报表',
            accept: {
              [resolveExportMimeType(contentType)]: [resolveExportExtension(filename, contentType)],
            },
          },
        ],
      })
      const writable = await handle.createWritable()
      await writable.write(blob)
      await writable.close()
      return true
    } catch (error) {
      if (error?.name === 'AbortError') {
        return false
      }
      throw error
    }
  }

  return downloadBlob(blob, filename) || true
}

async function loadStatistics() {
  loading.value = true
  errorMessage.value = ''

  try {
    const [departmentData, trendData, summary] = await Promise.all([
      fetchDepartmentStatistics(),
      fetchExceptionTrend(),
      fetchStatisticsSummary(),
    ])
    const risks = await fetchDepartmentRiskOverview().catch(() => null)

    overviewCards.value = buildOverviewCards(departmentData)
    trendPoints.value = normalizeTrendPoints(trendData)
    activeTrendIndex.value = Math.max(trendPoints.value.length - 1, 0)
    summaryData.value = summary || {}
    riskItems.value = normalizeRiskItems(risks)
  } catch (error) {
    errorMessage.value = error?.message || '页面加载失败，请稍后重试'
  } finally {
    loading.value = false
  }
}

async function handleExport() {
  exporting.value = true

  try {
    const { blob, filename, contentType } = await exportStatisticsReport({ exportType: DEFAULT_EXPORT_TYPE })
    const normalizedBlob = await normalizeExportBlob(blob, contentType)
    const saved = await saveBlob(normalizedBlob, resolveExportFilename(filename, contentType), contentType)
    if (saved) {
      ElMessage.success('报表已导出')
    }
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
  border: 1px solid rgba(148, 163, 184, 0.16);
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

.statistics-spotlight__cards :deep(.console-overview-grid) {
  grid-template-columns: 1fr;
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
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 14px;
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

.statistics-metric-card :deep(.el-card__body),
.statistics-risk-card :deep(.el-card__body) {
  padding: 18px;
}

.statistics-trend-chart {
  display: grid;
  gap: 16px;
}

.statistics-trend-chart__canvas {
  position: relative;
  min-height: 260px;
  padding: 18px 18px 14px;
  border-radius: 24px;
  background: linear-gradient(180deg, rgba(226, 232, 240, 0.55) 0%, rgba(248, 250, 252, 0.95) 100%);
  overflow: hidden;
}

.statistics-trend-chart__svg {
  position: absolute;
  inset: 12px 12px 36px;
  width: calc(100% - 24px);
  height: calc(100% - 48px);
}

.statistics-trend-chart__grid-line {
  stroke: rgba(148, 163, 184, 0.28);
  stroke-width: 0.6;
  stroke-dasharray: 2.4 2.8;
}

.statistics-trend-chart__area {
  fill: url(#statisticsTrendArea);
}

.statistics-trend-chart__line {
  fill: none;
  stroke: #0f766e;
  stroke-width: 2.6;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.statistics-trend-chart__point {
  position: absolute;
  width: 20px;
  height: 20px;
  border: none;
  border-radius: 999px;
  background: transparent;
  transform: translate(-50%, -50%);
  cursor: pointer;
}

.statistics-trend-chart__point-core {
  display: block;
  width: 20px;
  height: 20px;
  border: 3px solid rgba(255, 255, 255, 0.95);
  border-radius: 999px;
  background: #0f766e;
  box-shadow: 0 8px 18px rgba(15, 118, 110, 0.18);
}

.statistics-trend-chart__point--active .statistics-trend-chart__point-core {
  transform: scale(1.12);
  background: #14b8a6;
}

.statistics-trend-chart__tooltip {
  position: absolute;
  top: 16px;
  min-width: 220px;
  padding: 14px 16px;
  border-radius: 18px;
  background: rgba(15, 23, 42, 0.92);
  color: #f8fafc;
  box-shadow: 0 18px 34px rgba(15, 23, 42, 0.18);
  transform: translateX(-50%);
}

.statistics-trend-chart__tooltip-label {
  margin: 0 0 6px;
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(226, 232, 240, 0.78);
}

.statistics-trend-chart__tooltip strong {
  display: block;
  font-size: 24px;
  line-height: 1.1;
}

.statistics-trend-chart__tooltip-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px 12px;
  margin-top: 12px;
  font-size: 12px;
  color: rgba(226, 232, 240, 0.88);
}

.statistics-trend-chart__axis {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(88px, 1fr));
  gap: 12px;
}

.statistics-trend-chart__axis-item {
  display: grid;
  justify-items: center;
  gap: 8px;
  padding: 12px 10px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 18px;
  background: #ffffff;
  cursor: pointer;
  transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
}

.statistics-trend-chart__axis-item:hover,
.statistics-trend-chart__axis-item--active {
  transform: translateY(-2px);
  border-color: rgba(15, 118, 110, 0.24);
  box-shadow: 0 16px 28px rgba(15, 118, 110, 0.08);
}

.statistics-trend-chart__axis-item span {
  font-size: 13px;
  color: #64748b;
}

.statistics-trend-chart__axis-item strong {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 56px;
  min-height: 30px;
  padding: 0 10px;
  border-radius: 999px;
  background: rgba(47, 105, 178, 0.08);
  color: #245391;
}

.statistics-summary-card__content {
  display: grid;
  gap: 12px;
  line-height: 1.7;
  color: #334155;
}

.statistics-summary-card__content p:first-child {
  font-size: 15px;
  color: #0f172a;
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
  display: inline-flex;
  align-items: center;
  min-height: 30px;
  padding: 0 10px;
  border-radius: 999px;
  background: rgba(47, 105, 178, 0.08);
  color: #245391;
  font-weight: 700;
}

.statistics-risk-card p {
  line-height: 1.7;
  color: #475569;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
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

  .statistics-trend-chart__tooltip {
    min-width: 0;
    width: calc(100% - 32px);
    left: 50% !important;
  }
}
</style>
