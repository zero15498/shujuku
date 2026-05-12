/**
 * useImportFlow — 外部导入页业务流编排（阶段 2 / D21.4）
 *
 * 直接调 service/import / service/worldbook / shared 层；不 import presentation/。
 * AI 注入循环使用 service/table/update-orchestrator 的纯业务入口接通，
 * v2 代码不跨进旧 presentation/。
 */
import { ref } from 'vue';
import { useImportFlowStore } from '../stores/import-flow-store';
import { importTempGet_ACU, importTempRemove_ACU, importTempSet_ACU } from '../../shared/idb-import-temp';
import {
  STORAGE_KEY_IMPORTED_ENTRIES_ACU,
  STORAGE_KEY_IMPORTED_STATUS_ACU,
  STORAGE_KEY_IMPORTED_STATUS_FULL_ACU,
  STORAGE_KEY_IMPORTED_STATUS_STANDARD_ACU,
  STORAGE_KEY_IMPORTED_STATUS_SUMMARY_ACU,
} from '../../shared/data-constants';
import {
  clearImportedEntriesCore_ACU,
  deleteImportedEntriesCore_ACU,
  finalizeImportAndCleanup_ACU,
  initImportDatabase_ACU,
  saveChunkProgress_ACU,
} from '../../service/import/import-executor';
import { getCurrentCharPrimaryLorebook_ACU } from '../../service/worldbook/worldbook-service';
import { logDebug_ACU, logError_ACU } from '../../shared/utils';
import {
  executeCardUpdateCore_ACU,
  type CardUpdateProgressEvent,
} from '../../service/table/update-orchestrator';

export type ImportMessageKind = 'info' | 'success' | 'warning' | 'error';

export interface ImportMessage {
  kind: ImportMessageKind;
  text: string;
  at: number;
}

export interface UseImportFlow {
  message: ReturnType<typeof ref<ImportMessage | null>>;
  splitFile(file: File): Promise<void>;
  clearStaging(): Promise<void>;
  clearImportedEntries(): Promise<void>;
  deleteImportedEntries(): Promise<void>;
  injectChunks(): Promise<void>;
}

function setMessage(target: ReturnType<typeof ref<ImportMessage | null>>, kind: ImportMessageKind, text: string): void {
  target.value = { kind, text, at: Date.now() };
}

function progressLabel(event: CardUpdateProgressEvent): string {
  const prefix = event.currentBatch && event.totalBatches
    ? `分块 ${event.currentBatch}/${event.totalBatches}：`
    : '';
  switch (event.phase) {
    case 'preparing': return `${prefix}准备 AI 输入...`;
    case 'calling_ai': return `${prefix}调用 AI${event.attempt ? `（${event.attempt}/${event.maxRetries || '?'}）` : ''}...`;
    case 'parsing': return `${prefix}解析填表结果...`;
    case 'retry': return `${prefix}本次尝试失败，正在重试${event.message ? `：${event.message}` : '...'}`;
    case 'chunk_done': return `${prefix}分块处理完成，正在保存断点...`;
    case 'complete': return `${prefix}完成。`;
    case 'error': return `${prefix}出错${event.message ? `：${event.message}` : '。'}`;
    case 'saving': return `${prefix}保存表格数据...`;
    default: return `${prefix || '正在处理...'}`;
  }
}

async function readFileText(file: File, encoding: string): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      resolve(typeof result === 'string' ? result : '');
    };
    reader.onerror = () => reject(reader.error ?? new Error('文件读取失败'));
    reader.readAsText(file, encoding);
  });
}

async function resolveTargetLorebook(target: string): Promise<string | null> {
  if (target === 'character') {
    try {
      const primary = await getCurrentCharPrimaryLorebook_ACU();
      return typeof primary === 'string' && primary ? primary : null;
    } catch (e) {
      logError_ACU('[ACU-V2] resolve char primary lorebook failed', e);
      return null;
    }
  }
  return target ? target : null;
}

