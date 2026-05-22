<template>
  <main class="acu-visualizer-surface" data-acu-visualizer-surface>
    <aside ref="sheetNavRef" class="acu-visualizer-surface__sidebar" aria-label="表格列表">
      <div class="acu-visualizer-surface__brand">
        <span class="acu-visualizer-surface__brand-mark" aria-hidden="true">DB</span>
        <span class="acu-visualizer-surface__brand-copy">
          <span class="acu-visualizer-surface__brand-title">数据库编辑器</span>
          <span class="acu-visualizer-surface__brand-tag">{{ visualizer.sheetItems.length }} 张表 · {{ visualizer.dirty ? '未保存' : '已同步' }}</span>
        </span>
      </div>

      <div class="acu-visualizer-surface__nav-head">
        <h2>表格列表</h2>
        <AcuBadge variant="neutral">{{ visualizer.sheetItems.length }} 张</AcuBadge>
      </div>
      <span class="acu-visualizer-surface__mobile-nav-label">表格 / 全局配置</span>

      <div
        v-for="(item, index) in visualizer.sheetItems"
        :key="item.key"
        :ref="el => setSheetRowRef(item.key, el)"
        class="acu-visualizer-surface__sheet-row"
        :class="{ 'is-active': item.key === visualizer.currentSheetKey && visualizer.mode !== 'global' }"
      >
        <AcuButton
          class="acu-visualizer-surface__sheet-select"
          size="sm"
          @click="visualizer.selectSheet(item.key)"
        >
          <span>{{ item.name }}</span>
          <small>{{ item.rowCount }} 行 · {{ item.columnCount }} 列</small>
        </AcuButton>
        <div class="acu-visualizer-surface__sheet-actions" aria-label="表格操作">
          <AcuIconButton
            icon="fa-solid fa-chevron-up"
            size="sm"
            title="上移"
            :disabled="index === 0"
            @click="visualizer.moveSheet(item.key, 'up')"
          />
          <AcuIconButton
            icon="fa-solid fa-chevron-down"
            size="sm"
            title="下移"
            :disabled="index === visualizer.sheetItems.length - 1"
            @click="visualizer.moveSheet(item.key, 'down')"
          />
          <AcuIconButton
            icon="fa-solid fa-trash"
            size="sm"
            variant="danger"
            title="删除表格"
            @click="requestDeleteSheet(item.key)"
          />
        </div>
      </div>

      <AcuButton class="acu-visualizer-surface__add-sheet" size="sm" @click="requestAddSheet">
        <i class="fa-solid fa-plus"></i>
        新增表格
      </AcuButton>

      <AcuButton
        :ref="setGlobalNavRef"
        class="acu-visualizer-surface__global-item"
        size="sm"
        :class="{ 'is-active': visualizer.mode === 'global' }"
        @click="visualizer.selectGlobalConfig"
      >
        全局注入配置
      </AcuButton>
    </aside>

    <section class="acu-visualizer-surface__main" aria-label="数据库编辑器主区域">
      <header class="acu-visualizer-surface__topbar">
        <div class="acu-visualizer-surface__status" aria-label="数据库编辑器状态">
          <span>模板: {{ data.templatePresetLabel.value || '载入中' }}</span>
          <span v-if="visualizer.currentSheetKey && visualizer.currentSheet">
            当前表: {{ currentSheetName }}
          </span>
          <AcuBadge v-if="visualizer.externalRevisionChanged" variant="warning">
            外部数据已变化
          </AcuBadge>
          <AcuBadge v-else-if="visualizer.dirty" variant="warning">未保存</AcuBadge>
          <AcuBadge v-else variant="neutral">已同步</AcuBadge>
        </div>

        <AcuSegmentedControl
          v-if="visualizer.mode !== 'global' && visualizer.currentSheetKey"
          class="acu-visualizer-surface__mode-tabs"
          :options="modes"
          :model-value="visualizer.mode"
          aria-label="编辑模式"
          @update:model-value="setWorkspaceMode"
        />

        <AcuIconButton
          class="acu-visualizer-surface__close"
          icon="fa-solid fa-xmark"
          title="关闭数据库编辑器"
          aria-label="关闭数据库编辑器"
          @click="emit('close')"
        />
      </header>

      <AcuInfoBanner
        v-if="visualizer.externalRevisionChanged"
        tone="warning"
        class="acu-visualizer-surface__conflict"
      >
        当前聊天的数据在编辑器打开后发生变化。重新载入会丢弃当前草稿；保留草稿则继续编辑，下一次保存会以这里的内容为准。
        <span class="acu-visualizer-surface__conflict-actions">
          <AcuButton size="sm" @click="data.forceReloadFromCurrentContext">重新载入外部数据</AcuButton>
          <AcuButton size="sm" @click="visualizer.clearExternalRefreshConflict">保留当前草稿</AcuButton>
        </span>
      </AcuInfoBanner>

      <section class="acu-visualizer-surface__workspace" aria-label="数据库编辑工作区">
        <div v-if="visualizer.isLoading" class="acu-visualizer-surface__loading">
          <i class="fa-solid fa-spinner fa-spin"></i>
          <span>正在载入当前聊天的表格数据...</span>
        </div>

        <AcuPanel
          v-else-if="visualizer.loadError"
          title="无法载入数据库"
          description="数据库编辑器需要先读取当前聊天或隔离标签下的表格数据。请先完成初始化或一次填表；如果刚切换了聊天，可以重新打开新 UI 再试。"
        >
          <p class="acu-visualizer-surface__empty">{{ visualizer.loadError }}</p>
          <AcuButton @click="data.forceReloadFromCurrentContext">重新尝试载入</AcuButton>
        </AcuPanel>

        <template v-else-if="visualizer.mode === 'global'">
          <VisualizerGlobalInjectionPanels />
        </template>

        <template v-else>
          <template
            v-if="visualizer.mode === 'data'"
          >
            <div class="acu-visualizer-surface__data-toolbar">
              <div>
                <h2>{{ currentSheetName }}</h2>
                <p>卡片视图会直接修改当前编辑草稿，保存前不会写回聊天。</p>
              </div>
              <AcuButton size="sm" variant="primary" @click="visualizer.addRow">
                <i class="fa-solid fa-plus"></i>
                添加新行
              </AcuButton>
            </div>

            <p v-if="rows.length === 0" class="acu-visualizer-surface__empty">
              当前表还没有数据行。可以先添加新行，再逐个字段填写内容。
            </p>

            <div v-else class="acu-visualizer-surface__card-grid">
              <article
                v-for="row in rows"
                :key="row.index"
                class="acu-visualizer-surface__data-card"
              >
                <header class="acu-visualizer-surface__card-header">
                  <strong>#{{ row.index + 1 }}</strong>
                  <span>{{ row.fields.length }} 个字段</span>
                  <AcuIconButton
                    icon="fa-solid fa-trash"
                    size="sm"
                    variant="danger"
                    title="删除这一行"
                    @click="deleteRow(row.index)"
                  />
                </header>
                <div class="acu-visualizer-surface__fields">
                  <label
                    v-for="field in row.fields"
                    :key="field.columnIndex"
                    class="acu-visualizer-surface__field"
                  >
                    <span>{{ field.header }}</span>
                    <AcuTextarea
                      :model-value="field.value"
                      :rows="2"
                      @update:model-value="value => visualizer.updateCell(row.index, field.columnIndex, value)"
                    />
                  </label>
                </div>
              </article>
            </div>
          </template>

          <VisualizerConfigPanels
            v-else-if="visualizer.mode === 'config'"
            @request-add-column="requestAddColumn"
            @request-delete-column="requestDeleteColumn"
          />

          <VisualizerAssistantPanel v-else />
        </template>
      </section>

      <footer class="acu-visualizer-surface__footer" aria-label="保存操作">
        <span>{{ footerStatus }}</span>
        <div class="acu-visualizer-surface__footer-actions">
          <AcuButton :disabled="saveDisabled" :loading="visualizer.isSaving" @click="save.saveToChat">
            保存到当前聊天
          </AcuButton>
          <AcuButton :disabled="saveDisabled" :loading="visualizer.isSaving" variant="primary" @click="save.saveToGlobal">
            保存到全局模板
          </AcuButton>
        </div>
      </footer>
    </section>

    <Transition name="acu-visualizer-dialog">
      <div
        v-if="activeDialog"
        class="acu-visualizer-surface__dialog-layer"
        role="presentation"
        @click.self="cancelActiveDialog"
      >
        <section
          class="acu-visualizer-surface__dialog"
          role="dialog"
          aria-modal="true"
          :aria-labelledby="dialogTitleId"
        >
          <header class="acu-visualizer-surface__dialog-header">
            <h2 :id="dialogTitleId">{{ activeDialog.title }}</h2>
            <AcuBadge
              v-if="activeDialog.kind === 'close-dirty'"
              variant="warning"
            >
              未保存
            </AcuBadge>
          </header>

          <p class="acu-visualizer-surface__dialog-message">
            {{ activeDialog.message }}
          </p>

          <label
            v-if="activeDialog.kind === 'input'"
            class="acu-visualizer-surface__dialog-field"
          >
            <span>{{ activeDialog.label }}</span>
            <AcuInput
              v-model="dialogInputValue"
              autocomplete="off"
              :placeholder="activeDialog.placeholder"
              @keyup.enter="confirmInputDialog"
            />
          </label>

          <footer
            v-if="activeDialog.kind === 'close-dirty'"
            class="acu-visualizer-surface__dialog-actions acu-visualizer-surface__dialog-actions--three"
          >
            <AcuButton :loading="visualizer.isSaving" variant="primary" @click="resolveCloseDirtyDialog('save')">
              保存到当前聊天
            </AcuButton>
            <AcuButton variant="danger" @click="resolveCloseDirtyDialog('discard')">
              丢弃草稿
            </AcuButton>
            <AcuButton @click="resolveCloseDirtyDialog('cancel')">
              取消关闭
            </AcuButton>
          </footer>

          <footer v-else class="acu-visualizer-surface__dialog-actions">
            <AcuButton @click="cancelActiveDialog">
              {{ activeDialog.cancelLabel || '取消' }}
            </AcuButton>
            <AcuButton
              :variant="activeDialog.confirmVariant || 'primary'"
              :disabled="activeDialog.kind === 'input' && !String(dialogInputValue).trim()"
              @click="confirmActiveDialog"
            >
              {{ activeDialog.confirmLabel }}
            </AcuButton>
          </footer>
        </section>
      </div>
    </Transition>
  </main>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import AcuBadge from '../../components/_lib/AcuBadge.vue';
