<template>
  <section class="acu-v2-table-page">
    <AcuPageHeader title="表格模板" />

    <div class="acu-v2-table-page__grid">
      <!-- 左列 -->
      <div class="acu-v2-table-page__col">
        <AcuPanel
          title="表格模板预设"
          description="管理全局模板库与当前聊天模板作用域。下拉框切换「当前聊天」使用哪个模板；星标设置为「全局默认」（新聊天会继承）。导入按钮会把 JSON 保存到预设库，并让当前聊天立刻使用它；新聊天仍跟随全局默认，需要点星标才会默认继承。齿轮进入管理面板，可以从默认新建、导出或删除全局预设。默认预设是内置配置，不能直接修改；需要调整时请使用“从默认新建”。"
        >
          <AcuMessage v-if="templates.message.value" :kind="templates.message.value.kind">
            {{ templates.message.value.text }}
          </AcuMessage>
          <AcuMessage v-if="management.message.value" :kind="management.message.value.kind">
            {{ management.message.value.text }}
          </AcuMessage>

          <p class="acu-v2-table-page__status-line">
            当前聊天: <strong>{{ templates.selectedChatPreset.value || '默认预设' }}</strong>
            <template v-if="templates.selectedGlobalPreset.value"> · 全局默认: <strong>{{ templates.selectedGlobalPreset.value }}</strong></template>
            <template v-else> · 全局默认: <strong>默认预设</strong></template>
            <span class="acu-v2-table-page__badge" :class="templates.isChatOverridden.value ? 'acu-v2-table-page__badge--override' : 'acu-v2-table-page__badge--inherit'">
              {{ templates.isChatOverridden.value ? '已覆盖' : '跟随全局' }}
            </span>
          </p>

          <div class="acu-v2-table-page__preset-row">
            <AcuPresetDropdown
              :items="templates.chatPresetItems.value"
              :model-value="templates.selectedChatPreset.value"
              :default-name="templates.selectedGlobalPreset.value"
              :disabled="templates.busy.value || management.busy.value"
              placeholder="默认预设"
              @update:model-value="templates.selectChatPreset($event)"
              @set-default="templates.selectGlobalPreset($event)"
            />
            <AcuButton
              icon-only
              :title="canEditCurrentTemplate ? '编辑当前模板（打开可视化表格编辑器）' : '默认预设不能直接编辑，请从默认新建后修改'"
              :disabled="management.busy.value || !canEditCurrentTemplate"
              @click="management.openVisualizer"
            >
              <i class="fa-solid fa-pen"></i>
            </AcuButton>
            <AcuFileButton
              icon-only
              title="导入模板 JSON"
              accept="application/json,.json"
              :disabled="templates.busy.value || management.busy.value"
              @file="templates.importPresetForCurrentChat($event)"
            >
              <i class="fa-solid fa-file-import"></i>
            </AcuFileButton>
            <AcuButton
              icon-only
              title="管理表格模板预设"
              :disabled="management.busy.value"
              @click="management.openManage"
            >
              <i class="fa-solid fa-gear"></i>
            </AcuButton>
          </div>
        </AcuPanel>

        <AcuPanel
          class="acu-v2-table-page__wb-panel"
          title="注入目标世界书"
          description="把「填好后的表格」写到哪本世界书里。默认写入角色卡主世界书；如果你想用别的世界书来承载表格条目，可以在这里指定。这个目标只影响写入侧，与右侧「附加世界书条目」相互独立。"
        >
          <WorldbookSelector
            :model-value="injectionTarget.selectorValue.value"
            :names="injectionWb.names.value"
            :char-primary="injectionWb.charPrimary.value"
            :status="injectionWb.status.value"
            :error="injectionWb.error.value"
            filterable
            @update:model-value="injectionTarget.onSelectorChange($event)"
          />
          <p class="acu-v2-table-page__hint">
            目前已选: <strong>{{ injectionTargetLabel }}</strong>
          </p>
        </AcuPanel>
      </div>

      <!-- 右列 -->
      <div class="acu-v2-table-page__col">
        <AcuPanel
          class="acu-v2-table-page__wb-panel"
          title="附加世界书条目"
          description="选择哪本世界书的条目会作为上下文附加到填表 AI 的提示词里。默认跟随当前角色卡的所有世界书；也可以手动指定一本，并按条目逐项启用 / 禁用。这与左侧的「注入目标」相互独立。"
        >
          <WorldbookSelector
            :model-value="entriesSource.selectorValue.value"
            :names="entriesWb.names.value"
            :char-primary="entriesWb.charPrimary.value"
            :status="entriesWb.status.value"
            :error="entriesWb.error.value"
            filterable
            @update:model-value="onEntriesSourceChange($event)"
          />
          <p class="acu-v2-table-page__hint">
            目前已选: <strong>{{ entriesSourceLabel }}</strong>
          </p>

          <WorldbookEntryToolbar
            v-model:filter="entryFilter"
            @select-all="entries.selectAll()"
            @deselect-all="entries.deselectAll()"
          />
          <WorldbookEntryList
            :groups="entries.groups.value"
            :filter="entryFilter"
            :loading="entries.status.value === 'loading'"
            @toggle="(bookName: string, uid: number, checked: boolean) => entries.toggleEntry(bookName, uid, checked)"
            @toggle-group="entries.toggleGroupExpanded($event)"
          />
        </AcuPanel>
      </div>
    </div>

    <TablePresetDrawer
      :is-open="management.isDrawerOpen.value"
      :title="management.title.value"
      :busy="management.busy.value"
      :message="management.message.value"
      :preset-meta="management.presetMeta.value"
      :default-preset-name="management.defaultPresetName.value"
      @close="management.closeDrawer"
      @create-blank="management.createBlankPreset"
      @set-default="management.setAsDefault($event)"
      @export="management.exportPreset($event)"
      @rename="management.renamePreset($event)"
      @edit="management.editPreset($event)"
      @delete="management.deletePreset($event)"
    />
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import AcuButton from '../components/_lib/AcuButton.vue';
import AcuFileButton from '../components/_lib/AcuFileButton.vue';
import AcuMessage from '../components/_lib/AcuMessage.vue';
import AcuPageHeader from '../components/_lib/AcuPageHeader.vue';
import AcuPanel from '../components/_lib/AcuPanel.vue';
import AcuPresetDropdown from '../components/_lib/AcuPresetDropdown.vue';
import TablePresetDrawer from '../components/TablePresetDrawer.vue';
import WorldbookSelector from '../components/WorldbookSelector.vue';
import WorldbookEntryList from '../components/WorldbookEntryList.vue';
import WorldbookEntryToolbar from '../components/WorldbookEntryToolbar.vue';
import { useChatChangedTick } from '../composables/useChatChangedListener';
import { useTableTemplatePresets } from '../composables/useTableTemplatePresets';
import { useTablePresetManagement } from '../composables/useTablePresetManagement';
import { useFormFillInjectionTarget } from '../composables/useFormFillInjectionTarget';
import { useFormFillWorldbookConfig } from '../composables/useFormFillWorldbookConfig';
import { useFormFillWorldbookEntries } from '../composables/useFormFillWorldbookEntries';
import { useWorldbookSelector } from '../composables/useWorldbookSelector';

