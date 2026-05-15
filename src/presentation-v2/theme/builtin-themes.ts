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
    bg0: "#1F2428",
    bg1: "#24292E",
    bg2: "#2D343B",
    sidebarBg: "#1F2428",
    hoverOverlay: "rgba(201, 209, 217, 0.08)",
    border: "rgba(205, 217, 229, 0.08)",
    border2: "rgba(205, 217, 229, 0.14)",
    text1: "#F0F3F6",
    text2: "#C9D1D9",
    text3: "#8B949E",
    accent: "#7FD6CA",
    accent2: "#69C7BC",
    onAccent: "#1F2428",
    accentGlow: "rgba(127, 214, 202, 0.26)",
    success: "#8DBA9A",
    warning: "#C9A35E",
    danger: "#D07A74",
    fontUi: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    fontMono: 'Consolas, Menlo, Monaco, "Courier New", monospace',
    radiusLg: "6px",
    radiusMd: "6px",
    radiusSm: "6px",
    shadow: "0 18px 48px rgba(1, 4, 9, 0.36)",
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
