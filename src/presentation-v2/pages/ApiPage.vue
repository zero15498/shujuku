<template>
  <section class="acu-v2-api-page">
    <AcuPageHeader title="API" />

    <div class="acu-v2-api-page__grid">
      <!-- API Preset Panel -->
      <AcuPanel
        title="API 预设"
        description="用于剧情推进、智能续写、表格回填等所有 AI 文本生成的 API 配置。下拉框切换「当前聊天」使用哪个预设；齿轮图标进入管理面板，可以新建预设并设为全局默认。流式开关控制是否边生成边显示。"
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
          <AcuButton icon-only title="编辑当前预设" :disabled="!store.activePreset" @click="management.openEditCurrent">
            <i class="fa-solid fa-pen"></i>
          </AcuButton>
          <AcuButton icon-only title="管理预设" @click="management.openManage">
            <i class="fa-solid fa-gear"></i>
          </AcuButton>
        </div>

        <div v-if="store.activePreset" class="acu-v2-api-summary">
          <dl>
            <div><dt>模式</dt><dd>{{ activeModeLabel }}</dd></div>
            <div v-if="showEndpoint"><dt>Endpoint</dt><dd class="acu-v2-mono">{{ store.activePreset.apiConfig.url || '—' }}</dd></div>
            <div v-if="showModel"><dt>模型</dt><dd class="acu-v2-mono">{{ store.activePreset.apiConfig.model || '—' }}</dd></div>
            <div v-if="showParams"><dt>Max Tokens</dt><dd class="acu-v2-mono">{{ store.activePreset.apiConfig.max_tokens }}</dd></div>
            <div v-if="showParams"><dt>Temperature</dt><dd class="acu-v2-mono">{{ store.activePreset.apiConfig.temperature }}</dd></div>
            <div v-if="store.activePreset.apiMode === 'tavern'"><dt>酒馆预设</dt><dd>{{ store.activePreset.tavernProfile || '未选择' }}</dd></div>
          </dl>
        </div>
      </AcuPanel>

      <!-- Vector Config Panel -->
      <AcuPanel
        title="Embedding / Rerank"
        description="仅当你启用了「交火模式纪要索引」时才需要填写。Embedding 用于把历史纪要转成向量；Rerank 在召回时对候选段重新排序，提高匹配准确度。两者都是独立服务，与上面的 API 预设不共用。如果你不知道这是什么，先不用填。"
      >
        <form class="acu-v2-vform" @submit.prevent="vectorConfig.save">
          <fieldset class="acu-v2-vform__section">
            <legend>Embedding</legend>
            <AcuFormRow label="Endpoint">
              <AcuInput v-model="vectorConfig.form.embeddingEndpoint" type="text" placeholder="https://example.com/embeddings" />
            </AcuFormRow>
            <AcuFormRow label="Model">
              <AcuInput v-model="vectorConfig.form.embeddingModel" type="text" placeholder="text-embedding-3-large" />
            </AcuFormRow>
            <AcuFormRow label="API Key">
              <AcuInput v-model="vectorConfig.form.embeddingApiKey" type="password" autocomplete="off" />
            </AcuFormRow>
          </fieldset>

          <fieldset class="acu-v2-vform__section">
            <legend>Rerank</legend>
            <AcuFormRow label="Endpoint">
              <AcuInput v-model="vectorConfig.form.rerankEndpoint" type="text" placeholder="https://example.com/rerank" />
            </AcuFormRow>
            <AcuFormRow label="Model">
              <AcuInput v-model="vectorConfig.form.rerankModel" type="text" placeholder="bge-reranker-v2-m3" />
            </AcuFormRow>
            <AcuFormRow label="API Key">
              <AcuInput v-model="vectorConfig.form.rerankApiKey" type="password" autocomplete="off" />
            </AcuFormRow>
          </fieldset>

          <AcuMessage v-if="vectorConfig.errors.value.length" kind="error">
            <p v-for="error in vectorConfig.errors.value" :key="error">{{ error }}</p>
          </AcuMessage>
          <AcuMessage v-else-if="vectorConfig.savedAt.value" kind="success">已保存</AcuMessage>

          <div class="acu-v2-form-actions">
            <AcuButton variant="primary" native-type="submit">保存向量配置</AcuButton>
          </div>
        </form>
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
import { computed, onMounted } from 'vue';
import AcuButton from '../components/_lib/AcuButton.vue';
import AcuPageHeader from '../components/_lib/AcuPageHeader.vue';
import AcuPanel from '../components/_lib/AcuPanel.vue';
import AcuFormRow from '../components/_lib/AcuFormRow.vue';
import AcuInput from '../components/_lib/AcuInput.vue';
import AcuMessage from '../components/_lib/AcuMessage.vue';
import AcuToggle from '../components/_lib/AcuToggle.vue';
import AcuPresetDropdown from '../components/_lib/AcuPresetDropdown.vue';
import type { PresetDropdownItem } from '../components/_lib/AcuPresetDropdown.vue';
import ApiDrawer from '../components/ApiDrawer.vue';
import { useApiPresetManagement } from '../composables/useApiPresetManagement';
import { useUiCloseGuard } from '../composables/useUiCloseGuard';
import { useVectorApiConfig } from '../composables/useVectorApiConfig';
import { useApiPresetStore } from '../stores/api-preset-store';

