import { computed, ref, type ComputedRef, type Ref } from 'vue';
import { settings_ACU } from '../../service/runtime/state-manager';
import { saveSettings_ACU } from '../../service/settings/settings-service';
import { getCurrentStorageMode } from '../../service/table/storage-mode';
import { DEFAULT_CHAR_CARD_PROMPT_ACU, DEFAULT_CHAR_CARD_PROMPT_SQL_ACU } from '../../shared/defaults-json.js';
import {
  DEFAULT_AUTO_UPDATE_FREQUENCY_ACU,
  DEFAULT_AUTO_UPDATE_THRESHOLD_ACU,
  DEFAULT_AUTO_UPDATE_TOKEN_THRESHOLD_ACU,
} from '../../shared/defaults';
import {
  normalizeExcludeRules_ACU,
  normalizeExtractRules_ACU,
  normalizeNonNegativeInteger_ACU,
  normalizePositiveInteger_ACU,
} from '../../shared/utils';

type MessageKind = 'info' | 'success' | 'warning' | 'error';

export interface FormFillPromptSegment {
  role: string;
  content: string;
  deletable?: boolean;
  mainSlot?: 'A' | 'B' | '';
  isMain?: boolean;
  isMain2?: boolean;
}

export interface FormFillRulePair {
  start: string;
  end: string;
}

export interface FormFillNumberField {
  key: NumberSettingKey;
  label: string;
  value: number;
  min: number;
  step: number;
  hint: string;
}

export interface FormFillMessage {
  kind: MessageKind;
  text: string;
  scope: 'settings' | 'prompt';
}

export type NumberSettingKey =
  | 'autoUpdateThreshold'
  | 'autoUpdateFrequency'
  | 'updateBatchSize'
  | 'maxConcurrentGroups'
  | 'skipUpdateFloors'
  | 'retainRecentLayers'
  | 'autoUpdateTokenThreshold'
  | 'tableMaxRetries';

export interface FormFillSettingsState {
  numberFields: ComputedRef<FormFillNumberField[]>;
  tableEditLastPairOnly: Ref<boolean>;
  extractRules: Ref<FormFillRulePair[]>;
  excludeRules: Ref<FormFillRulePair[]>;
  promptSegments: Ref<FormFillPromptSegment[]>;
  promptTemplateMode: ComputedRef<'default' | 'custom'>;
  message: Ref<FormFillMessage | null>;
  promptDirty: Ref<boolean>;
  refresh: () => void;
  setNumber: (key: NumberSettingKey, value: number | string) => void;
  setTableEditLastPairOnly: (value: boolean) => void;
  setExtractRules: (rules: FormFillRulePair[]) => void;
  setExcludeRules: (rules: FormFillRulePair[]) => void;
  addPromptSegment: (position: 'top' | 'bottom') => void;
  deletePromptSegment: (index: number) => void;
  updatePromptSegment: (index: number, patch: Partial<FormFillPromptSegment>) => void;
  savePrompt: () => void;
  resetPrompt: () => void;
  importPromptFile: (file: File) => Promise<void>;
  exportPrompt: () => void;
}

const NUMBER_FIELD_META: Array<Omit<FormFillNumberField, 'value'>> = [
  {
    key: 'autoUpdateThreshold',
    label: '自动填表上下文层数',
    min: 0,
    step: 1,
    hint: '自动与手动填表取最近多少层 AI 回复作为上下文；0 表示不裁剪。',
  },
  {
    key: 'autoUpdateFrequency',
    label: '自动填表频率',
    min: 1,
    step: 1,
    hint: '每张表未单独配置时，累计多少层 AI 回复触发一次更新。',
  },
  {
    key: 'updateBatchSize',
    label: '批处理楼层数',
    min: 1,
    step: 1,
    hint: '一次 AI 填表请求中合并处理的 AI 楼层数量。',
  },
  {
    key: 'maxConcurrentGroups',
    label: '最大并发表组',
    min: 1,
    step: 1,
    hint: '手动填表时同时处理的更新组数量。',
  },
  {
    key: 'skipUpdateFloors',
    label: '跳过最新楼层',
    min: 0,
    step: 1,
    hint: '忽略最新若干层 AI 回复，避免未稳定内容进入表格。',
  },
  {
    key: 'retainRecentLayers',
    label: '保留近期层数',
    min: 0,
    step: 1,
    hint: '历史清理时保留的近期层数；0 表示按业务默认处理。',
  },
  {
    key: 'autoUpdateTokenThreshold',
    label: 'AI 回复最小长度',
    min: 0,
    step: 1,
    hint: '低于该字符数的回复会被自动填表跳过；0 表示不检查。',
  },
  {
    key: 'tableMaxRetries',
    label: '填表最大重试',
    min: 1,
    step: 1,
    hint: 'AI 输出解析失败或 SQL 执行失败时的最大重试次数。',
  },
];

