<template>
  <section class="warning-page">
    <ConsoleHero
      title="预警列表"
      description="集中查看预警信息、处置建议和关联异常，并支持进入人工复核。"
      theme="sky"
    >
      <template #actions>
        <button type="button" data-testid="warning-refresh" class="warning-page__refresh" @click="loadWarningList">
          刷新
        </button>
        <button type="button" data-testid="warning-export-dashboard" class="warning-page__refresh warning-page__refresh--secondary" @click="exportDashboard">
          导出看板
        </button>
      </template>
    </ConsoleHero>

    <ConsoleOverviewCards :items="overviewItems" accent="#0f766e" />

    <section data-testid="warning-dashboard" class="warning-dashboard-card">
      <div class="warning-list-card__head">
        <h3>预警看板</h3>
        <span>近 {{ dashboardData.recentDays || 7 }} 天</span>
      </div>

      <div class="warning-dashboard-grid">
        <article v-for="item in dashboardCards" :key="item.key" class="warning-dashboard-metric">
          <span>{{ item.label }}</span>
          <strong>{{ item.value }}</strong>
          <p>{{ item.desc }}</p>
        </article>
      </div>

      <div class="warning-risk-tier-strip">
        <span class="warning-risk-tier warning-risk-tier--critical">关键风险 {{ Number(dashboardData.criticalRiskUserCount || 0) }}</span>
        <span class="warning-risk-tier warning-risk-tier--high">高风险 {{ Number(dashboardData.highRiskUserCount || 0) }}</span>
        <span class="warning-risk-tier warning-risk-tier--medium">中风险 {{ Number(dashboardData.mediumRiskUserCount || 0) }}</span>
        <span class="warning-risk-tier warning-risk-tier--low">低风险 {{ Number(dashboardData.lowRiskUserCount || 0) }}</span>
      </div>

      <section class="warning-secondary-card warning-secondary-card--sla">
        <div class="warning-trend-card__head">
          <h4>处置 SLA 统计</h4>
          <span>{{ dashboardData.slaTargetHours || 24 }} 小时目标</span>
        </div>

        <div class="warning-sla-grid">
          <article v-for="item in slaCards" :key="item.key" class="warning-sla-item">
            <span>{{ item.label }}</span>
            <strong>{{ item.value }}</strong>
            <p>{{ item.desc }}</p>
          </article>
        </div>
      </section>

      <div class="warning-trend-card">
        <div class="warning-trend-card__head">
          <h4>预警趋势与处置效率</h4>
          <span>按日汇总</span>
        </div>

        <div v-if="dashboardTrend.length" class="warning-trend-list">
          <article v-for="item in dashboardTrend" :key="item.dateLabel" class="warning-trend-item">
            <div class="warning-trend-item__head">
              <strong>{{ item.dateLabel }}</strong>
              <span>总量 {{ item.totalCount }}</span>
            </div>
            <div class="warning-trend-item__bar">
              <span class="warning-trend-item__bar-total" :style="{ width: `${item.totalWidth}%` }"></span>
              <span class="warning-trend-item__bar-processed" :style="{ width: `${item.processedWidth}%` }"></span>
            </div>
            <div class="warning-trend-item__meta">
              <span>高风险 {{ item.highRiskCount }}</span>
              <span>已处理 {{ item.processedCount }}</span>
              <span>待处理 {{ item.unprocessedCount }}</span>
            </div>
          </article>
        </div>
        <p v-else class="warning-feedback">暂无趋势数据</p>
      </div>

      <div class="warning-dashboard-secondary-grid">
        <section class="warning-secondary-card warning-secondary-card--portrait">
          <div class="warning-trend-card__head">
            <h4>异常人员画像</h4>
            <span>重点关注对象</span>
          </div>

          <div v-if="userPortraits.length" class="warning-portrait-list">
            <article v-for="item in userPortraits" :key="item.userId" class="warning-portrait-item" @click="openPortrait(item)">
              <header>
                <div class="warning-portrait-item__title-group">
                  <strong>{{ item.displayName }}</strong>
                  <span :class="['warning-tag', getPortraitRiskTierClass(item.riskTier)]">{{ item.riskTierLabel }}</span>
                </div>
                <span>{{ formatDateTime(item.latestWarningTime) }}</span>
              </header>
              <div class="warning-portrait-item__metrics">
                <span>总预警 {{ item.totalWarnings }}</span>
                <span>高风险 {{ item.highRiskWarnings }}</span>
                <span>待处理 {{ item.unprocessedWarnings }}</span>
                <span>超时 {{ item.overdueWarnings }}</span>
              </div>
              <p>
                最新异常：{{ item.latestExceptionTypeLabel }}
                <span v-if="item.latestWarningLevelLabel"> · {{ item.latestWarningLevelLabel }}</span>
              </p>
              <button type="button" class="warning-portrait-item__action">查看风险档案</button>
            </article>
          </div>
          <p v-else class="warning-feedback">暂无异常人员画像</p>
        </section>

        <section class="warning-secondary-card">
          <div class="warning-trend-card__head">
            <h4>高风险人员排行</h4>
            <span>近 {{ dashboardData.recentDays || 7 }} 天</span>
          </div>

          <div v-if="topRiskUsers.length" class="warning-ranking-list">
            <article v-for="item in topRiskUsers" :key="item.key" class="warning-ranking-item">
              <div>
                <strong>{{ item.label }}</strong>
                <p>高风险 {{ item.highRiskCount }} 条</p>
              </div>
              <span>{{ item.count }} 条预警</span>
            </article>
          </div>
          <p v-else class="warning-feedback">暂无高风险人员排行</p>
        </section>

        <section class="warning-secondary-card">
          <div class="warning-trend-card__head">
            <h4>异常类型排行</h4>
            <span>高频风险类型</span>
          </div>

          <div v-if="topExceptionTypes.length" class="warning-ranking-list">
            <article v-for="item in topExceptionTypes" :key="item.key" class="warning-ranking-item">
              <div>
                <strong>{{ item.label }}</strong>
                <p>高风险 {{ item.highRiskCount }} 条</p>
                <div v-if="item.trendBars.length" class="warning-type-trend">
                  <span v-for="(count, index) in item.trendBars" :key="`${item.key}-${index}`" :style="{ height: `${count.height}%` }"></span>
                </div>
              </div>
              <span>{{ item.count }} 次</span>
            </article>
          </div>
          <p v-else class="warning-feedback">暂无异常类型排行</p>
        </section>
      </div>

      <section class="warning-secondary-card warning-secondary-card--overdue">
        <div class="warning-trend-card__head">
          <h4>处置超时提醒</h4>
          <span>超过 24 小时未处理</span>
        </div>

        <div class="warning-overdue-buckets">
          <span>24-48h：{{ Number(dashboardData.overdue24To48Count || 0) }}</span>
          <span>48-72h：{{ Number(dashboardData.overdue48To72Count || 0) }}</span>
          <span>72h+：{{ Number(dashboardData.overdueOver72Count || 0) }}</span>
        </div>

        <div v-if="overdueWarnings.length" class="warning-overdue-list">
          <article v-for="item in overdueWarnings" :key="item.warningId" class="warning-overdue-item">
            <div>
              <strong>{{ item.title }}</strong>
              <p>{{ item.realName || '未关联人员' }} · {{ formatDateTime(item.sendTime) }}</p>
            </div>
            <span>{{ item.overdueHours }} 小时</span>
          </article>
        </div>
        <p v-else class="warning-feedback">当前没有处置超时的预警</p>
      </section>
    </section>

      <section v-if="portraitVisible" data-testid="warning-portrait-dialog" class="warning-portrait-dialog">
      <div class="warning-portrait-dialog__backdrop" @click="closePortrait"></div>

      <div class="warning-portrait-dialog__panel">
        <header class="warning-portrait-dialog__header">
          <div>
            <p class="warning-page__eyebrow">风险人员档案</p>
            <h3>{{ selectedPortrait?.displayName || '当前人员' }}</h3>
          </div>
          <button type="button" class="warning-portrait-dialog__close" @click="closePortrait">关闭</button>
        </header>

        <div v-if="selectedPortrait" class="warning-portrait-dialog__summary">
          <span :class="['warning-tag', getPortraitRiskTierClass(selectedPortrait.riskTier)]">{{ selectedPortrait.riskTierLabel }}</span>
          <span>总预警 {{ selectedPortrait.totalWarnings }}</span>
          <span>高风险 {{ selectedPortrait.highRiskWarnings }}</span>
          <span>待处理 {{ selectedPortrait.unprocessedWarnings }}</span>
          <span>超时 {{ selectedPortrait.overdueWarnings }}</span>
          <span>最新异常 {{ selectedPortrait.latestExceptionTypeLabel }}</span>
        </div>

        <section v-if="portraitSuggestions.length" class="warning-portrait-dialog__suggestions">
          <div class="warning-trend-card__head">
            <h4>自动处置建议</h4>
            <span>基于当前画像生成</span>
          </div>

          <div class="warning-portrait-suggestion-list">
            <article v-for="(item, index) in portraitSuggestions" :key="`${selectedPortrait?.userId || 'portrait'}-${index}`" class="warning-portrait-suggestion-item">
              <p>{{ item }}</p>
              <button type="button" class="warning-item__action warning-item__action--secondary" @click="applyPortraitSuggestion(item)">套用到快速复核</button>
            </article>
          </div>
        </section>

        <section v-if="portraitTimelineItems.length" class="warning-portrait-dialog__timeline">
          <div class="warning-trend-card__head">
            <h4>处置时间线</h4>
            <span>最近 {{ portraitTimelineItems.length }} 条预警</span>
          </div>

          <div class="warning-portrait-timeline">
            <article v-for="item in portraitTimelineItems" :key="item.id" class="warning-portrait-timeline__item">
              <span class="warning-portrait-timeline__dot"></span>
              <div class="warning-portrait-timeline__content">
                <div class="warning-portrait-timeline__head">
                  <strong>{{ item.title }}</strong>
                  <span>{{ formatDateTime(item.sendTime) }}</span>
                </div>
                <p>{{ item.meta }}</p>
              </div>
            </article>
          </div>
        </section>

        <p v-if="portraitLoading" class="warning-feedback">风险档案加载中...</p>
        <p v-else-if="portraitError" data-testid="warning-portrait-error" class="warning-feedback warning-feedback--error">
          {{ portraitError }}
        </p>
        <div v-else-if="portraitWarnings.length" class="warning-portrait-dialog__list">
          <article v-for="item in portraitWarnings" :key="item.id" class="warning-portrait-dialog__item">
            <div>
              <strong>{{ buildWarningTitle(item) }}</strong>
              <p>{{ formatDateTime(item.sendTime) }} · {{ buildWarningRelation(item) }}</p>
            </div>
            <div class="warning-portrait-dialog__actions">
              <button type="button" class="warning-item__action" @click="openAdvice(item.id)">证据链</button>
              <button type="button" class="warning-item__action warning-item__action--primary" @click="openQuickReview(item)">快速复核</button>
            </div>
          </article>
        </div>
        <p v-else class="warning-feedback">当前人员近期没有更多预警记录</p>
      </div>
    </section>

    <section data-testid="warning-continuous-trend" class="warning-dashboard-card warning-dashboard-card--compact">
      <div class="warning-list-card__head">
        <h3>连续行为异常趋势</h3>
        <span>高风险持续模式</span>
      </div>

      <div v-if="continuousTrendItems.length" class="warning-continuous-trend-grid">
        <article v-for="item in continuousTrendItems" :key="item.key" class="warning-continuous-trend-item">
          <div class="warning-trend-card__head">
            <h4>{{ item.label }}</h4>
            <span>{{ item.totalCount }} 次</span>
          </div>
          <div class="warning-type-trend warning-type-trend--wide">
            <span v-for="(bar, index) in item.bars" :key="`${item.key}-${index}`" :style="{ height: `${bar.height}%` }" :title="`${bar.label}：${bar.value}`"></span>
          </div>
          <p>{{ item.summary }}</p>
        </article>
      </div>
      <p v-else class="warning-feedback">当前暂无连续行为异常趋势数据</p>
    </section>

    <section class="warning-filter-card">
      <div class="warning-filter-grid">
        <label class="warning-filter-field">
          <span>风险等级</span>
          <select v-model="queryForm.level" data-testid="warning-filter-level">
            <option value="">全部</option>
            <option value="HIGH">高风险</option>
            <option value="MEDIUM">中风险</option>
            <option value="LOW">低风险</option>
          </select>
        </label>

        <label class="warning-filter-field">
          <span>处理状态</span>
          <select v-model="queryForm.status" data-testid="warning-filter-status">
            <option value="">全部</option>
            <option value="UNPROCESSED">待处理</option>
            <option value="PROCESSED">已处理</option>
          </select>
        </label>

        <label class="warning-filter-field">
          <span>预警类型</span>
          <select v-model="queryForm.type" data-testid="warning-filter-type">
            <option value="">全部</option>
            <option value="RISK_WARNING">风险预警</option>
            <option value="ATTENDANCE_WARNING">考勤预警</option>
          </select>
        </label>
      </div>

      <div class="warning-filter-actions">
        <button type="button" data-testid="warning-search" class="warning-filter-actions__primary" @click="handleSearch">
          查询
        </button>
      </div>
    </section>

    <section class="warning-list-card">
      <div class="warning-list-card__head">
        <h3>预警列表</h3>
        <span>共 {{ listTotal }} 条</span>
      </div>

      <p v-if="listError" data-testid="warning-list-error" class="warning-feedback warning-feedback--error">
        {{ listError }}
      </p>
      <p v-else-if="listLoading" data-testid="warning-list-loading" class="warning-feedback">预警列表加载中...</p>
      <p v-else-if="!warningList.length" data-testid="warning-list-empty" class="warning-feedback">暂无预警记录</p>

      <div v-else data-testid="warning-list" class="warning-list">
          <article v-for="item in warningList" :key="item.id" :class="['warning-item', { 'warning-item--overdue': item.overdue }]">
            <div class="warning-item__main">
              <div class="warning-item__title-row">
                <div class="warning-item__title-main">
                  <strong>{{ buildWarningTitle(item) }}</strong>
                  <span v-if="item.overdue" class="warning-item__alert">超时 {{ formatOverdueHours(item.overdueMinutes) }}</span>
                </div>
                <span>{{ formatDateTime(item.sendTime) }}</span>
              </div>

            <dl class="warning-item__grid">
              <div>
                <dt>关联异常</dt>
                <dd>{{ buildWarningRelation(item) }}</dd>
              </div>
              <div>
                <dt>异常类型</dt>
                <dd>{{ formatDisplayValue(item.exceptionType, WARNING_EXCEPTION_TYPE_LABELS) }}</dd>
              </div>
              <div>
                <dt>预警类型</dt>
                <dd>
                  <span :class="['warning-tag', getWarningTypeClass(item.type)]">
                    {{ formatDisplayValue(item.type, WARNING_TYPE_LABELS) }}
                  </span>
                </dd>
              </div>
              <div>
                <dt>风险等级</dt>
                <dd>
                  <span :class="['warning-tag', getWarningLevelClass(item.level)]">
                    {{ formatDisplayValue(item.level, WARNING_LEVEL_LABELS) }}
                  </span>
                </dd>
              </div>
              <div>
                <dt>处理状态</dt>
                <dd>
                  <span :class="['warning-tag', getWarningStatusClass(item.status)]">
                    {{ formatDisplayValue(item.status, WARNING_STATUS_LABELS) }}
                  </span>
                </dd>
              </div>
              <div>
                <dt>处置顺序</dt>
                <dd>{{ item.priorityScore ?? '--' }}</dd>
              </div>
            </dl>

            <p class="warning-item__summary">{{ formatReadableText(item.aiSummary || item.disposeSuggestion, '暂无情况说明') }}</p>
          </div>

          <div class="warning-item__actions">
            <button
              :data-testid="`warning-open-advice-${item.id}`"
              type="button"
              class="warning-item__action"
              @click="openAdvice(item.id)"
            >
              查看证据链
            </button>
            <button
              :data-testid="`warning-open-reevaluate-${item.id}`"
              type="button"
              class="warning-item__action warning-item__action--muted"
              @click="openReevaluate(item.id)"
            >
              重新评估
            </button>
            <button
              :data-testid="`warning-open-exception-${item.exceptionId}`"
              type="button"
              class="warning-item__action warning-item__action--secondary"
              @click="jumpToException(item.exceptionId)"
            >
              查看异常详情
            </button>
            <button
              :data-testid="`warning-open-review-${item.exceptionId}`"
              type="button"
              class="warning-item__action warning-item__action--primary"
              @click="openQuickReview(item)"
            >
              快速复核
            </button>
            <button
              :data-testid="`warning-open-review-page-${item.exceptionId}`"
              type="button"
              class="warning-item__action warning-item__action--review"
              @click="jumpToReview(item.exceptionId)"
            >
              前往完整复核
            </button>
          </div>
        </article>
      </div>
    </section>

    <section v-if="adviceVisible" data-testid="warning-advice-dialog" class="warning-advice-dialog">
      <div class="warning-advice-dialog__backdrop" @click="closeAdvice"></div>

      <div class="warning-advice-dialog__panel">
        <header class="warning-advice-dialog__header">
          <div>
            <p class="warning-page__eyebrow">预警证据链</p>
            <h3>{{ buildSelectedWarningTitle(selectedWarningId) }}</h3>
          </div>

          <div class="warning-advice-dialog__actions">
            <button type="button" class="warning-advice-dialog__quick-review" @click="openQuickReview(getWarningById(selectedWarningId) || adviceDetail)">快速复核</button>
            <button type="button" class="warning-advice-dialog__reevaluate" @click="openReevaluate(selectedWarningId)">重新评估</button>
            <button type="button" class="warning-advice-dialog__close" @click="closeAdvice">关闭</button>
          </div>
        </header>

        <p v-if="adviceLoading" class="warning-feedback">处置建议加载中...</p>
        <p v-else-if="adviceError" data-testid="warning-advice-error" class="warning-feedback warning-feedback--error">
          {{ adviceError }}
        </p>
        <div v-else-if="adviceDetail" class="warning-advice-flow">
          <section class="warning-advice-strip">
            <span :class="['warning-tag', getWarningLevelClass(adviceDetail.level)]">
              {{ formatDisplayValue(adviceDetail.level, WARNING_LEVEL_LABELS) }}
            </span>
            <span :class="['warning-tag', getWarningTypeClass(adviceDetail.type)]">
              {{ formatDisplayValue(adviceDetail.type, WARNING_TYPE_LABELS) }}
            </span>
            <span :class="['warning-tag', getWarningStatusClass(adviceDetail.status)]">
              {{ formatDisplayValue(adviceDetail.status, WARNING_STATUS_LABELS) }}
            </span>
            <span :class="['warning-tag', getDecisionSourceClass(adviceDetail.decisionSource)]">
              {{ formatDisplayValue(adviceDetail.decisionSource, DECISION_SOURCE_LABELS) }}
            </span>
          </section>

          <section class="warning-advice-section">
            <div class="warning-advice-section__head">
              <h4>风险判断</h4>
              <span>预警摘要</span>
            </div>
            <div class="warning-advice-grid">
              <div>
                <dt>关联异常</dt>
                <dd>{{ buildWarningRelation(getWarningById(selectedWarningId) || adviceDetail) }}</dd>
              </div>
              <div>
                <dt>处置顺序</dt>
                <dd>{{ formatScore(adviceDetail.priorityScore) }}</dd>
              </div>
              <div>
                <dt>发送时间</dt>
                <dd>{{ formatDateTime(adviceDetail.sendTime) }}</dd>
              </div>
              <div>
                <dt>异常来源</dt>
                <dd>{{ formatDisplayValue(adviceDetail.exceptionSourceType, EXCEPTION_SOURCE_LABELS) }}</dd>
              </div>
              <div>
                <dt>异常状态</dt>
                <dd>{{ formatDisplayValue(adviceDetail.exceptionProcessStatus, EXCEPTION_PROCESS_STATUS_LABELS) }}</dd>
              </div>
              <div>
                <dt>打卡记录</dt>
                <dd>{{ adviceDetail.recordId || '--' }}</dd>
              </div>
            </div>
            <p class="warning-advice-section__summary"><strong>情况概述：</strong>{{ formatReadableText(adviceDetail.aiSummary, '暂无概述信息') }}</p>
            <p class="warning-advice-section__summary"><strong>处置建议：</strong>{{ formatReadableText(adviceDetail.disposeSuggestion, '暂无处置建议') }}</p>
          </section>

          <section class="warning-advice-section">
            <div class="warning-advice-section__head">
              <h4>人员与打卡证据</h4>
              <span>现场上下文</span>
            </div>
            <div class="warning-advice-grid">
              <div>
                <dt>关联人员</dt>
                <dd>{{ buildAdviceActor(adviceDetail) }}</dd>
              </div>
              <div>
                <dt>打卡时间</dt>
                <dd>{{ formatDateTime(adviceDetail.checkTime) }}</dd>
              </div>
              <div>
                <dt>打卡类型</dt>
                <dd>{{ formatDisplayValue(adviceDetail.checkType, CHECK_TYPE_LABELS) }}</dd>
              </div>
              <div>
                <dt>打卡地点</dt>
                <dd>{{ adviceDetail.location || '--' }}</dd>
              </div>
              <div>
                <dt>人脸分值</dt>
                <dd>{{ formatScore(adviceDetail.faceScore) }}</dd>
              </div>
              <div>
                <dt>记录状态</dt>
                <dd>{{ adviceDetail.recordStatus || '--' }}</dd>
              </div>
              <div>
                <dt>设备编号</dt>
                <dd>{{ adviceDetail.deviceId || '--' }}</dd>
              </div>
              <div>
                <dt>终端标识</dt>
                <dd>{{ adviceDetail.terminalId || '--' }}</dd>
              </div>
              <div>
                <dt>IP 地址</dt>
                <dd>{{ adviceDetail.ipAddr || '--' }}</dd>
              </div>
              <div class="warning-advice-grid__full">
                <dt>设备信息</dt>
                <dd>{{ formatReadableText(adviceDetail.deviceInfo, '暂无设备信息') }}</dd>
              </div>
            </div>
          </section>

          <section class="warning-advice-section">
            <div class="warning-advice-section__head">
              <h4>模型与规则证据</h4>
              <span>异常检测说明</span>
            </div>
            <div class="warning-advice-grid">
              <div>
                <dt>异常描述</dt>
                <dd>{{ formatReadableText(adviceDetail.exceptionDescription, '暂无异常描述') }}</dd>
              </div>
              <div>
                <dt>模型结论</dt>
                <dd>{{ formatReadableText(adviceDetail.modelConclusion, '当前异常主要由规则判定') }}</dd>
              </div>
              <div>
                <dt>置信度</dt>
                <dd>{{ formatScore(adviceDetail.confidenceScore) }}</dd>
              </div>
              <div class="warning-advice-grid__full">
                <dt>决策原因</dt>
                <dd>{{ formatReadableText(adviceDetail.decisionReason, '暂无决策原因说明') }}</dd>
              </div>
              <div class="warning-advice-grid__full">
                <dt>相似案例</dt>
                <dd>{{ formatReadableText(adviceDetail.similarCaseSummary, '暂无相似案例摘要') }}</dd>
              </div>
            </div>
          </section>

          <section class="warning-advice-section">
            <div class="warning-advice-section__head">
              <h4>复核流转</h4>
              <span>处置状态</span>
            </div>
            <div class="warning-advice-grid">
              <div>
                <dt>最新复核结果</dt>
                <dd>{{ formatDisplayValue(adviceDetail.reviewResult, REVIEW_RESULT_LABELS) }}</dd>
              </div>
              <div>
                <dt>复核人</dt>
                <dd>{{ adviceDetail.reviewUserName || '--' }}</dd>
              </div>
              <div>
                <dt>复核时间</dt>
                <dd>{{ formatDateTime(adviceDetail.reviewTime) }}</dd>
              </div>
              <div class="warning-advice-grid__full">
                <dt>复核备注</dt>
                <dd>{{ formatReadableText(adviceDetail.reviewComment, '当前暂无复核备注') }}</dd>
              </div>
              <div class="warning-advice-grid__full">
                <dt>复核建议</dt>
                <dd>{{ formatReadableText(adviceDetail.reviewAiSuggestion, '当前暂无复核阶段建议') }}</dd>
              </div>
            </div>
          </section>
        </div>
        <p v-else class="warning-feedback">暂无处置建议</p>
      </div>
    </section>

    <section v-if="reevaluateVisible" data-testid="warning-reevaluate-dialog" class="warning-reevaluate-dialog">
      <div class="warning-reevaluate-dialog__backdrop" @click="closeReevaluate"></div>

      <div class="warning-reevaluate-dialog__panel">
        <header class="warning-reevaluate-dialog__header">
          <div>
            <p class="warning-page__eyebrow">预警重评估</p>
            <h3>重新评估{{ buildSelectedWarningTitle(reevaluateForm.warningId) }}</h3>
          </div>

          <button type="button" class="warning-reevaluate-dialog__close" @click="closeReevaluate">关闭</button>
        </header>

        <p class="warning-feedback">如需重新生成处置建议，可填写本次重评估原因后提交。</p>
        <p v-if="reevaluateError" data-testid="warning-reevaluate-error" class="warning-feedback warning-feedback--error">
          {{ reevaluateError }}
        </p>

        <label class="warning-filter-field warning-filter-field--full">
          <span>重评估原因</span>
          <textarea
            v-model="reevaluateForm.reason"
            data-testid="warning-reevaluate-reason-input"
            rows="4"
            placeholder="请输入重新评估原因，例如补充现场情况、调整处置依据等"
          />
        </label>

        <div class="warning-reevaluate-dialog__actions">
          <button type="button" class="warning-item__action warning-item__action--muted" @click="closeReevaluate">取消</button>
          <button
            data-testid="warning-reevaluate-submit"
            type="button"
            class="warning-item__action warning-item__action--review"
            :disabled="reevaluateLoading"
            @click="submitReevaluate"
          >
            {{ reevaluateLoading ? '提交中...' : '提交重评估' }}
          </button>
        </div>
      </div>
    </section>

    <section v-if="quickReviewVisible" data-testid="warning-quick-review-dialog" class="warning-quick-review-dialog">
      <div class="warning-quick-review-dialog__backdrop" @click="closeQuickReview"></div>

      <div class="warning-quick-review-dialog__panel">
        <header class="warning-quick-review-dialog__header">
          <div>
            <p class="warning-page__eyebrow">快速复核</p>
            <h3>{{ buildSelectedWarningTitle(quickReviewForm.warningId) }}</h3>
          </div>

          <button type="button" class="warning-quick-review-dialog__close" @click="closeQuickReview">关闭</button>
        </header>

        <p class="warning-feedback">用于对高风险预警做快速决策。若需要更多辅助信息，可再进入完整复核页。</p>
        <p v-if="quickReviewError" data-testid="warning-quick-review-error" class="warning-feedback warning-feedback--error">
          {{ quickReviewError }}
        </p>

        <label class="warning-filter-field warning-filter-field--full">
          <span>复核结果</span>
          <select v-model="quickReviewForm.reviewResult" data-testid="warning-quick-review-result">
            <option value="CONFIRMED">确认异常</option>
            <option value="REJECTED">排除异常</option>
          </select>
        </label>

        <label class="warning-filter-field warning-filter-field--full">
          <span>复核意见</span>
          <textarea
            v-model="quickReviewForm.reviewComment"
            data-testid="warning-quick-review-comment"
            rows="4"
            placeholder="请输入本次快速复核结论，例如已核对设备、地点、人脸分值和模型摘要。"
          />
        </label>

        <div class="warning-quick-review-dialog__actions">
          <button type="button" class="warning-item__action warning-item__action--muted" @click="closeQuickReview">取消</button>
          <button
            data-testid="warning-quick-review-submit"
            type="button"
            class="warning-item__action warning-item__action--review"
            :disabled="quickReviewLoading"
            @click="submitQuickReview"
          >
            {{ quickReviewLoading ? '提交中...' : '提交快速复核' }}
          </button>
        </div>
      </div>
    </section>
  </section>
