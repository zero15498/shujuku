<template>
  <!--
    页面 header：仅承载标题与状态徽章（详见 design_guidelines §12）。
    `actions` slot 仅允许放状态徽章（如 AcuBadge）；触发型操作控件（刷新/切换/导出/管理 toggle 等）
    必须放进所属面板内部或页面操作区，不允许塞进 header。已有违规（PlotPage 启用 toggle 等）作为
    设计债务在 sweep 阶段统一收口。
    `subtitle` prop 已移除（D22.3 收尾）；说明文字使用 AcuPanel.description 或 AcuInfoBanner。
  -->
  <header class="acu-page-header">
    <div class="acu-page-header__text">
      <h2>{{ title }}</h2>
    </div>
    <div v-if="$slots.actions" class="acu-page-header__actions">
      <slot name="actions" />
    </div>
  </header>
</template>

<script setup lang="ts">
defineProps<{
  title: string;
}>();
</script>

<style scoped>
.acu-page-header {
  display: flex; align-items: center; justify-content: space-between;
  gap: 16px; padding-bottom: 6px;
  border-bottom: 0;
}
.acu-page-header__text h2 { margin: 0; font-size: 22px; line-height: 1.2; letter-spacing: 0; }
.acu-page-header__actions { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
</style>
