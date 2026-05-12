<template>
  <Transition name="acu-drawer">
    <div v-if="isOpen" class="acu-v2-drawer-layer" @click="requestClose">
      <aside
        class="acu-v2-drawer"
        :style="{ width: resolvedWidth }"
        aria-modal="true"
        role="dialog"
        @click.stop
      >
        <header class="acu-v2-drawer__header">
          <div class="acu-v2-drawer__header-left">
            <AcuIconButton
              v-if="showBack"
              icon="fa-solid fa-arrow-left"
              title="返回"
              @click="requestBack"
            />
            <h3>{{ title }}</h3>
          </div>
          <AcuIconButton icon="fa-solid fa-xmark" aria-label="关闭" title="关闭" @click="requestClose" />
        </header>
        <div class="acu-v2-drawer__body">
          <slot />
        </div>
      </aside>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import AcuIconButton from './AcuIconButton.vue';

const props = withDefaults(defineProps<{
  isOpen: boolean;
  title: string;
  showBack?: boolean;
  width?: string;
  /** Return false (or a Promise resolving to false) to prevent close. */
  beforeClose?: () => boolean | Promise<boolean>;
}>(), {
  showBack: false,
  width: '480px',
  beforeClose: undefined,
});

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'back'): void;
}>();

const resolvedWidth = computed(() => `min(${props.width}, 100dvw)`);

async function guard(): Promise<boolean> {
  if (!props.beforeClose) return true;
  const result = props.beforeClose();
  return result instanceof Promise ? result : result;
}

async function requestClose(): Promise<void> {
  if (await guard()) emit('close');
}

async function requestBack(): Promise<void> {
  if (await guard()) emit('back');
}
</script>

<style scoped>
.acu-v2-drawer-layer {
  position: fixed; inset: 0; z-index: 9200;
  width: 100vw; width: 100dvw;
  height: 100vh; height: 100dvh;
  display: flex; justify-content: flex-end;
  background: rgba(0, 0, 0, 0.38);
  overflow: hidden;
}

.acu-v2-drawer {
  height: 100%; max-height: 100dvh;
  display: flex; flex-direction: column;
  background: var(--acu-bg-1);
  border-left: 0;
  box-shadow: var(--acu-shadow);
  min-width: 0; min-height: 0;
  overflow: hidden;
}

.acu-v2-drawer__header {
  flex: 0 0 auto;
  display: flex; align-items: center; justify-content: space-between;
  gap: 12px; padding: 14px 16px;
  border-bottom: 0;
}

.acu-v2-drawer__header-left { display: flex; align-items: center; gap: 10px; }
.acu-v2-drawer__header h3 { margin: 0; font-size: 15px; }

.acu-v2-drawer__body {
  flex: 1; min-height: 0;
  overflow-y: auto; padding: 16px;
  display: flex; flex-direction: column; gap: 14px;
}

/* ── Transition ── */
.acu-drawer-enter-active,
.acu-drawer-leave-active { transition: opacity 0.18s ease; }
.acu-drawer-enter-active .acu-v2-drawer { transition: transform 0.18s ease-out; }
.acu-drawer-leave-active .acu-v2-drawer { transition: transform 0.15s ease-in; }
.acu-drawer-enter-from,
.acu-drawer-leave-to { opacity: 0; }
.acu-drawer-enter-from .acu-v2-drawer,
.acu-drawer-leave-to .acu-v2-drawer { transform: translateX(100%); }

@media (max-width: 860px) {
  .acu-v2-drawer { width: 100vw !important; width: 100dvw !important; border-left: 0; }
}
</style>
