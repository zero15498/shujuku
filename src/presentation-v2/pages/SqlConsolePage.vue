<template>
  <section class="acu-v2-sql-console-page">
    <AcuPageHeader title="SQL 控制台">
      <template #actions>
        <AcuBadge :variant="consoleFlow.isSqliteAvailable.value ? 'success' : 'warning'">
          {{ consoleFlow.isSqliteAvailable.value ? 'SQLite 模式' : '不可用' }}
        </AcuBadge>
      </template>
    </AcuPageHeader>

    <AcuMessage v-if="consoleFlow.message.value" :kind="consoleFlow.message.value.kind">
      {{ consoleFlow.message.value.text }}
    </AcuMessage>

    <div class="acu-v2-sql-console-page__grid">
      <AcuPanel
        title="编辑与执行"
        description="这里会把 SQL 直接发送到当前聊天的 SQLite 运行库。查询语句只读取数据；INSERT、UPDATE、DELETE 会改动内存中的表格视图。执行报错时先看下方结果区，再确认表名、列名和当前聊天是否已经加载表格。"
      >
        <div class="acu-v2-sql-console-page__quick-actions" aria-label="SQL 快捷操作">
          <AcuButton size="sm" :disabled="!!consoleFlow.busyAction.value" @click="consoleFlow.showTables">
            <i class="fa-solid fa-list"></i>
            查看所有表
          </AcuButton>
          <AcuButton size="sm" :disabled="!!consoleFlow.busyAction.value" @click="consoleFlow.showSchema">
            <i class="fa-solid fa-sitemap"></i>
            查看表结构
          </AcuButton>
        </div>

        <AcuFormRow label="SQL 语句" hint="Ctrl / Command + Enter 执行；多行语句会原样交给 SQLite provider 处理。">
          <AcuTextarea
            :model-value="consoleFlow.sqlText.value"
            :rows="10"
            placeholder="SELECT * FROM 表名;&#10;&#10;UPDATE 表名 SET 列名 = '新值' WHERE row_id = 1;"
            class="acu-v2-sql-console-page__textarea"
            aria-label="SQL 语句"
            @update:model-value="consoleFlow.sqlText.value = $event"
            @keydown="onEditorKeydown"
          />
        </AcuFormRow>

        <div class="acu-v2-sql-console-page__actions">
          <AcuButton
            variant="primary"
            :loading="consoleFlow.busyAction.value === 'execute'"
            :disabled="!consoleFlow.hasSqlText.value"
            @click="consoleFlow.executeCurrent"
          >
            <i class="fa-solid fa-play"></i>
            执行
          </AcuButton>
          <AcuButton :disabled="!consoleFlow.hasSqlText.value || !!consoleFlow.busyAction.value" @click="consoleFlow.clearSql">
            <i class="fa-solid fa-eraser"></i>
            清空
          </AcuButton>
          <span class="acu-v2-sql-console-page__status" :class="`acu-v2-sql-console-page__status--${consoleFlow.statusKind.value}`">
            {{ consoleFlow.statusLabel.value }}
          </span>
        </div>
      </AcuPanel>

      <AcuPanel
        class="acu-v2-sql-console-page__result-panel"
        title="结果与执行历史"
        description="这里集中显示本次执行结果和临时历史。查询结果会按表格展示，变更语句只显示受影响行数；历史只保存在当前前端会话里，点击条目会把 SQL 放回编辑器，不会自动再次执行。"
      >
        <section class="acu-v2-sql-console-page__result-section" aria-label="SQL 执行结果">
          <h4 class="acu-v2-sql-console-page__section-title">结果</h4>
          <div v-if="consoleFlow.result.value.kind === 'idle'" class="acu-v2-sql-console-page__empty">
            执行 SQL 后结果会显示在这里
          </div>

          <AcuMessage v-else-if="consoleFlow.result.value.kind === 'mutation'" kind="success">
            执行成功，{{ consoleFlow.result.value.changes }} 行受影响，耗时 {{ consoleFlow.result.value.elapsedMs }}ms。
          </AcuMessage>

          <pre v-else-if="consoleFlow.result.value.kind === 'error'" class="acu-v2-sql-console-page__error">{{ consoleFlow.result.value.error }}</pre>

          <template v-else>
            <div class="acu-v2-sql-console-page__table-wrap">
              <table class="acu-v2-sql-console-page__result-table">
                <thead>
                  <tr>
                    <th v-for="column in consoleFlow.result.value.columns" :key="column">{{ column }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-if="!consoleFlow.result.value.values.length">
                    <td :colspan="Math.max(consoleFlow.result.value.columns.length, 1)" class="acu-v2-sql-console-page__empty-cell">
                      查询成功，没有返回行
                    </td>
                  </tr>
                  <tr v-for="(row, rowIndex) in consoleFlow.result.value.values" :key="rowIndex">
                    <td v-for="(cell, cellIndex) in row" :key="cellIndex" :class="{ 'acu-v2-sql-console-page__cell-null': cell === null }">
                      {{ formatCell(cell) }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p class="acu-v2-sql-console-page__result-meta">
              {{ consoleFlow.result.value.rowCount }} 行 · {{ consoleFlow.result.value.elapsedMs }}ms
            </p>
          </template>
        </section>

        <section class="acu-v2-sql-console-page__history-section" aria-label="SQL 执行历史">
          <h4 class="acu-v2-sql-console-page__section-title">执行历史</h4>
          <div v-if="!consoleFlow.history.value.length" class="acu-v2-sql-console-page__empty acu-v2-sql-console-page__empty--compact">
            暂无执行历史
          </div>
          <div v-else class="acu-v2-sql-console-page__history-list">
            <div
              v-for="(item, index) in consoleFlow.history.value"
              :key="`${item.timestamp}-${index}`"
              class="acu-v2-sql-console-page__history-item"
              role="button"
              tabindex="0"
              title="填入编辑器"
              @click="consoleFlow.useHistoryItem(item)"
              @keydown.enter.prevent="consoleFlow.useHistoryItem(item)"
              @keydown.space.prevent="consoleFlow.useHistoryItem(item)"
            >
              <AcuBadge :variant="item.success ? 'success' : 'danger'">
                {{ item.success ? '成功' : '失败' }}
              </AcuBadge>
              <span class="acu-v2-sql-console-page__history-time">{{ formatTime(item.timestamp) }}</span>
              <code>{{ compactSql(item.sql) }}</code>
            </div>
          </div>
        </section>
      </AcuPanel>
    </div>
  </section>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import AcuBadge from '../components/_lib/AcuBadge.vue';
import AcuButton from '../components/_lib/AcuButton.vue';
import AcuFormRow from '../components/_lib/AcuFormRow.vue';
import AcuMessage from '../components/_lib/AcuMessage.vue';
import AcuPageHeader from '../components/_lib/AcuPageHeader.vue';
import AcuPanel from '../components/_lib/AcuPanel.vue';
import AcuTextarea from '../components/_lib/AcuTextarea.vue';
import { useSqlConsole } from '../composables/useSqlConsole';

const consoleFlow = useSqlConsole();

function onEditorKeydown(event: KeyboardEvent): void {
  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
    event.preventDefault();
    consoleFlow.executeCurrent();
  }
}

function compactSql(sql: string): string {
  const oneLine = sql.replace(/\s+/g, ' ').trim();
  return oneLine.length > 120 ? `${oneLine.slice(0, 120)}...` : oneLine;
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString();
}

function formatCell(value: string | number | Uint8Array | null): string {
  if (value === null) return 'NULL';
  if (value instanceof Uint8Array) return `BLOB(${value.byteLength})`;
  return String(value);
}

onMounted(consoleFlow.refresh);
</script>

<style scoped>
.acu-v2-sql-console-page {
  min-height: 100%;
  min-width: 0;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.acu-v2-sql-console-page__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  align-items: stretch;
}

.acu-v2-sql-console-page__quick-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.acu-v2-sql-console-page__textarea {
  font-family: Consolas, Menlo, Monaco, "Courier New", monospace;
  min-height: 210px;
  white-space: pre;
}

.acu-v2-sql-console-page__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  justify-content: flex-end;
  padding-top: 12px;
  margin-top: 4px;
}

