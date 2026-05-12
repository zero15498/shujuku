<template>
  <section class="acu-v2-developer-page">
    <AcuPageHeader title="开发者选项" />

    <div class="acu-v2-developer-page__grid">
      <AcuPanel
        title="开发者 gated 字段"
        description="这里集中托管各一级页内「开发者可见」的进阶字段。每个字段独立持久化、独立默认值；开关与仪表盘的「启用开发者选项」总开关相互独立——总开关只控制本页在 sidebar 是否显示，不会改字段的真假状态。"
      >
        <div class="acu-v2-developer-page__toggle-list">
          <ToggleRow
            v-for="item in toggles"
            :key="item.key"
            :item="item"
            @change="handleToggleChange(item.key, $event)"
          />
        </div>
      </AcuPanel>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import AcuPageHeader from '../components/_lib/AcuPageHeader.vue';
import AcuPanel from '../components/_lib/AcuPanel.vue';
import ToggleRow from '../components/DashboardToggleRow.vue';
import { useDevOptions } from '../composables/useDevOptions';

const devOptions = useDevOptions();

interface DeveloperFieldItem {
  key: string;
  label: string;
  description: string;
  value: boolean;
}

const toggles = computed<DeveloperFieldItem[]>(() => [
  {
    key: 'plotAdvanced',
    label: '剧情推进 · 匹配替换（进阶）',
    description: '在编辑剧情推进预设的侧抽屉中显示"匹配替换"字段：sulv1=主线 / sulv2=个人线 / sulv3=色情事件 / sulv4=绿帽线 / zhaohui=记忆召回数量。这些占位符在预设提示词里使用；数值是全局参数，不随预设导入导出。',
    value: devOptions.plotAdvanced.value,
  },
  {
    key: 'vectorIndexAdvanced',
    label: '交火模式 · 高级索引参数',
    description: '在交火模式页显示"召回参数"和"归档与分块"面板。默认配置已经足够使用；只有需要调整触发阈值、TopK、候选上限、最近固定注入、分块句数或归档批量时再打开。',
    value: devOptions.vectorIndexAdvanced.value,
  },
]);

function handleToggleChange(key: string, value: boolean): void {
  if (key === 'plotAdvanced') {
    devOptions.setPlotAdvanced(value);
  }
  if (key === 'vectorIndexAdvanced') {
    devOptions.setVectorIndexAdvanced(value);
  }
}
</script>

<style scoped>
.acu-v2-developer-page {
  min-height: 100%;
  min-width: 0;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.acu-v2-developer-page__grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 16px;
}

.acu-v2-developer-page__toggle-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

@media (max-width: 860px) {
  .acu-v2-developer-page {
    padding: 14px;
  }
}
</style>
