<template>
  <section class="acu-v2-api-page">
    <AcuPageHeader title="API" />

    <div class="acu-v2-api-page__grid">
      <AcuPanel
        title="当前 API 配置"
        description="这里直接编辑当前聊天正在使用的文本生成 API。API 会被剧情推进、智能续写、表格回填等功能调用；如果保存后请求失败，请先检查连接方式、Endpoint、Key 和模型名。下拉框用于切换当前聊天使用哪个预设，齿轮用于管理预设库。"
      >
        <p class="acu-v2-api-page__status-line">
          当前聊天: <strong>{{ store.activePresetName || '未选择' }}</strong>
          <template v-if="store.defaultApiPresetName"> · 全局默认: <strong>{{ store.defaultApiPresetName }}</strong></template>
        </p>

        <AcuFormRow
          class="acu-v2-api-page__streaming-row"
          label="流式输出"
          hint="开启后，支持流式的文本生成会边生成边显示；关闭后会等完整结果返回。"
        >
          <AcuToggle
            :model-value="store.streamingEnabled"
            label="边生成边显示"
            @update:model-value="store.setStreamingEnabled($event)"
          />
        </AcuFormRow>

        <div class="acu-v2-api-page__select-row">
          <AcuPresetDropdown
            :items="presetDropdownItems"
            :model-value="store.activePresetName"
            :default-name="store.defaultApiPresetName"
            @update:model-value="store.setActivePresetForCurrentChat($event)"
            @set-default="store.setDefaultPreset($event)"
          />
          <AcuButton icon-only title="管理预设" @click="management.openManage">
            <i class="fa-solid fa-gear"></i>
          </AcuButton>
        </div>

        <form v-if="store.activePreset" class="acu-v2-api-page__editor" @submit.prevent="saveActiveDraft">
          <fieldset class="acu-v2-api-page__editor-section">
            <legend>基础信息</legend>
            <AcuFormRow label="预设名称" hint="重命名后，当前聊天和引用这个预设的功能会同步到新名称。">
              <AcuInput v-model="activeDraft.name" type="text" autocomplete="off" />
            </AcuFormRow>
          </fieldset>

          <fieldset class="acu-v2-api-page__editor-section">
            <legend>连接方式</legend>
            <AcuSegmentedControl
              :options="connectionModeOptions"
              :model-value="activeConnectionMode"
              aria-label="连接方式"
              @update:model-value="setActiveConnectionMode($event)"
            />

            <template v-if="activeConnectionMode === 'custom'">
              <AcuFormRow label="Endpoint">
                <AcuInput v-model="activeDraft.url" type="text" placeholder="https://example.com/v1" />
              </AcuFormRow>
              <AcuFormRow label="API Key">
                <AcuInput v-model="activeDraft.apiKey" type="password" autocomplete="off" />
              </AcuFormRow>
              <AcuFormRow label="Model">
                <AcuInput v-model="activeDraft.model" type="text" />
              </AcuFormRow>
              <div class="acu-v2-api-page__inline-action">
                <AcuButton @click="loadModelsForActive">加载模型</AcuButton>
                <span v-if="store.modelLoadStatus === 'loading'" class="acu-v2-api-page__muted">加载中...</span>
                <span v-else-if="store.modelLoadStatus === 'error'" class="acu-v2-api-page__danger">{{ store.modelLoadError }}</span>
              </div>
              <AcuFormRow v-if="store.modelOptions.length" label="模型列表">
                <AcuSelect
                  :options="modelSelectOptions"
                  :model-value="activeDraft.model"
                  placeholder="请选择"
                  @update:model-value="activeDraft.model = $event"
                />
              </AcuFormRow>
            </template>

            <template v-if="activeConnectionMode === 'tavern'">
              <AcuFormRow label="酒馆连接预设">
                <AcuSelect
                  :options="tavernProfileOptions"
                  :model-value="activeDraft.tavernProfile"
                  placeholder="请选择"
                  @update:model-value="activeDraft.tavernProfile = $event"
                />
              </AcuFormRow>
              <div class="acu-v2-api-page__inline-action">
                <AcuButton @click="store.refreshTavernProfiles">刷新列表</AcuButton>
              </div>
            </template>
          </fieldset>

          <fieldset v-if="activeConnectionMode === 'custom'" class="acu-v2-api-page__editor-section">
            <legend>参数</legend>
            <div class="acu-v2-api-page__two-col">
              <AcuFormRow label="Max Tokens">
                <AcuInput v-model="activeDraft.max_tokens" type="number" :min="1" :step="1" />
              </AcuFormRow>
              <AcuFormRow label="Temperature">
                <AcuInput v-model="activeDraft.temperature" type="number" :min="0" :max="2" :step="0.05" />
              </AcuFormRow>
            </div>
          </fieldset>

          <AcuMessage v-if="activeDraftError" kind="error">{{ activeDraftError }}</AcuMessage>
          <AcuMessage v-else-if="activeDraftSavedAt && !activeDraftDirty" kind="success">已保存当前 API 预设。</AcuMessage>

          <div class="acu-v2-form-actions">
            <AcuButton :disabled="!activeDraftDirty" @click="syncActiveDraft">放弃修改</AcuButton>
            <AcuButton variant="primary" native-type="submit" :disabled="!activeDraftDirty">保存当前预设</AcuButton>
          </div>
        </form>

        <AcuMessage v-else kind="warning">
          当前还没有可用 API 预设。请先新建一个预设，再把它设为当前聊天或全局默认。
        </AcuMessage>

        <div v-if="!store.activePreset" class="acu-v2-form-actions">
          <AcuButton variant="primary" @click="management.openCreate">新建 API 预设</AcuButton>
        </div>
      </AcuPanel>

      <AcuPanel
        title="交火模式向量服务"
        description="Embedding / Rerank 只服务于「交火模式」，不参与剧情推进、填表或续写的普通文本生成。这里保留配置状态，实际编辑放在交火模式页，避免把必填 API 和可选功能 API 混在一起。"
      >
        <div class="acu-v2-api-page__vector-status">
          <div>
            <span>Embedding</span>
            <AcuBadge :variant="vectorEmbeddingReady ? 'success' : 'warning'">
              {{ vectorEmbeddingReady ? '已配置' : '未配置' }}
            </AcuBadge>
          </div>
          <div>
            <span>Rerank</span>
            <AcuBadge :variant="vectorRerankReady ? 'success' : 'neutral'">
              {{ vectorRerankReady ? '已配置' : '可选' }}
            </AcuBadge>
          </div>
        </div>

        <dl class="acu-v2-api-page__vector-summary">
          <div>
            <dt>Embedding Endpoint</dt>
            <dd class="acu-v2-mono">{{ vectorConfig.form.embeddingEndpoint || '未填写' }}</dd>
          </div>
          <div>
            <dt>Embedding Model</dt>
            <dd class="acu-v2-mono">{{ vectorConfig.form.embeddingModel || '未填写' }}</dd>
          </div>
          <div>
            <dt>Rerank Endpoint</dt>
            <dd class="acu-v2-mono">{{ vectorConfig.form.rerankEndpoint || '未填写' }}</dd>
          </div>
          <div>
            <dt>Rerank Model</dt>
            <dd class="acu-v2-mono">{{ vectorConfig.form.rerankModel || '未填写' }}</dd>
          </div>
        </dl>

        <AcuMessage v-if="!vectorEmbeddingReady" kind="warning">
          交火模式需要 Embedding Endpoint 和 Model 才能执行召回。未使用交火模式时可以先不处理。
        </AcuMessage>

        <div class="acu-v2-form-actions">
          <AcuButton @click="goToVectorIndex">去交火模式配置</AcuButton>
        </div>
      </AcuPanel>
    </div>

    <ApiDrawer
      :is-open="management.isDrawerOpen.value"
      :view="management.drawerView.value"
      :title="management.title.value"
      :draft="management.draft"
      :error="management.error.value"
      :presets="store.presets"
      :tavern-profiles="store.tavernProfiles"
      :model-options="store.modelOptions"
      :model-load-status="store.modelLoadStatus"
      :model-load-error="store.modelLoadError"
      :before-close="() => management.confirmIfDirty()"
      @close="management.closeDrawer"
      @back="management.backToManage"
      @open-create="management.openCreate"
      @open-edit="management.openEdit($event)"
      @delete="deletePreset"
      @save="management.saveDraft"
      @discard="management.discardDraft"
      @load-models="loadModels"
      @refresh-tavern="store.refreshTavernProfiles"
    />
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import AcuBadge from '../components/_lib/AcuBadge.vue';
import AcuButton from '../components/_lib/AcuButton.vue';
import AcuFormRow from '../components/_lib/AcuFormRow.vue';
import AcuInput from '../components/_lib/AcuInput.vue';
import AcuPageHeader from '../components/_lib/AcuPageHeader.vue';
import AcuPanel from '../components/_lib/AcuPanel.vue';
import AcuMessage from '../components/_lib/AcuMessage.vue';
import AcuSelect, { type AcuSelectOption } from '../components/_lib/AcuSelect.vue';
import AcuSegmentedControl from '../components/_lib/AcuSegmentedControl.vue';
import type { AcuSegmentedOption } from '../components/_lib/AcuSegmentedControl.vue';
import AcuToggle from '../components/_lib/AcuToggle.vue';
import AcuPresetDropdown from '../components/_lib/AcuPresetDropdown.vue';
import type { PresetDropdownItem } from '../components/_lib/AcuPresetDropdown.vue';
import ApiDrawer from '../components/ApiDrawer.vue';
import {
  apiPresetDraftFromPreset,
  apiPresetFromDraft,
  applyConnectionMode,
  connectionModeFromDraft,
  createEmptyApiPresetDraft,
  useApiPresetManagement,
  type ApiPresetDraft,
  type ConnectionMode,
} from '../composables/useApiPresetManagement';
import { useUiCloseGuard } from '../composables/useUiCloseGuard';
import { useVectorApiConfig } from '../composables/useVectorApiConfig';
import { useApiPresetStore } from '../stores/api-preset-store';
import { useRouterStore } from '../stores/router-store';

