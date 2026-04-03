<template>
  <section class="crud-page">
    <el-card shadow="never">
      <template #header>
        <div class="crud-page__header">
          <div>
            <strong>角色管理</strong>
            <p>仅维护角色资料，不扩展菜单权限配置。</p>
          </div>
          <el-button type="primary" @click="openCreateDialog">新增角色</el-button>
        </div>
      </template>

      <el-form :inline="true" :model="filters" class="crud-page__filters">
        <el-form-item label="关键词">
          <el-input v-model="filters.keyword" clearable placeholder="请输入角色编码或名称" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="filters.status" clearable placeholder="全部状态">
            <el-option label="启用" :value="1" />
            <el-option label="停用" :value="0" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">查询</el-button>
          <el-button @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>

      <el-table v-loading="loading" :data="rows">
        <el-table-column prop="code" label="角色编码" min-width="140" />
        <el-table-column prop="name" label="角色名称" min-width="160" />
        <el-table-column prop="description" label="角色说明" min-width="240" />
        <el-table-column label="状态" width="120">
          <template #default="{ row }">
            <el-tag :type="row.status === 1 ? 'success' : 'info'">
              {{ row.status === 1 ? '启用' : '停用' }}
            </el-tag>
          </template>
        </el-table-column>
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

    <el-dialog v-model="dialogVisible" :title="editingId ? '编辑角色' : '新增角色'" width="560px">
      <el-form ref="formRef" :model="form" :rules="rules" label-position="top">
        <el-form-item label="角色编码" prop="code">
          <el-input v-model="form.code" clearable maxlength="30" />
        </el-form-item>
        <el-form-item label="角色名称" prop="name">
          <el-input v-model="form.name" clearable maxlength="30" />
        </el-form-item>
        <el-form-item label="角色说明" prop="description">
          <el-input v-model="form.description" type="textarea" :rows="4" maxlength="200" show-word-limit />
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-radio-group v-model="form.status">
            <el-radio :value="1">启用</el-radio>
            <el-radio :value="0">停用</el-radio>
          </el-radio-group>
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
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'

import { addRole, deleteRole, fetchRoleList, updateRole } from '../../api/role'

const formRef = ref()
const loading = ref(false)
const submitting = ref(false)
const dialogVisible = ref(false)
const editingId = ref(null)
const rows = ref([])

const filters = reactive({
  keyword: '',
  status: '',
})

const pagination = reactive({
  pageNum: 1,
  pageSize: 10,
  total: 0,
})

const form = reactive({
  code: '',
  name: '',
  description: '',
  status: 1,
})

const rules = {
  code: [{ required: true, message: '请输入角色编码', trigger: 'blur' }],
  name: [{ required: true, message: '请输入角色名称', trigger: 'blur' }],
}

function resetForm() {
  editingId.value = null
  form.code = ''
  form.name = ''
  form.description = ''
  form.status = 1
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

  if (filters.status !== '' && filters.status !== null && filters.status !== undefined) {
    params.status = filters.status
  }

  return params
}

async function loadList() {
  loading.value = true

  try {
    const { total, items } = await fetchRoleList(buildListParams())

    rows.value = items
    pagination.total = total
  } catch (error) {
    ElMessage.error(error.message || '获取角色列表失败')
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
  filters.status = ''
  pagination.pageNum = 1
  loadList()
}

function openCreateDialog() {
  resetForm()
  dialogVisible.value = true
}

function openEditDialog(row) {
  editingId.value = row.id
  form.code = row.code || ''
  form.name = row.name || ''
  form.description = row.description || ''
  form.status = row.status ?? 1
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
      code: form.code,
      name: form.name,
      description: form.description,
      status: form.status,
    }

    if (editingId.value) {
      await updateRole(payload)
      ElMessage.success('角色更新成功')
    } else {
      await addRole(payload)
      ElMessage.success('角色创建成功')
    }

    dialogVisible.value = false
    await loadList()
  } catch (error) {
    ElMessage.error(error.message || '角色保存失败')
  } finally {
    submitting.value = false
  }
}

async function handleDelete(row) {
  try {
    await ElMessageBox.confirm(`确定删除角色“${row.name}”吗？`, '删除确认', {
      type: 'warning',
    })
    await deleteRole(row.id)

    if (rows.value.length === 1 && pagination.pageNum > 1) {
      pagination.pageNum -= 1
    }

    ElMessage.success('角色删除成功')
    await loadList()
  } catch (error) {
    if (error === 'cancel' || error === 'close') {
      return
    }
    ElMessage.error(error.message || '角色删除失败')
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
