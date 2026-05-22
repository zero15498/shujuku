# UI v2 Toast 收敛与全局路由方案（暂停）

> 日期：2026-05-21
> 状态：历史方案 / 暂停。2026-05-21 已回滚对应试做实现；后续需求已收窄为 [04-toast-notification-plan.md](04-toast-notification-plan.md) 的 v2 主界面内 toast。本方案中的“常驻 Vue toast layer”“`showToastr_ACU` 全局路由器”“主界面关闭时仍显示新 toast”当前不再执行。
> 范围：记录一次失败试做后的全局路由备选与反例；不作为当前实现依据。
> 与现有文档的关系：
> - [04-toast-notification-plan.md](04-toast-notification-plan.md) 定义当前有效的 v2 面板内 toast 产品语义和表层要求。
> - [06-popup-migration-matrix.md](06-popup-migration-matrix.md) 记录旧弹窗调用点和迁移债务。
> - [07-architecture.md](07-architecture.md) 是删除旧 UI 后的长期分层目标；若未来重新处理旧 runtime 全局反馈，应优先回到 07 的 feedback port / runtime 分层，而不是直接恢复本文的短期全局路由。

> 重要：当前开发应以 04 为准。除非重新做产品确认，不要按本文新增 `toast-layer.ts`、不要改造 `showToastr_ACU` 为 Vue 路由器、不要让新 toast 在 v2 主界面关闭时工作。

以下正文保留历史设计内容，便于复盘失败方向和未来重新评估；其中的目标、步骤和验收标准不代表当前阶段计划。

---

## 1. 背景

当前新 toast 的实现方向有偏差：它以“替代旧 toast”为目标推进，导致一段时间内允许新旧 toast 同时存在。这个方向会带来两个问题：

- 自动填表、剧情推进、交火召回、正文替换等运行时流程仍然通过旧 `showToastr_ACU` 触发；这些流程不依赖数据库 UI 是否打开。
- 如果 v2 页面自己弹新 toast，而运行时继续弹旧 toast，就很容易出现同一次操作双弹。

新的阶段目标不是“立刻删除旧 toast”，而是：

- **所有时刻只弹一个 toast**；
- **只要不是必须保留旧 UI 内部体验，就优先显示新 Vue toast 样式**；
- **数据库 UI 没打开时，运行时自动触发流程也显示新 Vue toast**；
- **旧 `showToastr_ACU` 调用点暂时不大规模迁移**。

因此，新 toast 不应依赖“v2 主界面是否打开”。它应作为一个常驻全局反馈层存在。

---

## 2. 当前旧 toast 的职责拆分

旧入口位于：

- `src/presentation/theme/toast.ts`
- 导出函数：`showToastr_ACU(type, message, titleOrOptions, maybeOptions)`

它现在混合了三类职责：

| 职责 | 是否应该保留 | 后续位置 |
|---|---|---|
| 通知策略：默认时长、静默规则、分类、去重 | 保留 | 提取到 UI 中立 policy |
| 旧渲染：宿主 `toastr_API_ACU`、`#toast-container`、注入 CSS | 保留为 fallback | `presentation/theme/toast.ts` 内部 |
| 旧交互技巧：HTML 字符串、jQuery `.find()`、DOM clear、终止按钮 | 只做兼容，不扩大 | 长任务兼容层逐步替换 |

关键判断：

- 旧 toast 的“策略”值得复用。
- 旧 toast 的“渲染实现”不应成为新 UI 的依赖。
- Vue toast 应成为默认渲染器；旧 toastr 只作为失败兜底和旧环境 fallback。

---

## 3. 目标与非目标

### 3.1 目标

- 保留旧 `showToastr_ACU(...)` 作为全局 toast 入口，避免一次性修改几百个调用点。
- 新增常驻 Vue toast layer：即使 v2 主界面关闭，也能显示新样式 toast。
- `showToastr_ACU(...)` 默认优先路由到 Vue toast；Vue toast 不可用时才 fallback 到旧 toastr。
- 同一次 toast 调用只进入一个渲染器，避免双弹。
- v2 页面继续通过 v2 toast store 发 toast，不直接 import `src/presentation/**`。
- 提取静默、去重、默认时长、分类等策略，供旧入口和 v2 store 共享。

### 3.2 非目标

