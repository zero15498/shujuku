import { ref } from 'vue';
import { TABLE_ORDER_FIELD_ACU } from '../../../shared/constants';
import { logWarn_ACU } from '../../../shared/utils';
import {
  currentJsonTableData_ACU,
  _set_currentJsonTableData_ACU,
} from '../../../service/runtime/state-manager';
import { mergeAllIndependentTables_ACU } from '../../../service/runtime/helpers-remaining';
import {
  getSortedSheetKeys_ACU,
  reorderDataBySheetKeys_ACU,
} from '../../../service/template/chat-scope';
import { getActiveTemplatePresetMeta_ACU } from '../../../service/template/template-preset-service';
import { loadAllChatMessages_ACU } from '../../../service/worldbook/pipeline';
import { buildDefaultExportConfig_ACU } from '../../../service/worldbook/injection-engine';
import { useToastStore } from '../../stores/toast-store';
import { useVisualizerStore } from '../../stores/visualizer-store';

function hasSheetData(data: any): boolean {
  return !!data && typeof data === 'object' && Object.keys(data).some(key => key.startsWith('sheet_'));
}

function cloneData<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function buildOrderedKeys(data: Record<string, any>): string[] {
  const allKeys = getSortedSheetKeys_ACU(data, { ignoreChatGuide: true });
  const guidedKeys = getSortedSheetKeys_ACU(data, { ignoreChatGuide: false });
  const base = Array.isArray(guidedKeys) && guidedKeys.length ? guidedKeys : allKeys;
  const missing = allKeys.filter((key: string) => !base.includes(key));
  return [...base, ...missing];
}

function makeSheetKey(): string {
  return `sheet_${Math.random().toString(36).slice(2, 11)}`;
}

function createDefaultSheet(key: string, name: string): Record<string, any> {
  return {
    uid: key,
    name,
    domain: 'chat',
    type: 'dynamic',
    enable: true,
    required: false,
    content: [[null, '列1', '列2']],
    sourceData: {
      note: '新表格说明',
      initNode: '',
      insertNode: '',
      updateNode: '',
      deleteNode: '',
    },
    updateConfig: {
      uiSentinel: -1,
      contextDepth: -1,
      updateFrequency: -1,
      batchSize: -1,
      skipFloors: -1,
      sendLatestRows: -1,
      groupId: -1,
    },
    exportConfig: buildDefaultExportConfig_ACU(name),
    [TABLE_ORDER_FIELD_ACU]: 999999,
  };
}

export function useVisualizerData() {
  const visualizer = useVisualizerStore();
  const toastStore = useToastStore();
  const templatePresetLabel = ref('');

  function refreshTemplatePresetLabel(): void {
    try {
      const meta = getActiveTemplatePresetMeta_ACU();
      templatePresetLabel.value = `${meta.displayName}（${meta.scopeLabel}）`;
    } catch {
      templatePresetLabel.value = '当前生效模板预设';
    }
  }

  async function loadFromCurrentContext(): Promise<boolean> {
    visualizer.setLoading(true);
    refreshTemplatePresetLabel();

    try {
      let data = currentJsonTableData_ACU;
      if (!hasSheetData(data)) {
        await loadAllChatMessages_ACU();
        const merged = await mergeAllIndependentTables_ACU();
        if (hasSheetData(merged)) {
          const stableKeys = getSortedSheetKeys_ACU(merged);
          data = reorderDataBySheetKeys_ACU(merged, stableKeys);
          _set_currentJsonTableData_ACU(cloneData(data));
        }
      }

      if (!hasSheetData(data)) {
        throw new Error('当前聊天还没有可编辑的表格数据。请先初始化数据库或完成一次填表。');
      }

      const orderedKeys = buildOrderedKeys(data);
      visualizer.loadSnapshot(data, orderedKeys);
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : '数据库编辑器载入失败。';
      visualizer.setLoadError(message);
      logWarn_ACU('[ACU-V2 Visualizer] load failed:', error);
      toastStore.warning(message, { muteable: false });
      return false;
    }
  }

  async function forceReloadFromCurrentContext(): Promise<boolean> {
    const loaded = await loadFromCurrentContext();
    if (loaded) toastStore.info('已重新载入当前聊天的数据。');
    return loaded;
  }

  function addSheet(name: string): void {
    const normalizedName = String(name || '').trim();
    if (!normalizedName) return;
    const key = makeSheetKey();
    visualizer.addSheet(key, createDefaultSheet(key, normalizedName));
  }

  function deleteSheet(key: string): void {
    visualizer.deleteSheet(key);
  }

  return {
    templatePresetLabel,
    loadFromCurrentContext,
    forceReloadFromCurrentContext,
    addSheet,
    deleteSheet,
  };
}
