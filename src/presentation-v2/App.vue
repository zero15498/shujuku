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
          <ul
            v-if="isThemeMenuRendered"
            class="acu-v2-app__theme-menu"
            :class="{ 'is-closing': isThemeMenuClosing }"
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
                :style="{
                  '--acu-theme-swatch-bg': t.tokens.bg0,
                  '--acu-theme-swatch-accent': t.tokens.accent,
                }"
              ></span>
              {{ t.name }}
            </li>
          </ul>
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

    <div
      v-if="isMobileNavRendered"
      class="acu-v2-app__mobile-nav-layer"
      :class="{ 'is-closing': isMobileNavClosing }"
      @click.self="closeMobileNav"
    >
      <aside
        class="acu-v2-app__mobile-nav"
        role="dialog"
        aria-modal="true"
        aria-label="一级页导航"
        @click.stop
      >
        <Sidebar variant="drawer" @navigate="closeMobileNav" />
      </aside>
    </div>
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
import { getAcuHostDocument } from "./bootstrap/host-document";

const emit = defineEmits<{ (event: "close"): void }>();
const rootShell = useRootShellStore();
const router = useRouterStore();
const themeStore = useThemeStore();
const isMobileNavOpen = ref(false);
const isMobileNavRendered = ref(false);
const isMobileNavClosing = ref(false);
const isThemeMenuOpen = ref(false);
const isThemeMenuRendered = ref(false);
const isThemeMenuClosing = ref(false);
const THEME_MENU_LEAVE_MS = 120;
const MOBILE_NAV_LEAVE_MS = 150;
let themeMenuCloseTimer: ReturnType<typeof setTimeout> | undefined;
let mobileNavCloseTimer: ReturnType<typeof setTimeout> | undefined;

function toggleThemeMenu(): void {
  if (isThemeMenuOpen.value) closeThemeMenu();
  else openThemeMenu();
}

function selectTheme(id: AcuV2ThemeId): void {
  themeStore.setTheme(id);
  closeThemeMenu();
}

function onDocPointer(e: Event): void {
  if (!(e.target as HTMLElement)?.closest(".acu-v2-app__theme-switcher")) {
    closeThemeMenu();
  }
}

onMounted(() => {
  const doc = getAcuHostDocument();
  doc.addEventListener("pointerdown", onDocPointer, true);
  doc.addEventListener("touchstart", onDocPointer, true);
  doc.addEventListener("click", onDocPointer, true);
});
onBeforeUnmount(() => {
  const doc = getAcuHostDocument();
  doc.removeEventListener("pointerdown", onDocPointer, true);
  doc.removeEventListener("touchstart", onDocPointer, true);
  doc.removeEventListener("click", onDocPointer, true);
  clearThemeMenuCloseTimer();
  clearMobileNavCloseTimer();
});

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
  clearMobileNavCloseTimer();
  isMobileNavOpen.value = true;
  isMobileNavRendered.value = true;
  isMobileNavClosing.value = false;
}

function closeMobileNav(): void {
  if (!isMobileNavOpen.value && !isMobileNavRendered.value) return;
  isMobileNavOpen.value = false;
  if (!isMobileNavRendered.value) return;
  isMobileNavClosing.value = true;
  clearMobileNavCloseTimer();
  mobileNavCloseTimer = setTimeout(() => {
    isMobileNavRendered.value = false;
    isMobileNavClosing.value = false;
    mobileNavCloseTimer = undefined;
  }, MOBILE_NAV_LEAVE_MS);
}

async function closeApp(): Promise<void> {
  if (!(await canCloseUi())) return;
  closeThemeMenu();
  closeMobileNav();
  emit("close");
}

function openThemeMenu(): void {
  clearThemeMenuCloseTimer();
  isThemeMenuOpen.value = true;
  isThemeMenuRendered.value = true;
  isThemeMenuClosing.value = false;
}

function closeThemeMenu(): void {
  if (!isThemeMenuOpen.value && !isThemeMenuRendered.value) return;
  isThemeMenuOpen.value = false;
  if (!isThemeMenuRendered.value) return;
  isThemeMenuClosing.value = true;
  clearThemeMenuCloseTimer();
  themeMenuCloseTimer = setTimeout(() => {
    isThemeMenuRendered.value = false;
    isThemeMenuClosing.value = false;
    themeMenuCloseTimer = undefined;
  }, THEME_MENU_LEAVE_MS);
}