- 不在本阶段实现 [07-architecture.md](07-architecture.md) 的完整 `application/feedback`、`runtime/`、use-case 分层。
- 不在本阶段删除旧 UI。
- 不在本阶段全量替换旧 `showToastr_ACU` 调用点。
- 不把旧 HTML toast 约定扩展成 Vue 的正式 API。
- 不在本阶段迁移 confirm / prompt / visualizer / 旧 window system。

---

## 4. 目标结构

短期结构：

```text
旧 runtime / 旧 UI / 旧触发器
  └── showToastr_ACU(...)
        ├── toast policy：归一化、静默、去重、默认时长
        ├── Vue toast layer 可用 → Vue toast store / viewport
        └── Vue toast layer 不可用 → 旧 toastr fallback

v2 页面 / v2 composable / v2 store
  └── useToastStore()
        └── 同一套 toast policy
```

常驻层与主界面的关系：

```text
SillyTavern 页面
  ├── v2 toast layer：独立 Vue app / 独立轻量根，脚本初始化后可惰性挂载，常驻，只负责 toast
  └── v2 main app：数据库 UI 主界面，独立 Vue app / 独立根，可打开 / 关闭
```

重要区别：

- **v2 toast layer** 不等于数据库主界面。
- 数据库 UI 关闭时，toast layer 仍可工作。
- 自动填表、剧情推进、交火召回等后台流程不需要先打开数据库 UI。
- toast layer 不应通过挂载完整 `App.vue` 来获得 `AcuToastViewport`。完整主界面包含路由、Sidebar、主题菜单、聊天变化监听、关闭保护等副作用；全局 toast 只需要 Pinia、主题 token、SFC style host 与 `AcuToastViewport`。
- toast layer 与 main app 可以共享底层初始化 helper（host document、SFC style host、theme apply、Pinia 创建），但不能共享“打开主界面”的生命周期语义。

### 4.1 目标文件结构与边界

为避免后续彻底替代旧 toast 时再次大范围重构，当前阶段按下面结构收敛：

```text
src/shared/feedback/
  toast-policy.ts              UI 中立策略：静默、去重、默认时长、分类映射

src/presentation-v2/stores/
  toast-store.ts               Vue toast 状态容器：items、notify、update、dismiss、clear

src/presentation-v2/bootstrap/
  toast-layer.ts               常驻 toast layer：独立轻量 Vue 根，主 UI 没打开也能挂载和通知
  mount.ts                     主 UI 挂载；复用 bootstrap helper，但不承载 toast layer 生命周期
  bootstrap-host.ts            可选：host document / SFC style host / theme / Pinia 的共享初始化 helper

src/presentation-v2/components/_lib/
  AcuToastViewport.vue         纯渲染：只根据 store 渲染列表

src/presentation/theme/
  toast.ts                     过渡期旧入口路由器：优先 Vue toast，失败 fallback 旧 toastr
```

各文件边界：

| 文件 | 可以做 | 禁止做 |
|---|---|---|
| `shared/feedback/toast-policy.ts` | 归一化请求、默认时长、静默判断、分类映射、去重 key | import Vue、DOM、`presentation/**`、`toastr_API_ACU`、`settings_ACU` |
| `presentation-v2/stores/toast-store.ts` | 管理 Vue toast 队列、定时器、更新、关闭、action 数据 | 处理旧 toastr fallback、判断旧 UI 来源、import `presentation/**` |
| `presentation-v2/bootstrap/toast-layer.ts` | 惰性挂载全局 toast layer，暴露 notify / update / dismiss；可复用 host / style / theme helper | 挂载完整 `App.vue`、打开数据库主界面、依赖 `rootShellStore.isOpen === true` 才工作 |
| `presentation-v2/components/_lib/AcuToastViewport.vue` | 渲染 toast、动画、响应式布局、action 按钮 | 解析旧 HTML 字符串、绑定 jQuery 事件、知道 toast 来源 |
| `presentation/theme/toast.ts` | 兼容旧 `showToastr_ACU` 参数，执行 policy，路由到 Vue 或旧 toastr | 成为 v2 页面直接 import 的依赖 |

未来彻底替代旧 toast 时，预期主要删除或退化的是 `presentation/theme/toast.ts` 的 fallback 和旧入口兼容；`toast-policy`、`toast-store`、`toast-layer`、`AcuToastViewport` 应继续保留。

