<template>
  <section class="acu-v2-continuation-page">
    <AcuPageHeader title="智能续写" />

    <div class="acu-v2-continuation-page__grid">
      <AcuPanel
        title="循环条件"
        description="这里控制续写的节奏和失败判断。总时长必须大于 0 才能启动；标签验证用于检查 AI 回复里是否出现指定文本，缺少任意一项会进入重试。出问题时请先降低验证要求或缩短总时长。"
      >
        <AcuFormRow label="标签验证" hint="多个标签用逗号分隔；留空表示不检查标签。">
          <AcuInput
            :model-value="store.loopTags"
            type="text"
            placeholder="例如: content, thinking"
            @update:model-value="store.setLoopTags(String($event))"
          />
        </AcuFormRow>

        <div class="acu-v2-continuation-page__number-grid">
          <AcuFormRow label="循环延时" hint="每次合格回复后等待几秒再继续。">
            <AcuInput
              :model-value="store.loopDelay"
              type="number"
              :min="0"
              :step="1"
              @change="store.setLoopDelay($event)"
            />
          </AcuFormRow>
          <AcuFormRow label="总时长" hint="单位：分钟；必须大于 0 才能启动。">
            <AcuInput
              :model-value="store.loopTotalDuration"
              type="number"
              :min="0"
              :step="1"
              @change="store.setLoopTotalDuration($event)"
            />
          </AcuFormRow>
          <AcuFormRow label="失败上限" hint="连续失败超过此值后停止。">
            <AcuInput
              :model-value="store.maxRetries"
              type="number"
              :min="0"
              :step="1"
              @change="store.setMaxRetries($event)"
            />
          </AcuFormRow>
          <AcuFormRow label="AI 上下文" hint="读取最近几条 AI 回复作为上下文，不计算用户输入。">
            <AcuInput
              :model-value="store.contextTurnCount"
              type="number"
              :min="0"
              :max="20"
              :step="1"
              @change="store.setContextTurnCount($event)"
            />
          </AcuFormRow>
        </div>
      </AcuPanel>

      <div class="acu-v2-continuation-page__side-stack">
        <AcuPanel
          title="循环提示词"
          description="智能续写会把这里的提示词按顺序填入酒馆输入框并发送。准备多个提示词时，每轮会自动切到下一个，用完后从头开始。为空的提示词不能启动；如果启动失败，请先检查是否至少有一条可发送内容。"
        >
          <div class="acu-v2-continuation-page__prompt-toolbar">
            <span class="acu-v2-continuation-page__meta">{{ store.promptCount ? `${store.promptCount} 条提示词` : '暂无提示词' }}</span>
            <AcuButton size="sm" @click="store.addPrompt">
              <i class="fa-solid fa-plus"></i>
              添加提示词
            </AcuButton>
          </div>

          <div v-if="store.prompts.length" class="acu-v2-continuation-page__prompt-list">
            <div
              v-for="(prompt, index) in store.prompts"
              :key="index"
              class="acu-v2-continuation-page__prompt-item"
            >
              <div class="acu-v2-continuation-page__prompt-head">
                <span>提示词 {{ index + 1 }}</span>
                <AcuIconButton
                  icon="fa-solid fa-trash-can"
                  variant="danger"
                  size="sm"
                  title="删除此提示词"
                  @click="store.removePrompt(index)"
                />
              </div>
              <AcuTextarea
                :model-value="prompt"
                :rows="4"
                placeholder="输入本轮要发送给主 AI 的续写提示..."
                @update:model-value="store.setPrompt(index, $event)"
              />
            </div>
          </div>
          <p v-else class="acu-v2-continuation-page__empty">
            尚未添加提示词。先添加一条可发送内容，再启动智能续写。
          </p>
        </AcuPanel>

        <AcuPanel
          title="运行控制"
          description="启动后，新 UI 会把下一条循环提示词写入酒馆输入框并点击发送；后续轮次会在每次 AI 回复结束后继续。停止只会停止后续循环，不会删除已经发送或生成的楼层。"
        >
          <div class="acu-v2-continuation-page__status">
            <span class="acu-v2-continuation-page__status-label">循环状态</span>
            <strong :class="{ 'is-running': loop.running.value }">{{ loop.statusText.value }}</strong>
            <span v-if="loop.timerText.value" class="acu-v2-continuation-page__timer">剩余 {{ loop.timerText.value }}</span>
          </div>

          <AcuMessage v-if="loop.message.value" :kind="loop.message.value.kind">
            {{ loop.message.value.text }}
          </AcuMessage>

          <div class="acu-v2-continuation-page__actions">
            <AcuButton
              v-if="!loop.running.value"
              variant="primary"
              :disabled="!store.hasPrompt || store.loopTotalDuration <= 0"
              @click="loop.start"
            >
              <i class="fa-solid fa-play"></i>
              开始智能续写
            </AcuButton>
            <AcuButton
              v-else
              variant="danger"
              @click="loop.stop"
            >
              <i class="fa-solid fa-stop"></i>
              停止智能续写
            </AcuButton>
          </div>
        </AcuPanel>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { onMounted, watch } from 'vue';
