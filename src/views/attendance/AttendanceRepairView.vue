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

        <div class="repair-form">
          <div class="repair-field-grid">
            <label class="repair-field">
              <span>打卡类型</span>
              <select v-model="form.checkType" data-testid="attendance-repair-page-check-type">
                <option value="IN">上班打卡</option>
                <option value="OUT">下班打卡</option>
              </select>
            </label>

            <label class="repair-field">
              <span>缺失打卡时间</span>
              <input
                v-model="form.checkTime"
                data-testid="attendance-repair-page-check-time"
                type="datetime-local"
                step="1"
                autocomplete="off"
                @blur="ensureCheckTime"
              />
              <p class="repair-field__tip">默认已带入建议时段，请按实际缺失时间确认后提交。</p>
              <p v-if="selectedRecordId" class="repair-field__tip">当前关联记录：#{{ selectedRecordId }}</p>
            </label>
          </div>

          <label class="repair-field repair-field--reason">
            <span>补卡说明</span>
            <textarea v-model="form.repairReason" data-testid="attendance-repair-page-reason" rows="4" placeholder="请说明未打卡原因"></textarea>
            <p class="repair-field__tip">建议至少 6 个字，描述当时场景和未打卡原因。</p>
          </label>
        </div>

        <p v-if="showValidationError" class="repair-card__error">{{ submitValidationError }}</p>

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

        <div v-if="lastSubmit" class="repair-submit-receipt" data-testid="attendance-repair-page-last-submit">
          <strong>最近提交回执</strong>
          <p>申请编号：{{ lastSubmit.id }}</p>
          <p>打卡类型：{{ formatCheckType(lastSubmit.checkType) }}</p>
          <p>补卡时间：{{ formatDateTime(lastSubmit.checkTime) }}</p>
          <p>申请时间：{{ formatDateTime(lastSubmit.createTime) }}</p>
          <p>状态：{{ lastSubmit.status || 'PENDING' }}</p>
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

        <p class="repair-card__hint">下方展示近期异常记录并给出建议补卡时间；点击后会带入建议时间，而不是原始打卡时间。</p>

        <div v-if="referenceError" class="repair-card__error">{{ referenceError }}</div>
        <div v-else-if="loadingReferences" class="repair-card__empty">正在加载补卡参考...</div>
        <div v-else-if="!repairableRecords.length" class="repair-card__empty">近期待补卡参考为空。若你明确存在未打卡，可手动填写缺失时间后提交申请。</div>

        <div v-else class="repair-card__reference-list">
          <article
            v-for="record in repairableRecords"
            :key="record.id"
            :class="['repair-reference', { 'repair-reference--selected': isSelectedRecord(record) }]"
            :data-record-id="record.id"
          >
            <div>
              <strong>{{ formatCheckType(record.checkType) }} · 原始时间 {{ formatDateTime(record.checkTime) }}</strong>
              <p class="repair-reference__suggestion">建议补卡：{{ formatCheckType(record.suggestedCheckType) }} {{ formatDateTime(record.suggestedCheckTime) }}</p>
              <span>{{ formatRecordStatus(record.status) }}</span>
            </div>
            <button type="button" @click="fillFromRecord(record)">带入建议时间</button>
          </article>
        </div>
      </section>
    </div>
  </section>
</template>

<script setup>
import { computed, nextTick, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useRoute } from 'vue-router'

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
const route = useRoute()

const form = reactive({
  checkType: 'IN',
  checkTime: buildDefaultCheckTime('IN'),
  repairReason: '',
})

const loadingReferences = ref(false)
const submitting = ref(false)
const submitAttempted = ref(false)
const submitError = ref('')
const submitNotice = ref('')
const referenceError = ref('')
const recentRecords = ref([])
const repairableRecords = ref([])
const lastSubmit = ref(null)
const selectedRecordId = ref(null)

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
  return Boolean(submitting.value || submitValidationError.value)
})

const showValidationError = computed(() => {
  if (!submitValidationError.value) {
    return false
  }
  if (submitAttempted.value) {
    return true
  }
  return Boolean(String(form.checkTime || '').trim() || form.repairReason.trim())
})

