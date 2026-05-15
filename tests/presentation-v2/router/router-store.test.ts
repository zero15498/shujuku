/**
 * router-store.test — pageRegistry 行为、可见性过滤、持久化、close 行为
 *
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const STORAGE_KEY = 'acu_v2_ui_state';

type RouterStoreModule = typeof import('../../../src/presentation-v2/stores/router-store');
type PageRegistryModule = typeof import('../../../src/presentation-v2/router/page-registry');
type RootShellModule = typeof import('../../../src/presentation-v2/stores/root-shell-store');
type PiniaModule = typeof import('pinia');

async function freshImport(): Promise<{
  router: RouterStoreModule;
  registry: PageRegistryModule;
  rootShell: RootShellModule;
  pinia: PiniaModule;
}> {
  vi.resetModules();
  const pinia = await import('pinia');
  const router = await import('../../../src/presentation-v2/stores/router-store');
  const registry = await import('../../../src/presentation-v2/router/page-registry');
  const rootShell = await import('../../../src/presentation-v2/stores/root-shell-store');
  return { router, registry, rootShell, pinia };
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  localStorage.clear();
});

describe('router-store · pageRegistry 基线', () => {
  it('注册表恰好 13 项，分布于 5 分组', async () => {
    const m = await freshImport();
    m.pinia.setActivePinia(m.pinia.createPinia());
    const r = m.router.useRouterStore();
    expect(r.pageRegistry.length).toBe(13);
    const byGroup = r.pageRegistry.reduce<Record<string, number>>((acc, p) => {
      acc[p.group] = (acc[p.group] || 0) + 1;
      return acc;
    }, {});
    expect(byGroup).toEqual({
      overview: 1,
      config: 4,
      feature: 4,
      tool: 3,
      developer: 1,
    });
  });

  it('一级页名称与分组顺序符合手动触发 / 配置归属', async () => {
    const m = await freshImport();
    m.pinia.setActivePinia(m.pinia.createPinia());
    const r = m.router.useRouterStore();

    expect(r.pageRegistry.map(p => [p.id, p.title, p.group])).toEqual([
      ['dashboard', '仪表盘', 'overview'],
      ['form-fill', '更新参数', 'config'],
      ['table', '表格模板', 'config'],
      ['plot', '剧情推进', 'config'],
      ['api', 'API', 'config'],
      ['continuation', '智能续写', 'feature'],
      ['import', '外部导入', 'feature'],
      ['vector-index', '交火模式', 'feature'],
      ['content-replace', '正文替换', 'feature'],
      ['data-mgmt', '数据管理', 'tool'],
      ['sql-console', 'SQL 控制台', 'tool'],
      ['log-viewer', '运行日志', 'tool'],
      ['developer', '开发者选项', 'developer'],
    ]);
  });
});

describe('router-store · 默认可见性（阶段 0 默认状态）', () => {
  it('正文替换默认隐藏（featureGate 未开）', async () => {
    const m = await freshImport();
    m.pinia.setActivePinia(m.pinia.createPinia());
    const r = m.router.useRouterStore();
    const ids = r.visiblePages.map(p => p.id);
    expect(ids).not.toContain('content-replace');
  });

  it('SQL 控制台仅 SQLite 模式下可见', async () => {
    const m = await freshImport();
    m.pinia.setActivePinia(m.pinia.createPinia());
    const r = m.router.useRouterStore();
    expect(r.visiblePages.map(p => p.id)).not.toContain('sql-console');
    r.setSqliteMode(true);
    expect(r.visiblePages.map(p => p.id)).toContain('sql-console');
    r.setSqliteMode(false);
    expect(r.visiblePages.map(p => p.id)).not.toContain('sql-console');
  });

  it('初始化时从当前 settings 读取 SQLite 模式，刷新后首次打开即显示 SQL 控制台', async () => {
    const m = await freshImport();
    const state = await import('../../../src/service/runtime/state-manager');
    state._set_settings_ACU({ ...state.settings_ACU, storageMode: 'sqlite' });
    m.pinia.setActivePinia(m.pinia.createPinia());

    const r = m.router.useRouterStore();

    expect(r.isSqliteMode).toBe(true);
    expect(r.visiblePages.map(p => p.id)).toContain('sql-console');
  });

  it('正文替换 featureGate 打开后出现在可见列表', async () => {
    const m = await freshImport();
    m.pinia.setActivePinia(m.pinia.createPinia());
    const r = m.router.useRouterStore();
    r.setFeatureGate(m.registry.FEATURE_GATE_CONTENT_REPLACE, true);
    expect(r.visiblePages.map(p => p.id)).toContain('content-replace');
  });

  it('初始化时 maxRetries=49 不再直接显示正文替换页', async () => {
    const m = await freshImport();
    const state = await import('../../../src/service/runtime/state-manager');
    state._set_settings_ACU({
      ...state.settings_ACU,
      plotSettings: {
        ...(state.settings_ACU.plotSettings || {}),
        loopSettings: {
          ...(state.settings_ACU.plotSettings?.loopSettings || {}),
          maxRetries: m.registry.CONTENT_REPLACE_UNLOCK_MAX_RETRIES,
        },
      },
    });
    m.pinia.setActivePinia(m.pinia.createPinia());

    const r = m.router.useRouterStore();

    expect(r.visiblePages.map(p => p.id)).not.toContain('content-replace');
  });

  it('初始化时正文替换页由 contentOptimizationSettings.enabled 控制', async () => {
    const m = await freshImport();
    const state = await import('../../../src/service/runtime/state-manager');
    state._set_settings_ACU({
      ...state.settings_ACU,
      contentOptimizationSettings: {
        ...(state.settings_ACU.contentOptimizationSettings || {}),
        enabled: true,
      },
      plotSettings: {
        ...(state.settings_ACU.plotSettings || {}),
        loopSettings: {
          ...(state.settings_ACU.plotSettings?.loopSettings || {}),
          maxRetries: 3,
        },
      },
    });
    m.pinia.setActivePinia(m.pinia.createPinia());

    const r = m.router.useRouterStore();

    expect(r.visiblePages.map(p => p.id)).toContain('content-replace');
  });

  it('visiblePagesByGroup 在默认状态下：overview=1 / config=4 / feature=2 / tool=2 / developer=0', async () => {
    const m = await freshImport();
    m.pinia.setActivePinia(m.pinia.createPinia());
    const r = m.router.useRouterStore();
    expect(r.visiblePagesByGroup.overview.length).toBe(1);
    expect(r.visiblePagesByGroup.config.length).toBe(4);
    expect(r.visiblePagesByGroup.feature.length).toBe(2);
    expect(r.visiblePagesByGroup.tool.length).toBe(2); // 数据管理 + 运行日志
    expect(r.visiblePagesByGroup.developer.length).toBe(0); // 默认 developerOptionsEnabled=false
  });

  it('developer 一级页随 developerOptionsEnabled 切换可见性（plan §D24）', async () => {
    const m = await freshImport();
    m.pinia.setActivePinia(m.pinia.createPinia());
    const r = m.router.useRouterStore();
    const devOptions = (await import('../../../src/presentation-v2/stores/dev-options-store')).useDevOptionsStore();

    expect(r.visiblePages.map(p => p.id)).not.toContain('developer');
    devOptions.setDeveloperOptionsEnabled(true);
    expect(r.visiblePages.map(p => p.id)).toContain('developer');
    devOptions.setDeveloperOptionsEnabled(false);
    expect(r.visiblePages.map(p => p.id)).not.toContain('developer');
  });
});

describe('router-store · 切页 + 持久化', () => {
  it('未持久化时默认页是 dashboard', async () => {
    const m = await freshImport();
    m.pinia.setActivePinia(m.pinia.createPinia());
    const r = m.router.useRouterStore();
    expect(r.activePageId).toBe('dashboard');
  });

  it('localStorage 中已有合法 id 时使用持久化值', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ router: { activePageId: 'plot' } }));
    const m = await freshImport();
    m.pinia.setActivePinia(m.pinia.createPinia());
    const r = m.router.useRouterStore();
    expect(r.activePageId).toBe('plot');
  });

  it('SQLite 模式下允许从持久化状态恢复到 SQL 控制台', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ router: { activePageId: 'sql-console' } }));
    const m = await freshImport();
    const state = await import('../../../src/service/runtime/state-manager');
    state._set_settings_ACU({ ...state.settings_ACU, storageMode: 'sqlite' });
    m.pinia.setActivePinia(m.pinia.createPinia());

    const r = m.router.useRouterStore();

    expect(r.activePageId).toBe('sql-console');
  });

  it('未知 id 落回默认页', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ router: { activePageId: 'no-such-page' } }));
    const m = await freshImport();
    m.pinia.setActivePinia(m.pinia.createPinia());
    const r = m.router.useRouterStore();
    expect(r.activePageId).toBe('dashboard');
  });

  it('setActivePage 写入 localStorage', async () => {
    const m = await freshImport();
    m.pinia.setActivePinia(m.pinia.createPinia());
    const r = m.router.useRouterStore();
    r.setActivePage('continuation');
    expect(r.activePageId).toBe('continuation');
    const persisted = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(persisted.router.activePageId).toBe('continuation');
  });

  it('剧情推进与交火模式按功能开关控制一级页可见性', async () => {
    const m = await freshImport();
    m.pinia.setActivePinia(m.pinia.createPinia());
    const r = m.router.useRouterStore();

    expect(r.visiblePagesByGroup.config.map(p => p.id)).toContain('plot');
    expect(r.visiblePagesByGroup.feature.map(p => p.id)[0]).toBe('continuation');
    expect(r.visiblePages.map(p => p.id)).not.toContain('vector-index');

    r.setFeatureGate(m.registry.FEATURE_GATE_PLOT, false);
    expect(r.visiblePages.map(p => p.id)).not.toContain('plot');
    r.setActivePage('plot');
    expect(r.activePageId).toBe('dashboard');

    r.setFeatureGate(m.registry.FEATURE_GATE_VECTOR_INDEX, true);
    expect(r.visiblePages.map(p => p.id)).toContain('vector-index');
  });

  it('setActivePage 拒绝切到不可见页', async () => {
    const m = await freshImport();
    m.pinia.setActivePinia(m.pinia.createPinia());
    const r = m.router.useRouterStore();
    r.setActivePage('sql-console');
    expect(r.activePageId).toBe('dashboard'); // 拒绝；保持默认
    r.setSqliteMode(true);
    r.setActivePage('sql-console');
    expect(r.activePageId).toBe('sql-console'); // SQLite 启后能切
  });

  it('当前页变成不可见时回退到 dashboard', async () => {
    const m = await freshImport();
    m.pinia.setActivePinia(m.pinia.createPinia());
    const r = m.router.useRouterStore();
    r.setSqliteMode(true);
    r.setActivePage('sql-console');
    expect(r.activePageId).toBe('sql-console');
    r.setSqliteMode(false);
    expect(r.activePageId).toBe('dashboard');
  });
});

describe('root-shell-store · close 行为（P0-6）', () => {
  it('requestOpenRefresh 累加打开刷新 tick', async () => {
    const m = await freshImport();
    m.pinia.setActivePinia(m.pinia.createPinia());
    const shell = m.rootShell.useRootShellStore();
    expect(shell.openRefreshTick).toBe(0);
    shell.requestOpenRefresh();
    shell.requestOpenRefresh();
    expect(shell.openRefreshTick).toBe(2);
  });

  it('requestScrollReset 累加 tick', async () => {
    const m = await freshImport();
    m.pinia.setActivePinia(m.pinia.createPinia());
    const shell = m.rootShell.useRootShellStore();
    expect(shell.scrollResetTick).toBe(0);
    shell.requestScrollReset();
    shell.requestScrollReset();
    expect(shell.scrollResetTick).toBe(2);
  });
});