import AcuButton from '../../components/_lib/AcuButton.vue';
import AcuIconButton from '../../components/_lib/AcuIconButton.vue';
import AcuInfoBanner from '../../components/_lib/AcuInfoBanner.vue';
import AcuInput from '../../components/_lib/AcuInput.vue';
import AcuPanel from '../../components/_lib/AcuPanel.vue';
import AcuSegmentedControl from '../../components/_lib/AcuSegmentedControl.vue';
import AcuTextarea from '../../components/_lib/AcuTextarea.vue';
import { useUiCloseGuard } from '../../composables/useUiCloseGuard';
import { useVisualizerConfigEditing } from '../../composables/visualizer/useVisualizerConfigEditing';
import { useVisualizerData } from '../../composables/visualizer/useVisualizerData';
import { useVisualizerSave } from '../../composables/visualizer/useVisualizerSave';
import {
  useVisualizerStore,
  type VisualizerMode,
} from '../../stores/visualizer-store';
import VisualizerAssistantPanel from './VisualizerAssistantPanel.vue';
import VisualizerConfigPanels from './VisualizerConfigPanels.vue';
import VisualizerGlobalInjectionPanels from './VisualizerGlobalInjectionPanels.vue';

const visualizer = useVisualizerStore();
const data = useVisualizerData();
const config = useVisualizerConfigEditing();
const emit = defineEmits<{
  (event: 'close'): void;
}>();
type VisualizerDialog =
  | {
      kind: 'input';
      title: string;
      message: string;
      label: string;
      placeholder?: string;
      confirmLabel: string;
      cancelLabel?: string;
      confirmVariant?: 'default' | 'primary' | 'danger';
      resolve: (value: string | null) => void;
    }
  | {
      kind: 'confirm';
      title: string;
      message: string;
      confirmLabel: string;
      cancelLabel?: string;
      confirmVariant?: 'default' | 'primary' | 'danger';
      resolve: (value: boolean) => void;
    }
  | {
      kind: 'close-dirty';
      title: string;
      message: string;
      resolve: (value: 'save' | 'discard' | 'cancel') => void;
    };

