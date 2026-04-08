<template>
  <section class="login-page">
    <div class="login-page__panel">
      <div class="login-page__hero">
        <div class="login-page__hero-head">
          <div class="login-page__brand-mark">勤</div>
          <div>
            <p class="login-page__eyebrow">企业考勤管理系统</p>
            <h1>统一登录入口</h1>
          </div>
        </div>

        <p>
          请使用分配的账号和密码登录。登录后将根据账号身份进入对应工作页面。
        </p>

        <div class="login-page__notice-list">
          <article class="login-page__notice-card">
            <strong>账号管理</strong>
            <span>账号由系统管理员统一维护，请使用正式分配的登录信息。</span>
          </article>
          <article class="login-page__notice-card">
            <strong>登录说明</strong>
            <span>管理员和员工共用同一入口，登录后自动进入对应工作区。</span>
          </article>
          <article class="login-page__notice-card">
            <strong>使用支持</strong>
            <span>如遇登录异常、密码遗忘或账号停用，请联系系统管理员处理。</span>
          </article>
        </div>

        <div class="login-page__hero-footer">
          <span>适用于企业内部办公场景</span>
          <span>请妥善保管个人账号信息</span>
        </div>
      </div>

      <el-card shadow="never" class="login-page__card">
        <template #header>
          <div class="login-page__card-header">
            <div>
              <strong>账号登录</strong>
              <p>请输入账号和密码完成身份验证</p>
            </div>
          </div>
        </template>

        <el-form
          ref="formRef"
          :model="form"
          :rules="rules"
          label-position="top"
          @keyup.enter="handleSubmit"
        >
          <el-form-item label="账号" prop="username" :error="fieldErrors.username">
            <el-input
              v-model="form.username"
              data-testid="login-username-input"
              placeholder="请输入账号"
              clearable
            />
          </el-form-item>

          <el-form-item label="密码" prop="password" :error="fieldErrors.password">
            <el-input
              v-model="form.password"
              data-testid="login-password-input"
              placeholder="请输入密码"
              show-password
              clearable
            />
          </el-form-item>

          <el-alert
            v-if="formError"
            data-testid="login-form-error"
            class="login-page__error"
            type="error"
            :closable="false"
            :title="formError"
          />

          <el-button
            data-testid="login-submit-button"
            type="primary"
            class="login-page__submit"
            :loading="submitting"
            @click="handleSubmit"
          >
            登录系统
          </el-button>
        </el-form>

        <div class="login-page__tips">
          <div class="login-page__tips-row">
            <span>如无法登录，请联系系统管理员核对账号状态或重置密码。</span>
          </div>
        </div>
      </el-card>
    </div>
  </section>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { ElMessage } from 'element-plus/es/components/message/index.mjs'
import { useRoute, useRouter } from 'vue-router'

import { resolvePostLoginPath } from '../../router/guard'
import { useAuthStore } from '../../store/auth'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const formRef = ref()
const formError = ref('')
const fieldErrors = reactive({
  username: '',
  password: '',
})
const submitting = ref(false)
const form = reactive({
  username: '',
  password: '',
})

const rules = {
  username: [{ required: true, message: '请输入账号', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
}

function clearSubmitErrors() {
  formError.value = ''
  fieldErrors.username = ''
  fieldErrors.password = ''
}

function applySubmitError(error) {
  const message = error?.message || '登录失败，请稍后重试'

  if (error?.field && Object.prototype.hasOwnProperty.call(fieldErrors, error.field)) {
    fieldErrors[error.field] = message
    return
  }

  formError.value = message
}

async function handleSubmit() {
  if (submitting.value) {
    return
  }

  submitting.value = true
  clearSubmitErrors()
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) {
    submitting.value = false
    return
  }

  try {
    await authStore.login({
      username: form.username.trim(),
      password: form.password,
    })

    ElMessage.success('登录成功')
    router.replace(resolvePostLoginPath(route.query.redirect, authStore.defaultHomePath))
  } catch (error) {
    applySubmitError(error)
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 24px;
  background:
    radial-gradient(circle at top left, rgba(47, 105, 178, 0.1), transparent 28%),
    radial-gradient(circle at 80% 20%, rgba(15, 95, 148, 0.08), transparent 24%),
    linear-gradient(180deg, #f3f6fb 0%, #f7f9fc 52%, #eef3f9 100%);
}

.login-page__panel {
  width: min(1080px, 100%);
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(320px, 420px);
  gap: 24px;
  align-items: stretch;
}

.login-page__hero,
.login-page__card {
  border-radius: 24px;
}

.login-page__hero {
  display: grid;
  align-content: space-between;
  gap: 28px;
  padding: 36px;
  color: #1f2937;
  background: linear-gradient(180deg, #ffffff 0%, #f6f9fd 100%);
  border: 1px solid rgba(148, 163, 184, 0.18);
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.06);
}

.login-page__hero-head {
  display: flex;
  align-items: center;
  gap: 16px;
}

.login-page__brand-mark {
  width: 48px;
  height: 48px;
  display: grid;
  place-items: center;
  border-radius: 14px;
  background: linear-gradient(135deg, #245391 0%, #2f69b2 100%);
  color: #ffffff;
  font-size: 20px;
  font-weight: 700;
}

.login-page__hero h1 {
  margin: 8px 0 0;
  max-width: 680px;
  font-size: clamp(28px, 4vw, 38px);
  line-height: 1.3;
}

.login-page__hero p {
  margin: 0;
  max-width: 560px;
  line-height: 1.8;
  color: #475569;
}

.login-page__eyebrow {
  font-size: 13px;
  color: #2f69b2;
}

.login-page__card {
  align-self: center;
  border: none;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.98);
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.08);
}

.login-page__card-header strong {
  font-size: 22px;
  color: #0f172a;
}

.login-page__card-header p {
  margin: 8px 0 0;
  color: #64748b;
}

.login-page__submit {
  width: 100%;
  margin-top: 8px;
  min-height: 46px;
  border-radius: 14px;
}

.login-page__error {
  margin-bottom: 16px;
}

.login-page__notice-list {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.login-page__notice-card {
  padding: 18px;
  border-radius: 16px;
  background: #f8fafc;
  border: 1px solid rgba(148, 163, 184, 0.14);
}

.login-page__notice-card strong {
  display: block;
  margin-bottom: 10px;
  font-size: 15px;
  color: #0f172a;
}

.login-page__notice-card span {
  line-height: 1.7;
  color: #64748b;
}

.login-page__hero-footer {
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
  padding-top: 8px;
  border-top: 1px solid rgba(148, 163, 184, 0.16);
  color: #64748b;
  font-size: 13px;
}

.login-page__tips {
  margin-top: 16px;
  display: grid;
  gap: 14px;
  font-size: 12px;
  color: #64748b;
}

.login-page__tips-row {
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.18);
}

@media (max-width: 900px) {
  .login-page__panel {
    grid-template-columns: 1fr;
  }

  .login-page__hero {
    padding: 28px;
  }

  .login-page__hero-head {
    align-items: flex-start;
  }

  .login-page__notice-list {
    grid-template-columns: 1fr;
  }
}
</style>