export function useImportFlow(): UseImportFlow {
  const store = useImportFlowStore();
  const message = ref<ImportMessage | null>(null);

  async function splitFile(file: File): Promise<void> {
    if (!file) return;
    const splitSize = store.splitSize;
    if (!Number.isFinite(splitSize) || splitSize <= 0) {
      setMessage(message, 'error', '请输入有效的字符分割数。');
      return;
    }

    store.setBusy(true);
    try {
      const content = await readFileText(file, store.encoding);
      if (!content) {
        setMessage(message, 'warning', '文件为空或读取失败。');
        await store.refreshStaging();
        return;
      }

      // wipe stale resume statuses
      await Promise.all([
        importTempRemove_ACU(STORAGE_KEY_IMPORTED_STATUS_ACU),
        importTempRemove_ACU(STORAGE_KEY_IMPORTED_STATUS_STANDARD_ACU),
        importTempRemove_ACU(STORAGE_KEY_IMPORTED_STATUS_SUMMARY_ACU),
        importTempRemove_ACU(STORAGE_KEY_IMPORTED_STATUS_FULL_ACU),
      ]);

      const chunks: Array<{ content: string }> = [];
      for (let i = 0; i < content.length; i += splitSize) {
        chunks.push({ content: content.substring(i, i + splitSize) });
      }
      await importTempSet_ACU(STORAGE_KEY_IMPORTED_ENTRIES_ACU, JSON.stringify(chunks));
      logDebug_ACU(`[ACU-V2 import] saved ${chunks.length} chunks (split=${splitSize})`);
      setMessage(message, 'success', `文件已成功拆分成 ${chunks.length} 个部分。`);
    } catch (e: any) {
      logError_ACU('[ACU-V2] splitFile failed', e);
      setMessage(message, 'error', e?.message || '读取文件时出错。');
    } finally {
      await store.refreshStaging();
      store.setBusy(false);
    }
  }

  async function clearStaging(): Promise<void> {
    store.setBusy(true);
    try {
      const before = store.staging.hasChunks;
      await Promise.all([
        importTempRemove_ACU(STORAGE_KEY_IMPORTED_ENTRIES_ACU),
        importTempRemove_ACU(STORAGE_KEY_IMPORTED_STATUS_ACU),
        importTempRemove_ACU(STORAGE_KEY_IMPORTED_STATUS_STANDARD_ACU),
        importTempRemove_ACU(STORAGE_KEY_IMPORTED_STATUS_SUMMARY_ACU),
        importTempRemove_ACU(STORAGE_KEY_IMPORTED_STATUS_FULL_ACU),
      ]);
      setMessage(
        message,
        before ? 'success' : 'info',
        before ? '已成功清除导入暂存缓存。' : '没有需要清除的导入暂存缓存。'
      );
    } catch (e: any) {
      logError_ACU('[ACU-V2] clearStaging failed', e);
      setMessage(message, 'error', '清除导入缓存时出错。');
    } finally {
      await store.refreshStaging();
      store.setBusy(false);
    }
  }

  async function clearImportedEntries(): Promise<void> {
    const target = await resolveTargetLorebook(store.worldbookTarget);
    if (!target) {
      setMessage(message, 'error', '无法清除导入条目：未设置数据注入目标。');
      return;
    }
    store.setBusy(true);
    try {
      const result = await clearImportedEntriesCore_ACU(target);
      if (result.deletedCount > 0) {
        setMessage(message, 'success', `成功清除了 ${result.deletedCount} 个导入条目。`);
      } else {
        setMessage(message, 'info', '没有找到可清除的已注入世界书条目。');
      }
    } catch (e: any) {
      logError_ACU('[ACU-V2] clearImportedEntries failed', e);
      setMessage(message, 'error', '清除导入条目时出错。');
    } finally {
      await store.refreshStaging();
      store.setBusy(false);
    }
  }

  async function deleteImportedEntries(): Promise<void> {
    const target = await resolveTargetLorebook(store.worldbookTarget);
    if (!target) {
      setMessage(message, 'error', '无法删除注入条目：未设置导入数据注入目标世界书。');
      return;
    }
    store.setBusy(true);
    try {
      const deletedCount = await deleteImportedEntriesCore_ACU(target);
      if (deletedCount > 0) {
        setMessage(message, 'success', `成功删除了 ${deletedCount} 个外部导入注入的条目。`);
      } else {
        setMessage(message, 'info', `在世界书 "${target}" 中没有找到符合当前标识的外部导入条目。`);
      }
    } catch (e: any) {
      logError_ACU('[ACU-V2] deleteImportedEntries failed', e);
      setMessage(message, 'error', '删除注入条目时出错。');
    } finally {
      store.setBusy(false);
    }
  }

  async function injectChunks(): Promise<void> {
    if (store.busy) return;

    const savedEntriesJson = await importTempGet_ACU(STORAGE_KEY_IMPORTED_ENTRIES_ACU);
    if (!savedEntriesJson) {
      setMessage(message, 'warning', '尚未加载 TXT 文件。请先选择并拆分文件。');
      await store.refreshStaging();
      return;
    }

    let allChunks: Array<{ content?: string }> = [];
    try {
      const parsed = JSON.parse(savedEntriesJson);
      allChunks = Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      logError_ACU('[ACU-V2] parse imported chunks failed', e);
      await Promise.all([
        importTempRemove_ACU(STORAGE_KEY_IMPORTED_ENTRIES_ACU),
        importTempRemove_ACU(STORAGE_KEY_IMPORTED_STATUS_ACU),
      ]);
      await store.refreshStaging();
      setMessage(message, 'error', '导入暂存数据已损坏，已清空。请重新选择 TXT 文件。');
      return;
    }

    if (allChunks.length === 0) {
      await store.refreshStaging();
      setMessage(message, 'warning', '没有可注入的分块。请重新选择 TXT 文件。');
      return;
    }

    const target = await resolveTargetLorebook(store.worldbookTarget);
    if (!target) {
      setMessage(message, 'error', '无法注入：未设置导入数据注入目标世界书。');
      return;
    }

    store.refreshSheetSource();
    const selectedSheetKeys = store.hasTableSelection
      ? store.selectedSheetKeys.slice()
      : store.availableSheetKeys.slice();
    if (store.hasTableSelection && selectedSheetKeys.length === 0) {
      setMessage(message, 'error', '未选择任何表格，无法注入。请先在"注入表选择"中勾选至少一个表。');
      return;
    }

    store.setBusy(true);
    try {
      const selectionSig = JSON.stringify(selectedSheetKeys);
      const initResult = await initImportDatabase_ACU(target, selectedSheetKeys, allChunks, selectionSig);
      if (!initResult.success || !initResult.status || !initResult.modeSuffix) {
        setMessage(message, 'error', initResult.error || '导入初始化失败。');
        return;
      }

      const status = initResult.status;
      const modeSuffix = initResult.modeSuffix;
      const updateMode = 'manual_unified';

      for (let i = status.currentIndex; i < allChunks.length; i++) {
        const chunk = allChunks[i] || {};
        const mockMessage = { is_user: false, mes: String(chunk.content || ''), name: '导入文本' };
        let success = false;
        let lastError = '';
        const maxOuterRetries = 3;

        for (let attempt = 1; attempt <= maxOuterRetries && !success; attempt++) {
          setMessage(message, 'info', `正在处理分块 ${i + 1}/${allChunks.length}（尝试 ${attempt}/${maxOuterRetries}）...`);
          const result = await executeCardUpdateCore_ACU(
            [mockMessage],
            -1,
            true,
            updateMode,
            true,
            selectedSheetKeys,
            null,
            new AbortController(),
            { currentBatch: i + 1, totalBatches: allChunks.length },
            event => {
              setMessage(message, 'info', progressLabel(event));
            },
          );
          success = result.success;
          lastError = result.error || (result.aborted ? '任务已终止。' : '');
          if (!success && attempt < maxOuterRetries) {
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }

        if (!success) {
          status.currentIndex = i;
          await importTempSet_ACU(STORAGE_KEY_IMPORTED_STATUS_ACU, JSON.stringify(status));
          await store.refreshStaging();
          setMessage(message, 'error', `分块 ${i + 1}/${allChunks.length} 处理失败，已保存断点。${lastError || '请稍后点击继续注入。'}`);
          return;
        }

        const saved = await saveChunkProgress_ACU(target, modeSuffix, status, i);
        if (!saved) {
          setMessage(message, 'error', `第 ${i + 1} 个分块已处理，但无法保存临时数据库条目，已停止继续导入。`);
          return;
        }
        await store.refreshStaging();
      }

      setMessage(message, 'info', '所有文本块已处理完毕，正在生成最终世界书条目...');
      const finalResult = await finalizeImportAndCleanup_ACU(target, selectedSheetKeys, modeSuffix, allChunks.length);
      if (!finalResult.success) {
        setMessage(message, 'error', finalResult.error || '最终注入失败。');
        return;
      }

      store.setWorldbookTarget('');
      setMessage(
        message,
        'success',
        finalResult.cleanedCount && finalResult.cleanedCount > 0
          ? `外部导入已完成：已注入 ${allChunks.length} 个分块，并清理 ${finalResult.cleanedCount} 个旧数据库条目。`
          : `外部导入已完成：已注入 ${allChunks.length} 个分块并解除与世界书的绑定。`,
      );
    } catch (e: any) {
      logError_ACU('[ACU-V2] injectChunks failed', e);
      setMessage(message, 'error', `外部导入失败：${e?.message || '未知错误'}`);
    } finally {
      await store.refreshStaging();
      store.setBusy(false);
    }
  }

  return {
    message,
    splitFile,
    clearStaging,
    clearImportedEntries,
    deleteImportedEntries,
    injectChunks,
  };
}
