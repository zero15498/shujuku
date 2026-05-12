<template>
  <section class="acu-v2-dashboard-page">
    <AcuPageHeader title="仪表盘" />

    <div class="acu-v2-dashboard-page__grid">
      <AcuPanel
        title="数据库状态"
        description="读取当前聊天已加载的表格数据，并按 AI 回复楼层计算每张表的上次更新、未记录楼层与下一次自动触发点。"
      >
        <div class="acu-v2-dashboard-page__status-row" role="list">
          <span role="listitem" class="acu-v2-dashboard-page__status-item">
            <span class="acu-v2-dashboard-page__status-label">API</span>
            <button
              type="button"
              class="acu-v2-dashboard-page__status-link"
              :class="{ 'acu-v2-dashboard-page__status-link--empty': !apiStore.activePresetName }"
              @click="goTo('api')"
            >
              {{ apiStore.activePresetName || '未设置' }}
              <i class="fa-solid fa-arrow-up-right-from-square" aria-hidden="true"></i>
            </button>
          </span>
          <span role="listitem" class="acu-v2-dashboard-page__status-item">
            <span class="acu-v2-dashboard-page__status-label">表格模板</span>
            <button
              type="button"
              class="acu-v2-dashboard-page__status-link"
              :class="{ 'acu-v2-dashboard-page__status-link--empty': !templatePreset.displayName }"
              @click="goTo('table')"
            >
              {{ templatePresetText }}
              <i class="fa-solid fa-arrow-up-right-from-square" aria-hidden="true"></i>
            </button>
          </span>
          <span role="listitem" class="acu-v2-dashboard-page__status-item">
            <span class="acu-v2-dashboard-page__status-label">剧情推进</span>
            <button
              type="button"
              class="acu-v2-dashboard-page__status-link"
              :class="{ 'acu-v2-dashboard-page__status-link--empty': !plotStore.activePresetName }"
              @click="goTo('plot')"
            >
              {{ plotStore.activePresetName || '未设置' }}
              <i class="fa-solid fa-arrow-up-right-from-square" aria-hidden="true"></i>
            </button>
          </span>
        </div>

        <AcuStatsList :items="dashboard.stats.value" />
        <AcuMessage :kind="dashboard.hasTables.value ? 'info' : 'warning'">
          {{ dashboard.hasTables.value ? dashboard.nextUpdateText.value : '当前尚未加载数据库表格。' }}
        </AcuMessage>

        <div class="acu-v2-dashboard-page__table-wrap">
          <table class="acu-v2-dashboard-page__status-table">
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
                <td colspan="5" class="acu-v2-dashboard-page__empty">暂无数据</td>
              </tr>
              <tr
                v-for="row in dashboard.tableRows.value"
                :key="row.key"
                :class="{ 'acu-v2-dashboard-page__status-row--ready': row.ready }"
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
        title="开关"
        description="基础设置：同一聊天里你可能临时开关的功能。高级设置：配置后基本不动，修改后可能影响功能正常运行，请谨慎调整。"
      >
        <AcuSegmentedControl
          v-model="activeGroup"
          :options="groupOptions"
          aria-label="开关分组切换"
          size="sm"
        />

        <div class="acu-v2-dashboard-page__toggle-list" :data-acu-toggle-group="activeGroup">
          <template v-if="activeGroup === 'basic'">
            <ToggleRow
              v-for="item in dashboard.basicToggles.value"
              :key="item.key"
              :item="item"
              @change="handleToggleChange(item.key, $event)"
            />
          </template>

          <template v-else-if="activeGroup === 'feature'">
            <ToggleRow
              v-for="item in dashboard.featureToggles.value"
              :key="item.key"
              :item="item"
              @change="handleToggleChange(item.key, $event)"
            />
          </template>

          <template v-else>
            <ToggleRow
              v-for="item in dashboard.advancedToggles.value"
              :key="item.key"
              :item="item"
              @change="handleToggleChange(item.key, $event)"
            />

            <ToggleRow
              :item="developerToggleItem"
              @change="setDeveloperOptionsEnabled($event)"
            />

            <div class="acu-v2-dashboard-page__radio-block">
              <span class="acu-v2-dashboard-page__radio-title">存储模式</span>
              <p class="acu-v2-dashboard-page__radio-desc">
                决定表格数据如何持久化。切换会重载存储提供者，已有数据按当前模式重新解释；填表提示词会同步重置为对应模式的默认提示词（两种模式必须用各自的默认提示词才能被正确填写）。
              </p>
              <AcuRadioGroup
                name="acu-v2-storage-mode"
                :options="dashboard.storageOptions"
                :model-value="dashboard.storageMode.value"
                direction="vertical"
                @update:model-value="onStorageModeChange"
              />
              <AcuMessage v-if="dashboard.storageMessage.value" :kind="dashboard.storageMessage.value.kind">
                {{ dashboard.storageMessage.value.text }}
              </AcuMessage>
            </div>
          </template>
        </div>
      </AcuPanel>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import AcuBadge from '../components/_lib/AcuBadge.vue';