function clearThemeMenuCloseTimer(): void {
  if (themeMenuCloseTimer === undefined) return;
  clearTimeout(themeMenuCloseTimer);
  themeMenuCloseTimer = undefined;
}

function clearMobileNavCloseTimer(): void {
  if (mobileNavCloseTimer === undefined) return;
  clearTimeout(mobileNavCloseTimer);
  mobileNavCloseTimer = undefined;
}
</script>

<style scoped>
.acu-v2-app {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  inset: 0;
  z-index: 9000;
  width: 100%;
  width: 100vw;
  width: 100dvw;
  height: 100%;
  height: 100vh;
  height: 100dvh;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--acu-bg-0);
  color: var(--acu-text-1);
  font-family: var(--acu-font-ui);
  font-size: 12px;
}

.acu-v2-app,
.acu-v2-app * {
  box-sizing: border-box;
}

.acu-v2-app :deep(button) {
  appearance: none;
  -webkit-appearance: none;
  -webkit-tap-highlight-color: transparent;
}

.acu-v2-app :deep(button:focus:not(:focus-visible)) {
  outline: none;
  box-shadow: none;
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
  background: transparent;
  color: var(--acu-text-2);
  box-shadow: none;
}

.acu-v2-app__menu:hover:not(:disabled) {
  background: transparent;
  color: var(--acu-text-1);
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
  background: var(--acu-hover-overlay);
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
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  inset: 0;
  width: 100%;
  width: 100vw;
  width: 100dvw;
  height: 100%;
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
  animation: mobile-nav-layer-in 0.18s ease-out both;
}

.acu-v2-app__mobile-nav-layer.is-closing {
  pointer-events: auto;
  animation: mobile-nav-layer-out 0.15s ease-in both;
}

.acu-v2-app__mobile-nav {
  width: 280px;
  max-width: calc(100vw - 72px);
  height: 100%;
  max-height: 100vh;
  min-width: 0;
  min-height: 0;
  align-self: stretch;
  flex: 0 1 280px;
  display: flex;
  flex-direction: column;
  background: var(--acu-sidebar-bg);
  border-right: 0;
  box-shadow: var(--acu-shadow);
  overflow: hidden;
  pointer-events: auto;
  animation: mobile-nav-drawer-in 0.18s ease-out both;
}

.acu-v2-app__mobile-nav-layer.is-closing .acu-v2-app__mobile-nav {
  animation: mobile-nav-drawer-out 0.15s ease-in both;
}

@supports (width: min(280px, calc(100vw - 72px))) {
  .acu-v2-app__mobile-nav {
    width: min(280px, calc(100vw - 72px));
    flex: 0 0 min(280px, calc(100vw - 72px));
  }
}

@supports (width: 100dvw) {
  .acu-v2-app__mobile-nav {
    max-width: calc(100dvw - 72px);
  }
}

@supports (height: 100dvh) {
  .acu-v2-app__mobile-nav {
    height: 100dvh;
    max-height: 100dvh;
  }
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
  background: var(--acu-hover-overlay);
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
  animation: theme-menu-in 0.12s ease-out both;
}

.acu-v2-app__theme-menu.is-closing {
  pointer-events: none;
  animation: theme-menu-out 0.12s ease-in both;
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
  background: var(--acu-hover-overlay);
  color: var(--acu-text-1);
}

.acu-v2-app__theme-option.is-active {
  color: var(--acu-on-accent);
  background: var(--acu-accent);
  font-weight: 600;
}

.acu-v2-app__theme-swatch {
  display: block;
  width: 18px;
  height: 18px;
  border-radius: 999px;
  flex: 0 0 18px;
  background: linear-gradient(
    135deg,
    var(--acu-theme-swatch-bg) 0 56%,
    var(--acu-theme-swatch-accent) 56% 100%
  );
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--acu-border-2) 72%, transparent);
}

.acu-v2-app__theme-option.is-active .acu-v2-app__theme-swatch {
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--acu-on-accent) 62%, transparent);
}

@keyframes theme-menu-in {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes theme-menu-out {
  from {
    opacity: 1;
    transform: translateY(0);
  }
  to {
    opacity: 0;
    transform: translateY(-4px);
  }
}

@keyframes mobile-nav-layer-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes mobile-nav-drawer-in {
  from { transform: translateX(-100%); }
  to { transform: translateX(0); }
}

@keyframes mobile-nav-layer-out {
  from { opacity: 1; }
  to { opacity: 0; }
}

@keyframes mobile-nav-drawer-out {
  from { transform: translateX(0); }
  to { transform: translateX(-100%); }
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
