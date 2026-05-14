<template>
  <div :class="['acu-info-banner', `acu-info-banner--${tone}`]" role="note">
    <i :class="['acu-info-banner__icon', iconClass]" aria-hidden="true"></i>
    <div class="acu-info-banner__content">
      <slot>{{ text }}</slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

type Tone = 'info' | 'tip' | 'warning';

const props = withDefaults(defineProps<{
  text?: string;
  tone?: Tone;
  icon?: string;
}>(), {
  text: '',
  tone: 'info',
  icon: undefined,
});

const iconClass = computed(() => {
  if (props.icon) return props.icon;
  if (props.tone === 'tip') return 'fa-solid fa-lightbulb';
  if (props.tone === 'warning') return 'fa-solid fa-triangle-exclamation';
  return 'fa-solid fa-circle-info';
});
</script>

<style scoped>
.acu-info-banner {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 8px 0 8px 10px;
  border-radius: 0;
  font-size: 13px;
  line-height: 1.55;
  background: transparent;
  color: var(--acu-text-2);
  border-left: 2px solid color-mix(in srgb, var(--acu-text-3) 28%, transparent);
  min-width: 0;
}

.acu-info-banner__icon {
  flex-shrink: 0;
  margin-top: 2px;
  font-size: 13px;
  line-height: 1.55;
}

.acu-info-banner__content {
  min-width: 0;
  word-wrap: break-word;
  overflow-wrap: anywhere;
}

.acu-info-banner--info {
  background: transparent;
}
.acu-info-banner--info .acu-info-banner__icon {
  color: var(--acu-text-3);
}

.acu-info-banner--tip {
  background: transparent;
  border-left-color: color-mix(in srgb, var(--acu-accent) 42%, transparent);
}
.acu-info-banner--tip .acu-info-banner__icon {
  color: var(--acu-text-2);
}

.acu-info-banner--warning {
  padding-right: 12px;
  border-radius: var(--acu-radius-sm);
  border-left-color: var(--acu-warning);
  background: color-mix(in srgb, var(--acu-warning) 8%, transparent);
}
.acu-info-banner--warning .acu-info-banner__icon {
  color: var(--acu-warning);
}
</style>
