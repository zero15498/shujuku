/**
 * presentation-v2/bootstrap — 新 UI 启动入口
 *
 * 由 src/index.ts / src/entry-extension.ts / src/entry-extension-plus-assistantembedded.ts
 * 在旧 UI 启动之后调用。
 *
 * 阶段 0 职责：注册"打开新 UI（开发）"菜单按钮；点击时惰性挂载 Vue 应用。
 */
import { registerAcuV2MenuButton } from './menu-button';

export { openAcuV2App, closeAcuV2App } from './mount';

export function bootstrapAcuV2(): void {
  registerAcuV2MenuButton();
}
