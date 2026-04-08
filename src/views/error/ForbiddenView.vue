<template>
  <section class="forbidden-page">
    <el-result icon="warning" title="当前页面暂不可访问" sub-title="当前账号暂未开通该页面访问权限，请返回可访问页面继续办理业务。">
      <template #extra>
        <el-button type="primary" @click="goHome">返回首页</el-button>
        <el-button @click="goLogin">重新登录</el-button>
      </template>
    </el-result>
  </section>
</template>

<script setup>
import { useRouter } from 'vue-router'

import { useAuthStore } from '../../store/auth'

const router = useRouter()
const authStore = useAuthStore()

function goHome() {
  router.replace(authStore.defaultHomePath)
}

function goLogin() {
  authStore.logout()
  router.replace('/login')
}
</script>

<style scoped>
.forbidden-page {
  min-height: calc(100vh - 140px);
  display: grid;
  place-items: center;
  border-radius: 24px;
  background: linear-gradient(180deg, #ffffff 0%, #f7f9fc 100%);
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.06);
}
</style>