const templates = useTableTemplatePresets();
const management = useTablePresetManagement();

const injectionTarget = useFormFillInjectionTarget();
const entriesSource = useFormFillWorldbookConfig();
const entries = useFormFillWorldbookEntries();
const injectionWb = useWorldbookSelector();
const entriesWb = useWorldbookSelector();
const entryFilter = ref('');
const injectionTargetLabel = ref('');
const entriesSourceLabel = ref('');
const canEditCurrentTemplate = computed(() => !!templates.selectedChatPreset.value);

async function refreshInjectionLabel(): Promise<void> {
  injectionTargetLabel.value = await injectionTarget.describeTarget();
}

async function refreshEntriesGroups(): Promise<void> {
  const names = await entriesSource.resolveBookNames();
  await entries.loadEntries(names);
  if (entriesSource.source.value === 'character') {
    const charPrimary = entriesWb.charPrimary.value;
    entriesSourceLabel.value = charPrimary
      ? `角色卡所有世界书 · 主册 ${charPrimary}`
      : '角色卡所有世界书';
  } else {
    entriesSourceLabel.value = entriesSource.manualBook.value || '（未选择）';
  }
}

function onEntriesSourceChange(value: string): void {
  entriesSource.onSelectorChange(value);
  void refreshEntriesGroups();
}

async function refreshAll(): Promise<void> {
  templates.refresh();
  management.refresh();
  injectionTarget.refreshFromSettings();
  entriesSource.refreshFromSettings();
  await Promise.all([
    injectionWb.refresh(),
    entriesWb.refresh(),
  ]);
  await Promise.all([
    refreshInjectionLabel(),
    refreshEntriesGroups(),
  ]);
}

onMounted(() => { void refreshAll(); });
watch(useChatChangedTick(), () => { void refreshAll(); });
</script>

<style scoped>
.acu-v2-table-page {
  min-height: 100%;
  min-width: 0;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.acu-v2-table-page__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  align-items: stretch;
}

.acu-v2-table-page__col {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
}

.acu-v2-table-page__status-line {
  margin: 0 0 10px;
  font-size: 12px;
  color: var(--acu-text-3);
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.acu-v2-table-page__status-line strong {
  color: var(--acu-text-1);
  font-weight: 500;
}

.acu-v2-table-page__preset-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) repeat(3, max-content);
  gap: 6px;
  align-items: stretch;
  min-width: 0;
}

.acu-v2-table-page__badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: var(--acu-radius-sm);
  font-size: 11px;
  font-weight: 500;
}

.acu-v2-table-page__badge--inherit {
  background: color-mix(in srgb, var(--acu-text-3) 16%, transparent);
  color: var(--acu-text-2);
}

.acu-v2-table-page__badge--override {
  background: var(--acu-accent);
  color: var(--acu-on-accent);
}

.acu-v2-table-page__wb-panel {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.acu-v2-table-page__hint {
  margin: 0;
  font-size: 12px;
  color: var(--acu-text-3);
}

.acu-v2-table-page__hint strong {
  color: var(--acu-text-1);
  font-weight: 500;
}

@media (max-width: 860px) {
  .acu-v2-table-page {
    padding: 14px;
  }

  .acu-v2-table-page__grid {
    grid-template-columns: 1fr;
  }
}
</style>