const store = useApiPresetStore();
const management = useApiPresetManagement();
const vectorConfig = useVectorApiConfig();
const routerStore = useRouterStore();
const activeDraft = reactive<ApiPresetDraft>(createEmptyApiPresetDraft());
const activeDraftOriginalName = ref('');
const activeDraftSnapshot = ref('');
const activeDraftError = ref('');
const activeDraftSavedAt = ref<number | null>(null);

const presetDropdownItems = computed<PresetDropdownItem[]>(() =>
  store.presets.map(p => ({
    name: p.name,
    meta: p.apiMode === 'tavern' ? '酒馆预设' : (p.apiConfig.useMainApi ? '酒馆主 API' : (p.apiConfig.model || '自定义')),
  }))
);
const vectorEmbeddingReady = computed(() =>
  !!vectorConfig.form.embeddingEndpoint.trim() && !!vectorConfig.form.embeddingModel.trim(),
);
const vectorRerankReady = computed(() =>
  !!vectorConfig.form.rerankEndpoint.trim() && !!vectorConfig.form.rerankModel.trim(),
);
const activeConnectionMode = computed<ConnectionMode>(() => connectionModeFromDraft(activeDraft));
const activeDraftDirty = computed(() =>
  !!store.activePreset && JSON.stringify(activeDraft) !== activeDraftSnapshot.value,
);
const connectionModeOptions: AcuSegmentedOption[] = [
  { value: 'main', label: '酒馆主 API' },
  { value: 'custom', label: '自定义' },
  { value: 'tavern', label: '酒馆预设' },
];
const modelSelectOptions = computed<AcuSelectOption[]>(() =>
  store.modelOptions.map(m => ({ value: m, label: m })),
);
const tavernProfileOptions = computed<AcuSelectOption[]>(() =>
  store.tavernProfiles.map(p => ({ value: p.id, label: p.name })),
);

