<template>
  <section class="acu-v2-content-replace-page">
    <AcuPageHeader title="正文替换" />

    <AcuMessage v-if="store.message" :kind="store.message.kind">
      {{ store.message.text }}
    </AcuMessage>

    <div class="acu-v2-content-replace-page__layout">
      <AcuPanel
        title="基础设置"
        description="正文替换会在 AI 回复生成后、填表前，把正文交给另一组提示词检查并按返回的 JSON 建议替换原文。这里控制使用哪套 API、以及短文本和失败重试的边界；启用开关在仪表盘的「功能开关」里。如果生成变慢或结果异常，请先回仪表盘关闭功能或调低循环次数。"
      >
        <AcuFormRow label="API 预设" hint="留空时使用酒馆当前 API；选择预设后只影响正文替换。">
          <AcuSelect
            :options="apiOptions"
            :model-value="store.apiPreset"
            placeholder="使用当前 API 配置"
            @update:model-value="store.setString('apiPreset', $event)"
          />
        </AcuFormRow>

        <div class="acu-v2-content-replace-page__number-grid">
          <AcuFormRow label="最小正文长度" hint="短于该长度时跳过，避免小段回复也触发一次 API。">
            <AcuInput
              :model-value="store.minLength"
              type="number"
              :min="0"
              :step="10"
              @change="store.setNumber('minLength', $event)"
            />
          </AcuFormRow>
          <AcuFormRow label="最大替换项数" hint="单次最多接受多少条替换建议。">
            <AcuInput
              :model-value="store.maxOptimizations"
              type="number"
              :min="1"
              :max="100"
              :step="1"
              @change="store.setNumber('maxOptimizations', $event)"
            />
          </AcuFormRow>
          <AcuFormRow label="循环优化次数" hint="对优化后的文本再次检查；过高会明显增加等待时间。">
            <AcuInput
              :model-value="store.loopCount"
              type="number"
              :min="1"
              :max="10"
              :step="1"
              @change="store.setNumber('loopCount', $event)"
            />
          </AcuFormRow>
          <AcuFormRow label="自动重试次数" hint="API 调用失败时的重试上限。">
            <AcuInput
              :model-value="store.retryCount"
              type="number"
              :min="1"
              :max="10"
              :step="1"
              @change="store.setNumber('retryCount', $event)"
            />
          </AcuFormRow>
        </div>
      </AcuPanel>

      <AcuPanel
        title="替换模式"
        description="这些开关决定替换结果如何呈现。无感模式会尽量直接写回聊天；关闭自动应用后会等待用户确认。若你正在排查误替换，请关闭无感模式和自动应用，并保留对比显示。"
      >
        <div class="acu-v2-content-replace-page__choice-list">
          <AcuCheckbox
            :model-value="store.seamlessMode"
            label="无感替换模式"
            @update:model-value="store.setBoolean('seamlessMode', $event)"
          />
          <AcuCheckbox
            :model-value="store.autoApply"
            label="自动应用替换结果"
            @update:model-value="store.setBoolean('autoApply', $event)"
          />
          <AcuCheckbox
            :model-value="store.showDiff"
            label="显示优化对比"
            @update:model-value="store.setBoolean('showDiff', $event)"
          />
          <AcuCheckbox
            :model-value="store.parallelMode"
            label="填表与正文替换并行执行"
            @update:model-value="store.setBoolean('parallelMode', $event)"
          />
        </div>

        <div class="acu-v2-content-replace-page__mini-status">
          <span>最近可重新优化</span>
          <strong>{{ store.lastOptimizedLabel }}</strong>
        </div>

        <div class="acu-v2-content-replace-page__actions">
          <AcuButton
            :loading="store.busyAction === 'reoptimize'"
            :disabled="store.lastOptimizedMessageIndex < 0"
            @click="store.reoptimizeLatest"
          >
            <i class="fa-solid fa-rotate-right"></i>
            重新优化最近一次
          </AcuButton>
        </div>
      </AcuPanel>

      <AcuPanel
        title="正文替换预设"
        description="预设是正文替换提示词模板库，只保存提示词组，不保存 API 和模式开关。下拉框用于把某个模板载入到当前配置；「默认预设」会恢复插件自带规则。导入按钮会把 JSON 保存到模板库并载入第一项。齿轮图标进入管理面板，可以从默认新建、重命名、编辑、导出或删除模板。默认预设不能直接修改；需要调整时请先从默认新建。"
      >
        <template #actions>
          <AcuBadge :variant="promptTemplateBadgeVariant">{{ promptTemplateBadgeLabel }}</AcuBadge>
        </template>

        <p class="acu-v2-content-replace-page__status-line">
          当前提示词:
          <strong>{{ store.activePresetLabel }}</strong>
          <span class="acu-v2-content-replace-page__badge">
            {{ store.promptSegmentCount }} 段提示词
          </span>
        </p>

        <div class="acu-v2-content-replace-page__select-row">
          <AcuPresetDropdown
            :items="presetDropdownItems"
            :model-value="store.selectedPresetName"
            default-name=""
            empty-text="暂无正文替换预设"
            placeholder="自定义提示词"
            :show-default-action="false"
            @update:model-value="store.selectPreset($event)"
          />
          <AcuButton
            icon-only
            :title="canEditCurrentPrompt ? '编辑当前提示词' : '默认预设不能直接编辑，请从默认新建后修改'"
            :disabled="!canEditCurrentPrompt"
            @click="openPromptDrawerForCurrent"
          >
            <i class="fa-solid fa-pen"></i>
          </AcuButton>
          <AcuFileButton
            icon-only
            title="导入预设 JSON"
            accept="application/json,.json"
            :disabled="!!store.busyAction"
            @file="store.importPresets"
          >
            <i class="fa-solid fa-file-import"></i>
          </AcuFileButton>
          <AcuButton icon-only title="管理预设" @click="presetDrawerOpen = true">
            <i class="fa-solid fa-gear"></i>
          </AcuButton>
        </div>

        <AcuMessage v-if="promptGroupMissingContent" kind="warning">
          正文替换提示词缺少 $CONTENT，占位符为空时运行时无法知道要检查哪段正文；请打开编辑器载入默认提示词或补回占位符。
        </AcuMessage>
      </AcuPanel>

      <AcuPanel
        title="标签筛选"
        description="标签筛选会先裁剪待优化正文：提取规则只保留指定范围，排除规则会从正文里移除指定范围。规则写错时可能导致正文过短而跳过，或把不该改的内容送去替换；出问题请先清空规则再测试。"
      >
        <div class="acu-v2-content-replace-page__form-grid">
          <AcuFormRow label="按标签提取" hint="多个标签用逗号分隔；留空表示不按标签提取。">
            <AcuInput
              :model-value="store.extractTags"
              type="text"
              placeholder="例如: content,正文"
              @update:model-value="store.setString('extractTags', String($event))"
            />
          </AcuFormRow>
          <AcuFormRow label="按标签排除" hint="多个标签用逗号分隔；留空表示不按标签排除。">
            <AcuInput
              :model-value="store.excludeTags"
              type="text"
              placeholder="例如: think,thinking"
              @update:model-value="store.setString('excludeTags', String($event))"
            />
          </AcuFormRow>
        </div>

        <div class="acu-v2-content-replace-page__rule-stack">
          <AcuRulePairList
            label="正文标签提取规则"
            :model-value="store.extractRules"
            start-placeholder="开始词（例如：<content>）"
            end-placeholder="结束词（例如：</content>）"
            add-label="添加提取规则"
            @update:model-value="store.setExtractRules"
          />
          <AcuRulePairList
            label="标签排除规则"
            :model-value="store.excludeRules"
            start-placeholder="开始词（例如：<think>）"
            end-placeholder="结束词（例如：</think>）"
            add-label="添加排除规则"
            @update:model-value="store.setExcludeRules"
          />
        </div>
      </AcuPanel>

      <AcuPanel
        title="手动测试"
        description="这里只用当前正文替换配置测试一段文本，不会写回聊天记录。测试失败通常表示 API 配置、提示词 JSON 格式或筛选规则有问题；先看错误内容，再调整上面的配置。"
      >
        <AcuFormRow label="测试文本" hint="输入一段模拟 AI 正文，用于验证提示词和返回格式。">
          <AcuTextarea
            :model-value="store.testInput"
            :rows="5"
            placeholder="输入需要测试的正文..."
            @update:model-value="store.setString('testInput', $event)"
          />
        </AcuFormRow>

        <div class="acu-v2-content-replace-page__actions">
          <AcuButton
            variant="primary"
            :loading="store.busyAction === 'test'"
            @click="store.runTest"
          >
            执行优化测试
          </AcuButton>
        </div>

        <pre v-if="store.testOutput" class="acu-v2-content-replace-page__test-output">{{ store.testOutput }}</pre>
      </AcuPanel>
    </div>

    <ContentReplacePresetDrawer
      :is-open="presetDrawerOpen"
      :presets="store.promptPresets"
      :message="store.message"
      @close="presetDrawerOpen = false"
      @create-from-default="store.createPresetFromDefault"
      @edit="onEditPreset"
      @rename="onRenamePreset"
      @delete="onDeletePreset"
      @export="store.exportPresetByName($event)"
    />

    <ContentReplacePromptDrawer
      :is-open="promptDrawerOpen"
      :segments="promptSegmentsForView"
      :dirty="store.promptDirty"
      :message="store.message"
      @close="closePromptDrawer"
      @save="onSavePromptGroup"
      @reset="onResetPromptGroup"
      @add="store.addPromptSegment($event)"
      @delete="store.deletePromptSegment($event)"
      @update="onPromptUpdate"
    />
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import AcuBadge, { type AcuBadgeVariant } from '../components/_lib/AcuBadge.vue';
import AcuButton from '../components/_lib/AcuButton.vue';
import AcuCheckbox from '../components/_lib/AcuCheckbox.vue';
import AcuFileButton from '../components/_lib/AcuFileButton.vue';
import AcuFormRow from '../components/_lib/AcuFormRow.vue';
import AcuInput from '../components/_lib/AcuInput.vue';
import AcuMessage from '../components/_lib/AcuMessage.vue';
import AcuPageHeader from '../components/_lib/AcuPageHeader.vue';
import AcuPanel from '../components/_lib/AcuPanel.vue';
import type { PromptSegment } from '../components/_lib/AcuPromptSegments.vue';
import AcuPresetDropdown, { type PresetDropdownItem } from '../components/_lib/AcuPresetDropdown.vue';
import AcuRulePairList from '../components/_lib/AcuRulePairList.vue';
import AcuSelect from '../components/_lib/AcuSelect.vue';
import AcuTextarea from '../components/_lib/AcuTextarea.vue';
import ContentReplacePresetDrawer from '../components/ContentReplacePresetDrawer.vue';
import ContentReplacePromptDrawer from '../components/ContentReplacePromptDrawer.vue';
import { useChatChangedTick } from '../composables/useChatChangedListener';
import { useUiCloseGuard } from '../composables/useUiCloseGuard';
import {
  CUSTOM_CONTENT_REPLACE_PRESET_VALUE,
  useContentReplaceStore,
  type ContentReplacePromptSegment,
} from '../stores/content-replace-store';

