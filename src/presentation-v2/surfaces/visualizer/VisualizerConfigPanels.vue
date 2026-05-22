<template>
  <div class="acu-viz-config" data-acu-visualizer-config>
    <AcuPanel
      title="基本信息与列定义"
      description="表名和列名决定 AI 读写这张表时看到的结构。修改列名会同步当前草稿；SQLite 模式下，如果 DDL 已写中文注释，列名变化会同步到对应注释里。"
    >
      <div class="acu-viz-config__grid">
        <AcuFormRow label="表格名称" hint="同名表会共用表级 API 预设覆盖；改名时已存在的覆盖会迁移到新名称。">
          <AcuInput
            :model-value="config.currentSheet.value?.name || ''"
            @update:model-value="config.renameSheet"
          />
        </AcuFormRow>
        <AcuFormRow label="表级 API 预设" hint="只保存到插件设置，不写进模板；留空时使用填表整体 API 配置。">
          <AcuSelect
            :model-value="config.currentTableApiPreset.value"
            :options="config.apiPresetOptions.value"
            @update:model-value="config.setTableApiPreset"
          />
        </AcuFormRow>
      </div>

      <div class="acu-viz-config__columns">
        <article
          v-for="(header, index) in config.headers.value"
          :key="`${index}-${header}`"
          class="acu-viz-config__column-row"
        >
          <span class="acu-viz-config__column-index">#{{ index + 1 }}</span>
          <AcuInput
            :model-value="header"
            @update:model-value="value => config.updateHeader(index, value)"
          />
          <AcuIconButton
            icon="fa-solid fa-trash"
            size="sm"
            variant="danger"
            title="删除列"
            @click="$emit('request-delete-column', index)"
          />
        </article>
        <p v-if="config.headers.value.length === 0" class="acu-viz-config__empty">
          当前表没有可编辑列。新增列后，已有数据行会自动补一个空值。
        </p>
        <AcuButton size="sm" @click="$emit('request-add-column')">
          <i class="fa-solid fa-plus"></i>
          添加列
        </AcuButton>
      </div>
    </AcuPanel>

    <AcuPanel
      title="自动化更新参数"
      description="这些参数只覆盖当前表。填 -1 表示沿用全局配置；更新频率填 0 表示禁用这张表的自动更新。设置异常时可以改回 -1。"
    >
      <div class="acu-viz-config__grid acu-viz-config__grid--three">
        <AcuFormRow label="上下文层数" hint="-1 沿用全局；1 以上生效；0 会按沿用处理。">
          <AcuInput
            type="number"
            :model-value="updateConfig.contextDepth"
            :min="-1"
            :step="1"
            @update:model-value="value => config.updateUpdateConfig('contextDepth', value)"
          />
        </AcuFormRow>
        <AcuFormRow label="更新频率" hint="-1 沿用全局；0 禁用当前表自动更新。">
          <AcuInput
            type="number"
            :model-value="updateConfig.updateFrequency"
            :min="-1"
            :step="1"
            @update:model-value="value => config.updateUpdateConfig('updateFrequency', value)"
          />
        </AcuFormRow>
        <AcuFormRow label="批处理大小" hint="-1 沿用全局；1 以上按该表配置分批。">
          <AcuInput
            type="number"
            :model-value="updateConfig.batchSize"
            :min="-1"
            :step="1"
            @update:model-value="value => config.updateUpdateConfig('batchSize', value)"
          />
        </AcuFormRow>
        <AcuFormRow label="分组编号" hint="-1 默认同组；不同编号会拆成并发组。">
          <AcuInput
            type="number"
            :model-value="updateConfig.groupId"
            :min="-1"
            :step="1"
            @update:model-value="value => config.updateUpdateConfig('groupId', value)"
          />
        </AcuFormRow>
        <AcuFormRow label="跳过楼层" hint="-1 沿用全局；0 以上按当前表配置跳过。">
          <AcuInput
            type="number"
            :model-value="updateConfig.skipFloors"
            :min="-1"
            :step="1"
            @update:model-value="value => config.updateUpdateConfig('skipFloors', value)"
          />
        </AcuFormRow>
        <AcuFormRow label="发送最新行数" hint="-1 全部发送；0 沿用全局；纪要表运行时固定使用 10 条。">
          <AcuInput
            type="number"
            :model-value="updateConfig.sendLatestRows"
            :min="-1"
            :step="1"
            @update:model-value="value => config.updateUpdateConfig('sendLatestRows', value)"
          />
        </AcuFormRow>
      </div>
    </AcuPanel>

    <AcuPanel
      title="AI 触发提示词"
      description="这些文本会作为当前表的说明和增删改触发指令交给 AI。提示词不需要写保存步骤；保存仍由数据库编辑器统一完成。"
    >
      <div class="acu-viz-config__prompts">
        <AcuFormRow label="表格说明" hint="说明这张表是什么、字段含义是什么，以及 AI 误写时用户该检查哪里。">
          <AcuTextarea
            :model-value="sourceData.note"
            :rows="3"
            @update:model-value="value => config.updateSourceData('note', value)"
          />
        </AcuFormRow>
        <AcuFormRow label="初始化触发">
          <AcuTextarea
            :model-value="sourceData.initNode"
            :rows="2"
            @update:model-value="value => config.updateSourceData('initNode', value)"
          />
        </AcuFormRow>
        <AcuFormRow label="新增触发">
          <AcuTextarea
            :model-value="sourceData.insertNode"
            :rows="2"
            @update:model-value="value => config.updateSourceData('insertNode', value)"
          />
        </AcuFormRow>
        <AcuFormRow label="更新触发">
          <AcuTextarea
            :model-value="sourceData.updateNode"
            :rows="2"
            @update:model-value="value => config.updateSourceData('updateNode', value)"
          />
        </AcuFormRow>
        <AcuFormRow label="删除触发">
          <AcuTextarea
            :model-value="sourceData.deleteNode"
            :rows="2"
            @update:model-value="value => config.updateSourceData('deleteNode', value)"
          />
        </AcuFormRow>
      </div>
    </AcuPanel>

    <AcuPanel
      v-if="config.isSQLite.value"
      title="DDL 定义"
      description="SQLite 模式会用这里的 CREATE TABLE 语句描述真实表结构。第一列必须是 row_id INTEGER PRIMARY KEY；如果列名和表头不一致，AI 生成 SQL 时容易写错列。"
    >
      <AcuFormRow label="CREATE TABLE 语句" hint="中文表头建议写在英文物理列名后的行注释里，例如 item_name TEXT, -- 物品名。">
        <AcuTextarea
          class="acu-viz-config__ddl"
          :model-value="sourceData.ddl"
          :rows="7"
          @update:model-value="value => config.updateSourceData('ddl', value)"
        />
      </AcuFormRow>
      <div class="acu-viz-config__inline-actions">
        <AcuButton size="sm" @click="validateDDL">
          <i class="fa-solid fa-check-circle"></i>
          校验 DDL
        </AcuButton>
        <AcuBadge v-if="ddlValidation" :variant="ddlValidation.valid ? 'accent' : 'warning'">
          {{ ddlValidation.message }}
        </AcuBadge>
      </div>
    </AcuPanel>

    <AcuPanel
      title="世界书注入配置"
      description="这里控制当前表是否写入世界书，以及是否额外生成独立条目。关闭注入后，这张表不会进入世界书；如果世界书内容不符合预期，先检查这里的开关、条目名称和注入位置。"
    >
      <div class="acu-viz-config__toggles">
        <AcuCheckbox
          :model-value="exportConfig.injectIntoWorldbook !== false"
          label="注入到世界书条目"
          @update:model-value="value => config.updateExportConfig('injectIntoWorldbook', value)"
        />
        <AcuCheckbox
          :model-value="exportConfig.enabled === true"
          label="启用独立导出"
          @update:model-value="value => config.updateExportConfig('enabled', value)"
        />
        <AcuCheckbox
          :model-value="exportConfig.splitByRow === true"
          label="按行拆分独立条目"
          @update:model-value="value => config.updateExportConfig('splitByRow', value)"
        />
        <AcuCheckbox
          :model-value="exportConfig.preventRecursion !== false"
          label="防止递归触发"
          @update:model-value="value => config.updateExportConfig('preventRecursion', value)"
        />
      </div>

      <div class="acu-viz-config__grid">
        <AcuFormRow label="条目名称" hint="留空时可能使用表名；建议写清楚，方便在酒馆世界书里定位。">
          <AcuInput
            :model-value="exportConfig.entryName || ''"
            @update:model-value="value => config.updateExportConfig('entryName', value)"
          />
        </AcuFormRow>
        <AcuFormRow label="条目类型" hint="常量条目会稳定注入；关键词触发条目依赖关键词匹配。">
          <AcuSelect
            :model-value="exportConfig.entryType || 'constant'"
            :options="config.entryTypeOptions"
            @update:model-value="value => config.updateExportConfig('entryType', value)"
          />
        </AcuFormRow>
        <AcuFormRow label="关键词" hint="多个关键词可以用逗号或换行分隔，具体匹配由酒馆世界书处理。">
          <AcuInput
            :model-value="exportConfig.keywords || ''"
            @update:model-value="value => config.updateExportConfig('keywords', value)"
          />
        </AcuFormRow>
      </div>

      <AcuFormRow label="自定义注入模板" hint="可用 $1 代表当前表导出的内容；留空时使用系统默认格式。">
        <AcuTextarea
          :model-value="exportConfig.injectionTemplate || ''"
          :rows="3"
          @update:model-value="value => config.updateExportConfig('injectionTemplate', value)"
        />
      </AcuFormRow>

      <PlacementEditor
        title="主条目位置"
        :placement="config.getPlacement('entryPlacement')"
        :options="config.placementOptions"
        @update="(field, value) => config.updatePlacement('entryPlacement', field, value)"
      />

      <div class="acu-viz-config__subsection">
        <AcuCheckbox
          :model-value="exportConfig.extraIndexEnabled === true"
          label="额外增加索引条目"
          @update:model-value="value => config.updateExportConfig('extraIndexEnabled', value)"
        />
        <template v-if="exportConfig.extraIndexEnabled">
          <div class="acu-viz-config__grid">
            <AcuFormRow label="索引条目名称" hint="用于独立索引条目的世界书条目名称。">
              <AcuInput
                :model-value="exportConfig.extraIndexEntryName || ''"
                @update:model-value="value => config.updateExportConfig('extraIndexEntryName', value)"
              />
            </AcuFormRow>
          </div>
          <AcuFormRow label="索引条目模板" hint="可用 $1 代表索引条目内容；留空时使用默认格式。">
            <AcuTextarea
              :model-value="exportConfig.extraIndexInjectionTemplate || ''"
              :rows="3"
              @update:model-value="value => config.updateExportConfig('extraIndexInjectionTemplate', value)"
            />
          </AcuFormRow>
          <div class="acu-viz-config__column-modes">
            <article
              v-for="header in config.headers.value"
              :key="header"
              class="acu-viz-config__column-mode"
            >
              <AcuCheckbox
                :model-value="extraIndexColumns.includes(header)"
                :label="header"
                @update:model-value="value => config.setExtraIndexColumn(header, value)"
              />
              <AcuSelect
                size="sm"
                :disabled="!extraIndexColumns.includes(header)"
                :model-value="extraIndexColumnModes[header] === 'index_only' ? 'index_only' : 'both'"
                :options="config.extraIndexModeOptions"
                @update:model-value="value => config.setExtraIndexColumnMode(header, value === 'index_only' ? 'index_only' : 'both')"
              />
            </article>
          </div>
          <PlacementEditor
            title="索引条目位置"
            :placement="config.getPlacement('extraIndexPlacement')"
            :options="config.placementOptions"
            @update="(field, value) => config.updatePlacement('extraIndexPlacement', field, value)"
          />
        </template>
      </div>
    </AcuPanel>

    <AcuPanel
      v-if="config.fixedConfigEnabled.value"
      title="固定条目注入配置"
      description="总结表、总体大纲和重要人物表会生成固定用途的世界书条目。这里只控制这些固定条目的位置；如果角色设定前后出现重复或顺序不对，优先检查这里。"
    >
      <PlacementEditor
        title="固定主条目位置"
        :placement="config.getPlacement('fixedEntryPlacement')"
        :options="config.placementOptions"
        @update="(field, value) => config.updatePlacement('fixedEntryPlacement', field, value)"
      />
      <PlacementEditor
        v-if="config.importantPersonsFixedIndexEnabled.value"
        title="固定索引条目位置"
        :placement="config.getPlacement('fixedIndexPlacement')"
        :options="config.placementOptions"
        @update="(field, value) => config.updatePlacement('fixedIndexPlacement', field, value)"
      />
    </AcuPanel>

    <AcuPanel
      v-if="config.specialIndex.value.enabled"
      title="编码索引列锁定"
      description="总结表和总体大纲通常需要稳定的 AM0001、AM0002 编码。启用后，系统会在保存草稿前维护这列，避免 AI 更新时改乱索引。"
    >
      <div class="acu-viz-config__toggles">
        <AcuCheckbox
          :model-value="config.specialIndex.value.locked"
          label="启用编码索引列特殊锁定"
          @update:model-value="config.setSpecialIndexLock"
        />
        <AcuBadge :variant="config.specialIndex.value.index >= 0 ? 'neutral' : 'warning'">
          {{ specialIndexLabel }}
        </AcuBadge>
      </div>
    </AcuPanel>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import AcuBadge from '../../components/_lib/AcuBadge.vue';
