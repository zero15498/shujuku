<template>
  <section class="acu-panel">
    <header v-if="title || $slots.title || $slots.actions || hasDescription" class="acu-panel__header">
      <h3 v-if="title || $slots.title" class="acu-panel__title">
        <slot name="title">{{ title }}</slot>
      </h3>
      <div v-if="$slots.actions || hasDescription" class="acu-panel__header-right">
        <div v-if="$slots.actions" class="acu-panel__actions">
          <slot name="actions" />
        </div>
        <span
          v-if="hasDescription"
          role="button"
          tabindex="0"
          class="acu-panel__description-button"
          :class="{ 'acu-panel__description-button--open': descriptionOpen }"
          :aria-expanded="descriptionOpen"
          :aria-controls="descriptionId"
          :title="descriptionOpen ? '收起说明' : '展开说明'"
          :aria-label="descriptionOpen ? '收起说明' : '展开说明'"
          @click="toggleDescription"
          @keydown.enter.prevent="toggleDescription"
          @keydown.space.prevent="toggleDescription"
        >
          <i class="fa-solid fa-circle-info" aria-hidden="true"></i>
        </span>
      </div>
    </header>
    <div class="acu-panel__body">
      <AcuInfoBanner
        v-if="hasDescription"
        v-show="descriptionOpen"
        :id="descriptionId"
        :aria-hidden="!descriptionOpen"
        :tone="descriptionTone"
      >
        <slot name="description">{{ description }}</slot>
      </AcuInfoBanner>
      <slot />
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, useId, useSlots } from 'vue';
import AcuInfoBanner from './AcuInfoBanner.vue';

const props = withDefaults(defineProps<{
  title?: string;
  description?: string;
  descriptionTone?: 'info' | 'tip' | 'warning';
}>(), {
  title: undefined,
  description: undefined,
  descriptionTone: 'info',
});

const slots = useSlots();
const descriptionOpen = ref(false);
const descriptionId = useId();
const hasDescription = computed(() => Boolean(props.description || slots.description));

function toggleDescription(): void {
  descriptionOpen.value = !descriptionOpen.value;
}
</script>

<style scoped>
.acu-panel {
  min-width: 0; padding: 16px;
  background: var(--acu-bg-1);
  border: 1px solid var(--acu-border);
  border-radius: var(--acu-radius-md);
  display: flex; flex-direction: column; gap: 0;
  height: 100%;
}
.acu-panel__header {
  display: flex; align-items: center; justify-content: space-between;
  gap: 12px; margin-bottom: 12px;
  min-height: 32px;
}
.acu-panel__title {
  margin: 0;
  min-width: 0;
  flex: 1 1 auto;
  font-size: 15px;
  line-height: 1.3;
  color: var(--acu-text-1);
}
.acu-panel__header-right {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}
.acu-panel__actions { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
.acu-panel__description-button {
  width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: var(--acu-radius-sm);
  background: transparent;
  color: var(--acu-text-3);
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease, box-shadow 0.15s ease;
}
.acu-panel__description-button:hover,
.acu-panel__description-button--open {
  background: var(--acu-bg-2);
  color: var(--acu-text-1);
}
.acu-panel__description-button:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px var(--acu-accent-glow);
}
.acu-panel__body { display: flex; flex-direction: column; gap: 12px; min-width: 0; flex: 1 1 auto; }
</style>
