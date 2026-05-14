<template>
  <section class="acu-v2-dashboard-page">
    <AcuPageHeader title="仪表盘" />

    <div class="acu-v2-dashboard-page__grid">
      <AcuPanel
        title="基础配置"
        description="这里检查当前聊天运行数据库所需的基础配置。缺失项会展开显示处理入口；配置完成后会收起为状态摘要。如果切换聊天后状态不对，请进入对应页面重新选择或导入。"
      >
        <div class="acu-v2-dashboard-page__setup-list">
          <section
            v-for="item in setupItems"
            :key="item.key"
            class="acu-v2-dashboard-page__setup-item"
            :class="{ 'acu-v2-dashboard-page__setup-item--pending': !item.complete }"
          >
            <div class="acu-v2-dashboard-page__setup-main">
              <span class="acu-v2-dashboard-page__setup-icon" aria-hidden="true">
                <i :class="item.icon"></i>
              </span>
              <div class="acu-v2-dashboard-page__setup-copy">
                <span class="acu-v2-dashboard-page__setup-title">{{ item.label }}</span>
                <span class="acu-v2-dashboard-page__setup-status">{{ item.status }}</span>
                <p v-if="!item.complete" class="acu-v2-dashboard-page__setup-desc">
                  {{ item.description }}
                </p>
              </div>
              <AcuBadge :variant="item.complete ? 'success' : 'warning'">
                {{ item.complete ? '已就绪' : '需处理' }}
              </AcuBadge>
            </div>

            <div
              v-if="!item.complete || item.key === 'storage'"
              class="acu-v2-dashboard-page__setup-actions"
            >
              <AcuButton
                size="sm"
                :variant="item.complete ? 'default' : 'primary'"
                @click="handleSetupAction(item.key)"
              >
                {{ item.actionLabel }}
              </AcuButton>
            </div>
          </section>
        </div>

        <div v-if="storageControlsOpen" class="acu-v2-dashboard-page__radio-block">
          <span class="acu-v2-dashboard-page__radio-title">存储模式</span>
          <p class="acu-v2-dashboard-page__radio-desc">
            决定表格数据如何持久化。切换会重载存储提供者，已有数据按当前模式重新解释；填表提示词会同步重置为对应模式的默认提示词。切换后如果填表异常，请先回到原模式再检查模板。
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

        <AcuMessage kind="info">
          {{ dashboard.hasTables.value ? dashboard.nextUpdateText.value : '当前尚未加载数据库表格。配置表格模板后，更新状态会在“更新参数”页显示。' }}
        </AcuMessage>
      </AcuPanel>

      <AcuPanel
        title="开关"
        description="基础设置：同一聊天里你可能临时开关的功能。功能开关：控制对应一级页是否显示并允许运行。高级设置：配置后基本不动，修改后可能影响功能正常运行，请谨慎调整。"
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
          </template>
        </div>
      </AcuPanel>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import AcuBadge from '../components/_lib/AcuBadge.vue';
import AcuButton from '../components/_lib/AcuButton.vue';
import AcuMessage from '../components/_lib/AcuMessage.vue';
import AcuPageHeader from '../components/_lib/AcuPageHeader.vue';
import AcuPanel from '../components/_lib/AcuPanel.vue';
import AcuRadioGroup from '../components/_lib/AcuRadioGroup.vue';
import AcuSegmentedControl from '../components/_lib/AcuSegmentedControl.vue';
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
import { readActiveTemplatePresetSnapshot, useDashboardPage, type TemplatePresetSnapshot } from '../composables/useDashboardPage';
import { useDevOptions } from '../composables/useDevOptions';

type SetupItemKey = 'api' | 'table' | 'plot' | 'storage';

interface SetupItem {
  key: SetupItemKey;
  label: string;
  status: string;
  description: string;
  icon: string;
  complete: boolean;
  actionLabel: string;
}

const dashboard = useDashboardPage();
const apiStore = useApiPresetStore();
const plotStore = usePlotPresetStore();
const routerStore = useRouterStore();
const { developerOptionsEnabled, setDeveloperOptionsEnabled } = useDevOptions();

const activeGroup = ref<'basic' | 'feature' | 'advanced'>('basic');
const storageControlsOpen = ref(false);
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

const storageModeLabel = computed(() =>
  dashboard.storageMode.value === 'sqlite' ? 'SQLite' : '原生 JSON',
);

