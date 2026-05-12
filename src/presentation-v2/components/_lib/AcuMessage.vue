<template>
  <div v-if="visible" :class="['acu-message', `acu-message--${kind}`]" role="status">
    <slot />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

type Kind = 'info' | 'success' | 'warning' | 'error';

const props = withDefaults(defineProps<{
  kind?: Kind;
  visible?: boolean;
}>(), {
  kind: 'info',
  visible: true,
});

const visible = computed(() => props.visible);
</script>

<style scoped>
.acu-message {
  padding: 8px 12px; border-radius: var(--acu-radius-sm); font-size: 12px;
  border: 0;
  line-height: 1.5;
}
.acu-message--info {
  background: var(--acu-bg-2);
  color: var(--acu-text-1);
}
.acu-message--success {
  background: color-mix(in srgb, var(--acu-success) 10%, transparent);
  color: var(--acu-success);
}
.acu-message--warning {
  background: color-mix(in srgb, var(--acu-warning) 10%, transparent);
  color: var(--acu-warning);
}
.acu-message--error {
  background: color-mix(in srgb, var(--acu-danger) 10%, transparent);
  color: var(--acu-danger);
}
</style>
