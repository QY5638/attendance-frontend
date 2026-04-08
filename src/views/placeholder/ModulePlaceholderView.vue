<template>
  <section class="placeholder-card">
    <div class="placeholder-card__head">
      <div>
        <p class="placeholder-card__eyebrow">{{ route.meta.menuGroup || '功能页面' }}</p>
        <h2>{{ route.meta.title || '功能准备中' }}</h2>
      </div>
      <el-tag type="warning">准备中</el-tag>
    </div>

    <p class="placeholder-card__desc">
      当前页面正在完善中，后续将按业务计划逐步开放相关内容。
    </p>

    <div class="placeholder-card__meta">
      <div>
        <span>页面状态</span>
        <strong>准备中</strong>
      </div>
      <div>
        <span>适用对象</span>
        <strong>{{ roleLabels }}</strong>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

const roleLabels = computed(() => {
  const roles = Array.isArray(route.meta.roles) ? route.meta.roles : []

  if (!roles.length) {
    return '全部用户'
  }

  return roles
    .map((role) => {
      if (role === 'ADMIN') {
        return '管理员'
      }

      if (role === 'EMPLOYEE') {
        return '员工'
      }

      return role
    })
    .join(' / ')
})
</script>

<style scoped>
.placeholder-card {
  padding: 28px;
  border-radius: 28px;
  background: linear-gradient(145deg, #ffffff 0%, #eef2ff 100%);
  box-shadow: 0 24px 80px rgba(15, 23, 42, 0.08);
}

.placeholder-card__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.placeholder-card__eyebrow {
  margin: 0 0 10px;
  color: #6366f1;
  font-size: 13px;
}

.placeholder-card h2 {
  margin: 0;
  font-size: 28px;
  color: #0f172a;
}

.placeholder-card__desc {
  margin: 18px 0 24px;
  max-width: 720px;
  line-height: 1.8;
  color: #475569;
}

.placeholder-card__meta {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 16px;
}

.placeholder-card__meta div {
  padding: 16px;
  border-radius: 18px;
  background: rgba(99, 102, 241, 0.08);
}

.placeholder-card__meta span {
  display: block;
  margin-bottom: 8px;
  font-size: 12px;
  color: #64748b;
}

.placeholder-card__meta strong {
  color: #0f172a;
  word-break: break-all;
}
</style>
