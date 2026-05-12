/**
 * theme-store — 新 UI 主题状态（D14 / D16 / P0-4）
 *
 * 设计要点：
 * - 内置主题 id 不可变，切换主题 = 切 activeId
 * - 持久化走 acu_v2_ui_state.theme（独立于旧 settings_ACU）
 * - 切换 / 初始化时通过订阅触发 theme-injector 把 tokens 写到 host document
 *   的 <style id="acu-v2-theme">；注入逻辑放 theme-injector.ts，store 只发数据
 */
import { defineStore } from 'pinia';
import {
  ACU_V2_BUILTIN_THEMES,
  ACU_V2_DEFAULT_THEME_ID,
} from '../theme/builtin-themes';
import type { AcuV2Theme, AcuV2ThemeId } from '../theme/theme-types';
import { readSection, writeSection } from './persistence';

const SECTION_KEY = 'theme';

interface PersistedTheme {
  activeId: AcuV2ThemeId;
}

interface ThemeState {
  activeId: AcuV2ThemeId;
}

function isValidId(id: unknown): id is AcuV2ThemeId {
  return typeof id === 'string' && ACU_V2_BUILTIN_THEMES.some(t => t.id === id);
}

function readInitialId(): AcuV2ThemeId {
  const persisted = readSection<PersistedTheme>(SECTION_KEY);
  if (persisted && isValidId(persisted.activeId)) return persisted.activeId;
  return ACU_V2_DEFAULT_THEME_ID;
}

export const useThemeStore = defineStore('acu-v2-theme', {
  state: (): ThemeState => ({ activeId: readInitialId() }),
  getters: {
    themes: (): readonly AcuV2Theme[] => ACU_V2_BUILTIN_THEMES,
    activeTheme(state): AcuV2Theme {
      const found = ACU_V2_BUILTIN_THEMES.find(t => t.id === state.activeId);
      // 启动时从 localStorage 读到合法 id；不存在的 id 不会被 isValidId 放进 state，
      // 所以这里走 fallback 仅是兜底（手动篡改 storage 之类）
      return found ?? ACU_V2_BUILTIN_THEMES[0];
    },
  },
  actions: {
    setTheme(id: AcuV2ThemeId): void {
      if (!isValidId(id)) return;
      if (this.activeId === id) return;
      this.activeId = id;
      this.persist();
    },
    persist(): void {
      writeSection(SECTION_KEY, { activeId: this.activeId } satisfies PersistedTheme);
    },
  },
});
