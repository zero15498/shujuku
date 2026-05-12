<template>
  <dl class="acu-stats" :class="{ 'acu-stats--mono': mono }">
    <div v-for="item in items" :key="item.label" class="acu-stats__item">
      <dt>{{ item.label }}</dt>
      <dd>
        <slot :name="item.key ?? item.label" :item="item">
          <code v-if="mono">{{ item.value ?? '—' }}</code>
          <template v-else>{{ item.value ?? '—' }}</template>
        </slot>
      </dd>
    </div>
  </dl>
</template>

<script setup lang="ts">
export interface AcuStatsItem {
  label: string;
  value?: string | number | null;
  /** Optional key for scoped slot override. Defaults to label. */
  key?: string;
}

withDefaults(defineProps<{
  items: AcuStatsItem[];
  mono?: boolean;
}>(), {
  mono: false,
});
</script>

<style scoped>
.acu-stats {
  margin: 0; padding: 12px;
  background: var(--acu-bg-2); border-radius: var(--acu-radius-sm);
  display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px;
}

.acu-stats__item { min-width: 0; }

.acu-stats dt {
  margin: 0 0 2px; font-size: 11px; color: var(--acu-text-3);
}
.acu-stats dd {
  margin: 0; font-size: 12px; color: var(--acu-text-1); word-break: break-all;
}

.acu-stats--mono code {
  display: inline-block; max-width: 100%;
  font-family: Consolas, 'Courier New', monospace; font-size: 12px;
  background: var(--acu-bg-0); color: var(--acu-text-1);
  padding: 2px 8px; border-radius: var(--acu-radius-sm);
}

@media (max-width: 720px) {
  .acu-stats { grid-template-columns: 1fr; }
}
</style>
