import { computed, reactive, ref } from 'vue';
import type { AcuV2ApiMode, AcuV2ApiPreset } from '../stores/api-preset-store';
import { useApiPresetStore } from '../stores/api-preset-store';

export interface ApiPresetDraft {
  name: string;
  apiMode: AcuV2ApiMode;
  useMainApi: boolean;
  url: string;
  apiKey: string;
  model: string;
  max_tokens: number;
  temperature: number;
  tavernProfile: string;
}

/** Effective connection mode — flattens apiMode + useMainApi into 3 user-visible states. */
export type ConnectionMode = 'main' | 'custom' | 'tavern';

export function connectionModeFromDraft(draft: ApiPresetDraft): ConnectionMode {
  if (draft.apiMode === 'tavern') return 'tavern';
  return draft.useMainApi ? 'main' : 'custom';
}

export function applyConnectionMode(draft: ApiPresetDraft, mode: ConnectionMode): void {
  if (mode === 'tavern') {
    draft.apiMode = 'tavern';
    draft.useMainApi = false;
  } else if (mode === 'main') {
    draft.apiMode = 'custom';
    draft.useMainApi = true;
  } else {
    draft.apiMode = 'custom';
    draft.useMainApi = false;
  }
}

export function createEmptyApiPresetDraft(): ApiPresetDraft {
  return {
    name: '',
    apiMode: 'custom',
    useMainApi: true,
    url: '',
    apiKey: '',
    model: '',
    max_tokens: 60000,
    temperature: 1,
    tavernProfile: '',
  };
}

export function apiPresetDraftFromPreset(preset: AcuV2ApiPreset): ApiPresetDraft {
  return {
    name: preset.name,
    apiMode: preset.apiMode,
    useMainApi: preset.apiConfig.useMainApi !== false,
    url: preset.apiConfig.url || '',
    apiKey: preset.apiConfig.apiKey || '',
    model: preset.apiConfig.model || '',
    max_tokens: Number(preset.apiConfig.max_tokens || 60000),
    temperature: Number(preset.apiConfig.temperature ?? 1),
    tavernProfile: preset.tavernProfile || '',
  };
}

export function apiPresetFromDraft(draft: ApiPresetDraft): AcuV2ApiPreset {
  return {
    name: draft.name.trim(),
    apiMode: draft.apiMode,
    tavernProfile: draft.tavernProfile.trim(),
    apiConfig: {
      url: draft.url.trim(),
      apiKey: draft.apiKey,
      model: draft.model.trim(),
      useMainApi: draft.useMainApi,
      max_tokens: Math.max(1, Math.floor(Number(draft.max_tokens) || 60000)),
      temperature: Number.isFinite(Number(draft.temperature)) ? Number(draft.temperature) : 1,
    },
  };
}

export type DrawerView = 'closed' | 'manage' | 'create' | 'edit';

export function useApiPresetManagement() {
  const store = useApiPresetStore();
  const drawerView = ref<DrawerView>('closed');
  const originalName = ref('');
  const draft = reactive<ApiPresetDraft>(createEmptyApiPresetDraft());
  const error = ref('');
  const initialSnapshot = ref('');

  const isDrawerOpen = computed(() => drawerView.value !== 'closed');
  const title = computed(() => {
    switch (drawerView.value) {
      case 'manage': return '管理 API 预设';
      case 'edit': return '编辑 API 预设';
      case 'create': return '新建 API 预设';
      default: return '';
    }
  });
  const isDirty = computed(() => {
    if (drawerView.value !== 'create' && drawerView.value !== 'edit') return false;
    return JSON.stringify(draft) !== initialSnapshot.value;
  });

  function replaceDraft(next: ApiPresetDraft): void {
    Object.assign(draft, createEmptyApiPresetDraft(), next);
  }

  function takeSnapshot(): void {
    initialSnapshot.value = JSON.stringify(draft);
  }

  // --- Drawer open methods ---

  function openManage(): void {
    error.value = '';
    drawerView.value = 'manage';
  }

  function openCreate(): void {
    replaceDraft(createEmptyApiPresetDraft());
    originalName.value = '';
    error.value = '';
    drawerView.value = 'create';
    takeSnapshot();
  }

  function openEdit(preset: AcuV2ApiPreset): void {
    replaceDraft(apiPresetDraftFromPreset(preset));
    originalName.value = preset.name;
    error.value = '';
    drawerView.value = 'edit';
    takeSnapshot();
  }

  function openEditCurrent(): void {
    const preset = store.activePreset;
    if (preset) openEdit(preset);
  }

  // --- Dirty guard ---

  function confirmIfDirty(): boolean {
    if (!isDirty.value) return true;
    return window.confirm('你有未保存的修改，确定要退出吗？');
  }

  // --- Drawer close / discard ---

  function closeDrawer(): void {
    drawerView.value = 'closed';
  }

  function backToManage(): void {
    error.value = '';
    drawerView.value = 'manage';
  }

  function discardDraft(): void {
    replaceDraft(createEmptyApiPresetDraft());
    originalName.value = '';
    error.value = '';
    drawerView.value = 'manage';
  }

  // --- Validation + Save ---

  function validateDraft(): boolean {
    if (!draft.name.trim()) {
      error.value = '预设名称不能为空。';
      return false;
    }
    if (draft.apiMode === 'tavern' && !draft.tavernProfile.trim()) {
      error.value = '请选择酒馆连接预设。';
      return false;
    }
    if (draft.apiMode === 'custom' && !draft.useMainApi) {
      if (!draft.url.trim()) {
        error.value = '自定义 API 需要填写 Endpoint。';
        return false;
      }
      if (!draft.model.trim()) {
        error.value = '自定义 API 需要填写模型。';
        return false;
      }
    }
    error.value = '';
    return true;
  }

  function saveDraft(): boolean {
    if (!validateDraft()) return false;
    const ok = store.savePreset(apiPresetFromDraft(draft), originalName.value);
    if (!ok) {
      error.value = '预设保存失败。';
      return false;
    }
    store.refreshFromSettings();
    takeSnapshot();
    drawerView.value = 'manage';
    return true;
  }

  return {
    drawerView,
    isDrawerOpen,
    isDirty,
    originalName,
    draft,
    error,
    title,
    openManage,
    openCreate,
    openEdit,
    openEditCurrent,
    confirmIfDirty,
    closeDrawer,
    backToManage,
    discardDraft,
    saveDraft,
  };
}
