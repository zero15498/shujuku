<template>
  <div class="acu-v2-wb-entries">
    <div v-if="loading" class="acu-v2-wb-entries__status">正在加载条目...</div>
    <div v-else-if="groups.length === 0" class="acu-v2-wb-entries__status">
      所选世界书中无可显示的条目。
    </div>
    <template v-else>
      <div
        v-for="group in filteredGroups"
        :key="group.bookName"
        class="acu-v2-wb-entry-group"
      >
        <div class="acu-v2-wb-entry-group__header" @click="$emit('toggle-group', group.bookName)">
          <button type="button" class="acu-v2-wb-entry-group__toggle">
            {{ group.expanded ? '▾' : '▸' }}
          </button>
          <span class="acu-v2-wb-entry-group__name">{{ group.bookName }}</span>
          <span class="acu-v2-wb-entry-group__meta">{{ group.entries.length }} 条</span>
        </div>
        <div v-if="group.expanded" class="acu-v2-wb-entry-group__body">
          <div
            v-for="entry in group.entries"
            :key="`${group.bookName}-${entry.uid}`"
            class="acu-v2-wb-entry-item"
            :class="{ 'acu-v2-wb-entry-item--disabled': entry.disabled }"
          >
            <AcuCheckbox
              :model-value="entry.checked"
              :label="entry.label"
              :disabled="entry.disabled"
              @update:model-value="onToggle(entry.bookName, entry.uid, $event)"
            />
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import AcuCheckbox from './_lib/AcuCheckbox.vue';
import type { WorldbookEntryGroup } from '../composables/usePlotWorldbookEntries';

const props = defineProps<{
  groups: WorldbookEntryGroup[];
  filter: string;
  loading: boolean;
}>();

const emit = defineEmits<{
  (e: 'toggle', bookName: string, uid: number, checked: boolean): void;
  (e: 'toggle-group', bookName: string): void;
}>();

const filteredGroups = computed(() => {
  const q = props.filter.trim().toLowerCase();
  if (!q) return props.groups;
  return props.groups
    .map(g => {
      const bookMatch = g.bookName.toLowerCase().includes(q);
      if (bookMatch) return g;
      const filtered = g.entries.filter(e =>
        e.label.toLowerCase().includes(q) || e.bookName.toLowerCase().includes(q),
      );
      if (filtered.length === 0) return null;
      return { ...g, entries: filtered, expanded: true };
    })
    .filter((g): g is WorldbookEntryGroup => g !== null);
});

function onToggle(bookName: string, uid: number, checked: boolean): void {
  emit('toggle', bookName, uid, checked);
}
</script>

<style scoped>
.acu-v2-wb-entries { display: flex; flex-direction: column; gap: 6px; }
.acu-v2-wb-entries__status { font-size: 12px; color: var(--acu-text-3); padding: 8px 0; }

.acu-v2-wb-entry-group {
  border: 0;
  border-radius: var(--acu-radius-sm);
  overflow: hidden;
  background: var(--acu-bg-2);
}

.acu-v2-wb-entry-group__header {
  display: flex; align-items: center; gap: 8px;
  padding: 6px 10px;
  background: var(--acu-bg-2);
  cursor: pointer; user-select: none;
  font-size: 12px; font-weight: 600;
}
.acu-v2-wb-entry-group__header:hover { background: var(--acu-bg-3, var(--acu-bg-2)); }

.acu-v2-wb-entry-group__toggle {
  border: none; background: transparent; color: var(--acu-text-2);
  font-size: 12px; padding: 0; cursor: pointer; width: 16px; text-align: center;
}
.acu-v2-wb-entry-group__name {
  flex: 1; min-width: 0;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  color: var(--acu-text-1);
}
.acu-v2-wb-entry-group__meta {
  font-weight: 400; font-size: 11px; color: var(--acu-text-3); white-space: nowrap;
}

.acu-v2-wb-entry-group__body {
  display: flex; flex-direction: column;
  max-height: 280px; overflow-y: auto;
  padding: 4px 0;
}

.acu-v2-wb-entry-item {
  padding: 3px 10px;
  transition: background 0.08s ease;
}
.acu-v2-wb-entry-item:hover { background: var(--acu-bg-1); }
.acu-v2-wb-entry-item--disabled {
  opacity: 0.5;
}
</style>