const store = useContentReplaceStore();
const presetDrawerOpen = ref(false);
const promptDrawerOpen = ref(false);
const editingPresetName = ref('');

const apiOptions = computed(() => [
  { value: '', label: '使用当前 API 配置' },
  ...store.apiPresetNames.map(name => ({ value: name, label: name })),
]);

const presetDropdownItems = computed<PresetDropdownItem[]>(() =>
  store.selectedPresetName === CUSTOM_CONTENT_REPLACE_PRESET_VALUE
    ? [
      { value: CUSTOM_CONTENT_REPLACE_PRESET_VALUE, label: '自定义提示词', meta: '未保存为预设' },
      { value: '', label: '默认预设', meta: `${store.defaultPromptSegmentCount} 段提示词` },
      ...store.promptPresets.map(preset => ({
        value: preset.name,
        label: preset.name,
        meta: `${preset.promptGroup.length} 段提示词`,
      })),
    ]
    : [
    { value: '', label: '默认预设', meta: `${store.defaultPromptSegmentCount} 段提示词` },
    ...store.promptPresets.map(preset => ({
      value: preset.name,
      label: preset.name,
      meta: `${preset.promptGroup.length} 段提示词`,
    })),
  ],
);

const promptSegmentsForView = computed<PromptSegment[]>(() =>
  store.promptGroup.map(segment => ({
    role: segment.role,
    content: segment.content,
    deletable: segment.deletable,
    mainSlot: segment.mainSlot,
    isMain: segment.isMain,
    isMain2: segment.isMain2,
  })),
);