import AcuButton from '../components/_lib/AcuButton.vue';
import AcuFormRow from '../components/_lib/AcuFormRow.vue';
import AcuIconButton from '../components/_lib/AcuIconButton.vue';
import AcuInput from '../components/_lib/AcuInput.vue';
import AcuMessage from '../components/_lib/AcuMessage.vue';
import AcuPageHeader from '../components/_lib/AcuPageHeader.vue';
import AcuPanel from '../components/_lib/AcuPanel.vue';
import AcuTextarea from '../components/_lib/AcuTextarea.vue';
import { useChatChangedTick } from '../composables/useChatChangedListener';
import { useContinuationLoop } from '../composables/useContinuationLoop';
import { useContinuationStore } from '../stores/continuation-store';

const store = useContinuationStore();
const loop = useContinuationLoop();

function refreshAll(): void {
  store.refreshFromSettings();
  loop.refreshStatus();
}

onMounted(refreshAll);
watch(useChatChangedTick(), refreshAll);
</script>

<style scoped>
.acu-v2-continuation-page {
  min-height: 100%;
  min-width: 0;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.acu-v2-continuation-page__grid {
  display: grid;
  grid-template-columns: minmax(280px, 0.9fr) minmax(0, 1.1fr);
  gap: 16px;
  align-items: stretch;
}

.acu-v2-continuation-page__side-stack {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
}

.acu-v2-continuation-page__prompt-toolbar,
.acu-v2-continuation-page__prompt-head,
.acu-v2-continuation-page__actions,
.acu-v2-continuation-page__status {
  display: flex;
  align-items: center;
  gap: 8px;
}

.acu-v2-continuation-page__prompt-toolbar {
  justify-content: space-between;
}

.acu-v2-continuation-page__meta,
.acu-v2-continuation-page__empty,
.acu-v2-continuation-page__timer {
  color: var(--acu-text-3);
  font-size: 11px;
}

.acu-v2-continuation-page__empty {
  margin: 0;
  padding: 10px;
  border: 0;
  border-radius: var(--acu-radius-sm);
  background: var(--acu-bg-2);
}

.acu-v2-continuation-page__prompt-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.acu-v2-continuation-page__prompt-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px;
  border: 0;
  border-radius: var(--acu-radius-md);
  background: var(--acu-bg-2);
}

.acu-v2-continuation-page__prompt-head {
  justify-content: space-between;
  color: var(--acu-text-2);
  font-size: 12px;
  font-weight: 500;
}

.acu-v2-continuation-page__number-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.acu-v2-continuation-page__status {
  min-height: 38px;
  padding: 9px 10px;
  border: 0;
  border-radius: var(--acu-radius-sm);
  background: var(--acu-bg-2);
}

.acu-v2-continuation-page__status-label {
  color: var(--acu-text-3);
  font-size: 11px;
}

.acu-v2-continuation-page__status strong {
  color: var(--acu-text-2);
  font-size: 13px;
}

.acu-v2-continuation-page__status strong.is-running {
  color: var(--acu-success);
}

.acu-v2-continuation-page__actions {
  justify-content: flex-end;
  padding-top: 12px;
  margin-top: 4px;
}

@media (max-width: 860px) {
  .acu-v2-continuation-page {
    padding: 14px;
  }

  .acu-v2-continuation-page__grid,
  .acu-v2-continuation-page__number-grid {
    grid-template-columns: 1fr;
  }
}
</style>