</template>

<script setup>
import { ElMessage } from 'element-plus'
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'

import ConsoleHero from '../../components/console/ConsoleHero.vue'
import ConsoleOverviewCards from '../../components/console/ConsoleOverviewCards.vue'
import { fetchFe06WarningAdvice, fetchFe06WarningDashboard, fetchFe06WarningList, fetchFe06WarningReevaluate } from '../../api/fe06-warning'
import { submitReview } from '../../api/review'
import { exportStatisticsReport } from '../../api/statistics'
import { formatDateTimeDisplay } from '../../utils/date-time'
import { formatReadableText } from '../../utils/readable-text'

const WARNING_TYPE_LABELS = {
  RISK_WARNING: '风险预警',
  ATTENDANCE_WARNING: '考勤预警',
}

const WARNING_EXCEPTION_TYPE_LABELS = {
  PROXY_CHECKIN: '代打卡',
  CONTINUOUS_LATE: '连续迟到',
  CONTINUOUS_EARLY_LEAVE: '连续早退',
  CONTINUOUS_MULTI_LOCATION_CONFLICT: '连续多地点冲突',
  CONTINUOUS_ILLEGAL_TIME: '连续非法时间打卡',
  CONTINUOUS_REPEAT_CHECK: '连续重复打卡',
  CONTINUOUS_PROXY_CHECKIN: '连续代打卡',
  CONTINUOUS_ATTENDANCE_RISK: '连续综合考勤异常',
  CONTINUOUS_MODEL_RISK: '连续模型风险异常',
  LATE: '迟到',
  EARLY_LEAVE: '早退',
  ILLEGAL_TIME: '非规定时间打卡',
  REPEAT_CHECK: '重复打卡',
  MULTI_LOCATION_CONFLICT: '多地点异常',
}

