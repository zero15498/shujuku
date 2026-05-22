<template>
  <div
    v-if="toast.items.length"
    class="acu-toast-viewport"
    role="status"
    aria-label="通知"
    :style="{ zIndex: 9410 }"
  >
    <TransitionGroup name="acu-toast" tag="ol" class="acu-toast-viewport__list">
      <li
        v-for="item in toast.items"
        :key="item.id"
        :class="['acu-toast', `acu-toast--${item.kind}`]"
        :role="item.kind === 'error' ? 'alert' : 'status'"
      >
        <span class="acu-toast__icon" aria-hidden="true">
          <i :class="iconForKind(item.kind)"></i>
        </span>
        <p class="acu-toast__text">{{ item.text }}</p>
        <AcuButton
          v-if="item.action"
          class="acu-toast__action"
          size="sm"
          @click="runAction(item)"
        >
          {{ item.action.label }}
        </AcuButton>
        <AcuIconButton
          v-if="item.dismissible"
          class="acu-toast__dismiss"
          icon="fa-solid fa-xmark"
          size="sm"
          title="关闭通知"
          @click="toast.dismiss(item.id)"
        />
      </li>
    </TransitionGroup>
  </div>
</template>

<script setup lang="ts">
import {
  useToastStore,
  type ToastItem,
  type ToastKind,
} from "../../stores/toast-store";
import AcuButton from "./AcuButton.vue";
import AcuIconButton from "./AcuIconButton.vue";

const toast = useToastStore();

function iconForKind(kind: ToastKind): string {
  if (kind === "success") return "fa-solid fa-check";
  if (kind === "warning") return "fa-solid fa-triangle-exclamation";
  if (kind === "error") return "fa-solid fa-circle-exclamation";
  return "fa-solid fa-circle-info";
}

async function runAction(item: ToastItem): Promise<void> {
  const action = item.action;
  if (!action) return;
  await action.onClick();
  if (action.dismissOnClick !== false) {
    toast.dismiss(item.id);
  }
}
</script>

<style scoped>
.acu-toast-viewport {
  position: fixed;
  right: 18px;
  bottom: 18px;
  z-index: 9410;
  width: min(360px, calc(100vw - 36px));
  pointer-events: none;
}

.acu-toast-viewport__list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.acu-toast {
  position: relative;
  min-width: 0;
  display: grid;
  grid-template-columns: 18px minmax(0, 1fr) auto auto;
  align-items: center;
  gap: 8px;
  padding: 10px;
  overflow: hidden;
  border: 1px solid var(--acu-border-2);
  border-radius: var(--acu-radius-md);
  background: var(--acu-bg-1);
  box-shadow: var(--acu-shadow);
  color: var(--acu-text-2);
  pointer-events: auto;
}

.acu-toast::before {
  content: "";
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  width: 3px;
  background: color-mix(in srgb, var(--acu-text-3) 38%, transparent);
}

.acu-toast--success::before {
  background: var(--acu-success);
}

.acu-toast--warning::before {
  background: var(--acu-warning);
}

.acu-toast--error::before {
  background: var(--acu-danger);
}

.acu-toast__icon {
  min-width: 0;
  color: var(--acu-text-3);
  font-size: var(--acu-font-size-body-lg, 13px);
  line-height: 1;
}

.acu-toast--success .acu-toast__icon {
  color: var(--acu-success);
}

.acu-toast--warning .acu-toast__icon {
  color: var(--acu-warning);
}

.acu-toast--error .acu-toast__icon {
  color: var(--acu-danger);
}

.acu-toast__text {
  min-width: 0;
  margin: 0;
  color: var(--acu-text-2);
  font-size: var(--acu-font-size-body, 12px);
  line-height: 1.45;
  overflow-wrap: anywhere;
}

.acu-toast__action {
  white-space: nowrap;
}

.acu-toast__dismiss {
  flex: 0 0 auto;
}

.acu-toast-enter-active,
.acu-toast-leave-active,
.acu-toast-move {
  transition:
    opacity 0.16s ease,
    transform 0.16s ease;
}

.acu-toast-enter-from,
.acu-toast-leave-to {
  opacity: 0;
  transform: translateY(6px);
}

.acu-toast-leave-active {
  position: absolute;
  right: 0;
  left: 0;
}

@media (max-width: 640px) {
  .acu-toast-viewport {
    right: 12px;
    bottom: calc(12px + env(safe-area-inset-bottom, 0px));
    left: 12px;
    width: auto;
  }

  .acu-toast {
    grid-template-columns: 18px minmax(0, 1fr) auto;
  }

  .acu-toast__action {
    grid-column: 2 / 4;
    justify-self: start;
  }
}
</style>
