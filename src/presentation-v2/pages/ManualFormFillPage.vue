<template>
  <section class="acu-v2-manual-form-fill-page">
    <AcuPageHeader title="手动填表" />

    <AcuPanel
      class="acu-v2-manual-form-fill-page__panel"
      title="手动填表"
      description="选择本次需要更新的表格后立即执行填表。额外要求会临时注入本次请求，完成后自动清除，不写入提示词模板。执行前如果担心旧数据残留，可以在确认框里选择清空目标楼层。"
    >
      <AcuFormRow label="填表 API 预设" hint="留空表示沿用当前活动 API；表级覆盖仍会在服务层按表名生效。">
        <AcuSelect
          :options="tableApiPresetOptions"
          :model-value="manualUpdate.tableApiPreset.value"
          placeholder="跟随当前活动 API"
          @update:model-value="manualUpdate.setTableApiPreset($event)"
        />
      </AcuFormRow>

      <TableSelector
        :sheet-keys="manualUpdate.sheetKeys.value"
        :selected-keys="manualUpdate.selectedManualTableKeys.value"
        :sheet-names="manualUpdate.sheetNames.value"
        empty-text="当前没有可手动填表的表格。"
        @update:selected-keys="manualUpdate.setManualSelectedKeys($event)"
        @select-all="manualUpdate.selectAllManualTables"
        @select-none="manualUpdate.selectNoManualTables"
      />

      <div class="acu-v2-manual-form-fill-page__extra">
        <AcuFormRow label="本次填表附加要求">
          <AcuToggle
            :model-value="manualUpdate.manualExtraHintEnabled.value"
            @update:model-value="manualUpdate.manualExtraHintEnabled.value = $event"
          />
        </AcuFormRow>
        <AcuTextarea
          v-if="manualUpdate.manualExtraHintEnabled.value"
          :model-value="manualUpdate.manualExtraHint.value"
          :rows="4"
          placeholder="仅用于本次手动填表..."
          @update:model-value="manualUpdate.manualExtraHint.value = $event"
        />
      </div>

      <AcuMessage v-if="manualUpdate.manualUpdateMessage.value" :kind="manualUpdate.manualUpdateMessage.value.kind">
        {{ manualUpdate.manualUpdateMessage.value.text }}
      </AcuMessage>
      <AcuMessage v-if="manualUpdate.lastProgressText.value" kind="info">
        {{ manualUpdate.lastProgressText.value }}
      </AcuMessage>
      <AcuMessage v-if="manualUpdate.vectorIndexWarning.value" kind="warning">
        交火模式纪要索引启用时不建议手动更新表格；特殊场景下仍可点击执行。
      </AcuMessage>

      <div class="acu-v2-manual-form-fill-page__actions">
        <AcuButton
          variant="primary"
          :disabled="manualUpdate.manualUpdateBusy.value || !manualUpdate.selectedManualTableKeys.value.length"
          @click="manualUpdate.runManualUpdate"
        >
          {{
            manualUpdate.manualUpdateBusy.value
              ? '填表中...'
              : manualUpdate.vectorIndexWarning.value
                ? '交火索引已启用'
                : '执行手动填表'
          }}
        </AcuButton>
      </div>
    </AcuPanel>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, watch } from 'vue';
import AcuButton from '../components/_lib/AcuButton.vue';
import AcuFormRow from '../components/_lib/AcuFormRow.vue';
import AcuMessage from '../components/_lib/AcuMessage.vue';
import AcuPageHeader from '../components/_lib/AcuPageHeader.vue';
import AcuPanel from '../components/_lib/AcuPanel.vue';
import AcuSelect from '../components/_lib/AcuSelect.vue';
import type { AcuSelectOption } from '../components/_lib/AcuSelect.vue';
import AcuTextarea from '../components/_lib/AcuTextarea.vue';
import AcuToggle from '../components/_lib/AcuToggle.vue';
import TableSelector from '../components/TableSelector.vue';
import { useChatChangedTick } from '../composables/useChatChangedListener';
import { useManualUpdate } from '../composables/useManualUpdate';
import { useApiPresetStore } from '../stores/api-preset-store';

const manualUpdate = useManualUpdate();
const apiStore = useApiPresetStore();

const tableApiPresetOptions = computed<AcuSelectOption[]>(() => [
  { value: '', label: '跟随当前活动 API' },
  ...apiStore.presets.map(p => ({ value: p.name, label: p.name })),
]);

function refreshAll(): void {
  manualUpdate.refresh();
  apiStore.refreshFromSettings();
}

onMounted(() => { refreshAll(); });
watch(useChatChangedTick(), () => { refreshAll(); });
</script>

<style scoped>
.acu-v2-manual-form-fill-page {
  min-height: 100%;
  min-width: 0;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.acu-v2-manual-form-fill-page__panel {
  width: 100%;
}

.acu-v2-manual-form-fill-page__extra {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.acu-v2-manual-form-fill-page__actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding-top: 12px;
  margin-top: 4px;
}

@media (max-width: 860px) {
  .acu-v2-manual-form-fill-page {
    padding: 14px;
  }

}
</style>
