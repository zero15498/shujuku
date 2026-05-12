<template>
  <fieldset class="acu-v2-plot-match-fields">
    <legend>匹配替换（进阶）</legend>
    <p class="acu-v2-plot-match-fields__hint">
      这些数值会在发送给 AI 前替换提示词里的占位符，例如 sulv1、sulv2、sulv3、sulv4 和 zhaohui。它们是剧情推进的全局参数，修改后立即保存；不会写入当前预设 JSON，也不会随预设导入或导出。
    </p>
    <div class="acu-v2-plot-match-fields__grid">
      <AcuFormRow label="主线推进速率">
        <AcuInput type="number" :step="0.05" :model-value="rateMain" @change="emitRate('rateMain', Number($event))" />
      </AcuFormRow>
      <AcuFormRow label="个人线推进速率">
        <AcuInput type="number" :step="0.05" :model-value="ratePersonal" @change="emitRate('ratePersonal', Number($event))" />
      </AcuFormRow>
      <AcuFormRow label="色情事件推进速率">
        <AcuInput type="number" :step="0.05" :model-value="rateErotic" @change="emitRate('rateErotic', Number($event))" />
      </AcuFormRow>
      <AcuFormRow label="绿帽线推进速率">
        <AcuInput type="number" :step="0.05" :model-value="rateCuckold" @change="emitRate('rateCuckold', Number($event))" />
      </AcuFormRow>
      <AcuFormRow label="记忆召回数量">
        <AcuInput type="number" :step="1" :min="1" :model-value="recallCount" @change="emitRate('recallCount', Math.round(Number($event)))" />
      </AcuFormRow>
    </div>
  </fieldset>
</template>

<script setup lang="ts">
import AcuFormRow from './_lib/AcuFormRow.vue';
import AcuInput from './_lib/AcuInput.vue';
import type { PlotRateField } from '../composables/usePlotRates';

defineProps<{
  rateMain: number;
  ratePersonal: number;
  rateErotic: number;
  rateCuckold: number;
  recallCount: number;
}>();

const emit = defineEmits<{
  (e: 'update-rate', field: PlotRateField, value: number): void;
}>();

function emitRate(field: PlotRateField, value: number): void {
  emit('update-rate', field, value);
}
</script>

<style scoped>
.acu-v2-plot-match-fields {
  margin: 0;
  padding: 12px;
  border: 0;
  border-radius: var(--acu-radius-sm);
  background: var(--acu-bg-2);
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
}

.acu-v2-plot-match-fields legend {
  padding: 0 6px;
  color: var(--acu-text-2);
  font-size: 12px;
  font-weight: 600;
}

.acu-v2-plot-match-fields__hint {
  margin: 0;
  color: var(--acu-text-3);
  font-size: 11px;
  line-height: 1.55;
}

.acu-v2-plot-match-fields__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 10px;
}
</style>
