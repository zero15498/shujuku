import { computed, ref, type ComputedRef, type Ref } from 'vue';
import { getChatArray_ACU } from '../../service/chat/chat-service';
import {
  coreApisAreReady_ACU,
  currentChatFileIdentifier_ACU,
  currentJsonTableData_ACU,
  getCurrentIsolationKey_ACU,
  settings_ACU,
} from '../../service/runtime/state-manager';
import { saveSettings_ACU, setGlobalPlotEnabled_ACU, setSummaryVectorIndexMode_ACU, setZeroTkOccupyMode_ACU } from '../../service/settings/settings-service';
import { getSortedSheetKeys_ACU } from '../../service/template/chat-scope';
import { getActiveTemplatePresetMeta_ACU } from '../../service/template/template-preset-service';
import { getCurrentStorageMode } from '../../service/table/storage-mode';
import { switchStorageMode } from '../../service/table/table-storage-strategy';
import { resolveTableHistoryStateFromChat_ACU } from '../../service/table/table-history';
import { DEFAULT_CHAR_CARD_PROMPT_ACU, DEFAULT_CHAR_CARD_PROMPT_SQL_ACU } from '../../shared/defaults-json.js';
import type { StorageMode } from '../../shared/table-storage-provider';
import { isSummaryOrOutlineTable_ACU, normalizeNonNegativeInteger_ACU, normalizePositiveInteger_ACU } from '../../shared/utils';
import { CONTENT_REPLACE_UNLOCK_MAX_RETRIES } from '../router/page-registry';

type MessageKind = 'info' | 'success' | 'warning' | 'error';

export interface DashboardStatsItem {
  label: string;
  value: string | number;
  key?: string;
}

export interface DashboardTableStatusRow {
  key: string;
  name: string;
  frequencyLabel: string;
  unrecordedLabel: string;
  lastUpdatedLabel: string;
  nextTriggerLabel: string;
  ready: boolean;
  disabled: boolean;
}

export interface DashboardMessage {
  kind: MessageKind;
  text: string;
}

export interface DashboardToggleItem {
  key: string;
  label: string;
  description: string;
  value: boolean;
}

export interface DashboardStorageOption {
  value: StorageMode;
  label: string;
  description: string;
}

export interface DashboardPageState {
  chatFileIdentifier: Ref<string>;
  coreApisReady: Ref<boolean>;
  isolationKey: Ref<string>;
  storageMode: Ref<StorageMode>;
  storageMessage: Ref<DashboardMessage | null>;
  storageOptions: DashboardStorageOption[];
  stats: ComputedRef<DashboardStatsItem[]>;
  tableRows: ComputedRef<DashboardTableStatusRow[]>;
  nextUpdateText: ComputedRef<string>;
  hasTables: ComputedRef<boolean>;
  basicToggles: ComputedRef<DashboardToggleItem[]>;
  featureToggles: ComputedRef<DashboardToggleItem[]>;
  advancedToggles: ComputedRef<DashboardToggleItem[]>;
  contentReplaceGateEnabled: ComputedRef<boolean>;
  contentReplaceToggleVisible: ComputedRef<boolean>;
  refresh: () => Promise<void>;
  setToggle: (key: string, value: boolean) => void;
  setStorageMode: (mode: string) => Promise<void>;
}

interface Snapshot {
  chatFileIdentifier: string;
  coreApisReady: boolean;
  isolationKey: string;
  storageMode: StorageMode;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value ?? null));
}

function safeReadSnapshot(): Snapshot {
  try {
    return {
      chatFileIdentifier: String(currentChatFileIdentifier_ACU || ''),
      coreApisReady: coreApisAreReady_ACU === true,
      isolationKey: String(getCurrentIsolationKey_ACU?.() || ''),
      storageMode: getCurrentStorageMode(),
    };
  } catch {
    return {
      chatFileIdentifier: '',
      coreApisReady: false,
      isolationKey: '',
      storageMode: 'native',
    };
  }
}

function currentSheetKeys(): string[] {
  try {
    return getSortedSheetKeys_ACU(currentJsonTableData_ACU || {});
  } catch {
    return [];
  }
}

