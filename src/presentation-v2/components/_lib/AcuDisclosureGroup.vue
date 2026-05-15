<template>
  <div
    class="acu-disclosure-group"
    :class="[rootClass, { 'acu-disclosure-group--expanded': expanded }]"
  >
    <button
      type="button"
      class="acu-disclosure-group__header"
      :class="headerClass"
      :aria-expanded="expanded"
      :aria-controls="bodyId || undefined"
      @click="$emit('toggle')"
    >
      <i
        class="fa-solid fa-chevron-right acu-disclosure-group__chevron"
        :class="[chevronClass, { 'acu-disclosure-group__chevron--open': expanded, [chevronOpenClass]: expanded && chevronOpenClass }]"
        aria-hidden="true"
      ></i>
      <span class="acu-disclosure-group__label" :class="labelClass">
        <slot name="label">{{ label }}</slot>
      </span>
      <span v-if="$slots.meta || meta" class="acu-disclosure-group__meta" :class="metaClass">
        <slot name="meta">{{ meta }}</slot>
      </span>
    </button>

    <Transition
      :css="false"
      @before-enter="beforeEnter"
      @enter="enter"
      @after-enter="afterEnter"
      @enter-cancelled="cleanupTransition"
      @before-leave="beforeLeave"
      @leave="leave"
      @after-leave="afterLeave"
      @leave-cancelled="cleanupTransition"
    >
      <div
        v-if="bodyMode === 'show' || expanded"
        v-show="expanded"
        :id="bodyId || undefined"
        class="acu-disclosure-group__body"
        :class="bodyClass"
        :style="bodyStyle"
        :aria-hidden="!expanded ? 'true' : undefined"
        :inert="!expanded ? true : undefined"
      >
        <slot></slot>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(defineProps<{
  label?: string;
  meta?: string;
  expanded: boolean;
  bodyId?: string;
  bodyMode?: 'if' | 'show';
  bodyMaxHeight?: string;
  rootClass?: string;
  headerClass?: string;
  bodyClass?: string;
  chevronClass?: string;
  chevronOpenClass?: string;
  labelClass?: string;
  metaClass?: string;
}>(), {
  label: '',
  meta: '',
  bodyId: '',
  bodyMode: 'show',
  bodyMaxHeight: '',
  rootClass: '',
  headerClass: '',
  bodyClass: '',
  chevronClass: '',
  chevronOpenClass: '',
  labelClass: '',
  metaClass: '',
});

defineEmits<{
  (e: 'toggle'): void;
}>();

const bodyStyle = computed(() => ({
  maxHeight: props.bodyMaxHeight || undefined,
  overflowY: props.bodyMaxHeight ? 'auto' as const : 'hidden' as const,
}));

const DISCLOSURE_MIN_DURATION_MS = 100;
const DISCLOSURE_MAX_DURATION_MS = 200;
const DISCLOSURE_MS_PER_PIXEL = 0.45;

const transitionTimers = new WeakMap<HTMLElement, number>();

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function scheduleFrame(callback: () => void): void {
  if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
    window.requestAnimationFrame(callback);
    return;
  }
  window.setTimeout(callback, 16);
}

function clearTransitionTimer(el: HTMLElement): void {
  const timer = transitionTimers.get(el);
  if (timer !== undefined) {
    window.clearTimeout(timer);
    transitionTimers.delete(el);
  }
}

function restoreOverflow(el: HTMLElement): void {
  el.style.overflowY = props.bodyMaxHeight ? 'auto' : 'hidden';
  el.style.overflowX = 'hidden';
}

function cleanupTransition(el: Element): void {
  const body = el as HTMLElement;
  clearTransitionTimer(body);
  body.style.transition = '';
  body.style.height = '';
  body.style.opacity = '';
  body.style.transform = '';
  body.style.willChange = '';
  restoreOverflow(body);
}

function getBorderHeight(el: HTMLElement): number {
  const style = window.getComputedStyle(el);
  return (parseFloat(style.borderTopWidth) || 0) + (parseFloat(style.borderBottomWidth) || 0);
}

function getExpandedHeight(el: HTMLElement): number {
  const contentHeight = el.scrollHeight + getBorderHeight(el);
  const maxHeight = window.getComputedStyle(el).maxHeight;
  const parsedMax = Number.parseFloat(maxHeight);
  if (Number.isFinite(parsedMax) && parsedMax > 0) {
    return Math.min(contentHeight, parsedMax);
  }
  return contentHeight;
}

function durationForHeight(height: number): number {
  if (prefersReducedMotion()) return 1;
  return Math.min(
    DISCLOSURE_MAX_DURATION_MS,
    Math.max(DISCLOSURE_MIN_DURATION_MS, Math.round(height * DISCLOSURE_MS_PER_PIXEL)),
  );
}

