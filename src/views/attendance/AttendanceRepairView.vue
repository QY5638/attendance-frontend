<template>
  <section class="repair-view">
    <ConsoleHero
      title="补卡申请"
      description="补卡申请面向未打卡场景，提交缺失时间和原因后由系统登记为补卡申请。"
      theme="indigo"
      :cards="heroCards"
    />

    <div class="repair-view__grid">
      <section class="repair-card repair-card--form">
        <div class="repair-card__head">
          <div>
            <p class="repair-card__eyebrow">申请表单</p>
            <h2>填写未打卡补卡信息</h2>
          </div>
          <span class="repair-card__badge">独立申请</span>
        </div>

        <p class="repair-card__hint">仅在确实存在未打卡时提交补卡申请；若该时间点已存在打卡记录，系统会直接拦截。</p>

        <div v-if="submitError" class="repair-card__error">{{ submitError }}</div>
        <div v-else-if="submitNotice" class="repair-card__success">{{ submitNotice }}</div>

        <label class="repair-field">
          <span>打卡类型</span>
          <select v-model="form.checkType" data-testid="attendance-repair-page-check-type">
            <option value="IN">上班打卡</option>
            <option value="OUT">下班打卡</option>
          </select>
        </label>

        <label class="repair-field">
          <span>缺失打卡时间</span>
          <input v-model="form.checkTime" data-testid="attendance-repair-page-check-time" type="text" autocomplete="off" />
          <p class="repair-field__tip">点击右侧“带入时间”自动填充。</p>
        </label>

        <label class="repair-field">
          <span>补卡说明</span>
          <textarea v-model="form.repairReason" data-testid="attendance-repair-page-reason" rows="4" placeholder="请说明未打卡原因"></textarea>
        </label>

        <div class="repair-card__actions">
          <button type="button" @click="resetForm">重置</button>
          <button
            type="button"
            class="repair-card__primary"
            data-testid="attendance-repair-page-submit"
            :disabled="isSubmitDisabled"
            @click="handleSubmit"
          >
            {{ submitting ? '提交中...' : '提交补卡申请' }}
          </button>
        </div>
      </section>

      <section class="repair-card repair-card--aside">
        <div class="repair-card__head">
          <div>
            <p class="repair-card__eyebrow">可补卡参考</p>
            <h2>近期异常记录</h2>
          </div>
          <span class="repair-card__badge">仅供参考</span>
        </div>

        <p class="repair-card__hint">下方仅展示近期被系统判定为可补卡的异常记录，便于你快速带入时间；正常记录不会出现在这里。</p>

        <div v-if="referenceError" class="repair-card__error">{{ referenceError }}</div>
        <div v-else-if="loadingReferences" class="repair-card__empty">正在加载补卡参考...</div>
        <div v-else-if="!repairableRecords.length" class="repair-card__empty">近期待补卡参考为空。若你明确存在未打卡，可手动填写缺失时间后提交申请。</div>

        <div v-else class="repair-card__reference-list">
          <article v-for="record in repairableRecords" :key="record.id" class="repair-reference">
            <div>
              <strong>{{ formatCheckType(record.checkType) }}</strong>
              <p>{{ formatDateTime(record.checkTime) }}</p>
              <span>{{ formatRecordStatus(record.status) }}</span>
            </div>
            <button type="button" @click="fillFromRecord(record)">带入时间</button>
          </article>
        </div>
      </section>
    </div>
  </section>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'

import ConsoleHero from '../../components/console/ConsoleHero.vue'
import { getMyAttendanceRecordRequest, submitAttendanceRepairRequest } from '../../api/attendance'
import { formatDateTimeDisplay } from '../../utils/date-time'

const RECORD_STATUS_LABELS = {
  ABNORMAL: '异常',
  ABSENT: '缺勤',
  LATE: '迟到',
  EARLY_LEAVE: '早退',
}

const REPAIRABLE_RECORD_STATUSES = new Set(['ABNORMAL', 'ABSENT', 'LATE', 'EARLY_LEAVE'])

const form = reactive({
  checkType: 'IN',
  checkTime: '',
  repairReason: '',
})

const loadingReferences = ref(false)
const submitting = ref(false)
const submitError = ref('')
const submitNotice = ref('')
const referenceError = ref('')
const repairableRecords = ref([])

const heroCards = computed(() => [
  {
    key: 'target',
    label: '申请目标',
    value: '未打卡补卡',
  },
  {
    key: 'type',
    label: '当前类型',
    value: formatCheckType(form.checkType),
  },
  {
    key: 'reference',
    label: '参考条数',
    value: `${repairableRecords.value.length} 条`,
  },
])

const isSubmitDisabled = computed(() => {
  return Boolean(submitting.value || !form.checkType || !form.checkTime || !form.repairReason.trim())
})

function readWrappedData(response) {
  if (!response || typeof response !== 'object' || response.code !== 200) {
    throw new Error(response?.message || '请求失败，请稍后重试')
  }

  return response.data
}

function readRecordPage(response) {
  const payload = readWrappedData(response)
  if (!payload || !Array.isArray(payload.records)) {
    throw new Error('补卡参考加载失败，请稍后重试')
  }
  return payload.records
}

function isRepairableRecord(record) {
  return REPAIRABLE_RECORD_STATUSES.has(String(record?.status || '').toUpperCase())
}

