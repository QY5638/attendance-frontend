<script setup>
import { ElMessage } from 'element-plus'
import { computed, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

import ConsoleHero from '../../components/console/ConsoleHero.vue'
import ConsoleOverviewCards from '../../components/console/ConsoleOverviewCards.vue'
import {
  fetchNotificationDetail,
  fetchNotificationList,
  markAllNotificationsRead,
  markNotificationRead,
} from '../../api/notification'
import {
  fetchFe06WarningAdvice,
  fetchWarningInteractions,
  replyWarningExplanation,
} from '../../api/fe06-warning'
import { useAuthStore } from '../../store/auth'
import { useNotificationStore } from '../../store/notification'
import { formatDateTimeDisplay } from '../../utils/date-time'
import { formatExceptionType } from '../../utils/exception-display'
import { formatReadableText } from '../../utils/readable-text'

const CATEGORY_LABELS = {
  EXCEPTION_NOTICE: '异常通知',
  WARNING_CREATED: '预警提醒',
  REQUEST_EXPLANATION: '说明请求',
  EMPLOYEE_REPLY: '员工回复',
  REVIEW_RESULT: '处理结果',
  REPAIR_RESULT: '补卡结果',
  FACE_REGISTER_RESULT: '人脸采集结果',
  EMPLOYEE_REPLY_REMINDER: '回复提醒',
  WARNING_OVERDUE_REMINDER: '超时催办',
}

const RESULT_NOTICE_CATEGORIES = ['REVIEW_RESULT', 'EMPLOYEE_REPLY', 'REPAIR_RESULT', 'FACE_REGISTER_RESULT']

const INTERACTION_STATUS_LABELS = {
  NONE: '待处理',
  WAIT_EMPLOYEE_REPLY: '待员工说明',
  EMPLOYEE_REPLIED: '员工已回复',
  RESULT_SENT: '结果已通知',
}

const LEVEL_LABELS = {
  HIGH: '高风险',
  MEDIUM: '中风险',
  LOW: '低风险',
  INFO: '系统通知',
}

const STATUS_LABELS = {
  UNPROCESSED: '待处理',
  PROCESSED: '已处理',
}

const REVIEW_RESULT_LABELS = {
  CONFIRMED: '确认异常',
  REJECTED: '排除异常',
}

const authStore = useAuthStore()
const notificationStore = useNotificationStore()
const router = useRouter()

const activeTab = ref('all')
const listLoading = ref(false)
const listError = ref('')
const notifications = ref([])

const detailVisible = ref(false)
const detailLoading = ref(false)
const detailError = ref('')
const detailNotification = ref(null)
const detailAdvice = ref(null)
const detailInteractions = ref([])

const replyLoading = ref(false)
const replyError = ref('')
const replyForm = reactive({
  content: '',
})

const overviewItems = computed(() => [
  {
    key: 'unread',
    label: '未读通知',
    value: Number(notificationStore.unreadCount || 0),
    desc: '系统会实时更新未读数量',
  },
  {
    key: 'pending',
    label: '待我说明',
    value: pendingReplyCount.value,
    desc: '员工需要补充说明的预警事项',
  },
  {
    key: 'completed',
    label: '已出结果',
    value: resultNoticeCount.value,
    desc: '已形成最终复核结论的通知',
  },
])

const pendingReplyCount = computed(() => notifications.value.filter((item) => isReplyAction(item)).length)
const resultNoticeCount = computed(() => notifications.value.filter((item) => RESULT_NOTICE_CATEGORIES.includes(item.category)).length)

const displayNotifications = computed(() => {
  if (activeTab.value === 'unread') {
    return notifications.value.filter((item) => Number(item.readStatus || 0) === 0)
  }

  if (activeTab.value === 'reply') {
    return notifications.value.filter((item) => isReplyAction(item))
  }

  if (activeTab.value === 'result') {
    return notifications.value.filter((item) => RESULT_NOTICE_CATEGORIES.includes(item.category))
  }

  return notifications.value
})

const canSubmitReply = computed(() => {
  return authStore.roleCode === 'EMPLOYEE'
    && detailNotification.value
    && detailNotification.value.actionCode === 'REPLY'
    && detailAdvice.value?.interactionStatus === 'WAIT_EMPLOYEE_REPLY'
})

const currentWarningTitle = computed(() => {
  const advice = detailAdvice.value
  if (!advice) {
    return detailNotification.value?.title || '消息详情'
  }

  const exceptionLabel = formatExceptionType({
    type: advice.exceptionType,
    sourceType: advice.exceptionSourceType,
  })
  return exceptionLabel ? `${exceptionLabel}处理详情` : detailNotification.value?.title || '消息详情'
})

void loadNotifications()

watch(
  () => notificationStore.eventVersion,
  () => {
    void loadNotifications()
  },
)

function formatDateTime(value) {
  return formatDateTimeDisplay(value, '--')
}

function formatLevel(level) {
  return LEVEL_LABELS[level] || LEVEL_LABELS.INFO
}

function formatCategory(category) {
  return CATEGORY_LABELS[category] || '系统通知'
}

function formatInteractionStatus(status) {
  return INTERACTION_STATUS_LABELS[status] || '待处理'
}

function formatWarningStatus(status) {
  return STATUS_LABELS[status] || '待处理'
}

function formatReviewResult(result) {
  return REVIEW_RESULT_LABELS[result] || '--'
}

function isReplyAction(item = {}) {
  return item.actionCode === 'REPLY'
}

async function loadNotifications() {
  listLoading.value = true
  listError.value = ''

  try {
    const payload = await fetchNotificationList({
      pageNum: 1,
      pageSize: 50,
    })
    notifications.value = Array.isArray(payload?.records) ? payload.records : []
    void notificationStore.refreshUnreadCount()
  } catch (error) {
    notifications.value = []
    listError.value = error?.message || '获取通知列表失败'
  } finally {
    listLoading.value = false
  }
}

async function markAsRead(item = {}) {
  const notificationId = item?.id
  if (!notificationId || Number(item.readStatus || 0) === 1) {
    return
  }

  await markNotificationRead(notificationId)
  notifications.value = notifications.value.map((current) => {
    if (`${current.id}` !== `${notificationId}`) {
      return current
    }

    return {
      ...current,
      readStatus: 1,
    }
  })
  await notificationStore.refreshUnreadCount()
}

async function openDetail(item = {}) {
  if (!item?.id) {
    return
  }

  detailVisible.value = true
  detailLoading.value = true
  detailError.value = ''
  detailAdvice.value = null
  detailInteractions.value = []
  replyError.value = ''
  replyForm.content = ''

  try {
    const notification = await fetchNotificationDetail(item.id)
    detailNotification.value = notification

    if (Number(notification?.readStatus || 0) === 0) {
      await markAsRead(notification)
      detailNotification.value = {
        ...notification,
        readStatus: 1,
      }
    }

    const warningId = detailNotification.value?.businessType === 'WARNING' ? detailNotification.value?.businessId : null
    const [advice, interactions] = await Promise.all([
      warningId ? fetchFe06WarningAdvice(warningId).catch(() => null) : Promise.resolve(null),
      warningId ? fetchWarningInteractions(warningId).catch(() => []) : Promise.resolve([]),
    ])

    detailAdvice.value = advice
    detailInteractions.value = Array.isArray(interactions) ? interactions : []
  } catch (error) {
    detailNotification.value = null
    detailAdvice.value = null
    detailInteractions.value = []
    detailError.value = error?.message || '通知详情加载失败'
  } finally {
    detailLoading.value = false
  }
}

function closeDetail() {
  detailVisible.value = false
  detailLoading.value = false
  detailError.value = ''
  detailNotification.value = null
  detailAdvice.value = null
  detailInteractions.value = []
  replyError.value = ''
  replyForm.content = ''
}

async function handleMarkAllRead() {
  if (!notifications.value.length) {
    return
  }

  try {
    await markAllNotificationsRead()
    notifications.value = notifications.value.map((item) => ({
      ...item,
      readStatus: 1,
    }))
    await notificationStore.refreshUnreadCount()
    ElMessage.success('已全部标记为已读')
  } catch (error) {
    listError.value = error?.message || '全部标记已读失败'
  }
}

async function submitReply() {
  if (!canSubmitReply.value || !detailNotification.value?.businessId || replyLoading.value) {
    return
  }

  replyLoading.value = true
  replyError.value = ''

  try {
    await replyWarningExplanation(detailNotification.value.businessId, {
      content: replyForm.content.trim(),
    })
    ElMessage.success('说明已提交，管理员将尽快处理')
    await loadNotifications()
    await openDetail(detailNotification.value)
  } catch (error) {
    replyError.value = error?.message || '提交说明失败'
  } finally {
    replyLoading.value = false
  }
}

function jumpToWarning() {
  if (!detailNotification.value?.businessId) {
    return
  }

  router.push({
    path: '/warning',
  })
}
</script>

<template>
  <section class="message-center">
    <ConsoleHero
      title="消息中心"
      description="集中查看异常通知、说明请求、员工回复和复核结果，支持在站内完成交互闭环。"
      theme="indigo"
    >
      <template #actions>
        <button type="button" class="message-center__hero-action" @click="loadNotifications">刷新</button>
        <button type="button" class="message-center__hero-action message-center__hero-action--secondary" @click="handleMarkAllRead">全部已读</button>
      </template>
    </ConsoleHero>

    <ConsoleOverviewCards :items="overviewItems" accent="#2f69b2" />

    <section class="message-center__tabs" aria-label="通知筛选">
      <button :class="['message-center__tab', { 'message-center__tab--active': activeTab === 'all' }]" @click="activeTab = 'all'">全部</button>
      <button :class="['message-center__tab', { 'message-center__tab--active': activeTab === 'unread' }]" @click="activeTab = 'unread'">未读</button>
      <button :class="['message-center__tab', { 'message-center__tab--active': activeTab === 'reply' }]" @click="activeTab = 'reply'">待我说明</button>
      <button :class="['message-center__tab', { 'message-center__tab--active': activeTab === 'result' }]" @click="activeTab = 'result'">处理结果</button>
    </section>

    <section class="message-center__list-card">
      <p v-if="listError" class="message-center__feedback message-center__feedback--error">{{ listError }}</p>
      <p v-else-if="listLoading" class="message-center__feedback">通知列表加载中...</p>
      <p v-else-if="!displayNotifications.length" class="message-center__feedback">当前没有符合条件的通知</p>

      <div v-else class="message-center__list">
        <article v-for="item in displayNotifications" :key="item.id" class="message-card">
          <header class="message-card__head">
            <div>
              <p class="message-card__eyebrow">{{ formatCategory(item.category) }}</p>
              <h3>{{ item.title }}</h3>
            </div>
            <span class="message-card__time">{{ formatDateTime(item.createTime) }}</span>
          </header>

          <div class="message-card__meta">
            <span class="message-card__tag">{{ formatLevel(item.level) }}</span>
            <span class="message-card__tag">{{ Number(item.readStatus || 0) === 1 ? '已读' : '未读' }}</span>
            <span v-if="item.deadline" class="message-card__tag message-card__tag--deadline">截止 {{ formatDateTime(item.deadline) }}</span>
          </div>

          <p class="message-card__content">{{ formatReadableText(item.content, '历史通知内容无法直接显示，请联系管理员查看原始记录。') }}</p>

          <footer class="message-card__footer">
            <span>发送方：{{ item.senderName || '系统' }}</span>
            <div class="message-card__actions">
              <button type="button" class="message-card__action" @click="openDetail(item)">
                {{ isReplyAction(item) ? '查看并说明' : '查看详情' }}
              </button>
              <button v-if="Number(item.readStatus || 0) === 0" type="button" class="message-card__action message-card__action--secondary" @click="markAsRead(item)">标记已读</button>
            </div>
          </footer>
        </article>
      </div>
    </section>

    <section v-if="detailVisible" class="message-detail-dialog">
      <div class="message-detail-dialog__backdrop" @click="closeDetail"></div>

      <div class="message-detail-dialog__panel">
        <header class="message-detail-dialog__header">
          <div>
            <p class="message-card__eyebrow">消息详情</p>
            <h3>{{ currentWarningTitle }}</h3>
          </div>
          <div class="message-detail-dialog__actions">
            <button v-if="authStore.roleCode === 'ADMIN'" type="button" class="message-card__action message-card__action--secondary" @click="jumpToWarning">前往预警页</button>
            <button type="button" class="message-card__action" @click="closeDetail">关闭</button>
          </div>
        </header>

        <p v-if="detailLoading" class="message-center__feedback">详情加载中...</p>
        <p v-else-if="detailError" class="message-center__feedback message-center__feedback--error">{{ detailError }}</p>
        <div v-else-if="detailNotification" class="message-detail-dialog__body">
          <section class="message-detail-dialog__section">
            <div class="message-detail-dialog__summary">
              <div>
                <dt>通知类型</dt>
                <dd>{{ formatCategory(detailNotification.category) }}</dd>
              </div>
              <div>
                <dt>通知时间</dt>
                <dd>{{ formatDateTime(detailNotification.createTime) }}</dd>
              </div>
              <div>
                <dt>发送方</dt>
                <dd>{{ detailNotification.senderName || '系统' }}</dd>
              </div>
              <div>
                <dt>截止时间</dt>
                <dd>{{ formatDateTime(detailNotification.deadline) }}</dd>
              </div>
            </div>
            <p class="message-detail-dialog__content">{{ formatReadableText(detailNotification.content, '历史通知内容无法直接显示，请联系管理员查看原始记录。') }}</p>
          </section>

          <section v-if="detailAdvice" class="message-detail-dialog__section">
            <div class="message-detail-dialog__section-head">
              <h4>预警概况</h4>
              <span>{{ formatWarningStatus(detailAdvice.status) }}</span>
            </div>

            <div class="message-detail-dialog__summary">
              <div>
                <dt>异常类型</dt>
                <dd>{{ formatExceptionType({ type: detailAdvice.exceptionType, sourceType: detailAdvice.exceptionSourceType }) }}</dd>
              </div>
              <div>
                <dt>风险等级</dt>
                <dd>{{ formatLevel(detailAdvice.level) }}</dd>
              </div>
              <div>
                <dt>交互状态</dt>
                <dd>{{ formatInteractionStatus(detailAdvice.interactionStatus) }}</dd>
              </div>
              <div>
                <dt>复核结果</dt>
                <dd>{{ formatReviewResult(detailAdvice.reviewResult) }}</dd>
              </div>
            </div>

            <p class="message-detail-dialog__content"><strong>系统摘要：</strong>{{ formatReadableText(detailAdvice.aiSummary, '暂无系统摘要') }}</p>
            <p class="message-detail-dialog__content"><strong>处置建议：</strong>{{ formatReadableText(detailAdvice.disposeSuggestion, '暂无处置建议') }}</p>
            <p v-if="detailAdvice.reviewComment" class="message-detail-dialog__content"><strong>复核意见：</strong>{{ formatReadableText(detailAdvice.reviewComment, '暂无复核意见') }}</p>
          </section>

          <section class="message-detail-dialog__section">
            <div class="message-detail-dialog__section-head">
              <h4>处理时间线</h4>
              <span>{{ detailInteractions.length }} 条记录</span>
            </div>

            <div v-if="detailInteractions.length" class="message-timeline">
              <article v-for="item in detailInteractions" :key="item.id" class="message-timeline__item">
                <div class="message-timeline__head">
                  <strong>{{ item.senderName || item.senderRole || '系统' }}</strong>
                  <span>{{ formatDateTime(item.createTime) }}</span>
                </div>
                <p>{{ formatReadableText(item.content, '历史处理记录内容无法直接显示，请联系管理员查看原始记录。') }}</p>
              </article>
            </div>
            <p v-else class="message-center__feedback">当前还没有交互记录</p>
          </section>

          <section v-if="canSubmitReply" class="message-detail-dialog__section">
            <div class="message-detail-dialog__section-head">
              <h4>补充说明</h4>
              <span>提交后管理员会收到提醒</span>
            </div>

            <p v-if="replyError" class="message-center__feedback message-center__feedback--error">{{ replyError }}</p>
            <textarea v-model="replyForm.content" class="message-detail-dialog__textarea" rows="5" placeholder="请输入本次异常或打卡情况说明"></textarea>
            <div class="message-detail-dialog__reply-actions">
              <button type="button" class="message-card__action" :disabled="replyLoading" @click="submitReply">
                {{ replyLoading ? '提交中...' : '提交说明' }}
              </button>
            </div>
          </section>
        </div>
      </div>
    </section>
  </section>
</template>

<style scoped>
.message-center {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.message-center__hero-action,
.message-card__action,
.message-center__tab {
  border: 0;
  border-radius: 12px;
  cursor: pointer;
}

.message-center__hero-action,
.message-card__action {
  padding: 10px 16px;
  background: #2f69b2;
  color: #ffffff;
}

.message-card__action--secondary {
  background: rgba(47, 105, 178, 0.12);
  color: #245391;
}

.message-center__hero-action--secondary {
  background: linear-gradient(135deg, #1e3a8a, #1d4ed8);
  color: #ffffff;
  border: 1px solid rgba(30, 58, 138, 0.9);
  font-weight: 700;
  box-shadow: 0 8px 18px rgba(29, 78, 216, 0.26);
}

.message-center__hero-action--secondary:hover {
  background: linear-gradient(135deg, #1d4ed8, #2563eb);
  color: #ffffff;
}

.message-center__tabs {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.message-center__tab {
  padding: 10px 16px;
  background: #e2e8f0;
  color: #334155;
  font-weight: 600;
}

.message-center__tab--active {
  background: #1d4ed8;
  color: #ffffff;
}

.message-center__list-card {
  padding: 24px;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 24px 48px rgba(15, 23, 42, 0.08);
}

.message-center__list {
  display: grid;
  gap: 16px;
}

.message-card {
  padding: 20px;
  border: 1px solid rgba(148, 163, 184, 0.22);
  border-radius: 20px;
  background: linear-gradient(180deg, rgba(248, 250, 252, 0.96), rgba(241, 245, 249, 0.92));
}

.message-card__head,
.message-card__footer,
.message-timeline__head,
.message-detail-dialog__header,
.message-detail-dialog__section-head {
  display: flex;
  justify-content: space-between;
  gap: 16px;
}

.message-card__eyebrow {
  margin: 0 0 8px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: #2563eb;
  text-transform: uppercase;
}

.message-card h3,
.message-detail-dialog__header h3,
.message-detail-dialog__section-head h4 {
  margin: 0;
  color: #0f172a;
}

.message-card__time,
.message-card__footer,
.message-detail-dialog__section-head span,
.message-timeline__head span {
  color: #64748b;
  font-size: 13px;
}

.message-card__meta {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 14px;
}

.message-card__tag {
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(37, 99, 235, 0.1);
  color: #1d4ed8;
  font-size: 12px;
  font-weight: 600;
}

.message-card__tag--deadline {
  background: rgba(245, 158, 11, 0.16);
  color: #b45309;
}

.message-card__content,
.message-detail-dialog__content,
.message-timeline__item p,
.message-center__feedback {
  margin: 14px 0 0;
  color: #334155;
  line-height: 1.7;
}

.message-card__footer {
  align-items: center;
  margin-top: 16px;
  flex-wrap: wrap;
}

.message-card__actions,
.message-detail-dialog__actions,
.message-detail-dialog__reply-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.message-center__feedback--error {
  color: #b91c1c;
}

.message-detail-dialog {
  position: fixed;
  inset: 0;
  z-index: 40;
}

.message-detail-dialog__backdrop {
  position: absolute;
  inset: 0;
  background: rgba(15, 23, 42, 0.45);
}

.message-detail-dialog__panel {
  position: relative;
  width: min(960px, calc(100vw - 32px));
  max-height: calc(100vh - 32px);
  margin: 16px auto;
  overflow: auto;
  border-radius: 28px;
  background: #ffffff;
  padding: 24px;
  box-shadow: 0 24px 60px rgba(15, 23, 42, 0.24);
}

.message-detail-dialog__body {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.message-detail-dialog__section {
  padding: 20px;
  border-radius: 20px;
  background: #f8fafc;
}

.message-detail-dialog__summary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 14px;
}

.message-detail-dialog__summary dt {
  font-size: 12px;
  color: #64748b;
}

.message-detail-dialog__summary dd {
  margin: 8px 0 0;
  color: #0f172a;
  font-weight: 600;
}

.message-timeline {
  display: grid;
  gap: 14px;
}

.message-timeline__item {
  padding-left: 16px;
  border-left: 3px solid rgba(37, 99, 235, 0.22);
}

.message-detail-dialog__textarea {
  width: 100%;
  margin-top: 14px;
  padding: 12px 14px;
  border: 1px solid rgba(148, 163, 184, 0.32);
  border-radius: 16px;
  resize: vertical;
  font: inherit;
}

@media (max-width: 768px) {
  .message-card__head,
  .message-card__footer,
  .message-detail-dialog__header,
  .message-detail-dialog__section-head {
    flex-direction: column;
  }
}
</style>
