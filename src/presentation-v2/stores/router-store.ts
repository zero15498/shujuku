/**
 * router-store — 一级页路由（D18 / P0-3 / P0-6）
 *
 * 设计要点：
 * - 不引 vue-router；activePageId 直接驱动主区 <component :is>
 * - sidebar 数据驱动：`visiblePages` 按可见性过滤注册表
 * - P0-6：activePageId 持久化到 acu_v2_ui_state.router；关闭后再开保留页面
 *   抽屉 / 滚动是页面内部状态，不在路由层处理（关闭/重开不持久化）
 */
import { defineStore } from 'pinia';
import {
  ACU_V2_DEFAULT_PAGE_ID,
  ACU_V2_PAGE_REGISTRY,
  FEATURE_GATE_CONTENT_REPLACE,
  FEATURE_GATE_PLOT,
  FEATURE_GATE_VECTOR_INDEX,
} from '../router/page-registry';
import type { AcuV2Page, AcuV2PageGroup } from '../router/page-types';
import { ACU_V2_PAGE_GROUPS } from '../router/page-types';
import { readSection, writeSection } from './persistence';
import { settings_ACU } from '../../service/runtime/state-manager';

const SECTION_KEY = 'router';

interface PersistedRouter {
  activePageId: string;
}

interface RouterState {
  activePageId: string;
  isSqliteMode: boolean;
  /** D7 / 4.1 中"默认隐藏 / 受控开启"feature gate 的开关表。 */
  featureGates: Record<string, boolean>;
}

function isKnownPage(id: unknown): id is string {
  return typeof id === 'string' && ACU_V2_PAGE_REGISTRY.some(p => p.id === id);
}

function readInitialFeatureGates(): Record<string, boolean> {
  return {
    [FEATURE_GATE_CONTENT_REPLACE]: settings_ACU?.contentOptimizationSettings?.enabled === true,
    [FEATURE_GATE_PLOT]: settings_ACU?.plotSettings?.enabled === true,
    [FEATURE_GATE_VECTOR_INDEX]: settings_ACU?.summaryVectorIndexModeDefault === true,
  };
}

function readInitialSqliteMode(): boolean {
  return settings_ACU?.storageMode === 'sqlite';
}

function readInitialActiveId(featureGates: Record<string, boolean>, isSqliteMode: boolean): string {
  const persisted = readSection<PersistedRouter>(SECTION_KEY);
  if (persisted && isKnownPage(persisted.activePageId)) {
    const page = ACU_V2_PAGE_REGISTRY.find(p => p.id === persisted.activePageId);
    const initialState: RouterState = {
      activePageId: persisted.activePageId,
      isSqliteMode,
      featureGates,
    };
    if (page && isPageVisible(page, initialState)) return persisted.activePageId;
  }
  return ACU_V2_DEFAULT_PAGE_ID;
}

function isPageVisible(page: AcuV2Page, state: RouterState): boolean {
  if (page.requiresSqlite && !state.isSqliteMode) return false;
  if (page.featureGate && !state.featureGates[page.featureGate]) return false;
  if (page.visibleWhen && !page.visibleWhen()) return false;
  return true;
}

export const useRouterStore = defineStore('acu-v2-router', {
  state: (): RouterState => {
    const featureGates = readInitialFeatureGates();
    const isSqliteMode = readInitialSqliteMode();
    return {
      activePageId: readInitialActiveId(featureGates, isSqliteMode),
      isSqliteMode,
      featureGates,
    };
  },
  getters: {
    pageRegistry: (): readonly AcuV2Page[] => ACU_V2_PAGE_REGISTRY,
    groups: (): typeof ACU_V2_PAGE_GROUPS => ACU_V2_PAGE_GROUPS,
    visiblePages(state): AcuV2Page[] {
      return ACU_V2_PAGE_REGISTRY.filter(p => isPageVisible(p, state));
    },
    visiblePagesByGroup(): Record<AcuV2PageGroup, AcuV2Page[]> {
      const out: Record<AcuV2PageGroup, AcuV2Page[]> = {
        overview: [],
        config: [],
        feature: [],
        tool: [],
        developer: [],
      };
      for (const page of this.visiblePages) {
        out[page.group].push(page);
      }
      return out;
    },
    activePage(state): AcuV2Page | null {
      return ACU_V2_PAGE_REGISTRY.find(p => p.id === state.activePageId) ?? null;
    },
  },
  actions: {
    setActivePage(id: string): void {
      const target = ACU_V2_PAGE_REGISTRY.find(p => p.id === id);
      if (!target) return;
      // 切到当前不可见的页（如关闭了 SQLite 模式后又试图回到 SQL 控制台）
      // 时拒绝切换，让 sidebar 保持一致状态
      if (!isPageVisible(target, this)) return;
      this.activePageId = id;
      this.persist();
    },
    setSqliteMode(on: boolean): void {
      this.isSqliteMode = on;
      this.ensureActiveVisible();
    },
    setFeatureGate(key: string, on: boolean): void {
      this.featureGates = { ...this.featureGates, [key]: on };
      this.ensureActiveVisible();
    },
    /** 当前页变成不可见时回退到默认页。 */
    ensureActiveVisible(): void {
      const current = this.activePage;
      if (current && isPageVisible(current, this)) return;
      this.activePageId = ACU_V2_DEFAULT_PAGE_ID;
      this.persist();
    },
    persist(): void {
      writeSection(SECTION_KEY, { activePageId: this.activePageId } satisfies PersistedRouter);
    },
  },
});
