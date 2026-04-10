<template>
  <section class="panel-card">
    <header class="panel-card__header">
      <div>
        <h2>分析方案</h2>
        <p>用于维护系统分析方案的适用场景、版本和说明内容。</p>
      </div>
      <button
        type="button"
        class="panel-card__primary"
        data-testid="prompt-template-create-button"
        @click="openCreateDialog"
      >
        新增方案
      </button>
    </header>

    <section class="panel-card__hero-strip">
      <article>
        <span>配置目标</span>
        <strong>分析方案</strong>
      </article>
      <article>
        <span>维护范围</span>
        <strong>方案信息 / 场景 / 版本 / 说明</strong>
      </article>
    </section>

    <form class="panel-card__filters" @submit.prevent="handleSearch">
      <label>
        <span>关键词</span>
        <input v-model="filters.keyword" type="text" placeholder="方案标识 / 名称 / 版本号" />
      </label>
      <label>
        <span>分析场景</span>
        <input v-model="filters.sceneType" type="text" placeholder="如 异常处置、预警处置、统计分析" />
      </label>
      <label>
        <span>状态</span>
        <select v-model="filters.status">
          <option value="">全部状态</option>
          <option value="ENABLED">启用</option>
          <option value="DISABLED">停用</option>
        </select>
      </label>
      <div class="panel-card__actions">
        <button type="submit" class="panel-card__primary">查询</button>
        <button type="button" @click="handleReset">重置</button>
      </div>
    </form>

    <p v-if="error" class="panel-card__feedback panel-card__feedback--error">{{ error }}</p>
    <p v-else-if="notice" class="panel-card__feedback panel-card__feedback--success">{{ notice }}</p>

    <div class="panel-card__table-wrapper">
      <table class="panel-card__table">
        <thead>
          <tr>
            <th>方案标识</th>
            <th>方案名称</th>
            <th>分析场景</th>
            <th>版本号</th>
            <th>状态</th>
            <th>最近更新</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="7">加载中...</td>
          </tr>
          <tr v-else-if="!rows.length">
            <td colspan="7">暂无分析方案</td>
          </tr>
          <tr v-for="row in rows" :key="row.id || `${row.code}-${row.version}`">
            <td>{{ row.code || '-' }}</td>
            <td>{{ row.name || '-' }}</td>
            <td>
              <span :class="['panel-card__scene-tag', getSceneTagClass(row.sceneType)]">
                {{ formatSceneType(row.sceneType) }}
              </span>
            </td>
            <td>{{ row.version || '-' }}</td>
            <td>
              <span :class="['panel-card__status', row.status === 'ENABLED' ? 'is-active' : 'is-inactive']">
                {{ formatPromptStatus(row.status) }}
              </span>
            </td>
            <td>{{ formatDateTime(row.updateTime) }}</td>
            <td>
              <div class="panel-card__inline-actions">
                <button
                  type="button"
                  data-testid="prompt-template-edit-button"
                  @click="openEditDialog(row)"
                >
                  编辑
                </button>
                <button
                  type="button"
                  data-testid="prompt-template-status-button"
                  @click="handleToggleStatus(row)"
                >
                  {{ row.status === 'ENABLED' ? '停用' : '启用' }}
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <footer class="panel-card__footer">
      <span>第 {{ pagination.pageNum }} / {{ totalPages }} 页，共 {{ pagination.total }} 条</span>
      <div class="panel-card__actions">
        <button type="button" :disabled="pagination.pageNum <= 1" @click="changePage(-1)">上一页</button>
        <button type="button" :disabled="pagination.pageNum >= totalPages" @click="changePage(1)">下一页</button>
      </div>
    </footer>

    <div v-if="dialogVisible" class="panel-card__modal">
      <div class="panel-card__dialog">
        <div class="panel-card__dialog-head">
          <div>
            <strong>{{ form.id ? '编辑分析方案' : '新增分析方案' }}</strong>
            <p>方案标识与版本号组合需保持唯一，便于统一管理与后续追溯。</p>
          </div>
          <button type="button" class="panel-card__icon-btn" @click="dialogVisible = false">关闭</button>
        </div>

        <p class="panel-card__dialog-tip">建议按使用场景统一维护方案名称、版本和适用范围，避免重复建设。</p>

        <form class="panel-card__dialog-form" @submit.prevent="handleSubmit">
          <label>
            <span>方案标识</span>
            <input v-model="form.code" type="text" placeholder="请输入方案标识" />
          </label>
          <label>
            <span>方案名称</span>
            <input v-model="form.name" type="text" placeholder="请输入方案名称" />
          </label>
          <label>
            <span>分析场景</span>
            <input v-model="form.sceneType" type="text" placeholder="请输入分析场景" />
          </label>
          <label>
            <span>版本号</span>
            <input v-model="form.version" type="text" placeholder="例如 1.0 版" />
          </label>
          <label>
            <span>状态</span>
            <select v-model="form.status">
              <option value="ENABLED">启用</option>
              <option value="DISABLED">停用</option>
            </select>
          </label>
          <label class="panel-card__full-width">
            <span>适用范围</span>
            <input v-model="form.remark" type="text" placeholder="请输入适用范围说明" />
          </label>
          <label class="panel-card__full-width">
            <span>方案说明</span>
            <textarea v-model="form.content" rows="6" placeholder="请填写方案用途、适用条件和主要说明"></textarea>
          </label>
          <div class="panel-card__dialog-actions panel-card__full-width">
            <button type="button" @click="dialogVisible = false">取消</button>
            <button
              type="submit"
              class="panel-card__primary"
              :disabled="submitting"
              data-testid="prompt-template-submit-button"
            >
              {{ submitting ? '保存中...' : '保存' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'

import {
  addPromptTemplate,
  fetchPromptTemplateList,
  updatePromptTemplate,
  updatePromptTemplateStatus,
} from '../../../api/system'
import { formatDateTimeDisplay } from '../../../utils/date-time'

const loading = ref(false)
const submitting = ref(false)
const dialogVisible = ref(false)
const rows = ref([])
const error = ref('')
const notice = ref('')

const filters = reactive({
  keyword: '',
  sceneType: '',
  status: '',
})

const pagination = reactive({
  pageNum: 1,
  pageSize: 10,
  total: 0,
})

const form = reactive({
  id: null,
  code: '',
  name: '',
  sceneType: '',
  version: '',
  content: '',
  status: 'ENABLED',
  remark: '',
})

const totalPages = computed(() => Math.max(1, Math.ceil(pagination.total / pagination.pageSize) || 1))

const PROMPT_STATUS_LABELS = {
  ENABLED: '启用',
  DISABLED: '停用',
}

function buildListParams() {
  const params = {
    pageNum: pagination.pageNum,
    pageSize: pagination.pageSize,
  }

  if (filters.keyword.trim()) {
    params.keyword = filters.keyword
  }

  if (filters.sceneType.trim()) {
    params.sceneType = filters.sceneType
  }

  if (filters.status) {
    params.status = filters.status
  }

  return params
}

function resetForm(row = null) {
  form.id = row?.id ?? null
  form.code = row?.code ?? ''
  form.name = row?.name ?? ''
  form.sceneType = row?.sceneType ?? ''
  form.version = row?.version ?? ''
  form.content = row?.content ?? ''
  form.status = row?.status ?? 'ENABLED'
  form.remark = row?.remark ?? ''
}

function formatDateTime(value) {
  return formatDateTimeDisplay(value, '-')
}

function formatPromptStatus(status) {
  return PROMPT_STATUS_LABELS[String(status || '').toUpperCase()] || '未识别'
}

function formatSceneType(value) {
  const normalized = String(value || '').trim()

  if (!normalized) {
    return '-'
  }

  const upper = normalized.toUpperCase()
  if (upper.includes('EXCEPTION')) {
    return '异常处置'
  }

  if (upper.includes('WARNING')) {
    return '预警处置'
  }

  if (upper.includes('REVIEW')) {
    return '复核办理'
  }

  if (upper.includes('STAT')) {
    return '统计分析'
  }

  return normalized
}

function getSceneTagClass(value) {
  const normalized = String(value || '').toUpperCase()

  if (normalized.includes('EXCEPTION')) {
    return 'panel-card__scene-tag--danger'
  }

  if (normalized.includes('WARNING')) {
    return 'panel-card__scene-tag--warning'
  }

  if (normalized.includes('REVIEW')) {
    return 'panel-card__scene-tag--info'
  }

  if (normalized.includes('STAT')) {
    return 'panel-card__scene-tag--safe'
  }

  return 'panel-card__scene-tag--neutral'
}

async function loadList() {
  loading.value = true
  error.value = ''

  try {
    const { total, items } = await fetchPromptTemplateList(buildListParams())
    rows.value = items
    pagination.total = total
  } catch (requestError) {
    rows.value = []
    pagination.total = 0
    error.value = requestError?.message || '分析方案列表加载失败'
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  pagination.pageNum = 1
  notice.value = ''
  void loadList()
}

function handleReset() {
  filters.keyword = ''
  filters.sceneType = ''
  filters.status = ''
  pagination.pageNum = 1
  notice.value = ''
  void loadList()
}

function openCreateDialog() {
  resetForm()
  error.value = ''
  dialogVisible.value = true
}

function openEditDialog(row) {
  resetForm(row)
  error.value = ''
  dialogVisible.value = true
}

async function handleSubmit() {
  if (submitting.value) {
    return
  }

  if (!form.code.trim() || !form.name.trim() || !form.sceneType.trim() || !form.version.trim() || !form.content.trim()) {
    error.value = '请完整填写分析方案信息'
    return
  }

  submitting.value = true
  error.value = ''

  try {
    const payload = {
      id: form.id,
      code: form.code,
      name: form.name,
      sceneType: form.sceneType,
      version: form.version,
      content: form.content,
      status: form.status,
      remark: form.remark,
    }

    if (form.id) {
      await updatePromptTemplate(payload)
      notice.value = '分析方案更新成功'
    } else {
      await addPromptTemplate(payload)
      notice.value = '分析方案新增成功'
    }

    dialogVisible.value = false
    await loadList()
  } catch (requestError) {
    error.value = requestError?.message || '分析方案保存失败'
  } finally {
    submitting.value = false
  }
}

async function handleToggleStatus(row) {
  const nextStatus = row.status === 'ENABLED' ? 'DISABLED' : 'ENABLED'

  try {
    error.value = ''
    await updatePromptTemplateStatus({
      id: row.id,
      status: nextStatus,
    })
    notice.value = '分析方案状态更新成功'
    await loadList()
  } catch (requestError) {
    error.value = requestError?.message || '分析方案状态更新失败'
  }
}

function changePage(step) {
  const nextPage = Math.min(Math.max(1, pagination.pageNum + step), totalPages.value)

  if (nextPage === pagination.pageNum) {
    return
  }

  pagination.pageNum = nextPage
  void loadList()
}

onMounted(() => {
  void loadList()
})
</script>

<style scoped>
.panel-card {
  padding: 24px;
  border-radius: 24px;
  background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
  box-shadow: 0 18px 60px rgba(15, 23, 42, 0.08);
}

.panel-card__hero-strip {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 18px;
}

.panel-card__hero-strip article {
  padding: 16px 18px;
  border-radius: 18px;
  background: rgba(47, 105, 178, 0.08);
}

.panel-card__hero-strip span,
.panel-card__hero-strip strong {
  display: block;
}

.panel-card__hero-strip span {
  font-size: 12px;
  color: #2f69b2;
}

.panel-card__hero-strip strong {
  margin-top: 8px;
  color: #0f172a;
}

.panel-card__header,
.panel-card__footer,
.panel-card__filters,
.panel-card__actions,
.panel-card__dialog-head,
.panel-card__dialog-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.panel-card__header {
  margin-bottom: 16px;
}

.panel-card__header h2 {
  margin: 0;
  color: #0f172a;
}

.panel-card__header p,
.panel-card__dialog-head p {
  margin: 8px 0 0;
  color: #64748b;
}

.panel-card__filters {
  flex-wrap: wrap;
  margin-bottom: 16px;
}

.panel-card__filters label,
.panel-card__dialog-form label {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 180px;
  color: #334155;
  font-size: 14px;
}

.panel-card__filters input,
.panel-card__filters select,
.panel-card__dialog-form input,
.panel-card__dialog-form select,
.panel-card__dialog-form textarea {
  padding: 10px 12px;
  border: 1px solid rgba(148, 163, 184, 0.4);
  border-radius: 12px;
  font: inherit;
  color: #0f172a;
}

.panel-card__primary,
.panel-card button {
  padding: 10px 16px;
  border: none;
  border-radius: 12px;
  cursor: pointer;
}

.panel-card__primary {
  background: linear-gradient(135deg, #245391 0%, #2f69b2 100%);
  color: #ffffff;
}

.panel-card__feedback {
  margin: 0 0 16px;
  padding: 12px 14px;
  border-radius: 14px;
}

.panel-card__feedback--error {
  background: rgba(239, 68, 68, 0.12);
  color: #b91c1c;
}

.panel-card__feedback--success {
  background: rgba(34, 197, 94, 0.12);
  color: #15803d;
}

.panel-card__table-wrapper {
  overflow-x: auto;
}

.panel-card__table {
  width: 100%;
  border-collapse: collapse;
}

.panel-card__table th,
.panel-card__table td {
  padding: 14px 12px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.18);
  text-align: left;
  color: #334155;
  vertical-align: top;
}

.panel-card__table th {
  color: #0f172a;
}

.panel-card__status {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 12px;
}

.panel-card__status.is-active {
  background: rgba(34, 197, 94, 0.12);
  color: #15803d;
}

.panel-card__status.is-inactive {
  background: rgba(148, 163, 184, 0.18);
  color: #475569;
}

.panel-card__scene-tag {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 0 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
}

.panel-card__scene-tag--danger {
  background: rgba(239, 68, 68, 0.12);
  color: #b91c1c;
}

.panel-card__scene-tag--warning {
  background: rgba(245, 158, 11, 0.14);
  color: #b45309;
}

.panel-card__scene-tag--info {
  background: rgba(47, 105, 178, 0.12);
  color: #245391;
}

.panel-card__scene-tag--safe {
  background: rgba(34, 197, 94, 0.12);
  color: #166534;
}

.panel-card__scene-tag--neutral {
  background: rgba(148, 163, 184, 0.18);
  color: #475569;
}

.panel-card__inline-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.panel-card__footer {
  margin-top: 16px;
}

.panel-card__modal {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: rgba(15, 23, 42, 0.32);
}

.panel-card__dialog {
  width: min(760px, 100%);
  max-height: calc(100vh - 40px);
  overflow: auto;
  padding: 24px;
  border-radius: 24px;
  background: #ffffff;
}

.panel-card__icon-btn {
  background: rgba(148, 163, 184, 0.16);
  color: #334155;
}

.panel-card__dialog-tip {
  margin: 0;
  padding: 12px 14px;
  border-radius: 14px;
  background: rgba(47, 105, 178, 0.08);
  color: #245391;
  line-height: 1.7;
}

.panel-card__dialog-form {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  margin-top: 20px;
}

.panel-card__full-width {
  grid-column: 1 / -1;
}

@media (max-width: 900px) {
  .panel-card__header,
  .panel-card__footer,
  .panel-card__filters,
  .panel-card__actions,
  .panel-card__dialog-head,
  .panel-card__dialog-actions {
    align-items: stretch;
    flex-direction: column;
  }

  .panel-card__filters label,
  .panel-card__dialog-form label {
    min-width: 0;
  }

  .panel-card__dialog-form {
    grid-template-columns: 1fr;
  }
}
</style>