function formatCheckType(checkType) {
  return checkType === 'OUT' ? '下班打卡' : '上班打卡'
}

function formatRecordStatus(status) {
  return RECORD_STATUS_LABELS[String(status || '').toUpperCase()] || '异常'
}

function formatDateTime(value) {
  return formatDateTimeDisplay(value, '--')
}

function toRepairDateTime(value) {
  const normalized = String(value || '').trim().replace('T', ' ')
  if (!normalized) {
    return ''
  }

  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(normalized)) {
    return `${normalized}:00`
  }

  return normalized.length > 19 ? normalized.slice(0, 19) : normalized
}

function fillFromRecord(record) {
  form.checkType = record?.checkType || 'IN'
  form.checkTime = formatDateTimeDisplay(record?.checkTime, '')
}

function resetForm() {
  form.checkType = 'IN'
  form.checkTime = ''
  form.repairReason = ''
  submitError.value = ''
  submitNotice.value = ''
}

async function loadRepairableRecords() {
  loadingReferences.value = true
  referenceError.value = ''

  try {
    const records = readRecordPage(await getMyAttendanceRecordRequest({
      pageNum: 1,
      pageSize: 50,
      startDate: '',
      endDate: '',
    }))
    repairableRecords.value = records.filter(isRepairableRecord)
  } catch (error) {
    repairableRecords.value = []
    referenceError.value = error?.message || '补卡参考加载失败，请稍后重试'
  } finally {
    loadingReferences.value = false
  }
}

async function handleSubmit() {
  if (isSubmitDisabled.value) {
    return
  }

  submitting.value = true
  submitError.value = ''
  submitNotice.value = ''

  try {
    readWrappedData(await submitAttendanceRepairRequest({
      checkType: form.checkType,
      checkTime: toRepairDateTime(form.checkTime),
      repairReason: form.repairReason,
    }))
    ElMessage.success('补卡申请已提交')
    submitNotice.value = '补卡申请已提交，请等待后续处理结果'
    resetForm()
    submitNotice.value = '补卡申请已提交，请等待后续处理结果'
    await loadRepairableRecords()
  } catch (error) {
    submitError.value = error?.message || '补卡申请提交失败，请稍后重试'
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  void loadRepairableRecords()
})
</script>

<style scoped>
.repair-view {
  display: grid;
  gap: 20px;
}

.repair-view__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 20px;
}

.repair-card {
  display: grid;
  gap: 16px;
  padding: 22px;
  border-radius: 24px;
  background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
  box-shadow: 0 18px 50px rgba(15, 23, 42, 0.08);
}

.repair-card__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.repair-card__eyebrow {
  margin: 0 0 8px;
  font-size: 12px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #2f69b2;
}

.repair-card__head h2 {
  margin: 0;
  font-size: 22px;
  color: #0f172a;
}

.repair-card__badge {
  padding: 8px 12px;
  border-radius: 999px;
  background: rgba(47, 105, 178, 0.08);
  color: #245391;
  font-size: 12px;
  white-space: nowrap;
}

.repair-card__hint,
.repair-reference p,
.repair-reference span,
.repair-card__empty {
  margin: 0;
  color: #64748b;
  line-height: 1.7;
}

.repair-field {
  display: grid;
  gap: 8px;
}

.repair-field span {
  color: #334155;
  font-size: 13px;
}

.repair-field__tip {
  margin: -2px 0 0;
  color: #64748b;
  font-size: 12px;
  line-height: 1.6;
}

.repair-field input,
.repair-field select,
.repair-field textarea,
.repair-card__actions button,
.repair-reference button {
  font: inherit;
}

.repair-field input,
.repair-field select,
.repair-field textarea,
.repair-card__actions button,
.repair-reference button {
  min-height: 44px;
  width: 100%;
  padding: 10px 14px;
  border: 1px solid rgba(148, 163, 184, 0.34);
  border-radius: 14px;
  background: #ffffff;
}

.repair-field textarea {
  min-height: 108px;
  resize: vertical;
}

.repair-card__actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.repair-card__actions button,
.repair-reference button {
  cursor: pointer;
  transition: all 0.2s ease;
}

.repair-card__primary,
.repair-reference button {
  border-color: transparent !important;
  background: linear-gradient(135deg, #245391 0%, #2f69b2 100%) !important;
  color: #ffffff !important;
  box-shadow: 0 8px 18px rgba(47, 105, 178, 0.18);
}

.repair-card__error {
  padding: 12px 14px;
  color: #b91c1c;
  background: rgba(248, 113, 113, 0.12);
  border-radius: 16px;
}

.repair-card__success {
  padding: 12px 14px;
  color: #15803d;
  background: rgba(34, 197, 94, 0.12);
  border-radius: 16px;
}

.repair-card__reference-list {
  display: grid;
  gap: 12px;
}

.repair-reference {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 16px;
  align-items: center;
  padding: 14px 16px;
  border-radius: 18px;
  background: rgba(15, 23, 42, 0.04);
}

.repair-reference strong {
  display: block;
  margin-bottom: 6px;
  color: #0f172a;
}

.repair-reference button {
  width: auto;
  min-width: 108px;
}

@media (max-width: 768px) {
  .repair-card__head,
  .repair-card__actions,
  .repair-reference {
    grid-template-columns: 1fr;
    flex-direction: column;
  }

  .repair-card__actions button,
  .repair-reference button {
    width: 100%;
  }
}
</style>
