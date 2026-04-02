<template>
  <section class="forbidden-page">
    <el-result icon="warning" title="无权访问该页面" sub-title="当前账号角色与目标页面不匹配，请返回可访问的功能入口。">
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
  background: #ffffff;
}
</style>