.acu-v2-sql-console-page__status {
  margin-left: auto;
  color: var(--acu-text-3);
  font-size: 12px;
  line-height: 1.5;
}

.acu-v2-sql-console-page__status--success {
  color: var(--acu-success);
}

.acu-v2-sql-console-page__status--warning {
  color: var(--acu-warning);
}

.acu-v2-sql-console-page__status--error {
  color: var(--acu-danger);
}

.acu-v2-sql-console-page__history-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 230px;
  overflow: auto;
}

.acu-v2-sql-console-page__history-item {
  min-width: 0;
  display: grid;
  grid-template-columns: auto auto minmax(0, 1fr);
  gap: 8px;
  align-items: center;
  padding: 8px 9px;
  border: 0;
  border-radius: var(--acu-radius-sm);
  background: var(--acu-bg-2);
  cursor: pointer;
  transition: background 0.15s ease, box-shadow 0.15s ease;
}

.acu-v2-sql-console-page__history-item:hover,
.acu-v2-sql-console-page__history-item:focus {
  background: var(--acu-bg-2);
  box-shadow: 0 0 0 2px var(--acu-accent-glow);
  outline: none;
}

.acu-v2-sql-console-page__history-time {
  color: var(--acu-text-3);
  font-size: 11px;
  white-space: nowrap;
}

