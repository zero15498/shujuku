<template>
  <section
    class="acu-dashboard-storage-mode"
    :aria-label="dashboardCopy.storage.sectionLabel"
  >
    <div class="acu-dashboard-storage-mode__head">
      <span class="acu-dashboard-storage-mode__label">{{
        dashboardCopy.storage.sectionLabel
      }}</span>
      <div
        class="acu-dashboard-storage-mode__switch"
        role="radiogroup"
        :aria-label="dashboardCopy.storage.sectionLabel"
        :style="switchStyle"
      >
        <span
          class="acu-dashboard-storage-mode__switch-thumb"
          aria-hidden="true"
        />
        <button
          v-for="option in switchOptions"
          :key="option.value"
          type="button"
          class="acu-dashboard-storage-mode__switch-item"
          :class="{
            'acu-dashboard-storage-mode__switch-item--active':
              option.value === modelValue,
          }"
          role="radio"
          :aria-checked="option.value === modelValue"
          @click="select(option.value)"
          @keydown.left.prevent="move(-1)"
          @keydown.up.prevent="move(-1)"
          @keydown.right.prevent="move(1)"
          @keydown.down.prevent="move(1)"
        >
          {{ option.switchLabel }}
        </button>
      </div>
    </div>
    <p class="acu-dashboard-storage-mode__desc-main">
      {{ dashboardCopy.storage.description }}
    </p>

    <div class="acu-dashboard-storage-mode__cards">
      <article
        v-for="option in decoratedOptions"
        :key="option.value"
        class="acu-dashboard-storage-mode__card"
        :class="{
          'acu-dashboard-storage-mode__card--active':
            option.value === modelValue,
        }"
      >
        <span class="acu-dashboard-storage-mode__icon" aria-hidden="true">
          <i :class="option.iconClass"></i>
        </span>
        <span class="acu-dashboard-storage-mode__body">
          <span class="acu-dashboard-storage-mode__card-head">
            <span class="acu-dashboard-storage-mode__name">{{
              option.label
            }}</span>
            <span class="acu-dashboard-storage-mode__badge">{{
              option.badge
            }}</span>
          </span>
          <span class="acu-dashboard-storage-mode__desc">{{
            option.description
          }}</span>
        </span>
      </article>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { DashboardStorageOption } from "../composables/useDashboardPage";
import { dashboardCopy } from "../copy/dashboard-copy";

const props = defineProps<{
  options: DashboardStorageOption[];
  modelValue: string;
}>();

const emit = defineEmits<{
  (e: "update:modelValue", value: string): void;
}>();

const activeIndex = computed(() => {
  const index = props.options.findIndex(
    (option) => option.value === props.modelValue,
  );
  return Math.max(0, index);
});

const switchStyle = computed(() => ({
  "--storage-mode-count": String(Math.max(1, props.options.length)),
  "--storage-mode-index": String(activeIndex.value),
}));

const switchOptions = computed(() =>
  props.options.map((option) => ({
    ...option,
    switchLabel: dashboardCopy.storage.switchLabel(option.value),
  })),
);

const decoratedOptions = computed(() =>
  props.options.map((option) => ({
    ...option,
    iconClass:
      option.value === "sqlite"
        ? "fa-solid fa-database"
        : "fa-regular fa-file-lines",
    badge: dashboardCopy.storage.badge(option.value),
  })),
);

function select(value: string): void {
  if (value === props.modelValue) return;
  emit("update:modelValue", value);
}

function move(delta: number): void {
  if (!props.options.length) return;
  const nextIndex =
    (activeIndex.value + delta + props.options.length) % props.options.length;
  emit("update:modelValue", props.options[nextIndex].value);
}
</script>