function refreshAll(): void {
  store.refreshFromSettings();
  store.refreshTavernProfiles();
  vectorConfig.refresh();
  syncActiveDraft();
}

onMounted(() => { refreshAll(); });
useUiCloseGuard(() => {
  if (activeDraftDirty.value && !window.confirm('你有未保存的当前 API 修改，确定要关闭新 UI 吗？')) {
    return false;
  }
  if (!management.isDrawerOpen.value) return true;
  return management.confirmIfDirty();
});

function deletePreset(name: string): void {
  if (!window.confirm(`删除 API 预设"${name}"？`)) return;
  store.deletePreset(name);
  syncActiveDraft();
}
async function loadModels(): Promise<void> {
  await store.loadModelsForConfig({ url: management.draft.url, apiKey: management.draft.apiKey });
}

function goToVectorIndex(): void {
  routerStore.setActivePage('vector-index');
}

function syncActiveDraft(): void {
  const preset = store.activePreset;
  if (!preset) {
    Object.assign(activeDraft, createEmptyApiPresetDraft());
    activeDraftOriginalName.value = '';
  } else {
    Object.assign(activeDraft, createEmptyApiPresetDraft(), apiPresetDraftFromPreset(preset));
    activeDraftOriginalName.value = preset.name;
  }
  activeDraftSnapshot.value = JSON.stringify(activeDraft);
  activeDraftError.value = '';
  activeDraftSavedAt.value = null;
}

