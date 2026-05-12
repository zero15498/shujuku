<template>
  <div class="acu-v2-app">
    <header class="acu-v2-app__header">
      <div class="acu-v2-app__header-left">
        <AcuButton
          icon-only
          class="acu-v2-app__menu"
          title="打开导航"
          :aria-expanded="isMobileNavOpen"
          @click="openMobileNav"
        >
          <i class="fa-solid fa-bars"></i>
        </AcuButton>
      </div>
      <div class="acu-v2-app__header-right">
        <div class="acu-v2-app__theme-switcher">
          <button
            type="button"
            class="acu-v2-app__theme-btn"
            :title="'主题：' + themeStore.activeTheme.name"
            @click="toggleThemeMenu"
          >
            <i class="fa-solid fa-palette"></i>
          </button>
          <Transition name="theme-menu">
            <ul
              v-if="isThemeMenuOpen"
              class="acu-v2-app__theme-menu"
              role="listbox"
              :aria-label="'选择主题'"
            >
              <li
                v-for="t in themeStore.themes"
                :key="t.id"
                role="option"
                :aria-selected="t.id === themeStore.activeId"
                class="acu-v2-app__theme-option"
                :class="{ 'is-active': t.id === themeStore.activeId }"
                @click="selectTheme(t.id)"
              >
                <span
                  class="acu-v2-app__theme-swatch"
                  :style="{ background: t.tokens.accent }"
                ></span>
                {{ t.name }}
              </li>
            </ul>
          </Transition>
        </div>
        <button
          type="button"
          class="acu-v2-app__close"
          title="关闭新 UI"
          aria-label="关闭新 UI"
          @click="closeApp"
        >
          ×
        </button>
      </div>
    </header>
    <div class="acu-v2-app__body">
      <Sidebar class="acu-v2-app__desktop-sidebar" />
      <MainArea />
    </div>

    <Transition name="mobile-nav">
      <div
        v-if="isMobileNavOpen"
        class="acu-v2-app__mobile-nav-layer"
        @click="closeMobileNav"
      >
        <aside
          class="acu-v2-app__mobile-nav"
          role="dialog"
          aria-modal="true"
          aria-label="一级页导航"
          @click.stop
        >
          <header class="acu-v2-app__mobile-nav-header">
            <span>导航</span>
            <button
              type="button"
              class="acu-v2-app__mobile-nav-close"
              title="关闭导航"
              aria-label="关闭导航"
              @click="closeMobileNav"
            >
              <i class="fa-solid fa-xmark"></i>
            </button>
          </header>
          <Sidebar variant="drawer" @navigate="closeMobileNav" />
        </aside>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import AcuButton from "./components/_lib/AcuButton.vue";
import MainArea from "./components/MainArea.vue";
import Sidebar from "./components/Sidebar.vue";
import { useChatChangedListener } from "./composables/useChatChangedListener";
import { useDevOptions } from "./composables/useDevOptions";
import { canCloseUi } from "./composables/useUiCloseGuard";
import { useRootShellStore } from "./stores/root-shell-store";
import { useRouterStore } from "./stores/router-store";
import { useThemeStore } from "./stores/theme-store";
import type { AcuV2ThemeId } from "./theme/theme-types";

const emit = defineEmits<{ (event: "close"): void }>();
const rootShell = useRootShellStore();
const router = useRouterStore();
const themeStore = useThemeStore();
const isMobileNavOpen = ref(false);
const isThemeMenuOpen = ref(false);

function toggleThemeMenu(): void {
  isThemeMenuOpen.value = !isThemeMenuOpen.value;
}

function selectTheme(id: AcuV2ThemeId): void {
  themeStore.setTheme(id);
  isThemeMenuOpen.value = false;
}

function onDocClick(e: MouseEvent): void {
  if (!(e.target as HTMLElement)?.closest(".acu-v2-app__theme-switcher")) {
    isThemeMenuOpen.value = false;
  }
}

onMounted(() => document.addEventListener("click", onDocClick, true));
onBeforeUnmount(() => document.removeEventListener("click", onDocClick, true));

onMounted(() => {
  rootShell.markMounted();
});

useChatChangedListener();

// 关掉"启用开发者选项"且当前页是开发者一级页时，回退到默认页（plan §D24）
const devOptions = useDevOptions();
watch(() => devOptions.developerOptionsEnabled.value, () => {
  router.ensureActiveVisible();
});
onMounted(() => router.ensureActiveVisible());

function openMobileNav(): void {
  isMobileNavOpen.value = true;
}

function closeMobileNav(): void {
  isMobileNavOpen.value = false;
}

async function closeApp(): Promise<void> {
  if (!(await canCloseUi())) return;
  closeMobileNav();
  emit("close");
}
</script>

<style scoped>
.acu-v2-app {
  position: fixed;
  inset: 0;
  z-index: 9000;
  width: 100vw;
  width: 100dvw;
  height: 100vh;
  height: 100dvh;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--acu-bg-0);
  color: var(--acu-text-1);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  font-size: 12px;
}

.acu-v2-app,
.acu-v2-app * {
  box-sizing: border-box;
}

.acu-v2-app__header {
  position: absolute;
  top: 10px;
  right: 12px;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0;
  background: transparent;
  border-bottom: 0;
  flex: 0 0 auto;
}

