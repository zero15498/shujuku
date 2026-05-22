/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const STORAGE_KEY = 'acu_v2_ui_state';

function persistAdvancedMode(activePageId = 'dashboard'): void {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      uiMode: { mode: 'advanced' },
      router: { activePageId },
    }),
  );
}

async function resetMountedApp(): Promise<void> {
  const mount = await import('../../../src/presentation-v2/bootstrap/mount');
  mount.__resetAcuV2MountForTests();
}

beforeEach(() => {
  vi.resetModules();
  document.body.innerHTML = '';
  document.head.innerHTML = '';
  localStorage.clear();
});

describe('openVisualizerSurface_ACU', () => {
  it('外部调用会打开 v2 shell 并进入 visualizer surface，关闭后隐藏 shell', async () => {
    persistAdvancedMode();
    const bridge = await import('../../../src/presentation-v2/surfaces/visualizer/open-visualizer-surface');

    const result = await bridge.openVisualizerSurface_ACU({ source: 'external-api' });
    await Promise.resolve();

    expect(result).toBe(true);
    expect(document.getElementById('acu-app-v2')?.style.display).toBe('');
    expect(document.querySelector('.acu-v2-app__page-title')?.textContent).toBe('数据库编辑器');
    expect(document.querySelector('[data-acu-visualizer-surface]')).not.toBeNull();
    expect(document.querySelector('[data-acu-visualizer-surface]')?.textContent).not.toContain('VZ-4');

    (document.querySelector('.acu-v2-app__close') as HTMLButtonElement).click();
    await new Promise(r => setTimeout(r, 0));

    expect(document.getElementById('acu-app-v2')?.style.display).toBe('none');
    await resetMountedApp();
  });

  it('v2 已打开时进入 visualizer，关闭后恢复进入前页面', async () => {
    persistAdvancedMode('dashboard');
    const mount = await import('../../../src/presentation-v2/bootstrap/mount');
    await mount.openAcuV2App();
    await Promise.resolve();
    expect(document.querySelector('.acu-v2-app__page-title')?.textContent).toBe('仪表盘');

    const bridge = await import('../../../src/presentation-v2/surfaces/visualizer/open-visualizer-surface');
    await bridge.openVisualizerSurface_ACU({ source: 'external-api' });
    await Promise.resolve();
    expect(document.querySelector('.acu-v2-app__page-title')?.textContent).toBe('数据库编辑器');

    (document.querySelector('.acu-v2-app__close') as HTMLButtonElement).click();
    await new Promise(r => setTimeout(r, 0));

    expect(document.getElementById('acu-app-v2')?.style.display).toBe('');
    expect(document.querySelector('.acu-v2-app__page-title')?.textContent).toBe('仪表盘');
    mount.__resetAcuV2MountForTests();
  });

  it('安装独立 v2 全局接口：未打开时忽略，打开后记录刷新请求', async () => {
    persistAdvancedMode();
    const bridge = await import('../../../src/presentation-v2/surfaces/visualizer/open-visualizer-surface');
    const mount = await import('../../../src/presentation-v2/bootstrap/mount');
    const { useVisualizerStore } = await import('../../../src/presentation-v2/stores/visualizer-store');
    expect(typeof (window as any).AutoCardUpdaterV2API?.openVisualizer).toBe('function');
    expect(typeof (window as any).AutoCardUpdaterV2API?.refreshVisualizer).toBe('function');

    await (window as any).AutoCardUpdaterV2API.refreshVisualizer();
    await bridge.openVisualizerSurface_ACU({ source: 'external-api' });
    await (window as any).AutoCardUpdaterV2API.refreshVisualizer();
    await Promise.resolve();

    const pinia = mount.getAcuV2PiniaForBridge();
    expect(pinia).not.toBeNull();
    expect(useVisualizerStore(pinia!).externalRefreshTick).toBe(1);
    mount.__resetAcuV2MountForTests();
  });

  it('载入当前数据后可编辑卡片并拦截 dirty 关闭', async () => {
    persistAdvancedMode();
    const state = await import('../../../src/service/runtime/state-manager');
    state._set_currentJsonTableData_ACU({
      mate: { type: 'chatSheets', version: 1 },
      sheet_a: {
        uid: 'sheet_a',
        name: '角色状态',
        orderNo: 0,
        content: [[null, '姓名', '状态'], [null, 'A', '平静']],
      },
    });
    const bridge = await import('../../../src/presentation-v2/surfaces/visualizer/open-visualizer-surface');
    const mount = await import('../../../src/presentation-v2/bootstrap/mount');
    const { useVisualizerStore } = await import('../../../src/presentation-v2/stores/visualizer-store');

    await bridge.openVisualizerSurface_ACU({ source: 'external-api' });
    await new Promise(r => setTimeout(r, 0));

    const surface = document.querySelector('[data-acu-visualizer-surface]') as HTMLElement;
    expect(surface.textContent).toContain('角色状态');
    expect(surface.textContent).toContain('1 行 · 2 列');

    const textareas = Array.from(surface.querySelectorAll<HTMLTextAreaElement>('textarea'));
    const statusTextarea = textareas.find(item => item.value === '平静')!;
    statusTextarea.value = '紧张';
    statusTextarea.dispatchEvent(new Event('input', { bubbles: true }));
    await Promise.resolve();

    const pinia = mount.getAcuV2PiniaForBridge();
    const visualizer = useVisualizerStore(pinia!);
    expect(visualizer.dirty).toBe(true);
    expect(visualizer.currentSheet.content[1][2]).toBe('紧张');

    (document.querySelector('.acu-v2-app__close') as HTMLButtonElement).click();
    await Promise.resolve();

    expect(document.body.textContent).toContain('关闭数据库编辑器');
    const cancelButton = Array.from(document.querySelectorAll<HTMLButtonElement>('button'))
      .find(button => button.textContent?.includes('取消关闭'));
    expect(cancelButton).not.toBeUndefined();
    cancelButton!.click();
    await Promise.resolve();

    expect(document.getElementById('acu-app-v2')?.style.display).toBe('');
    expect(document.querySelector('[data-acu-visualizer-surface]')).not.toBeNull();
    mount.__resetAcuV2MountForTests();
  });

  it('可进入结构参数和全局注入配置面板', async () => {
    persistAdvancedMode();
    const state = await import('../../../src/service/runtime/state-manager');
    state._set_currentJsonTableData_ACU({
      mate: { type: 'chatSheets', version: 1 },
      sheet_a: {
        uid: 'sheet_a',
        name: '角色状态',
        orderNo: 0,
        content: [[null, '姓名', '状态'], [null, 'A', '平静']],
        sourceData: { note: '角色状态说明' },
        updateConfig: {},
        exportConfig: {},
      },
    });
    const bridge = await import('../../../src/presentation-v2/surfaces/visualizer/open-visualizer-surface');
    const mount = await import('../../../src/presentation-v2/bootstrap/mount');

    await bridge.openVisualizerSurface_ACU({ source: 'external-api' });
    await new Promise(r => setTimeout(r, 0));

    const configTab = Array.from(document.querySelectorAll<HTMLButtonElement>('button'))
      .find(button => button.textContent?.includes('结构/参数'));
    expect(configTab).not.toBeUndefined();
    configTab!.click();
    await Promise.resolve();

    expect(document.querySelector('[data-acu-visualizer-config]')?.textContent).toContain('自动化更新参数');
    expect(document.querySelector('[data-acu-visualizer-config]')?.textContent).toContain('世界书注入配置');

    const globalButton = Array.from(document.querySelectorAll<HTMLButtonElement>('button'))
      .find(button => button.textContent?.includes('全局注入配置'));
    expect(globalButton).not.toBeUndefined();
    globalButton!.click();
    await Promise.resolve();

    expect(document.querySelector('[data-acu-visualizer-global]')?.textContent).toContain('可读数据条目位置');
    mount.__resetAcuV2MountForTests();
  });

  it('可进入 AI 助手面板并展示锚点表与风险说明', async () => {
    persistAdvancedMode();
    const state = await import('../../../src/service/runtime/state-manager');
    state._set_currentJsonTableData_ACU({
      mate: { type: 'chatSheets', version: 1 },
      sheet_a: {
        uid: 'sheet_a',
        name: '角色状态',
        orderNo: 0,
        content: [[null, '姓名', '状态'], [null, 'A', '平静']],
        sourceData: { note: '角色状态说明' },
        updateConfig: {},
        exportConfig: {},
      },
    });
    const bridge = await import('../../../src/presentation-v2/surfaces/visualizer/open-visualizer-surface');
    const mount = await import('../../../src/presentation-v2/bootstrap/mount');

    await bridge.openVisualizerSurface_ACU({ source: 'external-api' });
    await new Promise(r => setTimeout(r, 0));

    const assistantTab = Array.from(document.querySelectorAll<HTMLButtonElement>('button'))
      .find(button => button.textContent?.includes('AI 助手'));
    expect(assistantTab).not.toBeUndefined();
    assistantTab!.click();
    await Promise.resolve();

    const panel = document.querySelector('[data-acu-visualizer-assistant]');
    expect(panel?.textContent).toContain('AI 改表助手');
    expect(panel?.textContent).toContain('当前锚点表：角色状态 (sheet_a)');
    expect(panel?.textContent).toContain('风险项');
    mount.__resetAcuV2MountForTests();
  });

  it('切换表格时会把当前导航项滚入可见区域', async () => {
    persistAdvancedMode();
    const scrollIntoView = vi.fn();
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: scrollIntoView,
    });
    const state = await import('../../../src/service/runtime/state-manager');
    state._set_currentJsonTableData_ACU({
      mate: { type: 'chatSheets', version: 1 },
      sheet_a: {
        uid: 'sheet_a',
        name: '角色状态',
        orderNo: 0,
        content: [[null, '姓名'], [null, 'A']],
      },
      sheet_b: {
        uid: 'sheet_b',
        name: '事件记录',
        orderNo: 1,
        content: [[null, '事项'], [null, '旧值']],
      },
    });
    const bridge = await import('../../../src/presentation-v2/surfaces/visualizer/open-visualizer-surface');
    const mount = await import('../../../src/presentation-v2/bootstrap/mount');

    await bridge.openVisualizerSurface_ACU({ source: 'external-api' });
    await new Promise(r => setTimeout(r, 0));
    scrollIntoView.mockClear();

    const sheetButton = Array.from(document.querySelectorAll<HTMLButtonElement>('button'))
      .find(button => button.textContent?.includes('事件记录'));
    expect(sheetButton).not.toBeUndefined();
    sheetButton!.click();
    await new Promise(r => setTimeout(r, 0));

    expect(scrollIntoView).toHaveBeenCalledWith({
      block: 'nearest',
      inline: 'nearest',
    });
    mount.__resetAcuV2MountForTests();
  });

  it('VZ-5 响应式布局有桌面、平板、手机三档和 AI 非常驻结构', () => {
    const surfaceSource = readFileSync(
      join(process.cwd(), 'src/presentation-v2/surfaces/visualizer/VisualizerSurface.vue'),
      'utf8',
    );
    const assistantSource = readFileSync(
      join(process.cwd(), 'src/presentation-v2/surfaces/visualizer/VisualizerAssistantPanel.vue'),
      'utf8',
    );

    expect(surfaceSource).toContain('@media (max-width: 1024px)');
    expect(surfaceSource).toContain('@media (max-width: 767px)');
    expect(surfaceSource).toContain('@media (max-width: 480px)');
    expect(surfaceSource).toContain('scroll-snap-type: x proximity');
    expect(surfaceSource).toContain('grid-template-columns: repeat(auto-fill, minmax(min(100%, 420px), 420px))');
    expect(surfaceSource).toContain('acu-visualizer-surface__footer-actions :deep(.acu-btn)');
    expect(assistantSource).toContain('AcuDisclosureGroup');
    expect(assistantSource).toContain('body-max-height="min(72vh, 680px)"');
    expect(assistantSource).toContain('@media (max-width: 480px)');
  });
});