const WARNING_LEVEL_LABELS = {
  HIGH: '高风险',
  MEDIUM: '中风险',
  LOW: '低风险',
}

const WARNING_STATUS_LABELS = {
  UNPROCESSED: '待处理',
  PROCESSED: '已处理',
}

const PORTRAIT_RISK_TIER_LABELS = {
  CRITICAL: '关键风险',
  HIGH: '高风险',
  MEDIUM: '中风险',
  LOW: '低风险',
}

const DECISION_SOURCE_LABELS = {
  MODEL_FUSION: '综合识别',
  RULE: '规则校验',
}

const CHECK_TYPE_LABELS = {
  IN: '上班打卡',
  OUT: '下班打卡',
}

const EXCEPTION_SOURCE_LABELS = {
  RULE: '规则检测',
  MODEL: '模型检测',
  MODEL_FALLBACK: '模型降级判定',
}

const EXCEPTION_PROCESS_STATUS_LABELS = {
  PENDING: '待复核',
  REVIEWED: '已复核',
}

const REVIEW_RESULT_LABELS = {
  CONFIRMED: '确认异常',
  REJECTED: '排除异常',
}

const router = useRouter()

const queryForm = reactive({
  pageNum: 1,
  pageSize: 10,
  level: '',
  status: '',
  type: '',
})