const dialogTitleId = 'acu-visualizer-dialog-title';
const activeDialog = ref<VisualizerDialog | null>(null);
const dialogInputValue = ref('');
const sheetNavRef = ref<HTMLElement | null>(null);
const globalNavRef = ref<HTMLElement | null>(null);
const sheetRowRefs = new Map<string, HTMLElement>();

const save = useVisualizerSave({
  requestGlobalPresetName(defaultName) {
    return openInputDialog({
      title: '保存到全局模板',
      message: '当前生效的是默认模板，保存到全局前需要给这份模板起一个名字。取消后不会写入聊天或清掉未保存状态。',
      label: '模板预设名称',
      defaultValue: defaultName,
      placeholder: '例如：当前角色专用模板',
      confirmLabel: '保存到全局',
    });
  },
  confirmOverwriteGlobalPreset(presetName) {
    return openConfirmDialog({
      title: '覆盖全局模板',
      message: `这会用当前编辑结果覆盖全局预设"${presetName}"。如果不确定，可以先取消，当前草稿会继续保留在编辑器里。`,
      confirmLabel: '覆盖并保存',
      confirmVariant: 'primary',
    });
  },
});

const modes: Array<{ value: VisualizerMode; label: string }> = [
  { value: 'data', label: '数据' },
  { value: 'config', label: '结构/参数' },
  { value: 'assistant', label: 'AI 助手' },
];

