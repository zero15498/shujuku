<template>
  <section class="acu-v2-plot-page">
    <AcuPageHeader title="剧情推进" />

    <div class="acu-v2-plot-page__grid">
      <!-- 预设面板 -->
      <AcuPanel
        title="剧情推进预设"
        description="预设决定 AI 如何拦截、思考与改写输入。下拉框切换「当前聊天」使用哪个预设；星标设置为「全局默认」（新聊天会继承）。导入按钮会把 JSON 保存到预设库，并让当前聊天立刻使用它；新聊天仍跟随全局默认，需要点星标才会默认继承。齿轮图标进入管理面板，可以从默认新建、编辑、导出或删除预设。默认预设是内置配置，不能直接修改；需要调整时请使用“从默认新建”。预设内部包含多个剧情任务，每个任务都是一个独立的 AI 调用，可以并发或串行。"
      >
        <template #actions>
          <span v-if="!store.hasPresets" class="acu-v2-plot-page__hint">尚无预设</span>
        </template>

        <p class="acu-v2-plot-page__status-line">
          当前聊天:
          <strong>{{ store.activePresetName || '默认预设' }}</strong>
          <template v-if="store.defaultPresetName"> · 全局默认: <strong>{{ store.defaultPresetName }}</strong></template>
          <template v-else> · 全局默认: <strong>默认预设</strong></template>
          <span class="acu-v2-plot-page__badge" :class="store.isChatOverridden ? 'acu-v2-plot-page__badge--override' : 'acu-v2-plot-page__badge--inherit'">
            {{ store.isChatOverridden ? '已覆盖' : '跟随全局' }}
          </span>
        </p>

        <div class="acu-v2-plot-page__select-row">
          <AcuPresetDropdown
            :items="presetDropdownItems"
            :model-value="store.activePresetName"
            :default-name="store.defaultPresetName"
            @update:model-value="store.setActivePresetForCurrentChat($event)"
            @set-default="store.setDefaultPreset($event)"
          />
          <AcuButton
            icon-only
            :title="store.activePreset ? '编辑当前预设' : '默认预设不能直接编辑，请从默认新建后修改'"
            :disabled="!store.activePreset"
            @click="management.openEditCurrent"
          >
            <i class="fa-solid fa-pen"></i>
          </AcuButton>
          <AcuFileButton
            icon-only
            title="导入预设 JSON"
            accept="application/json,.json"
            @file="onImportFile"
          >
            <i class="fa-solid fa-file-import"></i>
          </AcuFileButton>
          <AcuButton icon-only title="管理预设" @click="management.openManage">
            <i class="fa-solid fa-gear"></i>
          </AcuButton>
        </div>

        <AcuFormRow label="剧情推进 API 预设" hint="留空 = 跟随当前活动 API；任务里的单独 API 选择会优先使用。">
          <AcuSelect
            :options="pageApiSelectOptions"
            :model-value="store.pageApiPresetName"
            placeholder="跟随当前活动 API"
            @update:model-value="store.setPageApiPreset($event)"
          />
        </AcuFormRow>
      </AcuPanel>

      <!-- 世界书选择 -->
      <AcuPanel
        title="剧情推进世界书"
        description="剧情推进会读取一个世界书的条目作为上下文（这与「填表」的世界书选择相互独立）。默认跟随当前角色卡的主世界书；如果你想用别的世界书，选择「手动指定」，再从下拉中挑一本。"
      >
        <WorldbookSelector
          :model-value="plotWorldbook.selectorValue.value"
          :names="worldbook.names.value"
          :char-primary="worldbook.charPrimary.value"
          :status="worldbook.status.value"
          :error="worldbook.error.value"
          filterable
          @update:model-value="onWorldbookChange($event)"
        />
        <p class="acu-v2-plot-page__hint">
          目前已选: <strong>{{ currentWorldbookLabel }}</strong>
        </p>

        <WorldbookEntryToolbar
          v-model:filter="entryFilter"
          @select-all="wbEntries.selectAll()"
          @deselect-all="wbEntries.deselectAll()"
        />
        <WorldbookEntryList
          :groups="wbEntries.groups.value"
          :filter="entryFilter"
          :loading="wbEntries.status.value === 'loading'"
          @toggle="(bookName: string, uid: number, checked: boolean) => wbEntries.toggleEntry(bookName, uid, checked)"
          @toggle-group="wbEntries.toggleGroupExpanded($event)"
        />
      </AcuPanel>
    </div>

    <PlotPresetDrawer
      :is-open="management.isDrawerOpen.value"
      :view="management.drawerView.value"
      :title="management.title.value"
      :error="management.error.value"
      :draft-meta="management.draftMeta"
      :context-rules="management.contextRules"
      :preset-meta="management.presetMeta.value"
      :default-preset-name="store.defaultPresetName"
      :api-preset-options="apiPresetOptions"
      :task-editing="management.taskEditing"
      :current-task-api-override="currentTaskApiOverride"
      :show-advanced-rates="devOptions.plotAdvanced.value"
      :rates="rateValues"
      :before-close="() => management.confirmIfDirty()"
      @close="management.closeDrawer"
      @back="management.backToManage"
      @open-create="management.openCreate"
      @open-edit="management.openEdit($event)"
      @set-default="store.setDefaultPreset($event)"
      @delete="onDelete"
      @export="onExport"
      @save="management.saveDraft"
      @update-name="management.draftMeta.name = $event"
      @update-context-extract-rules="management.setContextExtractRules"
      @update-context-exclude-rules="management.setContextExcludeRules"
      @update-task-api-override="onTaskApiOverride"
      @update-rate="rates.setRate"
    />
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import AcuPanel from '../components/_lib/AcuPanel.vue';
import AcuButton from '../components/_lib/AcuButton.vue';
import AcuFileButton from '../components/_lib/AcuFileButton.vue';
import AcuFormRow from '../components/_lib/AcuFormRow.vue';
import AcuPageHeader from '../components/_lib/AcuPageHeader.vue';
import AcuSelect from '../components/_lib/AcuSelect.vue';
import type { AcuSelectOption } from '../components/_lib/AcuSelect.vue';
import AcuPresetDropdown from '../components/_lib/AcuPresetDropdown.vue';
import type { PresetDropdownItem } from '../components/_lib/AcuPresetDropdown.vue';
import WorldbookSelector from '../components/WorldbookSelector.vue';
import WorldbookEntryList from '../components/WorldbookEntryList.vue';
import WorldbookEntryToolbar from '../components/WorldbookEntryToolbar.vue';
import PlotPresetDrawer from '../components/PlotPresetDrawer.vue';
import { usePlotPresetStore } from '../stores/plot-preset-store';
import { usePlotPresetManagement } from '../composables/usePlotPresetManagement';
import { useUiCloseGuard } from '../composables/useUiCloseGuard';
import { useApiPresetStore } from '../stores/api-preset-store';
import { useDevOptions } from '../composables/useDevOptions';
import { useWorldbookSelector } from '../composables/useWorldbookSelector';
import { usePlotWorldbookConfig } from '../composables/usePlotWorldbookConfig';
import { usePlotRates } from '../composables/usePlotRates';
import { usePlotWorldbookEntries } from '../composables/usePlotWorldbookEntries';
import { useChatChangedTick } from '../composables/useChatChangedListener';

