<template>
  <section class="acu-v2-log-viewer-page">
    <AcuPageHeader title="运行日志">
      <template #actions>
        <AcuBadge :variant="flow.paused.value ? 'warning' : 'success'">
          {{ flow.statusLabel.value }}
        </AcuBadge>
        <AcuBadge :variant="flow.debugLogEnabled.value ? 'accent' : 'neutral'">
          {{ flow.debugLabel.value }}
        </AcuBadge>
      </template>
    </AcuPageHeader>

    <AcuMessage v-if="flow.message.value" :kind="flow.message.value.kind">
      {{ flow.message.value.text }}
    </AcuMessage>

    <div class="acu-v2-log-viewer-page__layout">
      <AcuPanel
        title="筛选与采集"
        description="这里查看插件运行期间写入内存缓冲区的日志。筛选只影响当前显示和导出的结果，不会删除原始缓冲区；如果没有看到 Debug 日志，请开启采集后重新执行需要排查的操作。"
      >
        <div class="acu-v2-log-viewer-page__filter-grid">
          <AcuFormRow label="日志级别" hint="只显示指定级别；错误和警告始终会进入缓冲区。">
            <AcuSelect
              :options="flow.levelOptions"
              :model-value="flow.levelFilter.value"
              @update:model-value="setLevelFilter"
            />
          </AcuFormRow>
          <AcuFormRow label="模块标签" hint="标签来自日志开头的 [模块] 标记；没有标签的记录归为未分类。">
            <AcuSelect
              :options="flow.tagOptions.value"
              :model-value="flow.tagFilter.value"
              @update:model-value="flow.tagFilter.value = $event"
            />
          </AcuFormRow>
          <AcuFormRow label="关键词" hint="按日志正文搜索，大小写不敏感。">
            <AcuInput
              :model-value="flow.keyword.value"
              type="text"
              placeholder="搜索日志内容"
              @update:model-value="flow.keyword.value = String($event)"
            />
          </AcuFormRow>
        </div>

        <div class="acu-v2-log-viewer-page__toggles">
          <AcuToggle
            :model-value="flow.autoScroll.value"
            label="自动滚到最新"
            @update:model-value="flow.autoScroll.value = $event"
          />
          <AcuToggle
            :model-value="flow.debugLogEnabled.value"
            label="采集 Debug 日志"
            @update:model-value="flow.setDebugCollection"
          />
        </div>

        <div class="acu-v2-log-viewer-page__actions">
          <AcuButton :variant="flow.paused.value ? 'primary' : 'default'" @click="flow.setPaused(!flow.paused.value)">
            <i :class="flow.paused.value ? 'fa-solid fa-play' : 'fa-solid fa-pause'"></i>
            {{ flow.paused.value ? '恢复' : '暂停' }}
          </AcuButton>
          <AcuButton :disabled="!flow.totalCount.value" @click="flow.exportFiltered">
            <i class="fa-solid fa-download"></i>
            导出当前结果
          </AcuButton>
          <AcuButton variant="danger" :disabled="!flow.totalCount.value" @click="flow.clearAll">
            <i class="fa-solid fa-trash"></i>
            清空日志
          </AcuButton>
        </div>

        <div class="acu-v2-log-viewer-page__status-block">
          <h4 class="acu-v2-log-viewer-page__section-title">采集状态</h4>
          <AcuStatsList :items="statsItems" />
          <p class="acu-v2-log-viewer-page__hint">
            日志最多保留最近 2000 条；当前显示 {{ flow.filteredCount.value }} 条。{{ flow.pendingCount.value ? `${flow.pendingCount.value} 条暂停期间新增日志等待显示。` : '没有暂停期间积压的日志。' }}
          </p>
        </div>
      </AcuPanel>

      <AcuPanel
        class="acu-v2-log-viewer-page__stream-panel"
        title="日志流"
        description="最新日志显示在最上方。长错误栈会在行内换行，方便直接复制关键片段；如果日志为空，请先执行一次会触发插件运行的操作。"
      >
        <div ref="logListRef" class="acu-v2-log-viewer-page__log-list" role="log" aria-live="polite">
          <div v-if="!flow.visibleLogs.value.length" class="acu-v2-log-viewer-page__empty">
            暂无匹配日志
          </div>
          <div
            v-for="entry in flow.visibleLogs.value"
            :key="entry.id"
            class="acu-v2-log-viewer-page__log-row"
            :class="`acu-v2-log-viewer-page__log-row--${entry.level}`"
          >
            <span class="acu-v2-log-viewer-page__time">{{ formatTime(entry.timestamp) }}</span>
            <AcuBadge :variant="levelVariant(entry.level)">{{ entry.level.toUpperCase() }}</AcuBadge>
            <span class="acu-v2-log-viewer-page__tag">{{ entry.tag }}</span>
            <code class="acu-v2-log-viewer-page__message">{{ entry.message }}</code>
          </div>
        </div>
      </AcuPanel>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import AcuBadge, { type AcuBadgeVariant } from '../components/_lib/AcuBadge.vue';