function setWorkspaceMode(value: string): void {
  if (value === 'data' || value === 'config' || value === 'assistant') {
    visualizer.setMode(value);
  }
}

const currentSheetName = computed(() =>
  String(visualizer.currentSheet?.name || visualizer.currentSheetKey || '未选择表格'),
);

const headers = computed<string[]>(() => {
  const content = visualizer.currentSheet?.content;
  if (!Array.isArray(content) || !Array.isArray(content[0])) return [];
  return content[0].slice(1).map((item: any, index: number) => String(item || `字段 ${index + 1}`));
});

const rows = computed(() => {
  const content = visualizer.currentSheet?.content;
  if (!Array.isArray(content)) return [];
  return content.slice(1).map((row: any[], index: number) => ({
    index,
    fields: headers.value.map((header, columnIndex) => ({
      header,
      columnIndex,
      value: String(Array.isArray(row) ? row[columnIndex + 1] ?? '' : ''),
    })),
  }));
});

const footerStatus = computed(() => {
  if (visualizer.isLoading) return '正在读取当前聊天的表格数据。';
  if (visualizer.loadError) return '当前没有可保存的表格草稿。';
  if (visualizer.isSaving) return '正在保存表格数据...';
  if (visualizer.dirty) return '有未保存修改，保存前只存在于编辑器草稿中。';
  if (visualizer.lastSavedAt) return '最近一次保存已完成。';
  return '载入后可以编辑数据卡片，并选择保存到当前聊天或全局模板。';
});

const saveDisabled = computed(() =>
  visualizer.isLoading || !!visualizer.loadError || !visualizer.tempData,
);

async function requestAddSheet(): Promise<void> {
  const name = await openInputDialog({
    title: '新增表格',
    message: '新表格会先放进当前编辑草稿，只有点击保存后才会写回聊天或全局模板。',
    label: '表格名称',
    defaultValue: '新建表格',
    placeholder: '例如：角色状态',
    confirmLabel: '新增表格',
  });
  if (name) data.addSheet(name);
}

async function requestDeleteSheet(key: string): Promise<void> {
  const sheet = visualizer.tempData?.[key];
  const name = String(sheet?.name || key);
  const confirmed = await openConfirmDialog({
    title: '删除表格',
    message: `确定要删除表格"${name}"吗？保存后，这张表的数据和模板配置都会被移除。取消后草稿不会变化。`,
    confirmLabel: '删除表格',
    confirmVariant: 'danger',
  });
  if (confirmed) data.deleteSheet(key);
}

async function deleteRow(rowIndex: number): Promise<void> {
  const confirmed = await openConfirmDialog({
    title: '删除数据行',
    message: `确定要删除第 ${rowIndex + 1} 行吗？这只会修改当前草稿，保存前仍可通过关闭时取消来保留编辑器。`,
    confirmLabel: '删除这一行',
    confirmVariant: 'danger',
  });
  if (!confirmed) return;
  visualizer.deleteRow(rowIndex);
}

async function requestAddColumn(): Promise<void> {
  const name = await openInputDialog({
    title: '添加列',
    message: '新列会加入当前表头，并给已有数据行补一个空值。保存前，这个结构变化只存在于编辑器草稿中。',
    label: '列名',
    defaultValue: '新列',
    placeholder: '例如：状态',
    confirmLabel: '添加列',
  });
  if (name) config.addColumn(name);
}

async function requestDeleteColumn(index: number): Promise<void> {
  const header = headers.value[index] || `第 ${index + 1} 列`;
  const confirmed = await openConfirmDialog({
    title: '删除列',
    message: `确定要删除"${header}"吗？这会同时删除该列在所有数据行里的值。取消后草稿不会变化。`,
    confirmLabel: '删除列',
    confirmVariant: 'danger',
  });
  if (!confirmed) return;
  config.deleteColumn(index);
}

useUiCloseGuard(async () => {
  if (!visualizer.isActive || !visualizer.dirty) return true;
  const action = await openCloseDirtyDialog();
  if (action === 'cancel') return false;
  if (action === 'discard') return true;
  return save.saveToChat();
});