<style scoped>
.acu-dashboard-storage-mode {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.acu-dashboard-storage-mode__head {
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.acu-dashboard-storage-mode__label {
  min-width: 0;
  color: var(--acu-text-1);
  font-size: var(--acu-font-size-body-lg, 13px);
  font-weight: 500;
}

.acu-dashboard-storage-mode__desc-main {
  margin: 0;
  color: var(--acu-text-3);
  font-size: var(--acu-font-size-caption, 11px);
  line-height: 1.5;
}

.acu-dashboard-storage-mode__switch {
  position: relative;
  flex: 0 0 auto;
  width: 92px;
  display: grid;
  grid-template-columns: repeat(var(--storage-mode-count), minmax(0, 1fr));
  padding: 2px;
  border-radius: var(--acu-radius-sm);
  background: var(--acu-bg-2);
  overflow: hidden;
}

.acu-dashboard-storage-mode__switch-thumb {
  position: absolute;
  inset: 2px auto 2px 2px;
  width: calc((100% - 4px) / var(--storage-mode-count));
  border-radius: calc(var(--acu-radius-sm) - 2px);
  background: var(--acu-accent);
  transform: translateX(calc(var(--storage-mode-index) * 100%));
  transition: transform 0.16s ease;
  pointer-events: none;
}

.acu-dashboard-storage-mode__switch-item {
  position: relative;
  z-index: 1;
  min-width: 0;
  min-height: 20px;
  margin: 0;
  padding: 0 4px;
  border: 0;
  border-radius: calc(var(--acu-radius-sm) - 2px);
  background: transparent;
  color: var(--acu-text-2);
  font: inherit;
  font-size: var(--acu-font-size-micro, 10px);
  cursor: pointer;
  transition:
    background 0.15s ease,
    color 0.15s ease;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.acu-dashboard-storage-mode__switch-item:hover:not(
    .acu-dashboard-storage-mode__switch-item--active
  ) {
  background: var(--acu-hover-overlay);
  color: var(--acu-text-1);
}

.acu-dashboard-storage-mode__switch-item--active {
  color: var(--acu-on-accent);
}

.acu-dashboard-storage-mode__switch-item:focus-visible {
  outline: none;
  box-shadow: inset 0 0 0 2px var(--acu-accent-glow);
}

.acu-dashboard-storage-mode__cards {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 4px;
}

.acu-dashboard-storage-mode__card {
  position: relative;
  min-width: 0;
  padding: 5px 0 5px 8px;
  border: 0;
  border-radius: var(--acu-radius-sm);
  background: transparent;
  display: grid;
  grid-template-columns: 26px minmax(0, 1fr);
  gap: 8px;
  align-items: start;
  transition: background 0.15s ease;
}

.acu-dashboard-storage-mode__card--active {
  background: color-mix(in srgb, var(--acu-accent) 6%, transparent);
}

.acu-dashboard-storage-mode__card--active::before {
  content: "";
  position: absolute;
  top: 6px;
  bottom: 6px;
  left: 0;
  width: 2px;
  border-radius: 999px;
  background: var(--acu-accent);
}

.acu-dashboard-storage-mode__icon {
  width: 26px;
  height: 26px;
  border-radius: var(--acu-radius-sm);
  background: transparent;
  color: var(--acu-text-3);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
}

.acu-dashboard-storage-mode__card--active .acu-dashboard-storage-mode__icon {
  color: var(--acu-accent);
  background: transparent;
}

.acu-dashboard-storage-mode__body {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.acu-dashboard-storage-mode__card-head {
  min-width: 0;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
}

.acu-dashboard-storage-mode__name {
  min-width: 0;
  color: var(--acu-text-1);
  font-size: var(--acu-font-size-body, 12px);
  font-weight: 600;
  line-height: 1.25;
}

.acu-dashboard-storage-mode__badge {
  display: inline-flex;
  align-items: center;
  min-height: 18px;
  padding: 1px 6px;
  border-radius: var(--acu-radius-sm);
  background: color-mix(in srgb, var(--acu-text-3) 16%, transparent);
  color: var(--acu-text-2);
  font-size: var(--acu-font-size-micro, 10px);
  line-height: 1.2;
  white-space: nowrap;
}

.acu-dashboard-storage-mode__card--active .acu-dashboard-storage-mode__badge {
  background: color-mix(in srgb, var(--acu-accent) 16%, transparent);
  color: var(--acu-accent);
}

.acu-dashboard-storage-mode__desc {
  color: var(--acu-text-3);
  font-size: var(--acu-font-size-caption, 11px);
  line-height: 1.5;
}

@media (max-width: 640px) {
  .acu-dashboard-storage-mode__head {
    align-items: flex-start;
  }

  .acu-dashboard-storage-mode__switch {
    width: 88px;
  }

  .acu-dashboard-storage-mode__card {
    grid-template-columns: minmax(0, 1fr);
  }

  .acu-dashboard-storage-mode__icon {
    display: none;
  }
}
</style>
