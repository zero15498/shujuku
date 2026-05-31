import { ref } from 'vue';
import { TABLE_ORDER_FIELD_ACU } from '../../../shared/constants';
import { logDebug_ACU, logWarn_ACU } from '../../../shared/utils';
import {
  currentJsonTableData_ACU,
  _set_currentJsonTableData_ACU,
} from '../../../service/runtime/state-manager';
import {
  getTableLocksForSheet_ACU,
  isSpecialIndexLockEnabled_ACU,
  mergeAllIndependentTables_ACU,
} from '../../../service/runtime/helpers-remaining';
import {
  getSortedSheetKeys_ACU,
  reorderDataBySheetKeys_ACU,
} from '../../../service/template/chat-scope';
import { getActiveTemplatePresetMeta_ACU } from '../../../service/template/template-preset-service';
import { loadAllChatMessages_ACU } from '../../../service/worldbook/pipeline';
import { buildDefaultExportConfig_ACU } from '../../../service/worldbook/injection-engine';
import { useToastStore } from '../../stores/toast-store';
import { useVisualizerStore, type VisualizerLockDraft } from '../../stores/visualizer-store';

function hasSheetData(data: any): boolean {
  return !!data && typeof data === 'object' && Object.keys(data).some(key => key.startsWith('sheet_'));
}

function nowMs(): number {
  return typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now();
}

function formatMs(value: number): string {
  return `${Math.round(value)}ms`;
}

function getSheetKeys(data: any): string[] {
  return data && typeof data === 'object'
    ? Object.keys(data).filter(key => key.startsWith('sheet_'))
    : [];
}

function summarizeData(data: any, currentSheetKey: string | null | undefined): string {
  const keys = getSheetKeys(data);
  const selectedKey = currentSheetKey && data?.[currentSheetKey]
    ? currentSheetKey
    : keys[0] || '';
  const sheet = selectedKey ? data?.[selectedKey] : null;
  const content = Array.isArray(sheet?.content) ? sheet.content : [];
  const header = Array.isArray(content[0]) ? content[0] : [];
  return `sheets=${keys.length} current=${selectedKey || 'none'} rows=${Math.max(0, content.length - 1)} cols=${Math.max(0, header.length - 1)}`;
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

function buildLockDrafts(orderedKeys: string[]): Record<string, VisualizerLockDraft> {
  const drafts: Record<string, VisualizerLockDraft> = {};
  orderedKeys.forEach(key => {
    const locks = getTableLocksForSheet_ACU(key);
    drafts[key] = {
      rows: Array.from(locks.rows || []).map(Number).filter(Number.isFinite),
      cols: Array.from(locks.cols || []).map(Number).filter(Number.isFinite),
      cells: Array.from(locks.cells || []).map(String),
      specialIndexLocked: isSpecialIndexLockEnabled_ACU(key),
    };
  });
  return drafts;
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
    const startedAt = nowMs();
    visualizer.setLoading(true);
    refreshTemplatePresetLabel();

    try {
      let data = currentJsonTableData_ACU;
      const hadRuntimeSheetData = hasSheetData(data);
      let loadMessagesElapsed = 0;
      let mergeElapsed = 0;
      let reorderElapsed = 0;
      if (!hasSheetData(data)) {
        const loadMessagesStartedAt = nowMs();
        await loadAllChatMessages_ACU();
        loadMessagesElapsed = nowMs() - loadMessagesStartedAt;
        const mergeStartedAt = nowMs();
        const merged = await mergeAllIndependentTables_ACU();
        mergeElapsed = nowMs() - mergeStartedAt;
        if (hasSheetData(merged)) {
          const reorderStartedAt = nowMs();
          const stableKeys = getSortedSheetKeys_ACU(merged);
          data = reorderDataBySheetKeys_ACU(merged, stableKeys);
          _set_currentJsonTableData_ACU(cloneData(data));
          reorderElapsed = nowMs() - reorderStartedAt;
        }
      }

      if (!hasSheetData(data)) {
        const snapshotStartedAt = nowMs();
        visualizer.loadSnapshot({ mate: { type: 'chatSheets', version: 1 } }, []);
        const snapshotElapsed = nowMs() - snapshotStartedAt;
        const lockStartedAt = nowMs();
        visualizer.loadLockDrafts({});
        const lockElapsed = nowMs() - lockStartedAt;
        const totalElapsed = nowMs() - startedAt;
        logDebug_ACU(
          `[VisualizerPerf] loadData empty runtimeHadSheets=${hadRuntimeSheetData} loadMessages=${formatMs(loadMessagesElapsed)} merge=${formatMs(mergeElapsed)} reorder=${formatMs(reorderElapsed)} snapshot=${formatMs(snapshotElapsed)} locks=${formatMs(lockElapsed)} total=${formatMs(totalElapsed)}`,
        );
        return true;
      }

      const orderedStartedAt = nowMs();
      const orderedKeys = buildOrderedKeys(data);
      const orderedElapsed = nowMs() - orderedStartedAt;
      const snapshotStartedAt = nowMs();
      visualizer.loadSnapshot(data, orderedKeys);
      const snapshotElapsed = nowMs() - snapshotStartedAt;
      const lockStartedAt = nowMs();
      visualizer.loadLockDrafts(buildLockDrafts(orderedKeys));
      const lockElapsed = nowMs() - lockStartedAt;
      const totalElapsed = nowMs() - startedAt;
      const message = `[VisualizerPerf] loadData runtimeHadSheets=${hadRuntimeSheetData} historyFallback=${!hadRuntimeSheetData} loadMessages=${formatMs(loadMessagesElapsed)} merge=${formatMs(mergeElapsed)} reorder=${formatMs(reorderElapsed)} order=${formatMs(orderedElapsed)} snapshot=${formatMs(snapshotElapsed)} locks=${formatMs(lockElapsed)} total=${formatMs(totalElapsed)} ${summarizeData(data, visualizer.currentSheetKey)}`;
      logDebug_ACU(message);
      if (totalElapsed >= 1000) logWarn_ACU(message);
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
