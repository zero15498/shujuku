# 阶段 0：基础设施

> 模板见 [../03-record-template.md](../03-record-template.md)。阶段 1 API 页记录合并于本阶段；本文件只记录阶段 0 基础设施的设计与落地。

## 范围

- 阶段编号：0
- 与 charter 的关联：落地 [charter §5](../00-charter.md) 入口与挂载、[charter §3 D14/D16/D18](../00-charter.md) 主题 / 构建 / 一级页路由基础
- 本阶段包含：Vue 3 / Pinia / unplugin-vue 正式构建链、host document 挂载、菜单入口、主题 store、路由 store、12 个占位页、`useHelloService()` 调用链验证
- 本阶段不包含：真实业务页面迁移、组件库强制抽取、D17 / D21.2 check-arch 守护、下线旧 UI

## 决议

### P0-1. 入口按钮（2026-05-02）

- **背景**：阶段 -1 发现酒馆助手 iframe 场景下只操作当前 `document` 会出现 console 正常但页面无内容。
- **决定**：入口按钮注册到 host document 的 `#extensionsMenu` 内，与旧按钮同级；icon 为 `fa-solid fa-flask`，文案为"打开新 UI（开发）"。
- **理由**：入口必须出现在用户实际可见的 SillyTavern 主界面，而不是脚本执行 iframe。
- **退出条件**：真实 host document 内存在新 UI 菜单按钮，点击后打开 `#acu-app-v2`。

### P0-2. z-index 分层（2026-05-02）

- **背景**：新 UI 必须覆盖主界面，但不能压过旧 toast / confirm 等全局反馈。
- **决定**：`#acu-app-v2` 使用 `9000`；抽屉 / 遮罩预留 `9100~9300`；旧 toast / confirm 保持更高层级。
- **理由**：避免新旧 UI 过渡期层级互相抢占。
- **退出条件**：主弹窗可覆盖页面主体，旧全局反馈仍可见。

### P0-3. page registry 契约（2026-05-02）

- **背景**：UI v2 需要稳定的一站式一级页注册表，后续页面按分组与可见性逐步打开。
- **决定**：`Page` 字段为 `id / title / group / component / visibleWhen? / requiresSqlite? / featureGate?`。
- **理由**：让 sidebar、默认页、运行时可见性和未来 gate 都从同一注册表派生。
- **退出条件**：12 个占位页注册到 registry，sidebar 可按分组渲染。

### P0-4. v2 自有持久化键（2026-05-02）

- **背景**：v2 UI 状态不应污染旧 `settings_ACU`，否则下线旧 UI 前会出现状态耦合。
- **决定**：根 key 使用 `acu_v2_ui_state`，本阶段包含 `theme` 与 `router` section。
- **理由**：UI 壳状态与业务 settings 物理隔离，后续可独立迁移或清理。
- **退出条件**：主题与当前路由可关闭重开后恢复，不写入旧 settings。

### P0-5. hello-service 调用边界（2026-05-02）

- **背景**：D17 要求 Vue 组件不直接 import service / 单例状态，需要在基础设施阶段先验证中间层模式。
- **决定**：read-only `getCurrentIsolationKey_ACU()` 由 `useHelloService()` composable 间接调用。
- **理由**：用低风险只读 service 建立组件 -> composable -> service 的调用样板。
- **退出条件**：占位页能通过 composable 渲染 service 结果，`.vue` 无 service 直连。

### P0-6. 关闭 / 重开语义（2026-05-02）

- **背景**：新 UI 是长期驻留工具，关闭后不应丢失路由与 store 状态。
- **决定**：关闭时隐藏根节点但不 unmount，保留 Pinia 状态；重开保留路由状态并重置主区滚动；抽屉状态由后续各抽屉 store 在关闭信号下自行清理。
- **理由**：兼顾用户返回上下文和关闭后再次打开的视觉起点。
- **退出条件**：关闭重开不丢失当前页，主区滚动回到顶部。

### P0-6R. 关闭 / 重开语义修订（2026-05-08）

- **背景**：真实使用发现"关闭后重开只恢复整个 Vue 组件状态"会保留页面缓存，导致 settings、世界书列表、当前聊天数据等外部状态不刷新；切换功能页才会刷新。
- **决定**：根 Vue app 与 Pinia 仍保留，避免主题 / 路由 / 全局 store 丢失；当前活动页面组件在 UI 重开时由 `MainArea` remount。页面临时 `ref` 不跨重开保留，用户明确编辑过且需要保留的草稿必须进入 store / settings / draft store。
- **理由**：重开 UI 应表现为"回到同一页面并重新读取外部状态"，而不是"恢复整页缓存快照"。这让新增页面只要把读取逻辑放在 `onMounted()` 就天然获得重开刷新。
- **退出条件**：关闭重开保留当前路由，当前页面重新执行 mount 刷新链，主区滚动回到顶部。

## 影响文件清单

