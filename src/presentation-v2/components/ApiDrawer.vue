<template>
  <AcuDrawer
    :is-open="isOpen"
    :title="title"
    :show-back="view === 'create' || view === 'edit'"
    :before-close="beforeClose"
    width="480px"
    @close="$emit('close')"
    @back="$emit('back')"
  >
    <!-- MANAGE VIEW -->
    <template v-if="view === 'manage'">
      <AcuButton variant="primary" class="acu-v2-api-drawer__create-btn" @click="$emit('open-create')">
        <i class="fa-solid fa-plus"></i> 新建预设
      </AcuButton>
      <ul v-if="presets.length" class="acu-v2-manage-list">
        <li v-for="preset in presets" :key="preset.name" class="acu-v2-manage-item">
          <div class="acu-v2-manage-item__info">
            <span class="acu-v2-manage-item__name">{{ preset.name }}</span>
            <span class="acu-v2-manage-item__meta">{{ presetMeta(preset) }}</span>
          </div>
          <div class="acu-v2-manage-item__actions">
            <AcuIconButton icon="fa-solid fa-pen" title="编辑" @click="$emit('open-edit', preset)" />
            <AcuIconButton icon="fa-solid fa-trash-can" variant="danger" title="删除" @click="$emit('delete', preset.name)" />
          </div>
        </li>
      </ul>
      <p v-else class="acu-v2-api-drawer__empty">暂无预设，点击上方按钮新建。</p>
    </template>

    <!-- CREATE / EDIT VIEW -->
    <form v-else class="acu-v2-form" @submit.prevent="$emit('save')">
      <fieldset class="acu-v2-form__section">
        <legend>基础信息</legend>
        <AcuFormRow label="预设名称">
          <AcuInput v-model="draft.name" type="text" autocomplete="off" />
        </AcuFormRow>
      </fieldset>

      <fieldset class="acu-v2-form__section">
        <legend>连接方式</legend>
        <AcuSegmentedControl
          :options="connectionModeOptions"
          :model-value="connMode"
          aria-label="连接方式"
          @update:model-value="onConnModeChange"
        />

        <template v-if="connMode === 'custom'">
          <AcuFormRow label="Endpoint">
            <AcuInput v-model="draft.url" type="text" placeholder="https://example.com/v1" />
          </AcuFormRow>
          <AcuFormRow label="API Key">
            <AcuInput v-model="draft.apiKey" type="password" autocomplete="off" />
          </AcuFormRow>
          <AcuFormRow label="Model">
            <AcuInput v-model="draft.model" type="text" />
          </AcuFormRow>
          <div class="acu-v2-inline-action">
            <AcuButton @click="$emit('load-models')">加载模型</AcuButton>
            <span v-if="modelLoadStatus === 'loading'" class="acu-v2-text-muted">加载中…</span>
            <span v-else-if="modelLoadStatus === 'error'" class="acu-v2-text-danger">{{ modelLoadError }}</span>
          </div>
          <AcuFormRow v-if="modelOptions.length" label="模型列表">
            <AcuSelect
              :options="modelSelectOptions"
              :model-value="draft.model"
              placeholder="请选择"
              @update:model-value="draft.model = $event"
            />
          </AcuFormRow>
        </template>

        <template v-if="connMode === 'tavern'">
          <AcuFormRow label="酒馆连接预设">
            <AcuSelect
              :options="tavernProfileOptions"
              :model-value="draft.tavernProfile"
              placeholder="请选择"
              @update:model-value="draft.tavernProfile = $event"
            />
          </AcuFormRow>
          <AcuButton @click="$emit('refresh-tavern')">刷新列表</AcuButton>
        </template>
      </fieldset>

      <fieldset v-if="connMode === 'custom'" class="acu-v2-form__section">
        <legend>参数</legend>
        <div class="acu-v2-two-col">
          <AcuFormRow label="Max Tokens">
            <AcuInput v-model="draft.max_tokens" type="number" :min="1" :step="1" />
          </AcuFormRow>
          <AcuFormRow label="Temperature">
            <AcuInput v-model="draft.temperature" type="number" :min="0" :max="2" :step="0.05" />
          </AcuFormRow>
        </div>
      </fieldset>

      <p v-if="error" class="acu-v2-error" role="alert">{{ error }}</p>

      <footer class="acu-v2-api-drawer__actions">
        <AcuButton @click="$emit('discard')">关闭</AcuButton>
        <AcuButton variant="primary" native-type="submit">保存预设</AcuButton>
      </footer>
    </form>
  </AcuDrawer>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import AcuDrawer from './_lib/AcuDrawer.vue';
