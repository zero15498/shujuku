/**
 * builtin-themes — 内置主题色值（搬运自旧 theme/builtins/*.ts，D14）
 *
 * 仅保留 v2 稳定主题契约；丢弃旧的兼容变量、子模块变量、customCSS、
 * windowChromeVariables 等。
 */
import type { AcuV2Theme } from "./theme-types";

export const THEME_DEFAULT_LIGHT: AcuV2Theme = {
  id: "default-light",
  name: "浅色管理台",
  colorScheme: "light",
  tokens: {
    bg0: "#f8f5ee",
    bg1: "#fbfaf6",
    bg2: "#ebe9e3",
    sidebarBg: "#f5f2eb",
    hoverOverlay: "rgba(17, 17, 15, 0.07)",
    border: "rgba(23, 23, 20, 0.06)",
    border2: "rgba(23, 23, 20, 0.10)",
    text1: "#11110f",
    text2: "#46443d",
    text3: "#77736a",
    accent: "#11110f",
    accent2: "#2d2b26",
    onAccent: "#fbfaf7",
    accentGlow: "rgba(17, 17, 15, 0.14)",
    success: "#4d6b56",
    warning: "#836434",
    danger: "#95514b",
    fontUi: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    fontMono: 'Consolas, Menlo, Monaco, "Courier New", monospace',
    radiusLg: "6px",
    radiusMd: "6px",
    radiusSm: "6px",
    shadow: "0 12px 32px rgba(23, 23, 20, 0.12)",
  },
};

export const THEME_DEFAULT_DARK: AcuV2Theme = {
  id: "default-dark",
  name: "深色管理台",
  colorScheme: "dark",
  tokens: {
    bg0: "#10110f",
    bg1: "#171814",
    bg2: "#24251f",
    sidebarBg: "#171814",
    hoverOverlay: "rgba(244, 240, 232, 0.07)",
    border: "rgba(245, 241, 232, 0.06)",
    border2: "rgba(245, 241, 232, 0.10)",
    text1: "#f4f0e8",
    text2: "#c6c1b8",
    text3: "#858077",
    accent: "#D97757",
    accent2: "#C96B4A",
    onAccent: "#10110f",
    accentGlow: "rgba(217, 119, 87, 0.22)",
    success: "#86a08b",
    warning: "#b99a67",
    danger: "#c07b72",
    fontUi: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    fontMono: 'Consolas, Menlo, Monaco, "Courier New", monospace',
    radiusLg: "6px",
    radiusMd: "6px",
    radiusSm: "6px",
    shadow: "0 18px 48px rgba(0, 0, 0, 0.42)",
  },
};

export const THEME_STRAWBERRY_DRAGON: AcuV2Theme = {
  id: "strawberry-dragon",
  name: "草莓奶龙",
  colorScheme: "light",
  tokens: {
    bg0: "#FAEEF1",
    bg1: "#FFFCFC",
    bg2: "#F9E7EB",
    sidebarBg: "#FAECEF",
    hoverOverlay: "rgba(207, 157, 168, 0.22)",
    border: "rgba(120, 104, 94, 0.08)",
    border2: "rgba(120, 104, 94, 0.14)",
    text1: "#6F5F56",
    text2: "#7C6B61",
    text3: "#948277",
    accent: "#6F5F56",
    accent2: "#7C6B61",
    onAccent: "#FFF7F8",
    accentGlow: "rgba(111, 95, 86, 0.16)",
    success: "#8FB9A8",
    warning: "#E3B587",
    danger: "#D98A94",
    fontUi: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    fontMono: 'Consolas, Menlo, Monaco, "Courier New", monospace',
    radiusLg: "6px",
    radiusMd: "6px",
    radiusSm: "6px",
    shadow: "0 4px 18px rgba(127, 104, 96, 0.12)",
  },
};

export const ACU_V2_BUILTIN_THEMES: readonly AcuV2Theme[] = [
  THEME_DEFAULT_LIGHT,
  THEME_DEFAULT_DARK,
  THEME_STRAWBERRY_DRAGON,
];

export const ACU_V2_DEFAULT_THEME_ID = THEME_DEFAULT_DARK.id;