| 类别 | 路径 | 说明 |
|---|---|---|
| 构建 | [rollup.config.js](../../../rollup.config.js) / [rollup.plus-assistantembedded.config.js](../../../rollup.plus-assistantembedded.config.js) | Vue SFC、Pinia、feature flags、三产物出包 |
| 入口 | [entry-extension.ts](../../../src/entry-extension.ts) / [index.ts](../../../src/index.ts) | v2 打开入口接入 |
| bootstrap | [mount.ts](../../../src/presentation-v2/bootstrap/mount.ts) | host document 挂载、打开 / 关闭 / 重开 |
| build runtime | [sfc-style-runtime.ts](../../../src/presentation-v2/build/sfc-style-runtime.ts) | SFC 样式注入到 host document |
| store | [theme-store.ts](../../../src/presentation-v2/stores/theme-store.ts) / [router-store.ts](../../../src/presentation-v2/stores/router-store.ts) / [root-shell-store.ts](../../../src/presentation-v2/stores/root-shell-store.ts) / [persistence.ts](../../../src/presentation-v2/stores/persistence.ts) | 主题、路由、根壳状态、v2 持久化 |
| composable | [useHelloService.ts](../../../src/presentation-v2/composables/useHelloService.ts) | D17 中间层验证 |
| 页面 | `src/presentation-v2/pages/*Page.vue` | 12 个一级页占位 |
| 路由 | [page-registry.ts](../../../src/presentation-v2/router/page-registry.ts) / [page-types.ts](../../../src/presentation-v2/router/page-types.ts) | 一级页注册与类型 |

## 退出条件

- [x] Vue 3 / Pinia / unplugin-vue 正式构建链可出三产物。
- [x] host document `#extensionsMenu` 内存在开发入口。
- [x] `#acu-app-v2` 能挂载并覆盖主界面。
- [x] 主题 token、4 个内置主题、持久化与样式注入完成。
- [x] 路由 store、sidebar 分组、12 个占位页、可见性控制完成。
- [x] `useHelloService()` 验证 D17 中间层调用模式。
- [x] 关闭 / 重开保留路由状态并重置主区滚动。

---

## 落地记录（2026-05-02）

- **结论**：批次 A-E 全部完成。Vue/Pinia 构建链、host document 挂载、主题 store、路由 store、12 个占位页、hello-service 调用链均已落地。

### 产物清单

| 类别 | 路径 |
|---|---|
| 构建 | [rollup.config.js](../../../rollup.config.js) / [rollup.plus-assistantembedded.config.js](../../../rollup.plus-assistantembedded.config.js) |
| bootstrap | [mount.ts](../../../src/presentation-v2/bootstrap/mount.ts) / [sfc-style-runtime.ts](../../../src/presentation-v2/build/sfc-style-runtime.ts) |
| store | [theme-store.ts](../../../src/presentation-v2/stores/theme-store.ts) / [router-store.ts](../../../src/presentation-v2/stores/router-store.ts) / [root-shell-store.ts](../../../src/presentation-v2/stores/root-shell-store.ts) / [persistence.ts](../../../src/presentation-v2/stores/persistence.ts) |
| composable | [useHelloService.ts](../../../src/presentation-v2/composables/useHelloService.ts) |
| 页面 | 12 个 `src/presentation-v2/pages/*Page.vue` 占位页 |
| 路由 | [page-registry.ts](../../../src/presentation-v2/router/page-registry.ts) / [page-types.ts](../../../src/presentation-v2/router/page-types.ts) |

### 批次验收

| 批次 | 内容 | 状态 |
|---|---|---|
| A | Vue 3 / Pinia / unplugin-vue 构建链，SFC 样式注入器，feature flags | 已完成 |
| B | 入口骨架，host document helper，菜单按钮，`#acu-app-v2` 挂载 | 已完成 |
| C | 新主题 token、4 个内置主题、持久化、`<style>` 注入 | 已完成 |
| D | 路由 store、4 分组 sidebar、12 占位页、可见性控制、关闭重开 | 已完成 |
| E | `useHelloService()` 验证 D17 中间层模式 | 已完成 |

### 测试覆盖

- 文件数：4
- 用例数：27
- 状态：全绿
- 覆盖文件：`mount.test.ts` / `theme-store.test.ts` / `router-store.test.ts` / `useHelloService.test.ts`

### 验证

- [x] typecheck
- [x] check-arch（8 条既有违规，作为阶段 0 基线；`.vue` 无 service 直连）
- [x] 油猴构建
- [x] 扩展构建
- [x] plus 构建

### 退出条件核对

| 条件 | 状态 |
|---|---|
| 正式构建链可出三产物 | 通过 |
| host document 菜单入口 | 通过 |
| `#acu-app-v2` 挂载 | 通过 |
| 主题 store 与样式注入 | 通过 |
| 路由 store、sidebar、12 个占位页 | 通过 |
| `useHelloService()` 调用链 | 通过 |
| 关闭 / 重开语义 | 通过 |
| 体积低于 X-1 30% 警戒线 | 通过 |

### 体积变化（vs spike 基线）

| 产物 | raw | Δ raw | gzip | Δ gzip |
|---|---:|---:|---:|---:|
| 油猴 | 4,648,180 | +15.15% | 1,113,834 | +13.51% |
| 扩展 | 4,407,971 | +14.08% | 1,103,366 | +13.31% |
| plus | 4,408,174 | +14.08% | 1,103,480 | +13.30% |

### 已知缺口

- 增量低于 X-1 30% 警戒线但高于 D16 早期约 40KB 估算；继续纳入 [metrics.md](../metrics.md) 每阶段监控。
- 阶段 1 API 页记录合并于本阶段，未单独拆出 stage 文件；后续阶段 2 已把 ApiPage 改造记录写入 [stage-2-import-page.md](stage-2-import-page.md)。