import AcuButton from '../../components/_lib/AcuButton.vue';
import AcuCheckbox from '../../components/_lib/AcuCheckbox.vue';
import AcuFormRow from '../../components/_lib/AcuFormRow.vue';
import AcuIconButton from '../../components/_lib/AcuIconButton.vue';
import AcuInput from '../../components/_lib/AcuInput.vue';
import AcuPanel from '../../components/_lib/AcuPanel.vue';
import AcuSelect from '../../components/_lib/AcuSelect.vue';
import AcuTextarea from '../../components/_lib/AcuTextarea.vue';
import { useVisualizerConfigEditing } from '../../composables/visualizer/useVisualizerConfigEditing';
import PlacementEditor from './VisualizerPlacementEditor.vue';

defineEmits<{
  (e: 'request-add-column'): void;
  (e: 'request-delete-column', index: number): void;
}>();

const config = useVisualizerConfigEditing();
const ddlValidation = ref<{ valid: boolean; message: string } | null>(null);

const updateConfig = computed(() => {
  const raw = config.currentSheet.value?.updateConfig || {};
  return {
    contextDepth: Number.isFinite(raw.contextDepth) ? raw.contextDepth : -1,
    updateFrequency: Number.isFinite(raw.updateFrequency) ? raw.updateFrequency : -1,
    batchSize: Number.isFinite(raw.batchSize) ? raw.batchSize : -1,
    groupId: Number.isFinite(raw.groupId) ? raw.groupId : -1,
    skipFloors: Number.isFinite(raw.skipFloors) ? raw.skipFloors : -1,
    sendLatestRows: Number.isFinite(raw.sendLatestRows) ? raw.sendLatestRows : -1,
  };
});

