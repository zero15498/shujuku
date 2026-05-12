/**
 * TablePage 集成 — 表格模板预设 + 注入目标 + 附加世界书条目 + 预设管理抽屉
 *
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const STORAGE_KEY = 'acu_v2_ui_state';

async function mountTablePage(opts: { selectedChatPreset?: string; selectedGlobalPreset?: string } = {}) {
  vi.resetModules();
  document.body.innerHTML = '';
  document.head.innerHTML = '';
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ router: { activePageId: 'table' } }));

  const { ref, shallowRef, computed } = await import('vue');

  // —— useTableTemplatePresets（页面顶部下拉） ——
  const selectGlobalPreset = vi.fn(async () => {});
  const selectChatPreset = vi.fn(async () => {});
  const refresh = vi.fn();
  const tplExportTemplate = vi.fn(() => {});
  const importPresetForCurrentChat = vi.fn(async () => {});

  vi.doMock('../../../src/presentation-v2/composables/useChatChangedListener', () => ({
    useChatChangedListener: () => {},
    useChatChangedTick: () => ref(0),
  }));
  vi.doMock('../../../src/presentation-v2/composables/useTableTemplatePresets', () => ({
    useTableTemplatePresets: () => {
      const selectedGlobalPreset = ref(opts.selectedGlobalPreset ?? 'global-A');
      const selectedChatPreset = ref(opts.selectedChatPreset ?? 'global-A');
      return {
      busy: ref(false),
      message: ref(null),
      selectedGlobalPreset,
      selectedChatPreset,
      isChatOverridden: computed(() => selectedChatPreset.value !== selectedGlobalPreset.value),
      chatPresetItems: ref([
        { value: '', label: '默认预设', meta: '2 张表' },
        { value: 'global-A', label: 'global-A', meta: '2 张表' },
        { value: 'chat-A', label: 'chat-A', meta: '3 张表' },
      ]),
      refresh,
      selectGlobalPreset,
      selectChatPreset,
      importPresetForCurrentChat,
      exportTemplate: tplExportTemplate,
    };
    },
  }));

  // —— useTablePresetManagement（抽屉） ——
  const drawerView = ref<'closed' | 'manage'>('closed');
  const isDrawerOpen = computed(() => drawerView.value !== 'closed');
  const title = computed(() => (drawerView.value === 'manage' ? '管理表格模板预设' : ''));
  const presetMeta = ref<Array<{ name: string }>>([{ name: 'global-A' }, { name: 'global-B' }]);
  const defaultPresetName = ref('global-A');
  const message = ref<{ kind: 'success' | 'error' | 'info' | 'warning'; text: string } | null>(null);

  const openVisualizer = vi.fn(async () => {});
  const editPreset = vi.fn(async () => {});
  const setAsDefault = vi.fn(async () => {});
  const deletePreset = vi.fn(async () => {});
  const exportPresetMgmt = vi.fn(() => {});
  const renamePreset = vi.fn(async () => {});
  const createBlankPreset = vi.fn(async () => {});

  vi.doMock('../../../src/presentation-v2/composables/useTablePresetManagement', () => ({
    useTablePresetManagement: () => ({
      drawerView,
      isDrawerOpen,
      title,
      busy: ref(false),
      message,
      presetMeta,
      defaultPresetName,
      refresh: vi.fn(),
      openManage: () => { drawerView.value = 'manage'; },
      closeDrawer: () => { drawerView.value = 'closed'; },
      openVisualizer,
      editPreset,
      setAsDefault,
      deletePreset,
      exportPreset: exportPresetMgmt,
      renamePreset,
      createBlankPreset,
    }),
  }));

  // —— 注入目标 / 附加条目 / 选择器 ——
  vi.doMock('../../../src/presentation-v2/composables/useFormFillInjectionTarget', () => ({
    useFormFillInjectionTarget: () => ({
      target: ref('character'),
      selectorValue: ref('character'),
      refreshFromSettings: vi.fn(),
      onSelectorChange: vi.fn(),
      describeTarget: vi.fn(async () => '角色卡主世界书 · CharBookT'),
    }),
  }));

  const entriesSourceRef = ref<'character' | 'manual'>('character');
  vi.doMock('../../../src/presentation-v2/composables/useFormFillWorldbookConfig', () => ({
    useFormFillWorldbookConfig: () => ({
      source: entriesSourceRef,
      manualBook: ref(''),
      selectorValue: ref('character'),
      refreshFromSettings: vi.fn(),
      onSelectorChange: vi.fn(),
      resolveBookNames: vi.fn(async () => ['CharBookT']),
    }),
  }));

  const groupsRef = shallowRef<any[]>([
    { bookName: 'CharBookT', expanded: true, entries: [{ uid: 1, bookName: 'CharBookT', label: '人物', checked: true, disabled: false }] },
  ]);
  vi.doMock('../../../src/presentation-v2/composables/useFormFillWorldbookEntries', () => ({
    useFormFillWorldbookEntries: () => ({
      groups: groupsRef,
      status: ref('success'),
      error: ref(''),
      loadEntries: vi.fn(async () => {}),
      toggleEntry: vi.fn(),
      selectAll: vi.fn(),
      deselectAll: vi.fn(),
      toggleGroupExpanded: vi.fn(),
    }),
  }));

  vi.doMock('../../../src/presentation-v2/composables/useWorldbookSelector', () => ({
    useWorldbookSelector: () => ({
      names: shallowRef(['CharBookT', 'Other']),
      charPrimary: ref('CharBookT'),
      status: ref('success'),
      error: ref(''),
      refresh: vi.fn(async () => {}),
    }),
  }));

  const mount = await import('../../../src/presentation-v2/bootstrap/mount');
  await mount.openAcuV2App();
  await new Promise(r => setTimeout(r, 0));
  return {
    mount,
    selectGlobalPreset,
    selectChatPreset,
    refresh,
    openVisualizer,
    editPreset,
    setAsDefault,
    deletePreset,
    exportPresetMgmt,
    renamePreset,
    createBlankPreset,
    importPresetForCurrentChat,
    drawerView,
  };
}

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('TablePage', () => {
  it('左右分栏：左列含模板预设与注入目标世界书，右列含附加世界书条目；不再渲染可视化编辑器卡片', async () => {
    const { mount } = await mountTablePage();

    const page = document.querySelector('.acu-v2-table-page');
    expect(page).not.toBeNull();
    const text = page!.textContent || '';
    expect(text).toContain('表格模板预设');
    expect(text).toContain('注入目标世界书');
    expect(text).toContain('附加世界书条目');
    expect(text).toContain('当前聊天:');
    expect(text).toContain('全局默认:');
    expect(text).toContain('跟随全局');
    expect(text).not.toContain('表格工具');
    expect(page!.querySelector('.acu-v2-table-page__tool-card')).toBeNull();
    expect(Array.from(page!.querySelectorAll('button')).some(b => b.textContent?.trim() === '打开可视化表格编辑器')).toBe(false);
    expect(text).not.toContain('立即构建交火纪要索引');
    expect(text).not.toContain('Embedding / Rerank');
    expect(Array.from(page!.querySelectorAll('button')).some(b => b.textContent?.trim() === '刷新')).toBe(false);

    const cols = page!.querySelectorAll('.acu-v2-table-page__col');
    expect(cols.length).toBe(2);

    mount.__resetAcuV2MountForTests();
  });

  it('关闭后重新打开 UI 会刷新当前表格页', async () => {
    const { mount, refresh } = await mountTablePage();

    expect(refresh).toHaveBeenCalledTimes(1);
    mount.closeAcuV2App();
    await mount.openAcuV2App();
    await Promise.resolve();

    expect(refresh).toHaveBeenCalledTimes(2);

    mount.__resetAcuV2MountForTests();
  });

  it('每个面板都渲染常驻说明信息条', async () => {
    const { mount } = await mountTablePage();

    const panels = Array.from(document.querySelectorAll<HTMLElement>('.acu-v2-table-page .acu-panel'));
    expect(panels.length).toBeGreaterThan(0);
    for (const panel of panels) {
      expect(panel.querySelector('.acu-panel__body .acu-info-banner')).not.toBeNull();
    }

    mount.__resetAcuV2MountForTests();
  });

  it('当前聊天选择和全局默认一致时显示跟随全局，否则显示已覆盖', async () => {
    let mounted = await mountTablePage({
      selectedChatPreset: 'global-A',
      selectedGlobalPreset: 'global-A',
    });
    let page = document.querySelector('.acu-v2-table-page') as HTMLElement;
    expect(page.textContent).toContain('跟随全局');
    expect(page.textContent).not.toContain('已覆盖');
    mounted.mount.__resetAcuV2MountForTests();

    mounted = await mountTablePage({
      selectedChatPreset: 'chat-A',
      selectedGlobalPreset: 'global-A',
    });
    page = document.querySelector('.acu-v2-table-page') as HTMLElement;
    expect(page.textContent).toContain('已覆盖');
    mounted.mount.__resetAcuV2MountForTests();
  });

  it('预设下拉选择当前聊天模板', async () => {
    const { mount, selectChatPreset } = await mountTablePage();

    const triggers = Array.from(document.querySelectorAll('.acu-preset-dd__trigger')) as HTMLButtonElement[];
    expect(triggers).toHaveLength(1);

    triggers[0].click();
    await Promise.resolve();
    (Array.from(document.querySelectorAll('.acu-preset-dd__item'))
      .find(item => item.textContent?.includes('global-A')) as HTMLElement).click();
    await Promise.resolve();

    expect(selectChatPreset).toHaveBeenCalledWith('global-A');

    mount.__resetAcuV2MountForTests();
  });

  it('预设下拉星标会设置全局模板默认', async () => {
    const { mount, selectGlobalPreset } = await mountTablePage();

    const triggers = Array.from(document.querySelectorAll('.acu-preset-dd__trigger')) as HTMLButtonElement[];
    triggers[0].click();
    await Promise.resolve();
    const stars = Array.from(document.querySelectorAll('.acu-preset-dd__star')) as HTMLButtonElement[];
    stars.find(star => star.closest('.acu-preset-dd__item')?.textContent?.includes('chat-A'))!.click();
    await Promise.resolve();

    expect(selectGlobalPreset).toHaveBeenCalledWith('chat-A');

    mount.__resetAcuV2MountForTests();
  });

  it('点击下拉右侧"编辑"按钮会打开可视化表格编辑器', async () => {
    const { mount, openVisualizer } = await mountTablePage();

    const editButton = document.querySelector('button[title*="编辑当前模板"]') as HTMLButtonElement;
    expect(editButton).not.toBeNull();
    editButton.click();
    await Promise.resolve();

    expect(openVisualizer).toHaveBeenCalledTimes(1);

    mount.__resetAcuV2MountForTests();
  });

  it('点击齿轮按钮会打开管理抽屉，显示预设列表', async () => {
    const { mount } = await mountTablePage();

    const gearButton = document.querySelector('button[title="管理表格模板预设"]') as HTMLButtonElement;
    expect(gearButton).not.toBeNull();
    gearButton.click();
    await Promise.resolve();

    const drawer = document.querySelector('.acu-v2-drawer') as HTMLElement;
    expect(drawer).not.toBeNull();
    expect(drawer.textContent).toContain('管理表格模板预设');
    expect(drawer.textContent).toContain('global-A');
    expect(drawer.textContent).toContain('global-B');
    expect(drawer.textContent).toContain('从默认新建');
    expect(drawer.textContent).not.toContain('导入为全局预设');
    expect(drawer.textContent).not.toContain('导入到当前聊天');
    expect(drawer.textContent).not.toContain('恢复全局默认');

    mount.__resetAcuV2MountForTests();
  });

  it('管理抽屉的行内"编辑"会调用 editPreset 切换并打开编辑器', async () => {
    const { mount, editPreset } = await mountTablePage();

    (document.querySelector('button[title="管理表格模板预设"]') as HTMLButtonElement).click();
    await Promise.resolve();

    const drawer = document.querySelector('.acu-v2-drawer') as HTMLElement;
    const items = Array.from(drawer.querySelectorAll('.acu-v2-manage-item'));
    const itemB = items.find(li => li.textContent?.includes('global-B')) as HTMLElement;
    const editBtn = itemB.querySelector('button[title^="编辑"]') as HTMLButtonElement;
    editBtn.click();
    await Promise.resolve();

    expect(editPreset).toHaveBeenCalledWith('global-B');

    mount.__resetAcuV2MountForTests();
  });

  it('管理抽屉顶部按钮连接到 management composable', async () => {
    const { mount, createBlankPreset } = await mountTablePage();

    (document.querySelector('button[title="管理表格模板预设"]') as HTMLButtonElement).click();
    await Promise.resolve();

    const drawer = document.querySelector('.acu-v2-drawer') as HTMLElement;
    const buttons = Array.from(drawer.querySelectorAll('button'));
    expect(buttons.some(b => b.textContent?.includes('恢复全局默认'))).toBe(false);
    buttons.find(b => b.textContent?.includes('从默认新建'))!.click();
    await Promise.resolve();

    expect(createBlankPreset).toHaveBeenCalledTimes(1);

    mount.__resetAcuV2MountForTests();
  });

  it('当前为默认预设时主编辑按钮禁用，不直接打开可视化编辑器', async () => {
    const { mount, openVisualizer } = await mountTablePage({
      selectedChatPreset: '',
      selectedGlobalPreset: '',
    });

    const editButton = document.querySelector('button[title*="默认预设不能直接编辑"]') as HTMLButtonElement | null;
    expect(editButton).not.toBeNull();
    expect(editButton!.disabled).toBe(true);
    editButton!.click();
    await Promise.resolve();

    expect(openVisualizer).not.toHaveBeenCalled();

    mount.__resetAcuV2MountForTests();
  });

  it('面板下拉栏右侧提供导入按钮', async () => {
    const { mount } = await mountTablePage();

    const importButton = document.querySelector('button[title="导入模板 JSON"]') as HTMLButtonElement | null;
    expect(importButton).not.toBeNull();
    expect(importButton!.disabled).toBe(false);

    mount.__resetAcuV2MountForTests();
  });

  it('管理抽屉行内星标 / 删除会调用对应方法', async () => {
    const { mount, setAsDefault, deletePreset } = await mountTablePage();
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    (document.querySelector('button[title="管理表格模板预设"]') as HTMLButtonElement).click();
    await Promise.resolve();

    const drawer = document.querySelector('.acu-v2-drawer') as HTMLElement;
    const items = Array.from(drawer.querySelectorAll('.acu-v2-manage-item'));
    const itemB = items.find(li => li.textContent?.includes('global-B')) as HTMLElement;
    (itemB.querySelector('button[title="设为全局默认"]') as HTMLButtonElement).click();
    (itemB.querySelector('button[title="删除"]') as HTMLButtonElement).click();
    await Promise.resolve();

    expect(setAsDefault).toHaveBeenCalledWith('global-B');
    expect(deletePreset).toHaveBeenCalledWith('global-B');

    mount.__resetAcuV2MountForTests();
  });
});