const FALLBACKS: Record<NumberSettingKey, number> = {
  autoUpdateThreshold: DEFAULT_AUTO_UPDATE_THRESHOLD_ACU,
  autoUpdateFrequency: DEFAULT_AUTO_UPDATE_FREQUENCY_ACU,
  updateBatchSize: 3,
  maxConcurrentGroups: 1,
  skipUpdateFloors: 0,
  retainRecentLayers: 100,
  autoUpdateTokenThreshold: DEFAULT_AUTO_UPDATE_TOKEN_THRESHOLD_ACU,
  tableMaxRetries: 3,
};

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value ?? null));
}

function normalizeNumber(key: NumberSettingKey, value: unknown): number {
  const meta = NUMBER_FIELD_META.find(item => item.key === key);
  const fallback = FALLBACKS[key];
  const normalized = (meta?.min ?? 0) > 0
    ? normalizePositiveInteger_ACU(value, fallback)
    : normalizeNonNegativeInteger_ACU(value, fallback);
  return Math.max(meta?.min ?? 0, normalized);
}

function normalizeRules(rules: unknown, legacy = '', kind: 'extract' | 'exclude'): FormFillRulePair[] {
  const normalized = kind === 'extract'
    ? normalizeExtractRules_ACU(rules, legacy)
    : normalizeExcludeRules_ACU(rules, legacy);
  return normalized.map((rule: any) => ({
    start: String(rule.start || ''),
    end: String(rule.end || ''),
  }));
}

function coerceRulePairs(rules: unknown): FormFillRulePair[] {
  return Array.isArray(rules)
    ? rules.map((rule: any) => ({
        start: String(rule?.start ?? ''),
        end: String(rule?.end ?? ''),
      }))
    : [];
}

function normalizeRole(raw: unknown): string {
  const role = String(raw || 'USER').trim();
  if (role === 'assistant') return 'assistant';
  if (role.toUpperCase() === 'SYSTEM') return 'SYSTEM';
  if (role.toUpperCase() === 'USER') return 'USER';
  if (role.toUpperCase() === 'ASSISTANT') return 'assistant';
  return role || 'USER';
}

function normalizePromptSegment(raw: any): FormFillPromptSegment {
  const slot = raw?.mainSlot === 'A' || raw?.isMain === true
    ? 'A'
    : raw?.mainSlot === 'B' || raw?.isMain2 === true
      ? 'B'
      : '';
  return {
    role: normalizeRole(raw?.role),
    content: String(raw?.content ?? ''),
    deletable: slot ? false : raw?.deletable !== false,
    mainSlot: slot,
    isMain: slot === 'A',
    isMain2: slot === 'B',
  };
}

function normalizePromptSegments(input: unknown): FormFillPromptSegment[] {
  const source = Array.isArray(input)
    ? input
    : typeof input === 'string' && input.trim()
      ? [{ role: 'USER', content: input }]
      : DEFAULT_CHAR_CARD_PROMPT_ACU;
  const segments = source.map(normalizePromptSegment);
  return ensureUniqueSlots(segments);
}

function ensureUniqueSlots(segments: FormFillPromptSegment[]): FormFillPromptSegment[] {
  const next = segments.map(seg => ({ ...seg }));
  for (const slot of ['A', 'B'] as const) {
    let first = -1;
    for (let i = 0; i < next.length; i += 1) {
      if (next[i].mainSlot !== slot) continue;
      if (first === -1) {
        first = i;
        next[i].deletable = false;
        next[i].isMain = slot === 'A';
        next[i].isMain2 = slot === 'B';
      } else {
        next[i].mainSlot = '';
        next[i].isMain = false;
        next[i].isMain2 = false;
        next[i].deletable = next[i].deletable !== false;
      }
    }
  }
  return next;
}