const sourceData = computed(() => {
  const raw = config.currentSheet.value?.sourceData || {};
  return {
    note: String(raw.note || ''),
    initNode: String(raw.initNode || ''),
    insertNode: String(raw.insertNode || ''),
    updateNode: String(raw.updateNode || ''),
    deleteNode: String(raw.deleteNode || ''),
    ddl: String(raw.ddl || ''),
  };
});

const exportConfig = computed(() => config.exportConfig.value || {});
const extraIndexColumns = computed<string[]>(() =>
  Array.isArray(exportConfig.value.extraIndexColumns) ? exportConfig.value.extraIndexColumns : [],
);
const extraIndexColumnModes = computed<Record<string, string>>(() =>
  exportConfig.value.extraIndexColumnModes && typeof exportConfig.value.extraIndexColumnModes === 'object'
    ? exportConfig.value.extraIndexColumnModes
    : {},
);

const specialIndexLabel = computed(() => {
  const info = config.specialIndex.value;
  if (info.index < 0) return '未识别编码索引列，将使用运行时默认策略';
  return `当前识别列：#${info.index + 1} ${info.header || '未命名列'}`;
});

function validateDDL(): void {
  ddlValidation.value = config.validateDDL();
}
</script>

<style scoped>
.acu-viz-config {
  min-width: 0;
  display: grid;
  gap: 12px;
}