import AcuButton from '../components/_lib/AcuButton.vue';
import AcuFormRow from '../components/_lib/AcuFormRow.vue';
import AcuInput from '../components/_lib/AcuInput.vue';
import AcuMessage from '../components/_lib/AcuMessage.vue';
import AcuPageHeader from '../components/_lib/AcuPageHeader.vue';
import AcuPanel from '../components/_lib/AcuPanel.vue';
import AcuSelect from '../components/_lib/AcuSelect.vue';
import AcuStatsList, { type AcuStatsItem } from '../components/_lib/AcuStatsList.vue';
import AcuToggle from '../components/_lib/AcuToggle.vue';
import { type LogLevelFilter, useLogViewer } from '../composables/useLogViewer';
import { type LogLevel } from '../../shared/log-buffer';

const flow = useLogViewer();
const logListRef = ref<HTMLElement | null>(null);

const statsItems = computed<AcuStatsItem[]>(() => [
  { label: '缓冲区总数', value: flow.totalCount.value },
  { label: '当前显示', value: flow.filteredCount.value },
  { label: '暂停积压', value: flow.pendingCount.value },
  { label: '模块标签', value: Math.max(flow.tagOptions.value.length - 1, 0) },
]);

function formatTime(timestamp: number): string {
  const time = new Date(timestamp).toLocaleTimeString('zh-CN', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  return `${time}.${String(timestamp % 1000).padStart(3, '0')}`;
}

function levelVariant(level: LogLevel): AcuBadgeVariant {
  if (level === 'error') return 'danger';
  if (level === 'warn') return 'warning';
  return 'accent';
}

function setLevelFilter(value: string): void {
  flow.levelFilter.value = value as LogLevelFilter;
}

async function scrollLogListToTop(): Promise<void> {
  if (!flow.autoScroll.value) return;
  await nextTick();
  if (logListRef.value) logListRef.value.scrollTop = 0;
}

watch(() => flow.visibleLogs.value.length, scrollLogListToTop, { flush: 'post' });
</script>

<style scoped>
.acu-v2-log-viewer-page {
  min-height: 100%;
  min-width: 0;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.acu-v2-log-viewer-page__layout {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  align-items: stretch;
}

.acu-v2-log-viewer-page__filter-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
}

.acu-v2-log-viewer-page__toggles {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  padding: 10px 0 0;
}

.acu-v2-log-viewer-page__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  justify-content: flex-end;
  padding-top: 12px;
  margin-top: 4px;
}

.acu-v2-log-viewer-page__hint {
  margin: 0;
  color: var(--acu-text-3);
  font-size: 12px;
  line-height: 1.55;
}

.acu-v2-log-viewer-page__status-block {
  padding-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.acu-v2-log-viewer-page__section-title {
  margin: 0;
  color: var(--acu-text-1);
  font-size: 13px;
  font-weight: 600;
  line-height: 1.35;
}

.acu-v2-log-viewer-page__stream-panel {
  min-height: 0;
}

.acu-v2-log-viewer-page__log-list {
  min-height: 360px;
  max-height: 58vh;
  overflow: auto;
  border: 1px solid color-mix(in srgb, var(--acu-text-3) 14%, transparent);
  border-radius: var(--acu-radius-sm);
  background: transparent;
}

.acu-v2-log-viewer-page__empty {
  min-height: 180px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--acu-text-3);
  font-size: 12px;
}

.acu-v2-log-viewer-page__log-row {
  display: grid;
  grid-template-columns: 92px 64px minmax(90px, 160px) minmax(0, 1fr);
  gap: 8px;
  align-items: baseline;
  padding: 7px 10px;
  border-bottom: 1px solid var(--acu-border-2);
  font-size: 12px;
  line-height: 1.55;
}

.acu-v2-log-viewer-page__log-row:last-child {
  border-bottom: 0;
}

.acu-v2-log-viewer-page__log-row--warn {
  background: color-mix(in srgb, var(--acu-warning) 6%, transparent);
}

.acu-v2-log-viewer-page__log-row--error {
  background: color-mix(in srgb, var(--acu-danger) 7%, transparent);
}

.acu-v2-log-viewer-page__time,
.acu-v2-log-viewer-page__tag,
.acu-v2-log-viewer-page__message {
  min-width: 0;
  font-family: var(--acu-font-mono);
}

.acu-v2-log-viewer-page__time {
  color: var(--acu-text-3);
  white-space: nowrap;
}

.acu-v2-log-viewer-page__tag {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--acu-text-2);
}

.acu-v2-log-viewer-page__message {
  margin: 0;
  color: var(--acu-text-1);
  white-space: pre-wrap;
  word-break: break-word;
  background: transparent;
}

@media (max-width: 920px) {
  .acu-v2-log-viewer-page {
    padding: 14px;
  }

  .acu-v2-log-viewer-page__layout,
  .acu-v2-log-viewer-page__filter-grid {
    grid-template-columns: 1fr;
  }

  .acu-v2-log-viewer-page__actions {
    justify-content: stretch;
  }

  .acu-v2-log-viewer-page__log-row {
    grid-template-columns: 88px 58px minmax(0, 1fr);
  }

  .acu-v2-log-viewer-page__tag {
    grid-column: 1 / -1;
  }

  .acu-v2-log-viewer-page__message {
    grid-column: 1 / -1;
  }
}
</style>
