import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useVisualizerStore } from '../../../src/presentation-v2/stores/visualizer-store';

describe('visualizer-store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('记录进入来源并在关闭时返回 shell 处理信息', () => {
    const store = useVisualizerStore();

    store.open({
      source: 'external-api',
      wasShellOpen: false,
      previousPageId: 'form-fill',
    });

    expect(store.isActive).toBe(true);
    expect(store.mode).toBe('data');
    expect(store.openTick).toBe(1);

    const result = store.closeSurface();

    expect(result).toEqual({
      shouldCloseShell: true,
      previousPageId: 'form-fill',
    });
    expect(store.isActive).toBe(false);
  });

  it('重复打开复用现有 surface，干净状态下记录一次刷新请求', () => {
    const store = useVisualizerStore();

    store.open({
      source: 'external-api',
      wasShellOpen: true,
      previousPageId: 'dashboard',
    });
    store.open({
      source: 'external-api',
      wasShellOpen: false,
      previousPageId: null,
    });

    expect(store.openTick).toBe(1);
    expect(store.focusTick).toBe(2);
    expect(store.externalRefreshTick).toBe(1);
  });

  it('外部刷新在 dirty 状态下转为冲突标记', () => {
    const store = useVisualizerStore();
    store.open({
      source: 'external-api',
      wasShellOpen: true,
      previousPageId: 'dashboard',
    });
    store.setDirty(true);

    expect(store.requestExternalRefresh()).toBe('conflicted');
    expect(store.externalRevisionChanged).toBe(true);
    expect(store.externalRefreshTick).toBe(0);
  });

  it('载入工作副本后支持切表、编辑单元格和 dirty 标记', () => {
    const store = useVisualizerStore();

    store.loadSnapshot({
      mate: { type: 'chatSheets', version: 1 },
      sheet_b: { name: '事件记录', orderNo: 1, content: [[null, '事项'], [null, '旧值']] },
      sheet_a: { name: '角色状态', orderNo: 0, content: [[null, '姓名', '状态'], [null, 'A', '平静']] },
    }, ['sheet_a', 'sheet_b']);

    expect(store.sheetItems.map(item => item.name)).toEqual(['角色状态', '事件记录']);
    expect(store.currentSheetKey).toBe('sheet_a');
    expect(store.dirty).toBe(false);

    store.updateCell(0, 1, '紧张');

    expect(store.currentSheet.content[1][2]).toBe('紧张');
    expect(store.dirty).toBe(true);
  });

  it('新增、删除和排序表格会维护顺序与删除队列', () => {
    const store = useVisualizerStore();
    store.loadSnapshot({
      sheet_a: { name: 'A', orderNo: 0, content: [[null, '列1']] },
      sheet_b: { name: 'B', orderNo: 1, content: [[null, '列1']] },
    }, ['sheet_a', 'sheet_b']);

    store.addSheet('sheet_c', { name: 'C', content: [[null, '列1']] });
    expect(store.sheetOrder).toEqual(['sheet_a', 'sheet_b', 'sheet_c']);
    expect(store.currentSheetKey).toBe('sheet_c');

    store.moveSheet('sheet_c', 'up');
    expect(store.sheetOrder).toEqual(['sheet_a', 'sheet_c', 'sheet_b']);
    expect(store.tempData?.sheet_c.orderNo).toBe(1);

    store.deleteSheet('sheet_c');
    expect(store.sheetOrder).toEqual(['sheet_a', 'sheet_b']);
    expect(store.deletedSheetKeys).toEqual(['sheet_c']);
    expect(store.dirty).toBe(true);
  });
});
