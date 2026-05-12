/**
 * useHelloService — 阶段 0 批次 E 的 service 调用链验证（P0-5）
 *
 * 这是新 UI 第一个 composable，专门用于证明 D17 的中间层模式可行：
 * - Vue 组件不直接 import service 函数 / 单例
 * - composable 在 service 层 read-only 状态外面包一层 ref，组件只用 ref
 *
 * 仅显示 `getCurrentIsolationKey_ACU()` 会产生歧义：数据隔离未启用时它按设计
 * 返回空串。因此这里同时读取几个纯读运行时字段，用于区分"service 未打通"
 * 和"已打通但隔离功能关闭"。
 */
import { ref, type Ref } from 'vue';
import * as runtimeState from '../../service/runtime/state-manager';

export interface HelloServiceSnapshot {
  isolationKey: string;
  isolationEnabled: boolean;
  isolationCode: string;
  chatFileIdentifier: string;
  coreApisReady: boolean;
}

export interface HelloServiceState {
  isolationKey: Ref<string>;
  isolationEnabled: Ref<boolean>;
  isolationCode: Ref<string>;
  chatFileIdentifier: Ref<string>;
  coreApisReady: Ref<boolean>;
  refresh: () => void;
}

export function useHelloService(): HelloServiceState {
  const initial = safeRead();
  const isolationKey = ref<string>(initial.isolationKey);
  const isolationEnabled = ref<boolean>(initial.isolationEnabled);
  const isolationCode = ref<string>(initial.isolationCode);
  const chatFileIdentifier = ref<string>(initial.chatFileIdentifier);
  const coreApisReady = ref<boolean>(initial.coreApisReady);

  function refresh() {
    const next = safeRead();
    isolationKey.value = next.isolationKey;
    isolationEnabled.value = next.isolationEnabled;
    isolationCode.value = next.isolationCode;
    chatFileIdentifier.value = next.chatFileIdentifier;
    coreApisReady.value = next.coreApisReady;
  }

  return {
    isolationKey,
    isolationEnabled,
    isolationCode,
    chatFileIdentifier,
    coreApisReady,
    refresh,
  };
}

function safeRead(): HelloServiceSnapshot {
  try {
    const settings = runtimeState.settings_ACU || {};
    const key = runtimeState.getCurrentIsolationKey_ACU();
    return {
      isolationKey: typeof key === 'string' ? key : '',
      isolationEnabled: settings.dataIsolationEnabled === true,
      isolationCode: typeof settings.dataIsolationCode === 'string' ? settings.dataIsolationCode : '',
      chatFileIdentifier:
        typeof runtimeState.currentChatFileIdentifier_ACU === 'string'
          ? runtimeState.currentChatFileIdentifier_ACU
          : '',
      coreApisReady: runtimeState.coreApisAreReady_ACU === true,
    };
  } catch {
    // settings_ACU 未初始化的场景（早期 mount）
    return {
      isolationKey: '',
      isolationEnabled: false,
      isolationCode: '',
      chatFileIdentifier: '',
      coreApisReady: false,
    };
  }
}