function validateActiveDraft(): boolean {
  if (!activeDraft.name.trim()) {
    activeDraftError.value = '预设名称不能为空。';
    return false;
  }
  if (activeDraft.apiMode === 'tavern' && !activeDraft.tavernProfile.trim()) {
    activeDraftError.value = '请选择酒馆连接预设。';
    return false;
  }
  if (activeDraft.apiMode === 'custom' && !activeDraft.useMainApi) {
    if (!activeDraft.url.trim()) {
      activeDraftError.value = '自定义 API 需要填写 Endpoint。';
      return false;
    }
    if (!activeDraft.model.trim()) {
      activeDraftError.value = '自定义 API 需要填写模型。';
      return false;
    }
  }
  activeDraftError.value = '';
  return true;
}

function saveActiveDraft(): void {
  if (!validateActiveDraft()) return;
  const ok = store.savePreset(apiPresetFromDraft(activeDraft), activeDraftOriginalName.value);
  if (!ok) {
    activeDraftError.value = '预设保存失败。';
    return;
  }
  store.refreshFromSettings();
  syncActiveDraft();
  activeDraftSavedAt.value = Date.now();
}

function setActiveConnectionMode(value: string): void {
  applyConnectionMode(activeDraft, value as ConnectionMode);
  activeDraftSavedAt.value = null;
}

async function loadModelsForActive(): Promise<void> {
  await store.loadModelsForConfig({ url: activeDraft.url, apiKey: activeDraft.apiKey });
}

watch(() => store.activePresetName, () => syncActiveDraft(), { flush: 'sync' });
</script>

<style scoped>
.acu-v2-api-page {
  min-height: 100%; min-width: 0; padding: 20px;
  display: flex; flex-direction: column; gap: 18px;
}

.acu-v2-api-page__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  align-items: stretch;
}

.acu-v2-api-page__status-line { margin: 0 0 12px; font-size: 12px; color: var(--acu-text-3); }
.acu-v2-api-page__status-line strong { color: var(--acu-text-1); font-weight: 500; }

.acu-v2-api-page__streaming-row {
  padding: 8px 0;
  border-top: 1px solid color-mix(in srgb, var(--acu-text-3) 14%, transparent);
  border-bottom: 1px solid color-mix(in srgb, var(--acu-text-3) 14%, transparent);
  border-radius: 0;
  background: transparent;
}

.acu-v2-api-page__select-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) max-content;
  gap: 6px;
  align-items: stretch;
  margin-bottom: 14px;
  min-width: 0;
}

.acu-v2-mono { font-family: var(--acu-font-mono); }

.acu-v2-api-page__editor {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.acu-v2-api-page__editor-section {
  min-width: 0;
  margin: 0;
  padding: 0 0 14px;
  border: 0;
  border-bottom: 1px solid color-mix(in srgb, var(--acu-text-3) 16%, transparent);
  border-radius: 0;
  background: transparent;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.acu-v2-api-page__editor-section:last-of-type {
  padding-bottom: 0;
  border-bottom: 0;
}

.acu-v2-api-page__editor-section legend {
  padding: 0;
  color: var(--acu-text-2);
  font-size: 12px;
  font-weight: 600;
}

.acu-v2-api-page__inline-action {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}

.acu-v2-api-page__two-col {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.acu-v2-api-page__muted {
  color: var(--acu-text-3);
  font-size: 12px;
}

.acu-v2-api-page__danger {
  color: var(--acu-danger);
  font-size: 12px;
}

.acu-v2-api-page__vector-status {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 14px;
  margin-bottom: 12px;
  padding: 8px 0;
  border-top: 1px solid color-mix(in srgb, var(--acu-text-3) 14%, transparent);
  border-bottom: 1px solid color-mix(in srgb, var(--acu-text-3) 14%, transparent);
}

.acu-v2-api-page__vector-status div {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--acu-text-2);
}

.acu-v2-api-page__vector-summary {
  margin: 0 0 12px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.acu-v2-api-page__vector-summary dt {
  font-size: 11px;
  color: var(--acu-text-3);
  margin: 0 0 2px;
}

.acu-v2-api-page__vector-summary dd {
  margin: 0;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
  color: var(--acu-text-1);
}

.acu-v2-form-actions { display: flex; justify-content: flex-end; gap: 8px; }

@media (max-width: 860px) {
  .acu-v2-api-page { padding: 14px; }
  .acu-v2-api-page__grid { grid-template-columns: 1fr; }
  .acu-v2-api-summary dl { grid-template-columns: 1fr; }
}
</style>
