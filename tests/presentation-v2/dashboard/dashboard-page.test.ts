/**
 * DashboardPage 集成 — 数据库状态状态条、基础/高级开关、存储模式（radio）、开发者总开关
 *
 * @vitest-environment jsdom
 */
import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const STORAGE_KEY = 'acu_v2_ui_state';

function createSettings() {
  return {
    apiMode: 'custom',
    apiConfig: { url: '', apiKey: '', model: '', useMainApi: true, max_tokens: 60000, temperature: 1 },
    tavernProfile: '',
    apiPresets: [{ name: 'table-fast', apiMode: 'custom', apiConfig: { url: '', apiKey: '', model: '', useMainApi: true, max_tokens: 1000, temperature: 1 }, tavernProfile: '' }],
    defaultApiPresetName: 'table-fast',
    apiPresetBindingsByChat: {},
    tableApiPreset: '',
    tableApiPresetOverridesByName: {},
    autoUpdateEnabled: true,
    toastMuteEnabled: false,
    promptTemplateSettings: { enabled: true },
    zeroTkOccupyModeDefault: false,
    summaryVectorIndexModeDefault: false,
    autoUpdateFrequency: 2,
    skipUpdateFloors: 0,
    updateBatchSize: 2,
    manualSelectedTables: [],
    hasManualSelection: false,
    storageMode: 'native',
    contentOptimizationSettings: { apiPreset: '' },
    plotSettings: { enabled: false, plotTasks: [], promptPresets: [], plotWorldbookConfig: { worldbookName: '', enabledEntries: [] } },
    plotApiPreset: '',
    plotTaskApiPresetOverridesById: {},
  } as any;
}

function createTableData() {
  return {
    sheet_a: { name: '角色状态', content: [['id'], ['1']], updateConfig: { updateFrequency: -1, skipFloors: -1 } },
    sheet_b: { name: '事件记录', content: [['id'], ['1'], ['2']], updateConfig: { updateFrequency: 0, skipFloors: -1 } },
  };
}