const listLoading = ref(false)
const listError = ref('')
const listTotal = ref(0)
const warningList = ref([])
const dashboardData = ref({
  recentDays: 7,
  totalCount: 0,
  processedCount: 0,
  unprocessedCount: 0,
  highRiskCount: 0,
  overdueCount: 0,
  overdue24To48Count: 0,
  overdue48To72Count: 0,
  overdueOver72Count: 0,
  slaTargetHours: 24,
  withinSlaCount: 0,
  overSlaCount: 0,
  processedRate: 0,
  withinSlaRate: 0,
  averageProcessMinutes: 0,
  trendPoints: [],
  exceptionTrendItems: [],
})
const portraitVisible = ref(false)
const portraitLoading = ref(false)
const portraitError = ref('')
const portraitWarnings = ref([])
const selectedPortrait = ref(null)

const adviceVisible = ref(false)
const adviceLoading = ref(false)
const adviceError = ref('')
const selectedWarningId = ref('')
const adviceDetail = ref(null)
let latestAdviceRequestId = 0

const reevaluateVisible = ref(false)
const reevaluateLoading = ref(false)
const reevaluateError = ref('')
const reevaluateForm = reactive({
  warningId: '',
  reason: '',
})

const quickReviewVisible = ref(false)
const quickReviewLoading = ref(false)
const quickReviewError = ref('')
const quickReviewForm = reactive({
  warningId: '',
  exceptionId: '',
  reviewResult: 'CONFIRMED',
  reviewComment: '',
})

const overviewItems = computed(() => [
  {
    key: 'total',
    label: '预警总数',
    value: `${listTotal.value}`,
    desc: '按当前筛选条件统计',
  },
  {
    key: 'filter',
    label: '当前筛选',
    value:
      WARNING_LEVEL_LABELS[queryForm.level] ||
      WARNING_STATUS_LABELS[queryForm.status] ||
      WARNING_TYPE_LABELS[queryForm.type] ||
      '全部预警',
    desc: '支持按风险等级、状态和预警类型组合查看',
  },
  {
    key: 'advice',
    label: '当前查看',
    value: adviceVisible.value ? buildSelectedWarningTitle(selectedWarningId.value) : '未查看',
    desc: '可在建议中直接查看异常详情或进入人工复核',
  },
])

const dashboardCards = computed(() => [
  {
    key: 'total',
    label: '预警总量',
    value: Number(dashboardData.value?.totalCount || 0),
    desc: '统计近 7 天内生成的全部预警记录',
  },
  {
    key: 'processed',
    label: '已处理预警',
    value: Number(dashboardData.value?.processedCount || 0),
    desc: `整体处理率 ${formatScore(dashboardData.value?.processedRate)}%`,
  },
  {
    key: 'unprocessed',
    label: '待处理积压',
    value: Number(dashboardData.value?.unprocessedCount || 0),
    desc: '建议优先消化积压中的高风险预警',
  },
  {
    key: 'overdue',
    label: '超时预警',
    value: Number(dashboardData.value?.overdueCount || 0),
    desc: '超过 24 小时仍未处理的预警需要优先关注',
  },
  {
    key: 'process-time',
    label: '平均处置时长',
    value: `${formatScore(dashboardData.value?.averageProcessMinutes)} 分钟`,
    desc: '按预警发送时间至最新复核时间估算处理效率',
  },
])

const slaCards = computed(() => [
  {
    key: 'within-sla',
    label: '按时关闭',
    value: Number(dashboardData.value?.withinSlaCount || 0),
    desc: '在目标时限内完成复核闭环的预警数量',
  },
  {
    key: 'over-sla',
    label: '超时关闭',
    value: Number(dashboardData.value?.overSlaCount || 0),
    desc: '已处理但超出目标时限完成闭环的预警数量',
  },
  {
    key: 'within-rate',
    label: '按时关闭率',
    value: `${formatScore(dashboardData.value?.withinSlaRate)}%`,
    desc: '以已处理预警为基数统计的时效达标率',
  },
])

const topRiskUsers = computed(() => {
  const source = Array.isArray(dashboardData.value?.topRiskUsers) ? dashboardData.value.topRiskUsers : []
  return source.map((item) => ({
    ...item,
    count: Number(item.count || 0),
    highRiskCount: Number(item.highRiskCount || 0),
  }))
})

const topExceptionTypes = computed(() => {
  const source = Array.isArray(dashboardData.value?.topExceptionTypes) ? dashboardData.value.topExceptionTypes : []
  const trendMap = new Map(
    (Array.isArray(dashboardData.value?.exceptionTrendItems) ? dashboardData.value.exceptionTrendItems : []).map((item) => [item.type, item]),
  )
  return source.map((item) => ({
    ...item,
    label: formatDisplayValue(item.label, WARNING_EXCEPTION_TYPE_LABELS),
    count: Number(item.count || 0),
    highRiskCount: Number(item.highRiskCount || 0),
    trendBars: buildTrendBars(trendMap.get(item.key)?.dailyCounts || []),
  }))
})

