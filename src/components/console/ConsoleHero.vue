<template>
  <header class="console-hero" :class="heroClass">
    <div>
      <h1>{{ title }}</h1>
      <p class="console-hero__desc">{{ description }}</p>
    </div>

    <div v-if="cards.length || $slots.actions" class="console-hero__aside">
      <div v-if="$slots.actions" class="console-hero__actions">
        <slot name="actions" />
      </div>

      <div v-if="cards.length" class="console-hero__cards">
        <article v-for="item in cards" :key="item.key || item.label" class="console-hero__card">
          <span>{{ item.label }}</span>
          <strong>{{ item.value }}</strong>
        </article>
      </div>
    </div>
  </header>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  title: {
    type: String,
    default: '',
  },
  description: {
    type: String,
    default: '',
  },
  cards: {
    type: Array,
    default: () => [],
  },
  theme: {
    type: String,
    default: 'indigo',
  },
})

const heroClass = computed(() => `console-hero--${props.theme}`)
</script>
