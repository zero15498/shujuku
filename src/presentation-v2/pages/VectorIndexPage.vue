<template>
  <section class="acu-v2-vector-index-page">
    <AcuPageHeader title="交火模式" />

    <AcuInfoBanner v-if="vector.hasValidationErrors.value" tone="warning">
      <div class="acu-v2-vector-index-page__warning-content">
        <span>配置不完整，发送前的纪要召回不会启用。请补全：{{ vector.validationErrors.value.join('；') }}</span>
        <AcuButton size="sm" @click="goToApiPage">去 API 页配置</AcuButton>
      </div>
    </AcuInfoBanner>

    <div class="acu-v2-vector-index-page__main-grid">
      <AcuPanel
        title="索引状态与维护"
        description="这里显示当前聊天最新交火索引的 manifest、外置文件体积和本地缓存体积。打开页面和切换聊天时会自动重读状态；清缓存只清 IndexedDB 临时数据；删除当前索引会移除当前聊天的索引引用和可回收外置资产，之后需要重新构建。"
      >
        <template #actions>
          <AcuBadge :variant="vector.statusVariant.value">{{ vector.statusLabel.value }}</AcuBadge>
        </template>

        <AcuMessage v-if="vector.message.value" :kind="vector.message.value.kind">
          {{ vector.message.value.text }}
        </AcuMessage>

        <AcuStatsList :items="vector.statusStatsItems.value" />

        <p class="acu-v2-vector-index-page__hint">
          发送前流程：关键词生成 → 用户输入与关键词合并 embedding → 概要列 chunk 预筛 → 可选 Rerank → 按纪要表原顺序覆盖原概要索引条目。
        </p>

        <div class="acu-v2-vector-index-page__actions">
          <AcuButton
            variant="primary"
            :disabled="vector.buildBusy.value || vector.maintenanceBusy.value"
            @click="vector.buildNow"
          >
            <i class="fa-solid fa-brain"></i>
            {{ vector.buildBusy.value ? '正在重建...' : '立即构建交火纪要索引' }}
          </AcuButton>
          <AcuButton
            :disabled="vector.maintenanceBusy.value || vector.buildBusy.value"
            @click="vector.migrateLegacyIndex"
          >
            非破坏迁移旧索引
          </AcuButton>
          <AcuButton
            :disabled="vector.maintenanceBusy.value || vector.buildBusy.value"
            @click="vector.clearIndexCache"
          >
            清空临时缓存
          </AcuButton>
          <AcuButton
            variant="danger"
            :disabled="vector.maintenanceBusy.value || vector.buildBusy.value"
            @click="onDeleteCurrentIndex"
          >
            删除当前索引
          </AcuButton>
        </div>
      </AcuPanel>

      <div class="acu-v2-vector-index-page__side-stack">
        <AcuPanel
          title="关键词生成"
          description="发送前先让一个轻量 AI 把当前用户输入和最近上下文转成「召回关键词」，再去匹配纪要 chunk。一般用比当前活动 API 更便宜的预设；失败时会回退到用户输入本身参与召回，不阻断原始发送。"
        >
          <AcuFormRow
            label="关键词 API 预设"
            hint="仅用于发送前关键词生成；留空 = 跟随当前活动 API。"
          >
            <AcuSelect
              :options="keywordApiOptions"
              :model-value="vector.form.keywordApiPreset"
              placeholder="跟随当前活动 API"
              @update:model-value="vector.setApiField('keywordApiPreset', $event)"
            />
          </AcuFormRow>
          <div class="acu-v2-vector-index-page__number-grid">
            <AcuFormRow
              label="上下文读取层数"
              hint="关键词生成时读取的最近对话层数；1 层 = 1 条 AI 回复 + 其上方 1 条用户输入。"
            >
              <AcuInput
                :model-value="vector.form.keywordContextPairCount"
                type="number"
                :min="1"
                :step="1"
                @change="vector.setNumberField('keywordContextPairCount', $event)"
              />
            </AcuFormRow>
            <AcuFormRow
              label="最大尝试次数"
              hint="关键词生成失败时会回退到用户输入本身参与召回，不阻断原始发送。"
            >
              <AcuInput
                :model-value="vector.form.keywordGenerationMaxAttempts"
                type="number"
                :min="1"
                :step="1"
                @change="vector.setNumberField('keywordGenerationMaxAttempts', $event)"
              />
            </AcuFormRow>
          </div>
        </AcuPanel>

        <AcuPanel
          title="关键词生成提示词"
          description="这里控制交火模式发送前怎样把当前输入整理成召回关键词。普通使用建议保持默认；只有召回结果经常跑偏，或你想改变关键词风格时再编辑。改错后可以在抽屉里载入默认提示词。"
        >
          <template #actions>
            <AcuBadge :variant="promptTemplateBadgeVariant">{{ promptTemplateBadgeLabel }}</AcuBadge>
          </template>

          <AcuMessage v-if="keywordPromptEmpty" kind="warning">
            关键词生成提示词为空，发送前会直接用用户输入参与召回；建议载入默认提示词后保存。
          </AcuMessage>

          <div class="acu-v2-vector-index-page__prompt-actions">
            <AcuButton variant="primary" @click="promptDrawerOpen = true">编辑提示词</AcuButton>
          </div>
        </AcuPanel>
      </div>
    </div>

    <div v-if="devOptions.vectorIndexAdvanced.value" class="acu-v2-vector-index-page__advanced-grid">
      <AcuPanel
        title="召回参数"
        description="控制纪要表多大体量才启用召回、每次召回多少条注入、最近多少条不参与排序固定注入。配置错（如候选上限小于 TopK）会被自动纠正，但请尽量保持「触发阈值 ≥ 最近固定 + TopK」的关系，避免召回阶段无效工作。"
      >
        <div class="acu-v2-vector-index-page__number-grid">
          <AcuFormRow
            label="发送前交火触发阈值"
            hint="纪要表有效行数达到该值后，发送前才会生成关键词并召回概要列 chunk；未达到时保留原概要索引流程。"
          >
            <AcuInput
              :model-value="vector.form.summaryIndexKeywordMinRows"
              type="number"
              :min="1"
              :step="1"
              @change="vector.setNumberField('summaryIndexKeywordMinRows', $event)"
            />
          </AcuFormRow>
          <AcuFormRow
            label="最终覆盖 TopK"
            hint="Rerank 后选中的纪要数量上限；写入原概要索引条目时会重新按纪要表原始顺序排列。"
          >
            <AcuInput
              :model-value="vector.form.topK"
              type="number"
              :min="1"
              :step="1"
              @change="vector.setNumberField('topK', $event)"
            />
          </AcuFormRow>
          <AcuFormRow
            label="Embedding 预筛最小分数"
            hint="发送前先用 query embedding 对纪要 chunk 预筛；Rerank 只会处理通过预筛的候选。"
          >
            <AcuInput
              :model-value="vector.form.minScore"
              type="number"
              :min="0"
              :max="1"
              :step="0.01"
              @change="vector.setMinScore($event)"
            />
          </AcuFormRow>
          <AcuFormRow
            label="预筛候选上限"
            hint="Embedding 本地预筛后保留的候选数量，也是 Rerank 最大输入数；不能小于 TopK。"
          >
            <AcuInput
              :model-value="vector.form.recallCandidateLimit"
              type="number"
              :min="1"
              :step="1"
              @change="vector.setNumberField('recallCandidateLimit', $event)"
            />
          </AcuFormRow>
          <AcuFormRow
            label="最近固定注入条数"
            hint="最近 X 条纪要固定注入，不参与排序；X 计入触发阈值但不计入 TopK。"
          >
            <AcuInput
              :model-value="vector.form.recentFixedInjectCount"
              type="number"
              :min="0"
              :step="1"
              @change="vector.setNumberField('recentFixedInjectCount', $event)"
            />
          </AcuFormRow>
          <AcuFormRow
            label="索引命名空间前缀"
            hint="用于区分不同聊天的外置索引缓存；会与当前聊天标识拼接。"
          >
            <AcuInput
              :model-value="vector.form.vectorNamespace"
              type="text"
              placeholder="chat"
              @change="vector.setApiField('vectorNamespace', $event)"
            />
          </AcuFormRow>
        </div>
      </AcuPanel>

      <AcuPanel
        title="归档与分块"
        description="纪要保存后会立即归档：先按概要列文本切句子，再分批做 embedding 上传。数值越小召回越精细，但外置分片数量会增加；并发上限太小会让批量归档变慢。"
      >
        <div class="acu-v2-vector-index-page__number-grid">
          <AcuFormRow label="概要列分块句数" hint="对纪要表概要列文本分块。数值越小召回越精细，外置分片数量会增加。">
            <AcuInput
              :model-value="vector.form.summaryChunkSentenceCount"
              type="number"
              :min="1"
              :step="1"
              @change="vector.setNumberField('summaryChunkSentenceCount', $event)"
            />
          </AcuFormRow>
          <AcuFormRow label="每批归档行数" hint="多条新增 / 变更纪要按该数量拆分 embedding 批次。">
            <AcuInput
              :model-value="vector.form.summaryIndexArchiveMaxConcurrency"
              type="number"
              :min="1"
              :step="1"
              @change="vector.setNumberField('summaryIndexArchiveMaxConcurrency', $event)"
            />
          </AcuFormRow>
        </div>
      </AcuPanel>
    </div>

    <VectorIndexPromptDrawer
      :is-open="promptDrawerOpen"
      :segments="promptSegmentsForView"
      :dirty="vector.promptDirty.value"
      :message="vector.message.value"
      :role-options="ROLE_OPTIONS"
      @close="promptDrawerOpen = false"
      @save="vector.savePromptGroup"
      @reset="vector.resetPromptGroup"
      @add="vector.addPromptSegment($event)"
      @delete="vector.deletePromptSegment($event)"
      @update="onPromptUpdate"
    />
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import AcuBadge, { type AcuBadgeVariant } from '../components/_lib/AcuBadge.vue';
import AcuButton from '../components/_lib/AcuButton.vue';
import AcuFormRow from '../components/_lib/AcuFormRow.vue';
import AcuInfoBanner from '../components/_lib/AcuInfoBanner.vue';
import AcuInput from '../components/_lib/AcuInput.vue';
import AcuMessage from '../components/_lib/AcuMessage.vue';
import AcuPageHeader from '../components/_lib/AcuPageHeader.vue';
import AcuPanel from '../components/_lib/AcuPanel.vue';
import type { PromptSegment } from '../components/_lib/AcuPromptSegments.vue';
import AcuSelect, { type AcuSelectOption } from '../components/_lib/AcuSelect.vue';
import AcuStatsList from '../components/_lib/AcuStatsList.vue';
import VectorIndexPromptDrawer from '../components/VectorIndexPromptDrawer.vue';
import { useChatChangedTick } from '../composables/useChatChangedListener';
import { useDevOptions } from '../composables/useDevOptions';
import { useUiCloseGuard } from '../composables/useUiCloseGuard';
import { useVectorIndexConfig } from '../composables/useVectorIndexConfig';
import { useApiPresetStore } from '../stores/api-preset-store';
import { useRouterStore } from '../stores/router-store';

