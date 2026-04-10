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
          <div class="login-page__hero-copy">
            <div class="login-page__hero-head">
              <h1>企业考勤管理系统</h1>
            </div>

            <p class="login-page__hero-desc">
              当前入口用于企业内部日常办公访问。请使用正式分配的账号登录，系统将根据账号身份进入对应工作页面。
            </p>
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
        </div>
      </div>

      <el-card shadow="never" class="login-page__card">
        <template #header>
          <div class="login-page__card-header">
            <div>
              <strong>账号登录</strong>
              <p>请输入正式分配的账号和密码后进入系统</p>
            </div>

            <span class="login-page__card-badge">企业内部</span>
          </div>
        </template>

        <div class="login-page__card-content">
          <section class="login-page__form-panel">
            <div class="login-page__form-head">
              <strong>账号验证</strong>
              <span>请输入账号信息完成身份校验后进入系统首页</span>
            </div>

            <div class="login-page__role-group">
              <span class="login-page__role-label">登录身份</span>

              <div class="login-page__role-actions">
                <button
                  v-for="item in roleOptions"
                  :key="item.code"
                  :data-testid="`login-role-${item.code.toLowerCase()}-button`"
                  type="button"
                  class="login-page__role-button"
                  :class="{ 'login-page__role-button--active': selectedRoleCode === item.code }"
                  @click="handleRoleSelect(item.code)"
                >
                  <strong>{{ item.label }}</strong>
                  <span>{{ item.desc }}</span>
                </button>
              </div>

              <p v-if="roleError" data-testid="login-role-error" class="login-page__role-error">{{ roleError }}</p>
            </div>

            <el-form
              ref="formRef"
              class="login-page__form"
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
          </section>

          <section class="login-page__tips-panel">
            <div class="login-page__tips-head">
              <strong>登录帮助</strong>
              <span>如遇账号异常，请优先联系系统管理员处理</span>
            </div>

            <div class="login-page__tips">
              <div v-for="item in formTips" :key="item.title" class="login-page__tips-row">
                <strong>{{ item.title }}</strong>
                <span>{{ item.desc }}</span>
              </div>
            </div>
          </section>
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
import { onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus/es/components/message/index.mjs'
import { useRoute, useRouter } from 'vue-router'

import { resolvePostLoginPath } from '../../router/guard'
import { useAuthStore } from '../../store/auth'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const pageScrollState = {
  htmlOverflow: '',
  bodyOverflow: '',
}

const formRef = ref()
const formError = ref('')
const roleError = ref('')
const selectedRoleCode = ref('')
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

const roleOptions = [
  {
    code: 'ADMIN',
    label: '管理员',
    desc: '系统配置与综合管理',
  },
  {
    code: 'EMPLOYEE',
    label: '员工',
    desc: '日常打卡与个人业务',
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

onMounted(() => {
  if (typeof document === 'undefined') {
    return
  }

  pageScrollState.htmlOverflow = document.documentElement.style.overflow
  pageScrollState.bodyOverflow = document.body.style.overflow

  document.documentElement.style.overflow = 'hidden'
  document.body.style.overflow = 'hidden'
})

onBeforeUnmount(() => {
  if (typeof document === 'undefined') {
    return
  }

  document.documentElement.style.overflow = pageScrollState.htmlOverflow
  document.body.style.overflow = pageScrollState.bodyOverflow
})

function clearSubmitErrors() {
  formError.value = ''
  roleError.value = ''
  fieldErrors.username = ''
  fieldErrors.password = ''
}

function applySubmitError(error) {
  const message = error?.message || '登录失败，请稍后重试'

  if (error?.field === 'role') {
    roleError.value = message
    return
  }

  if (error?.field && Object.prototype.hasOwnProperty.call(fieldErrors, error.field)) {
    fieldErrors[error.field] = message
    return
  }

  formError.value = message
}

function handleRoleSelect(roleCode) {
  selectedRoleCode.value = roleCode
  roleError.value = ''
}

async function handleSubmit() {
  if (submitting.value) {
    return
  }

  submitting.value = true
  clearSubmitErrors()

  if (!selectedRoleCode.value) {
    roleError.value = '请选择登录身份'
    submitting.value = false
    return
  }

  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) {
    submitting.value = false
    return
  }

  try {
    await authStore.login({
      username: form.username.trim(),
      password: form.password,
      expectedRoleCode: selectedRoleCode.value,
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
  height: 100dvh;
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 20px;
  overflow: hidden;
  background:
    radial-gradient(circle at top left, rgba(36, 83, 145, 0.14), transparent 28%),
    radial-gradient(circle at right 20%, rgba(15, 95, 148, 0.12), transparent 26%),
    linear-gradient(135deg, #edf3f9 0%, #f6f8fb 50%, #edf2f7 100%);
}

.login-page__panel {
  width: min(1240px, 100%);
  height: min(760px, calc(100dvh - 40px));
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;
  align-items: stretch;
}

.login-page__hero,
.login-page__card {
  height: 100%;
  border-radius: 28px;
}

.login-page__hero {
  display: flex;
  flex-direction: column;
  color: #1f2937;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.96) 0%, #ffffff 100%);
  border: 1px solid rgba(148, 163, 184, 0.18);
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.08);
  overflow: hidden;
}

.login-page__portal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 22px 28px;
  background: linear-gradient(135deg, #16395f 0%, #245391 58%, #2f69b2 100%);
  color: #ffffff;
}

.login-page__portal-head strong,
.login-page__portal-head span {
  display: block;
}

.login-page__portal-head strong {
  font-size: 18px;
  letter-spacing: 0.04em;
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
  min-height: 34px;
  display: inline-flex;
  align-items: center;
  padding: 0 14px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.14);
  color: #ffffff;
  font-size: 12px;
  font-weight: 600;
}

.login-page__hero-main {
  display: grid;
  flex: 1;
  grid-template-rows: auto auto minmax(0, 1fr);
  gap: 18px;
  padding: 30px 32px 32px;
}

.login-page__hero-copy {
  display: grid;
  gap: 18px;
}

.login-page__hero-head {
  display: grid;
  justify-items: center;
  text-align: center;
}

.login-page__hero h1 {
  margin: 0;
  font-size: clamp(34px, 3.5vw, 46px);
  line-height: 1.22;
  color: #0f172a;
}

.login-page__hero p {
  margin: 0;
  line-height: 1.8;
  color: #475569;
}

.login-page__hero-desc {
  max-width: 520px;
  font-size: 14px;
  justify-self: center;
  text-align: center;
}

.login-page__service-board,
.login-page__notice-board {
  display: grid;
  gap: 12px;
  padding: 18px 20px;
  border-radius: 20px;
  background: linear-gradient(180deg, rgba(247, 250, 252, 0.92) 0%, rgba(255, 255, 255, 0.98) 100%);
  border: 1px solid rgba(148, 163, 184, 0.14);
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.04);
}

.login-page__notice-board {
  align-content: start;
}

.login-page__section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.login-page__section-head strong {
  color: #0f172a;
  font-size: 15px;
}

.login-page__section-head span {
  color: #64748b;
  font-size: 12px;
}

.login-page__service-list {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.login-page__service-card {
  display: grid;
  gap: 6px;
  padding: 14px 14px 15px;
  border-radius: 16px;
  background: #ffffff;
  border: 1px solid rgba(148, 163, 184, 0.12);
  border-top: 3px solid rgba(36, 83, 145, 0.18);
}

.login-page__service-card strong {
  color: #0f172a;
  font-size: 14px;
}

.login-page__service-card span {
  color: #64748b;
  line-height: 1.6;
  font-size: 12px;
}

.login-page__card {
  display: flex;
  flex-direction: column;
  border: none;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.98);
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.1);
}

.login-page__card :deep(.el-card__header) {
  padding: 28px 28px 0;
  border-bottom: none;
}

.login-page__card :deep(.el-card__body) {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 20px 28px 24px;
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
  margin: 6px 0 0;
  color: #64748b;
  font-size: 13px;
  line-height: 1.6;
}

.login-page__card-badge {
  display: inline-flex;
  align-items: center;
  min-height: 34px;
  padding: 0 14px;
  border-radius: 999px;
  background: rgba(31, 77, 127, 0.08);
  color: #245391;
  font-size: 12px;
  font-weight: 600;
}

.login-page__card-content {
  display: grid;
  gap: 14px;
}

.login-page__form-panel,
.login-page__tips-panel {
  display: grid;
  gap: 12px;
  padding: 16px;
  border-radius: 18px;
  border: 1px solid rgba(148, 163, 184, 0.14);
  background: linear-gradient(180deg, rgba(248, 250, 252, 0.92) 0%, rgba(255, 255, 255, 0.98) 100%);
}

.login-page__form-head,
.login-page__tips-head {
  display: grid;
  gap: 4px;
}

.login-page__form-head strong,
.login-page__tips-head strong {
  color: #0f172a;
  font-size: 14px;
}

.login-page__form-head span,
.login-page__tips-head span {
  color: #64748b;
  font-size: 12px;
  line-height: 1.5;
}

.login-page__role-group {
  display: grid;
  gap: 8px;
}

.login-page__role-label {
  color: #334155;
  font-size: 12px;
  font-weight: 600;
}

.login-page__role-actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px;
  padding: 6px;
  border-radius: 18px;
  background: linear-gradient(180deg, rgba(226, 232, 240, 0.72) 0%, rgba(241, 245, 249, 0.92) 100%);
  box-shadow: inset 0 0 0 1px rgba(148, 163, 184, 0.16);
}

.login-page__role-button {
  display: grid;
  align-content: center;
  justify-items: center;
  gap: 3px;
  min-height: 58px;
  padding: 10px 12px;
  border: 1px solid transparent;
  border-radius: 16px;
  background: transparent;
  text-align: center;
  cursor: pointer;
  transition: background-color 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
}

.login-page__role-button:hover {
  background: rgba(255, 255, 255, 0.78);
}

.login-page__role-button--active {
  border-color: rgba(36, 83, 145, 0.26);
  background: linear-gradient(135deg, #245391 0%, #2f69b2 100%);
  box-shadow: 0 10px 20px rgba(36, 83, 145, 0.18);
}

.login-page__role-button--active:hover {
  background: linear-gradient(135deg, #1f4d7f 0%, #2b63a8 100%);
  border-color: rgba(31, 77, 127, 0.34);
  box-shadow: 0 12px 22px rgba(36, 83, 145, 0.22);
}

.login-page__role-button strong,
.login-page__role-button span {
  display: block;
}

.login-page__role-button strong {
  color: #0f172a;
  font-size: 14px;
  font-weight: 700;
}

.login-page__role-button span {
  color: #64748b;
  font-size: 11px;
  line-height: 1.5;
}

.login-page__role-button--active strong {
  color: #ffffff;
}

.login-page__role-button--active span {
  color: rgba(241, 245, 249, 0.9);
}

.login-page__role-error {
  margin: 0;
  color: #c2410c;
  font-size: 12px;
}

.login-page__form :deep(.el-form-item) {
  margin-bottom: 14px;
}

.login-page__form :deep(.el-form-item:last-of-type) {
  margin-bottom: 6px;
}

.login-page__form :deep(.el-form-item__label) {
  padding-bottom: 6px;
  color: #334155;
  font-weight: 600;
}

.login-page__form :deep(.el-input__wrapper) {
  min-height: 42px;
}

.login-page__form :deep(.el-form-item__error) {
  display: none;
}

.login-page__form :deep(.el-form-item.is-error .el-input__wrapper) {
  box-shadow: 0 0 0 1px rgba(194, 65, 12, 0.52) inset !important;
  background-color: #fff7ed !important;
}

.login-page__submit {
  width: 100%;
  margin-top: 10px;
  min-height: 46px;
  border-radius: 16px;
}

.login-page__error {
  margin-bottom: 12px;
}

.login-page__notice-list {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.login-page__notice-card {
  padding: 14px;
  border-radius: 16px;
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
  margin: 6px 0 8px;
  font-size: 14px;
  color: #0f172a;
}

.login-page__notice-card span {
  line-height: 1.6;
  color: #64748b;
  font-size: 12px;
}

.login-page__tips {
  display: grid;
  gap: 10px;
}

.login-page__tips-row {
  display: grid;
  gap: 4px;
  padding: 10px 0 0;
  border-top: 1px solid rgba(148, 163, 184, 0.16);
}

.login-page__tips-row:first-child {
  padding-top: 0;
  border-top: none;
}

.login-page__tips-row strong {
  color: #0f172a;
  font-size: 12px;
}

.login-page__tips-row span {
  color: #64748b;
  font-size: 11px;
  line-height: 1.6;
}

.login-page__card-footer {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  margin-top: auto;
  padding-top: 12px;
  border-top: 1px solid rgba(148, 163, 184, 0.16);
  color: #64748b;
  font-size: 11px;
}

@media (max-width: 900px) {
  .login-page {
    padding: 16px;
  }

  .login-page__panel {
    height: calc(100dvh - 32px);
    grid-template-columns: 1fr;
    grid-template-rows: repeat(2, minmax(0, 1fr));
  }

  .login-page__hero {
    min-height: 0;
  }

  .login-page__card-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .login-page__portal-head,
  .login-page__hero-main {
    padding-left: 24px;
    padding-right: 24px;
  }

  .login-page__hero-main {
    grid-template-rows: auto auto auto;
    padding-top: 24px;
    padding-bottom: 24px;
    gap: 18px;
  }

  .login-page__service-list,
  .login-page__notice-list {
    grid-template-columns: 1fr;
  }

  .login-page__card :deep(.el-card__header),
  .login-page__card :deep(.el-card__body) {
    padding-left: 24px;
    padding-right: 24px;
  }

  .login-page__form-panel,
  .login-page__tips-panel {
    padding: 14px;
  }

  .login-page__role-actions {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 640px) {
  .login-page__hero,
  .login-page__card {
    border-radius: 20px;
  }

  .login-page__panel {
    gap: 14px;
  }

  .login-page__portal-head,
  .login-page__hero-main {
    padding-left: 20px;
    padding-right: 20px;
  }

  .login-page__portal-head {
    flex-direction: column;
    align-items: flex-start;
    padding-top: 18px;
    padding-bottom: 18px;
  }

  .login-page__hero-main {
    padding-top: 20px;
    padding-bottom: 20px;
  }

  .login-page__hero-copy {
    gap: 16px;
  }

  .login-page__service-board,
  .login-page__notice-board {
    padding: 16px;
  }

  .login-page__card :deep(.el-card__header),
  .login-page__card :deep(.el-card__body) {
    padding-left: 20px;
    padding-right: 20px;
  }

  .login-page__card-content {
    gap: 12px;
  }

  .login-page__form-panel,
  .login-page__tips-panel {
    padding: 12px;
    gap: 10px;
  }

  .login-page__role-actions {
    grid-template-columns: 1fr;
  }

  .login-page__role-button {
    min-height: 56px;
    padding: 10px 12px;
  }

  .login-page__card-header strong {
    font-size: 20px;
  }
}
</style>