const promptGroupMissingContent = computed(() =>
  !store.promptGroup.some(segment => String(segment.content || '').includes('$CONTENT')),
);
const promptTemplateBadgeLabel = computed(() =>
  store.promptTemplateMode === 'default' ? '使用默认提示词' : '已自定义提示词',
);
const promptTemplateBadgeVariant = computed<AcuBadgeVariant>(() =>
  store.promptTemplateMode === 'default' ? 'neutral' : 'accent',
);
const canEditCurrentPrompt = computed(() => store.selectedPresetName !== '');

function onDeletePreset(name: string): void {
  if (!name) return;
  if (!window.confirm(`删除正文替换预设"${name}"？`)) return;
  store.deletePresetByName(name);
}

function onRenamePreset(name: string): void {
  const next = window.prompt(`将正文替换预设"${name}"重命名为：`, name);
  if (!next) return;
  store.renamePreset(name, next);
}

function onEditPreset(name: string): void {
  store.selectPreset(name);
  editingPresetName.value = name;
  presetDrawerOpen.value = false;
  promptDrawerOpen.value = true;
}

function openPromptDrawerForCurrent(): void {
  editingPresetName.value = store.hasSelectedPreset ? store.selectedPresetName : '';
  promptDrawerOpen.value = true;
}

function closePromptDrawer(): void {
  promptDrawerOpen.value = false;
  editingPresetName.value = '';
}

