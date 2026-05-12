/**
 * SqlConsolePage 集成 — SQL 控制台页布局、执行与历史
 *
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const STORAGE_KEY = 'acu_v2_ui_state';

async function mountSqlConsolePage(opts: {
  queryResult?: { columns: string[]; values: any[][]; rowCount: number };
  mutationResult?: { changes: number; errors: string[] };
} = {}) {
  vi.resetModules();
  document.body.innerHTML = '';
  document.head.innerHTML = '';
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ router: { activePageId: 'sql-console' } }));

  const executeQuery = vi.fn(() => opts.queryResult ?? {
    columns: ['name'],
    values: [['背包物品表']],
    rowCount: 1,
  });
  const executeMutation = vi.fn(() => opts.mutationResult ?? { changes: 1, errors: [] });
  const getStorageProvider = vi.fn(() => ({
    executeQuery,
    executeMutation,
  }));

  vi.doMock('../../../src/service/runtime/state-manager', () => ({
    settings_ACU: {
      storageMode: 'sqlite',
      plotSettings: { enabled: false },
      summaryVectorIndexModeDefault: false,
    },
    currentJsonTableData_ACU: {},
    currentChatFileIdentifier_ACU: 'chat-sql',
    coreApisAreReady_ACU: true,
    getCurrentIsolationKey_ACU: () => '',
  }));
  vi.doMock('../../../src/service/table/storage-mode', () => ({
    isSqliteMode: () => true,
    getCurrentStorageMode: () => 'sqlite',
  }));
  vi.doMock('../../../src/service/table/table-storage-strategy', () => ({
    getStorageProvider,
  }));

  const sqlConsole = await import('../../../src/presentation-v2/composables/useSqlConsole');
  sqlConsole.__resetSqlConsoleHistoryForTests();

  const mount = await import('../../../src/presentation-v2/bootstrap/mount');
  await mount.openAcuV2App();
  await new Promise(r => setTimeout(r, 0));

  return {
    mount,
    executeQuery,
    executeMutation,
    getStorageProvider,
  };
}

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('SqlConsolePage', () => {
  it('渲染 SQL 控制台双栏面板，header 只放状态徽章', async () => {
    const { mount } = await mountSqlConsolePage();

    const page = document.querySelector('.acu-v2-sql-console-page');
    expect(page).not.toBeNull();
    const text = page!.textContent || '';
    expect(text).toContain('SQL 控制台');
    expect(text).toContain('编辑与执行');
    expect(text).toContain('执行历史');
    expect(text).toContain('结果');
    expect(text).toContain('结果与执行历史');
    expect(text).toContain('SQLite 模式');

    const header = page!.querySelector('.acu-page-header');
    expect(header).not.toBeNull();
    expect(header!.querySelector('button')).toBeNull();
    expect(header!.querySelector('.acu-toggle')).toBeNull();

    mount.__resetAcuV2MountForTests();
  });

  it('每个面板都渲染常驻说明信息条', async () => {
    const { mount } = await mountSqlConsolePage();

    const panels = document.querySelectorAll('.acu-v2-sql-console-page .acu-panel');
    expect(panels.length).toBe(2);
    panels.forEach(panel => {
      expect(panel.querySelector('.acu-panel__body .acu-info-banner')).not.toBeNull();
      expect(panel.querySelector('.acu-panel__header .acu-info-banner')).toBeNull();
    });

    mount.__resetAcuV2MountForTests();
  });

  it('输入 SELECT 后执行，展示查询表格并记录历史', async () => {
    const { mount, executeQuery } = await mountSqlConsolePage({
      queryResult: {
        columns: ['id', 'name'],
        values: [[1, '药水']],
        rowCount: 1,
      },
    });

    const textarea = document.querySelector<HTMLTextAreaElement>('.acu-v2-sql-console-page textarea');
    expect(textarea).not.toBeNull();
    textarea!.value = 'SELECT id, name FROM item;';
    textarea!.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise(r => setTimeout(r, 0));

    const executeButton = Array.from(document.querySelectorAll<HTMLButtonElement>('.acu-v2-sql-console-page button'))
      .find(button => button.textContent?.includes('执行'));
    expect(executeButton).not.toBeUndefined();
    executeButton!.click();
    await new Promise(r => setTimeout(r, 0));

    expect(executeQuery).toHaveBeenCalledWith('SELECT id, name FROM item;');
    const text = document.querySelector('.acu-v2-sql-console-page')?.textContent || '';
    expect(text).toContain('药水');
    expect(text).toContain('1 行');
    expect(text).toContain('成功');
    expect(document.querySelector('.acu-v2-sql-console-page__history-item')).not.toBeNull();

    mount.__resetAcuV2MountForTests();
  });

  it('快捷查看所有表会填入 SQL 并立即执行', async () => {
    const { mount, executeQuery } = await mountSqlConsolePage();

    const showTablesButton = Array.from(document.querySelectorAll<HTMLButtonElement>('.acu-v2-sql-console-page button'))
      .find(button => button.textContent?.includes('查看所有表'));
    expect(showTablesButton).not.toBeUndefined();
    showTablesButton!.click();
    await new Promise(r => setTimeout(r, 0));

    expect(executeQuery).toHaveBeenCalledWith(expect.stringContaining("sqlite_master"));
    const textarea = document.querySelector<HTMLTextAreaElement>('.acu-v2-sql-console-page textarea');
    expect(textarea?.value).toContain("sqlite_master");
    expect(document.querySelector('.acu-v2-sql-console-page')?.textContent || '').toContain('背包物品表');

    mount.__resetAcuV2MountForTests();
  });

  it('执行变更失败时展示错误结果', async () => {
    const { mount, executeMutation } = await mountSqlConsolePage({
      mutationResult: { changes: 0, errors: ['no such table: item'] },
    });

    const textarea = document.querySelector<HTMLTextAreaElement>('.acu-v2-sql-console-page textarea')!;
    textarea.value = "UPDATE item SET name = 'x';";
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise(r => setTimeout(r, 0));

    const executeButton = Array.from(document.querySelectorAll<HTMLButtonElement>('.acu-v2-sql-console-page button'))
      .find(button => button.textContent?.includes('执行'));
    executeButton!.click();
    await new Promise(r => setTimeout(r, 0));

    expect(executeMutation).toHaveBeenCalledWith("UPDATE item SET name = 'x';");
    const text = document.querySelector('.acu-v2-sql-console-page')?.textContent || '';
    expect(text).toContain('no such table: item');
    expect(text).toContain('失败');

    mount.__resetAcuV2MountForTests();
  });
});