const vector = useVectorIndexConfig();
const devOptions = useDevOptions();
const apiStore = useApiPresetStore();
const routerStore = useRouterStore();
const promptDrawerOpen = ref(false);

const ROLE_OPTIONS: AcuSelectOption[] = [
  { value: 'system', label: 'SYSTEM' },
  { value: 'user', label: 'USER' },
  { value: 'assistant', label: 'ASSISTANT' },
];

const keywordApiOptions = computed<AcuSelectOption[]>(() => [
  { value: '', label: '跟随当前活动 API' },
  ...apiStore.presets.map(p => ({ value: p.name, label: p.name })),
]);

const promptSegmentsForView = computed<PromptSegment[]>(() =>
  vector.promptSegments.value.map(seg => ({
    role: seg.role,
    content: seg.content,
    deletable: seg.deletable,
  })),
);
const keywordPromptEmpty = computed(() =>
  vector.promptSegments.value.every(seg => !String(seg.content || '').trim()),
);
const promptTemplateBadgeLabel = computed(() =>
  vector.promptTemplateMode.value === 'default' ? '使用默认提示词' : '已自定义提示词',
);
const promptTemplateBadgeVariant = computed<AcuBadgeVariant>(() =>
  vector.promptTemplateMode.value === 'default' ? 'neutral' : 'accent',
);

