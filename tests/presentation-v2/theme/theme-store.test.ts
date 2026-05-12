/**
 * theme-store.test — 验证主题切换、持久化、注入
 *
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const STYLE_NODE_ID = 'acu-v2-theme';
const APP_ROOT_ID = 'acu-app-v2';
const STORAGE_KEY = 'acu_v2_ui_state';

type ThemeStoreModule = typeof import('../../../src/presentation-v2/stores/theme-store');
type InjectorModule = typeof import('../../../src/presentation-v2/theme/theme-injector');
type PersistenceModule = typeof import('../../../src/presentation-v2/stores/persistence');
type HostDocModule = typeof import('../../../src/presentation-v2/bootstrap/host-document');
type PiniaModule = typeof import('pinia');

async function freshImport(): Promise<{
  themeStore: ThemeStoreModule;
  injector: InjectorModule;
  persistence: PersistenceModule;
  host: HostDocModule;
  pinia: PiniaModule;
}> {
  vi.resetModules();
  const [themeStore, injector, persistence, host, pinia] = await Promise.all([
    import('../../../src/presentation-v2/stores/theme-store'),
    import('../../../src/presentation-v2/theme/theme-injector'),
    import('../../../src/presentation-v2/stores/persistence'),
    import('../../../src/presentation-v2/bootstrap/host-document'),
    import('pinia'),
  ]);
  return { themeStore, injector, persistence, host, pinia };
}

beforeEach(() => {
  document.body.innerHTML = '';
  document.head.innerHTML = '';
  localStorage.clear();
});

afterEach(() => {
  localStorage.clear();
});

describe('theme-store', () => {
  it('未持久化时使用默认主题（default-dark）', async () => {
    const m = await freshImport();
    m.pinia.setActivePinia(m.pinia.createPinia());
    const store = m.themeStore.useThemeStore();
    expect(store.activeId).toBe('default-dark');
  });

  it('localStorage 中已有合法 id 时按持久化值初始化', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ theme: { activeId: 'github-dark' } }));
    const m = await freshImport();
    m.pinia.setActivePinia(m.pinia.createPinia());
    const store = m.themeStore.useThemeStore();
    expect(store.activeId).toBe('github-dark');
  });

  it('非法 id 落回默认主题', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ theme: { activeId: 'not-a-theme' } }));
    const m = await freshImport();
    m.pinia.setActivePinia(m.pinia.createPinia());
    const store = m.themeStore.useThemeStore();
    expect(store.activeId).toBe('default-dark');
  });

  it('setTheme 切换后 localStorage 被写入新 id', async () => {
    const m = await freshImport();
    m.pinia.setActivePinia(m.pinia.createPinia());
    const store = m.themeStore.useThemeStore();
    store.setTheme('classical-silk');
    expect(store.activeId).toBe('classical-silk');
    const raw = localStorage.getItem(STORAGE_KEY);
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw!)).toEqual({ theme: { activeId: 'classical-silk' } });
  });

  it('setTheme 拒绝非法 id（不变更 state）', async () => {
    const m = await freshImport();
    m.pinia.setActivePinia(m.pinia.createPinia());
    const store = m.themeStore.useThemeStore();
    const before = store.activeId;
    (store.setTheme as any)('definitely-not-a-theme');
    expect(store.activeId).toBe(before);
  });

  it('包含 GitHub Dark 主题并使用 Primer dark token 映射', async () => {
    const m = await freshImport();
    m.pinia.setActivePinia(m.pinia.createPinia());
    const store = m.themeStore.useThemeStore();
    const githubDark = store.themes.find(t => t.id === 'github-dark');
    expect(githubDark).toMatchObject({
      name: 'GitHub Dark',
      colorScheme: 'dark',
      tokens: {
        bg0: '#0d1117',
        bg1: '#151b23',
        border: '#3d444d',
        text1: '#f0f6fc',
        accent: '#4493f8',
      },
    });
  });

  it('包含从旧 UI 模板迁移的草莓奶龙主题', async () => {
    const m = await freshImport();
    m.pinia.setActivePinia(m.pinia.createPinia());
    const store = m.themeStore.useThemeStore();
    const strawberryDragon = store.themes.find(t => t.id === 'strawberry-dragon');
    expect(strawberryDragon).toMatchObject({
      name: '草莓奶龙',
      colorScheme: 'light',
      tokens: {
        bg0: '#F4E2E5',
        bg1: '#FFFFFF',
        bg2: '#FFF5F7',
        border: 'transparent',
        text1: '#78685E',
        accent: '#ECC9CF',
        onAccent: '#78685E',
      },
    });

    store.setTheme('strawberry-dragon');
    expect(store.activeId).toBe('strawberry-dragon');
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toEqual({
      theme: { activeId: 'strawberry-dragon' },
    });
  });
});

describe('theme-injector', () => {
  it('applyTheme 把内置主题分别写入同一个 <style id="acu-v2-theme">', async () => {
    const m = await freshImport();
    m.pinia.setActivePinia(m.pinia.createPinia());
    const store = m.themeStore.useThemeStore();

    m.injector.applyTheme(store.activeTheme);
    const style1 = document.getElementById(STYLE_NODE_ID) as HTMLStyleElement | null;
    expect(style1).not.toBeNull();
    expect(style1!.textContent).toContain(`#${APP_ROOT_ID} {`);
    expect(style1!.textContent).not.toContain(`#${APP_ROOT_ID} *`);
    expect(style1!.textContent).toContain('--acu-bg-0:');
    expect(style1!.textContent).toContain('--acu-accent:');

    store.setTheme('default-light');
    m.injector.applyTheme(store.activeTheme);
    const style2 = document.getElementById(STYLE_NODE_ID) as HTMLStyleElement | null;
    expect(style2).toBe(style1); // 同一个节点，textContent 被替换
    expect(style2!.textContent).toContain('#f5f7fa'); // light 的 bg-0

    store.setTheme('github-dark');
    m.injector.applyTheme(store.activeTheme);
    const style3 = document.getElementById(STYLE_NODE_ID) as HTMLStyleElement | null;
    expect(style3).toBe(style1);
    expect(style3!.textContent).toContain('#0d1117'); // GitHub Dark 的 bg-0
    expect(style3!.textContent).toContain('#4493f8'); // GitHub Dark 的 accent
  });

  it('applyTheme 设置根容器 colorScheme', async () => {
    const root = document.createElement('div');
    root.id = APP_ROOT_ID;
    document.body.appendChild(root);

    const m = await freshImport();
    m.pinia.setActivePinia(m.pinia.createPinia());
    const store = m.themeStore.useThemeStore();
    store.setTheme('default-light');
    m.injector.applyTheme(store.activeTheme);
    expect(root.style.colorScheme).toBe('light');

    store.setTheme('github-dark');
    m.injector.applyTheme(store.activeTheme);
    expect(root.style.colorScheme).toBe('dark');
  });
});
