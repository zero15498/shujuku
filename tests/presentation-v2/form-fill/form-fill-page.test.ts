/**
 * FormFillPage 集成 — 更新参数、规则列表、提示词段、手动填表
 *
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const STORAGE_KEY = 'acu_v2_ui_state';

function createSettings() {
  return {
    autoUpdateThreshold: 3,
    autoUpdateFrequency: 2,
    updateBatchSize: 2,
    maxConcurrentGroups: 1,
    skipUpdateFloors: 0,
    retainRecentLayers: 100,
    autoUpdateTokenThreshold: 500,
    tableMaxRetries: 3,
    tableEditLastPairOnly: true,
    tableContextExtractTags: '',
    tableContextExtractRules: [{ start: '<正文>', end: '</正文>' }],
    tableContextExcludeTags: '',
    tableContextExcludeRules: [{ start: '<think>', end: '</think>' }],
    storageMode: 'native',
    apiPresets: [{ name: 'fast', apiMode: 'custom', apiConfig: { url: '', apiKey: '', model: '', useMainApi: true, max_tokens: 1000, temperature: 1 }, tavernProfile: '' }],
    defaultApiPresetName: 'fast',
    apiPresetBindingsByChat: {},
    tableApiPreset: '',
    manualSelectedTables: [],
    hasManualSelection: false,
    charCardPrompt: [
      { role: 'SYSTEM', content: '系统段', deletable: true },
      { role: 'USER', content: '主任务', mainSlot: 'A', isMain: true, deletable: false },
      { role: 'USER', content: '数据段', mainSlot: 'B', isMain2: true, deletable: false },
    ],
  } as any;
}

function createTableData() {
  return {
    sheet_a: { name: '角色状态', content: [['id'], ['1']], updateConfig: { updateFrequency: -1, skipFloors: -1 } },
    sheet_b: { name: '事件记录', content: [['id'], ['1'], ['2']], updateConfig: { updateFrequency: -1, skipFloors: -1 } },
  };
}

async function mountFormFillPage(settings = createSettings(), activePageId = 'form-fill') {
  vi.resetModules();
  document.body.innerHTML = '';
  document.head.innerHTML = '';
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ router: { activePageId } }));
  const saveSettings = vi.fn(() => ({ saved: true, storageType: 'memory' }));
  const orchestrate = vi.fn(async () => ({ success: true }));

  const worldbookConfig: any = {
    source: 'character',
    manualSelection: [],
    enabledEntries: {},
    injectionTarget: 'character',
  };

  vi.doMock('../../../src/service/runtime/state-manager', () => ({
    settings_ACU: settings,
    currentChatFileIdentifier_ACU: 'chat-form-fill',
    currentJsonTableData_ACU: createTableData(),
    getCurrentIsolationKey_ACU: () => '',
    coreApisAreReady_ACU: true,
    _set_manualExtraHint_ACU: vi.fn(),
  }));
  vi.doMock('../../../src/service/settings/settings-service', () => ({
    saveSettings_ACU: saveSettings,
    setGlobalPlotEnabled_ACU: vi.fn((enabled: boolean) => { settings.plotSettings = { ...(settings.plotSettings || {}), enabled }; }),
    setZeroTkOccupyMode_ACU: vi.fn((enabled: boolean) => { settings.zeroTkOccupyModeDefault = enabled; }),
    setSummaryVectorIndexMode_ACU: vi.fn((enabled: boolean) => { settings.summaryVectorIndexModeDefault = enabled; }),
  }));
  vi.doMock('../../../src/service/chat/chat-service', () => ({
    getChatArray_ACU: () => [
      { is_user: true, mes: 'u1' },
      { is_user: false, mes: 'a1' },
      { is_user: true, mes: 'u2' },
      { is_user: false, mes: 'a2' },
      { is_user: false, mes: 'a3' },
    ],
  }));
  vi.doMock('../../../src/service/settings/settings-readers', () => ({
    getCurrentWorldbookConfig_ACU: () => worldbookConfig,
    getCurrentCharSettings_ACU: () => ({ worldbookConfig }),
  }));
  vi.doMock('../../../src/service/table/storage-mode', () => ({
    getCurrentStorageMode: () => settings.storageMode,
  }));
  vi.doMock('../../../src/service/template/chat-scope', () => ({
    getSortedSheetKeys_ACU: (data: any) => Object.keys(data).filter(k => k.startsWith('sheet_')),
  }));
  vi.doMock('../../../src/service/template/template-preset-service', () => ({
    getActiveTemplatePresetMeta_ACU: () => ({ displayName: '默认预设', scopeLabel: '全局' }),
  }));
  vi.doMock('../../../src/service/table/table-history', () => ({
    resolveTableHistoryStateFromChat_ACU: (_chat: any[], options: any) => ({
      latestAiMessageIndex: 4,
      latestDataMessageIndex: 3,
      lastTrackedUpdateMessageIndex: options.sheetKey === 'sheet_a' ? 1 : -1,
      latestDataAiFloor: 2,
      lastTrackedUpdateAiFloor: options.sheetKey === 'sheet_a' ? 1 : 0,
      hasAnyData: true,
      hasTrackedUpdate: options.sheetKey === 'sheet_a',
    }),
  }));
  vi.doMock('../../../src/service/table/table-storage-strategy', () => ({
    reloadStorageProvider: vi.fn(async () => {}),
    switchStorageMode: vi.fn(async (mode: string) => { settings.storageMode = mode; }),
  }));
  vi.doMock('../../../src/service/table/update-orchestrator', () => ({
    orchestrateManualUpdate_ACU: orchestrate,
    processUpdatesBatch_ACU: vi.fn(async () => ({ success: true })),
    executeCardUpdateCore_ACU: vi.fn(async () => ({ success: true, modifiedKeys: [] })),
  }));
  vi.doMock('../../../src/service/ai/ai-service', () => ({
    getConnectionManagerProfiles_ACU: () => [],
    fetchAvailableModels_ACU: vi.fn(async () => ({ success: true, models: [] })),
  }));
  vi.doMock('../../../src/service/worldbook/pipeline', () => ({
    getWorldbookNames_ACU: vi.fn(async () => ['world-X', 'world-Y']),
    getLorebookEntriesByNames_ACU: vi.fn(async () => ({
      'CharBookFF': [
        { uid: 11, comment: '角色概念', name: '角色概念', enabled: true },
        { uid: 12, comment: '人物关系', name: '人物关系', enabled: true },
      ],
    })),
  }));
  vi.doMock('../../../src/service/worldbook/worldbook-service', () => ({
    getCurrentCharPrimaryLorebook_ACU: vi.fn(async () => 'CharBookFF'),
    getCharLorebooks_ACU: vi.fn(async () => ({ primary: 'CharBookFF', additional: [] })),
  }));

  vi.spyOn(window, 'confirm').mockReturnValue(false);

  const mount = await import('../../../src/presentation-v2/bootstrap/mount');
  await mount.openAcuV2App();
  await new Promise(r => setTimeout(r, 0));
  return { mount, settings, saveSettings, orchestrate, worldbookConfig };
}

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('FormFillPage', () => {
  it('渲染更新参数页的更新节奏质量门槛、标签筛选与提示词面板', async () => {
    const { mount } = await mountFormFillPage();

    const page = document.querySelector('.acu-v2-form-fill-page');
    expect(page).not.toBeNull();
    const text = page!.textContent || '';
    expect(text).toContain('更新参数');
    expect(text).toContain('数据库状态');
    expect(text).toContain('当前聊天');
    expect(text).toContain('chat-form-fill');
    expect(text).toContain('当前 AI 回复数');
    expect(text).toContain('角色状态');
    expect(text).toContain('事件记录');
    expect(text).not.toContain('就绪:角色状态');
    expect(text).not.toContain('下一次:');
    const statusStrip = page!.querySelector('.acu-v2-form-fill-page__status-strip');
    expect(statusStrip).not.toBeNull();
    expect(statusStrip!.textContent || '').toContain('3');
    expect(text).toContain('更新节奏');
    expect(text).toContain('标签筛选');
    expect(text).not.toContain('内容过滤');
    expect(text).toContain('质量门槛');
    expect(text).not.toContain('填表注入目标世界书');
    expect(text).not.toContain('填表附加世界书条目');
    expect(text).not.toContain('注入目标世界书');
    expect(text).not.toContain('附加世界书条目');
    expect(text).toContain('填表提示词');
    expect(text).toContain('已自定义提示词');
    expect(text).not.toContain('段落数量');
    expect(text).not.toContain('保存状态');
    expect(text).toContain('编辑提示词');
    const promptPanel = Array.from(page!.querySelectorAll<HTMLElement>('.acu-panel'))
      .find(panel => panel.querySelector('.acu-panel__title')?.textContent?.includes('填表提示词'))!;
    expect(promptPanel.querySelector('.acu-panel__actions .acu-badge')?.textContent).toContain('已自定义提示词');
    expect(promptPanel.querySelector('.acu-v2-form-fill-page__prompt-overview')).toBeNull();
    expect(text).toContain('手动填表');
    expect(text).toContain('填表 API 预设');
    expect(text).toContain('本次填表附加要求');
    expect(text).toContain('执行手动填表');
    expect(text).not.toContain('表格模板预设');
    expect(text).not.toContain('打开可视化表格编辑器');
    expect(text).not.toContain('立即构建交火纪要索引');
    expect(page!.querySelector('.acu-prompt-segs')).toBeNull();
    const panelTitles = Array.from(page!.querySelectorAll('.acu-v2-form-fill-page__grid > .acu-panel .acu-panel__title'))
      .map(title => (title.textContent || '').trim());
    expect(panelTitles).toEqual(['数据库状态', '更新节奏与质量门槛', '标签筛选', '填表提示词', '手动填表']);
    expect(page!.querySelector('.acu-v2-form-fill-page__panel--filter + .acu-v2-form-fill-page__panel--prompt')).not.toBeNull();
    expect(page!.querySelector('.acu-v2-form-fill-page__panel--manual')).not.toBeNull();

    mount.__resetAcuV2MountForTests();
  });

  it('每个主页面板都渲染常驻说明信息条', async () => {
    const { mount } = await mountFormFillPage();

    const panels = Array.from(document.querySelectorAll<HTMLElement>('.acu-v2-form-fill-page > .acu-v2-form-fill-page__grid > .acu-panel'));
    expect(panels.length).toBeGreaterThan(0);
    for (const panel of panels) {
      expect(panel.querySelector('.acu-panel__header .acu-info-banner')).toBeNull();
      expect(panel.querySelector('.acu-panel__body .acu-info-banner')).not.toBeNull();
    }

    mount.__resetAcuV2MountForTests();
  });

  it('修改数字字段会归一化并保存 settings', async () => {
    const { mount, settings, saveSettings } = await mountFormFillPage();

    const firstNumber = document.querySelector('.acu-v2-form-fill-page input[type="number"]') as HTMLInputElement;
    firstNumber.value = '7';
    firstNumber.dispatchEvent(new Event('change', { bubbles: true }));
    await Promise.resolve();

    expect(settings.autoUpdateThreshold).toBe(7);
    expect(saveSettings).toHaveBeenCalled();
    const promptPanel = Array.from(document.querySelectorAll<HTMLElement>('.acu-v2-form-fill-page .acu-panel'))
      .find(panel => panel.querySelector('.acu-panel__title')?.textContent?.includes('填表提示词'))!;
    expect(promptPanel.textContent || '').not.toContain('设置已保存');

    mount.__resetAcuV2MountForTests();
  });

  it('打开提示词抽屉时不显示其他面板的保存消息', async () => {
    const { mount } = await mountFormFillPage();

    const firstNumber = document.querySelector('.acu-v2-form-fill-page input[type="number"]') as HTMLInputElement;
    firstNumber.value = '8';
    firstNumber.dispatchEvent(new Event('change', { bubbles: true }));
    await Promise.resolve();

    const openButton = Array.from(document.querySelectorAll('button'))
      .find(btn => btn.textContent?.includes('编辑提示词')) as HTMLButtonElement;
    openButton.click();
    await Promise.resolve();

    const drawer = document.querySelector('.acu-v2-drawer') as HTMLElement;
    expect(drawer).not.toBeNull();
    expect(drawer.textContent || '').not.toContain('设置已保存');

    mount.__resetAcuV2MountForTests();
  });

  it('添加排除规则会写入结构化规则', async () => {
    const { mount, settings, saveSettings } = await mountFormFillPage();

    const excludePanel = Array.from(document.querySelectorAll('.acu-panel'))
      .find(panel => (panel.textContent || '').includes('排除规则')) as HTMLElement;
    // 非空规则列表默认折叠：先展开“排除规则”再点击“添加”按钮。
    const expandHeader = Array.from(excludePanel.querySelectorAll<HTMLButtonElement>('.acu-rule-pair-list__header'))
      .find(btn => (btn.textContent || '').includes('排除规则')) as HTMLButtonElement;
    expect(expandHeader).toBeDefined();
    expandHeader.click();
    await Promise.resolve();
    const excludeList = expandHeader.closest('.acu-rule-pair-list') as HTMLElement;
    const addButton = Array.from(excludePanel.querySelectorAll('button'))
      .find(btn => btn.textContent?.includes('添加排除规则')) as HTMLButtonElement;
    addButton.click();
    await Promise.resolve();

    let rows = Array.from(excludeList.querySelectorAll<HTMLElement>('.acu-rule-pair-list__row'));
    expect(rows.length).toBe(2);
    expect(settings.tableContextExcludeRules.length).toBe(1);
    expect(settings.tableContextExcludeRules[0]).toEqual({ start: '<think>', end: '</think>' });

    const inputs = rows[1].querySelectorAll<HTMLInputElement>('input');
    inputs[0].value = '<note>';
    inputs[0].dispatchEvent(new Event('input', { bubbles: true }));
    await Promise.resolve();
    expect(settings.tableContextExcludeRules.length).toBe(1);

    rows = Array.from(excludeList.querySelectorAll<HTMLElement>('.acu-rule-pair-list__row'));
    const nextInputs = rows[1].querySelectorAll<HTMLInputElement>('input');
    nextInputs[1].value = '</note>';
    nextInputs[1].dispatchEvent(new Event('input', { bubbles: true }));
    await Promise.resolve();

    expect(settings.tableContextExcludeRules).toContainEqual({ start: '<note>', end: '</note>' });
    expect(saveSettings).toHaveBeenCalled();

    mount.__resetAcuV2MountForTests();
  });

  it('提示词编辑器只在侧抽屉中出现，保存后写回 charCardPrompt', async () => {
    const { mount, settings, saveSettings } = await mountFormFillPage();

    expect(document.querySelector('.acu-v2-form-fill-page .acu-prompt-segs')).toBeNull();
    const openButton = Array.from(document.querySelectorAll('button'))
      .find(btn => btn.textContent?.includes('编辑提示词')) as HTMLButtonElement;
    openButton.click();
    await Promise.resolve();

    const drawer = document.querySelector('.acu-v2-drawer') as HTMLElement;
    expect(drawer).not.toBeNull();
    const textareas = Array.from(drawer.querySelectorAll<HTMLTextAreaElement>('.acu-prompt-segs textarea'));
    expect(textareas.length).toBeGreaterThan(0);
    textareas[0].value = '新的系统段';
    textareas[0].dispatchEvent(new Event('input', { bubbles: true }));
    await Promise.resolve();

    const saveButton = Array.from(drawer.querySelectorAll('button'))
      .find(btn => btn.textContent?.includes('保存提示词')) as HTMLButtonElement;
    expect(saveButton.disabled).toBe(false);
    saveButton.click();
    await Promise.resolve();

    expect(settings.charCardPrompt[0].content).toBe('新的系统段');
    expect(saveSettings).toHaveBeenCalled();

    mount.__resetAcuV2MountForTests();
  });

  it('关闭有未保存修改的提示词抽屉会确认', async () => {
    const { mount } = await mountFormFillPage();
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);

    const openButton = Array.from(document.querySelectorAll('button'))
      .find(btn => btn.textContent?.includes('编辑提示词')) as HTMLButtonElement;
    openButton.click();
    await Promise.resolve();

    const drawer = document.querySelector('.acu-v2-drawer') as HTMLElement;
    const textarea = drawer.querySelector<HTMLTextAreaElement>('.acu-prompt-segs textarea')!;
    textarea.value = '未保存修改';
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    await Promise.resolve();

    const closeButton = drawer.querySelector<HTMLButtonElement>('[title="关闭"]')!;
    closeButton.click();
    await Promise.resolve();

    expect(confirmSpy).toHaveBeenCalled();
    expect(document.querySelector('.acu-v2-drawer')).not.toBeNull();

    mount.__resetAcuV2MountForTests();
  });

  it('提示词抽屉有未保存修改时关闭整个 UI 会确认', async () => {
    const { mount } = await mountFormFillPage();
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);

    const openButton = Array.from(document.querySelectorAll('button'))
      .find(btn => btn.textContent?.includes('编辑提示词')) as HTMLButtonElement;
    openButton.click();
    await Promise.resolve();

    const drawer = document.querySelector('.acu-v2-drawer') as HTMLElement;
    const textarea = drawer.querySelector<HTMLTextAreaElement>('.acu-prompt-segs textarea')!;
    textarea.value = '未保存修改';
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    await Promise.resolve();

    const appClose = document.querySelector<HTMLButtonElement>('.acu-v2-app__close')!;
    appClose.click();
    await Promise.resolve();

    expect(confirmSpy).toHaveBeenCalled();
    expect(document.getElementById('acu-app-v2')!.style.display).not.toBe('none');
    expect(document.querySelector('.acu-v2-drawer')).not.toBeNull();

    mount.__resetAcuV2MountForTests();
  });

});

describe('FormFillPage · 手动填表面板', () => {
  it('渲染手动填表面板和常驻说明信息条', async () => {
    const { mount } = await mountFormFillPage();

    const page = document.querySelector('.acu-v2-form-fill-page');
    expect(page).not.toBeNull();
    const panel = Array.from(page!.querySelectorAll<HTMLElement>('.acu-v2-form-fill-page__grid > .acu-panel'))
      .find(item => item.querySelector('.acu-panel__title')?.textContent?.includes('手动填表'))!;
    const text = panel.textContent || '';
    expect(text).toContain('填表 API 预设');
    expect(text).toContain('本次填表附加要求');
    expect(text).toContain('执行手动填表');

    expect(panel.querySelector('.acu-panel__body .acu-info-banner')).not.toBeNull();

    mount.__resetAcuV2MountForTests();
  });

  it('执行手动填表会把已选表传给 service 编排', async () => {
    const { mount, orchestrate } = await mountFormFillPage();

    const button = Array.from(document.querySelectorAll('button'))
      .find(btn => btn.textContent?.includes('执行手动填表')) as HTMLButtonElement;
    expect(button).not.toBeUndefined();
    button.click();
    await new Promise(r => setTimeout(r, 0));

    expect(orchestrate).toHaveBeenCalled();
    expect(orchestrate.mock.calls[0][0]).toEqual(['sheet_a', 'sheet_b']);

    mount.__resetAcuV2MountForTests();
  });
});
