<template>
  <section class="console-overview-grid">
    <article
      v-for="item in items"
      :key="item.key || item.label"
      class="console-overview-card"
      :class="{ 'console-overview-card--interactive': isInteractive(item) }"
      :style="{
        '--console-overview-accent': accent,
      }"
      @click="handleClick(item)"
    >
      <span>{{ item.label }}</span>
      <strong>{{ item.value }}</strong>
      <small v-if="item.desc">{{ item.desc }}</small>
    </article>
  </section>
</template>

<script setup>
const props = defineProps({
  items: {
    type: Array,
    default: () => [],
  },
  accent: {
    type: String,
    default: 'var(--console-primary-600)',
  },
})

function isInteractive(item = {}) {
  return typeof item.onClick === 'function'
}

function handleClick(item = {}) {
  if (typeof item.onClick === 'function') {
    item.onClick()
  }
}
</script>

<style scoped>
.console-overview-card--interactive {
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.console-overview-card--interactive:hover {
  transform: translateY(-2px);
  box-shadow: 0 16px 28px rgba(15, 23, 42, 0.08);
}
</style>
