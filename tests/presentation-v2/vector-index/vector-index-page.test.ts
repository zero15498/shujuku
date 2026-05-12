/**
 * VectorIndexPage 集成 — 交火模式（向量混合增强）页骨架与立即构建动作
 *
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defaultVectorMemoryConfig_ACU } from '../../../src/shared/defaults';

const STORAGE_KEY = 'acu_v2_ui_state';

function createSettings() {
  return {
    apiMode: 'custom',
    apiConfig: { url: '', apiKey: '', model: '', useMainApi: true, max_tokens: 60000, temperature: 1 },
    tavernProfile: '',
    streamingEnabled: false,
    apiPresets: [
      { name: 'kw-cheap', apiMode: 'custom', apiConfig: { url: 'https://x', apiKey: 'k', model: 'm', useMainApi: false, max_tokens: 1000, temperature: 1 } },
    ],
    defaultApiPresetName: 'kw-cheap',
    apiPresetBindingsByChat: {},
    summaryVectorIndexModeDefault: true,
    contentOptimizationSettings: { apiPreset: '' },
    tableApiPresetOverridesByName: {},
  } as any;
}

function createConfig() {
  return {
    enabled: true,
    threshold: 50,
    archiveTriggerCount: 9,
    archiveBatchSize: 3,
    archiveMaxConcurrency: 30,
    summaryIndexArchiveMaxConcurrency: 30,
    topK: 10,
    minScore: 0.4,
    embeddingEndpoint: 'https://emb',
    embeddingApiKey: '',
    embeddingModel: 'text-embedding-3-large',
    rerankEndpoint: '',
    rerankApiKey: '',
    rerankModel: '',
    vectorNamespace: 'chat',
    entryComment: 'TavernDB-ACU-VectorMemory',
    entryKey: 'TavernDB-ACU-VectorMemory-Key',
    summaryIndexKeywordMinRows: 100,
    summaryChunkSentenceCount: 2,
    summaryPromptGroupId: 'remote-memory-archive-default',
    archiveWithoutSummary: false,
    summaryPromptGroup: [],
    keywordApiPreset: '',
    keywordContextPairCount: 1,
    keywordGenerationMaxAttempts: 3,
    keywordPromptGroup: JSON.parse(JSON.stringify(defaultVectorMemoryConfig_ACU.keywordPromptGroup)),
    recallCandidateLimit: 1000,
    recentFixedInjectCount: 50,
  };
}

async function mountVectorIndexPage(opts: {
  settings?: any,
  validation?: { valid: boolean, errors: string[] },
  archiveResult?: any,
  migrationResult?: any,
  healthReport?: any,
  devOptions?: Record<string, unknown>,
} = {}) {
  vi.resetModules();
  document.body.innerHTML = '';
  document.head.innerHTML = '';
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    router: { activePageId: 'vector-index' },
    ...(opts.devOptions ? { devOptions: opts.devOptions } : {}),
  }));

  const settings = opts.settings ?? createSettings();
  const config = createConfig();
  const validationResult = opts.validation ?? { valid: true, errors: [] };
  const archiveResult = opts.archiveResult ?? { success: true, skipped: false, indexedRowCount: 12, chunkCount: 7, errors: [] };
  const migrationResult = opts.migrationResult ?? { success: true, skipped: false, indexedRowCount: 12, chunkCount: 7, errors: [] };
  const healthReport = opts.healthReport ?? { legacyManifestCount: 0, issues: [] };

  const saveSettings = vi.fn(() => ({ saved: true, storageType: 'memory' }));
  const archiveSummary = vi.fn(async () => archiveResult);
  const migrateLegacy = vi.fn(async () => migrationResult);
  const loadOrCreate = vi.fn(async () => ({ ok: true }));
  const saveIndependent = vi.fn(async () => ({ ok: true }));
  const updateLorebook = vi.fn(async () => true);
  const getLastIndex = vi.fn(() => 5);
  const clearCache = vi.fn(async () => undefined);
  const deleteIndex = vi.fn(async () => true);
  const getStats = vi.fn(async () => ({
    status: 'ready',
    indexId: 'idx-1',
    backend: 'st-files',
    rowCount: 1,
    chunkCount: 2,
    baseShardCount: 1,
    deltaShardCount: 0,
    tombstoneRowCount: 0,
    tombstoneChunkCount: 0,
    externalTotalBytes: 2048,
    cacheTotalBytes: 128,
    flushTaskDirtyCount: 0,
    flushTaskQueuedCount: 0,
    flushTaskFlushingCount: 0,
    flushTaskFailedCount: 0,
    updatedAt: '2026-05-08T12:00:00.000Z',
  }));
  const inspectHealth = vi.fn(async () => healthReport);

  vi.doMock('../../../src/service/runtime/state-manager', () => ({
    settings_ACU: settings,
    currentChatFileIdentifier_ACU: 'chat-vector',
    currentJsonTableData_ACU: {
      sheet_summary: { name: '纪要表', content: [['id', 'summary'], ['1', 'r1']] },
    },
    getCurrentIsolationKey_ACU: () => '',
    coreApisAreReady_ACU: true,
  }));
  vi.doMock('../../../src/service/settings/settings-service', () => ({
    saveSettings_ACU: saveSettings,
  }));
  vi.doMock('../../../src/service/ai/ai-service', () => ({
    getConnectionManagerProfiles_ACU: () => [],
    fetchAvailableModels_ACU: vi.fn(async () => ({ success: true, models: [] })),
  }));
  vi.doMock('../../../src/service/vector/vector-memory-config', () => ({
    getCurrentVectorMemoryConfig_ACU: () => config,
    patchCurrentVectorMemoryConfig_ACU: (patch: Record<string, any>) => {
      Object.assign(config, patch);
      return config;
    },
    validateSummaryVectorIndexConfig_ACU: () => validationResult,
  }));
  vi.doMock('../../../src/service/vector/summary-vector-index-archive-service', () => ({
    archiveSummaryVectorIndexNow_ACU: archiveSummary,
    migrateLegacySummaryVectorIndexToContentAddressed_ACU: migrateLegacy,
  }));
  vi.doMock('../../../src/service/table/table-service', () => ({
    loadOrCreateJsonTableFromChatHistory_ACU: loadOrCreate,
    saveIndependentTableToChatHistory_ACU: saveIndependent,
  }));
  vi.doMock('../../../src/service/chat/chat-service', () => ({
    getLastMessageIndex_ACU: getLastIndex,
    getChatArray_ACU: vi.fn(() => [{ is_user: false, mes: 'ai', mesId: 'm1' }]),
  }));
  vi.doMock('../../../src/service/worldbook/pipeline', () => ({
    updateReadableLorebookEntry_ACU: updateLorebook,
  }));
  vi.doMock('../../../src/service/vector/summary-vector-index-state-service', () => ({
    getLatestSummaryVectorIndexSnapshotState_ACU: vi.fn(() => ({
      summaryVectorIndexState: {
        manifest: { status: 'ready', indexId: 'idx-1' },
        rows: [{ rowKey: 'r1', status: 'active' }],
        chunks: [],
      },
      layers: [],
    })),
  }));
  vi.doMock('../../../src/service/vector/summary-vector-index-storage-service', () => ({
    getSummaryVectorIndexStats_ACU: getStats,
    inspectSummaryVectorIndexHealth_ACU: inspectHealth,
  }));
  vi.doMock('../../../src/service/vector/summary-vector-index-cache-service', () => ({
    tryRecoverSummaryVectorIndexFromExternalSnapshot_ACU: vi.fn(async () => false),
    clearSummaryVectorIndexTempCache_ACU: clearCache,
    deleteCurrentSummaryVectorIndexForCurrentChat_ACU: deleteIndex,
  }));

  const mount = await import('../../../src/presentation-v2/bootstrap/mount');
  await mount.openAcuV2App();
  await new Promise(r => setTimeout(r, 0));

  return { mount, settings, config, saveSettings, archiveSummary, migrateLegacy, inspectHealth, loadOrCreate, saveIndependent, updateLorebook, clearCache, deleteIndex, getStats };
}

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('VectorIndexPage', () => {
  it('渲染交火模式页骨架，包含核心面板', async () => {
    const { mount, getStats } = await mountVectorIndexPage();

    const page = document.querySelector('.acu-v2-vector-index-page');
    expect(page).not.toBeNull();
    const text = page!.textContent || '';
    expect(text).toContain('交火模式');
    expect(text).toContain('索引状态与维护');
    expect(text).not.toContain('向量服务引用');
    expect(text).not.toContain('Embedding 服务');
    expect(text).not.toContain('Rerank 服务（可选）');
    expect(text).not.toContain('召回参数');
    expect(text).not.toContain('归档与分块');
    expect(text).toContain('关键词生成');
    expect(text).toContain('关键词生成提示词');
    expect(text).toContain('使用默认提示词');
    expect(text).not.toContain('刷新状态');
    expect(text).not.toContain('段落数量');
    expect(text).not.toContain('保存状态');
    expect(getStats).toHaveBeenCalled();

    const maintenancePanel = Array.from(page!.querySelectorAll<HTMLElement>('.acu-panel'))
      .find(panel => panel.querySelector('.acu-panel__title')?.textContent?.includes('索引状态与维护'))!;
    const actionButtons = Array.from(maintenancePanel.querySelectorAll<HTMLButtonElement>('.acu-v2-vector-index-page__actions button'))
      .map(button => button.textContent?.trim() || '');
    expect(actionButtons).toEqual([
      '立即构建交火纪要索引',
      '非破坏迁移旧索引',
      '清空临时缓存',
      '删除当前索引',
    ]);
    expect(actionButtons.some(label => label.includes('刷新状态'))).toBe(false);
    const clearButton = Array.from(maintenancePanel.querySelectorAll<HTMLButtonElement>('.acu-v2-vector-index-page__actions button'))
      .find(button => button.textContent?.includes('清空临时缓存'))!;
    expect(clearButton.classList.contains('acu-btn--default')).toBe(true);

    const promptPanel = Array.from(page!.querySelectorAll<HTMLElement>('.acu-panel'))
      .find(panel => panel.querySelector('.acu-panel__title')?.textContent?.includes('关键词生成提示词'))!;
    expect(promptPanel.querySelector('.acu-panel__actions .acu-badge')?.textContent).toContain('使用默认提示词');
    expect(promptPanel.querySelector('.acu-v2-vector-index-page__prompt-overview')).toBeNull();

    mount.__resetAcuV2MountForTests();
  });

  it('默认关键词提示词切换页面后仍显示默认 badge', async () => {
    const { mount, config } = await mountVectorIndexPage();

    expect(document.querySelector('.acu-v2-vector-index-page')?.textContent || '').toContain('使用默认提示词');

    const { useRouterStore } = await import('../../../src/presentation-v2/stores/router-store');
    useRouterStore().setActivePage('dashboard');
    await new Promise(r => setTimeout(r, 0));

    config.keywordPromptGroup = config.keywordPromptGroup.map((segment: any) => ({
      ...segment,
      content: typeof segment.content === 'string' ? segment.content.trim() : segment.content,
    }));

    useRouterStore().setActivePage('vector-index');
    await new Promise(r => setTimeout(r, 0));

    const textAfterReturn = document.querySelector('.acu-v2-vector-index-page')?.textContent || '';
    expect(textAfterReturn).toContain('使用默认提示词');
    expect(textAfterReturn).not.toContain('已自定义提示词');

    mount.__resetAcuV2MountForTests();
  });

  it('开发者选项开启后显示交火高级索引参数面板', async () => {
    const { mount } = await mountVectorIndexPage({ devOptions: { vectorIndexAdvanced: true } });

    const text = document.querySelector('.acu-v2-vector-index-page')?.textContent || '';
    expect(text).toContain('召回参数');
    expect(text).toContain('归档与分块');
    expect(text).toContain('发送前交火触发阈值');
    expect(text).toContain('每批归档行数');

    mount.__resetAcuV2MountForTests();
  });

  it('每个面板都渲染常驻说明信息条', async () => {
    const { mount } = await mountVectorIndexPage();

    const panels = document.querySelectorAll('.acu-v2-vector-index-page .acu-panel');
    expect(panels.length).toBeGreaterThanOrEqual(3);
    panels.forEach(panel => {
      expect(panel.querySelector('.acu-panel__body .acu-info-banner')).not.toBeNull();
      expect(panel.querySelector('.acu-panel__header .acu-info-banner')).toBeNull();
    });

    mount.__resetAcuV2MountForTests();
  });

  it('header 不放触发按钮或 toggle（仅标题）', async () => {
    const { mount } = await mountVectorIndexPage();

    const header = document.querySelector('.acu-v2-vector-index-page .acu-page-header');
    expect(header).not.toBeNull();
    expect(header!.querySelector('button')).toBeNull();
    expect(header!.querySelector('.acu-toggle')).toBeNull();

    mount.__resetAcuV2MountForTests();
  });

  it('立即构建按钮触发归档流程并显示成功消息', async () => {
    const { mount, archiveSummary, saveIndependent, updateLorebook } = await mountVectorIndexPage();

    const buildButton = Array.from(document.querySelectorAll('button'))
      .find(b => /立即构建交火纪要索引/.test(b.textContent || '')) as HTMLButtonElement | undefined;
    expect(buildButton).not.toBeUndefined();

    buildButton!.click();
    await new Promise(r => setTimeout(r, 0));
    await new Promise(r => setTimeout(r, 0));

    expect(archiveSummary).toHaveBeenCalledTimes(1);
    expect(archiveSummary).toHaveBeenCalledWith({ mode: 'sync' });
    expect(saveIndependent).toHaveBeenCalledTimes(1);
    expect(updateLorebook).toHaveBeenCalledTimes(1);

    const text = document.body.textContent || '';
    expect(text).toMatch(/交火索引快照重建完成/);

    mount.__resetAcuV2MountForTests();
  });

  it('非破坏迁移旧索引按钮只在检测到旧 manifest 后执行迁移', async () => {
    const { mount, inspectHealth, migrateLegacy } = await mountVectorIndexPage({
      healthReport: { legacyManifestCount: 1, issues: [] },
      migrationResult: { success: true, skipped: false, indexedRowCount: 8, chunkCount: 4, errors: [] },
    });

    const migrateButton = Array.from(document.querySelectorAll('button'))
      .find(b => /非破坏迁移旧索引/.test(b.textContent || '')) as HTMLButtonElement | undefined;
    expect(migrateButton).not.toBeUndefined();

    migrateButton!.click();
    await new Promise(r => setTimeout(r, 0));
    await new Promise(r => setTimeout(r, 0));

    expect(inspectHealth).toHaveBeenCalledTimes(1);
    expect(migrateLegacy).toHaveBeenCalledTimes(1);
    expect(document.body.textContent || '').toContain('旧交火索引非破坏迁移完成：8 行，4 个 chunks');

    mount.__resetAcuV2MountForTests();
  });

  it('没有旧 manifest 时非破坏迁移按钮不写入新索引', async () => {
    const { mount, inspectHealth, migrateLegacy } = await mountVectorIndexPage({
      healthReport: { legacyManifestCount: 0, issues: [] },
    });

    const migrateButton = Array.from(document.querySelectorAll('button'))
      .find(b => /非破坏迁移旧索引/.test(b.textContent || '')) as HTMLButtonElement | undefined;
    expect(migrateButton).not.toBeUndefined();

    migrateButton!.click();
    await new Promise(r => setTimeout(r, 0));

    expect(inspectHealth).toHaveBeenCalledTimes(1);
    expect(migrateLegacy).not.toHaveBeenCalled();
    expect(document.body.textContent || '').toContain('当前没有可迁移的旧交火索引');

    mount.__resetAcuV2MountForTests();
  });

  it('校验失败时渲染顶部 warning banner', async () => {
    const { mount } = await mountVectorIndexPage({
      validation: { valid: false, errors: ['缺少 embeddingModel'] },
    });

    const warning = Array.from(document.querySelectorAll('.acu-info-banner'))
      .find(el => /配置不完整/.test(el.textContent || ''));
    expect(warning).not.toBeUndefined();
    expect(warning!.textContent).toContain('缺少 embeddingModel');
    const apiButton = Array.from(warning!.querySelectorAll('button'))
      .find(btn => btn.textContent?.includes('去 API 页配置')) as HTMLButtonElement | undefined;
    expect(apiButton).not.toBeUndefined();

    apiButton!.click();
    await new Promise(r => setTimeout(r, 0));

    const persisted = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    expect(persisted?.router?.activePageId).toBe('api');

    mount.__resetAcuV2MountForTests();
  });

  it('交火页不再渲染向量服务引用面板或 Embedding / Rerank 配置明细', async () => {
    const { mount, config, saveSettings } = await mountVectorIndexPage();

    const text = document.querySelector('.acu-v2-vector-index-page')?.textContent || '';
    expect(text).not.toContain('向量服务引用');
    expect(text).not.toContain('Embedding Endpoint');
    expect(text).not.toContain('Embedding Model');
    expect(text).not.toContain('text-embedding-3-large');
    expect(document.querySelector('.acu-v2-vector-index-page .acu-stats code')).toBeNull();

    const inputs = Array.from(document.querySelectorAll('.acu-v2-vector-index-page input')) as HTMLInputElement[];
    expect(inputs.some(i => i.placeholder?.includes('embeddings'))).toBe(false);

    expect(config.embeddingEndpoint).toBe('https://emb');
    expect(saveSettings).not.toHaveBeenCalled();

    mount.__resetAcuV2MountForTests();
  });

  it('关键词提示词编辑器只在侧抽屉中出现，保存后写回配置', async () => {
    const { mount, config, saveSettings } = await mountVectorIndexPage();

    expect(document.querySelector('.acu-v2-vector-index-page .acu-prompt-segs')).toBeNull();

    const editButton = Array.from(document.querySelectorAll('button'))
      .find(btn => btn.textContent?.includes('编辑提示词')) as HTMLButtonElement | undefined;
    expect(editButton).not.toBeUndefined();
    editButton!.click();
    await new Promise(r => setTimeout(r, 0));

    const drawer = document.querySelector('.acu-v2-drawer') as HTMLElement | null;
    expect(drawer).not.toBeNull();
    const textarea = drawer!.querySelector<HTMLTextAreaElement>('.acu-prompt-segs textarea');
    expect(textarea).not.toBeNull();
    textarea!.value = '新的关键词系统提示';
    textarea!.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise(r => setTimeout(r, 0));

    const saveButton = Array.from(drawer!.querySelectorAll('button'))
      .find(btn => btn.textContent?.includes('保存提示词')) as HTMLButtonElement | undefined;
    expect(saveButton).not.toBeUndefined();
    saveButton!.click();
    await new Promise(r => setTimeout(r, 0));

    expect(config.keywordPromptGroup[0].content).toBe('新的关键词系统提示');
    expect(saveSettings).toHaveBeenCalled();

    mount.__resetAcuV2MountForTests();
  });

  it('关键词提示词抽屉有未保存修改时关闭整个 UI 会确认', async () => {
    const { mount } = await mountVectorIndexPage();
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);

    const editButton = Array.from(document.querySelectorAll('button'))
      .find(btn => btn.textContent?.includes('编辑提示词')) as HTMLButtonElement | undefined;
    expect(editButton).not.toBeUndefined();
    editButton!.click();
    await new Promise(r => setTimeout(r, 0));

    const drawer = document.querySelector('.acu-v2-drawer') as HTMLElement | null;
    expect(drawer).not.toBeNull();
    const textarea = drawer!.querySelector<HTMLTextAreaElement>('.acu-prompt-segs textarea');
    expect(textarea).not.toBeNull();
    textarea!.value = '未保存关键词提示';
    textarea!.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise(r => setTimeout(r, 0));

    const appClose = document.querySelector<HTMLButtonElement>('.acu-v2-app__close');
    expect(appClose).not.toBeNull();
    appClose!.click();
    await new Promise(r => setTimeout(r, 0));

    expect(confirmSpy).toHaveBeenCalled();
    expect(document.getElementById('acu-app-v2')!.style.display).not.toBe('none');
    expect(document.querySelector('.acu-v2-drawer')).not.toBeNull();

    mount.__resetAcuV2MountForTests();
  });

  it('最近固定注入条数允许保存为 0', async () => {
    const { mount, config, saveSettings } = await mountVectorIndexPage({ devOptions: { vectorIndexAdvanced: true } });

    const row = Array.from(document.querySelectorAll('.acu-v2-vector-index-page .acu-form-row'))
      .find(el => /最近固定注入条数/.test(el.textContent || ''));
    const input = row?.querySelector('input') as HTMLInputElement | null;
    expect(input).not.toBeNull();

    input!.value = '0';
    input!.dispatchEvent(new Event('change', { bubbles: true }));
    await new Promise(r => setTimeout(r, 0));

    expect(config.recentFixedInjectCount).toBe(0);
    expect(saveSettings).toHaveBeenCalled();

    mount.__resetAcuV2MountForTests();
  });

  it('每批归档行数写入交火索引实际读取的 summaryIndexArchiveMaxConcurrency 字段', async () => {
    const { mount, config, saveSettings } = await mountVectorIndexPage({ devOptions: { vectorIndexAdvanced: true } });

    const row = Array.from(document.querySelectorAll('.acu-v2-vector-index-page .acu-form-row'))
      .find(el => /每批归档行数/.test(el.textContent || ''));
    const input = row?.querySelector('input') as HTMLInputElement | null;
    expect(input).not.toBeNull();

    input!.value = '42';
    input!.dispatchEvent(new Event('change', { bubbles: true }));
    await new Promise(r => setTimeout(r, 0));

    expect(config.summaryIndexArchiveMaxConcurrency).toBe(42);
    expect(config.archiveMaxConcurrency).toBe(30);
    expect(saveSettings).toHaveBeenCalled();

    mount.__resetAcuV2MountForTests();
  });
});
