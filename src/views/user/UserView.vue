<template>
  <section class="crud-page">
    <ConsoleHero
      eyebrow="基础资料"
      title="用户管理"
      description="维护员工基础资料，并在同一表单中关联部门、角色和状态。"
      theme="indigo"
      :cards="heroCards"
    />

    <el-card shadow="never">
      <template #header>
        <div class="crud-page__header">
          <div>
            <strong>用户管理</strong>
            <p>维护员工基础资料，并在表单中关联部门与角色。</p>
          </div>
          <el-button type="primary" @click="openCreateDialog">新增用户</el-button>
        </div>
      </template>

      <el-form :inline="true" :model="filters" class="crud-page__filters">
        <el-form-item label="关键词">
          <el-input v-model="filters.keyword" clearable placeholder="用户名或姓名" />
        </el-form-item>
        <el-form-item label="部门">
          <el-select v-model="filters.deptId" clearable placeholder="全部部门">
            <el-option v-for="item in departmentOptions" :key="item.id" :label="item.name" :value="item.id" />
          </el-select>
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
        <el-table-column prop="username" label="用户名" min-width="140" />
        <el-table-column prop="realName" label="姓名" min-width="120" />
        <el-table-column prop="gender" label="性别" width="90" />
        <el-table-column prop="phone" label="手机号" min-width="150" />
        <el-table-column label="部门" min-width="140">
          <template #default="{ row }">
            {{ getDepartmentName(row.deptId) }}
          </template>
        </el-table-column>
        <el-table-column label="角色" min-width="140">
          <template #default="{ row }">
            {{ getRoleName(row.roleId) }}
          </template>
        </el-table-column>
        <el-table-column label="状态" width="120">
          <template #default="{ row }">
            <el-tag :type="row.status === 1 ? 'success' : 'info'">
              {{ row.status === 1 ? '启用' : '停用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createTime" label="创建时间" min-width="180" />
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

    <el-dialog v-model="dialogVisible" :title="editingId ? '编辑用户' : '新增用户'" width="640px">
      <el-form ref="formRef" :model="form" :rules="rules" label-position="top">
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="用户名" prop="username">
              <el-input v-model="form.username" clearable maxlength="30" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item :label="editingId ? '密码（留空则不修改）' : '密码'" prop="password">
              <el-input v-model="form.password" clearable show-password />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="姓名" prop="realName">
              <el-input v-model="form.realName" clearable maxlength="30" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="性别" prop="gender">
              <el-radio-group v-model="form.gender">
                <el-radio value="男">男</el-radio>
                <el-radio value="女">女</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="手机号" prop="phone">
              <el-input v-model="form.phone" clearable maxlength="20" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="部门" prop="deptId">
              <el-select v-model="form.deptId" placeholder="请选择部门">
                <el-option v-for="item in departmentOptions" :key="item.id" :label="item.name" :value="item.id" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="角色" prop="roleId">
              <el-select v-model="form.roleId" placeholder="请选择角色">
                <el-option v-for="item in roleOptions" :key="item.id" :label="item.name" :value="item.id" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="状态" prop="status">
              <el-radio-group v-model="form.status">
                <el-radio :value="1">启用</el-radio>
                <el-radio :value="0">停用</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-col>
        </el-row>
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
import { fetchDepartmentList } from '../../api/department'
import { fetchRoleList } from '../../api/role'
import { addUser, deleteUser, fetchUserList, updateUser } from '../../api/user'

const formRef = ref()
const loading = ref(false)
const submitting = ref(false)
const dialogVisible = ref(false)
const editingId = ref(null)
const rows = ref([])
const departmentOptions = ref([])
const roleOptions = ref([])

const filters = reactive({
  keyword: '',
  deptId: '',
  status: '',
})

const pagination = reactive({
  pageNum: 1,
  pageSize: 10,
  total: 0,
})

const heroCards = computed(() => [
  {
    key: 'total',
    label: '当前列表',
    value: `${pagination.total} 人`,
  },
  {
    key: 'scope',
    label: '主数据范围',
    value: '账号 / 部门 / 角色',
  },
])

const form = reactive({
  username: '',
  password: '',
  realName: '',
  gender: '男',
  phone: '',
  deptId: '',
  roleId: '',
  status: 1,
})

const rules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{
    validator: (_, value, callback) => {
      if (!editingId.value && !String(value || '').trim()) {
        callback(new Error('请输入密码'))
        return
      }

      callback()
    },
    trigger: 'blur',
  }],
  realName: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  deptId: [{ required: true, message: '请选择部门', trigger: 'change' }],
  roleId: [{ required: true, message: '请选择角色', trigger: 'change' }],
}

