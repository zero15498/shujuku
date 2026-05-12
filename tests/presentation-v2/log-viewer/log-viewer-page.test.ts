/**
 * LogViewerPage 集成 — 运行日志页布局、筛选与实时订阅
 *
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const STORAGE_KEY = 'acu_v2_ui_state';

async function waitForUi(ms = 0) {
  await new Promise(r => setTimeout(r, ms));
}

async function mountLogViewerPage(seedLogs = true) {
  vi.resetModules();
  document.body.innerHTML = '';
  document.head.innerHTML = '';
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ router: { activePageId: 'log-viewer' } }));

  const logBuffer = await import('../../../src/shared/log-buffer');
  logBuffer._resetForTesting();
  if (seedLogs) {
    logBuffer.setDebugLogEnabled(true);
    logBuffer.pushLog('debug', ['[ACU]', '[调试] Debug 初始化日志']);
    logBuffer.pushLog('warn', ['[ACU]', '[SQL] 警告日志']);
    logBuffer.pushLog('error', ['[ACU]', '[导入] 错误日志']);
    logBuffer.setDebugLogEnabled(false);
  }

  vi.stubGlobal('URL', {
    createObjectURL: vi.fn(() => 'blob:acu-log-test'),
    revokeObjectURL: vi.fn(),
  });
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);

  const mount = await import('../../../src/presentation-v2/bootstrap/mount');
  await mount.openAcuV2App();
  await waitForUi();

  return {
    mount,
    logBuffer,
  };
}

function getPage(): HTMLElement {
  const page = document.querySelector<HTMLElement>('.acu-v2-log-viewer-page');
  expect(page).not.toBeNull();
  return page!;
}

function findButton(label: string): HTMLButtonElement {
  const button = Array.from(document.querySelectorAll<HTMLButtonElement>('.acu-v2-log-viewer-page button'))
    .find(el => el.textContent?.includes(label));
  expect(button).not.toBeUndefined();
  return button!;
}

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('LogViewerPage', () => {
  it('渲染运行日志双栏面板，header 只放状态徽章', async () => {
    const { mount } = await mountLogViewerPage();

    const page = getPage();
    const text = page.textContent || '';
    expect(text).toContain('运行日志');
    expect(text).toContain('筛选与采集');
    expect(text).toContain('采集状态');
    expect(text).toContain('日志流');
    expect(text).toContain('错误日志');
    expect(text).toContain('警告日志');
    expect(text).not.toContain('缓冲区状态');

    const panels = document.querySelectorAll('.acu-v2-log-viewer-page .acu-panel');
    expect(panels.length).toBe(2);
    panels.forEach(panel => {
      expect(panel.querySelector('.acu-panel__body .acu-info-banner')).not.toBeNull();
      expect(panel.querySelector('.acu-panel__header .acu-info-banner')).toBeNull();
    });

    const header = page.querySelector('.acu-page-header');
    expect(header).not.toBeNull();
    expect(header!.querySelector('button')).toBeNull();
    expect(header!.querySelector('.acu-toggle')).toBeNull();
    expect(header!.textContent || '').toContain('实时更新中');

    mount.__resetAcuV2MountForTests();
  });

  it('按级别和关键词筛选日志列表', async () => {
    const { mount } = await mountLogViewerPage();

    const levelSelect = document.querySelector<HTMLElement>('.acu-v2-log-viewer-page .acu-select');
    expect(levelSelect).not.toBeNull();
    levelSelect!.querySelector<HTMLButtonElement>('.acu-select__trigger')!.click();
    await waitForUi();
    const errorItem = Array.from(levelSelect!.querySelectorAll<HTMLElement>('.acu-select__item'))
      .find(item => item.textContent?.trim() === 'Error');
    expect(errorItem).not.toBeUndefined();
    errorItem!.click();
    await waitForUi();

    let text = document.querySelector('.acu-v2-log-viewer-page__log-list')?.textContent || '';
    expect(text).toContain('错误日志');
    expect(text).not.toContain('警告日志');

    const search = document.querySelector<HTMLInputElement>('.acu-v2-log-viewer-page input');
    expect(search).not.toBeNull();
    search!.value = '不存在的关键词';
    search!.dispatchEvent(new Event('input', { bubbles: true }));
    await waitForUi();

    text = document.querySelector('.acu-v2-log-viewer-page__log-list')?.textContent || '';
    expect(text).toContain('暂无匹配日志');

    mount.__resetAcuV2MountForTests();
  });

  it('暂停时新日志进入积压，恢复后刷新显示', async () => {
    const { mount, logBuffer } = await mountLogViewerPage(false);

    findButton('暂停').click();
    await waitForUi();
    logBuffer.pushLog('warn', ['[ACU]', '[暂停测试] 暂停期间新增']);
    await waitForUi(30);

    let pageText = getPage().textContent || '';
    expect(pageText).toContain('1 条暂停期间新增日志等待显示');
    expect(document.querySelector('.acu-v2-log-viewer-page__log-list')?.textContent || '').not.toContain('暂停期间新增');

    findButton('恢复').click();
    await waitForUi();

    pageText = getPage().textContent || '';
    expect(pageText).toContain('暂停期间新增');
    expect(pageText).toContain('实时更新中');

    mount.__resetAcuV2MountForTests();
  });

  it('Debug 采集开关会控制 debug 日志进入缓冲区', async () => {
    const { mount, logBuffer } = await mountLogViewerPage(false);

    logBuffer.pushLog('debug', ['[ACU]', '[调试] 不应出现']);
    await waitForUi(30);
    expect(getPage().textContent || '').not.toContain('不应出现');

    const debugToggle = Array.from(document.querySelectorAll<HTMLButtonElement>('.acu-v2-log-viewer-page .acu-toggle'))
      .find(button => button.textContent?.includes('采集 Debug 日志'));
    expect(debugToggle).not.toBeUndefined();
    debugToggle!.click();
    await waitForUi();

    logBuffer.pushLog('debug', ['[ACU]', '[调试] Debug 已采集']);
    await waitForUi(30);

    const text = getPage().textContent || '';
    expect(text).toContain('Debug 已采集');
    expect(text).toContain('Debug 采集中');

    mount.__resetAcuV2MountForTests();
  });

  it('清空与导出使用当前筛选后的日志数据', async () => {
    const { mount, logBuffer } = await mountLogViewerPage(false);
    logBuffer.clearLogs();
    logBuffer.setDebugLogEnabled(true);
    logBuffer.pushLog('debug', ['[ACU]', '[调试] Debug 导出日志']);
    logBuffer.pushLog('warn', ['[ACU]', '[SQL] 警告导出日志']);
    logBuffer.pushLog('error', ['[ACU]', '[导入] 错误导出日志']);
    logBuffer.setDebugLogEnabled(false);
    await waitForUi(30);

    findButton('导出当前结果').click();
    await waitForUi();
    expect(URL.createObjectURL).toHaveBeenCalled();
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalled();
    expect(getPage().textContent || '').toContain('已导出 3 条日志');

    findButton('清空日志').click();
    await waitForUi();
    const text = getPage().textContent || '';
    expect(text).toContain('日志缓冲区已清空');
    expect(text).toContain('暂无匹配日志');

    mount.__resetAcuV2MountForTests();
  });
});
