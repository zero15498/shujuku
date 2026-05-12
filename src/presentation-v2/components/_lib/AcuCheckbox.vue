<template>
  <button
    type="button"
    class="acu-checkbox"
    :class="{ 'acu-checkbox--disabled': disabled, 'acu-checkbox--checked': modelValue }"
    role="checkbox"
    :aria-checked="modelValue ? 'true' : 'false'"
    :disabled="disabled"
    v-bind="$attrs"
    @click="onClick"
  >
    <span class="acu-checkbox__box" aria-hidden="true">
      <i v-if="modelValue" class="fa-solid fa-check acu-checkbox__icon" />
    </span>
    <span v-if="label" class="acu-checkbox__label">{{ label }}</span>
    <slot v-else />
  </button>
</template>

<script setup lang="ts">
defineOptions({ inheritAttrs: false });

const props = withDefaults(defineProps<{
  modelValue: boolean;
  label?: string;
  disabled?: boolean;
}>(), {
  label: undefined,
  disabled: false,
});

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
}>();

function onClick(): void {
  if (props.disabled) return;
  emit('update:modelValue', !props.modelValue);
}
</script>

<style scoped>
.acu-checkbox {
  display: inline-flex; align-items: flex-start; gap: 7px;
  padding: 0; border: 0; background: transparent;
  font: inherit; font-size: 12px; color: var(--acu-text-2);
  cursor: pointer; user-select: none;
  line-height: 1.5; text-align: left;
}
.acu-checkbox--disabled { opacity: 0.5; cursor: not-allowed; }

.acu-checkbox__box {
  flex-shrink: 0;
  width: 16px; height: 16px; margin-top: 1px;
  display: flex; align-items: center; justify-content: center;
  border: 0;
  border-radius: 3px;
  background: var(--acu-bg-2);
  transition: background 0.15s ease, box-shadow 0.15s ease;
}

.acu-checkbox--checked .acu-checkbox__box {
  background: var(--acu-accent);
}

.acu-checkbox__icon {
  font-size: 10px; color: #fff;
}

.acu-checkbox__label { min-width: 0; }

.acu-checkbox:hover:not(:disabled) .acu-checkbox__box {
  background: var(--acu-bg-3);
}
.acu-checkbox--checked:hover:not(:disabled) .acu-checkbox__box {
  background: var(--acu-accent-2);
}

.acu-checkbox:focus-visible {
  outline: none;
}
.acu-checkbox:focus-visible .acu-checkbox__box {
  box-shadow: 0 0 0 2px var(--acu-accent-glow);
}
</style>
