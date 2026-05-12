<template>
  <div
    class="acu-segmented"
    :class="[`acu-segmented--${size}`, { 'acu-segmented--disabled': disabled }]"
    role="radiogroup"
    :aria-label="ariaLabel"
  >
    <button
      v-for="opt in options"
      :key="opt.value"
      type="button"
      class="acu-segmented__item"
      :class="{ 'acu-segmented__item--active': opt.value === modelValue }"
      role="radio"
      :aria-checked="opt.value === modelValue"
      :disabled="disabled || opt.disabled"
      @click="select(opt)"
      @keydown.left.prevent="move(-1)"
      @keydown.up.prevent="move(-1)"
      @keydown.right.prevent="move(1)"
      @keydown.down.prevent="move(1)"
    >
      <span class="acu-segmented__label">{{ opt.label }}</span>
    </button>
  </div>
</template>

<script setup lang="ts">
export interface AcuSegmentedOption {
  value: string;
  label: string;
  disabled?: boolean;
}

type Size = 'sm' | 'md';

const props = withDefaults(defineProps<{
  options: AcuSegmentedOption[];
  modelValue: string;
  disabled?: boolean;
  size?: Size;
  ariaLabel?: string;
}>(), {
  disabled: false,
  size: 'md',
  ariaLabel: undefined,
});

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
}>();

function select(opt: AcuSegmentedOption): void {
  if (props.disabled || opt.disabled || opt.value === props.modelValue) return;
  emit('update:modelValue', opt.value);
}

function move(delta: number): void {
  if (props.disabled || props.options.length === 0) return;
  const enabled = props.options.filter(opt => !opt.disabled);
  if (enabled.length === 0) return;
  const currentIndex = enabled.findIndex(opt => opt.value === props.modelValue);
  const nextIndex = currentIndex < 0
    ? 0
    : (currentIndex + delta + enabled.length) % enabled.length;
  emit('update:modelValue', enabled[nextIndex].value);
}
</script>

<style scoped>
.acu-segmented {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: minmax(0, 1fr);
  min-width: 0;
  border: 0;
  border-radius: var(--acu-radius-sm);
  background: var(--acu-bg-2);
  padding: 3px;
  overflow: hidden;
}

.acu-segmented--disabled {
  opacity: 0.55;
}

.acu-segmented__item {
  position: relative;
  min-width: 0;
  margin: 0;
  border: 0;
  background: transparent;
  color: var(--acu-text-2);
  font: inherit;
  font-size: 13px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s ease, color 0.15s ease;
}

.acu-segmented__item:hover:not(:disabled) {
  background: var(--acu-bg-3);
  color: var(--acu-text-1);
}

.acu-segmented__item:disabled {
  cursor: not-allowed;
  color: var(--acu-text-3);
}

.acu-segmented__item--active {
  background: var(--acu-accent);
  color: var(--acu-on-accent);
  z-index: 1;
}

.acu-segmented__item:focus-visible {
  outline: none;
}

.acu-segmented__item:focus-visible::before {
  content: '';
  position: absolute;
  inset: 2px;
  border-radius: var(--acu-radius-sm);
  box-shadow: 0 0 0 2px var(--acu-accent-glow);
  pointer-events: none;
  z-index: 2;
}

.acu-segmented--md .acu-segmented__item {
  min-height: 30px;
  padding: 0 8px;
  border-radius: calc(var(--acu-radius-sm) - 2px);
}

.acu-segmented--sm .acu-segmented__item {
  min-height: 24px;
  padding: 0 7px;
  font-size: 12px;
  border-radius: calc(var(--acu-radius-sm) - 2px);
}

.acu-segmented__label {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