import AcuButton from './_lib/AcuButton.vue';
import AcuFormRow from './_lib/AcuFormRow.vue';
import AcuIconButton from './_lib/AcuIconButton.vue';
import AcuInput from './_lib/AcuInput.vue';
import AcuSelect from './_lib/AcuSelect.vue';
import type { AcuSelectOption } from './_lib/AcuSelect.vue';
import AcuSegmentedControl from './_lib/AcuSegmentedControl.vue';
import type { AcuSegmentedOption } from './_lib/AcuSegmentedControl.vue';
import type { ApiPresetDraft, DrawerView, ConnectionMode } from '../composables/useApiPresetManagement';
import { connectionModeFromDraft, applyConnectionMode } from '../composables/useApiPresetManagement';
import type { AcuV2ApiPreset } from '../stores/api-preset-store';

const props = defineProps<{
  isOpen: boolean;
  view: DrawerView;
  title: string;
  draft: ApiPresetDraft;
  error: string;
  presets: AcuV2ApiPreset[];
  tavernProfiles: Array<{ id: string; name: string }>;
  modelOptions: string[];
  modelLoadStatus: string;
  modelLoadError: string;
  beforeClose?: () => boolean;
}>();

defineEmits<{
  (e: 'close'): void;
  (e: 'back'): void;
  (e: 'open-create'): void;
  (e: 'open-edit', preset: AcuV2ApiPreset): void;
  (e: 'delete', name: string): void;
  (e: 'save'): void;
  (e: 'discard'): void;
  (e: 'load-models'): void;
  (e: 'refresh-tavern'): void;
}>();

const connMode = computed<ConnectionMode>(() => connectionModeFromDraft(props.draft));

const connectionModeOptions: AcuSegmentedOption[] = [
  { value: 'main', label: '酒馆主 API' },
  { value: 'custom', label: '自定义' },
  { value: 'tavern', label: '酒馆预设' },
];

const modelSelectOptions = computed<AcuSelectOption[]>(() =>
  props.modelOptions.map(m => ({ value: m, label: m })),
);

const tavernProfileOptions = computed<AcuSelectOption[]>(() =>
  props.tavernProfiles.map(p => ({ value: p.id, label: p.name })),
);

function setConnMode(mode: ConnectionMode) {
  applyConnectionMode(props.draft, mode);
}

function onConnModeChange(value: string): void {
  setConnMode(value as ConnectionMode);
}

function presetMeta(preset: AcuV2ApiPreset): string {
  if (preset.apiMode === 'tavern') return '酒馆预设';
  return preset.apiConfig.useMainApi ? '酒馆主 API' : (preset.apiConfig.model || '自定义');
}
</script>

<style scoped>
.acu-v2-api-drawer__create-btn { width: 100%; }
.acu-v2-api-drawer__empty { text-align: center; color: var(--acu-text-3); font-size: 13px; margin-top: 20px; }
.acu-v2-api-drawer__actions { display: flex; justify-content: flex-end; gap: 8px; flex-wrap: wrap; padding-top: 12px; margin-top: 12px; }

/* manage list */
.acu-v2-manage-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
.acu-v2-manage-item {
  display: flex; align-items: center; gap: 10px; padding: 10px 12px;
  border: 0; border-radius: var(--acu-radius-sm);
  background: var(--acu-bg-2); transition: background 0.1s ease;
}
.acu-v2-manage-item:hover { background: var(--acu-bg-3); }
.acu-v2-manage-item__info { flex: 1; min-width: 0; }
.acu-v2-manage-item__name { display: block; font-weight: 500; font-size: 13px; color: var(--acu-text-1); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.acu-v2-manage-item__meta { display: block; font-size: 11px; color: var(--acu-text-3); margin-top: 2px; }
.acu-v2-manage-item__actions { display: flex; gap: 4px; }

/* form */
.acu-v2-form { display: flex; flex-direction: column; gap: 14px; }
.acu-v2-form__section { min-width: 0; margin: 0; padding: 12px; border: 0; border-radius: var(--acu-radius-sm); background: var(--acu-bg-2); display: flex; flex-direction: column; gap: 10px; }
.acu-v2-form__section legend { padding: 0 4px; color: var(--acu-text-2); font-size: 12px; font-weight: 600; }
.acu-v2-two-col { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
.acu-v2-inline-action { display: flex; align-items: center; gap: 10px; }
.acu-v2-text-muted { color: var(--acu-text-3); font-size: 12px; }
.acu-v2-text-danger { color: var(--acu-danger); font-size: 12px; }

.acu-v2-error { padding: 8px 10px; color: var(--acu-danger); background: color-mix(in srgb, var(--acu-danger) 10%, transparent); border: 0; border-radius: var(--acu-radius-sm); font-size: 12px; margin: 0; }
</style>