const store = usePlotPresetStore();
const apiStore = useApiPresetStore();
const management = usePlotPresetManagement();
const devOptions = useDevOptions();
const worldbook = useWorldbookSelector();
const plotWorldbook = usePlotWorldbookConfig();
const rates = usePlotRates();
const wbEntries = usePlotWorldbookEntries();
const entryFilter = ref('');

const presetDropdownItems = computed<PresetDropdownItem[]>(() =>
  [
    { value: '', label: '默认预设', meta: `${store.defaultPresetTaskCount} 个任务` },
    ...store.presets.map(p => ({
      value: p.name,
      label: p.name,
      meta: `${Array.isArray(p.raw?.plotTasks) ? p.raw.plotTasks.length : 0} 个任务`,
    })),
  ],
);

const apiPresetOptions = computed(() => apiStore.presets.map(p => ({ name: p.name })));

const rateValues = computed(() => ({
  rateMain: rates.rateMain.value,
  ratePersonal: rates.ratePersonal.value,
  rateErotic: rates.rateErotic.value,
  rateCuckold: rates.rateCuckold.value,
  recallCount: rates.recallCount.value,
}));

const pageApiSelectOptions = computed<AcuSelectOption[]>(() => [
  { value: '', label: '跟随当前活动 API' },
  ...apiStore.presets.map(p => ({ value: p.name, label: p.name })),
]);