function runHeightTransition(
  el: HTMLElement,
  targetHeight: number,
  direction: 'enter' | 'leave',
  done: () => void,
): void {
  clearTransitionTimer(el);
  const currentHeight = parseFloat(el.style.height) || el.getBoundingClientRect().height || getExpandedHeight(el);
  const duration = durationForHeight(direction === 'enter' ? targetHeight : currentHeight);
  const easing = direction === 'enter' ? 'ease-out' : 'ease-in';

  if (prefersReducedMotion()) {
    el.style.height = direction === 'enter' ? `${targetHeight}px` : '0px';
    el.style.opacity = direction === 'enter' ? '1' : '0';
    done();
    return;
  }

  el.style.willChange = 'height, opacity, transform';
  el.style.transition = `height ${duration}ms ${easing}, opacity ${Math.min(duration, 120)}ms ${easing}, transform ${duration}ms ${easing}`;

  scheduleFrame(() => {
    el.style.height = `${targetHeight}px`;
    el.style.opacity = direction === 'enter' ? '1' : '0';
    el.style.transform = direction === 'enter' ? 'translateY(0)' : 'translateY(-2px)';
  });

  const finish = () => {
    clearTransitionTimer(el);
    el.removeEventListener('transitionend', onEnd);
    done();
  };
  const onEnd = (event: TransitionEvent) => {
    if (event.target === el && event.propertyName === 'height') finish();
  };

  el.addEventListener('transitionend', onEnd);
  transitionTimers.set(el, window.setTimeout(finish, duration + 60));
}

function beforeEnter(el: Element): void {
  const body = el as HTMLElement;
  clearTransitionTimer(body);
  body.style.height = '0px';
  body.style.opacity = '0';
  body.style.transform = 'translateY(-2px)';
  body.style.overflowY = 'hidden';
  body.style.overflowX = 'hidden';
}

function enter(el: Element, done: () => void): void {
  runHeightTransition(el as HTMLElement, getExpandedHeight(el as HTMLElement), 'enter', done);
}

function afterEnter(el: Element): void {
  const body = el as HTMLElement;
  body.removeAttribute('aria-hidden');
  body.removeAttribute('inert');
  cleanupTransition(el);
}

function beforeLeave(el: Element): void {
  const body = el as HTMLElement;
  clearTransitionTimer(body);
  body.style.height = `${body.getBoundingClientRect().height || getExpandedHeight(body)}px`;
  body.style.opacity = '1';
  body.style.transform = 'translateY(0)';
  body.style.overflowY = 'hidden';
  body.style.overflowX = 'hidden';
  body.setAttribute('aria-hidden', 'true');
  body.setAttribute('inert', '');
}

function leave(el: Element, done: () => void): void {
  runHeightTransition(el as HTMLElement, 0, 'leave', done);
}

function afterLeave(el: Element): void {
  cleanupTransition(el);
}
</script>

<style scoped>
.acu-disclosure-group {
  display: flex;
  flex-direction: column;
  gap: 0;
  overflow: hidden;
  border-radius: var(--acu-radius-md);
  background: transparent;
}

.acu-disclosure-group__header {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  min-height: 34px;
  appearance: none;
  border: 0;
  border-radius: 0;
  padding: 7px 10px;
  background: transparent;
  color: var(--acu-text-2);
  font: inherit;
  font-size: 12px;
  line-height: 1.35;
  text-align: left;
  cursor: pointer;
  user-select: none;
  transition: background-color 0.15s ease, box-shadow 0.15s ease;
}

.acu-disclosure-group__header:hover {
  background: var(--acu-hover-overlay);
}

.acu-disclosure-group__header:focus-visible {
  outline: none;
  box-shadow: inset 0 0 0 2px var(--acu-accent-glow);
}

.acu-disclosure-group__chevron {
  flex: 0 0 10px;
  width: 10px;
  font-size: 10px;
  color: var(--acu-text-3);
  transition: transform 0.15s ease;
}

.acu-disclosure-group__chevron--open {
  transform: rotate(90deg);
}

.acu-disclosure-group__label {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 500;
  color: var(--acu-text-2);
}

.acu-disclosure-group__meta {
  flex-shrink: 0;
  font-size: 11px;
  color: var(--acu-text-3);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.acu-disclosure-group__body {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 6px;
  border-top: 1px solid color-mix(in srgb, var(--acu-text-3) 18%, transparent);
  padding: 8px;
  opacity: 1;
  transform: translateY(0);
  overflow-x: hidden;
}
</style>