---

## 5. 关键设计决策

### 5.1 `showToastr_ACU` 变成路由器

`showToastr_ACU(...)` 不再只表示“旧 toastr 渲染”。它变成全局 toast 入口：

```text
showToastr_ACU(...)
  → normalizeToastRequest(...)
  → shouldShowToast(...)
  → dedup
  → tryShowVueToast(...)
  → fallbackToLegacyToastr(...)
```

路由规则：

| 条件 | 渲染器 |
|---|---|
| Vue toast layer 可挂载 / 已挂载 | Vue toast |
| Vue toast layer 挂载失败 | 旧 toastr |
| 宿主缺 toastr 且 Vue toast 失败 | 只写 debug log |

本阶段不要求识别“旧 UI 设置页内部”。旧 UI 内部弹新 toast 或旧 toast 都可接受；如果后续需要保留旧 UI 内部旧样式，再新增显式入口 `showLegacyToastr_ACU(...)`。

### 5.2 Vue toast layer 常驻但惰性挂载

新增或改造 v2 bootstrap 能力，提供不打开主界面的 toast 挂载入口：

```ts
notifyAcuV2Toast(kind, text, options)
updateAcuV2Toast(id, patch)
dismissAcuV2Toast(id)
```

语义：

- 如果 toast layer 尚未挂载，只挂载 toast 所需的轻量根。
- 轻量根只渲染 `AcuToastViewport`（或极薄的 `ToastLayerRoot.vue`），不渲染 `App.vue` / `MainArea` / `Sidebar`。
- 不调用 `rootShellStore.setOpen(true)`。
- 不显示数据库主界面。
- 只让 `AcuToastViewport` 可渲染。

现有 `notifyAcuV2ToastIfOpen(...)` 可保留给明确要求“仅 v2 打开时显示”的少数场景，但全局 toast 路由不应依赖它。

### 5.3 v2 store 是渲染状态容器

`toast-store` 应收敛为状态与定时器容器：

- `notify`
- `update`
- `dismiss`
- `clear`
- 自动消失
- 最大堆叠
- action 按钮

以下逻辑优先放到 shared policy：

- 默认 duration
- 静默规则
- 去重 key
- 旧 `acuToastCategory` 到新语义的映射
- 文本归一化

### 5.4 长任务 toast 使用兼容 handle 过渡

少量旧流程依赖 jQuery toast handle：

- `loadingToast.find(...)`
- `toastr_API_ACU.clear(loadingToast)`
- 手动 remove DOM
- HTML 中塞终止按钮

本阶段不要求一次性 Vue 化这些流程。先提供兼容 handle：

```ts
type AcuToastHandle =
  | { renderer: 'vue'; id: string | null }
  | { renderer: 'legacy'; element: JQuery<HTMLElement> | null };

function updateAcuToastHandle(handle: AcuToastHandle | JQuery<HTMLElement> | null, patch): boolean;
function clearAcuToastHandle(handle: AcuToastHandle | JQuery<HTMLElement> | null): void;
```

优先改造的长任务文件：

- `src/presentation/triggers/update-process.ts`
- `src/presentation/components/plot-planning-ui.ts`
- `src/presentation/components/summary-vector-index-ui.ts`
- `src/presentation/components/optimization-ui/*`

Vue 版任务 toast 的正式形态应是结构化 action：

```ts
toast.notify('info', '正在填表...', {
  durationMs: 0,
  dismissible: false,
  action: { label: '终止', onClick: abortTask },
});
```

不要把旧 HTML 字符串按钮模式作为新 API 固化。

---

## 6. 建议落地步骤

### R1 提取 toast policy

新增：

```text
src/shared/feedback/toast-policy.ts
```

包含：

- `ToastKind`
- `ToastCategory`
- `normalizeToastRequest`
- `getDefaultToastDuration`
- `shouldShowToast`
- `buildToastDedupKey`
- `stripToastHtmlForPolicy`

要求：

- 不 import Vue。
- 不 import `presentation/**`。
- 不 import `toastr_API_ACU`。
- 不直接 import `settings_ACU`；调用方传入 `muteEnabled`。

### R2 改造 v2 toast layer 挂载

拆出轻量文件：

