<template>
  <section class="acu-v2-form-fill-page">
    <AcuPageHeader title="更新参数" />

    <div class="acu-v2-form-fill-page__grid">
      <AcuPanel
        title="数据库状态"
        description="读取当前聊天已加载的表格数据，并按 AI 回复楼层计算每张表的上次更新、未记录楼层与下一次自动触发点。调整更新节奏时先看这里：如果某张表长期不到触发点，通常需要检查频率、跳过楼层或表级配置。"
      >
        <AcuStatsList :items="dashboard.stats.value" />
        <AcuMessage kind="info">
          {{ dashboard.hasTables.value ? dashboard.nextUpdateText.value : '当前尚未加载数据库表格。' }}
        </AcuMessage>

        <div class="acu-v2-form-fill-page__table-wrap">
          <table class="acu-v2-form-fill-page__status-table">
            <thead>
              <tr>
                <th>表格</th>
                <th>频率</th>
                <th>未记录</th>
                <th>上次更新</th>
                <th>下次触发</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="!dashboard.tableRows.value.length">
                <td colspan="5" class="acu-v2-form-fill-page__empty">暂无数据</td>
              </tr>
              <tr
                v-for="row in dashboard.tableRows.value"
                :key="row.key"
                :class="{ 'acu-v2-form-fill-page__status-row--ready': row.ready }"
              >
                <td>{{ row.name }}</td>
                <td>{{ row.frequencyLabel }}</td>
                <td>{{ row.unrecordedLabel }}</td>
                <td>{{ row.lastUpdatedLabel }}</td>
                <td>
                  <AcuBadge v-if="row.ready" variant="success">就绪</AcuBadge>
                  <span v-else>{{ row.nextTriggerLabel }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </AcuPanel>

      <AcuPanel
        title="更新节奏"
        description="这些数值会影响自动填表、手动填表和分批处理。每个字段在失焦或确认修改后立即保存；如果改错了，可以按原数值填回再触发保存。"
      >
        <div class="acu-v2-form-fill-page__number-grid">
          <AcuFormRow
            v-for="field in cadenceFields"
            :key="field.key"
            :label="field.label"
            :hint="field.hint"
          >
            <AcuInput
              type="number"
              :min="field.min"
              :step="field.step"
              :model-value="field.value"
              @change="settings.setNumber(field.key, $event)"
            />
          </AcuFormRow>
        </div>
      </AcuPanel>

      <AcuPanel
        title="标签筛选"
        description="提取规则用于只保留成对边界中的正文；排除规则会从填表上下文中移除对应片段。规则会保存为结构化 start/end 对。"
      >
        <div class="acu-v2-form-fill-page__filter">
          <AcuFormRow label="只编辑最近一组用户 / AI 正文" hint="关闭后，填表上下文会保留更完整的消息切片。">
            <AcuToggle
              :model-value="settings.tableEditLastPairOnly.value"
              @update:model-value="settings.setTableEditLastPairOnly($event)"
            />
          </AcuFormRow>

          <AcuRulePairList
            label="提取规则"
            :model-value="settings.extractRules.value"
            start-placeholder="提取开始边界"
            end-placeholder="提取结束边界"
            add-label="添加提取规则"
            @update:model-value="settings.setExtractRules($event)"
          />

          <AcuRulePairList
            label="排除规则"
            :model-value="settings.excludeRules.value"
            start-placeholder="排除开始边界"
            end-placeholder="排除结束边界"
            add-label="添加排除规则"
            @update:model-value="settings.setExcludeRules($event)"
          />
        </div>
      </AcuPanel>

      <AcuPanel
        title="质量门槛"
        description="AI 回复过短、输出格式错误、SQL 执行失败时，会按这里的门槛和重试次数处理。"
      >
        <div class="acu-v2-form-fill-page__number-grid">
          <AcuFormRow
            v-for="field in qualityFields"
            :key="field.key"
            :label="field.label"
            :hint="field.hint"
          >
            <AcuInput
              type="number"
              :min="field.min"
              :step="field.step"
              :model-value="field.value"
              @change="settings.setNumber(field.key, $event)"
            />
          </AcuFormRow>
        </div>
      </AcuPanel>

      <AcuPanel
        title="填表提示词"
        description="这里控制填表 AI 怎么理解表格和写入规则。普通使用建议保持默认；只有填表长期漏字段、格式不稳定，或你想自己规定填表规则时再编辑。改错后可以在抽屉里载入默认提示词。"
      >
        <template #actions>
          <AcuBadge :variant="promptTemplateBadgeVariant">{{ promptTemplateBadgeLabel }}</AcuBadge>
        </template>

        <AcuMessage v-if="!promptSlotSummary.hasA || !promptSlotSummary.hasB" kind="warning">
          填表提示词缺少必要主插槽，建议在编辑器里载入默认提示词后保存。
        </AcuMessage>

        <div class="acu-v2-form-fill-page__actions">
          <AcuButton variant="primary" @click="promptDrawerOpen = true">编辑提示词</AcuButton>
        </div>
      </AcuPanel>
    </div>

    <FormFillPromptDrawer
      :is-open="promptDrawerOpen"
      :segments="settings.promptSegments.value"
      :dirty="settings.promptDirty.value"
      :message="promptMessage"
      @close="promptDrawerOpen = false"
      @save="settings.savePrompt"
      @reset="settings.resetPrompt"
      @import-file="settings.importPromptFile($event)"
      @export="settings.exportPrompt"
      @add="settings.addPromptSegment($event)"
      @delete="settings.deletePromptSegment($event)"
      @update="updatePromptSegment"
    />
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import AcuBadge, { type AcuBadgeVariant } from '../components/_lib/AcuBadge.vue';
import AcuButton from '../components/_lib/AcuButton.vue';
import AcuFormRow from '../components/_lib/AcuFormRow.vue';
import AcuInput from '../components/_lib/AcuInput.vue';
import AcuMessage from '../components/_lib/AcuMessage.vue';
import AcuPageHeader from '../components/_lib/AcuPageHeader.vue';
import AcuPanel from '../components/_lib/AcuPanel.vue';
import AcuRulePairList from '../components/_lib/AcuRulePairList.vue';
import AcuStatsList from '../components/_lib/AcuStatsList.vue';
import AcuToggle from '../components/_lib/AcuToggle.vue';
import FormFillPromptDrawer from '../components/FormFillPromptDrawer.vue';
import { useChatChangedTick } from '../composables/useChatChangedListener';
import { useDashboardPage } from '../composables/useDashboardPage';
import { useUiCloseGuard } from '../composables/useUiCloseGuard';
import {
  useFormFillSettings,
  type FormFillPromptSegment,
  type NumberSettingKey,
} from '../composables/useFormFillSettings';

const settings = useFormFillSettings();
const dashboard = useDashboardPage();
const promptDrawerOpen = ref(false);

const cadenceKeys = new Set<NumberSettingKey>([
  'autoUpdateThreshold',
  'autoUpdateFrequency',
  'updateBatchSize',
  'maxConcurrentGroups',
  'skipUpdateFloors',
  'retainRecentLayers',
]);

const qualityKeys = new Set<NumberSettingKey>([
  'autoUpdateTokenThreshold',
  'tableMaxRetries',
]);

const cadenceFields = computed(() => settings.numberFields.value.filter(field => cadenceKeys.has(field.key)));
const qualityFields = computed(() => settings.numberFields.value.filter(field => qualityKeys.has(field.key)));
const promptSlotSummary = computed(() => ({
  hasA: settings.promptSegments.value.some(segment => segment.mainSlot === 'A' || segment.isMain === true),
  hasB: settings.promptSegments.value.some(segment => segment.mainSlot === 'B' || segment.isMain2 === true),
}));
const promptTemplateBadgeLabel = computed(() =>
  settings.promptTemplateMode.value === 'default' ? '使用默认提示词' : '已自定义提示词',
);
const promptTemplateBadgeVariant = computed<AcuBadgeVariant>(() =>
  settings.promptTemplateMode.value === 'default' ? 'neutral' : 'accent',
);
const promptMessage = computed(() =>
  settings.message.value?.scope === 'prompt' ? settings.message.value : null,
);

function confirmPromptClose(): boolean {
  if (!promptDrawerOpen.value || !settings.promptDirty.value) return true;
  return window.confirm('你有未保存的填表提示词修改，确定要关闭新 UI 吗？');
}

function updatePromptSegment(index: number, patch: Partial<FormFillPromptSegment>): void {
  settings.updatePromptSegment(index, patch);
}

async function refreshAll(): Promise<void> {
  settings.refresh();
  await dashboard.refresh();
}

onMounted(() => { void refreshAll(); });
watch(useChatChangedTick(), () => { void refreshAll(); });
useUiCloseGuard(confirmPromptClose);
</script>

<style scoped>
.acu-v2-form-fill-page {
  min-height: 100%;
  min-width: 0;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.acu-v2-form-fill-page__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  align-items: stretch;
}

.acu-v2-form-fill-page__number-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 10px;
}