const store = useApiPresetStore();
const management = useApiPresetManagement();
const vectorConfig = useVectorApiConfig();

const activeModeLabel = computed(() => {
  const p = store.activePreset;
  if (!p) return '';
  if (p.apiMode === 'tavern') return '酒馆预设';
  return p.apiConfig.useMainApi ? '酒馆主 API' : '自定义';
});
const showEndpoint = computed(() => store.activePreset?.apiMode === 'custom' && !store.activePreset.apiConfig.useMainApi);
const showModel = computed(() => store.activePreset?.apiMode === 'custom' && !store.activePreset.apiConfig.useMainApi);
const showParams = computed(() => store.activePreset?.apiMode === 'custom' && !store.activePreset.apiConfig.useMainApi);
const presetDropdownItems = computed<PresetDropdownItem[]>(() =>
  store.presets.map(p => ({
    name: p.name,
    meta: p.apiMode === 'tavern' ? '酒馆预设' : (p.apiConfig.useMainApi ? '酒馆主 API' : (p.apiConfig.model || '自定义')),
  }))
);

function refreshAll(): void {
  store.refreshFromSettings();
  store.refreshTavernProfiles();
  vectorConfig.refresh();
}

onMounted(() => { refreshAll(); });
useUiCloseGuard(() => {
  if (!management.isDrawerOpen.value) return true;
  return management.confirmIfDirty();
});

function deletePreset(name: string): void {
  if (!window.confirm(`删除 API 预设"${name}"？`)) return;
  store.deletePreset(name);
}
async function loadModels(): Promise<void> {
  await store.loadModelsForConfig({ url: management.draft.url, apiKey: management.draft.apiKey });
}
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
  padding: 10px 12px;
  border-radius: var(--acu-radius-sm);
  background: var(--acu-bg-2);
}

.acu-v2-api-page__select-row { display: flex; gap: 6px; align-items: stretch; margin-bottom: 14px; min-width: 0; }

.acu-v2-api-summary { padding: 12px; background: var(--acu-bg-2); border-radius: var(--acu-radius-sm); }
.acu-v2-api-summary dl { margin: 0; display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
.acu-v2-api-summary dt { font-size: 11px; color: var(--acu-text-3); margin: 0 0 2px; }
.acu-v2-api-summary dd { margin: 0; font-size: 12px; color: var(--acu-text-1); word-break: break-all; }
.acu-v2-mono { font-family: Consolas, 'Courier New', monospace; }

.acu-v2-vform { display: flex; flex-direction: column; gap: 14px; }
.acu-v2-vform__section {
  min-width: 0; margin: 0; padding: 12px;
  border: 0; border-radius: var(--acu-radius-sm);
  background: var(--acu-bg-2);
  display: flex; flex-direction: column; gap: 10px;
}
.acu-v2-vform__section legend { padding: 0 4px; color: var(--acu-text-2); font-size: 12px; font-weight: 600; }
.acu-v2-form-actions { display: flex; justify-content: flex-end; gap: 8px; }

@media (max-width: 860px) {
  .acu-v2-api-page { padding: 14px; }
  .acu-v2-api-page__grid { grid-template-columns: 1fr; }
  .acu-v2-api-summary dl { grid-template-columns: 1fr; }
}
</style>
