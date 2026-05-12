import { reactive, ref } from 'vue';
import {
  getCurrentVectorMemoryConfig_ACU,
  validateSummaryVectorIndexConfig_ACU,
} from '../../service/vector/vector-memory-config';
import { saveSettings_ACU } from '../../service/settings/settings-service';

export interface VectorApiForm {
  embeddingEndpoint: string;
  embeddingModel: string;
  embeddingApiKey: string;
  rerankEndpoint: string;
  rerankModel: string;
  rerankApiKey: string;
}

function createEmptyForm(): VectorApiForm {
  return {
    embeddingEndpoint: '',
    embeddingModel: '',
    embeddingApiKey: '',
    rerankEndpoint: '',
    rerankModel: '',
    rerankApiKey: '',
  };
}

export function useVectorApiConfig() {
  const form = reactive<VectorApiForm>(createEmptyForm());
  const errors = ref<string[]>([]);
  const savedAt = ref<number | null>(null);

  function refresh(): void {
    const config = getCurrentVectorMemoryConfig_ACU();
    form.embeddingEndpoint = config.embeddingEndpoint || '';
    form.embeddingModel = config.embeddingModel || '';
    form.embeddingApiKey = config.embeddingApiKey || '';
    form.rerankEndpoint = config.rerankEndpoint || '';
    form.rerankModel = config.rerankModel || '';
    form.rerankApiKey = config.rerankApiKey || '';
    errors.value = [];
  }

  function save(): boolean {
    const config = getCurrentVectorMemoryConfig_ACU();
    config.embeddingEndpoint = form.embeddingEndpoint.trim();
    config.embeddingModel = form.embeddingModel.trim();
    config.embeddingApiKey = form.embeddingApiKey;
    config.rerankEndpoint = form.rerankEndpoint.trim();
    config.rerankModel = form.rerankModel.trim();
    config.rerankApiKey = form.rerankApiKey;

    const validation = validateSummaryVectorIndexConfig_ACU(config);
    if (!validation.valid) {
      errors.value = validation.errors;
      return false;
    }

    errors.value = [];
    saveSettings_ACU();
    savedAt.value = Date.now();
    return true;
  }

  refresh();

  return {
    form,
    errors,
    savedAt,
    refresh,
    save,
  };
}
