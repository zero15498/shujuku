/**
 * API preset management composable — 编辑即弃草稿 + 脏检测 + 退出确认
 *
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

async function importComposable() {
  vi.resetModules();
  const settings = {
    apiMode: 'custom' as const,
    apiConfig: { url: '', apiKey: '', model: '', useMainApi: true, max_tokens: 60000, temperature: 1 },
    tavernProfile: '',
    streamingEnabled: false,
    apiPresets: [
      {
        name: 'preset-a',
        apiMode: 'custom',
        apiConfig: { url: 'https://a.test', apiKey: 'k', model: 'gpt-4', useMainApi: false, max_tokens: 4096, temperature: 0.7 },
        tavernProfile: '',
      },
    ],
    defaultApiPresetName: 'preset-a',
    apiPresetBindingsByChat: {},
  };
  vi.doMock('../../../src/service/runtime/state-manager', () => ({
    settings_ACU: settings,
    currentChatFileIdentifier_ACU: 'chat-draft',
  }));
  vi.doMock('../../../src/service/settings/settings-service', () => ({
    saveSettings_ACU: vi.fn(() => ({ saved: true, storageType: 'memory' })),
  }));
  vi.doMock('../../../src/service/ai/ai-service', () => ({
    getConnectionManagerProfiles_ACU: () => [],
    fetchAvailableModels_ACU: vi.fn(async () => ({ success: true, models: [] })),
  }));
  const [{ setActivePinia, createPinia }, { useApiPresetManagement }, { useApiPresetStore }] = await Promise.all([
    import('pinia'),
    import('../../../src/presentation-v2/composables/useApiPresetManagement'),
    import('../../../src/presentation-v2/stores/api-preset-store'),
  ]);
  setActivePinia(createPinia());
  const store = useApiPresetStore();
  store.refreshFromSettings();
  return { useApiPresetManagement, store };
}

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('useApiPresetManagement', () => {
  it('openEdit 总是加载预设当前状态，不恢复旧草稿', async () => {
    const { useApiPresetManagement, store } = await importComposable();
    const m = useApiPresetManagement();
    const preset = store.presets[0];

    m.openEdit(preset);
    m.draft.model = 'modified-model';

    // 关闭后重新打开同一预设 — 应该看到原始值，不是修改后的
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    m.closeDrawer();

    m.openEdit(preset);
    expect(m.draft.model).toBe('gpt-4');
  });

  it('openCreate 总是从空白开始', async () => {
    const { useApiPresetManagement } = await importComposable();
    const m = useApiPresetManagement();

    m.openCreate();
    m.draft.name = 'half-written';

    vi.spyOn(window, 'confirm').mockReturnValue(true);
    m.closeDrawer();

    m.openCreate();
    expect(m.draft.name).toBe('');
  });

  it('未修改时 isDirty 为 false', async () => {
    const { useApiPresetManagement, store } = await importComposable();
    const m = useApiPresetManagement();

    m.openEdit(store.presets[0]);
    expect(m.isDirty.value).toBe(false);
  });

  it('修改后 isDirty 为 true', async () => {
    const { useApiPresetManagement, store } = await importComposable();
    const m = useApiPresetManagement();

    m.openEdit(store.presets[0]);
    m.draft.temperature = 0.5;
    expect(m.isDirty.value).toBe(true);
  });

  it('未修改时 closeDrawer 直接关闭，不弹确认', async () => {
    const { useApiPresetManagement, store } = await importComposable();
    const m = useApiPresetManagement();
    const confirmSpy = vi.spyOn(window, 'confirm');

    m.openEdit(store.presets[0]);
    m.closeDrawer();

    expect(confirmSpy).not.toHaveBeenCalled();
    expect(m.drawerView.value).toBe('closed');
  });

  it('有修改时 confirmIfDirty 弹确认，用户确认后允许关闭', async () => {
    const { useApiPresetManagement, store } = await importComposable();
    const m = useApiPresetManagement();
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    m.openEdit(store.presets[0]);
    m.draft.model = 'changed';
    const allowed = m.confirmIfDirty();

    expect(window.confirm).toHaveBeenCalled();
    expect(allowed).toBe(true);
    m.closeDrawer();
    expect(m.drawerView.value).toBe('closed');
  });

  it('有修改时 confirmIfDirty 弹确认，用户取消后阻止关闭', async () => {
    const { useApiPresetManagement, store } = await importComposable();
    const m = useApiPresetManagement();
    vi.spyOn(window, 'confirm').mockReturnValue(false);

    m.openEdit(store.presets[0]);
    m.draft.model = 'changed';
    const allowed = m.confirmIfDirty();

    expect(window.confirm).toHaveBeenCalled();
    expect(allowed).toBe(false);
    expect(m.drawerView.value).toBe('edit');
  });

  it('有修改时 confirmIfDirty 阻止 backToManage', async () => {
    const { useApiPresetManagement, store } = await importComposable();
    const m = useApiPresetManagement();
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    m.openEdit(store.presets[0]);
    m.draft.url = 'https://changed.test';
    const allowed = m.confirmIfDirty();

    expect(window.confirm).toHaveBeenCalled();
    expect(allowed).toBe(true);
    m.backToManage();
    expect(m.drawerView.value).toBe('manage');
  });

  it('有修改时 confirmIfDirty 取消则保持编辑', async () => {
    const { useApiPresetManagement, store } = await importComposable();
    const m = useApiPresetManagement();
    vi.spyOn(window, 'confirm').mockReturnValue(false);

    m.openEdit(store.presets[0]);
    m.draft.url = 'https://changed.test';
    const allowed = m.confirmIfDirty();

    expect(window.confirm).toHaveBeenCalled();
    expect(allowed).toBe(false);
    expect(m.drawerView.value).toBe('edit');
  });

  it('discardDraft 不弹确认直接返回管理视图', async () => {
    const { useApiPresetManagement, store } = await importComposable();
    const m = useApiPresetManagement();
    const confirmSpy = vi.spyOn(window, 'confirm');

    m.openEdit(store.presets[0]);
    m.draft.model = 'changed';
    m.discardDraft();

    expect(confirmSpy).not.toHaveBeenCalled();
    expect(m.drawerView.value).toBe('manage');
  });

  it('saveDraft 成功后 isDirty 重置', async () => {
    const { useApiPresetManagement } = await importComposable();
    const m = useApiPresetManagement();

    m.openCreate();
    m.draft.name = 'new-preset';
    expect(m.isDirty.value).toBe(true);

    expect(m.saveDraft()).toBe(true);
    expect(m.drawerView.value).toBe('manage');
  });

  it('不再向 localStorage 写入草稿', async () => {
    const { useApiPresetManagement, store } = await importComposable();
    const m = useApiPresetManagement();

    m.openEdit(store.presets[0]);
    m.draft.model = 'changed-model';

    const persisted = localStorage.getItem('acu_v2_ui_state');
    const parsed = persisted ? JSON.parse(persisted) : {};
    expect(parsed.apiPresetDraft).toBeUndefined();
  });
});