useUiCloseGuard(() => {
  if (!management.isDrawerOpen.value) return true;
  return management.confirmIfDirty();
});

// ——— 当前任务的 API 单独选择 ———
const currentTaskApiOverride = computed<string>(() => {
  const taskId = management.taskEditing.currentTaskId.value;
  if (!taskId) return '';
  return store.taskApiOverrides[taskId] || '';
});

function onTaskApiOverride(value: string): void {
  const taskId = management.taskEditing.currentTaskId.value;
  if (!taskId) return;
  store.setTaskApiOverride(taskId, value);
}

// ——— 抽屉的删/导/入操作 ———
function onDelete(name: string): void {
  if (!window.confirm(`删除剧情推进预设"${name}"？`)) return;
  management.deletePreset(name);
}

function onExport(name: string): void {
  const text = management.exportPresetAsText(name);
  if (!text) return;
  try {
    const blob = new Blob([text], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${name}.plot-preset.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch {
    /* ignore */
  }
}

async function onImportFile(file: File): Promise<void> {
  try {
    const text = await file.text();
    management.importFromJsonText(text);
  } catch {
    /* ignore */
  }
}

async function refreshWorldbookEntries(): Promise<void> {
  const names = await plotWorldbook.resolveBookNames();
  await wbEntries.loadEntries(names);
}

function onWorldbookChange(value: string): void {
  plotWorldbook.onSelectorChange(value);
  void refreshWorldbookEntries();
}

const currentWorldbookLabel = computed<string>(() => {
  if (plotWorldbook.source.value === 'character') {
    return worldbook.charPrimary.value
      ? `角色卡主世界书 · ${worldbook.charPrimary.value}`
      : '角色卡主世界书（角色卡未指定）';
  }
  return plotWorldbook.manualBook.value || '（未选择）';
});

async function refreshAll(): Promise<void> {
  store.refreshFromSettings();
  apiStore.refreshFromSettings();
  rates.refresh();
  plotWorldbook.refreshFromSettings();
  await worldbook.refresh();
  void refreshWorldbookEntries();
}

onMounted(() => { void refreshAll(); });

watch(() => store.activePresetName, () => rates.refresh());

watch(useChatChangedTick(), () => { void refreshAll(); });
</script>

<style scoped>
.acu-v2-plot-page { min-height: 100%; min-width: 0; padding: 20px; display: flex; flex-direction: column; gap: 18px; }

.acu-v2-plot-page__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  align-items: stretch;
}

.acu-v2-plot-page__status-line { margin: 0 0 10px; font-size: 12px; color: var(--acu-text-3); display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.acu-v2-plot-page__status-line strong { color: var(--acu-text-1); font-weight: 500; }

.acu-v2-plot-page__badge {
  display: inline-flex; align-items: center;
  padding: 2px 8px; border-radius: var(--acu-radius-sm);
  font-size: 11px; font-weight: 500;
}
.acu-v2-plot-page__badge--inherit {
  background: color-mix(in srgb, var(--acu-text-3) 16%, transparent);
  color: var(--acu-text-2);
}
.acu-v2-plot-page__badge--override {
  background: var(--acu-accent);
  color: var(--acu-on-accent);
}

.acu-v2-plot-page__select-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) repeat(3, max-content);
  gap: 6px;
  align-items: stretch;
  margin-bottom: 12px;
  min-width: 0;
}

.acu-v2-plot-page__hint { margin: 0; font-size: 11px; color: var(--acu-text-3); }
.acu-v2-plot-page__hint strong { color: var(--acu-text-1); font-weight: 500; }

@media (max-width: 860px) {
  .acu-v2-plot-page { padding: 14px; }
  .acu-v2-plot-page__grid { grid-template-columns: 1fr; }
}
</style>