```text
src/presentation-v2/bootstrap/toast-layer.ts
```

目标：

- 可在主界面未打开时显示 `AcuToastViewport`。
- 不触发数据库 UI 打开。
- 可复用 Pinia / theme / SFC style host 初始化 helper。
- 不挂载完整 `App.vue`，避免把主界面的路由、菜单、聊天监听和关闭守卫带入后台 toast 场景。

如果短期为了降低风险必须临时复用现有 `ensureMounted()`，也必须保证调用 toast 不会 `setOpen(true)`；该做法只能作为过渡，不应成为稳定架构。

### R3 改造 `showToastr_ACU`

在 `src/presentation/theme/toast.ts` 中：

- 保留对外函数名和参数兼容。
- 先走 shared policy。
- 优先调用 Vue toast layer。
- Vue toast layer 成功时，不再调用旧 `toastr_API_ACU`。
- Vue toast layer 失败时，维持旧 toastr 行为。

### R4 补长任务 handle 兼容

新增统一 clear / update helper，替换少数直接依赖 `toastr_API_ACU.clear(...)` 和 `.find(...)` 的流程。

先解决“不会双弹、能关闭、能更新文字”，再逐步把终止按钮改成结构化 action。

### R5 美化 `AcuToastViewport`

路由稳定后再做视觉：

- 支持标题。
- 支持任务态 / 常驻态。
- 支持 action button。
- 桌面右下或右上固定；移动端底部或顶部安全区。
- 语义色用细线、图标、小面积状态，不用高饱和整块背景。
- 最大堆叠 3-4 条。

---

## 7. 保留与收敛清单

### 7.1 现有新 toast 值得保留

- `src/presentation-v2/stores/toast-store.ts`
  - 保留队列、自动消失、更新、关闭、最大堆叠。
  - 收敛掉不应属于 store 的策略逻辑。
- `src/presentation-v2/components/_lib/AcuToastViewport.vue`
  - 保留 Vue 渲染壳、动画、移动端布局、action 入口。
  - 后续做视觉升级。
- `src/presentation-v2/bootstrap/mount.ts`
  - 保留 bridge 思路。
  - 新增不依赖主界面打开状态的 toast layer API。
- 现有 toast store / viewport / mount 测试
  - 保留并调整为新路由语义。

### 7.2 需要停止扩张的方向

- 不继续允许同一操作新旧 toast 双弹。
- 不让 v2 页面 import `src/presentation/theme/toast`。
- 不把旧 toastr HTML 字符串约定带进 Vue 正式 API。
- 不为了 toast 立即推进 `07` 的完整 runtime / feedback port 重构。

---

## 8. 验收标准

- 数据库主界面未打开时，自动填表 / 剧情推进 / 交火召回等旧 `showToastr_ACU` 调用能显示 Vue toast。
- 同一次 `showToastr_ACU` 调用不会同时显示 Vue toast 和旧 toastr。
- Vue toast layer 挂载失败时，旧 toastr fallback 仍可用。
- v2 页面仍不 import `src/presentation/**`。
- 静默开关、错误永远显示、重要分类不静默的规则与旧行为一致或有明确差异记录。
- 重复 toast 在短时间内仍会被去重。
- 至少覆盖以下测试：
  - policy 单测：静默、分类、默认 duration、去重 key。
  - v2 toast layer 单测：主界面关闭时仍可 notify。
  - `showToastr_ACU` 路由测试：Vue 成功时不调用旧 toastr；Vue 失败时 fallback。
  - 一个长任务 handle 测试：能 update / clear。

---

## 9. 与长期架构的关系

本文档是短期收敛方案，不否定 [07-architecture.md](07-architecture.md)。

长期删除旧 UI 时，仍应把运行时反馈从 `presentation/**` 搬到 `application/feedback` 和 `runtime/`。到那时：

- `showToastr_ACU` 路由器可以退化为 legacy 兼容入口，最后随旧 UI 删除。
- shared toast policy 可继续服务 feedback adapter。
- Vue toast layer 可继续作为 v2 feedback adapter 的渲染实现。
- 长任务结构化 action / task 模型可迁入正式 feedback port。

换句话说，本方案是“先止血、先统一体验、先避免双弹”；`07` 是“后续真正下线旧 UI 的架构目标”。
