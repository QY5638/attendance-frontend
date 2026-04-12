<template>
  <section class="profile-page">
    <ConsoleHero
      title="个人中心"
      description="查看并维护当前员工的基础资料与登录信息。"
      theme="indigo"
      :cards="heroCards"
    />

    <div class="profile-page__grid">
      <el-card shadow="never" class="profile-page__card">
        <template #header>
          <div class="profile-page__card-header">
            <div>
              <strong>个人资料</strong>
              <p>可修改姓名、性别、手机号和登录密码，部门与角色信息由管理员统一维护。</p>
            </div>
          </div>
        </template>

        <el-alert v-if="error" type="error" :closable="false" :title="error" class="profile-page__alert" />

        <el-form ref="formRef" :model="form" :rules="rules" label-position="top" v-loading="loading">
          <el-row :gutter="16">
            <el-col :span="12">
              <el-form-item label="账号">
                <el-input :model-value="profile.username || ''" disabled />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="状态">
                <el-input :model-value="profile.status === 1 ? '启用' : '停用'" disabled />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="姓名" prop="realName">
                <el-input v-model="form.realName" clearable maxlength="30" data-testid="profile-real-name-input" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="性别" prop="gender">
                <el-radio-group v-model="form.gender" data-testid="profile-gender-group">
                  <el-radio value="男">男</el-radio>
                  <el-radio value="女">女</el-radio>
                </el-radio-group>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="手机号" prop="phone">
                <el-input v-model="form.phone" clearable maxlength="20" data-testid="profile-phone-input" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="新密码">
                <el-input
                  v-model="form.password"
                  clearable
                  show-password
                  placeholder="留空则保持当前密码不变"
                  data-testid="profile-password-input"
                />
              </el-form-item>
            </el-col>
          </el-row>

          <div class="profile-page__actions">
            <el-button @click="resetForm" :disabled="loading || submitting">重置</el-button>
            <el-button type="primary" :loading="submitting" data-testid="profile-submit-button" @click="handleSubmit">保存修改</el-button>
          </div>
        </el-form>
      </el-card>

      <el-card shadow="never" class="profile-page__card">
        <template #header>
          <div class="profile-page__card-header">
            <div>
              <strong>账号概览</strong>
              <p>以下信息由系统或管理员维护，用于说明当前员工的组织归属和账号情况。</p>
            </div>
          </div>
        </template>

        <div class="profile-page__summary" v-loading="loading">
          <article>
            <span>所属部门</span>
            <strong>{{ profile.deptName || '-' }}</strong>
          </article>
          <article>
            <span>创建时间</span>
            <strong>{{ formatDateTimeDisplay(profile.createTime, '-') }}</strong>
          </article>
          <article>
            <span>当前登录</span>
            <strong>{{ authStore.realName || profile.realName || '-' }}</strong>
          </article>
        </div>
      </el-card>
    </div>
  </section>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'

import ConsoleHero from '../../components/console/ConsoleHero.vue'
import { fetchCurrentUserProfile, updateCurrentUserProfile } from '../../api/user'
import { useAuthStore } from '../../store/auth'
import { formatDateTimeDisplay } from '../../utils/date-time'

const authStore = useAuthStore()
const formRef = ref()
const loading = ref(false)
const submitting = ref(false)
const error = ref('')

const profile = reactive({
  id: null,
  username: '',
  realName: '',
  gender: '男',
  phone: '',
  deptName: '',
  roleName: '',
  status: 1,
  createTime: '',
})

const form = reactive({
  realName: '',
  gender: '男',
  phone: '',
  password: '',
})

const heroCards = computed(() => [
  {
    key: 'account',
    label: '当前账号',
    value: profile.username || '-',
  },
  {
    key: 'department',
    label: '所属部门',
    value: profile.deptName || '-',
  },
])

const rules = {
  realName: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  gender: [{ required: true, message: '请选择性别', trigger: 'change' }],
}

function syncProfile(data = {}) {
  profile.id = data.id ?? null
  profile.username = data.username || ''
  profile.realName = data.realName || ''
  profile.gender = data.gender || '男'
  profile.phone = data.phone || ''
  profile.deptName = data.deptName || ''
  profile.roleName = data.roleName || ''
  profile.status = typeof data.status === 'number' ? data.status : 1
  profile.createTime = data.createTime || ''

  form.realName = profile.realName
  form.gender = profile.gender
  form.phone = profile.phone
  form.password = ''
}

async function loadProfile() {
  loading.value = true
  error.value = ''

  try {
    const data = await fetchCurrentUserProfile()
    syncProfile(data)
  } catch (requestError) {
    error.value = requestError?.message || '个人资料加载失败，请稍后重试'
  } finally {
    loading.value = false
  }
}

function resetForm() {
  form.realName = profile.realName
  form.gender = profile.gender || '男'
  form.phone = profile.phone
  form.password = ''
}

async function handleSubmit() {
  if (submitting.value) {
    return
  }

  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) {
    return
  }

  submitting.value = true
  error.value = ''

  try {
    const data = await updateCurrentUserProfile({
      realName: form.realName,
      gender: form.gender,
      phone: form.phone,
      password: form.password,
    })
    syncProfile(data)
    authStore.updateIdentity({ realName: data?.realName || form.realName })
    ElMessage.success('个人资料已更新')
  } catch (requestError) {
    error.value = requestError?.message || '个人资料更新失败，请稍后重试'
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  void loadProfile()
})
</script>

<style scoped>
.profile-page {
  display: grid;
  gap: 20px;
}

.profile-page__grid {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(280px, 1fr);
  gap: 20px;
}

.profile-page__card {
  border: none;
  border-radius: 24px;
  background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
  box-shadow: 0 18px 60px rgba(15, 23, 42, 0.08);
}

.profile-page__card-header strong {
  color: #0f172a;
}

.profile-page__card-header p {
  margin: 6px 0 0;
  color: #64748b;
}

.profile-page__alert {
  margin-bottom: 16px;
}

.profile-page__actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.profile-page__summary {
  display: grid;
  gap: 14px;
}

.profile-page__summary article {
  padding: 16px 18px;
  border-radius: 18px;
  background: rgba(15, 23, 42, 0.04);
}

.profile-page__summary span {
  display: block;
  font-size: 12px;
  color: #64748b;
}

.profile-page__summary strong {
  display: block;
  margin-top: 8px;
  color: #0f172a;
}

@media (max-width: 1024px) {
  .profile-page__grid {
    grid-template-columns: 1fr;
  }
}
</style>
