/**
 * theme-injector — 把 theme tokens 翻成 CSS 文本注入 host document（D14）
 *
 * - 单一 <style id="acu-v2-theme">；切主题 = 替换 textContent，不增删节点
 * - 作用域 #acu-app-v2，与旧主题节点物理隔离
 * - 同时把 colorScheme 写到根容器的 style.colorScheme，让浏览器原生表单跟随
 */
import type { AcuV2Theme } from './theme-types';
import { TOKEN_VAR_MAP } from './theme-types';
import { getAcuHostDocument } from '../bootstrap/host-document';

export const THEME_STYLE_NODE_ID = 'acu-v2-theme';
export const APP_ROOT_ID = 'acu-app-v2';

function buildCss(theme: AcuV2Theme): string {
  const lines: string[] = [];
  const keys = Object.keys(TOKEN_VAR_MAP) as Array<keyof typeof TOKEN_VAR_MAP>;
  for (const key of keys) {
    lines.push(`  ${TOKEN_VAR_MAP[key]}: ${theme.tokens[key]};`);
  }
  // CSS custom properties inherit from the app root. Avoid a universal
  // descendant selector here; it expands style recalculation on every UI
  // state change and is especially expensive on mobile WebViews.
  return `#${APP_ROOT_ID} {\n${lines.join('\n')}\n}\n`;
}

export function applyTheme(theme: AcuV2Theme): void {
  const doc = getAcuHostDocument();
  let style = doc.getElementById(THEME_STYLE_NODE_ID) as HTMLStyleElement | null;
  if (!style) {
    style = doc.createElement('style');
    style.id = THEME_STYLE_NODE_ID;
    doc.head.appendChild(style);
  }
  style.textContent = buildCss(theme);

  const root = doc.getElementById(APP_ROOT_ID);
  if (root) {
    root.style.colorScheme = theme.colorScheme;
  }
}

/** 仅供测试：清掉注入的样式节点。 */
export function __resetThemeInjectorForTests(): void {
  const doc = getAcuHostDocument();
  doc.getElementById(THEME_STYLE_NODE_ID)?.remove();
}