function countAiMessages(): number {
  try {
    return getChatArray_ACU().filter((msg: any) => msg && !msg.is_user).length;
  } catch {
    return 0;
  }
}

function countTableRows(keys: string[]): number {
  return keys.reduce((sum, key) => {
    const content = currentJsonTableData_ACU?.[key]?.content;
    if (!Array.isArray(content)) return sum;
    return sum + Math.max(0, content.length - 1);
  }, 0);
}

function normalizeStorageMode(raw: string): StorageMode {
  return raw === 'sqlite' ? 'sqlite' : 'native';
}

export function useDashboardPage(): DashboardPageState {
  const initial = safeReadSnapshot();
  const chatFileIdentifier = ref(initial.chatFileIdentifier);
  const coreApisReady = ref(initial.coreApisReady);
  const isolationKey = ref(initial.isolationKey);
  const storageMode = ref<StorageMode>(initial.storageMode);
  const storageMessage = ref<DashboardMessage | null>(null);
  const refreshTick = ref(0);

  const storageOptions: DashboardStorageOption[] = [
    {
      value: 'native',
      label: '原生 JSON',
      description: '把表格数据直接写入聊天楼层；兼容性最好，体积更轻。',
    },
    {
      value: 'sqlite',
      label: 'SQLite',
      description: '本地内存数据库执行填表指令再落盘；适合复杂表与多表关联，要求字段更严格。',
    },
  ];

  const sheetKeys = computed(() => {
    void refreshTick.value;
    return currentSheetKeys();
  });

  const hasTables = computed(() => sheetKeys.value.length > 0);

  const tableRows = computed<DashboardTableStatusRow[]>(() => {
    void refreshTick.value;
    if (!currentJsonTableData_ACU) return [];
    const chat = getChatArray_ACU();
    const totalAi = chat.filter((msg: any) => msg && !msg.is_user).length;
    const globalFrequency = normalizePositiveInteger_ACU(settings_ACU.autoUpdateFrequency, 1);
    const globalSkip = normalizeNonNegativeInteger_ACU(settings_ACU.skipUpdateFloors, 0);
    const currentIsolationKey = getCurrentIsolationKey_ACU();

    return sheetKeys.value.map((key) => {
      const table = currentJsonTableData_ACU?.[key] || {};
      const config = table.updateConfig || {};
      const rawFrequency = Number.isFinite(config.updateFrequency) ? Math.trunc(config.updateFrequency) : -1;
      const rawSkip = Number.isFinite(config.skipFloors) ? Math.trunc(config.skipFloors) : -1;
      const frequency = rawFrequency === -1 ? globalFrequency : rawFrequency;
      const skip = Math.max(0, rawSkip === -1 ? globalSkip : rawSkip);
      const disabled = frequency <= 0;
      const history = resolveTableHistoryStateFromChat_ACU(chat, {
        sheetKey: key,
        isSummaryTable: isSummaryOrOutlineTable_ACU(String(table.name || '')),
        isolationKey: currentIsolationKey,
        settings: settings_ACU,
      });
      const lastFloor = history.lastTrackedUpdateAiFloor;
      const found = history.hasTrackedUpdate;

      if (disabled) {
        return {
          key,
          name: String(table.name || key),
          frequencyLabel: '无',
          unrecordedLabel: found ? String(Math.max(0, totalAi - lastFloor)) : '—',
          lastUpdatedLabel: found ? String(lastFloor) : '未初始',
          nextTriggerLabel: '无',
          ready: false,
          disabled: true,
        };
      }

      const effectiveUnrecorded = found ? Math.max(0, (totalAi - skip) - lastFloor) : 0;
      return {
        key,
        name: String(table.name || key),
        frequencyLabel: String(frequency),
        unrecordedLabel: found ? String(Math.max(0, totalAi - lastFloor)) : '—',
        lastUpdatedLabel: found ? String(lastFloor) : '未初始',
        nextTriggerLabel: found ? String(lastFloor + frequency + skip) : '待初始',
        ready: found && effectiveUnrecorded >= frequency,
        disabled: false,
      };
    });
  });

  const nextUpdateText = computed(() => {
    const rows = tableRows.value.filter(row => !row.disabled && row.nextTriggerLabel !== '待初始');
    const ready = rows.filter(row => row.ready).map(row => row.name);
    if (ready.length) return `就绪:${ready.join('、')}`;

    const upcoming = rows
      .map(row => ({ row, floor: Number(row.nextTriggerLabel) }))
      .filter(item => Number.isFinite(item.floor))
      .sort((a, b) => a.floor - b.floor);
    if (!upcoming.length) return '下一次:无';
    const nextFloor = upcoming[0].floor;
    const names = upcoming.filter(item => item.floor === nextFloor).map(item => item.row.name);
    return `下一次:${names.join('、')}(AI楼层 ${nextFloor})`;
  });

  const stats = computed<DashboardStatsItem[]>(() => {
    void refreshTick.value;
    const keys = sheetKeys.value;
    return [
      { label: '上下文 AI 楼层', value: countAiMessages() },
      { label: '数据库状态', value: currentJsonTableData_ACU ? '已加载' : '未加载' },
      { label: '表格数量', value: keys.length },
      { label: '记录数量', value: countTableRows(keys) },
      { label: '当前聊天', value: chatFileIdentifier.value || '未初始化' },
    ];
  });

  /** 基础设置 — 同一聊天里时不时开关的功能。 */
  const basicToggles = computed<DashboardToggleItem[]>(() => {
    void refreshTick.value;
    return [
      {
        key: 'autoUpdateEnabled',
        label: '启用自动更新',
        description: '关闭后 AI 回复完不会自动触发填表，所有表格更新都需要你手动执行。临时跑测试或想"放飞一段剧情"时可以关掉。',
        value: settings_ACU.autoUpdateEnabled !== false,
      },
      {
        key: 'toastMuteEnabled',
        label: '静默提示框',
        description: '除填表 / 规划 / 导入 / 报错相关提示外，其它操作的浮窗通知不弹出。听不到 toast 就觉得清静的人开它。',
        value: settings_ACU.toastMuteEnabled === true,
      },
    ];
  });

  /** 功能开关 — 控制对应一级功能页是否显示。 */
  const featureToggles = computed<DashboardToggleItem[]>(() => {
    void refreshTick.value;
    const items: DashboardToggleItem[] = [
      {
        key: 'plotEnabled',
        label: '启用剧情推进',
        description: '开启后 sidebar 显示「剧情推进」一级页，并在发送消息时允许剧情推进拦截链工作。关闭后入口隐藏，运行时也不会处理剧情推进任务。',
        value: settings_ACU.plotSettings?.enabled === true,
      },
    ];
    if (contentReplaceToggleVisible.value) {
      items.push({
        key: 'contentReplaceEnabled',
        label: '启用正文替换',
        description: '开启后 sidebar 显示「正文替换」一级页，并在 AI 回复生成后允许正文替换流程工作。关闭后入口隐藏，运行时也不会处理正文替换任务。',
        value: settings_ACU.contentOptimizationSettings?.enabled === true,
      });
    }
    items.push({
      key: 'summaryVectorIndexModeEnabled',
      label: '启用向量混合增强交火方案',
      description: '开启后 sidebar 显示「交火模式」一级页，并允许发送前按相关度召回纪要索引。需要先在 API 页配置 Embedding / Rerank 服务；配置不完整时请先保持关闭。',
      value: settings_ACU.summaryVectorIndexModeDefault === true,
    });
    return items;
  });

  /** 高级设置 — 配置后基本不动；动了出问题是正常的。 */
  const advancedToggles = computed<DashboardToggleItem[]>(() => {
    void refreshTick.value;
    return [
      {
        key: 'promptTemplateEnabled',
        label: '启用条件模板功能',
        description: '允许填表提示词使用 <if> 条件判断（按表 / 按楼层 / 按字段动态生成内容）。普通用户不需要开；写过自定义提示词的高级用户用得上。',
        value: settings_ACU.promptTemplateSettings?.enabled !== false,
      },
      {
        key: 'zeroTkOccupyModeDefault',
        label: '0TK 占用模式',
        description: '通过特殊的世界书条目让数据库内容完全不占用上下文 token。性能模式，可能与某些 AI 后端兼容性差。可与"交火模式"同时开启。',
        value: settings_ACU.zeroTkOccupyModeDefault === true,
      },
    ];
  });

  const contentReplaceGateEnabled = computed(() => {
    void refreshTick.value;
    return settings_ACU.contentOptimizationSettings?.enabled === true;
  });

  const contentReplaceToggleVisible = computed(() => {
    void refreshTick.value;
    return Number(settings_ACU.plotSettings?.loopSettings?.maxRetries) === CONTENT_REPLACE_UNLOCK_MAX_RETRIES;
  });

  async function refresh(): Promise<void> {
    const next = safeReadSnapshot();
    chatFileIdentifier.value = next.chatFileIdentifier;
    coreApisReady.value = next.coreApisReady;
    isolationKey.value = next.isolationKey;
    storageMode.value = next.storageMode;
    refreshTick.value++;
  }

  function setToggle(key: string, value: boolean): void {
    if (key === 'plotEnabled') {
      const next = !!value;
      try {
        setGlobalPlotEnabled_ACU(next);
      } catch {
        if (!settings_ACU.plotSettings || typeof settings_ACU.plotSettings !== 'object') {
          settings_ACU.plotSettings = {};
        }
        settings_ACU.plotSettings.enabled = next;
      }
      saveSettings_ACU();
    } else if (key === 'promptTemplateEnabled') {
      if (!settings_ACU.promptTemplateSettings || typeof settings_ACU.promptTemplateSettings !== 'object') {
        settings_ACU.promptTemplateSettings = {};
      }
      settings_ACU.promptTemplateSettings.enabled = !!value;
      saveSettings_ACU();
    } else if (key === 'zeroTkOccupyModeDefault') {
      setZeroTkOccupyMode_ACU(!!value);
    } else if (key === 'summaryVectorIndexModeEnabled') {
      setSummaryVectorIndexMode_ACU(!!value);
    } else if (key === 'contentReplaceEnabled') {
      if (!settings_ACU.contentOptimizationSettings || typeof settings_ACU.contentOptimizationSettings !== 'object') {
        settings_ACU.contentOptimizationSettings = {};
      }
      settings_ACU.contentOptimizationSettings.enabled = !!value;
      saveSettings_ACU();
    } else if (key === 'autoUpdateEnabled' || key === 'toastMuteEnabled') {
      settings_ACU[key] = !!value;
      saveSettings_ACU();
    }
    refreshTick.value++;
  }

  async function setStorageMode(rawMode: string): Promise<void> {
    const mode = normalizeStorageMode(rawMode);
    storageMode.value = mode;
    settings_ACU.storageMode = mode;
    // SQL 表与原生表必须使用对应模式的默认提示词才能被正确填写——切换无条件重置
    settings_ACU.charCardPrompt = clone(mode === 'sqlite' ? DEFAULT_CHAR_CARD_PROMPT_SQL_ACU : DEFAULT_CHAR_CARD_PROMPT_ACU);
    saveSettings_ACU();
    try {
      await switchStorageMode(mode);
      storageMessage.value = { kind: 'success', text: `已切换到 ${mode === 'sqlite' ? 'SQLite' : '原生 JSON'} 模式。` };
    } catch (error: any) {
      storageMessage.value = { kind: 'error', text: error?.message || '存储模式切换失败。' };
    } finally {
      await refresh();
    }
  }

  return {
    chatFileIdentifier,
    coreApisReady,
    isolationKey,
    storageMode,
    storageMessage,
    storageOptions,
    stats,
    tableRows,
    nextUpdateText,
    hasTables,
    basicToggles,
    featureToggles,
    advancedToggles,
    contentReplaceGateEnabled,
    contentReplaceToggleVisible,
    refresh,
    setToggle,
    setStorageMode,
  };
}

/** 模板预设状态条数据来源（与"当前活动 API / 当前剧情推进预设"并列展示）。 */
export interface TemplatePresetSnapshot {
  displayName: string;
  scopeLabel: string;
}

export function readActiveTemplatePresetSnapshot(): TemplatePresetSnapshot {
  try {
    const meta = getActiveTemplatePresetMeta_ACU();
    return { displayName: String(meta.displayName || '默认预设'), scopeLabel: String(meta.scopeLabel || '全局') };
  } catch {
    return { displayName: '读取失败', scopeLabel: '' };
  }
}