function confirmPromptClose(): boolean {
  if (!promptDrawerOpen.value || !vector.promptDirty.value) return true;
  return window.confirm('你有未保存的关键词生成提示词修改，确定要关闭新 UI 吗？');
}

function onPromptUpdate(index: number, patch: Partial<PromptSegment>): void {
  vector.updatePromptSegment(index, {
    ...(patch.role !== undefined ? { role: patch.role } : {}),
    ...(patch.content !== undefined ? { content: patch.content } : {}),
  });
}

function refreshAll(): void {
  vector.refresh();
  void vector.refreshIndexStatus(false);
  apiStore.refreshFromSettings();
}

function goToApiPage(): void {
  routerStore.setActivePage('api');
}

function onDeleteCurrentIndex(): void {
  if (!window.confirm('删除当前聊天的交火索引？这会移除索引引用并清理可回收外置资产，之后需要重新构建。')) return;
  void vector.deleteCurrentIndex();
}

onMounted(() => { refreshAll(); });
watch(useChatChangedTick(), () => { refreshAll(); });
useUiCloseGuard(confirmPromptClose);
</script>

<style scoped>
.acu-v2-vector-index-page {
  min-height: 100%;
  min-width: 0;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.acu-v2-vector-index-page__warning-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  min-width: 0;
}

.acu-v2-vector-index-page__warning-content span {
  min-width: 0;
}

.acu-v2-vector-index-page__main-grid,
.acu-v2-vector-index-page__advanced-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  align-items: stretch;
}

.acu-v2-vector-index-page__side-stack {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.acu-v2-vector-index-page__number-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 10px;
}

.acu-v2-vector-index-page__main-grid > :deep(.acu-panel:first-child .acu-stats) {
  flex: 1 1 auto;
}

.acu-v2-vector-index-page__hint {
  margin: 0;
  font-size: 12px;
  color: var(--acu-text-3);
  line-height: 1.55;
}

.acu-v2-vector-index-page__actions {
  display: flex;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 8px;
  padding-top: 12px;
  margin-top: 4px;
}

.acu-v2-vector-index-page__prompt-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding-top: 12px;
  margin-top: 4px;
}

@media (max-width: 860px) {
  .acu-v2-vector-index-page {
    padding: 14px;
  }

  .acu-v2-vector-index-page__warning-content {
    align-items: flex-start;
    flex-direction: column;
  }

  .acu-v2-vector-index-page__main-grid,
  .acu-v2-vector-index-page__advanced-grid {
    grid-template-columns: 1fr;
  }
}
</style>
