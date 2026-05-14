<template>
  <section class="acu-v2-import-page">
    <AcuPageHeader title="外部导入" />


    <div class="acu-v2-import-page__grid">
      <AcuPanel
        title="导入数据注入目标世界书"
        description="导入的内容会以条目形式写入这里选中的世界书。建议选择一个独立的世界书，避免与角色卡绑定的世界书混在一起，否则后续整理和删除会很麻烦。"
      >
        <WorldbookSelector
          :model-value="store.worldbookTarget"
          :names="wb.names.value"
          :char-primary="wb.charPrimary.value"
          :status="wb.status.value"
          :error="wb.error.value"
          :filterable="true"
          @update:model-value="store.setWorldbookTarget($event)"
        />
      </AcuPanel>

      <AcuPanel
        title="拆分与编码"
        description="TXT 文件会按设定的字符数被切成多段，每段作为一条独立条目写入世界书。如果文件不是 UTF-8 保存的（常见于早年下载的小说 TXT），需要在这里选对编码，否则导入后会显示乱码。"
      >
        <AcuFormRow label="每段字符数">
          <AcuInput type="number" :min="100" :step="100" :model-value="store.splitSize" @change="store.setSplitSize(Number($event))" />
        </AcuFormRow>
        <AcuFormRow label="文件编码">
          <AcuSelect
            :options="encodingOptions"
            :model-value="store.encoding"
            @update:model-value="store.setEncoding($event as 'UTF-8' | 'GBK' | 'Big5')"
          />
        </AcuFormRow>
      </AcuPanel>

      <AcuPanel
        title="注入表选择"
        description="勾选哪些表，决定 AI 在回填时会基于这些表的结构生成内容。首次使用时此处默认为空，必须至少勾选一个表，否则下方的「注入」按钮无法点击。"
      >
        <TableSelector
          :sheet-keys="store.availableSheetKeys"
          :selected-keys="store.selectedSheetKeys"
          :sheet-names="store.sheetNames"
          empty-text="尚未加载可选表格。请先确认数据库模板是否已就绪。"
          @update:selected-keys="store.setSelectedSheetKeys($event)"
          @select-all="store.selectAllSheets"
          @select-none="store.selectNoneSheets"
        />
      </AcuPanel>

      <AcuPanel
        title="状态 / 操作区"
        description="操作顺序：先按「1. 选择并拆分 TXT 文件」载入文件，再按「2. 注入」把内容写入世界书。「清空导入暂存缓存」只丢弃拆分后但还没注入的内容；红色的「删除注入条目」会移除已经写入世界书的条目。"
      >
        <AcuMessage :kind="statusKind">
          {{ store.statusText }}
        </AcuMessage>

        <AcuMessage v-if="message" :kind="message.kind">{{ message.text }}</AcuMessage>

        <div class="acu-v2-import-page__action-row">
          <AcuFileButton variant="primary" accept=".txt" :disabled="store.busy" @file="onFileSelected">1. 选择并拆分 TXT 文件</AcuFileButton>
          <AcuButton :disabled="!store.canInject" :loading="store.busy" @click="inject">
            {{ injectLabel }}
            <template #loading-text>注入中...</template>
          </AcuButton>
        </div>
        <div class="acu-v2-import-page__action-row">
          <AcuButton :disabled="store.busy" @click="onClearStaging">清空导入暂存缓存</AcuButton>
          <AcuButton variant="danger" :disabled="store.busy" @click="onDelete">删除注入条目</AcuButton>
        </div>
      </AcuPanel>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, watch } from 'vue';
import AcuButton from '../components/_lib/AcuButton.vue';
import AcuFileButton from '../components/_lib/AcuFileButton.vue';
import AcuPageHeader from '../components/_lib/AcuPageHeader.vue';
import AcuPanel from '../components/_lib/AcuPanel.vue';
import AcuFormRow from '../components/_lib/AcuFormRow.vue';
import AcuInput from '../components/_lib/AcuInput.vue';
import AcuMessage from '../components/_lib/AcuMessage.vue';
import AcuSelect from '../components/_lib/AcuSelect.vue';
import type { AcuSelectOption } from '../components/_lib/AcuSelect.vue';
import WorldbookSelector from '../components/WorldbookSelector.vue';
import TableSelector from '../components/TableSelector.vue';
import { useImportFlowStore } from '../stores/import-flow-store';
import { useImportFlow } from '../composables/useImportFlow';
import { useWorldbookSelector } from '../composables/useWorldbookSelector';
import { useChatChangedTick } from '../composables/useChatChangedListener';

const encodingOptions: AcuSelectOption[] = [
  { value: 'UTF-8', label: 'UTF-8' },
  { value: 'GBK', label: 'GBK (简体中文)' },
  { value: 'Big5', label: 'Big5 (繁体中文)' },
];

const store = useImportFlowStore();
const flow = useImportFlow();
const wb = useWorldbookSelector();

const message = computed(() => flow.message.value);

const statusKind = computed(() => {
  if (store.busy) return 'info';
  if (!store.staging.hasChunks) return 'info';
  if (store.hasTableSelection && store.selectedSheetKeys.length === 0) return 'warning';
  if (store.staging.processedIndex != null
    && store.staging.processedIndex > 0
    && store.staging.processedIndex < store.staging.chunkCount) return 'warning';
  return 'success';
});

const injectLabel = computed(() => {
  if (store.staging.processedIndex != null
    && store.staging.processedIndex > 0
    && store.staging.processedIndex < store.staging.chunkCount) {
    return '继续注入（自选表格）';
  }
  return '2. 注入（自选表格）';
});

async function refreshAll(): Promise<void> {
  store.refreshFromSettings();
  await Promise.all([wb.refresh(), store.refreshStaging()]);
}

onMounted(() => { void refreshAll(); });

watch(useChatChangedTick(), () => { void refreshAll(); });

async function onFileSelected(file: File): Promise<void> {
  await flow.splitFile(file);
}
async function inject(): Promise<void> { await flow.injectChunks(); }
async function onDelete(): Promise<void> { await flow.deleteImportedEntries(); }
async function onClearStaging(): Promise<void> { await flow.clearStaging(); }
</script>

<style scoped>
.acu-v2-import-page {
  min-height: 100%; min-width: 0; padding: 20px;
  display: flex; flex-direction: column; gap: 18px;
}

.acu-v2-import-page__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  align-items: stretch;
}

.acu-v2-import-page__action-row { display: flex; flex-wrap: wrap; gap: 8px; }

@media (max-width: 860px) {
  .acu-v2-import-page { padding: 14px; }
  .acu-v2-import-page__grid { grid-template-columns: 1fr; }
}
</style>