function openInputDialog(options: {
  title: string;
  message: string;
  label: string;
  defaultValue: string;
  placeholder?: string;
  confirmLabel: string;
}): Promise<string | null> {
  dialogInputValue.value = options.defaultValue;
  return new Promise(resolve => {
    activeDialog.value = {
      kind: 'input',
      title: options.title,
      message: options.message,
      label: options.label,
      placeholder: options.placeholder,
      confirmLabel: options.confirmLabel,
      resolve,
    };
  });
}

function openConfirmDialog(options: {
  title: string;
  message: string;
  confirmLabel: string;
  confirmVariant?: 'default' | 'primary' | 'danger';
}): Promise<boolean> {
  return new Promise(resolve => {
    activeDialog.value = {
      kind: 'confirm',
      title: options.title,
      message: options.message,
      confirmLabel: options.confirmLabel,
      confirmVariant: options.confirmVariant,
      resolve,
    };
  });
}

function openCloseDirtyDialog(): Promise<'save' | 'discard' | 'cancel'> {
  return new Promise(resolve => {
    activeDialog.value = {
      kind: 'close-dirty',
      title: '关闭数据库编辑器',
      message: '当前草稿还没有保存。保存会先写入当前聊天再关闭；丢弃会关闭编辑器并清空这次草稿；取消关闭会回到编辑器继续处理。',
      resolve,
    };
  });
}

function cancelActiveDialog(): void {
  const dialog = activeDialog.value;
  activeDialog.value = null;
  if (!dialog) return;
  if (dialog.kind === 'input') dialog.resolve(null);
  else if (dialog.kind === 'confirm') dialog.resolve(false);
  else dialog.resolve('cancel');
}

function confirmInputDialog(): void {
  const dialog = activeDialog.value;
  if (!dialog || dialog.kind !== 'input') return;
  const value = String(dialogInputValue.value || '').trim();
  if (!value) return;
  activeDialog.value = null;
  dialog.resolve(value);
}

function confirmActiveDialog(): void {
  const dialog = activeDialog.value;
  if (!dialog) return;
  if (dialog.kind === 'input') {
    confirmInputDialog();
    return;
  }
  if (dialog.kind === 'confirm') {
    activeDialog.value = null;
    dialog.resolve(true);
  }
}

function resolveCloseDirtyDialog(value: 'save' | 'discard' | 'cancel'): void {
  const dialog = activeDialog.value;
  if (!dialog || dialog.kind !== 'close-dirty') return;
  activeDialog.value = null;
  dialog.resolve(value);
}

function asElement(el: unknown): HTMLElement | null {
  if (el instanceof HTMLElement) return el;
  const root = (el as { $el?: unknown } | null)?.$el;
  return root instanceof HTMLElement ? root : null;
}

function setSheetRowRef(key: string, el: unknown): void {
  const element = asElement(el);
  if (element) sheetRowRefs.set(key, element);
  else sheetRowRefs.delete(key);
}

function setGlobalNavRef(el: unknown): void {
  globalNavRef.value = asElement(el);
}

async function scrollActiveNavItemIntoView(): Promise<void> {
  await nextTick();
  const target = visualizer.mode === 'global'
    ? globalNavRef.value
    : visualizer.currentSheetKey
      ? sheetRowRefs.get(visualizer.currentSheetKey) || null
      : null;
  target?.scrollIntoView?.({
    block: 'nearest',
    inline: 'nearest',
  });
}

onMounted(() => {
  void data.loadFromCurrentContext();
  void scrollActiveNavItemIntoView();
});

watch(() => visualizer.externalRefreshTick, () => {
  if (!visualizer.isActive || visualizer.dirty) return;
  void data.loadFromCurrentContext();
});

watch(
  () => [visualizer.currentSheetKey, visualizer.mode, visualizer.sheetOrder.join('\u0001')],
  () => {
    void scrollActiveNavItemIntoView();
  },
);
</script>

<style scoped>
.acu-visualizer-surface {
  flex: 1 1 auto;
  min-width: 0;
  min-height: 0;
  display: grid;
  grid-template-columns: 260px minmax(0, 1fr);
  overflow: hidden;
  background: var(--acu-bg-0);
  color: var(--acu-text-1);
}

.acu-visualizer-surface__sidebar {
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 24px 12px 16px;
  overflow-y: auto;
  border-right: 1px solid var(--acu-border-2);
  background: var(--acu-sidebar-bg);
}

.acu-visualizer-surface__brand {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 4px 4px 20px;
  margin-bottom: 14px;
}

.acu-visualizer-surface__brand-mark {
  width: 34px;
  height: 34px;
  flex: 0 0 34px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--acu-radius-md);
  background: var(--acu-accent);
  color: var(--acu-on-accent);
  font-size: var(--acu-font-size-caption, 11px);
  font-weight: 700;
  letter-spacing: 0.04em;
}

