<template>
  <section class="login-page">
    <div class="login-page__panel">
      <div class="login-page__hero">
        <p class="login-page__eyebrow">企业考勤管理平台</p>
        <h1>欢迎登录考勤管理平台</h1>
        <p>
          请使用企业账号登录系统。登录后会根据身份进入对应的工作页面。
        </p>

        <div class="login-page__notice-list">
          <article class="login-page__notice-card">
            <strong>统一登录入口</strong>
            <span>员工和管理员使用同一入口登录系统。</span>
          </article>
          <article class="login-page__notice-card">
            <strong>按角色进入</strong>
            <span>登录成功后自动进入对应的工作页面。</span>
          </article>
          <article class="login-page__notice-card">
            <strong>登录帮助</strong>
            <span>如账号无法使用或忘记密码，请联系系统管理员。</span>
          </article>
        </div>
      </div>

      <el-card shadow="never" class="login-page__card">
        <template #header>
          <div class="login-page__card-header">
            <div>
              <strong>账号登录</strong>
              <p>请输入企业账号和密码</p>
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
          <el-form-item label="用户名" prop="username" :error="fieldErrors.username">
            <el-input
              v-model="form.username"
              data-testid="login-username-input"
              placeholder="请输入用户名"
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
            <span>如无法登录，请联系系统管理员处理账号或密码问题。</span>
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
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
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
    radial-gradient(circle at top left, rgba(56, 189, 248, 0.18), transparent 24%),
    radial-gradient(circle at 80% 20%, rgba(96, 165, 250, 0.24), transparent 26%),
    radial-gradient(circle at bottom right, rgba(99, 102, 241, 0.22), transparent 34%),
    linear-gradient(135deg, #020617 0%, #0f172a 42%, #172554 100%);
}

.login-page__panel {
  width: min(1080px, 100%);
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(320px, 420px);
  gap: 24px;
}

.login-page__hero,
.login-page__card {
  border-radius: 28px;
}

.login-page__hero {
  display: grid;
  align-content: space-between;
  gap: 28px;
  padding: 40px;
  color: #eff6ff;
  background: linear-gradient(180deg, rgba(15, 23, 42, 0.62), rgba(15, 23, 42, 0.34));
  border: 1px solid rgba(255, 255, 255, 0.12);
  box-shadow: 0 30px 80px rgba(15, 23, 42, 0.35);
  backdrop-filter: blur(16px);
}

.login-page__hero h1 {
  margin: 12px 0 16px;
  max-width: 680px;
  font-size: clamp(34px, 6vw, 54px);
  line-height: 1.05;
  letter-spacing: -0.04em;
}

.login-page__hero p {
  margin: 0;
  max-width: 560px;
  line-height: 1.8;
  color: rgba(239, 246, 255, 0.78);
}

.login-page__eyebrow {
  font-size: 12px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: #7dd3fc;
}

.login-page__card {
  align-self: center;
  border: none;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 24px 60px rgba(15, 23, 42, 0.16);
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
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.login-page__notice-card strong {
  display: block;
  margin-bottom: 10px;
  font-size: 15px;
  color: #f8fafc;
}

.login-page__notice-card span {
  line-height: 1.7;
  color: rgba(226, 232, 240, 0.84);
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

  .login-page__notice-list {
    grid-template-columns: 1fr;
  }
}
</style>
