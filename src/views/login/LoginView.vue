<template>
  <section class="login-page">
    <div class="login-page__panel">
      <div class="login-page__hero">
        <div class="login-page__portal-head">
          <div>
            <strong>企业内部办公门户</strong>
            <span>统一身份认证入口</span>
          </div>
          <div class="login-page__portal-badges">
            <span>内部访问</span>
            <span>统一认证</span>
          </div>
        </div>

        <div class="login-page__hero-main">
          <div class="login-page__hero-head">
            <div class="login-page__brand-mark">勤</div>
            <div>
              <p class="login-page__eyebrow">企业考勤管理系统</p>
              <h1>内部办公统一登录入口</h1>
            </div>
          </div>

          <p class="login-page__hero-desc">
            当前入口用于企业内部日常办公访问。请使用正式分配的账号登录，系统将根据账号身份进入对应工作页面。
          </p>

          <div class="login-page__hero-metrics">
            <article v-for="item in heroMetrics" :key="item.label" class="login-page__metric-card">
              <span>{{ item.label }}</span>
              <strong>{{ item.value }}</strong>
            </article>
          </div>

          <section class="login-page__service-board">
            <div class="login-page__section-head">
              <strong>常用业务</strong>
              <span>登录后按权限进入对应业务页面</span>
            </div>

            <div class="login-page__service-list">
              <article v-for="item in serviceItems" :key="item.title" class="login-page__service-card">
                <strong>{{ item.title }}</strong>
                <span>{{ item.desc }}</span>
              </article>
            </div>
          </section>
        </div>

        <section class="login-page__notice-board">
          <div class="login-page__section-head">
            <strong>登录要求</strong>
            <span>请确认账号状态正常后再登录</span>
          </div>

          <div class="login-page__notice-list">
            <article v-for="item in noticeItems" :key="item.title" class="login-page__notice-card">
              <small>{{ item.title }}</small>
              <strong>{{ item.value }}</strong>
              <span>{{ item.desc }}</span>
            </article>
          </div>
        </section>

        <div class="login-page__hero-footer">
          <span>适用于企业内部办公场景</span>
          <span>请妥善保管个人账号信息</span>
        </div>
      </div>

      <el-card shadow="never" class="login-page__card">
        <template #header>
          <div class="login-page__card-header">
            <div>
              <strong>身份验证</strong>
              <p>请输入账号和密码后登录系统</p>
            </div>

            <span class="login-page__card-badge">内部访问</span>
          </div>
        </template>

        <div class="login-page__card-notice">
          <strong>登录提醒</strong>
          <p>本系统仅限已授权人员使用。请确认账号处于启用状态，并在登录后按权限办理业务。</p>
        </div>

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
          <div v-for="item in formTips" :key="item.title" class="login-page__tips-row">
            <strong>{{ item.title }}</strong>
            <span>{{ item.desc }}</span>
          </div>
        </div>

        <div class="login-page__card-footer">
          <span>未授权人员请勿使用本系统</span>
          <span>登录成功后请及时开展业务办理</span>
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

const heroMetrics = [
  {
    label: '适用范围',
    value: '企业内部',
  },
  {
    label: '登录方式',
    value: '统一入口',
  },
  {
    label: '账号维护',
    value: '统一分配',
  },
  {
    label: '业务覆盖',
    value: '日常办公',
  },
]

const noticeItems = [
  {
    title: '账号管理',
    value: '统一维护',
    desc: '账号由系统管理员统一建立、启用和停用。',
  },
  {
    title: '访问范围',
    value: '按权限进入',
    desc: '管理员和员工使用同一入口，登录后自动进入对应工作区。',
  },
  {
    title: '异常处理',
    value: '及时联系',
    desc: '如遇密码遗忘、账号停用或登录异常，请联系系统管理员。',
  },
]

const serviceItems = [
  {
    title: '日常考勤',
    desc: '支持打卡办理、记录查询和补卡申请。',
  },
  {
    title: '异常处置',
    desc: '支持异常查看、预警处理和人工复核。',
  },
  {
    title: '管理维护',
    desc: '支持基础资料、规则配置和系统管理。',
  },
]

