import { computed, onBeforeUnmount, ref } from 'vue';
import {
  getNextLoopPrompt_ACU,
  initLoopState_ACU,
  stopLoopState_ACU,
  validateLoopStartParams_ACU,
} from '../../service/loop/loop-controller';
import { loopState_ACU } from '../../service/runtime/state-manager';

type MessageKind = 'info' | 'success' | 'warning' | 'error';

function setSendTextareaValue(text: string): boolean {
  const input = document.querySelector<HTMLTextAreaElement>('#send_textarea');
  if (!input) return false;
  input.value = text;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  return true;
}

function clickSendButton(): boolean {
  const button = document.querySelector<HTMLElement>('#send_but');
  if (!button) return false;
  button.click();
  return true;
}

export function useContinuationLoop() {
  const running = ref(loopState_ACU.isLooping);
  const timerText = ref('');
  const message = ref<{ kind: MessageKind; text: string } | null>(null);

  function refreshStatus(): void {
    running.value = loopState_ACU.isLooping;
  }

  function updateTimer(): void {
    refreshStatus();
    if (!loopState_ACU.isLooping || !loopState_ACU.startTime || !loopState_ACU.totalDuration) {
      timerText.value = '';
      return;
    }
    const elapsed = Date.now() - loopState_ACU.startTime;
    const remaining = Math.max(0, loopState_ACU.totalDuration - elapsed);
    if (remaining <= 0) {
      stop();
      message.value = { kind: 'info', text: '总时长已结束，智能续写已停止。' };
      return;
    }
    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    timerText.value = `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  function startTick(): void {
    if (loopState_ACU.tickInterval) clearInterval(loopState_ACU.tickInterval);
    updateTimer();
    loopState_ACU.tickInterval = setInterval(updateTimer, 1000);
  }

  function triggerNextPrompt(): void {
    const prompt = getNextLoopPrompt_ACU();
    if (prompt === null) {
      stop();
      message.value = { kind: 'error', text: '没有可用的循环提示词，智能续写已停止。' };
      return;
    }
    if (!setSendTextareaValue(prompt)) {
      stop();
      message.value = { kind: 'error', text: '找不到酒馆输入框，请确认当前页面可以正常发送消息。' };
      return;
    }
    window.setTimeout(() => {
      if (!loopState_ACU.isLooping) return;
      if (!clickSendButton()) {
        stop();
        message.value = { kind: 'error', text: '找不到发送按钮，智能续写已停止。' };
      }
    }, 100);
  }

  function start(): void {
    const validationError = validateLoopStartParams_ACU();
    if (validationError) {
      message.value = { kind: 'error', text: validationError };
      stopLoopState_ACU();
      refreshStatus();
      return;
    }
    initLoopState_ACU();
    message.value = { kind: 'success', text: '智能续写已启动。' };
    refreshStatus();
    startTick();
    triggerNextPrompt();
  }

  function stop(): void {
    stopLoopState_ACU();
    timerText.value = '';
    refreshStatus();
  }

  onBeforeUnmount(() => {
    refreshStatus();
  });

  return {
    running,
    timerText,
    message,
    statusText: computed(() => (running.value ? '运行中' : '未运行')),
    start,
    stop,
    refreshStatus,
  };
}
