/**
 * ApiPage 集成 — 页面结构、抽屉、下拉菜单
 *
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const STORAGE_KEY = 'acu_v2_ui_state';

function createSettings() {
  return {
    apiMode: 'custom',
    apiConfig: { url: 'https://alpha.test', apiKey: '', model: 'ma', useMainApi: false, max_tokens: 1000, temperature: 0.7 },
    tavernProfile: '',
    streamingEnabled: false,
    apiPresets: [
      {
        name: 'alpha',
        apiMode: 'custom',
        apiConfig: { url: 'https://alpha.test', apiKey: '', model: 'ma', useMainApi: false, max_tokens: 1000, temperature: 0.7 },
        tavernProfile: '',
      },
      {
        name: 'beta',
        apiMode: 'custom',
        apiConfig: { url: '', apiKey: '', model: '', useMainApi: true, max_tokens: 60000, temperature: 1 },
        tavernProfile: '',
      },
    ],
    defaultApiPresetName: 'alpha',
    apiPresetBindingsByChat: { 'chat-page': { presetName: 'beta', updatedAt: 1 } },
    tableApiPresetOverridesByName: {},
    contentOptimizationSettings: { apiPreset: '' },
  };
}

async function mountApiPage(settings = createSettings()) {
  vi.resetModules();
  document.body.innerHTML = '';
  document.head.innerHTML = '';
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ router: { activePageId: 'api' } }));
  vi.doMock('../../../src/service/runtime/state-manager', () => ({
    settings_ACU: settings,
    currentChatFileIdentifier_ACU: 'chat-page',
    getCurrentIsolationKey_ACU: () => '',
    coreApisAreReady_ACU: true,
  }));
  vi.doMock('../../../src/service/settings/settings-service', () => ({
    saveSettings_ACU: vi.fn(() => ({ saved: true, storageType: 'memory' })),
  }));
  vi.doMock('../../../src/service/ai/ai-service', () => ({
    getConnectionManagerProfiles_ACU: () => [],
    fetchAvailableModels_ACU: vi.fn(async () => ({ success: true, models: ['m1'] })),
  }));
  vi.doMock('../../../src/service/vector/vector-memory-config', () => ({
    getCurrentVectorMemoryConfig_ACU: () => ({
      embeddingEndpoint: 'https://embed.test',
      embeddingModel: 'embed-model',
      embeddingApiKey: '',
      rerankEndpoint: '',
      rerankModel: '',
      rerankApiKey: '',
    }),
    validateSummaryVectorIndexConfig_ACU: () => ({ valid: true, errors: [] }),
  }));
  const mount = await import('../../../src/presentation-v2/bootstrap/mount');
  await mount.openAcuV2App();
  return { mount, settings };
}

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('ApiPage', () => {
  it('渲染 API 页双列区域，包含 API 预设和向量配置', async () => {
    const { mount } = await mountApiPage();

    const page = document.querySelector('.acu-v2-api-page');
    expect(page).not.toBeNull();
    expect(page!.textContent).toContain('API 预设');
    expect(page!.textContent).toContain('Embedding / Rerank');
    expect(page!.textContent).not.toContain('重载');

    // Active preset shown in status line
    expect(page!.textContent).toContain('beta');
    expect(page!.textContent).toContain('流式输出');

    const apiPanel = Array.from(page!.querySelectorAll<HTMLElement>('.acu-panel'))
      .find(panel => panel.querySelector('.acu-panel__title')?.textContent?.includes('API 预设'))!;
    expect(apiPanel.querySelector('.acu-panel__actions .acu-toggle')).toBeNull();
    expect(apiPanel.querySelector('.acu-panel__body .acu-toggle')).not.toBeNull();

    // No import/export buttons (API presets are sensitive)
    expect(page!.textContent).not.toContain('导入');
    expect(page!.textContent).not.toContain('导出');

    mount.__resetAcuV2MountForTests();
  });

  it('点击管理按钮打开管理抽屉，可新建预设', async () => {
    const { mount } = await mountApiPage();

    // Find the manage button (gear icon)
    const manageButton = Array.from(document.querySelectorAll('button'))
      .find(btn => btn.getAttribute('title') === '管理预设') as HTMLButtonElement;
    expect(manageButton).not.toBeUndefined();
    manageButton.click();
    await Promise.resolve();

    // Drawer should open with manage view
    expect(document.body.textContent).toContain('管理 API 预设');

    // Should have a create button inside drawer
    const createButton = Array.from(document.querySelectorAll('button'))
      .find(btn => btn.textContent?.includes('新建预设')) as HTMLButtonElement;
    expect(createButton).not.toBeUndefined();
    createButton.click();
    await Promise.resolve();

    const drawer = document.querySelector('.acu-v2-drawer') as HTMLElement | null;
    expect(drawer).not.toBeNull();
    const footerButtons = Array.from(drawer!.querySelectorAll<HTMLButtonElement>('.acu-v2-api-drawer__actions button'));
    expect(footerButtons[0].textContent?.trim()).toBe('关闭');
    expect(footerButtons[0].classList.contains('acu-btn--default')).toBe(true);
    expect(drawer!.textContent || '').not.toContain('丢弃草稿');

    mount.__resetAcuV2MountForTests();
  });

  it('API 预设下拉可切换当前聊天并设置全局默认', async () => {
    const { mount, settings } = await mountApiPage();

    const trigger = document.querySelector('.acu-v2-api-page .acu-preset-dd__trigger') as HTMLButtonElement | null;
    expect(trigger).not.toBeNull();
    expect(trigger!.textContent).toContain('beta');

    trigger!.click();
    await Promise.resolve();
    const items = Array.from(document.querySelectorAll('.acu-v2-api-page .acu-preset-dd__item')) as HTMLElement[];
    items.find(item => item.textContent?.includes('alpha'))!.click();
    await Promise.resolve();
    expect(settings.apiPresetBindingsByChat['chat-page'].presetName).toBe('alpha');

    trigger!.click();
    await Promise.resolve();
    const stars = Array.from(document.querySelectorAll('.acu-v2-api-page .acu-preset-dd__star')) as HTMLButtonElement[];
    stars.find(star => star.closest('.acu-preset-dd__item')?.textContent?.includes('beta'))!.click();
    await Promise.resolve();
    expect(settings.defaultApiPresetName).toBe('beta');

    mount.__resetAcuV2MountForTests();
  });
});
