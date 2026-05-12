<template>
  <section class="acu-v2-placeholder">
    <header class="acu-v2-placeholder__header">
      <h2 class="acu-v2-placeholder__title">{{ title }}</h2>
      <code class="acu-v2-placeholder__id">id: {{ pageId }}</code>
    </header>
    <p class="acu-v2-placeholder__body">
      阶段 0 占位页。后续批次会接入真实表单与控件。
    </p>
    <slot />
  </section>
</template>

<script setup lang="ts">
defineProps<{
  pageId: string;
  title: string;
}>();
</script>

<style scoped>
.acu-v2-placeholder {
  padding: 16px 24px;
  min-width: 0;
}

.acu-v2-placeholder__header {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 12px;
}

.acu-v2-placeholder__title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--acu-text-1);
}

.acu-v2-placeholder__id {
  max-width: 100%;
  overflow-wrap: anywhere;
  font-size: 12px;
  color: var(--acu-text-3);
  background: var(--acu-bg-2);
  padding: 2px 6px;
  border-radius: var(--acu-radius-sm);
}

.acu-v2-placeholder__body {
  margin: 0;
  font-size: 13px;
  color: var(--acu-text-2);
  line-height: 1.6;
}

@media (max-width: 720px) {
  .acu-v2-placeholder {
    padding: 14px;
  }
}
</style>