function preparePromptForSave(segments: FormFillPromptSegment[]): FormFillPromptSegment[] {
  return ensureUniqueSlots(segments).map((seg) => ({
    role: normalizeRole(seg.role),
    content: String(seg.content || ''),
    deletable: seg.mainSlot ? false : seg.deletable !== false,
    mainSlot: seg.mainSlot || '',
    isMain: seg.mainSlot === 'A',
    isMain2: seg.mainSlot === 'B',
  }));
}

function currentDefaultPromptSegments(): FormFillPromptSegment[] {
  const defaults = getCurrentStorageMode() === 'sqlite'
    ? DEFAULT_CHAR_CARD_PROMPT_SQL_ACU
    : DEFAULT_CHAR_CARD_PROMPT_ACU;
  return normalizePromptSegments(defaults);
}

function promptFingerprint(segments: FormFillPromptSegment[]): string {
  return JSON.stringify(preparePromptForSave(segments));
}

export function useFormFillSettings(): FormFillSettingsState {
  const values = ref<Record<NumberSettingKey, number>>({ ...FALLBACKS });
  const tableEditLastPairOnly = ref(settings_ACU.tableEditLastPairOnly !== false);
  const extractRules = ref<FormFillRulePair[]>([]);
  const excludeRules = ref<FormFillRulePair[]>([]);
  const promptSegments = ref<FormFillPromptSegment[]>([]);
  const message = ref<FormFillMessage | null>(null);
  const promptDirty = ref(false);

  const numberFields = computed<FormFillNumberField[]>(() =>
    NUMBER_FIELD_META.map(meta => ({
      ...meta,
      value: values.value[meta.key],
    })),
  );
  const promptTemplateMode = computed<'default' | 'custom'>(() =>
    promptFingerprint(promptSegments.value) === promptFingerprint(currentDefaultPromptSegments())
      ? 'default'
      : 'custom',
  );

  function refresh(): void {
    const nextValues = { ...FALLBACKS } as Record<NumberSettingKey, number>;
    for (const key of Object.keys(FALLBACKS) as NumberSettingKey[]) {
      const normalized = normalizeNumber(key, settings_ACU[key]);
      nextValues[key] = normalized;
      settings_ACU[key] = normalized;
    }
    values.value = nextValues;
    tableEditLastPairOnly.value = settings_ACU.tableEditLastPairOnly !== false;
    extractRules.value = normalizeRules(settings_ACU.tableContextExtractRules, settings_ACU.tableContextExtractTags || '', 'extract');
    excludeRules.value = normalizeRules(settings_ACU.tableContextExcludeRules, settings_ACU.tableContextExcludeTags || '', 'exclude');
    promptSegments.value = normalizePromptSegments(settings_ACU.charCardPrompt);
    promptDirty.value = false;
  }

  function setNumber(key: NumberSettingKey, rawValue: number | string): void {
    const normalized = normalizeNumber(key, rawValue);
    values.value = { ...values.value, [key]: normalized };
    settings_ACU[key] = normalized;
    saveSettings_ACU();
    message.value = { kind: 'success', text: '设置已保存。', scope: 'settings' };
  }

  function setTableEditLastPairOnly(value: boolean): void {
    tableEditLastPairOnly.value = !!value;
    settings_ACU.tableEditLastPairOnly = tableEditLastPairOnly.value;
    saveSettings_ACU();
    message.value = { kind: 'success', text: '正文截取方式已保存。', scope: 'settings' };
  }

  function setExtractRules(rules: FormFillRulePair[]): void {
    extractRules.value = coerceRulePairs(rules);
    settings_ACU.tableContextExtractRules = clone(normalizeRules(extractRules.value, '', 'extract'));
    settings_ACU.tableContextExtractTags = '';
    saveSettings_ACU();
    message.value = { kind: 'success', text: '提取规则已保存。', scope: 'settings' };
  }

  function setExcludeRules(rules: FormFillRulePair[]): void {
    excludeRules.value = coerceRulePairs(rules);
    settings_ACU.tableContextExcludeRules = clone(normalizeRules(excludeRules.value, '', 'exclude'));
    settings_ACU.tableContextExcludeTags = '';
    saveSettings_ACU();
    message.value = { kind: 'success', text: '排除规则已保存。', scope: 'settings' };
  }

  function addPromptSegment(position: 'top' | 'bottom'): void {
    const seg: FormFillPromptSegment = { role: 'USER', content: '', deletable: true, mainSlot: '' };
    const next = promptSegments.value.slice();
    if (position === 'top') next.unshift(seg);
    else next.push(seg);
    promptSegments.value = next;
    promptDirty.value = true;
  }

  function deletePromptSegment(index: number): void {
    const target = promptSegments.value[index];
    if (!target || target.deletable === false) return;
    const next = promptSegments.value.slice();
    next.splice(index, 1);
    promptSegments.value = next;
    promptDirty.value = true;
  }

  function updatePromptSegment(index: number, patch: Partial<FormFillPromptSegment>): void {
    if (!promptSegments.value[index]) return;
    const next = promptSegments.value.map((seg: FormFillPromptSegment, i: number): FormFillPromptSegment => {
      if (i !== index) {
        if ((patch.mainSlot === 'A' || patch.mainSlot === 'B') && seg.mainSlot === patch.mainSlot) {
          return { ...seg, mainSlot: '', isMain: false, isMain2: false, deletable: true };
        }
        return { ...seg };
      }
      const updated = { ...seg, ...patch };
      if (updated.mainSlot === 'A' || updated.mainSlot === 'B') {
        updated.deletable = false;
        updated.isMain = updated.mainSlot === 'A';
        updated.isMain2 = updated.mainSlot === 'B';
      } else {
        updated.mainSlot = '';
        updated.isMain = false;
        updated.isMain2 = false;
        updated.deletable = true;
      }
      return normalizePromptSegment(updated);
    });
    promptSegments.value = ensureUniqueSlots(next);
    promptDirty.value = true;
  }

  function savePrompt(): void {
    const prepared = preparePromptForSave(promptSegments.value);
    settings_ACU.charCardPrompt = clone(prepared);
    saveSettings_ACU();
    promptSegments.value = prepared;
    promptDirty.value = false;
    message.value = { kind: 'success', text: '填表提示词已保存。', scope: 'prompt' };
  }

  function resetPrompt(): void {
    promptSegments.value = currentDefaultPromptSegments();
    promptDirty.value = true;
    message.value = { kind: 'warning', text: '已载入当前存储模式默认提示词，保存后生效。', scope: 'prompt' };
  }

  async function importPromptFile(file: File): Promise<void> {
    try {
      const parsed = JSON.parse(await file.text());
      if (!Array.isArray(parsed)) throw new Error('提示词 JSON 必须是数组。');
      promptSegments.value = normalizePromptSegments(parsed);
      promptDirty.value = true;
      message.value = { kind: 'success', text: '提示词 JSON 已载入，保存后生效。', scope: 'prompt' };
    } catch (error: any) {
      message.value = { kind: 'error', text: error?.message || '提示词 JSON 读取失败。', scope: 'prompt' };
    }
  }

  function exportPrompt(): void {
    try {
      const text = JSON.stringify(preparePromptForSave(promptSegments.value), null, 2);
      const blob = new Blob([text], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'acu-form-fill-prompt.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      message.value = { kind: 'success', text: '提示词 JSON 已导出。', scope: 'prompt' };
    } catch (error: any) {
      message.value = { kind: 'error', text: error?.message || '提示词导出失败。', scope: 'prompt' };
    }
  }

  refresh();

  return {
    numberFields,
    tableEditLastPairOnly,
    extractRules,
    excludeRules,
    promptSegments,
    promptTemplateMode,
    message,
    promptDirty,
    refresh,
    setNumber,
    setTableEditLastPairOnly,
    setExtractRules,
    setExcludeRules,
    addPromptSegment,
    deletePromptSegment,
    updatePromptSegment,
    savePrompt,
    resetPrompt,
    importPromptFile,
    exportPrompt,
  };
}