const setupItems = computed<SetupItem[]>(() => {
  const apiReady = !!apiStore.activePresetName;
  const tableReady = dashboard.hasTables.value || templatePreset.value.displayName !== '默认预设';
  const plotReady = plotStore.enabled === true;

  return [
    {
      key: 'api',
      label: 'API',
      status: apiReady ? `当前使用 ${apiStore.activePresetName}` : '未选择 API 预设',
      description: 'API 是剧情推进、填表和续写调用 AI 的基础配置。没有可用 API 时，大部分自动功能无法正常运行。',
      icon: 'fa-solid fa-plug',
      complete: apiReady,
      actionLabel: apiReady ? '查看' : '配置 API',
    },
    {
      key: 'table',
      label: '表格模板',
      status: tableReady ? templatePresetText.value : '尚未加载表格模板',
      description: '表格模板决定数据库有哪些表和字段。导入或选择模板后，当前聊天才能按这些表格写入数据。',
      icon: 'fa-solid fa-table-cells',
      complete: tableReady,
      actionLabel: tableReady ? '查看' : '导入或选择',
    },
    {
      key: 'plot',
      label: '剧情推进',
      status: plotReady
        ? `已启用，当前使用 ${plotStore.activePresetName || '默认预设'}`
        : '未启用',
      description: '剧情推进会在发送消息时运行额外任务。需要使用时先打开功能开关，再导入或选择适合当前玩法的预设。',
      icon: 'fa-solid fa-route',
      complete: plotReady,
      actionLabel: plotReady ? '查看' : '启用或配置',
    },
    {
      key: 'storage',
      label: '存储模式',
      status: `当前使用 ${storageModeLabel.value}`,
      description: '存储模式决定表格数据如何落盘。原生 JSON 兼容性最好；SQLite 适合复杂表和多表关联。',
      icon: 'fa-solid fa-database',
      complete: true,
      actionLabel: storageControlsOpen.value ? '收起' : '调整',
    },
  ];
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

function handleSetupAction(key: SetupItemKey): void {
  if (key === 'api') {
    goTo('api');
  } else if (key === 'table') {
    goTo('table');
  } else if (key === 'plot') {
    if (plotStore.enabled) {
      goTo('plot');
    } else {
      activeGroup.value = 'feature';
    }
  } else if (key === 'storage') {
    storageControlsOpen.value = !storageControlsOpen.value;
  }
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

.acu-v2-dashboard-page__setup-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 12px;
}

.acu-v2-dashboard-page__setup-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px 0;
  border-bottom: 1px solid color-mix(in srgb, var(--acu-text-3) 14%, transparent);
}

.acu-v2-dashboard-page__setup-item:first-child {
  padding-top: 0;
}

.acu-v2-dashboard-page__setup-item:last-child {
  border-bottom: 0;
}

.acu-v2-dashboard-page__setup-item--pending {
  padding: 10px;
  border: 1px solid color-mix(in srgb, var(--acu-warning) 26%, transparent);
  border-radius: var(--acu-radius-sm);
  background: color-mix(in srgb, var(--acu-warning) 6%, transparent);
}

.acu-v2-dashboard-page__setup-main {
  display: grid;
  grid-template-columns: max-content minmax(0, 1fr) max-content;
  gap: 10px;
  align-items: center;
  min-width: 0;
}

.acu-v2-dashboard-page__setup-icon {
  width: 24px;
  height: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--acu-radius-sm);
  background: var(--acu-bg-2);
  color: var(--acu-text-2);
  font-size: 12px;
}

.acu-v2-dashboard-page__setup-copy {
  min-width: 0;
  display: grid;
  grid-template-columns: max-content minmax(0, 1fr);
  gap: 3px 8px;
  align-items: baseline;
}

.acu-v2-dashboard-page__setup-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--acu-text-1);
}

.acu-v2-dashboard-page__setup-status {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
  color: var(--acu-text-3);
}

.acu-v2-dashboard-page__setup-desc {
  grid-column: 1 / -1;
  margin: 0;
  font-size: 12px;
  line-height: 1.5;
  color: var(--acu-text-2);
}

.acu-v2-dashboard-page__setup-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
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
  padding: 12px 0 0;
  border-top: 1px solid color-mix(in srgb, var(--acu-text-3) 14%, transparent);
  background: transparent;
  border-radius: 0;
  margin: 2px 0 12px;
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

  .acu-v2-dashboard-page__setup-main {
    grid-template-columns: max-content minmax(0, 1fr);
  }

  .acu-v2-dashboard-page__setup-main .acu-badge {
    grid-column: 2;
    justify-self: start;
  }
}
</style>