.acu-v2-form-fill-page__filter {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.acu-v2-form-fill-page__table-wrap {
  min-width: 0;
  overflow: auto;
  border: 0;
  border-radius: var(--acu-radius-sm);
  background: var(--acu-bg-0);
}

.acu-v2-form-fill-page__status-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 560px;
  font-size: 12px;
}

.acu-v2-form-fill-page__status-table th,
.acu-v2-form-fill-page__status-table td {
  padding: 8px 10px;
  border-bottom: 1px solid var(--acu-border-2);
  text-align: left;
}

.acu-v2-form-fill-page__status-table th {
  color: var(--acu-text-3);
  font-weight: 600;
  background: var(--acu-bg-1);
}

.acu-v2-form-fill-page__status-table td {
  color: var(--acu-text-2);
}

.acu-v2-form-fill-page__status-table tr:last-child td {
  border-bottom: 0;
}

.acu-v2-form-fill-page__status-row--ready td {
  color: var(--acu-text-1);
}

.acu-v2-form-fill-page__empty {
  text-align: center !important;
  color: var(--acu-text-3) !important;
}

.acu-v2-form-fill-page__actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding-top: 12px;
  margin-top: 4px;
}

@media (max-width: 860px) {
  .acu-v2-form-fill-page {
    padding: 14px;
  }

  .acu-v2-form-fill-page__grid {
    grid-template-columns: 1fr;
  }
}
</style>
