/**
 * DataMgmtPage 集成 — 数据管理页结构与关键动作
 *
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const STORAGE_KEY = 'acu_v2_ui_state';

function createSettings() {
  return {
    dataIsolationEnabled: true,
    dataIsolationCode: 'alpha',
    deleteStartFloor: 1,
    deleteEndFloor: null,
    charCardPrompt: [{ role: 'system', content: 'prompt' }],
    mergeSummaryPrompt: 'merge prompt',
    mergeTargetCount: 1,
    mergeBatchSize: 5,
    mergeStartIndex: 1,
    mergeEndIndex: null,
    autoMergeEnabled: false,
    autoMergeThreshold: 20,
    autoMergeReserve: 0,
    apiPresets: [],
    defaultApiPresetName: '',
    apiPresetBindingsByChat: {},
    contentOptimizationSettings: { apiPreset: '' },
    tableApiPresetOverridesByName: {},
  } as any;
}

async function mountDataMgmtPage() {
  vi.resetModules();
  document.body.innerHTML = '';
  document.head.innerHTML = '';
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ router: { activePageId: 'data-mgmt' } }));

  const settings = createSettings();
  const saveSettings = vi.fn(() => ({ saved: true, storageType: 'memory' }));
  const switchIsolation = vi.fn(async (code: string) => {
    settings.dataIsolationCode = code;
    settings.dataIsolationEnabled = !!code;
  });
  const removeHistory = vi.fn();
  const deleteGenerated = vi.fn(async () => undefined);
  const deleteLocalData = vi.fn(async () => 2);
  const cleanupWorldbook = vi.fn(async () => 1);
  const overrideLatest = vi.fn(async () => 3);
  const loadOrCreate = vi.fn(async () => ({ ok: true }));
  const refreshMerged = vi.fn(async () => ({ ok: true }));
  const applyTemplate = vi.fn(async () => ({ templateStr: '{}', templateObj: {} }));

  vi.stubGlobal('URL', {
    createObjectURL: vi.fn(() => 'blob:acu-test'),
    revokeObjectURL: vi.fn(),
  });
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);

  vi.doMock('../../../src/service/runtime/state-manager', () => ({
    settings_ACU: settings,
    currentChatFileIdentifier_ACU: 'chat-data',
    currentJsonTableData_ACU: {
      mate: { type: 'chatSheets' },
      sheet_a: { name: 'A', content: [['h']], sourceData: {} },
      sheet_b: { name: 'B', content: [['h']], sourceData: {} },
    },
    getCurrentIsolationKey_ACU: () => settings.dataIsolationCode || '',
    coreApisAreReady_ACU: true,
  }));
  vi.doMock('../../../src/service/settings/settings-service', () => ({
    getDataIsolationHistory_ACU: () => ['alpha', 'beta'],
    removeDataIsolationHistory_ACU: removeHistory,
    saveSettings_ACU: saveSettings,
    switchIsolationProfile_ACU: switchIsolation,
    applyCombinedSettingsImport_ACU: vi.fn(() => ['charCardPrompt']),
  }));
  vi.doMock('../../../src/service/chat/chat-service', () => ({
    getChatArray_ACU: () => [
      { is_user: true, mes: 'u' },
      { is_user: false, TavernDB_ACU_IsolatedData: { alpha: {} } },
      { is_user: false, TavernDB_ACU_IsolatedData: { alpha: {} } },
    ],
    deleteLocalDataInChatCore_ACU: deleteLocalData,
    overrideLatestLayerWithTemplateCore_ACU: overrideLatest,
  }));
  vi.doMock('../../../src/service/table/table-service', () => ({
    loadOrCreateJsonTableFromChatHistory_ACU: loadOrCreate,
  }));
  vi.doMock('../../../src/service/worldbook/worldbook-cleanup', () => ({
    cleanupWorldbookEntriesAfterDataDeletion_ACU: cleanupWorldbook,
  }));
  vi.doMock('../../../src/service/worldbook/pipeline', () => ({
    deleteAllGeneratedEntries_ACU: deleteGenerated,
    refreshMergedDataAndNotify_ACU: refreshMerged,
  }));
  vi.doMock('../../../src/service/template/template-preset-service', () => ({
    applyTemplateSnapshotToScope_ACU: applyTemplate,
    getDefaultTemplateSnapshot_ACU: () => ({
      templateStr: JSON.stringify({
        mate: { type: 'chatSheets' },
        sheet_a: { name: 'A', content: [['h']], sourceData: {} },
      }),
      templateObj: {
        mate: { type: 'chatSheets' },
        sheet_a: { name: 'A', content: [['h']], sourceData: {} },
      },
    }),
  }));
  vi.doMock('../../../src/service/table/storage-mode', () => ({
    isSqliteMode: () => false,
  }));

  const mount = await import('../../../src/presentation-v2/bootstrap/mount');
  await mount.openAcuV2App();
  await new Promise(r => setTimeout(r, 0));

  return {
    mount,
    settings,
    saveSettings,
    switchIsolation,
    removeHistory,
    deleteGenerated,
    deleteLocalData,
    cleanupWorldbook,
    overrideLatest,
    loadOrCreate,
    refreshMerged,
    applyTemplate,
  };
}

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('DataMgmtPage', () => {
  it('渲染数据管理页三个面板，不包含交火模式索引管理', async () => {
    const { mount } = await mountDataMgmtPage();

    const page = document.querySelector('.acu-v2-data-mgmt-page');
    expect(page).not.toBeNull();
    const text = page!.textContent || '';
    expect(text).toContain('数据管理');
    expect(text).toContain('数据隔离');
    expect(text).toContain('备份与恢复');
    expect(text).toContain('删除与清理');
    expect(text).not.toContain('交火模式索引管理');
    expect(text).not.toContain('删除当前交火索引');
    expect(text).not.toContain('清空临时缓存');

    mount.__resetAcuV2MountForTests();
  });

  it('每个面板都渲染常驻说明信息条', async () => {
    const { mount } = await mountDataMgmtPage();

    const panels = document.querySelectorAll('.acu-v2-data-mgmt-page .acu-panel');
    expect(panels.length).toBe(3);
    panels.forEach(panel => {
      expect(panel.querySelector('.acu-panel__body .acu-info-banner')).not.toBeNull();
      expect(panel.querySelector('.acu-panel__header .acu-info-banner')).toBeNull();
    });

    mount.__resetAcuV2MountForTests();
  });

  it('只有数据隔离面板使用统计列表，删除与清理使用紧凑元信息', async () => {
    const { mount } = await mountDataMgmtPage();

    const panels = Array.from(document.querySelectorAll<HTMLElement>('.acu-v2-data-mgmt-page .acu-panel'));
    const isolationPanel = panels.find(el => el.querySelector('.acu-panel__title')?.textContent?.includes('数据隔离'));
    const backupPanel = panels.find(el => el.querySelector('.acu-panel__title')?.textContent?.includes('备份与恢复'));
    const cleanupPanel = panels.find(el => el.querySelector('.acu-panel__title')?.textContent?.includes('删除与清理'));

    expect(isolationPanel?.querySelector('.acu-stats')).not.toBeNull();
    expect(backupPanel?.querySelector('.acu-stats')).toBeNull();
    expect(cleanupPanel?.querySelector('.acu-stats')).toBeNull();
    expect(backupPanel?.querySelector('.acu-v2-data-mgmt-page__meta')).toBeNull();
    expect(cleanupPanel?.querySelector('.acu-v2-data-mgmt-page__meta')?.textContent).toContain('当前聊天 2 个 AI 楼层');

    mount.__resetAcuV2MountForTests();
  });

  it('header 不放触发按钮或 toggle', async () => {
    const { mount } = await mountDataMgmtPage();

    const header = document.querySelector('.acu-v2-data-mgmt-page .acu-page-header');
    expect(header).not.toBeNull();
    expect(header!.querySelector('button')).toBeNull();
    expect(header!.querySelector('.acu-toggle')).toBeNull();

    mount.__resetAcuV2MountForTests();
  });

  it('历史标识选择后保存并应用会切换隔离 profile', async () => {
    const { mount, switchIsolation } = await mountDataMgmtPage();

    const select = document.querySelector('.acu-v2-data-mgmt-page .acu-select') as HTMLElement;
    expect(select).not.toBeNull();
    select.querySelector<HTMLButtonElement>('.acu-select__trigger')!.click();
    await new Promise(r => setTimeout(r, 0));
    const beta = Array.from(select.querySelectorAll<HTMLElement>('.acu-select__item'))
      .find(item => item.textContent?.trim() === 'beta');
    expect(beta).not.toBeUndefined();
    beta!.click();
    await new Promise(r => setTimeout(r, 0));

    const applyButton = Array.from(document.querySelectorAll<HTMLButtonElement>('button'))
      .find(button => button.textContent?.includes('保存并应用'));
    expect(applyButton).not.toBeUndefined();
    applyButton!.click();
    await new Promise(r => setTimeout(r, 0));

    expect(switchIsolation).toHaveBeenCalledWith('beta');

    mount.__resetAcuV2MountForTests();
  });

  it('删除当前标识本地数据会保存范围并调用清理链路', async () => {
    const { mount, deleteLocalData, cleanupWorldbook, loadOrCreate, refreshMerged, saveSettings } = await mountDataMgmtPage();
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    const deleteButton = Array.from(document.querySelectorAll<HTMLButtonElement>('button'))
      .find(button => button.textContent?.includes('删除当前标识本地数据'));
    expect(deleteButton).not.toBeUndefined();
    deleteButton!.click();
    await new Promise(r => setTimeout(r, 0));
    await new Promise(r => setTimeout(r, 0));

    expect(saveSettings).toHaveBeenCalled();
    expect(deleteLocalData).toHaveBeenCalledWith('current', 1, null);
    expect(loadOrCreate).toHaveBeenCalled();
    expect(refreshMerged).toHaveBeenCalled();
    expect(cleanupWorldbook).toHaveBeenCalled();
    expect(document.body.textContent || '').toContain('已删除 2 条消息中的本地数据');

    mount.__resetAcuV2MountForTests();
  });

  it('备份与恢复面板导出合并配置和 JSON 数据使用普通按钮', async () => {
    const { mount } = await mountDataMgmtPage();

    const panel = Array.from(document.querySelectorAll<HTMLElement>('.acu-v2-data-mgmt-page .acu-panel'))
      .find(el => el.querySelector('.acu-panel__title')?.textContent?.includes('备份与恢复'));
    expect(panel).not.toBeUndefined();

    const buttons = Array.from(panel!.querySelectorAll<HTMLButtonElement>('button'));
    expect(panel!.querySelector('.acu-v2-data-mgmt-page__backup-actions')).not.toBeNull();
    const labels = buttons.map(button => button.textContent?.trim() || '');
    expect(labels).toEqual([
      '合并导入（模板+指令）',
      '合并导出（模板+指令）',
      '导出 JSON 数据',
      '模板覆盖最新层数据',
    ]);
    expect(buttons.find(button => button.textContent?.includes('导出 JSON 数据'))?.classList.contains('acu-btn--default')).toBe(true);
    expect(buttons.find(button => button.textContent?.includes('模板覆盖最新层数据'))?.classList.contains('acu-btn--default')).toBe(true);

    mount.__resetAcuV2MountForTests();
  });

  it('全页只保留删除所有本地数据为红色危险按钮', async () => {
    const { mount } = await mountDataMgmtPage();

    const dangerButtons = Array.from(document.querySelectorAll<HTMLButtonElement>('.acu-v2-data-mgmt-page button.acu-btn--danger'));
    expect(dangerButtons.map(button => button.textContent?.trim())).toEqual(['删除所有本地数据']);

    mount.__resetAcuV2MountForTests();
  });
});