.acu-viz-config__grid {
  min-width: 0;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.acu-viz-config__grid--three {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.acu-viz-config__columns,
.acu-viz-config__prompts,
.acu-viz-config__toggles,
.acu-viz-config__subsection,
.acu-viz-config__column-modes {
  min-width: 0;
  display: grid;
  gap: 10px;
}

.acu-viz-config__columns {
  margin-top: 12px;
}

.acu-viz-config__column-row {
  min-width: 0;
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  padding: 8px;
  border: 1px solid var(--acu-border);
  border-radius: var(--acu-radius-sm);
  background: var(--acu-bg-0);
}

.acu-viz-config__column-index {
  color: var(--acu-text-3);
  font-family: var(--acu-font-mono);
  font-size: var(--acu-font-size-body, 12px);
  text-align: right;
}

.acu-viz-config__empty {
  margin: 0;
  color: var(--acu-text-2);
  font-size: var(--acu-font-size-body-lg, 13px);
  line-height: 1.55;
}

.acu-viz-config__inline-actions,
.acu-viz-config__column-mode {
  min-width: 0;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.acu-viz-config__inline-actions {
  margin-top: 10px;
}

.acu-viz-config__ddl {
  font-family: var(--acu-font-mono);
}

.acu-viz-config__column-mode {
  padding: 8px;
  border: 1px solid var(--acu-border);
  border-radius: var(--acu-radius-sm);
  background: var(--acu-bg-0);
}

.acu-viz-config__column-mode :deep(.acu-checkbox) {
  flex: 1 1 220px;
}

.acu-viz-config__column-mode :deep(.acu-select) {
  flex: 1 1 260px;
}

@media (max-width: 860px) {
  .acu-viz-config__grid,
  .acu-viz-config__grid--three {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 520px) {
  .acu-viz-config__column-row {
    grid-template-columns: 34px minmax(0, 1fr) auto;
    padding: 7px;
  }
}
</style>