.acu-visualizer-surface__brand-copy {
  min-width: 0;
  display: block;
}

.acu-visualizer-surface__brand-title {
  display: block;
  min-width: 0;
  overflow: hidden;
  color: var(--acu-text-1);
  font-size: var(--acu-font-size-panel-title, 15px);
  font-weight: 700;
  line-height: 1.25;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.acu-visualizer-surface__brand-tag {
  display: block;
  min-width: 0;
  margin-top: 3px;
  overflow: hidden;
  color: var(--acu-text-3);
  font-size: var(--acu-font-size-caption, 11px);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.acu-visualizer-surface__main {
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--acu-bg-0);
}

.acu-visualizer-surface__topbar {
  flex: 0 0 auto;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 50px;
  padding: 8px 12px 8px 16px;
  border-bottom: 1px solid var(--acu-border-2);
  background: var(--acu-bg-0);
}

.acu-visualizer-surface__status {
  min-width: 0;
  display: flex;
  align-items: center;
  flex: 1 1 auto;
  flex-wrap: wrap;
  gap: 8px;
  color: var(--acu-text-2);
  font-size: var(--acu-font-size-body, 12px);
}

.acu-visualizer-surface__conflict {
  flex: 0 0 auto;
  margin: 12px 16px 0;
}

.acu-visualizer-surface__conflict-actions {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-left: 8px;
}

.acu-visualizer-surface__mobile-nav-label {
  display: none;
  color: var(--acu-text-3);
  font-size: var(--acu-font-size-caption, 11px);
  font-weight: 600;
  white-space: nowrap;
}

.acu-visualizer-surface__nav-head,
.acu-visualizer-surface__data-toolbar,
.acu-visualizer-surface__card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.acu-visualizer-surface__nav-head h2 {
  margin: 0;
  padding: 7px 0 6px;
  color: var(--acu-text-3);
  font-size: var(--acu-font-size-caption, 11px);
  font-weight: 600;
  letter-spacing: 0.06em;
  line-height: 1.3;
  text-transform: uppercase;
}

.acu-visualizer-surface__sheet-row {
  min-width: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 6px;
  border-radius: var(--acu-radius-sm);
  color: var(--acu-text-2);
  transition: background 0.15s ease, color 0.15s ease, box-shadow 0.15s ease;
}

.acu-visualizer-surface__sheet-row:not(.is-active):hover {
  background: var(--acu-hover-overlay);
  color: var(--acu-text-1);
}

.acu-visualizer-surface__sheet-row.is-active {
  background: var(--acu-accent);
  color: var(--acu-on-accent);
  font-weight: 600;
}

.acu-visualizer-surface__sheet-select,
.acu-visualizer-surface__global-item {
  font: inherit;
  border: 0;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease, box-shadow 0.15s ease;
}

.acu-visualizer-surface__sheet-select {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 9px;
  border-radius: var(--acu-radius-sm);
  background: transparent;
  color: inherit;
  text-align: left;
  box-shadow: none;
}

.acu-visualizer-surface__sheet-select span,
.acu-visualizer-surface__sheet-select small {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.acu-visualizer-surface__sheet-select small {
  color: currentColor;
  font-size: var(--acu-font-size-caption, 11px);
  font-weight: 400;
  opacity: 0.72;
}

.acu-visualizer-surface__sheet-actions {
  display: flex;
  align-items: center;
  gap: 3px;
  padding-right: 4px;
  opacity: 0.7;
}

.acu-visualizer-surface__sheet-actions :deep(.acu-icon-btn) {
  color: currentColor;
}

.acu-visualizer-surface__sheet-row:hover .acu-visualizer-surface__sheet-actions,
.acu-visualizer-surface__sheet-row.is-active .acu-visualizer-surface__sheet-actions {
  opacity: 1;
}

.acu-visualizer-surface__add-sheet {
  width: 100%;
}

.acu-visualizer-surface__global-item {
  margin-top: auto;
  padding: 8px 9px;
  border-radius: var(--acu-radius-sm);
  background: transparent;
  color: var(--acu-text-2);
  text-align: left;
}

.acu-visualizer-surface__global-item:hover,
.acu-visualizer-surface__global-item.is-active {
  background: var(--acu-accent);
  color: var(--acu-on-accent);
  font-weight: 600;
}

.acu-visualizer-surface__workspace {
  flex: 1 1 auto;
  min-height: 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow: auto;
  padding: 16px;
}

.acu-visualizer-surface__loading {
  min-height: 140px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: var(--acu-text-3);
}

.acu-visualizer-surface__mode-tabs {
  flex: 0 0 auto;
  width: min(360px, 42vw);
}

.acu-visualizer-surface__close {
  width: 30px;
  height: 30px;
  flex: 0 0 auto;
  border: 0;
  background: transparent;
  color: var(--acu-text-2);
  font-size: var(--acu-font-size-page-title, 22px);
  line-height: 1;
  border-radius: var(--acu-radius-sm);
}

.acu-visualizer-surface__close:hover {
  background: var(--acu-hover-overlay);
  color: var(--acu-text-1);
}

.acu-visualizer-surface__data-toolbar {
  flex: 0 0 auto;
  padding: 0 0 4px;
  color: var(--acu-text-3);
  font-size: var(--acu-font-size-body, 12px);
}

.acu-visualizer-surface__data-toolbar h2 {
  margin: 0;
  color: var(--acu-text-1);
  font-size: var(--acu-font-size-page-title, 22px);
  font-weight: 700;
  line-height: 1.2;
}

.acu-visualizer-surface__data-toolbar p {
  margin: 5px 0 0;
  color: var(--acu-text-3);
  font-size: var(--acu-font-size-body, 12px);
  line-height: var(--acu-line-height-readable, 1.55);
}

.acu-visualizer-surface__empty {
  margin: 0;
  color: var(--acu-text-2);
  font-size: var(--acu-font-size-body-lg, 13px);
  line-height: 1.55;
}

.acu-visualizer-surface__card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 420px), 1fr));
  gap: 12px;
}