const formTips = [
  {
    title: '账号支持',
    desc: '如无法登录，请联系系统管理员核对账号状态或重置密码。',
  },
  {
    title: '使用提醒',
    desc: '登录后请按实际权限办理业务，并注意保护个人账号信息。',
  },
]

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
    linear-gradient(180deg, rgba(18, 52, 86, 0.06) 0%, transparent 18%),
    linear-gradient(180deg, #f3f5f8 0%, #f7f9fc 52%, #eef2f6 100%);
}

.login-page__panel {
  width: min(1140px, 100%);
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
  gap: 22px;
  padding: 0;
  color: #1f2937;
  background: #ffffff;
  border: 1px solid rgba(148, 163, 184, 0.18);
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.06);
  overflow: hidden;
}

.login-page__portal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 28px;
  background: linear-gradient(135deg, #1f4d7f 0%, #245391 100%);
  color: #ffffff;
}

.login-page__portal-head strong,
.login-page__portal-head span {
  display: block;
}

.login-page__portal-head strong {
  font-size: 18px;
}

.login-page__portal-head span {
  margin-top: 4px;
  color: rgba(226, 232, 240, 0.86);
  font-size: 12px;
}

.login-page__portal-badges {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.login-page__portal-badges span {
  margin: 0;
  min-height: 30px;
  display: inline-flex;
  align-items: center;
  padding: 0 12px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.12);
  color: #ffffff;
  font-size: 12px;
  font-weight: 600;
}

.login-page__hero-main {
  display: grid;
  gap: 22px;
  padding: 28px 32px 0;
}

.login-page__hero-head {
  display: flex;
  align-items: center;
  gap: 16px;
}

