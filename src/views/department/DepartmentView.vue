<template>
  <section class="crud-page">
    <ConsoleHero
      eyebrow="基础资料"
      title="部门管理"
      description="维护组织部门资料，用于人员归属、统计汇总和业务分组。"
      theme="sky"
      :cards="heroCards"
    />

    <el-card shadow="never">
      <template #header>
        <div class="crud-page__header">
          <div>
            <strong>部门资料</strong>
            <p>维护部门名称和说明，当前按平级部门统一管理。</p>
          </div>
          <el-button type="primary" @click="openCreateDialog">新增部门</el-button>
        </div>
      </template>

      <el-form :inline="true" :model="filters" class="crud-page__filters">
        <el-form-item label="关键词">
          <el-input v-model="filters.keyword" clearable placeholder="请输入部门名称" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">查询</el-button>
          <el-button @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>

      <el-table v-loading="loading" :data="rows">
        <el-table-column prop="name" label="部门名称" min-width="180" />
        <el-table-column prop="description" label="部门说明" min-width="260" />
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openEditDialog(row)">编辑</el-button>
            <el-button link type="danger" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="crud-page__pagination">
        <el-pagination
          v-model:current-page="pagination.pageNum"
          v-model:page-size="pagination.pageSize"
          background
          layout="total, prev, pager, next"
          :total="pagination.total"
          @current-change="loadList"
        />
      </div>
    </el-card>

    <el-dialog v-model="dialogVisible" :title="editingId ? '编辑部门' : '新增部门'" width="520px">
      <el-form ref="formRef" :model="form" :rules="rules" label-position="top">
        <el-form-item label="部门名称" prop="name">
          <el-input v-model="form.name" clearable maxlength="50" />
        </el-form-item>
        <el-form-item label="部门说明" prop="description">
          <el-input v-model="form.description" type="textarea" :rows="4" maxlength="200" show-word-limit />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">保存</el-button>
      </template>
    </el-dialog>
  </section>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus/es/components/message/index.mjs'
import { ElMessageBox } from 'element-plus/es/components/message-box/index.mjs'

import ConsoleHero from '../../components/console/ConsoleHero.vue'
import {
  addDepartment,
  deleteDepartment,
  fetchDepartmentList,
  updateDepartment,
} from '../../api/department'

const formRef = ref()
const loading = ref(false)
const submitting = ref(false)
const dialogVisible = ref(false)
const editingId = ref(null)
const rows = ref([])

const filters = reactive({
  keyword: '',
})

const pagination = reactive({
  pageNum: 1,
  pageSize: 10,
  total: 0,
})

const heroCards = computed(() => [
  {
    key: 'total',
    label: '部门数量',
    value: `${pagination.total} 个部门`,
  },
  {
    key: 'scope',
    label: '维护范围',
    value: '名称 / 说明',
  },
])

const form = reactive({
  name: '',
  description: '',
})

const rules = {
  name: [{ required: true, message: '请输入部门名称', trigger: 'blur' }],
}

function resetForm() {
  editingId.value = null
  form.name = ''
  form.description = ''
}

function buildListParams() {
  const params = {
    pageNum: pagination.pageNum,
    pageSize: pagination.pageSize,
  }

  const keyword = filters.keyword.trim()
  if (keyword) {
    params.keyword = keyword
  }

  return params
}

async function loadList() {
  loading.value = true

  try {
    const { total, items } = await fetchDepartmentList(buildListParams())

    pagination.total = total
    rows.value = items
  } catch (error) {
    ElMessage.error(error.message || '获取部门列表失败')
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  pagination.pageNum = 1
  loadList()
}

function handleReset() {
  filters.keyword = ''
  pagination.pageNum = 1
  loadList()
}

function openCreateDialog() {
  resetForm()
  dialogVisible.value = true
}

function openEditDialog(row) {
  editingId.value = row.id
  form.name = row.name || ''
  form.description = row.description || ''
  dialogVisible.value = true
}

async function handleSubmit() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid || submitting.value) {
    return
  }

  submitting.value = true

  try {
    const payload = {
      id: editingId.value,
      name: form.name,
      description: form.description,
    }

    if (editingId.value) {
      await updateDepartment(payload)
      ElMessage.success('部门更新成功')
    } else {
      await addDepartment(payload)
      ElMessage.success('部门创建成功')
    }

    dialogVisible.value = false
    await loadList()
  } catch (error) {
    ElMessage.error(error.message || '部门保存失败')
  } finally {
    submitting.value = false
  }
}

async function handleDelete(row) {
  try {
    await ElMessageBox.confirm(`确定删除部门“${row.name}”吗？`, '删除确认', {
      type: 'warning',
    })
    await deleteDepartment(row.id)

    if (rows.value.length === 1 && pagination.pageNum > 1) {
      pagination.pageNum -= 1
    }

    ElMessage.success('部门删除成功')
    await loadList()
  } catch (error) {
    if (error === 'cancel' || error === 'close') {
      return
    }
    ElMessage.error(error.message || '部门删除失败')
  }
}

onMounted(loadList)
</script>

<style scoped>
.crud-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.crud-page__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.crud-page__header strong {
  font-size: 18px;
  color: #0f172a;
}

.crud-page__header p {
  margin: 8px 0 0;
  color: #64748b;
}

.crud-page__filters {
  margin-bottom: 16px;
}

.crud-page__pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}
</style>