function onSavePromptGroup(): void {
  if (editingPresetName.value) store.savePromptGroupToPreset(editingPresetName.value);
  else store.savePromptGroup();
}

function onResetPromptGroup(): void {
  if (!window.confirm('载入默认正文替换提示词组？这会覆盖当前编辑器里的提示词内容，需要保存后才会生效。')) return;
  store.resetPromptGroup();
}

function onPromptUpdate(index: number, patch: Partial<PromptSegment>): void {
  store.updatePromptSegment(index, patch as Partial<ContentReplacePromptSegment>);
}

function confirmPromptClose(): boolean {
  if (!promptDrawerOpen.value || !store.promptDirty) return true;
  return window.confirm('你有未保存的正文替换提示词修改，确定要关闭新 UI 吗？');
}

onMounted(() => store.refreshFromSettings());
watch(useChatChangedTick(), () => store.refreshFromSettings());
useUiCloseGuard(confirmPromptClose);
</script>

<style scoped>
.acu-v2-content-replace-page {
  min-height: 100%;
  min-width: 0;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.acu-v2-content-replace-page__layout {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  align-items: stretch;
}

.acu-v2-content-replace-page__mini-status span {
  color: var(--acu-text-3);
  font-size: 11px;
  line-height: 1.5;
}

.acu-v2-content-replace-page__number-grid,
.acu-v2-content-replace-page__form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.acu-v2-content-replace-page__choice-list,
.acu-v2-content-replace-page__rule-stack {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.acu-v2-content-replace-page__mini-status {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 9px 10px;
  border: 0;
  border-radius: var(--acu-radius-sm);
  background: var(--acu-bg-2);
}

.acu-v2-content-replace-page__mini-status strong {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--acu-text-2);
  font-size: 12px;
  font-family: Consolas, 'Courier New', monospace;
}

.acu-v2-content-replace-page__status-line {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin: 0 0 10px;
  color: var(--acu-text-3);
  font-size: 12px;
}

.acu-v2-content-replace-page__status-line strong {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--acu-text-1);
  font-size: 12px;
  font-family: Consolas, 'Courier New', monospace;
}

.acu-v2-content-replace-page__badge {
  display: inline-flex;
  align-items: center;
  padding: 1px 8px;
  border-radius: var(--acu-radius-sm);
  background: color-mix(in srgb, var(--acu-text-3) 16%, transparent);
  color: var(--acu-text-2);
  font-size: 11px;
  font-weight: 500;
}

.acu-v2-content-replace-page__select-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) repeat(3, max-content);
  gap: 6px;
  align-items: stretch;
  min-width: 0;
}

.acu-v2-content-replace-page__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-end;
  padding-top: 12px;
  margin-top: 4px;
}

.acu-v2-content-replace-page__test-output {
  margin: 0;
  max-height: 280px;
  overflow: auto;
  padding: 10px;
  border: 0;
  border-radius: var(--acu-radius-sm);
  background: var(--acu-bg-2);
  color: var(--acu-text-2);
  font-family: Consolas, 'Courier New', monospace;
  font-size: 11px;
  line-height: 1.55;
  white-space: pre-wrap;
  word-break: break-word;
}

@media (max-width: 860px) {
  .acu-v2-content-replace-page {
    padding: 14px;
  }

  .acu-v2-content-replace-page__layout,
  .acu-v2-content-replace-page__number-grid,
  .acu-v2-content-replace-page__form-grid {
    grid-template-columns: 1fr;
  }
}
</style>