const continuousTrendItems = computed(() => {
  const trendMap = new Map(
    (Array.isArray(dashboardData.value?.exceptionTrendItems) ? dashboardData.value.exceptionTrendItems : []).map((item) => [item.type, item]),
  )

  return Object.keys(WARNING_EXCEPTION_TYPE_LABELS)
    .filter((key) => key.startsWith('CONTINUOUS_'))
    .map((key) => {
      const trendItem = trendMap.get(key)
      const values = Array.isArray(trendItem?.dailyCounts) ? trendItem.dailyCounts : []
      const totalCount = Number(trendItem?.totalCount || 0)
      return {
        key,
        label: WARNING_EXCEPTION_TYPE_LABELS[key],
        totalCount,
        bars: buildTrendBars(values),
        summary: totalCount > 0 ? `近 ${dashboardData.value?.recentDays || 7} 天内共识别 ${totalCount} 次${WARNING_EXCEPTION_TYPE_LABELS[key]}。` : '',
      }
    })
    .filter((item) => item.totalCount > 0)
})

const overdueWarnings = computed(() => {
  const source = Array.isArray(dashboardData.value?.overdueItems) ? dashboardData.value.overdueItems : []
  return source.map((item) => ({
    ...item,
    title: formatDisplayValue(item.title, WARNING_EXCEPTION_TYPE_LABELS),
    overdueHours: Math.max(1, Math.round(Number(item.overdueMinutes || 0) / 60)),
  }))
})

const userPortraits = computed(() => {
  const source = Array.isArray(dashboardData.value?.userPortraits) ? dashboardData.value.userPortraits : []
  return source.map((item) => ({
    ...item,
    displayName: item.realName && item.username ? `${item.realName}（${item.username}）` : item.realName || item.username || '--',
    riskTier: item.riskTier || 'LOW',
    riskTierLabel: PORTRAIT_RISK_TIER_LABELS[item.riskTier] || '低风险',
    latestExceptionTypeLabel: formatDisplayValue(item.latestExceptionType, WARNING_EXCEPTION_TYPE_LABELS),
    latestWarningLevelLabel: formatDisplayValue(item.latestWarningLevel, WARNING_LEVEL_LABELS),
    totalWarnings: Number(item.totalWarnings || 0),
    highRiskWarnings: Number(item.highRiskWarnings || 0),
    unprocessedWarnings: Number(item.unprocessedWarnings || 0),
    overdueWarnings: Number(item.overdueWarnings || 0),
  }))
})

const portraitTimelineItems = computed(() => {
  return portraitWarnings.value.map((item) => ({
    id: item.id,
    title: buildWarningTitle(item),
    sendTime: item.sendTime,
    meta: [
      buildWarningRelation(item),
      formatDisplayValue(item.level, WARNING_LEVEL_LABELS),
      formatDisplayValue(item.status, WARNING_STATUS_LABELS),
      item.overdue ? `超时 ${formatOverdueHours(item.overdueMinutes)}` : '',
    ].filter(Boolean).join(' · '),
  }))
})

const portraitSuggestions = computed(() => {
  const portrait = selectedPortrait.value
  if (!portrait) {
    return []
  }

  const suggestions = []
  if (portrait.overdueWarnings > 0) {
    suggestions.push(`当前存在 ${portrait.overdueWarnings} 条超时预警，建议优先清理积压并补充复核结论。`)
  }
  if (portrait.highRiskWarnings >= 2) {
    suggestions.push(`该人员近阶段高风险预警较多，建议优先核对人脸分值、地点证据和活体记录。`)
  }
  if (portrait.unprocessedWarnings >= 2) {
    suggestions.push(`该人员仍有 ${portrait.unprocessedWarnings} 条待处理预警，建议在一个工作日内完成快速复核。`)
  }

  switch (portrait.latestExceptionType) {
    case 'CONTINUOUS_LATE':
      suggestions.push('连续迟到模式已出现，建议结合部门管理制度进行提醒或约谈。')
      break
    case 'CONTINUOUS_EARLY_LEAVE':
      suggestions.push('连续早退模式已出现，建议结合排班和离岗记录核对真实原因。')
      break
    case 'CONTINUOUS_MULTI_LOCATION_CONFLICT':
      suggestions.push('连续多地点冲突风险较高，建议优先核查设备位置、IP 与终端标识是否存在异常。')
      break
    case 'CONTINUOUS_ILLEGAL_TIME':
      suggestions.push('连续非法时间打卡风险较高，建议重点核查是否存在异常时段打卡或代操作行为。')
      break
    case 'CONTINUOUS_REPEAT_CHECK':
      suggestions.push('连续重复打卡模式已出现，建议核对是否存在反复提交或规避性打卡行为。')
      break
    case 'CONTINUOUS_PROXY_CHECKIN':
      suggestions.push('连续代打卡模式已出现，建议优先核查人脸分值、设备变化、地点证据和历史复核记录。')
      break
    case 'CONTINUOUS_ATTENDANCE_RISK':
      suggestions.push('连续综合考勤异常已出现，建议优先查看该人员完整风险档案并完成复核闭环。')
      break
    case 'CONTINUOUS_MODEL_RISK':
      suggestions.push('连续模型风险异常已出现，建议优先核查模型结论、相似案例摘要与人工复核记录。')
      break
    case 'PROXY_CHECKIN':
      suggestions.push('当前最新异常涉及代打卡风险，建议优先复核证据链并结合模型结论人工确认。')
      break
    default:
      break
  }

  if (!suggestions.length) {
    suggestions.push('当前暂无明显积压或持续性风险，可继续观察后续预警变化。')
  }

  return suggestions
})

async function loadPortraitWarnings(userId) {
  portraitLoading.value = true
  portraitError.value = ''

  try {
    const payload = await fetchFe06WarningList({
      pageNum: 1,
      pageSize: 5,
      userId,
    })
    portraitWarnings.value = Array.isArray(payload?.records) ? payload.records : []
  } catch (error) {
    portraitWarnings.value = []
    portraitError.value = error?.message || '风险档案加载失败'
  } finally {
    portraitLoading.value = false
  }
}

async function openPortrait(item) {
  selectedPortrait.value = item || null
  portraitVisible.value = true
  portraitWarnings.value = []
  portraitError.value = ''

  if (item?.userId) {
    await loadPortraitWarnings(item.userId)
  }
}

function closePortrait() {
  portraitVisible.value = false
  portraitLoading.value = false
  portraitError.value = ''
  portraitWarnings.value = []
  selectedPortrait.value = null
}

function applyPortraitSuggestion(suggestion) {
  const targetWarning = portraitWarnings.value[0]
  if (!targetWarning) {
    portraitError.value = '当前人员暂无可用于快速复核的预警记录'
    return
  }

  openQuickReview(targetWarning)
  quickReviewForm.reviewComment = suggestion
}

const dashboardTrend = computed(() => {
  const trendPoints = Array.isArray(dashboardData.value?.trendPoints) ? dashboardData.value.trendPoints : []
  const maxTotal = trendPoints.reduce((maxValue, item) => Math.max(maxValue, Number(item.totalCount || 0)), 0)

  return trendPoints.map((item) => {
    const totalCount = Number(item.totalCount || 0)
    const processedCount = Number(item.processedCount || 0)

    return {
      ...item,
      totalCount,
      processedCount,
      unprocessedCount: Number(item.unprocessedCount || 0),
      highRiskCount: Number(item.highRiskCount || 0),
      totalWidth: maxTotal > 0 ? Math.max((totalCount / maxTotal) * 100, totalCount > 0 ? 8 : 0) : 0,
      processedWidth: totalCount > 0 ? (processedCount / totalCount) * 100 : 0,
    }
  })
})

function buildListQuery() {
  return {
    pageNum: queryForm.pageNum,
    pageSize: queryForm.pageSize,
    level: queryForm.level,
    status: queryForm.status,
    type: queryForm.type,
  }
}

function formatDisplayValue(value, labelMap) {
  if (!value) {
    return '--'
  }

  const label = labelMap[value]
  return label || '未识别'
}

function formatDateTime(value) {
  return formatDateTimeDisplay(value, '--')
}

function formatScore(value) {
  if (value === null || value === undefined || value === '') {
    return '--'
  }

  const numberValue = Number(value)
  return Number.isFinite(numberValue) ? numberValue.toFixed(2) : value
}

function formatOverdueHours(value) {
  const minutes = Number(value || 0)
  if (!Number.isFinite(minutes) || minutes <= 0) {
    return '0 小时'
  }
  return `${Math.max(1, Math.round(minutes / 60))} 小时`
}

function buildTrendBars(values = []) {
  const safeValues = values.map((item) => Number(item || 0))
  const maxValue = safeValues.reduce((max, item) => Math.max(max, item), 0)

  return safeValues.map((value) => ({
    value,
    height: maxValue > 0 ? Math.max((value / maxValue) * 100, value > 0 ? 18 : 8) : 8,
  }))
}

