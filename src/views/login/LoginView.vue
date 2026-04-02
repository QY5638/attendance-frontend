<template>
  <section class="login-page">
    <div class="login-page__panel">
      <div class="login-page__hero">
        <p class="login-page__eyebrow">FE-01 公共壳层与认证模块</p>
        <h1>考勤异常检测与预警系统</h1>
        <p>
          登录成功后将按 `roleCode` 进入对应后台入口，并为后续 FE-02 ~ FE-08
          提供统一壳层与路由权限基础。
        </p>
      </div>

      <el-card shadow="never" class="login-page__card">
        <template #header>
          <div class="login-page__card-header">
            <div>
              <strong>账号登录</strong>
              <p>请输入系统账号与密码</p>
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
          <el-form-item label="用户名" prop="username">
            <el-input v-model="form.username" placeholder="请输入用户名" clearable />
          </el-form-item>

          <el-form-item label="密码" prop="password">
            <el-input
              v-model="form.password"
              placeholder="请输入密码"
              show-password
              clearable
            />
          </el-form-item>

          <el-button type="primary" class="login-page__submit" :loading="submitting" @click="handleSubmit">
            登录系统
          </el-button>
        </el-form>

        <div class="login-page__tips">
          <span>后端代理：`/api` -> `http://127.0.0.1:8080`</span>
        </div>
      </el-card>
    </div>
  </section>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useRoute, useRouter } from 'vue-router'

import { useAuthStore } from '../../store/auth'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const formRef = ref()
const submitting = ref(false)
const form = reactive({
  username: '',
  password: '',
})

const rules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
}

async function handleSubmit() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) {
    return
  }

  submitting.value = true

  try {
    await authStore.login({
      username: form.username.trim(),
      password: form.password,
    })

    ElMessage.success('登录成功')
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : ''
    router.replace(redirect || authStore.defaultHomePath)
  } catch (error) {
    ElMessage.error(error?.message || '登录失败，请稍后重试')
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
    radial-gradient(circle at top left, rgba(56, 189, 248, 0.25), transparent 35%),
    radial-gradient(circle at bottom right, rgba(99, 102, 241, 0.28), transparent 40%),
    linear-gradient(135deg, #020617 0%, #111827 45%, #1d4ed8 100%);
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
  padding: 40px;
  color: #eff6ff;
  background: rgba(15, 23, 42, 0.42);
  border: 1px solid rgba(255, 255, 255, 0.12);
  box-shadow: 0 30px 80px rgba(15, 23, 42, 0.35);
}

.login-page__hero h1 {
  margin: 12px 0 16px;
  font-size: clamp(32px, 6vw, 48px);
  line-height: 1.1;
}

.login-page__hero p {
  margin: 0;
  max-width: 560px;
  line-height: 1.8;
  color: rgba(239, 246, 255, 0.78);
}

.login-page__eyebrow {
  font-size: 14px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #7dd3fc;
}

.login-page__card {
  align-self: center;
  border: none;
}

.login-page__card-header strong {
  font-size: 18px;
  color: #0f172a;
}

.login-page__card-header p {
  margin: 8px 0 0;
  color: #64748b;
}

.login-page__submit {
  width: 100%;
  margin-top: 8px;
}

.login-page__tips {
  margin-top: 16px;
  font-size: 12px;
  color: #64748b;
}

@media (max-width: 900px) {
  .login-page__panel {
    grid-template-columns: 1fr;
  }

  .login-page__hero {
    padding: 28px;
  }
}
</style>