.acu-v2-sql-console-page__history-item code {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--acu-text-2);
  font-family: Consolas, Menlo, Monaco, "Courier New", monospace;
  font-size: 12px;
}

.acu-v2-sql-console-page__empty {
  min-height: 96px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--acu-text-3);
  font-size: 12px;
  text-align: center;
  border: 0;
  border-radius: var(--acu-radius-sm);
  background: var(--acu-bg-2);
}

.acu-v2-sql-console-page__empty--compact {
  min-height: 72px;
}

.acu-v2-sql-console-page__result-section,
.acu-v2-sql-console-page__history-section {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.acu-v2-sql-console-page__history-section {
  padding-top: 12px;
}

.acu-v2-sql-console-page__section-title {
  margin: 0;
  color: var(--acu-text-1);
  font-size: 13px;
  font-weight: 600;
  line-height: 1.35;
}

.acu-v2-sql-console-page__table-wrap {
  max-height: 330px;
  overflow: auto;
  border: 0;
  border-radius: var(--acu-radius-sm);
  background: var(--acu-bg-2);
}

.acu-v2-sql-console-page__result-table {
  width: 100%;
  border-collapse: collapse;
  font-family: Consolas, Menlo, Monaco, "Courier New", monospace;
  font-size: 12px;
}

.acu-v2-sql-console-page__result-table th,
.acu-v2-sql-console-page__result-table td {
  max-width: 300px;
  padding: 7px 10px;
  border-bottom: 1px solid var(--acu-border);
  text-align: left;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.acu-v2-sql-console-page__result-table th {
  position: sticky;
  top: 0;
  z-index: 1;
  background: var(--acu-bg-2);
  color: var(--acu-text-1);
  font-weight: 600;
}

.acu-v2-sql-console-page__result-table tbody tr:nth-child(even) {
  background: color-mix(in srgb, var(--acu-bg-2) 45%, transparent);
}

.acu-v2-sql-console-page__cell-null,
.acu-v2-sql-console-page__empty-cell {
  color: var(--acu-text-3);
  font-style: italic;
}

.acu-v2-sql-console-page__result-meta {
  margin: 0;
  color: var(--acu-text-3);
  font-size: 12px;
  text-align: right;
}

.acu-v2-sql-console-page__error {
  margin: 0;
  min-height: 96px;
  padding: 12px;
  border: 0;
  border-radius: var(--acu-radius-sm);
  background: color-mix(in srgb, var(--acu-danger) 8%, transparent);
  color: var(--acu-danger);
  white-space: pre-wrap;
  word-break: break-word;
  font-family: Consolas, Menlo, Monaco, "Courier New", monospace;
  font-size: 12px;
  line-height: 1.55;
}

@media (max-width: 920px) {
  .acu-v2-sql-console-page {
    padding: 14px;
  }

  .acu-v2-sql-console-page__grid {
    grid-template-columns: 1fr;
  }

  .acu-v2-sql-console-page__actions {
    justify-content: stretch;
  }

  .acu-v2-sql-console-page__status {
    width: 100%;
    margin-left: 0;
    text-align: right;
  }
}
</style>