import AcuMessage from '../components/_lib/AcuMessage.vue';
import AcuPageHeader from '../components/_lib/AcuPageHeader.vue';
import AcuPanel from '../components/_lib/AcuPanel.vue';
import AcuRadioGroup from '../components/_lib/AcuRadioGroup.vue';
import AcuSegmentedControl from '../components/_lib/AcuSegmentedControl.vue';
import AcuStatsList from '../components/_lib/AcuStatsList.vue';
import ToggleRow from '../components/DashboardToggleRow.vue';
import { useApiPresetStore } from '../stores/api-preset-store';
import { usePlotPresetStore } from '../stores/plot-preset-store';
import { useRouterStore } from '../stores/router-store';
import {
  FEATURE_GATE_CONTENT_REPLACE,
  FEATURE_GATE_PLOT,
  FEATURE_GATE_VECTOR_INDEX,
} from '../router/page-registry';
import { useChatChangedTick } from '../composables/useChatChangedListener';
import { useDashboardPage, readActiveTemplatePresetSnapshot, type TemplatePresetSnapshot } from '../composables/useDashboardPage';
import { useDevOptions } from '../composables/useDevOptions';

const dashboard = useDashboardPage();
const apiStore = useApiPresetStore();
const plotStore = usePlotPresetStore();
const routerStore = useRouterStore();
const { developerOptionsEnabled, setDeveloperOptionsEnabled } = useDevOptions();

const activeGroup = ref<'basic' | 'feature' | 'advanced'>('basic');
const groupOptions = [
  { value: 'basic', label: '基础设置' },
  { value: 'feature', label: '功能开关' },
  { value: 'advanced', label: '高级设置' },
];

const templatePreset = ref<TemplatePresetSnapshot>(readActiveTemplatePresetSnapshot());

const templatePresetText = computed(() => {
  if (!templatePreset.value.displayName) return '未设置';
  return templatePreset.value.scopeLabel
    ? `${templatePreset.value.displayName}（${templatePreset.value.scopeLabel}）`
    : templatePreset.value.displayName;
});

const developerToggleItem = computed(() => ({
  key: 'developerOptionsEnabled',
  label: '启用开发者选项',
  description: '在 sidebar 中显示「开发者」一级页，并允许各功能页显示进阶字段（例如剧情推进的匹配替换字段）。一般用户不需要打开；动了出问题是正常的。',
  value: developerOptionsEnabled.value,
}));

async function refreshAll(): Promise<void> {
  apiStore.refreshFromSettings();
  apiStore.refreshTavernProfiles();
  plotStore.refreshFromSettings();
  templatePreset.value = readActiveTemplatePresetSnapshot();
  await dashboard.refresh();
  routerStore.setSqliteMode(dashboard.storageMode.value === 'sqlite');
  syncFeaturePageGates();
}

async function onStorageModeChange(value: string): Promise<void> {
  await dashboard.setStorageMode(value);
  routerStore.setSqliteMode(dashboard.storageMode.value === 'sqlite');
}

function goTo(pageId: string): void {
  routerStore.setActivePage(pageId);
}

