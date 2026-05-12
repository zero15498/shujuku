<template>
  <div class="acu-rule-pair-list" :class="{ 'acu-rule-pair-list--standalone': !label }">
    <button
      v-if="label"
      type="button"
      class="acu-rule-pair-list__header"
      :aria-expanded="expanded"
      @click="toggle"
    >
      <i
        class="fa-solid fa-chevron-right acu-rule-pair-list__chevron"
        :class="{ 'acu-rule-pair-list__chevron--open': expanded }"
        aria-hidden="true"
      ></i>
      <span class="acu-rule-pair-list__label">{{ label }}</span>
      <span class="acu-rule-pair-list__count">
        {{ modelValue.length === 0 ? '暂无' : `${modelValue.length} 条` }}
      </span>
    </button>

    <div v-show="bodyVisible" class="acu-rule-pair-list__body">
      <div
        v-for="(rule, index) in modelValue" :key="index"
        class="acu-rule-pair-list__row"
      >
        <AcuInput
          :model-value="rule.start"
          type="text"
          :placeholder="startPlaceholder"
          class="acu-rule-pair-list__field"
          @update:model-value="updateField(index, 'start', $event as string)"
        />
        <span class="acu-rule-pair-list__sep">→</span>
        <AcuInput
          :model-value="rule.end"
          type="text"
          :placeholder="endPlaceholder"
          class="acu-rule-pair-list__field"
          @update:model-value="updateField(index, 'end', $event as string)"
        />
        <AcuIconButton
          icon="fa-solid fa-trash-can"
          variant="danger"
          size="sm"
          title="删除此规则"
          @click="remove(index)"
        />
      </div>
      <div v-if="!modelValue.length" class="acu-rule-pair-list__empty">
        暂无规则，点击下方按钮添加。
      </div>
      <AcuButton size="sm" class="acu-rule-pair-list__add" @click="add">
        <i class="fa-solid fa-plus"></i> {{ addLabel }}
      </AcuButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import AcuButton from './AcuButton.vue';
import AcuIconButton from './AcuIconButton.vue';
import AcuInput from './AcuInput.vue';

export interface RulePair {
  start: string;
  end: string;
}

const props = withDefaults(defineProps<{
  modelValue: RulePair[];
  label?: string;
  startPlaceholder?: string;
  endPlaceholder?: string;
  addLabel?: string;
}>(), {
  label: '',
  startPlaceholder: '开始词',
  endPlaceholder: '结束词',
  addLabel: '添加规则',
});

const emit = defineEmits<{
  (e: 'update:modelValue', value: RulePair[]): void;
}>();

// 默认始终折叠（包括空规则）。规则编辑是低频操作，折叠态减少视觉噪声；
// 空状态用户点 header 展开后即可见添加按钮。不持久化：MainArea / 抽屉重挂载
// 时该 ref 自然回到折叠态（D25）。
const expanded = ref(false);
const bodyVisible = computed(() => !props.label || expanded.value);

function toggle(): void {
  expanded.value = !expanded.value;
}

function clone(): RulePair[] {
  return props.modelValue.map(r => ({ ...r }));
}

function add(): void {
  if (props.label && !expanded.value) expanded.value = true;
  const next = clone();
  next.push({ start: '', end: '' });
  emit('update:modelValue', next);
}

function remove(index: number): void {
  const next = clone();
  next.splice(index, 1);
  emit('update:modelValue', next);
}

function updateField(index: number, field: 'start' | 'end', value: string): void {
  const next = clone();
  next[index] = { ...next[index], [field]: value };
  emit('update:modelValue', next);
}
</script>

<style scoped>
.acu-rule-pair-list {
  display: flex; flex-direction: column; gap: 6px;
}

.acu-rule-pair-list__header {
  display: flex; align-items: center; gap: 8px;
  width: 100%;
  padding: 6px 8px;
  border: 0;
  border-radius: var(--acu-radius-sm);
  background: transparent;
  color: var(--acu-text-2);
  font: inherit;
  font-size: 12px;
  text-align: left;
  cursor: pointer;
  transition: background-color 0.15s ease, box-shadow 0.15s ease;
}

.acu-rule-pair-list__header:hover {
  background: var(--acu-bg-2);
}

.acu-rule-pair-list__header:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px var(--acu-accent-glow);
}

.acu-rule-pair-list__chevron {
  flex-shrink: 0;
  width: 10px;
  font-size: 11px;
  color: var(--acu-text-3);
  transition: transform 0.15s ease;
}

.acu-rule-pair-list__chevron--open {
  transform: rotate(90deg);
}

.acu-rule-pair-list__label {
  flex: 1;
  font-weight: 500;
  color: var(--acu-text-2);
}

.acu-rule-pair-list__count {
  flex-shrink: 0;
  font-size: 11px;
  color: var(--acu-text-3);
  font-variant-numeric: tabular-nums;
}

.acu-rule-pair-list__body {
  display: flex; flex-direction: column; gap: 6px;
}

.acu-rule-pair-list--standalone .acu-rule-pair-list__body {
  /* 老接口：未提供 label 时直接展示，无外层 padding */
}

.acu-rule-pair-list__row {
  display: flex; align-items: center; gap: 6px;
}

.acu-rule-pair-list__field { flex: 1; min-width: 0; }

.acu-rule-pair-list__sep {
  flex-shrink: 0; font-size: 11px; color: var(--acu-text-3);
}

.acu-rule-pair-list__empty {
  padding: 8px; text-align: center;
  color: var(--acu-text-3); font-size: 11px;
}

.acu-rule-pair-list__add {
  align-self: flex-start;
}
</style>