async function mountDashboardPage(settings = createSettings()) {
  vi.resetModules();
  document.body.innerHTML = '';
  document.head.innerHTML = '';
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ router: { activePageId: 'dashboard' } }));

  const tableData = createTableData();
  const saveSettings = vi.fn(() => ({ saved: true, storageType: 'memory' }));

  vi.doMock('../../../src/service/runtime/state-manager', () => ({
    settings_ACU: settings,
    currentChatFileIdentifier_ACU: 'chat-dashboard',
    currentJsonTableData_ACU: tableData,
    coreApisAreReady_ACU: true,
    getCurrentIsolationKey_ACU: () => '',
  }));
  vi.doMock('../../../src/service/settings/settings-service', () => ({
    saveSettings_ACU: saveSettings,
    setGlobalPlotEnabled_ACU: vi.fn((enabled: boolean) => { settings.plotSettings.enabled = enabled; }),
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
  vi.doMock('../../../src/service/template/chat-scope', () => ({
    getSortedSheetKeys_ACU: (data: any) => Object.keys(data).filter(k => k.startsWith('sheet_')),
    getCurrentChatPlotScopeState_ACU: () => null,
    setCurrentChatPlotScopeState_ACU: vi.fn(),
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
  vi.doMock('../../../src/service/table/storage-mode', () => ({
    getCurrentStorageMode: () => settings.storageMode,
  }));
  vi.doMock('../../../src/service/table/table-storage-strategy', () => ({
    switchStorageMode: vi.fn(async (mode: string) => { settings.storageMode = mode; }),
  }));
  vi.doMock('../../../src/service/ai/ai-service', () => ({
    getConnectionManagerProfiles_ACU: () => [],
    fetchAvailableModels_ACU: vi.fn(async () => ({ success: true, models: [] })),
  }));

  vi.spyOn(window, 'confirm').mockReturnValue(false);

  const mount = await import('../../../src/presentation-v2/bootstrap/mount');
  await mount.openAcuV2App();
  await new Promise(r => setTimeout(r, 0));
  return { mount, settings, saveSettings };
}

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('DashboardPage', () => {
  it('外层双栏与其他一级页保持等宽布局', () => {
    const source = readFileSync(
      'src/presentation-v2/pages/DashboardPage.vue',
      'utf8',
    );

    expect(source).toContain('grid-template-columns: repeat(2, minmax(0, 1fr));');
    expect(source).not.toContain('grid-template-columns: minmax(0, 1.35fr) minmax(0, 1fr);');
  });

  it('默认渲染基础配置、基础开关；header 不再有 subtitle / 刷新按钮 / API 三件套', async () => {
    const { mount } = await mountDashboardPage();

    const page = document.querySelector('.acu-v2-dashboard-page');
    expect(page).not.toBeNull();
    const text = page!.textContent || '';

    // 基础配置监测项
    expect(text).toContain('基础配置');
    expect(text).toContain('API');
    expect(text).toContain('表格模板');
    expect(text).toContain('剧情推进');
    expect(text).toContain('存储模式');
    expect(text).toContain('当前使用 table-fast');
    expect(text).toContain('默认预设（全局）');
    expect(text).toContain('当前使用 原生 JSON');
    const plotItem = Array.from(page!.querySelectorAll<HTMLElement>('.acu-v2-dashboard-page__setup-item'))
      .find(item => item.querySelector('.acu-v2-dashboard-page__setup-title')?.textContent === '剧情推进');
    expect(plotItem).toBeDefined();
    expect(plotItem!.textContent || '').toContain('待配置');
    expect(plotItem!.querySelector('.acu-badge--neutral')).not.toBeNull();
    expect(plotItem!.querySelector('.acu-badge--warning')).toBeNull();
    expect(page!.querySelector('.acu-v2-dashboard-page__status-table')).toBeNull();
    expect(text).not.toContain('下一次');
    expect(text).not.toContain('事件记录');

    // 基础设置默认呈现
    expect(text).toContain('基础设置');
    expect(text).toContain('功能开关');
    expect(text).toContain('高级设置');
    expect(text).toContain('启用自动更新');
    expect(text).toContain('静默提示框');

    // 默认在基础设置视图下，功能 / 高级字段不可见
    expect(document.querySelector('button[data-acu-toggle-key="plotEnabled"]')).toBeNull();
    expect(text).not.toContain('启用条件模板功能');
    expect(text).not.toContain('启用向量混合增强交火方案');
    expect(text).not.toContain('启用开发者选项');
    // 存储模式的 radio 默认收起，只保留监测摘要
    expect(text).not.toContain('决定表格数据如何持久化');
    expect(text).not.toContain('SQLite');

    // 旧设计已删除：subtitle / 刷新按钮 / API 三件套面板 / 规范填表 toggle
    expect(text).not.toContain('数据库运行态');
    expect(text).not.toContain('当前 API');
    expect(text).not.toContain('规范填表');
    expect(document.querySelector('button[data-acu-toggle-key="standardizedTableFillEnabled"]')).toBeNull();

    mount.__resetAcuV2MountForTests();
  });

  it('基础配置未完成项使用中性视觉，不大面积占用 warning 色', () => {
    const source = readFileSync(
      'src/presentation-v2/pages/DashboardPage.vue',
      'utf8',
    );

    const pendingRule = source.match(/\.acu-v2-dashboard-page__setup-item--pending\s*\{[\s\S]*?\}/)?.[0] || '';
    expect(pendingRule).not.toContain('--acu-warning');
    expect(source).toContain(`:variant="item.complete ? 'success' : 'neutral'"`);
    expect(source).toContain(`{{ item.complete ? '已就绪' : '待配置' }}`);
  });

  it('没有 API 预设但当前 API 配置可用时，基础配置不提示未配置', async () => {
    const settings = createSettings();
    settings.apiPresets = [];
    settings.defaultApiPresetName = '';
    settings.apiPresetBindingsByChat = {};
    settings.apiMode = 'custom';
    settings.apiConfig = { url: '', apiKey: '', model: '', useMainApi: true, max_tokens: 60000, temperature: 1 };

    const { mount } = await mountDashboardPage(settings);

    const page = document.querySelector('.acu-v2-dashboard-page') as HTMLElement;
    const apiItem = Array.from(page.querySelectorAll<HTMLElement>('.acu-v2-dashboard-page__setup-item'))
      .find(item => item.querySelector('.acu-v2-dashboard-page__setup-title')?.textContent === 'API');

    expect(apiItem).toBeDefined();
    expect(apiItem!.textContent || '').toContain('当前使用 酒馆主 API');
    expect(apiItem!.textContent || '').toContain('已就绪');
    expect(apiItem!.textContent || '').not.toContain('待配置');
    expect(apiItem!.textContent || '').not.toContain('未选择 API 预设');

    mount.__resetAcuV2MountForTests();
  });

  it('修改自动填表开关会保存 settings', async () => {
    const { mount, settings, saveSettings } = await mountDashboardPage();

    const toggle = document.querySelector('button[data-acu-toggle-key="autoUpdateEnabled"]') as HTMLButtonElement;
    expect(toggle).not.toBeNull();
    expect(toggle.getAttribute('aria-checked')).toBe('true');
    toggle.click();
    await Promise.resolve();

    expect(settings.autoUpdateEnabled).toBe(false);
    expect(toggle.getAttribute('aria-checked')).toBe('false');
    expect(saveSettings).toHaveBeenCalled();

    mount.__resetAcuV2MountForTests();
  });

  it('切换到高级设置后能看到高级开关与开发者总开关', async () => {
    const { mount } = await mountDashboardPage();

    // 找到 segmented control 的"高级设置"按钮
    const segmentedButtons = Array.from(document.querySelectorAll('button[role="radio"]')) as HTMLButtonElement[];
    const advancedBtn = segmentedButtons.find(b => (b.textContent || '').trim() === '高级设置');
    expect(advancedBtn).toBeDefined();
    advancedBtn!.click();
    await new Promise(r => setTimeout(r, 0));

    const text = document.querySelector('.acu-v2-dashboard-page')?.textContent || '';
    expect(text).toContain('启用条件模板功能');
    expect(text).toContain('0TK 占用模式');
    expect(text).not.toContain('启用向量混合增强交火方案');
    expect(text).toContain('启用开发者选项');
    expect(text).not.toContain('决定表格数据如何持久化');

    mount.__resetAcuV2MountForTests();
  });

  it('基础配置面板里的存储模式默认折叠，点击调整后显示 radio', async () => {
    const { mount } = await mountDashboardPage();

    const page = document.querySelector('.acu-v2-dashboard-page') as HTMLElement;
    expect(page.textContent || '').toContain('当前使用 原生 JSON');
    expect(page.textContent || '').not.toContain('SQLite');

    const storageButton = Array.from(page.querySelectorAll('button'))
      .find(btn => (btn.textContent || '').trim() === '调整') as HTMLButtonElement;
    expect(storageButton).toBeDefined();
    storageButton.click();
    await Promise.resolve();

    const text = page.textContent || '';
    expect(text).toContain('决定表格数据如何持久化');
    expect(text).toContain('原生 JSON');
    expect(text).toContain('SQLite');

    mount.__resetAcuV2MountForTests();
  });

  it('功能开关承载剧情推进与交火模式，并控制对应一级页可见性', async () => {
    const { mount, settings } = await mountDashboardPage();

    const segmentedButtons = Array.from(document.querySelectorAll('button[role="radio"]')) as HTMLButtonElement[];
    const featureBtn = segmentedButtons.find(b => (b.textContent || '').trim() === '功能开关');
    expect(featureBtn).toBeDefined();
    featureBtn!.click();
    await new Promise(r => setTimeout(r, 0));

    let text = document.querySelector('.acu-v2-dashboard-page')?.textContent || '';
    expect(text).toContain('启用剧情推进');
    expect(text).toContain('启用向量混合增强交火方案');
    expect(text).not.toContain('启用正文替换');

    expect(document.querySelector('.acu-v2-sidebar')?.textContent || '').not.toContain('剧情推进');
    expect(document.querySelector('.acu-v2-sidebar')?.textContent || '').not.toContain('交火模式');

    const plotToggle = document.querySelector('button[data-acu-toggle-key="plotEnabled"]') as HTMLButtonElement;
    const vectorToggle = document.querySelector('button[data-acu-toggle-key="summaryVectorIndexModeEnabled"]') as HTMLButtonElement;
    expect(plotToggle).not.toBeNull();
    expect(vectorToggle).not.toBeNull();

    plotToggle.click();
    vectorToggle.click();
    await Promise.resolve();

    expect(settings.plotSettings.enabled).toBe(true);
    expect(settings.summaryVectorIndexModeDefault).toBe(true);
    text = document.querySelector('.acu-v2-sidebar')?.textContent || '';
    expect(text).toContain('剧情推进');
    expect(text).toContain('交火模式');

    mount.__resetAcuV2MountForTests();
  });

  it('正文替换开关仅在 maxRetries=49 时显示，并按自身 enabled 控制一级页可见性', async () => {
    const settings = createSettings();
    settings.plotSettings.loopSettings = { maxRetries: 49 };
    settings.contentOptimizationSettings.enabled = false;
    const { mount } = await mountDashboardPage(settings);

    const segmentedButtons = Array.from(document.querySelectorAll('button[role="radio"]')) as HTMLButtonElement[];
    const featureBtn = segmentedButtons.find(b => (b.textContent || '').trim() === '功能开关');
    expect(featureBtn).toBeDefined();
    featureBtn!.click();
    await new Promise(r => setTimeout(r, 0));

    const text = document.querySelector('.acu-v2-dashboard-page')?.textContent || '';
    expect(text).toContain('启用正文替换');
    expect(document.querySelector('.acu-v2-sidebar')?.textContent || '').not.toContain('正文替换');

    const contentToggle = document.querySelector('button[data-acu-toggle-key="contentReplaceEnabled"]') as HTMLButtonElement;
    expect(contentToggle).not.toBeNull();
    contentToggle.click();
    await Promise.resolve();

    expect(settings.contentOptimizationSettings.enabled).toBe(true);
    expect(document.querySelector('.acu-v2-sidebar')?.textContent || '').toContain('正文替换');

    mount.__resetAcuV2MountForTests();
  });

  it('开发者总开关会写入 dev-options 持久化', async () => {
    const { mount } = await mountDashboardPage();

    const segmentedButtons = Array.from(document.querySelectorAll('button[role="radio"]')) as HTMLButtonElement[];
    const advancedBtn = segmentedButtons.find(b => (b.textContent || '').trim() === '高级设置');
    advancedBtn!.click();
    await new Promise(r => setTimeout(r, 0));

    const devToggle = document.querySelector('button[data-acu-toggle-key="developerOptionsEnabled"]') as HTMLButtonElement;
    expect(devToggle).not.toBeNull();
    devToggle.click();
    await Promise.resolve();

    const persisted = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    expect(persisted?.devOptions?.developerOptionsEnabled).toBe(true);

    mount.__resetAcuV2MountForTests();
  });
});
