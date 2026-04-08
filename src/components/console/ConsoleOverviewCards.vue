<template>
  <section class="console-overview-grid">
    <article
      v-for="item in items"
      :key="item.key || item.label"
      class="console-overview-card"
      :style="{
        '--console-overview-accent': accent,
      }"
    >
      <span>{{ item.label }}</span>
      <strong>{{ item.value }}</strong>
      <small v-if="item.desc">{{ item.desc }}</small>
    </article>
  </section>
</template>

<script setup>
defineProps({
  items: {
    type: Array,
    default: () => [],
  },
  accent: {
    type: String,
    default: 'var(--console-primary-600)',
  },
})
</script>