.acu-visualizer-surface__data-card {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
  height: 100%;
  padding: 16px;
  border: 1px solid var(--acu-border);
  border-radius: var(--acu-radius-md);
  background: var(--acu-bg-1);
}

.acu-visualizer-surface__card-header strong {
  color: var(--acu-text-1);
  font-family: var(--acu-font-mono);
  font-size: var(--acu-font-size-panel-title, 15px);
}

.acu-visualizer-surface__card-header span {
  min-width: 0;
  margin-right: auto;
  overflow: hidden;
  color: var(--acu-text-3);
  font-size: var(--acu-font-size-caption, 11px);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.acu-visualizer-surface__fields {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.acu-visualizer-surface__field {
  min-width: 0;
  display: grid;
  gap: 4px;
}

.acu-visualizer-surface__field span {
  min-width: 0;
  overflow: hidden;
  color: var(--acu-text-2);
  font-size: var(--acu-font-size-caption, 11px);
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.acu-visualizer-surface__footer {
  flex: 0 0 auto;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 16px;
  border-top: 1px solid var(--acu-border-2);
  color: var(--acu-text-3);
  font-size: var(--acu-font-size-body, 12px);
}

.acu-visualizer-surface__footer-actions {
  display: flex;
  gap: 8px;
  flex: 0 0 auto;
}

.acu-visualizer-surface__footer-actions :deep(.acu-btn) {
  min-width: 132px;
}

.acu-visualizer-surface__dialog-layer {
  position: fixed;
  inset: 0;
  z-index: 9400;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 18px;
  background: rgba(0, 0, 0, 0.58);
}

.acu-visualizer-surface__dialog {
  width: min(420px, 100%);
  max-height: calc(100vh - 36px);
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  overflow: auto;
  border: 1px solid var(--acu-border);
  border-radius: var(--acu-radius-md);
  background: var(--acu-bg-1);
  box-shadow: var(--acu-shadow);
}

.acu-visualizer-surface__dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.acu-visualizer-surface__dialog-header h2 {
  min-width: 0;
  margin: 0;
  overflow: hidden;
  color: var(--acu-text-1);
  font-size: var(--acu-font-size-panel-title, 15px);
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.acu-visualizer-surface__dialog-message {
  margin: 0;
  color: var(--acu-text-2);
  font-size: var(--acu-font-size-body-lg, 13px);
  line-height: 1.55;
}

.acu-visualizer-surface__dialog-field {
  display: grid;
  gap: 5px;
}

.acu-visualizer-surface__dialog-field span {
  color: var(--acu-text-2);
  font-size: var(--acu-font-size-caption, 11px);
  font-weight: 600;
}

.acu-visualizer-surface__dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding-top: 4px;
}

.acu-visualizer-surface__dialog-actions--three {
  justify-content: stretch;
}

.acu-visualizer-surface__dialog-actions--three :deep(.acu-btn) {
  flex: 1 1 0;
}

.acu-visualizer-surface__sheet-select:focus-visible,
.acu-visualizer-surface__global-item:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px var(--acu-accent-glow);
}

.acu-visualizer-dialog-enter-active,
.acu-visualizer-dialog-leave-active {
  transition: opacity 0.15s ease;
}

.acu-visualizer-dialog-enter-active .acu-visualizer-surface__dialog,
.acu-visualizer-dialog-leave-active .acu-visualizer-surface__dialog {
  transition: transform 0.15s ease, opacity 0.15s ease;
}

.acu-visualizer-dialog-enter-from,
.acu-visualizer-dialog-leave-to {
  opacity: 0;
}

.acu-visualizer-dialog-enter-from .acu-visualizer-surface__dialog,
.acu-visualizer-dialog-leave-to .acu-visualizer-surface__dialog {
  opacity: 0;
  transform: translateY(6px);
}

@media (max-width: 1024px) {
  .acu-visualizer-surface {
    grid-template-columns: 220px minmax(0, 1fr);
  }

  .acu-visualizer-surface__card-grid {
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 360px), 1fr));
  }

  .acu-visualizer-surface__topbar {
    flex-wrap: wrap;
  }

  .acu-visualizer-surface__mode-tabs {
    order: 3;
    width: min(420px, 100%);
  }
}

