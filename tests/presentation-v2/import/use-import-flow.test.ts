/**
 * useImportFlow — 阶段 2 外部导入页业务流编排
 *
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

async function setup({
  charPrimary = 'CharBook',
  clearedCount = 0,
  deletedCount = 0,
}: {
  charPrimary?: string | null;
  clearedCount?: number;
  deletedCount?: number;
} = {}) {
  vi.resetModules();
  const importTempRemove = vi.fn(async () => undefined);
  const importTempSet = vi.fn(async () => undefined);
  const importTempGet = vi.fn(async () => null);
  const clearImportedEntriesCore = vi.fn(async () => ({ deletedCount: clearedCount, localCleared: true }));
  const deleteImportedEntriesCore = vi.fn(async () => deletedCount);
  const initImportDatabase = vi.fn(async (_target: string, _keys: string[], chunks: any[], selectionSig: string) => ({
    success: true,
    status: { total: chunks.length, currentIndex: 0, selectionSig },
    modeSuffix: '-Selected',
  }));
  const saveChunkProgress = vi.fn(async (_target: string, _suffix: string, status: any, index: number) => {
    status.currentIndex = index + 1;
    return true;
  });
  const finalizeImportAndCleanup = vi.fn(async () => ({ success: true, cleanedCount: 0 }));
  const executeCardUpdateCore = vi.fn(async () => ({ success: true, modifiedKeys: ['sheetA'] }));
  const getCharPrimary = vi.fn(async () => charPrimary);
  const settings: any = {
    importWorldbookTarget: 'world-A',
    importSplitSize: 100,
    importSelectedTables: ['sheetA'],
    hasImportTableSelection: true,
  };

  vi.doMock('../../../src/service/runtime/state-manager', () => ({
    settings_ACU: settings,
    currentJsonTableData_ACU: { sheetA: { name: 'A' } },
  }));
  vi.doMock('../../../src/service/settings/settings-service', () => ({ saveSettings_ACU: vi.fn() }));
  vi.doMock('../../../src/shared/idb-import-temp', () => ({
    importTempGet_ACU: importTempGet,
    importTempRemove_ACU: importTempRemove,
    importTempSet_ACU: importTempSet,
  }));
  vi.doMock('../../../src/service/import/import-executor', () => ({
    clearImportedEntriesCore_ACU: clearImportedEntriesCore,
    deleteImportedEntriesCore_ACU: deleteImportedEntriesCore,
    finalizeImportAndCleanup_ACU: finalizeImportAndCleanup,
    initImportDatabase_ACU: initImportDatabase,
    saveChunkProgress_ACU: saveChunkProgress,
  }));
  vi.doMock('../../../src/service/table/update-orchestrator', () => ({
    executeCardUpdateCore_ACU: executeCardUpdateCore,
  }));
  vi.doMock('../../../src/service/worldbook/worldbook-service', () => ({
    getCurrentCharPrimaryLorebook_ACU: getCharPrimary,
  }));
  vi.doMock('../../../src/service/template/chat-scope', () => ({
    getSortedSheetKeys_ACU: (data: any) => (data ? Object.keys(data) : []),
  }));
  vi.doMock('../../../src/shared/utils', () => ({
    parseTableTemplateJson_ACU: () => ({ sheetA: { name: 'A' } }),
    logError_ACU: vi.fn(),
    logDebug_ACU: vi.fn(),
  }));

  const [{ setActivePinia, createPinia }, { useImportFlowStore }, { useImportFlow }] = await Promise.all([
    import('pinia'),
    import('../../../src/presentation-v2/stores/import-flow-store'),
    import('../../../src/presentation-v2/composables/useImportFlow'),
  ]);
  setActivePinia(createPinia());
  const store = useImportFlowStore();
  store.refreshFromSettings();
  const flow = useImportFlow();
  return {
    flow,
    store,
    importTempRemove,
    importTempSet,
    importTempGet,
    clearImportedEntriesCore,
    deleteImportedEntriesCore,
    initImportDatabase,
    saveChunkProgress,
    finalizeImportAndCleanup,
    executeCardUpdateCore,
    getCharPrimary,
  };
}

class FakeFile {
  constructor(public name: string, public _content: string) {}
}

class FakeFileReader {
  result: string | ArrayBuffer | null = null;
  onload: ((this: FakeFileReader, ev: any) => any) | null = null;
  onerror: ((this: FakeFileReader, ev: any) => any) | null = null;
  error: any = null;
  readAsText(blob: any, _encoding?: string): void {
    setTimeout(() => {
      this.result = blob?._content ?? '';
      this.onload?.call(this, { target: this });
    }, 0);
  }
}

beforeEach(() => {
  vi.restoreAllMocks();
  // @ts-expect-error stub
  globalThis.FileReader = FakeFileReader;
});

describe('useImportFlow', () => {
  it('splitFile 按字符数拆分并写入 IndexedDB', async () => {
    const { flow, store, importTempSet, importTempRemove } = await setup();
    const content = 'x'.repeat(550); // 550 chars / 200 -> 3 chunks (200, 200, 150)
    const file: any = new FakeFile('a.txt', content);
    store.setSplitSize(200);

    await flow.splitFile(file);

    expect(importTempRemove).toHaveBeenCalled();
    expect(importTempSet).toHaveBeenCalledTimes(1);
    const [key, value] = importTempSet.mock.calls[0];
    expect(String(key)).toContain('importedTxtEntries');
    const chunks = JSON.parse(String(value));
    expect(chunks).toHaveLength(3);
    expect(chunks[0].content).toHaveLength(200);
    expect(chunks[2].content).toHaveLength(150);
    expect(flow.message.value?.kind).toBe('success');
  });

  it('clearStaging 清空所有暂存键并发出消息', async () => {
    const { flow, importTempRemove } = await setup();
    await flow.clearStaging();

    expect(importTempRemove).toHaveBeenCalledTimes(5);
    expect(flow.message.value?.kind === 'success' || flow.message.value?.kind === 'info').toBe(true);
  });

  it('clearImportedEntries 把 character sentinel 解析为角色卡主世界书', async () => {
    const { flow, store, clearImportedEntriesCore } = await setup({ charPrimary: 'CharBook', clearedCount: 7 });
    store.setWorldbookTarget('character');

    await flow.clearImportedEntries();

    expect(clearImportedEntriesCore).toHaveBeenCalledWith('CharBook');
    expect(flow.message.value?.kind).toBe('success');
    expect(flow.message.value?.text).toMatch(/7 个/);
  });

  it('deleteImportedEntries 在没有目标时报错', async () => {
    const { flow, store } = await setup();
    store.setWorldbookTarget('');

    await flow.deleteImportedEntries();

    expect(flow.message.value?.kind).toBe('error');
  });

  it('injectChunks 处理暂存分块并完成最终注入', async () => {
    const {
      flow,
      importTempGet,
      initImportDatabase,
      saveChunkProgress,
      finalizeImportAndCleanup,
      executeCardUpdateCore,
    } = await setup();
    importTempGet.mockImplementation(async (key: string) => {
      if (key.endsWith('importedTxtEntries')) {
        return JSON.stringify([{ content: '第一段' }, { content: '第二段' }]);
      }
      return null;
    });

    await flow.injectChunks();

    expect(initImportDatabase).toHaveBeenCalledWith('world-A', ['sheetA'], expect.any(Array), JSON.stringify(['sheetA']));
    expect(executeCardUpdateCore).toHaveBeenCalledTimes(2);
    expect(saveChunkProgress).toHaveBeenCalledTimes(2);
    expect(finalizeImportAndCleanup).toHaveBeenCalledWith('world-A', ['sheetA'], '-Selected', 2);
    expect(flow.message.value?.kind).toBe('success');
  });
});