const submitValidationError = computed(() => {
  if (!form.checkType) {
    return '请选择打卡类型'
  }

  const normalizedCheckTime = normalizeRepairDateTime(form.checkTime)
  if (!normalizedCheckTime) {
    return '请填写合法的补卡时间'
  }

  const checkDate = new Date(normalizedCheckTime.replace(' ', 'T'))
  if (Number.isNaN(checkDate.getTime())) {
    return '补卡时间格式不正确'
  }

  if (checkDate.getTime() > Date.now() + 60 * 1000) {
    return '补卡时间不能晚于当前时间'
  }

  if (!form.repairReason.trim()) {
    return '请填写补卡说明'
  }

  if (form.repairReason.trim().length < 6) {
    return '补卡说明至少 6 个字'
  }

  return ''
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
  return normalizeRepairDateTime(value)
}

function normalizeRepairDateTime(value) {
  const normalized = String(value || '').trim().replace('T', ' ').replace(/\//g, '-')
  if (!normalized) {
    return ''
  }

  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(normalized)) {
    return `${normalized}:00`
  }

  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(normalized)) {
    return normalized
  }

  const parsed = new Date(normalized.replace(' ', 'T'))
  if (!Number.isNaN(parsed.getTime())) {
    return toDateTimeText(parsed)
  }

  return ''
}

function toDateTimeLocal(value) {
  const normalized = normalizeRepairDateTime(value)
  if (!normalized) {
    return ''
  }
  return normalized.replace(' ', 'T')
}

function toDateTimeText(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return ''
  }
  const year = `${date.getFullYear()}`
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  const hour = `${date.getHours()}`.padStart(2, '0')
  const minute = `${date.getMinutes()}`.padStart(2, '0')
  const second = `${date.getSeconds()}`.padStart(2, '0')
  return `${year}-${month}-${day} ${hour}:${minute}:${second}`
}

function toDateTimeLocalText(date) {
  const normalized = toDateTimeText(date)
  return normalized ? normalized.replace(' ', 'T') : ''
}

function buildDefaultCheckTime(checkType = 'IN') {
  const now = new Date()
  const suggested = withTime(now, checkType === 'OUT' ? 18 : 9, 0, 0)
  return toDateTimeLocalText(suggested)
}

function parseRecordDate(value) {
  const normalized = normalizeRepairDateTime(value)
  if (!normalized) {
    return null
  }
  const parsed = new Date(normalized.replace(' ', 'T'))
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function withTime(date, hour, minute = 0, second = 0) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return null
  }
  const next = new Date(date.getTime())
  next.setHours(hour, minute, second, 0)
  return next
}

function resolveSuggestedRepair(record) {
  const status = String(record?.status || '').toUpperCase()
  const checkType = record?.checkType === 'OUT' ? 'OUT' : 'IN'
  const baseDate = parseRecordDate(record?.checkTime) || new Date()

  if (status === 'LATE') {
    const suggested = withTime(baseDate, 9, 0, 0)
    return {
      suggestedCheckType: 'IN',
      suggestedCheckTime: toDateTimeText(suggested),
      suggestedCheckTimeLocal: toDateTimeLocalText(suggested),
    }
  }

  if (status === 'EARLY_LEAVE') {
    const suggested = withTime(baseDate, 18, 0, 0)
    return {
      suggestedCheckType: 'OUT',
      suggestedCheckTime: toDateTimeText(suggested),
      suggestedCheckTimeLocal: toDateTimeLocalText(suggested),
    }
  }

  const defaultHour = checkType === 'OUT' ? 18 : 9
  const suggested = withTime(baseDate, defaultHour, 0, 0)
  return {
    suggestedCheckType: checkType,
    suggestedCheckTime: toDateTimeText(suggested),
    suggestedCheckTimeLocal: toDateTimeLocalText(suggested),
  }
}

function normalizeSourceRecordId(value) {
  const normalized = Number(String(value || '').trim())
  if (!Number.isFinite(normalized) || normalized <= 0) {
    return null
  }
  return normalized
}