@media (max-width: 767px) {
  .acu-visualizer-surface {
    grid-template-columns: 1fr;
    grid-template-rows: auto minmax(0, 1fr);
  }

  .acu-visualizer-surface__sidebar {
    min-height: 0;
    display: flex;
    flex-direction: row;
    gap: 8px;
    overflow-x: auto;
    overflow-y: hidden;
    padding: 8px;
    border-right: 0;
    border-bottom: 1px solid var(--acu-border-2);
    scroll-padding-inline: 8px;
    scroll-snap-type: x proximity;
    -webkit-overflow-scrolling: touch;
  }

  .acu-visualizer-surface__brand {
    display: none;
  }

  .acu-visualizer-surface__nav-head {
    display: none;
  }

  .acu-visualizer-surface__mobile-nav-label {
    display: inline-flex;
    align-items: center;
    flex: 0 0 auto;
    padding: 0 2px;
  }

  .acu-visualizer-surface__sheet-row {
    flex: 0 0 174px;
    grid-template-columns: minmax(0, 1fr);
    align-content: space-between;
    border: 1px solid var(--acu-border);
    background: transparent;
    scroll-snap-align: start;
  }

  .acu-visualizer-surface__sheet-actions {
    justify-content: flex-end;
    padding: 0 6px 6px;
    opacity: 1;
  }

  .acu-visualizer-surface__global-item,
  .acu-visualizer-surface__add-sheet {
    flex: 0 0 auto;
    margin-top: 0;
    min-height: 54px;
    white-space: nowrap;
    scroll-snap-align: start;
  }

  .acu-visualizer-surface__global-item {
    display: inline-flex;
    align-items: center;
  }

  .acu-visualizer-surface__topbar {
    padding: 8px 10px;
  }

  .acu-visualizer-surface__status {
    order: 1;
  }

  .acu-visualizer-surface__close {
    order: 2;
  }

  .acu-visualizer-surface__mode-tabs {
    order: 3;
    width: 100%;
  }

  .acu-visualizer-surface__workspace {
    padding: 12px;
  }

  .acu-visualizer-surface__data-toolbar {
    align-items: stretch;
    flex-direction: column;
  }

  .acu-visualizer-surface__data-toolbar :deep(.acu-btn) {
    width: 100%;
  }

  .acu-visualizer-surface__footer {
    align-items: stretch;
    flex-direction: column;
  }

  .acu-visualizer-surface__footer-actions {
    flex-direction: column;
  }

  .acu-visualizer-surface__footer-actions :deep(.acu-btn) {
    width: 100%;
  }

  .acu-visualizer-surface__dialog {
    width: 100%;
  }
}

@media (max-width: 480px) {
  .acu-visualizer-surface {
    gap: 10px;
  }

  .acu-visualizer-surface__status {
    align-items: stretch;
    flex-direction: column;
  }

  .acu-visualizer-surface__card-grid {
    grid-template-columns: 1fr;
  }

  .acu-visualizer-surface__fields {
    grid-template-columns: 1fr;
  }

  .acu-visualizer-surface__sheet-row {
    flex-basis: 158px;
  }

  .acu-visualizer-surface__mode-tabs {
    width: 100%;
  }

  .acu-visualizer-surface__data-toolbar h2 {
    font-size: 20px;
  }

  .acu-visualizer-surface__conflict-actions {
    display: flex;
    margin: 8px 0 0;
  }

  .acu-visualizer-surface__dialog-actions,
  .acu-visualizer-surface__dialog-actions--three {
    flex-direction: column;
  }
}
</style>
