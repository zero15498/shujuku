<template>
  <section class="acu-v2-data-mgmt-page">
    <AcuPageHeader title="数据管理" />

    <AcuMessage v-if="flow.message.value" :kind="flow.message.value.kind">
      {{ flow.message.value.text }}
    </AcuMessage>

    <div class="acu-v2-data-mgmt-page__layout">
      <AcuPanel
        title="数据隔离"
        description="数据隔离会把设置、模板和聊天里的数据库数据按标识分开。留空表示默认数据；输入新标识并应用后会切换到对应 profile。如果切换后内容不对，请回到原标识或选择历史记录中的标识再应用。"
      >
        <AcuStatsList :items="isolationStats" />

        <div class="acu-v2-data-mgmt-page__form-stack">
          <AcuFormRow label="标识代码" hint="留空表示不隔离；建议只使用容易辨认的短名称。">
            <AcuInput
              :model-value="flow.isolationCode.value"
              type="text"
              placeholder="输入标识代码"
              @update:model-value="flow.isolationCode.value = String($event)"
            />
          </AcuFormRow>
          <AcuFormRow label="历史标识" hint="选择后会填入左侧输入框，需要再应用才会切换。">
            <AcuSelect
              :options="historyOptions"
              :model-value="historySelection"
              placeholder="选择历史标识"
              @update:model-value="selectHistory"
            />
          </AcuFormRow>
        </div>

        <div class="acu-v2-data-mgmt-page__actions">
          <AcuButton
            variant="primary"
            :loading="flow.busyAction.value === 'apply-isolation'"
            @click="flow.applyIsolation"
          >
            保存并应用
          </AcuButton>
          <AcuButton
            :disabled="!historySelection || !!flow.busyAction.value"
            @click="flow.removeHistory(historySelection)"
          >
            移除历史标识
          </AcuButton>
          <AcuButton
            :loading="flow.busyAction.value === 'delete-isolation-entries'"
            @click="onDeleteCurrentIsolationEntries"
          >
            删除当前标识的注入条目
          </AcuButton>
        </div>
      </AcuPanel>

      <div class="acu-v2-data-mgmt-page__side-stack">
        <AcuPanel
          title="备份与恢复"
          description="这里处理当前 profile 的配置备份和当前聊天数据库导出。合并导入会覆盖提示词与全局模板，但不会直接改写当前聊天已有楼层；模板覆盖会改写最新 AI 楼层，操作前请确认聊天记录可回退。"
        >
          <div class="acu-v2-data-mgmt-page__backup-actions">
            <AcuFileButton
              variant="primary"
              accept=".json,application/json"
              :disabled="!!flow.busyAction.value"
              @file="flow.importCombinedSettings"
            >
              合并导入（模板+指令）
            </AcuFileButton>
            <AcuButton :disabled="!!flow.busyAction.value" @click="flow.exportCombinedSettings">
              合并导出（模板+指令）
            </AcuButton>
            <AcuButton :disabled="!!flow.busyAction.value" @click="flow.exportJsonData">
              导出 JSON 数据
            </AcuButton>
            <AcuButton
              :loading="flow.busyAction.value === 'override-latest'"
              @click="onOverrideLatestLayer"
            >
              模板覆盖最新层数据
            </AcuButton>
          </div>
        </AcuPanel>

        <AcuPanel
          title="删除与清理"
          description="这里只删除聊天楼层里由插件写入的数据库字段，不删除聊天正文。楼层范围按 AI 回复计算，起始或终止为空时表示从头或到最后。出问题时请先撤回聊天记录，或从备份重新导入数据。"
        >
          <p class="acu-v2-data-mgmt-page__meta">
            当前聊天 {{ flow.aiMessageCount.value }} 个 AI 楼层 · 将处理：{{ flow.rangeLabel.value }}
          </p>

          <div class="acu-v2-data-mgmt-page__form-grid">
            <AcuFormRow label="起始 AI 楼层" hint="从第几个 AI 回复开始删除；留空表示从第 1 个开始。">
              <AcuInput
                :model-value="flow.deleteRange.startFloor"
                type="number"
                :min="1"
                :step="1"
                @update:model-value="flow.deleteRange.startFloor = $event"
              />
            </AcuFormRow>
            <AcuFormRow label="终止 AI 楼层" hint="留空表示删除到最后一个 AI 回复。">
              <AcuInput
                :model-value="flow.deleteRange.endFloor"
                type="number"
                :min="1"
                :step="1"
                placeholder="到最后"
                @update:model-value="flow.deleteRange.endFloor = $event"
              />
            </AcuFormRow>
          </div>

          <div class="acu-v2-data-mgmt-page__actions">
            <AcuButton
              :loading="flow.busyAction.value === 'delete-current-local'"
              @click="onDeleteLocalData('current')"
            >
              删除当前标识本地数据
            </AcuButton>
            <AcuButton
              variant="danger"
              :loading="flow.busyAction.value === 'delete-all-local'"
              @click="onDeleteLocalData('all')"
            >
              删除所有本地数据
            </AcuButton>
          </div>
        </AcuPanel>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import AcuButton from '../components/_lib/AcuButton.vue';
