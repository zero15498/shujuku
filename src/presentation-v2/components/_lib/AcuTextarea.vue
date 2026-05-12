<template>
  <textarea
    class="acu-textarea"
    :value="modelValue"
    :placeholder="placeholder"
    :rows="rows"
    :disabled="disabled"
    @input="onInput"
  ></textarea>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  modelValue: string;
  placeholder?: string;
  rows?: number;
  disabled?: boolean;
}>(), {
  placeholder: undefined,
  rows: 4,
  disabled: false,
});

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
}>();

function onInput(ev: Event): void {
  emit('update:modelValue', (ev.target as HTMLTextAreaElement | null)?.value ?? '');
}
</script>

<style scoped>
.acu-textarea {
  width: 100%;
  padding: 8px 10px;
  border: 0 !important;
  border-radius: var(--acu-radius-sm);
  background: var(--acu-bg-2) !important;
  color: var(--acu-text-1) !important;
  font: inherit; font-size: 12px;
  resize: vertical;
  transition: background 0.15s ease, box-shadow 0.15s ease;
}
.acu-textarea:hover:not(:disabled) {
  background: var(--acu-bg-3) !important;
}
.acu-textarea:focus {
  outline: none;
  box-shadow: 0 0 0 2px var(--acu-accent-glow);
}
.acu-textarea:disabled {
  opacity: 0.5; cursor: not-allowed;
}
</style>