.acu-v2-app__header-left {
  display: none;
  align-items: center;
  min-width: 0;
  gap: 8px;
}

.acu-v2-app__menu {
  display: none;
  flex: 0 0 auto;
  font-size: 14px;
}

.acu-v2-app__close {
  width: 30px;
  height: 30px;
  border: 0;
  background: transparent;
  color: var(--acu-text-2);
  font-size: 22px;
  line-height: 1;
  cursor: pointer;
  border-radius: var(--acu-radius-sm);
}

.acu-v2-app__close:hover {
  background: var(--acu-bg-2);
  color: var(--acu-text-1);
}

.acu-v2-app__body {
  flex: 1 1 auto;
  display: flex;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}

.acu-v2-app__mobile-nav-layer {
  position: fixed;
  inset: 0;
  width: 100vw;
  width: 100dvw;
  height: 100vh;
  height: 100dvh;
  min-height: 100vh;
  min-height: 100dvh;
  z-index: 9300;
  display: none;
  align-items: stretch;
  justify-content: flex-start;
  overflow: hidden;
  background: rgba(0, 0, 0, 0.58);
  pointer-events: auto;
  overscroll-behavior: contain;
}

.acu-v2-app__mobile-nav {
  width: min(300px, calc(100dvw - 48px));
  height: 100vh;
  height: 100dvh;
  max-height: 100dvh;
  min-width: 0;
  min-height: 0;
  align-self: stretch;
  flex: 0 0 min(300px, calc(100dvw - 48px));
  display: flex;
  flex-direction: column;
  background: var(--acu-bg-1);
  border-right: 0;
  box-shadow: var(--acu-shadow);
  overflow: hidden;
}

.acu-v2-app__mobile-nav-header {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 48px;
  padding: 8px 12px 8px 16px;
  border-bottom: 0;
  color: var(--acu-text-1);
  font-size: 14px;
  font-weight: 600;
}

.acu-v2-app__mobile-nav-close {
  width: 32px;
  height: 32px;
  border: 0;
  background: transparent;
  color: var(--acu-text-2);
  border-radius: var(--acu-radius-sm);
  cursor: pointer;
}

.acu-v2-app__mobile-nav-close:hover {
  background: var(--acu-bg-2);
  color: var(--acu-text-1);
}

/* ── Theme switcher ── */
.acu-v2-app__header-right {
  display: flex;
  align-items: center;
  gap: 4px;
}

.acu-v2-app__theme-switcher {
  position: relative;
}

.acu-v2-app__theme-btn {
  width: 30px;
  height: 30px;
  border: 0;
  background: transparent;
  color: var(--acu-text-2);
  font-size: 14px;
  cursor: pointer;
  border-radius: var(--acu-radius-sm);
}

.acu-v2-app__theme-btn:hover {
  background: var(--acu-bg-2);
  color: var(--acu-text-1);
}

.acu-v2-app__theme-menu {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  z-index: 10;
  list-style: none;
  margin: 0;
  padding: 4px;
  min-width: 160px;
  background: var(--acu-bg-1);
  border: 1px solid var(--acu-border);
  border-radius: var(--acu-radius-md);
  box-shadow: var(--acu-shadow);
}

.acu-v2-app__theme-option {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 10px;
  font-size: 13px;
  color: var(--acu-text-2);
  border-radius: var(--acu-radius-sm);
  cursor: pointer;
  user-select: none;
}

.acu-v2-app__theme-option:hover {
  background: var(--acu-bg-2);
  color: var(--acu-text-1);
}

.acu-v2-app__theme-option.is-active {
  color: var(--acu-on-accent);
  background: var(--acu-accent);
  font-weight: 600;
}

.acu-v2-app__theme-swatch {
  width: 14px;
  height: 14px;
  border-radius: var(--acu-radius-sm);
  flex: 0 0 14px;
  border: 0;
}

/* ── Theme menu transitions ── */
.theme-menu-enter-active,
.theme-menu-leave-active {
  transition:
    opacity 0.12s ease,
    transform 0.12s ease;
}

.theme-menu-enter-from,
.theme-menu-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

/* ── Mobile nav transitions (guidelines §5) ── */
.mobile-nav-enter-active,
.mobile-nav-leave-active {
  transition: opacity 0.18s ease;
}

.mobile-nav-enter-active .acu-v2-app__mobile-nav {
  transition: transform 0.18s ease-out;
}

.mobile-nav-leave-active .acu-v2-app__mobile-nav {
  transition: transform 0.15s ease-in;
}

.mobile-nav-enter-from,
.mobile-nav-leave-to {
  opacity: 0;
}

.mobile-nav-enter-from .acu-v2-app__mobile-nav,
.mobile-nav-leave-to .acu-v2-app__mobile-nav {
  transform: translateX(-100%);
}

@media (max-width: 720px) {
  .acu-v2-app__header {
    position: relative;
    top: auto;
    right: auto;
    z-index: 20;
    padding: 8px 10px;
    background: var(--acu-bg-0);
  }

  .acu-v2-app__header-left {
    display: flex;
  }

  .acu-v2-app__menu {
    display: inline-flex;
  }

  .acu-v2-app__desktop-sidebar {
    display: none;
  }

  .acu-v2-app__mobile-nav-layer {
    display: flex;
  }
}
</style>