function buildRouteSourceRecord() {
  const sourceRecordId = normalizeSourceRecordId(route.query?.sourceRecordId)
  if (!sourceRecordId) {
    return null
  }
  const checkType = String(route.query?.sourceCheckType || '').toUpperCase() === 'OUT' ? 'OUT' : 'IN'
  const normalizedCheckTime = normalizeRepairDateTime(route.query?.sourceCheckTime)
  const fallbackCheckTime = buildDefaultCheckTime(checkType).replace('T', ' ')
  return {
    id: sourceRecordId,
    checkType,
    checkTime: normalizedCheckTime || fallbackCheckTime,
    status: String(route.query?.sourceStatus || 'ABNORMAL').toUpperCase(),
  }
}

function ensureCheckTime() {
  if (String(form.checkTime || '').trim()) {
    return
  }
  form.checkTime = buildDefaultCheckTime(form.checkType)
}

function isSelectedRecord(record) {
  return selectedRecordId.value !== null && `${record?.id}` === `${selectedRecordId.value}`
}

async function scrollToSelectedReference() {
  if (typeof document === 'undefined' || selectedRecordId.value === null) {
    return
  }
  await nextTick()
  const selectedElement = document.querySelector(`.repair-reference[data-record-id="${selectedRecordId.value}"]`)
  selectedElement?.scrollIntoView?.({ behavior: 'smooth', block: 'center' })
}

function fillFromRecord(record, notice = '已带入建议补卡时间，请按实际情况确认后提交。') {
  const suggested = resolveSuggestedRepair(record)
  form.checkType = suggested.suggestedCheckType || record?.checkType || 'IN'
  form.checkTime = suggested.suggestedCheckTimeLocal || toDateTimeLocal(record?.checkTime)
  selectedRecordId.value = normalizeSourceRecordId(record?.id)
  submitError.value = ''
  submitNotice.value = notice
  void scrollToSelectedReference()
}

function resetForm() {
  form.checkType = 'IN'
  form.checkTime = buildDefaultCheckTime('IN')
  form.repairReason = ''
  selectedRecordId.value = null
  submitAttempted.value = false
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
    recentRecords.value = records
    repairableRecords.value = records
      .filter(isRepairableRecord)
      .map((record) => ({
        ...record,
        ...resolveSuggestedRepair(record),
      }))
  } catch (error) {
    recentRecords.value = []
    repairableRecords.value = []
    referenceError.value = error?.message || '补卡参考加载失败，请稍后重试'
  } finally {
    loadingReferences.value = false
  }
}