.login-page__brand-mark {
  width: 52px;
  height: 52px;
  display: grid;
  place-items: center;
  border-radius: 12px;
  background: linear-gradient(135deg, #1f4d7f 0%, #245391 100%);
  color: #ffffff;
  font-size: 22px;
  font-weight: 700;
}

.login-page__hero h1 {
  margin: 8px 0 0;
  max-width: 680px;
  font-size: clamp(30px, 4vw, 40px);
  line-height: 1.3;
}

.login-page__hero p {
  margin: 0;
  max-width: 560px;
  line-height: 1.8;
  color: #475569;
}

.login-page__hero-desc {
  font-size: 15px;
}

.login-page__eyebrow {
  font-size: 13px;
  color: #1f4d7f;
}

.login-page__hero-metrics {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.login-page__metric-card {
  padding: 16px 18px;
  border-radius: 12px;
  background: #f7f9fc;
  border: 1px solid rgba(148, 163, 184, 0.12);
}

.login-page__metric-card span,
.login-page__metric-card strong {
  display: block;
}

.login-page__metric-card span {
  font-size: 12px;
  color: #64748b;
}

.login-page__metric-card strong {
  margin-top: 8px;
  color: #0f172a;
  font-size: 18px;
}

.login-page__service-board,
.login-page__notice-board {
  display: grid;
  gap: 14px;
  padding: 20px 24px;
  border-radius: 0;
  background: #f9fbfd;
  border: 1px solid rgba(148, 163, 184, 0.14);
}

.login-page__service-board {
  border-left: 0;
  border-right: 0;
}

.login-page__notice-board {
  margin: 0 32px;
  border-radius: 12px;
  background: #ffffff;
}

.login-page__section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.login-page__section-head strong {
  color: #0f172a;
  font-size: 16px;
}

.login-page__section-head span {
  color: #64748b;
  font-size: 13px;
}

.login-page__service-list {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.login-page__service-card {
  display: grid;
  gap: 8px;
  padding: 16px 18px;
  border-radius: 12px;
  background: #ffffff;
  border: 1px solid rgba(148, 163, 184, 0.12);
  border-top: 3px solid rgba(36, 83, 145, 0.2);
}

.login-page__service-card strong {
  color: #0f172a;
  font-size: 15px;
}

.login-page__service-card span {
  color: #64748b;
  line-height: 1.7;
  font-size: 13px;
}

.login-page__card {
  align-self: center;
  border: none;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.98);
  box-shadow: 0 16px 32px rgba(15, 23, 42, 0.08);
}

.login-page__card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.login-page__card-header > div {
  position: relative;
  padding-left: 14px;
}

.login-page__card-header > div::before {
  content: '';
  position: absolute;
  left: 0;
  top: 4px;
  bottom: 4px;
  width: 4px;
  border-radius: 999px;
  background: linear-gradient(180deg, #245391 0%, #2f69b2 100%);
}

.login-page__card-header strong {
  font-size: 22px;
  color: #0f172a;
}

.login-page__card-header p {
  margin: 8px 0 0;
  color: #64748b;
}

.login-page__card-badge {
  display: inline-flex;
  align-items: center;
  min-height: 30px;
  padding: 0 12px;
  border-radius: 999px;
  background: rgba(31, 77, 127, 0.08);
  color: #245391;
  font-size: 12px;
  font-weight: 600;
}

.login-page__card-notice {
  margin-bottom: 20px;
  padding: 14px 16px;
  border-radius: 16px;
  background: rgba(47, 105, 178, 0.08);
}

.login-page__card-notice strong {
  display: block;
  color: #245391;
  font-size: 14px;
}

.login-page__card-notice p {
  margin: 8px 0 0;
  color: #475569;
  line-height: 1.7;
  font-size: 13px;
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
  border-radius: 12px;
  background: #f8fafc;
  border: 1px solid rgba(148, 163, 184, 0.12);
}

.login-page__notice-card small {
  display: block;
  color: #64748b;
  font-size: 12px;
}

.login-page__notice-card strong {
  display: block;
  margin: 8px 0 10px;
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
  margin: 0 32px 28px;
  padding-top: 14px;
  border-top: 1px solid rgba(148, 163, 184, 0.16);
  color: #64748b;
  font-size: 13px;
}

.login-page__tips {
  margin-top: 16px;
  display: grid;
  gap: 12px;
}

.login-page__tips-row {
  display: grid;
  gap: 6px;
  padding: 12px 0;
  border-top: 1px solid rgba(148, 163, 184, 0.16);
}

.login-page__tips-row strong {
  color: #0f172a;
  font-size: 13px;
}

.login-page__tips-row span {
  color: #64748b;
  font-size: 12px;
  line-height: 1.7;
}

.login-page__card-footer {
  display: flex;
  gap: 18px;
  flex-wrap: wrap;
  margin-top: 16px;
  padding-top: 14px;
  border-top: 1px solid rgba(148, 163, 184, 0.16);
  color: #64748b;
  font-size: 12px;
}

@media (max-width: 900px) {
  .login-page__panel {
    grid-template-columns: 1fr;
  }

  .login-page__hero {
    gap: 18px;
  }

  .login-page__hero-head {
    align-items: flex-start;
  }

  .login-page__notice-list {
    grid-template-columns: 1fr;
  }

  .login-page__hero-metrics {
    grid-template-columns: 1fr 1fr;
  }

  .login-page__section-head,
  .login-page__card-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .login-page__portal-head,
  .login-page__hero-main {
    padding-left: 24px;
    padding-right: 24px;
  }

  .login-page__notice-board,
  .login-page__hero-footer {
    margin-left: 24px;
    margin-right: 24px;
  }

  .login-page__service-list {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .login-page {
    padding: 16px;
  }

  .login-page__hero,
  .login-page__card {
    border-radius: 20px;
  }

  .login-page__card :deep(.el-card__body) {
    padding: 24px;
  }

  .login-page__portal-head,
  .login-page__hero-main,
  .login-page__notice-board,
  .login-page__hero-footer {
    margin-left: 0;
    margin-right: 0;
    padding-left: 20px;
    padding-right: 20px;
  }

  .login-page__hero-footer {
    margin-bottom: 20px;
  }

  .login-page__hero-metrics {
    grid-template-columns: 1fr;
  }
}
</style>
