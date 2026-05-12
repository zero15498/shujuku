<template>
  <div
    class="acu-radio-group"
    :class="{ 'acu-radio-group--vertical': direction === 'vertical', 'acu-radio-group--disabled': disabled }"
    role="radiogroup"
  >
    <button
      v-for="(opt, index) in options"
      :key="opt.value"
      :ref="(el) => setItemRef(el, index)"
      type="button"
      class="acu-radio-group__item"
      :class="{ 'acu-radio-group__item--active': opt.value === modelValue }"
      role="radio"
      :aria-checked="opt.value === modelValue ? 'true' : 'false'"
      :disabled="disabled"
      :tabindex="opt.value === modelValue || (!modelValue && index === 0) ? 0 : -1"
      @click="select(opt.value)"
      @keydown.left.prevent="move(-1, opt.value)"
      @keydown.up.prevent="move(-1, opt.value)"
      @keydown.right.prevent="move(1, opt.value)"
      @keydown.down.prevent="move(1, opt.value)"
      @keydown.home.prevent="selectByIndex(0)"
      @keydown.end.prevent="selectByIndex(options.length - 1)"
    >
      <span class="acu-radio-group__dot" aria-hidden="true" />
      <span class="acu-radio-group__text">
        <span class="acu-radio-group__label">{{ opt.label }}</span>
        <span v-if="opt.description" class="acu-radio-group__desc">{{ opt.description }}</span>
      </span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { nextTick, ref } from 'vue';

export interface AcuRadioOption {
  value: string;
  label: string;
  /** 可选：选项下方的常驻说明文字（D22 形态——常驻、不依赖 hover）。 */
  description?: string;
}

const props = withDefaults(defineProps<{
  options: AcuRadioOption[];
  modelValue: string;
  name: string;
  disabled?: boolean;
  direction?: 'horizontal' | 'vertical';
}>(), {
  disabled: false,
  direction: 'horizontal',
});

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
}>();

const itemRefs = ref<Array<HTMLButtonElement | null>>([]);

function setItemRef(el: Element | null, index: number): void {
  itemRefs.value[index] = el instanceof HTMLButtonElement ? el : null;
}

function focusIndex(index: number): void {
  void nextTick(() => itemRefs.value[index]?.focus());
}

function select(value: string): void {
  if (props.disabled || value === props.modelValue) return;
  emit('update:modelValue', value);
}

function selectByIndex(index: number): void {
  if (props.disabled || props.options.length === 0) return;
  const normalized = Math.max(0, Math.min(index, props.options.length - 1));
  select(props.options[normalized].value);
  focusIndex(normalized);
}

function move(delta: number, focusedValue: string): void {
  if (props.disabled || props.options.length === 0) return;
  const currentIndex = props.options.findIndex(opt => opt.value === focusedValue);
  const baseIndex = currentIndex >= 0
    ? currentIndex
    : Math.max(0, props.options.findIndex(opt => opt.value === props.modelValue));
  const nextIndex = (baseIndex + delta + props.options.length) % props.options.length;
  select(props.options[nextIndex].value);
  focusIndex(nextIndex);
}
</script>

<style scoped>
.acu-radio-group {
  display: flex; gap: 16px; flex-wrap: wrap;
}
.acu-radio-group--vertical {
  flex-direction: column; gap: 8px;
}
.acu-radio-group--disabled { opacity: 0.5; }

.acu-radio-group__item {
  display: inline-flex; align-items: flex-start; gap: 6px;
  padding: 0; border: 0; background: transparent;
  font: inherit; font-size: 12px; color: var(--acu-text-2);
  cursor: pointer; user-select: none; text-align: left;
}

.acu-radio-group__text {
  display: flex; flex-direction: column; gap: 2px; min-width: 0;
}
.acu-radio-group__desc {
  font-size: 11px; line-height: 1.5; color: var(--acu-text-3);
  white-space: normal;
}
.acu-radio-group__item:disabled { cursor: not-allowed; }

.acu-radio-group__dot {
  flex-shrink: 0;
  width: 16px; height: 16px;
  border: 0;
  border-radius: 50%;
  background: var(--acu-bg-2);
  position: relative;
  transition: background 0.15s ease, box-shadow 0.15s ease;
}

.acu-radio-group__dot::after {
  content: '';
  position: absolute; top: 3px; left: 3px;
  width: 8px; height: 8px;
  border-radius: 50%;
  background: transparent;
  transition: background 0.15s ease;
}

.acu-radio-group__item--active .acu-radio-group__dot::after {
  background: var(--acu-accent);
}

.acu-radio-group__item:hover:not(:disabled) .acu-radio-group__dot {
  background: var(--acu-bg-3);
}

.acu-radio-group__item:focus-visible {
  outline: none;
}
.acu-radio-group__item:focus-visible .acu-radio-group__dot {
  box-shadow: 0 0 0 2px var(--acu-accent-glow);
}

.acu-radio-group__label { min-width: 0; }
</style>