async function handleSubmit() {
  submitAttempted.value = true
  if (isSubmitDisabled.value) {
    if (submitValidationError.value) {
      submitError.value = submitValidationError.value
    }
    return
  }

  submitting.value = true
  submitError.value = ''
  submitNotice.value = ''

  try {
    const normalizedCheckTime = toRepairDateTime(form.checkTime)
    const hasSameRecord = recentRecords.value.some((record) => {
      const sameCheckTime = normalizeRepairDateTime(record?.checkTime) === normalizedCheckTime
      if (!sameCheckTime || record?.checkType !== form.checkType) {
        return false
      }
      if (selectedRecordId.value && `${record?.id}` === `${selectedRecordId.value}`) {
        return false
      }
      return true
    })
    if (hasSameRecord) {
      throw new Error('该时间点已有原始打卡记录，请改为缺失时段时间后再提交')
    }

    const savedRepair = readWrappedData(await submitAttendanceRepairRequest({
      checkType: form.checkType,
      checkTime: normalizedCheckTime,
      repairReason: form.repairReason,
      recordId: selectedRecordId.value || undefined,
    }))
    ElMessage.success('补卡申请已提交')
    submitNotice.value = `补卡申请已提交（编号 ${savedRepair?.id || '--'}），请等待后续处理结果`
    lastSubmit.value = {
      id: savedRepair?.id,
      checkType: savedRepair?.checkType,
      checkTime: savedRepair?.checkTime,
      createTime: savedRepair?.createTime,
      status: savedRepair?.status,
      recordId: savedRepair?.recordId,
    }
    resetForm()
    submitNotice.value = `补卡申请已提交（编号 ${savedRepair?.id || '--'}），请等待后续处理结果`
    await loadRepairableRecords()
  } catch (error) {
    submitError.value = error?.message || '补卡申请提交失败，请稍后重试'
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  const sourceRecord = buildRouteSourceRecord()
  if (sourceRecord) {
    fillFromRecord(sourceRecord, '已从考勤记录带入补卡信息，请确认后提交。')
  }

  void (async () => {
    await loadRepairableRecords()
    if (!sourceRecord) {
      return
    }
    const matchedRecord = repairableRecords.value.find((record) => `${record?.id}` === `${sourceRecord.id}`)
    if (matchedRecord) {
      fillFromRecord(matchedRecord, '已从考勤记录带入补卡信息，请确认后提交。')
    }
  })()
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
  align-items: start;
}

.repair-card {
  display: grid;
  gap: 14px;
  padding: 20px;
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

.repair-form {
  display: grid;
  gap: 14px;
}

.repair-field-grid {
  display: grid;
  grid-template-columns: minmax(0, 180px) minmax(0, 1fr);
  gap: 14px;
}

.repair-field span {
  color: #334155;
  font-size: 13px;
  font-weight: 600;
}

.repair-field__tip {
  margin: 0;
  color: #64748b;
  font-size: 12px;
  line-height: 1.6;
}

.repair-field input,
.repair-field select,
.repair-field textarea,
.repair-reference button {
  font: inherit;
}

.repair-field input,
.repair-field select,
.repair-field textarea,
.repair-reference button {
  min-height: 42px;
  width: 100%;
  padding: 10px 14px;
  border: 1px solid rgba(148, 163, 184, 0.34);
  border-radius: 14px;
  background: #ffffff;
  box-sizing: border-box;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.repair-field select,
.repair-field input[type='datetime-local'] {
  height: 42px;
  padding-top: 0;
  padding-bottom: 0;
}

.repair-field input:focus,
.repair-field select:focus,
.repair-field textarea:focus {
  outline: none;
  border-color: rgba(47, 105, 178, 0.62);
  box-shadow: 0 0 0 3px rgba(47, 105, 178, 0.16);
}

.repair-field input[type='datetime-local']:invalid::-webkit-datetime-edit {
  color: transparent;
}

.repair-field input[type='datetime-local']:focus::-webkit-datetime-edit {
  color: inherit;
}

.repair-field textarea {
  min-height: 108px;
  resize: vertical;
}

.repair-card__actions {
  display: flex;
  justify-content: flex-start;
  flex-wrap: wrap;
  gap: 12px;
}

.repair-card__actions button {
  min-height: 40px;
  width: auto;
  min-width: 110px;
  padding: 0 16px;
  border: 1px solid rgba(148, 163, 184, 0.4);
  border-radius: 10px;
  background: #ffffff;
  color: #334155;
  font-weight: 600;
  white-space: nowrap;
}

.repair-card__actions .repair-card__primary {
  min-width: 148px;
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

.repair-submit-receipt {
  padding: 14px 16px;
  border-radius: 16px;
  background: rgba(47, 105, 178, 0.08);
  color: #245391;
  display: grid;
  gap: 6px;
}

.repair-submit-receipt strong,
.repair-submit-receipt p {
  margin: 0;
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
  border: 1px solid transparent;
  border-radius: 18px;
  background: rgba(15, 23, 42, 0.04);
  transition: border-color 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease;
}

.repair-reference--selected {
  border-color: rgba(47, 105, 178, 0.34);
  background: rgba(47, 105, 178, 0.08);
  box-shadow: 0 10px 24px rgba(47, 105, 178, 0.12);
}

.repair-reference strong {
  display: block;
  margin-bottom: 6px;
  color: #0f172a;
}

.repair-reference__suggestion {
  color: #245391 !important;
  font-weight: 600;
}

.repair-reference button {
  width: auto;
  min-width: 108px;
}

@media (max-width: 1080px) {
  .repair-field-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .repair-field-grid,
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