import AcuFileButton from '../components/_lib/AcuFileButton.vue';
import AcuFormRow from '../components/_lib/AcuFormRow.vue';
import AcuInput from '../components/_lib/AcuInput.vue';
import AcuMessage from '../components/_lib/AcuMessage.vue';
import AcuPageHeader from '../components/_lib/AcuPageHeader.vue';
import AcuPanel from '../components/_lib/AcuPanel.vue';
import AcuSelect from '../components/_lib/AcuSelect.vue';
import AcuStatsList, { type AcuStatsItem } from '../components/_lib/AcuStatsList.vue';
import { useChatChangedTick } from '../composables/useChatChangedListener';
import { useDataManagement } from '../composables/useDataManagement';

const flow = useDataManagement();
const historySelection = ref('');

const historyOptions = computed(() => [
  { value: '', label: '不选择' },
  ...flow.isolationHistoryOptions.value,
]);
const isolationStats = computed<AcuStatsItem[]>(() => [
  { label: '当前标识', value: flow.currentIsolationLabel.value },
  { label: '隔离状态', value: flow.isolationModeLabel.value },
  { label: '历史标识数', value: flow.isolationHistory.value.length },
]);

function selectHistory(value: string): void {
  historySelection.value = value;
  if (value) flow.isolationCode.value = value;
}

function onDeleteCurrentIsolationEntries(): void {
  if (!window.confirm('删除当前标识的数据库注入条目？这不会删除聊天正文，但会移除世界书里的插件生成条目。')) return;
  void flow.deleteCurrentIsolationEntries();
}

function onOverrideLatestLayer(): void {
  if (!window.confirm('用当前通用模板覆盖最新 AI 楼层的表格数据？这会清空模板内表格的数据行，只保留表头。')) return;
  void flow.overrideLatestLayerWithTemplate();
}

function onDeleteLocalData(mode: 'current' | 'all'): void {
  const message = mode === 'all'
    ? `删除当前聊天中 ${flow.rangeLabel.value} 的所有标识数据库数据？此操作不可恢复。`
    : `删除当前聊天中 ${flow.rangeLabel.value} 属于当前标识的数据库数据？此操作不可恢复。`;
  if (!window.confirm(message)) return;
  if (mode === 'all' && !window.confirm('再次确认：删除所有标识的本地数据库数据？')) return;
  void flow.deleteLocalData(mode);
}

function refreshAll(): void {
  flow.refresh();
  historySelection.value = '';
}

onMounted(refreshAll);
watch(useChatChangedTick(), refreshAll);
</script>

<style scoped>
.acu-v2-data-mgmt-page {
  min-height: 100%;
  min-width: 0;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.acu-v2-data-mgmt-page__layout {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  align-items: stretch;
}

.acu-v2-data-mgmt-page__side-stack {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.acu-v2-data-mgmt-page__form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.acu-v2-data-mgmt-page__form-stack {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.acu-v2-data-mgmt-page__layout > :deep(.acu-panel:first-child .acu-stats) {
  flex: 1 1 auto;
}

.acu-v2-data-mgmt-page__meta {
  margin: 0;
  color: var(--acu-text-3);
  font-size: 12px;
  line-height: 1.55;
}

.acu-v2-data-mgmt-page__action-row,
.acu-v2-data-mgmt-page__actions,
.acu-v2-data-mgmt-page__backup-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-end;
}

.acu-v2-data-mgmt-page__backup-actions {
  padding-top: 12px;
  margin-top: 4px;
}

.acu-v2-data-mgmt-page__actions {
  padding-top: 12px;
  margin-top: 4px;
}

@media (max-width: 860px) {
  .acu-v2-data-mgmt-page {
    padding: 14px;
  }

  .acu-v2-data-mgmt-page__layout,
  .acu-v2-data-mgmt-page__form-grid {
    grid-template-columns: 1fr;
  }
}
</style>