function resetForm() {
  editingId.value = null
  form.username = ''
  form.password = ''
  form.realName = ''
  form.gender = '男'
  form.phone = ''
  form.deptId = ''
  form.roleId = ''
  form.status = 1
}

function getDepartmentName(deptId) {
  return departmentOptions.value.find((item) => item.id === deptId)?.name || '-'
}

function getRoleName(roleId) {
  return roleOptions.value.find((item) => item.id === roleId)?.name || '-'
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

  if (filters.deptId !== '' && filters.deptId !== null && filters.deptId !== undefined) {
    params.deptId = filters.deptId
  }

  if (filters.status !== '' && filters.status !== null && filters.status !== undefined) {
    params.status = filters.status
  }

  return params
}

async function fetchAllOptions(fetcher, pageSize = 200) {
  const items = []
  let pageNum = 1
  let total = 0

  do {
    const result = await fetcher({ pageNum, pageSize })
    const currentItems = Array.isArray(result.items) ? result.items : []

    total = Number(result.total || currentItems.length)
    items.push(...currentItems)
    pageNum += 1

    if (!currentItems.length) {
      break
    }
  } while (items.length < total)

  return items
}

async function loadOptions() {
  const [departmentItems, roleItems] = await Promise.all([
    fetchAllOptions(fetchDepartmentList),
    fetchAllOptions(fetchRoleList),
  ])

  departmentOptions.value = departmentItems
  roleOptions.value = roleItems
}

async function loadList() {
  loading.value = true

  try {
    const { total, items } = await fetchUserList(buildListParams())

    rows.value = items
    pagination.total = total
  } catch (error) {
    ElMessage.error(error.message || '获取用户列表失败')
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
  filters.deptId = ''
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
  form.username = row.username || ''
  form.password = ''
  form.realName = row.realName || ''
  form.gender = row.gender || '男'
  form.phone = row.phone || ''
  form.deptId = row.deptId ?? ''
  form.roleId = row.roleId ?? ''
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
      username: form.username,
      password: form.password,
      realName: form.realName,
      gender: form.gender,
      phone: form.phone,
      deptId: form.deptId,
      roleId: form.roleId,
      status: form.status,
    }

    if (editingId.value) {
      await updateUser(payload)
      ElMessage.success('用户更新成功')
    } else {
      await addUser(payload)
      ElMessage.success('用户创建成功')
    }

    dialogVisible.value = false
    await loadList()
  } catch (error) {
    ElMessage.error(error.message || '用户保存失败')
  } finally {
    submitting.value = false
  }
}

async function handleDelete(row) {
  try {
    await ElMessageBox.confirm(`确定删除用户“${row.realName || row.username}”吗？`, '删除确认', {
      type: 'warning',
    })
    await deleteUser(row.id)

    if (rows.value.length === 1 && pagination.pageNum > 1) {
      pagination.pageNum -= 1
    }

    ElMessage.success('用户删除成功')
    await loadList()
  } catch (error) {
    if (error === 'cancel' || error === 'close') {
      return
    }
    ElMessage.error(error.message || '用户删除失败')
  }
}

onMounted(async () => {
  try {
    await loadOptions()
    await loadList()
  } catch (error) {
    ElMessage.error(error.message || '初始化用户页面失败')
  }
})
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