function triggerBlobDownload(blob, filename) {
  if (!(blob instanceof Blob) || typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') {
    throw new Error('当前环境暂不支持导出功能')
  }

  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

async function exportDashboard() {
  try {
    const { blob, filename } = await exportStatisticsReport({ exportType: 'WARNING_DASHBOARD' })
    triggerBlobDownload(blob, filename || '预警看板报表.csv')
    ElMessage.success('预警看板已导出')
  } catch (error) {
    listError.value = error?.message || '导出预警看板失败'
  }
}

function resolveLabel(value, labelMap) {
  return value ? labelMap[value] || '' : ''
}

function getWarningById(warningId) {
  const normalizedId = warningId === null || warningId === undefined ? '' : `${warningId}`.trim()
  return warningList.value.find((item) => `${item.id}` === normalizedId) || null
}

function buildWarningTitle(item = {}) {
  const levelLabel = resolveLabel(item.level, WARNING_LEVEL_LABELS)
  const exceptionLabel = resolveLabel(item.exceptionType, WARNING_EXCEPTION_TYPE_LABELS)
  const typeLabel = resolveLabel(item.type, WARNING_TYPE_LABELS)

  if (exceptionLabel) {
    return `${levelLabel || ''}${exceptionLabel}预警`
  }

  if (typeLabel === '风险预警') {
    return `${levelLabel || ''}重点预警` || '重点预警'
  }

  if (typeLabel) {
    return `${levelLabel || ''}${typeLabel}`
  }

  return levelLabel ? `${levelLabel}预警` : '预警记录'
}

function buildWarningRelation(item = {}) {
  const exceptionLabel = resolveLabel(item.exceptionType, WARNING_EXCEPTION_TYPE_LABELS)
  return exceptionLabel ? `${exceptionLabel}异常` : '关联异常记录'
}

function buildSelectedWarningTitle(warningId) {
  const currentItem = getWarningById(warningId)
  return currentItem ? buildWarningTitle(currentItem) : '当前预警'
}

function buildQuickReviewDefaultComment(item = {}) {
  const warningTitle = buildWarningTitle(item)
  const exceptionLabel = formatDisplayValue(item.exceptionType, WARNING_EXCEPTION_TYPE_LABELS)
  if (warningTitle && exceptionLabel && warningTitle !== '预警记录') {
    return `已核对${warningTitle}证据链，当前判定为${exceptionLabel}相关风险。`
  }
  return '已核对预警证据链，请根据现场情况确认或排除异常。'
}

function buildAdviceActor(item = {}) {
  if (item.realName && item.username) {
    return `${item.realName}（${item.username}）`
  }

  return item.realName || item.username || '--'
}

function getWarningLevelClass(level) {
  if (level === 'HIGH') {
    return 'warning-tag--danger'
  }

  if (level === 'MEDIUM') {
    return 'warning-tag--warning'
  }

  if (level === 'LOW') {
    return 'warning-tag--safe'
  }

  return 'warning-tag--neutral'
}

function getWarningStatusClass(status) {
  if (status === 'PROCESSED') {
    return 'warning-tag--safe'
  }

  if (status === 'UNPROCESSED') {
    return 'warning-tag--warning'
  }

  return 'warning-tag--neutral'
}

function getWarningTypeClass(type) {
  if (type === 'RISK_WARNING') {
    return 'warning-tag--info'
  }

  if (type === 'ATTENDANCE_WARNING') {
    return 'warning-tag--neutral'
  }

  return 'warning-tag--neutral'
}

function getDecisionSourceClass(source) {
  if (source === 'MODEL_FUSION') {
    return 'warning-tag--info'
  }

  if (source === 'RULE') {
    return 'warning-tag--neutral'
  }

  return 'warning-tag--neutral'
}

function getPortraitRiskTierClass(tier) {
  if (tier === 'CRITICAL') {
    return 'warning-tag--danger'
  }

  if (tier === 'HIGH') {
    return 'warning-tag--warning'
  }

  if (tier === 'MEDIUM') {
    return 'warning-tag--secondary'
  }

  return 'warning-tag--neutral'
}

async function loadWarningList() {
  listLoading.value = true
  listError.value = ''

  try {
    const [payload, dashboardPayload] = await Promise.all([
      fetchFe06WarningList(buildListQuery()),
      fetchFe06WarningDashboard().catch(() => null),
    ])
    warningList.value = Array.isArray(payload?.records) ? payload.records : []
    listTotal.value = typeof payload?.total === 'number' ? payload.total : warningList.value.length
    if (dashboardPayload) {
      dashboardData.value = {
        ...dashboardData.value,
        ...dashboardPayload,
      }
    }
  } catch (error) {
    warningList.value = []
    listTotal.value = 0
    listError.value = error?.message || '获取预警列表失败'
  } finally {
    listLoading.value = false
  }
}

function handleSearch() {
  queryForm.pageNum = 1
  return loadWarningList()
}

async function openAdvice(id) {
  const requestId = ++latestAdviceRequestId

  selectedWarningId.value = id
  adviceVisible.value = true
  adviceLoading.value = true
  adviceError.value = ''
  adviceDetail.value = null

  try {
    const payload = await fetchFe06WarningAdvice(id)

    if (requestId !== latestAdviceRequestId) {
      return
    }

    adviceDetail.value = payload
  } catch (error) {
    if (requestId !== latestAdviceRequestId) {
      return
    }

    adviceError.value = error?.message || '获取处置建议失败'
  } finally {
    if (requestId === latestAdviceRequestId) {
      adviceLoading.value = false
    }
  }
}

function closeAdvice() {
  adviceVisible.value = false
  latestAdviceRequestId += 1
}

function openReevaluate(warningId) {
  reevaluateForm.warningId = warningId === null || warningId === undefined ? '' : `${warningId}`.trim()
  reevaluateForm.reason = ''
  reevaluateError.value = ''
  reevaluateVisible.value = Boolean(reevaluateForm.warningId)
}

function closeReevaluate() {
  reevaluateVisible.value = false
  reevaluateError.value = ''
  reevaluateForm.reason = ''
}

function openQuickReview(item = {}) {
  const warningId = item?.id === null || item?.id === undefined ? '' : `${item.id}`.trim()
  const exceptionId = item?.exceptionId === null || item?.exceptionId === undefined ? '' : `${item.exceptionId}`.trim()

  if (!warningId || !exceptionId || warningId === 'null' || exceptionId === 'null') {
    return
  }

  quickReviewForm.warningId = warningId
  quickReviewForm.exceptionId = exceptionId
  quickReviewForm.reviewResult = 'CONFIRMED'
  quickReviewForm.reviewComment = buildQuickReviewDefaultComment(item)
  quickReviewError.value = ''
  quickReviewVisible.value = true
}

function closeQuickReview() {
  quickReviewVisible.value = false
  quickReviewError.value = ''
  quickReviewForm.warningId = ''
  quickReviewForm.exceptionId = ''
  quickReviewForm.reviewResult = 'CONFIRMED'
  quickReviewForm.reviewComment = ''
}

async function submitReevaluate() {
  if (!reevaluateForm.warningId || reevaluateLoading.value) {
    return
  }

  reevaluateLoading.value = true
  reevaluateError.value = ''

  try {
    const payload = await fetchFe06WarningReevaluate({
      warningId: reevaluateForm.warningId,
      reason: reevaluateForm.reason.trim(),
    })

    warningList.value = warningList.value.map((item) => {
      if (`${item.id}` !== reevaluateForm.warningId) {
        return item
      }

      return {
        ...item,
        ...payload,
      }
    })

    const shouldRefreshAdvice = adviceVisible.value && `${selectedWarningId.value}` === reevaluateForm.warningId
    const currentWarningId = reevaluateForm.warningId

    closeReevaluate()
    ElMessage.success('预警已完成重新评估')
    await loadWarningList()

    if (shouldRefreshAdvice) {
      await openAdvice(currentWarningId)
    }
  } catch (error) {
    reevaluateError.value = error?.message || '预警重评估失败'
  } finally {
    reevaluateLoading.value = false
  }
}

async function submitQuickReview() {
  if (!quickReviewForm.exceptionId || quickReviewLoading.value) {
    return
  }

  quickReviewLoading.value = true
  quickReviewError.value = ''

  try {
    await submitReview({
      exceptionId: quickReviewForm.exceptionId,
      reviewResult: quickReviewForm.reviewResult,
      reviewComment: quickReviewForm.reviewComment.trim(),
    })

    const shouldRefreshAdvice = adviceVisible.value && `${selectedWarningId.value}` === quickReviewForm.warningId
    const currentWarningId = quickReviewForm.warningId

    closeQuickReview()
    ElMessage.success('预警已完成快速复核')
    await loadWarningList()

    if (shouldRefreshAdvice) {
      await openAdvice(currentWarningId)
    }
  } catch (error) {
    quickReviewError.value = error?.message || '快速复核失败'
  } finally {
    quickReviewLoading.value = false
  }
}

function jumpToException(exceptionId) {
  const normalizedId = exceptionId === null || exceptionId === undefined ? '' : `${exceptionId}`.trim()

  if (!normalizedId || normalizedId === 'null' || normalizedId === 'undefined') {
    return
  }

  router.push({
    path: '/exception',
    query: {
      exceptionId: normalizedId,
    },
  })
}

function jumpToReview(exceptionId) {
  const normalizedId = exceptionId === null || exceptionId === undefined ? '' : `${exceptionId}`.trim()

  if (!normalizedId || normalizedId === 'null' || normalizedId === 'undefined') {
    return
  }

  router.push({
    path: '/review',
    query: {
      exceptionId: normalizedId,
    },
  })
}

onMounted(() => {
  loadWarningList()
})
</script>

<style scoped>
.warning-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.warning-overview-item {
  --console-overview-accent: #0f766e;
}

.warning-page__header,
.warning-list-card__head,
.warning-advice-dialog__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.warning-page__header {
  padding: 28px;
  border-radius: 28px;
  background: linear-gradient(135deg, #052e2b 0%, #0f766e 100%);
  color: #f8fafc;
  box-shadow: 0 24px 60px rgba(15, 118, 110, 0.16);
}

.warning-page__eyebrow {
  margin: 0 0 8px;
  font-size: 12px;
  font-weight: 700;
  color: #0ea5e9;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.warning-page__title,
.warning-list-card__head h3,
.warning-advice-dialog__header h3 {
  margin: 0;
  color: #0f172a;
}

.warning-page__title {
  color: #ffffff;
}

.warning-page__desc,
.warning-list-card__head span {
  margin: 8px 0 0;
  color: #64748b;
}

.warning-page__desc {
  color: rgba(226, 232, 240, 0.88);
}

.warning-page__refresh,
.warning-filter-actions__primary,
.warning-item__action,
.warning-advice-dialog__reevaluate,
.warning-advice-dialog__quick-review,
.warning-advice-dialog__close {
  border: 0;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.warning-page__refresh,
.warning-filter-actions__primary,
.warning-item__action,
.warning-advice-dialog__reevaluate,
.warning-advice-dialog__quick-review,
.warning-advice-dialog__close {
  padding: 10px 16px;
}

.warning-page__refresh,
.warning-filter-actions__primary,
.warning-item__action,
.warning-advice-dialog__reevaluate,
.warning-advice-dialog__quick-review,
.warning-advice-dialog__close {
  background: #2f69b2;
  color: #ffffff;
}

.warning-page__refresh--secondary {
  background: rgba(255, 255, 255, 0.16);
}

.warning-item__action--primary,
.warning-advice-dialog__quick-review {
  background: linear-gradient(135deg, #0f766e 0%, #14b8a6 100%);
}

.warning-item__action--secondary {
  background: #0f172a;
}

.warning-item__action--review {
  background: #245391;
}

.warning-item__action--muted,
.warning-advice-dialog__reevaluate {
  background: rgba(47, 105, 178, 0.12);
  color: #245391;
}

.warning-filter-card,
.warning-list-card,
.warning-advice-dialog__panel,
.warning-dashboard-card {
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 20px;
  background: #ffffff;
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.08);
}

.warning-filter-card,
.warning-list-card,
.warning-dashboard-card {
  padding: 20px;
}

.warning-dashboard-card {
  display: grid;
  gap: 18px;
}

.warning-dashboard-grid {
  display: grid;
  gap: 14px;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
}

.warning-risk-tier-strip {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.warning-risk-tier {
  padding: 8px 12px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 700;
}

.warning-risk-tier--critical {
  background: rgba(127, 29, 29, 0.12);
  color: #991b1b;
}

.warning-risk-tier--high {
  background: rgba(220, 38, 38, 0.12);
  color: #b91c1c;
}

.warning-risk-tier--medium {
  background: rgba(245, 158, 11, 0.14);
  color: #b45309;
}

.warning-risk-tier--low {
  background: rgba(15, 118, 110, 0.1);
  color: #0f766e;
}

.warning-dashboard-metric {
  display: grid;
  gap: 8px;
  padding: 18px;
  border-radius: 18px;
  background: linear-gradient(180deg, #f7fbff 0%, #ffffff 100%);
  border: 1px solid rgba(47, 105, 178, 0.12);
}

.warning-dashboard-metric span {
  font-size: 13px;
  color: #64748b;
}

.warning-dashboard-metric strong {
  font-size: 30px;
  color: #0f172a;
}

.warning-dashboard-metric p {
  margin: 0;
  color: #475569;
  line-height: 1.6;
}

.warning-trend-card {
  display: grid;
  gap: 14px;
  padding: 18px;
  border-radius: 18px;
  background: rgba(248, 250, 252, 0.88);
}

.warning-trend-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.warning-trend-card__head h4 {
  margin: 0;
  color: #0f172a;
}

.warning-trend-card__head span {
  font-size: 12px;
  color: #64748b;
}

.warning-trend-list {
  display: grid;
  gap: 12px;
}

.warning-dashboard-secondary-grid {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
}

.warning-secondary-card {
  display: grid;
  gap: 14px;
  padding: 18px;
  border-radius: 18px;
  background: rgba(248, 250, 252, 0.88);
}

.warning-secondary-card--overdue {
  background: linear-gradient(180deg, #fff7ed 0%, #ffffff 100%);
}

.warning-overdue-buckets {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.warning-overdue-buckets span {
  padding: 8px 12px;
  border-radius: 999px;
  background: rgba(220, 38, 38, 0.1);
  color: #b91c1c;
  font-size: 12px;
  font-weight: 700;
}

.warning-secondary-card--portrait {
  background: linear-gradient(180deg, #eff6ff 0%, #ffffff 100%);
}

.warning-secondary-card--sla {
  background: linear-gradient(180deg, #ecfdf5 0%, #ffffff 100%);
}

.warning-sla-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
}

.warning-sla-item {
  display: grid;
  gap: 8px;
  padding: 14px 16px;
  border-radius: 16px;
  background: #ffffff;
  border: 1px solid rgba(16, 185, 129, 0.16);
}

.warning-sla-item span {
  font-size: 13px;
  color: #64748b;
}

.warning-sla-item strong {
  font-size: 28px;
  color: #0f172a;
}

.warning-sla-item p {
  margin: 0;
  color: #475569;
  line-height: 1.6;
}

.warning-ranking-list,
.warning-overdue-list,
.warning-portrait-list {
  display: grid;
  gap: 12px;
}

.warning-ranking-item,
.warning-overdue-item {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
  padding: 14px 16px;
  border-radius: 16px;
  background: #ffffff;
  border: 1px solid rgba(148, 163, 184, 0.16);
}

.warning-portrait-item {
  display: grid;
  gap: 10px;
  padding: 14px 16px;
  border-radius: 16px;
  background: #ffffff;
  border: 1px solid rgba(59, 130, 246, 0.14);
  cursor: pointer;
}

.warning-portrait-item header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
}

.warning-portrait-item__title-group {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.warning-portrait-item header strong {
  color: #0f172a;
}

.warning-portrait-item header span {
  font-size: 12px;
  color: #64748b;
}

.warning-portrait-item__metrics {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.warning-portrait-item__metrics span {
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(37, 99, 235, 0.08);
  color: #1d4ed8;
  font-size: 12px;
  font-weight: 600;
}

.warning-portrait-item p {
  margin: 0;
  color: #475569;
  line-height: 1.6;
}

.warning-portrait-item__action {
  justify-self: flex-start;
  padding: 8px 12px;
  border: 0;
  border-radius: 12px;
  background: rgba(37, 99, 235, 0.1);
  color: #1d4ed8;
  cursor: pointer;
}

.warning-portrait-dialog {
  position: fixed;
  inset: 0;
  z-index: 33;
}

.warning-portrait-dialog__backdrop {
  position: absolute;
  inset: 0;
  background: rgba(15, 23, 42, 0.54);
}

.warning-portrait-dialog__panel {
  position: relative;
  z-index: 1;
  width: min(760px, calc(100vw - 32px));
  margin: 48px auto;
  display: grid;
  gap: 16px;
  padding: 24px;
  border-radius: 24px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.12);
}

.warning-portrait-dialog__header,
.warning-portrait-dialog__actions {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.warning-portrait-dialog__close {
  border: 0;
  border-radius: 12px;
  background: rgba(148, 163, 184, 0.16);
  color: #334155;
  cursor: pointer;
  padding: 10px 16px;
}

.warning-portrait-dialog__summary {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.warning-portrait-dialog__summary span {
  padding: 8px 12px;
  border-radius: 999px;
  background: rgba(15, 118, 110, 0.08);
  color: #0f766e;
  font-size: 13px;
}

.warning-portrait-dialog__suggestions {
  display: grid;
  gap: 12px;
  padding: 16px 18px;
  border-radius: 18px;
  background: rgba(255, 247, 237, 0.72);
}

.warning-portrait-suggestion-list {
  display: grid;
  gap: 8px;
}

.warning-portrait-suggestion-item {
  display: grid;
  gap: 10px;
  padding: 12px 14px;
  border-radius: 14px;
  background: #ffffff;
  border: 1px solid rgba(249, 115, 22, 0.14);
}

.warning-portrait-suggestion-item p {
  margin: 0;
  color: #7c2d12;
  line-height: 1.7;
}

.warning-portrait-dialog__timeline {
  display: grid;
  gap: 12px;
  padding: 16px 18px;
  border-radius: 18px;
  background: rgba(239, 246, 255, 0.56);
}

.warning-portrait-timeline {
  display: grid;
  gap: 12px;
}

.warning-portrait-timeline__item {
  display: grid;
  grid-template-columns: 16px minmax(0, 1fr);
  gap: 12px;
  align-items: flex-start;
}

.warning-portrait-timeline__dot {
  width: 12px;
  height: 12px;
  margin-top: 4px;
  border-radius: 50%;
  background: linear-gradient(135deg, #f97316 0%, #dc2626 100%);
}

.warning-portrait-timeline__head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.warning-portrait-timeline__head strong {
  color: #0f172a;
}

.warning-portrait-timeline__head span {
  font-size: 12px;
  color: #64748b;
}

.warning-portrait-timeline__content p {
  margin: 8px 0 0;
  color: #475569;
  line-height: 1.6;
}

.warning-portrait-dialog__list {
  display: grid;
  gap: 12px;
}

.warning-portrait-dialog__item {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
  padding: 14px 16px;
  border-radius: 16px;
  background: #ffffff;
  border: 1px solid rgba(148, 163, 184, 0.16);
}

.warning-portrait-dialog__item strong {
  color: #0f172a;
}

.warning-portrait-dialog__item p {
  margin: 8px 0 0;
  color: #64748b;
  line-height: 1.6;
}

.warning-ranking-item strong,
.warning-overdue-item strong {
  color: #0f172a;
}

.warning-ranking-item p,
.warning-overdue-item p {
  margin: 8px 0 0;
  color: #64748b;
  line-height: 1.5;
}

.warning-type-trend {
  display: flex;
  align-items: flex-end;
  gap: 6px;
  margin-top: 10px;
  min-height: 42px;
}

.warning-type-trend--wide span {
  width: 14px;
}

.warning-type-trend span {
  width: 10px;
  border-radius: 999px 999px 3px 3px;
  background: linear-gradient(180deg, #38bdf8 0%, #0f766e 100%);
}

.warning-dashboard-card--compact {
  margin-top: 18px;
}

.warning-continuous-trend-grid {
  display: grid;
  gap: 14px;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}

.warning-continuous-trend-item {
  display: grid;
  gap: 10px;
  padding: 18px;
  border-radius: 18px;
  background: linear-gradient(180deg, #ecfeff 0%, #ffffff 100%);
  border: 1px solid rgba(14, 165, 233, 0.14);
}

.warning-continuous-trend-item p {
  margin: 0;
  color: #475569;
  line-height: 1.6;
}

.warning-ranking-item > span,
.warning-overdue-item > span {
  font-size: 13px;
  font-weight: 700;
  color: #0f766e;
}

.warning-trend-item {
  display: grid;
  gap: 8px;
}

.warning-trend-item__head,
.warning-trend-item__meta {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.warning-trend-item__head strong {
  color: #0f172a;
}

.warning-trend-item__head span,
.warning-trend-item__meta span {
  font-size: 12px;
  color: #64748b;
}

.warning-trend-item__bar {
  position: relative;
  height: 10px;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.18);
  overflow: hidden;
}

.warning-trend-item__bar-total,
.warning-trend-item__bar-processed {
  position: absolute;
  inset: 0 auto 0 0;
  border-radius: 999px;
}

.warning-trend-item__bar-total {
  background: rgba(15, 118, 110, 0.22);
}

.warning-trend-item__bar-processed {
  background: linear-gradient(135deg, #0f766e 0%, #14b8a6 100%);
}

.warning-filter-grid,
.warning-advice-grid,
.warning-item__grid {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
}

.warning-advice-flow {
  display: grid;
  gap: 18px;
}

.warning-advice-strip {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.warning-advice-section {
  display: grid;
  gap: 14px;
  padding: 18px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.78);
  border: 1px solid rgba(148, 163, 184, 0.14);
}

.warning-advice-section__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.warning-advice-section__head h4 {
  margin: 0;
  color: #0f172a;
}

.warning-advice-section__head span {
  font-size: 12px;
  color: #64748b;
}

.warning-advice-section__summary {
  margin: 0;
  color: #334155;
  line-height: 1.7;
}

.warning-advice-grid__full {
  grid-column: 1 / -1;
}

.warning-filter-field,
.warning-advice-grid div,
.warning-item__grid div {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.warning-filter-field span,
.warning-item__grid dt,
.warning-advice-grid dt {
  font-size: 12px;
  font-weight: 700;
  color: #64748b;
}

.warning-filter-field input,
.warning-filter-field select,
.warning-filter-field textarea {
  min-height: 40px;
  border: 1px solid rgba(148, 163, 184, 0.35);
  border-radius: 12px;
  padding: 0 12px;
}

.warning-filter-field textarea {
  min-height: 120px;
  padding: 12px;
  resize: vertical;
}

.warning-filter-field--full {
  width: 100%;
}

.warning-filter-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}

.warning-feedback {
  margin: 0;
  border-radius: 14px;
  background: #f8fafc;
  padding: 14px 16px;
  color: #475569;
}

.warning-feedback--error {
  background: #fef2f2;
  color: #b91c1c;
}

.warning-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.warning-item {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  border-radius: 18px;
  background: linear-gradient(180deg, #f8fafc 0%, #ffffff 100%);
  border: 1px solid rgba(148, 163, 184, 0.16);
  padding: 18px;
}

.warning-item--overdue {
  border-color: rgba(220, 38, 38, 0.26);
  background: linear-gradient(180deg, #fff7f7 0%, #ffffff 100%);
}

.warning-item__main {
  flex: 1;
  display: grid;
  gap: 12px;
}

.warning-item__title-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
}

.warning-item__title-main {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.warning-item__title-row strong,
.warning-item__title-row span {
  display: inline-flex;
  align-items: center;
  min-height: 30px;
  padding: 0 10px;
  border-radius: 999px;
}

.warning-item__title-row strong {
  background: rgba(47, 105, 178, 0.08);
  color: #245391;
}

.warning-item__title-row span {
  background: #f8fafc;
  color: #64748b;
}

.warning-item__alert {
  display: inline-flex;
  align-items: center;
  min-height: 30px;
  padding: 0 10px;
  border-radius: 999px;
  background: rgba(220, 38, 38, 0.12);
  color: #b91c1c;
  font-size: 12px;
  font-weight: 700;
}

.warning-item__grid {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(auto-fit, minmax(132px, 1fr));
  margin: 0;
}

.warning-item__grid dd,
.warning-advice-grid dd {
  margin: 0;
  color: #0f172a;
}

.warning-tag {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 0 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
}

.warning-tag--danger {
  background: rgba(239, 68, 68, 0.12);
  color: #b91c1c;
}

.warning-tag--warning {
  background: rgba(245, 158, 11, 0.14);
  color: #b45309;
}

.warning-tag--safe {
  background: rgba(34, 197, 94, 0.12);
  color: #166534;
}

.warning-tag--info {
  background: rgba(47, 105, 178, 0.12);
  color: #245391;
}

.warning-tag--neutral {
  background: rgba(148, 163, 184, 0.18);
  color: #475569;
}

.warning-item__summary {
  margin: 0;
  color: #334155;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.warning-item__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.warning-advice-dialog {
  position: fixed;
  inset: 0;
  z-index: 30;
}

.warning-advice-dialog__backdrop {
  position: absolute;
  inset: 0;
  background: rgba(15, 23, 42, 0.54);
}

.warning-advice-dialog__panel {
  position: relative;
  z-index: 1;
  width: min(840px, calc(100vw - 32px));
  max-height: calc(100vh - 32px);
  overflow-y: auto;
  margin: 16px auto;
  padding: 24px;
  border-radius: 28px;
  background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
}

.warning-advice-dialog__actions,
.warning-reevaluate-dialog__actions,
.warning-reevaluate-dialog__header,
.warning-quick-review-dialog__actions,
.warning-quick-review-dialog__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.warning-quick-review-dialog {
  position: fixed;
  inset: 0;
  z-index: 32;
}

.warning-quick-review-dialog__backdrop {
  position: absolute;
  inset: 0;
  background: rgba(15, 23, 42, 0.54);
}

.warning-quick-review-dialog__panel {
  position: relative;
  z-index: 1;
  width: min(620px, calc(100vw - 32px));
  margin: 48px auto;
  display: grid;
  gap: 16px;
  padding: 24px;
  border-radius: 24px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.12);
}

.warning-reevaluate-dialog {
  position: fixed;
  inset: 0;
  z-index: 31;
}

.warning-reevaluate-dialog__backdrop {
  position: absolute;
  inset: 0;
  background: rgba(15, 23, 42, 0.54);
}

.warning-reevaluate-dialog__panel {
  position: relative;
  z-index: 1;
  width: min(620px, calc(100vw - 32px));
  margin: 48px auto;
  display: grid;
  gap: 16px;
  padding: 24px;
  border-radius: 24px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.12);
}

.warning-reevaluate-dialog__close {
  border: 0;
  border-radius: 12px;
  background: rgba(148, 163, 184, 0.16);
  color: #334155;
  cursor: pointer;
  padding: 10px 16px;
}

.warning-quick-review-dialog__close {
  border: 0;
  border-radius: 12px;
  background: rgba(148, 163, 184, 0.16);
  color: #334155;
  cursor: pointer;
  padding: 10px 16px;
}

@media (max-width: 960px) {
  .warning-item,
  .warning-page__header,
  .warning-list-card__head,
  .warning-advice-dialog__header,
  .warning-advice-dialog__actions,
  .warning-reevaluate-dialog__header,
  .warning-reevaluate-dialog__actions,
  .warning-quick-review-dialog__header,
  .warning-quick-review-dialog__actions {
    flex-direction: column;
  }

  .warning-item__actions,
  .warning-page__refresh,
  .warning-filter-actions__primary,
  .warning-item__action,
  .warning-advice-dialog__close,
  .warning-advice-dialog__reevaluate,
  .warning-advice-dialog__quick-review,
  .warning-reevaluate-dialog__close,
  .warning-quick-review-dialog__close {
    width: 100%;
  }
}
</style>
