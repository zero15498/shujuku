<template>
  <div
    class="acu-disclosure-group"
    :class="[rootClass, { 'acu-disclosure-group--expanded': expanded }]"
  >
    <button
      type="button"
      class="acu-disclosure-group__header"
      :class="headerClass"
      :aria-expanded="expanded"
      :aria-controls="bodyId || undefined"
      @click="$emit('toggle')"
    >
      <i
        class="fa-solid fa-chevron-right acu-disclosure-group__chevron"
        :class="[chevronClass, { 'acu-disclosure-group__chevron--open': expanded, [chevronOpenClass]: expanded && chevronOpenClass }]"
        aria-hidden="true"
      ></i>
      <span class="acu-disclosure-group__label" :class="labelClass">
        <slot name="label">{{ label }}</slot>
      </span>
      <span v-if="$slots.meta || meta" class="acu-disclosure-group__meta" :class="metaClass">
        <slot name="meta">{{ meta }}</slot>
      </span>
    </button>

    <div
      v-if="bodyMode === 'if' ? expanded : true"
      :id="bodyId || undefined"
      class="acu-disclosure-group__body"
      :class="[bodyClass, { 'acu-disclosure-group__body--collapsed': bodyMode === 'show' && !expanded }]"
      :style="bodyStyle"
      :aria-hidden="bodyMode === 'show' && !expanded ? 'true' : undefined"
      :inert="bodyMode === 'show' && !expanded ? true : undefined"
    >
      <slot></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(defineProps<{
  label?: string;
  meta?: string;
  expanded: boolean;
  bodyId?: string;
  bodyMode?: 'if' | 'show';
  bodyMaxHeight?: string;
  rootClass?: string;
  headerClass?: string;
  bodyClass?: string;
  chevronClass?: string;
  chevronOpenClass?: string;
  labelClass?: string;
  metaClass?: string;
}>(), {
  label: '',
  meta: '',
  bodyId: '',
  bodyMode: 'show',
  bodyMaxHeight: '',
  rootClass: '',
  headerClass: '',
  bodyClass: '',
  chevronClass: '',
  chevronOpenClass: '',
  labelClass: '',
  metaClass: '',
});

defineEmits<{
  (e: 'toggle'): void;
}>();

const bodyStyle = computed(() => ({
  '--acu-disclosure-body-max-height': props.bodyMaxHeight || '720px',
  overflowY: props.bodyMaxHeight ? 'auto' as const : 'hidden' as const,
}));
</script>

<style scoped>
.acu-disclosure-group {
  display: flex;
  flex-direction: column;
  gap: 0;
  overflow: hidden;
  border-radius: var(--acu-radius-md);
  background: transparent;
}

.acu-disclosure-group__header {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  min-height: 34px;
  appearance: none;
  border: 0;
  border-radius: 0;
  padding: 7px 10px;
  background: transparent;
  color: var(--acu-text-2);
  font: inherit;
  font-size: 12px;
  line-height: 1.35;
  text-align: left;
  cursor: pointer;
  user-select: none;
  transition: background-color 0.15s ease, box-shadow 0.15s ease;
}

.acu-disclosure-group__header:hover {
  background: var(--acu-hover-overlay);
}

.acu-disclosure-group__header:focus-visible {
  outline: none;
  box-shadow: inset 0 0 0 2px var(--acu-accent-glow);
}

.acu-disclosure-group__chevron {
  flex: 0 0 10px;
  width: 10px;
  font-size: 10px;
  color: var(--acu-text-3);
  transition: transform 0.15s ease;
}

.acu-disclosure-group__chevron--open {
  transform: rotate(90deg);
}

.acu-disclosure-group__label {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 500;
  color: var(--acu-text-2);
}

.acu-disclosure-group__meta {
  flex-shrink: 0;
  font-size: 11px;
  color: var(--acu-text-3);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.acu-disclosure-group__body {
  display: flex;
  flex-direction: column;
  gap: 6px;
  border-top: 1px solid color-mix(in srgb, var(--acu-text-3) 18%, transparent);
  padding: 8px;
  max-height: var(--acu-disclosure-body-max-height);
  opacity: 1;
  transform: translateY(0);
  overflow-x: hidden;
  transition:
    max-height 0.16s ease,
    opacity 0.12s ease,
    transform 0.16s ease,
    padding-top 0.16s ease,
    padding-bottom 0.16s ease,
    border-color 0.16s ease;
}

.acu-disclosure-group__body--collapsed {
  max-height: 0;
  padding-top: 0;
  padding-bottom: 0;
  border-top-color: transparent;
  opacity: 0;
  transform: translateY(-2px);
  pointer-events: none;
}
</style>
