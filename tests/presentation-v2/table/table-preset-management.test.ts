/**
 * useTablePresetManagement — 表格模板预设管理行为
 *
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

async function importManagement() {
  vi.resetModules();
  const deleteTemplatePreset = vi.fn(() => true);
  const applyTemplatePresetToCurrent = vi.fn(async () => ({ presetName: '', isDefault: true }));

  vi.doMock('../../../src/service/template/template-preset-service', () => ({
    applyTemplatePresetToCurrent_ACU: applyTemplatePresetToCurrent,
    deleteTemplatePreset_ACU: deleteTemplatePreset,
    ensureUniqueTemplatePresetName_ACU: (name: string) => name,
    getDefaultTemplateSnapshot_ACU: () => ({ templateStr: '{"mate":{"type":"chatSheets"},"sheet_a":{"name":"A","content":[],"sourceData":{}}}' }),
    getTemplatePreset_ACU: () => ({ templateStr: '{}' }),
    listTemplatePresetNames_ACU: () => ['global-A', 'global-B'],
    resolveActiveTemplatePresetName_ACU: () => 'global-A',
    resolveTemplateForExport_ACU: () => ({ jsonData: {}, fromPresetName: 'global-A' }),
    upsertTemplatePreset_ACU: vi.fn(() => true),
  }));
  vi.doMock('../../../src/service/template/chat-scope', () => ({
    sanitizeChatSheetsObject_ACU: (value: any) => value,
  }));
  vi.doMock('../../../src/shared/template-preset-utils', () => ({
    sanitizeFilenameComponent_ACU: (value: string) => value,
    normalizeTemplatePresetSelectionValue_ACU: (value: unknown) => String(value ?? '').trim(),
    getCurrentTemplatePresetName_ACU: () => 'global-A',
  }));
  vi.doMock('../../../src/service/runtime/state-manager', () => ({
    settings_ACU: { currentTemplatePresetName: 'global-A' },
  }));
  vi.doMock('../../../src/shared/env', () => ({
    topLevelWindow_ACU: {},
  }));

  const { useTablePresetManagement } = await import('../../../src/presentation-v2/composables/useTablePresetManagement');
  return {
    management: useTablePresetManagement(),
    deleteTemplatePreset,
    applyTemplatePresetToCurrent,
  };
}

beforeEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('useTablePresetManagement', () => {
  it('删除当前选中预设后，将全局默认和当前聊天回退到默认预设', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const { management, deleteTemplatePreset, applyTemplatePresetToCurrent } = await importManagement();

    await management.deletePreset('global-A');

    expect(deleteTemplatePreset).toHaveBeenCalledWith('global-A');
    expect(applyTemplatePresetToCurrent).toHaveBeenCalledWith('', expect.objectContaining({
      updateGlobal: true,
      persistChatScope: false,
    }));
    expect(applyTemplatePresetToCurrent).toHaveBeenCalledWith('', expect.objectContaining({
      updateGlobal: false,
      persistChatScope: true,
    }));
  });
});