function syncFeaturePageGates(): void {
  routerStore.setFeatureGate(
    FEATURE_GATE_CONTENT_REPLACE,
    dashboard.contentReplaceGateEnabled.value,
  );
  routerStore.setFeatureGate(FEATURE_GATE_PLOT, plotStore.enabled === true);
  routerStore.setFeatureGate(
    FEATURE_GATE_VECTOR_INDEX,
    dashboard.featureToggles.value.some(item => item.key === 'summaryVectorIndexModeEnabled' && item.value),
  );
}

function handleToggleChange(key: string, value: boolean): void {
  dashboard.setToggle(key, value);
  if (key === 'plotEnabled') plotStore.refreshFromSettings();
  syncFeaturePageGates();
}

onMounted(() => { void refreshAll(); });
watch(useChatChangedTick(), () => { void refreshAll(); });
</script>

<style scoped>
.acu-v2-dashboard-page {
  min-height: 100%;
  min-width: 0;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.acu-v2-dashboard-page__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  align-items: stretch;
}

.acu-v2-dashboard-page__status-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 14px;
  margin: 0 0 12px;
  padding: 10px 12px;
  border: 0;
  border-radius: var(--acu-radius-sm);
  background: var(--acu-bg-2);
  font-size: 12px;
  color: var(--acu-text-3);
}

.acu-v2-dashboard-page__status-item {
  display: inline-flex;
  align-items: baseline;
  gap: 6px;
  min-width: 0;
}

.acu-v2-dashboard-page__status-label {
  color: var(--acu-text-3);
  flex-shrink: 0;
}

.acu-v2-dashboard-page__status-link {
  display: inline-flex;
  align-items: baseline;
  gap: 4px;
  padding: 0;
  border: 0;
  background: transparent;
  font: inherit;
  font-size: 12px;
  color: var(--acu-text-1);
  cursor: pointer;
  text-decoration: underline;
  text-decoration-color: var(--acu-border-2);
  text-underline-offset: 3px;
  transition: color 0.15s ease, text-decoration-color 0.15s ease;
  min-width: 0;
}

.acu-v2-dashboard-page__status-link:hover,
.acu-v2-dashboard-page__status-link:focus-visible {
  color: var(--acu-text-1);
  text-decoration-color: var(--acu-text-1);
  outline: none;
}

.acu-v2-dashboard-page__status-link--empty {
  color: var(--acu-text-3);
}

.acu-v2-dashboard-page__status-link i {
  font-size: 10px;
  opacity: 0.7;
}

.acu-v2-dashboard-page__table-wrap {
  min-width: 0;
  overflow: auto;
  border: 0;
  border-radius: var(--acu-radius-sm);
  background: var(--acu-bg-0);
}

.acu-v2-dashboard-page__status-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 560px;
  font-size: 12px;
}

.acu-v2-dashboard-page__status-table th,
.acu-v2-dashboard-page__status-table td {
  padding: 8px 10px;
  border-bottom: 1px solid var(--acu-border);
  text-align: left;
}

.acu-v2-dashboard-page__status-table th {
  color: var(--acu-text-3);
  font-weight: 600;
  background: var(--acu-bg-2);
}

.acu-v2-dashboard-page__status-table td {
  color: var(--acu-text-2);
}

.acu-v2-dashboard-page__status-table tr:last-child td {
  border-bottom: 0;
}

.acu-v2-dashboard-page__status-row--ready td {
  color: var(--acu-text-1);
}

.acu-v2-dashboard-page__empty {
  text-align: center !important;
  color: var(--acu-text-3) !important;
}

.acu-v2-dashboard-page__toggle-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin-top: 14px;
}

.acu-v2-dashboard-page__radio-block {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-top: 12px;
  background: var(--acu-bg-2);
  border-radius: var(--acu-radius-sm);
  padding: 12px;
}

.acu-v2-dashboard-page__radio-title {
  font-size: 13px;
  font-weight: 500;
  color: var(--acu-text-1);
}

.acu-v2-dashboard-page__radio-desc {
  margin: 0;
  font-size: 11px;
  line-height: 1.5;
  color: var(--acu-text-3);
}

@media (max-width: 860px) {
  .acu-v2-dashboard-page {
    padding: 14px;
  }

  .acu-v2-dashboard-page__grid {
    grid-template-columns: 1fr;
  }
}
</style>
