# UI v2 整体架构（分层与边界）

> 日期：2026-05-20
> 范围：定义 v2 完成下线旧 UI 之后的目标分层、各层职责、跨层接口、数据流与架构守护。
> 与现有文档的关系：
> - [00-charter.md](00-charter.md) 锁定"做什么"与顶层不可变决策；本文档锁定"怎么分层"。
> - [01-architecture-map.md](01-architecture-map.md) 描述旧 UI 的物理布局；本文档描述新结构的目标物理布局。
> - [02-principles.md](02-principles.md) D17 / D21.2 是本文档分层规则的具体化条款；本文档是 D17 / D21.2 的设计背景与扩展。
> - [04-toast-notification-plan.md](04-toast-notification-plan.md) 是当前 v2 面板内 toast 的产品语义；本文档定义旧 UI 下线后的长期反馈通道位置与接口形态。
> - [06-popup-migration-matrix.md](06-popup-migration-matrix.md) 是迁移过程的逐点审计；本文档定义迁移完成后的稳定形态。

---

## 1. 为什么需要这份文档

旧 UI 重构以"换 Vue 组件"为表象推进了多个阶段，但底层耦合没有同步迁出。具体表现：

- `src/presentation/bootstrap/init.ts` 注册了 `CHAT_CHANGED` / `GENERATION_*` / `TavernHelper.generate` 等宿主事件 hook，是运行时入口；位置在 presentation 层。
- `src/presentation/components/plot-planning-ui.ts`、`summary-vector-index-ui.ts`、`update-status-display.ts`、`import-status-ui.ts`、`pipeline-ui-helpers.ts` 等文件名义上是 UI 组件，实际上是"运行时 + DOM 反馈"的胶水：service 编排函数会把这些文件里的 `*WithUI` 函数当回调传进去，回调内部直接拼 toast HTML、用 jQuery 绑按钮事件。
- v2 曾试做 `toast-store` / `confirm-store` / `input-dialog-store` 和对应 viewport，但实现已回滚；问题仍然成立：运行时反馈没有进入 UI 中立通道。
- 因此即便所有 v2 一级页都已落地，仍然不能直接删除 `src/presentation/`：删了之后宿主事件 hook、剧情推进、交火召回、自动填表都会随之消失。

根因不是"v2 toast 没覆盖某些场景"，而是 **运行时反馈通道（feedback channel）整体没有被搬出 presentation**，整个"业务流程 → UI 反馈"的链路仍然写死在旧 UI 文件里。本文档定义新的分层，使得：

- service / runtime 不感知具体 UI；
- v2 通过适配器对接运行时反馈；
- 旧 UI 删除时只删 adapter 与旧页面，不删运行时本身。

---

## 2. 目标与非目标

### 2.1 目标

- **删除 `src/presentation/**` 后，所有后台运行流程仍能完整运行**：宿主事件 hook、发送前剧情推进、发送前交火召回、自动填表、自动循环、外部导入、正文替换、归档等。
- **前台反馈统一从 UI 中立接口（feedback port）进入 v2** —— toast、confirm、input、progress task。
- **Vue 组件只通过 store / composable / use-case 三档调底层**，不直接 import service / `settings_ACU`。
- **任意一层都能独立测试**：service 不需要 mock UI；feedback port 有 noop 实现可供 runtime 单测使用。
- **架构守护用 `scripts/check-arch.mjs` 强制**，不靠 code review 记忆。

### 2.2 非目标

- 不重写 service / data / shared 层。已有的纯业务函数保持原签名与文件位置。
- 不为外挂新增对外契约。`api-registry` 仍按 [open-questions SUN-8](open-questions.md) 单独搬迁。
- 不替换状态管理为别的方案。Pinia + composable + 直 import 三档（D17）保持不变。
- 不引入 DI 容器。feedback port 用最小注册表实现，避免框架化。

---

## 3. 分层总览

```
┌───────────────────────────────────────────────────────────────────────────┐
│                            entry (src/index.ts /                          │
│                             entry-extension*.ts)                          │
│                                    │                                      │
│                                    ▼                                      │
│                         runtime/bootstrap.ts                              │
│        ┌───────────────────────────┴───────────────────────────┐          │
│        ▼                                                       ▼          │
│  presentation-v2/                                          runtime/       │
│    bootstrap/mount.ts                                       (宿主事件     │
│  注册 v2 feedback adapter ──── application/feedback ◀──── 编排 / hook /   │
│    pages / stores                  (UI 中立接口)            长任务)       │
│                  │                                             │          │
│                  └──────────► application/use-cases ◀──────────┘          │
│                                  (业务流程入口)                           │
│                                          │                                │
│                                          ▼                                │
│                                   service / data / shared                 │
│                                       (纯业务，不变)                      │
└───────────────────────────────────────────────────────────────────────────┘
```

物理目录目标形态：

```
src/
  shared/                  保持不变
  data/                    保持不变
  service/                 保持不变

  application/             新增：UI 中立的业务编排层
    feedback/
      feedback-port.ts        FeedbackPort 接口与注册点
      feedback-types.ts       ToastKind / TaskHandle / ConfirmOptions ...
      feedback-noop.ts        默认 no-op 实现（无 adapter 时 fallback）
    use-cases/
      run-manual-update.ts
      switch-active-api-preset.ts
      import-external-text.ts
      run-content-replace.ts
      build-vector-index.ts
      ... (按需，每个用例对应一个 v2 store / composable 的入口)

  runtime/                 新增：宿主事件绑定与长流程编排
    bootstrap.ts              对外暴露 startRuntime()
    host-events.ts            CHAT_CHANGED / GENERATION_* / MESSAGE_* hook
    send-intent-capture.ts    DOM-level 输入捕捉
    tavernhelper-hook.ts      TavernHelper.generate 拦截
    plot-runtime.ts           剧情推进运行时（替代 plot-planning-ui.ts）
    summary-vector-runtime.ts 交火召回运行时（替代 summary-vector-index-ui.ts）
    auto-loop-runtime.ts      智能续写循环
    update-runtime.ts         自动填表
    import-runtime.ts         外部导入流程

  host-api/                未来：从 presentation/bootstrap 搬出的对外契约
    (SUN-8 单独跟踪)

  presentation-v2/         保持现有形态，但增加 feedback adapter
    bootstrap/
      mount.ts                 已有；新增注册 feedback adapter
      feedback-adapter.ts      新增：v2 store 实现的 FeedbackPort
    stores/ composables/ pages/ ...

  presentation/            过渡期：仅含旧主弹窗、visualizer、旧主题（逐步缩小至空）
```

各层依赖方向：

```
entry  ──►  runtime  ──►  application  ──►  service / data / shared
                                    ▲
                                    │
                          presentation-v2 (registers adapter)
```

**禁止反向依赖**：

- `service / data / shared` 不 import 任何上层；
- `application` 不 import `runtime` / `presentation*`；
- `runtime` 不 import `presentation*`；
- `presentation-v2` 不 import `presentation/` 或 `runtime` 内部模块（只能通过 `application` 暴露的入口）。

---

## 4. 各层职责详细说明

### 4.1 shared / data / service（保持不变）

按现有规模与职责保留，对应 [01-architecture-map.md §2.11](01-architecture-map.md)：

- **shared**：常量、宿主 API 代理、工具函数、日志缓冲、文本优化、DDL 工具等。
- **data**：gateways、models、repositories、sqlite 引擎、storage。
- **service**：AI、chat、host、import、loop、optimization、plot、runtime helpers、settings、summary、table、template、template-assistant、vector、worldbook。

**唯一约束**：本层不调用 UI / feedback，遇到失败应抛错或写运行日志；遇到长任务进度需要上报时，由上层 use-case / runtime 在调用前后包装。

> 旧 service 中存在少量返回 "进度回调"参数的函数（如 `runOptimizationLogic_ACU` 自身），这是为了让 presentation 包装进度 toast。重构后回调由 use-case / runtime 内部消费并转译为 feedback port 调用，service 签名不变。

### 4.2 application 层（新增）

**职责**：

1. 提供"业务用例"入口：UI 与 runtime 共享的同一个函数。例如"运行手动填表"由"更新参数页的手动填表按钮"和"自动 hook 触发的发送前填表"两条路径共享同一入口。
2. 提供"反馈端口"接口：runtime / use-case 调它发反馈，不知道当前 UI 是 v2 / 旧 UI / 无 UI。
3. 不持有响应式状态（那是 v2 store 的事），不持有宿主事件订阅（那是 runtime 的事）。

**典型 use-case 形态**：

```ts
// application/use-cases/run-manual-update.ts
import { runManualUpdate_ACU } from '../../service/table/update-orchestrator';
import { getFeedback } from '../feedback/feedback-port';

export interface RunManualUpdateInput {
  range: { startFloor: number; endFloor: number };
  additionalPrompt?: string;
  source: 'v2-button' | 'auto-loop' | 'host-hook';
}

export interface RunManualUpdateResult {
  success: boolean;
  updatedRows: number;
  errorMessage?: string;
}

export async function runManualUpdate(input: RunManualUpdateInput): Promise<RunManualUpdateResult> {
  const feedback = getFeedback();
  const task = feedback.startTask({
    kind: 'manual-update',
    text: '正在生成填表内容...',
    cancel: () => abortController.abort(),
  });

  try {
    const result = await runManualUpdate_ACU(input.range, input.additionalPrompt);
    feedback.dismissTask(task, { result: 'success', text: `已更新 ${result.updatedRows} 行` });
    return { success: true, updatedRows: result.updatedRows };
  } catch (error) {
    feedback.dismissTask(task, { result: 'error', text: '填表失败，详情见运行日志' });
    pushLog('error', ['manual-update', error]);
    return { success: false, updatedRows: 0, errorMessage: String(error) };
  }
}
```

**use-case 的判定标准**：

| 是否抽 use-case | 标准 |
|---|---|
| 抽 | 同一业务在 ≥ 2 处被触发（v2 + runtime / v2 + 外部 API） |
| 抽 | 需要发 feedback（toast / confirm / progress） |
| 抽 | 跨越多个 service 函数，且组合逻辑独立于 UI |
| 不抽 | 仅 v2 一处使用，且不涉及 feedback / 编排 → 保留为 composable |
| 不抽 | 纯 service 调用（无 feedback / 无编排） → 保留为直 import |

### 4.3 feedback port（application 层的核心子模块）

**为什么独立**：toast / confirm / progress task 是当前耦合最重的一处；把它做成 UI 中立接口，是删除 `src/presentation/` 的关键解耦。

**接口形态（草稿）**：

```ts
// application/feedback/feedback-port.ts

export type FeedbackKind = 'info' | 'success' | 'warning' | 'error';

export interface FeedbackNotifyOptions {
  durationMs?: number;
  dismissible?: boolean;
  action?: { label: string; onClick: () => void };
  muteable?: boolean;
}

export interface FeedbackTaskOptions {
  kind: string;                 // 'manual-update' / 'plot-planning' / 'vector-archive' / ...
  text: string;
  cancel?: () => void;
}

export interface FeedbackTaskHandle {
  id: string;
  update(patch: { text?: string; progress?: number }): void;
}

export interface FeedbackTaskResult {
  result: 'success' | 'error' | 'aborted';
  text?: string;
}

export interface FeedbackConfirmOptions {
  title?: string;
  text: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'default' | 'danger';
}

export interface FeedbackInputOptions {
  title?: string;
  text?: string;
  placeholder?: string;
  initialValue?: string;
  validate?: (value: string) => string | null;
}

export interface FeedbackPort {
  notify(kind: FeedbackKind, text: string, options?: FeedbackNotifyOptions): void;
  startTask(options: FeedbackTaskOptions): FeedbackTaskHandle;
  dismissTask(handle: FeedbackTaskHandle, result?: FeedbackTaskResult): void;
  confirm(options: FeedbackConfirmOptions): Promise<boolean>;
  prompt(options: FeedbackInputOptions): Promise<string | null>;
}

// 注册点：进程内单例，最近一次注册的 adapter 生效；未注册时返回 noop。
export function registerFeedbackAdapter(adapter: FeedbackPort | null): void;
export function getFeedback(): FeedbackPort;
```

**关键约束**：

- adapter 是注册而非依赖注入；进程内同一时刻只有一个生效。
- v2 打开 → 注册 v2 adapter；v2 关闭 → 回退到 fallback adapter（旧 toast 或 noop）。
- runtime / use-case 永远调 `getFeedback()`，不感知 adapter 类型。
- service 层禁止 import feedback-port；只在 use-case 与 runtime 中使用。

**adapter 实现位置**：

- `presentation-v2/bootstrap/feedback-adapter.ts`：基于 toast-store / confirm-store / input-dialog-store。任务类反馈映射到 toast-store 的"任务模式"（toast 持续显示 + cancel action）。
- 过渡期 `presentation/legacy-feedback-adapter.ts`（位于旧目录）：基于 `showToastr_ACU` + `showCustomConfirm_ACU`。旧 UI 入口启动时注册。删除旧 UI 时一并删。

### 4.4 runtime 层（新增）

**职责**：

1. **宿主事件订阅**：从旧 `presentation/bootstrap/init.ts` 与 `presentation/triggers/*` 搬出，订阅 `CHAT_CHANGED` / `GENERATION_*` / `MESSAGE_*`、注册 `TavernHelper.generate` hook、安装 send intent capture。
2. **长任务编排**：剧情推进、交火召回、自动填表、自动循环、外部导入、正文替换等。这些流程在旧实现中是 `presentation/components/*WithUI.ts` 与 `presentation/triggers/*` 的混合体；新结构下，它们是 runtime 层的纯流程，反馈通过 feedback port。
3. **启动顺序与去重**：与旧 `mainInitialize_ACU` 等价的启动入口（`startRuntime()`）；与 v2 启动并行但不互依赖。

**关键边界**：

- runtime 不 import presentation* —— 包括 v2。它只通过 feedback port 与 UI 通信。
- runtime 可以 import application/use-cases（共享业务用例）。
- runtime 可以直接调用 service 函数（runtime 本身就是 service 与宿主之间的桥）。

**入口结构**：

```ts
// runtime/bootstrap.ts
import { installHostEvents } from './host-events';
import { installTavernHelperHook } from './tavernhelper-hook';
import { installSendIntentCapture } from './send-intent-capture';
import { initWithCurrentChat } from './startup-tasks';

export async function startRuntime(): Promise<void> {
  await ensureCoreApisReady();
  installHostEvents();
  installTavernHelperHook();
  installSendIntentCapture();
  await initWithCurrentChat();
}
```

### 4.5 presentation-v2（现有，增加 adapter）

**保持现有边界**（[02-principles.md](02-principles.md) D17 / D21.2）：

- Vue 组件 → store / composable / 直 import 三档。
- 不 import `presentation/`。
- 不 import `runtime/` 的内部模块（只能通过 use-case 或 feedback adapter 桥接）。

**新增职责**：

- `bootstrap/feedback-adapter.ts` 把 `application/feedback/feedback-port.ts` 的接口实现为 v2 store 调用。
- `bootstrap/mount.ts` 在 `ensureMounted()` 后注册 adapter；`closeAcuV2App()` 时降级到 fallback。
- 阶段后期 v2 store 应通过 use-case 调底层，而不是直 import service。这是渐进改造，不要求一次性完成。

### 4.6 presentation（旧目录，过渡中）

**目标终态**：除 visualizer（直到 [SUN-2](open-questions.md) 关闭）外全部删除。

**过渡期允许保留**：

- 旧主弹窗与旧菜单按钮（用户偶尔切回旧 UI）。
- 旧主题选择器（旧主题不进入新主题系统）。
- 旧 `theme/toast.ts` / `theme/custom-confirm.ts` 作为 legacy adapter 的底座，直到旧主弹窗也删除。
- visualizer 与模板助手（独立窗口，体量大，单独迁移）。

**禁止再增加**：

- 新的 `*WithUI` 文件；
- 新的 service ↔ presentation 跨层回调；
- 新的从 v2 反向 import 旧 toast / 旧 confirm。

---

## 5. 数据流场景

### 5.1 场景 A：用户在 v2 点击"立即填表"

```
DashboardPage.vue
  └── onClick={runManualUpdateNow}
       │
       ▼
useDashboardPage.ts  (v2 composable)
  └── 校验输入 → 调 use-case
       │
       ▼
application/use-cases/run-manual-update.ts
  ├── feedback.startTask({ kind: 'manual-update', text: '正在生成...', cancel })
  ├── service/table/update-orchestrator.runManualUpdate_ACU(...)
  └── feedback.dismissTask(handle, { result: 'success', text: '已更新 N 行' })
       │
       ▼
feedback-port 当前注册的是 v2 adapter
  └── toast-store.startTask(...)  → AcuToastViewport 渲染进度卡
  └── toast-store.dismiss(...)    → 替换为成功 toast
```

### 5.2 场景 B：宿主触发 `GENERATION_AFTER_COMMANDS`（用户在酒馆点发送）

```
SillyTavern eventSource.emit('GENERATION_AFTER_COMMANDS', ...)
  │
  ▼
runtime/host-events.ts  ←  在 startRuntime() 时注册的监听
  ├── shouldProcessSummaryVectorIndex / shouldProcessPlot 过滤
  ├── 调 application/use-cases/run-summary-vector-recall  →  feedback.startTask(...)
  └── 调 application/use-cases/run-plot-planning         →  feedback.startTask(...)
       │
       ▼
service/plot/plot-orchestrator (不变)
service/vector/...           (不变)
       │
       ▼
feedback-port 决定渲染目标：
  - v2 打开：v2 toast-store / confirm-store
  - v2 关闭但 legacy adapter 已注册：旧 showToastr_ACU
  - 都没注册：noop + 仅写运行日志
```

旧实现里 `presentation/bootstrap/init.ts` 直接 import `runOptimizationLogicWithUI_ACU` 作为 service 回调；新实现里 service 编排函数不再接受 UI 回调，编排逻辑搬到 use-case，UI 反馈走 feedback port。

### 5.3 场景 C：切换聊天 `CHAT_CHANGED`

```
SillyTavern eventSource.emit('CHAT_CHANGED', chatFileName)
  │
  ▼
runtime/host-events.ts
  ├── disposeStorageProvider() if sqlite
  ├── resetScriptStateForNewChat_ACU(chatFileName)  (service)
  ├── loadPresetAndCleanCharacterData_ACU()         (service)
  ├── 如果 loopState.isLooping: stopAutoLoop + feedback.notify('info', '切换聊天，自动化循环已停止。')
  ├── 安装 send-intent capture（如需要）
  ├── 重建 sqlite / 刷新合并数据
  └── 预热交火向量索引缓存

v2 侧响应：
  └── pinia store 通过订阅"当前聊天"变化自动刷新；不需要 runtime 直接调 v2 store。
      这一步通过 service 层暴露的 reactive-like 通知机制（或 v2 store 在 mount 时主动读 service 状态）实现。
```

> v2 store 如何感知"当前聊天已变"是单独的设计问题，对应 [02-principles.md](02-principles.md) D25 的"重开刷新"语义。本文档不在此重复，但要求：v2 不应通过 import `runtime/` 模块来感知运行时状态，而是通过 use-case 或 service 暴露的状态查询函数。

---

## 6. 旧 UI → 新结构映射

按 [01-architecture-map.md](01-architecture-map.md) §2 的清单逐项给出去向。仅列搬迁项；保持原状的（shared / data / service）不重复列出。

| 旧位置 | 性质 | 新位置 | 备注 |
|---|---|---|---|
| `presentation/bootstrap/init.ts` | 启动 + 事件 hook + 部分 UI 逻辑 | `runtime/bootstrap.ts` + `runtime/host-events.ts` + `runtime/tavernhelper-hook.ts` + `runtime/send-intent-capture.ts` | 拆分；UI toast 调用替换为 `feedback.notify` |
| `presentation/bootstrap/startup.ts` | 旧菜单按钮注册 | 保留直到旧 UI 删除；v2 菜单按钮已独立 | 旧 UI 删除时一并删 |
| `presentation/bootstrap/api-registry.ts` | 对外契约 | `host-api/` | 由 [SUN-8](open-questions.md) 单独跟踪 |
| `presentation/bootstrap/api-groups/*` | 对外契约 | `host-api/api-groups/*` | 与 SUN-8 同步搬迁 |
| `presentation/components/plot-planning-ui.ts` | 进度 toast + 终止按钮 + service 包装 | `runtime/plot-runtime.ts` + `application/use-cases/run-plot-planning.ts` | UI 反馈走 feedback port |
| `presentation/components/summary-vector-index-ui.ts` | 召回进度 + 结果反馈 | `runtime/summary-vector-runtime.ts` + use-case | 同上 |
| `presentation/components/update-status-display.ts` | 状态显示 | v2 store 订阅；运行时只 emit 事件不直接更新 DOM | 旧 DOM 调用废弃 |
| `presentation/components/import-status-ui.ts` | 导入状态 | v2 ImportPage / `useImportFlow` | 已部分迁移；剩余删除 |
| `presentation/components/pipeline-ui-helpers.ts` | UI 通知包装 | `runtime/` + feedback port | 重新拆分 |
| `presentation/components/remote-memory-archive-progress.ts` | overlay 进度 | feedback port 的 task 模式 | overlay 形态由 v2 toast viewport 承接 |
| `presentation/components/status-display.ts` | textarea 读写 | `runtime/host-input.ts`（或保留在 service/runtime） | 它本身就是宿主 DOM 操作，不算 UI |
| `presentation/components/optimization-ui/*` | overlay + diff + 执行 | `runtime/content-replace-runtime.ts` + v2 专属页面已存在 | overlay 用 feedback task；diff 留 v2 页面 |
| `presentation/components/plot-editors.ts` | 旧表单编辑器 | v2 已替代，直接删 | 与旧主弹窗一起删 |
| `presentation/components/template-preset-ui.ts` | 旧模板预设 UI | v2 已替代，直接删 | 同上 |
| `presentation/components/worldbook-selector.ts` | 旧世界书选择器 | v2 已替代，直接删 | 同上 |
| `presentation/components/table-selector.ts` | 旧表选择器 | v2 已替代，直接删 | 同上 |
| `presentation/components/settings-ui-helpers.ts` | settings 同步 + UI 反馈 | 拆：settings 同步进 service；反馈进 feedback port | |
| `presentation/triggers/settings-ui-sync/*` | 名为同步实为多职责混合 | 拆：DOM 同步部分删；运行时部分进 `runtime/`；API 配置部分进 `runtime/api-config-runtime.ts` 或合并入 service | [01-architecture-map §2.8](01-architecture-map.md) 已点名 |
| `presentation/triggers/admin-ui.ts` / `data-admin-ui.ts` | 数据管理 UI 触发 | v2 `useDataManagement` 已替代 + 必要部分进 use-case | 删 |
| `presentation/triggers/auto-loop.ts` | 自动循环 DOM + 流程混合 | `runtime/auto-loop-runtime.ts` + use-case | 流程进 use-case，DOM 部分删 |
| `presentation/triggers/import-process.ts` | 导入流程 | `runtime/import-runtime.ts` + 已有 `useImportFlow` | 共享 use-case |
| `presentation/triggers/update-trigger.ts` / `update-process.ts` | 更新流程 + 进度 toast | `runtime/update-runtime.ts` + `application/use-cases/run-manual-update.ts` | 进度走 feedback task |
| `presentation/theme/theme-registry.ts` 等 | 旧主题系统 | v2 主题系统已重写 | 删 |
| `presentation/theme/toast.ts` | 旧 toast 实现 | 保留至旧 UI 删除；作为 legacy adapter 底座 | 最后阶段删 |
| `presentation/theme/custom-confirm.ts` | 旧 confirm 实现 | 同上 | |
| `presentation/window/window-system.ts` + `window-styles.ts` | 旧窗口系统 | 仅 visualizer 仍依赖；其余删 | visualizer Vue 化时一并废弃 |
| `presentation/pages/main-popup*.ts` | 旧主弹窗 | 全删 | 与旧菜单按钮一起删 |
| `presentation/pages/popup-bindings*.ts` | 旧 jQuery 绑定 | 全删 | 同上 |
| `presentation/pages/popup-helpers.ts` | 旧弹窗 helper | 全删 | 同上 |
| `presentation/state/ui-refs.ts` | 旧 jQuery 引用表 | 全删 | 同上 |
| `presentation/pages/visualizer*.ts` | 可视化表格编辑器 | 保留至 [SUN-2](open-questions.md) 关闭 | 单独阶段处理 |

---

## 7. 关键接口与命名约定

### 7.1 use-case 命名

- 动词 + 名词：`runManualUpdate`、`switchActiveApiPreset`、`importExternalText`、`buildVectorIndex`。
- 文件名 = 函数名 kebab-case：`use-cases/run-manual-update.ts` 导出 `runManualUpdate`。
- 输入 / 输出明确定义 `interface XxxInput` / `interface XxxResult`，避免使用 `any`。

### 7.2 feedback task kind 命名

- kebab-case，按业务域命名：`manual-update` / `plot-planning` / `vector-recall` / `vector-archive` / `content-replace` / `external-import` / `auto-loop`。
- 不携带状态后缀（不要叫 `manual-update-success`）；状态由 `dismissTask({ result, text })` 表达。
- v2 toast adapter 可基于 kind 决定渲染分组、是否避免合并、是否提供"查看日志"按钮。

### 7.3 runtime 模块命名

- 后缀 `-runtime.ts`：`plot-runtime.ts` / `summary-vector-runtime.ts` / `auto-loop-runtime.ts`。
- 每个模块导出 `install*()` 函数，由 `runtime/bootstrap.ts` 统一调用。
- 模块内部允许有 module-scope 状态（如 abort controller、循环开关），但不应导出该状态供 UI 直接读；UI 通过 use-case 查询。

### 7.4 adapter 命名

- v2：`presentation-v2/bootstrap/feedback-adapter.ts`，导出 `createV2FeedbackAdapter(pinia: Pinia): FeedbackPort`。
- legacy：`presentation/legacy-feedback-adapter.ts`，导出 `legacyFeedbackAdapter: FeedbackPort`。
- 注册位置：v2 adapter 在 `mount.ts` 的 `ensureMounted()` 中 `registerFeedbackAdapter(createV2FeedbackAdapter(pinia))`；legacy adapter 在 `runtime/bootstrap.ts` 启动早期注册为 fallback（v2 注册后会被覆盖；v2 关闭时回退）。

---

## 8. 架构守护（`scripts/check-arch.mjs`）

现有规则（[02-principles.md](02-principles.md) D17 / D21.2 / X-4 部分）继续生效。**新增规则**：

| ID | 规则 | 检查方式 |
|---|---|---|
| ARCH-RT-1 | `src/service/**` 禁止 import `src/application/**` / `src/runtime/**` / `src/presentation*` | AST import 扫描 |
| ARCH-RT-2 | `src/application/**` 禁止 import `src/runtime/**` / `src/presentation*` | 同上 |
| ARCH-RT-3 | `src/runtime/**` 禁止 import `src/presentation*` | 同上 |
| ARCH-RT-4 | `src/service/**` 禁止 import `feedback-port` | 同上 |
| ARCH-RT-5 | `src/presentation-v2/**` 禁止 import `src/runtime/**` 内部模块（只能通过 `src/application/**`） | 路径白名单 |
| ARCH-RT-6 | `src/presentation/**` 禁止新增 import `src/application/feedback/**` 以外的 application 模块（防止旧 UI 横向扩张） | 同上 |
| ARCH-RT-7 | 禁止再新增 `*WithUI` 命名（旧模式标记） | 文件名扫描 |

新增规则在引入对应代码后逐条启用，不要求一次性强制。

---

## 9. 测试策略

[02-principles.md §18](02-principles.md) 的三档（store / composable / 页面集成）保持不变，**新增三档**：

| 档位 | 范围 | 范例 |
|---|---|---|
| feedback port 单测 | noop 实现、注册 / 注销、fallback、最近一次 adapter 生效 | `tests/application/feedback/feedback-port.test.ts` |
| use-case 单测 | 输入 → 调用 service mock → 调用 feedback mock → 输出 | `tests/application/use-cases/run-manual-update.test.ts` |
| runtime 集成测试 | 模拟宿主事件 → 期望 use-case 被调用 + feedback 收到对应任务 | `tests/runtime/host-events.test.ts` |

**测试时反馈端口注入**：runtime / use-case 测试通过 `registerFeedbackAdapter(mockAdapter)` 注入，结束后 `registerFeedbackAdapter(null)`。

---

## 10. 落地节奏

本架构不要求一次性迁移。建议步骤：

```
S1  搭骨架       新建 application/feedback/feedback-port.ts + noop 实现
                 不接业务，只做单测
S2  v2 adapter   presentation-v2/bootstrap/feedback-adapter.ts
                 mount.ts 中注册；关闭时 unregister
                 现有 v2 toast 用例改走 feedback port 验证
S3  legacy adapter  presentation/legacy-feedback-adapter.ts
                    在旧 UI 启动早期注册
                    旧 *WithUI 文件改成 feedback port + use-case，原文件删除
                    每次迁一个域：剧情推进 → 交火召回 → 自动填表 → 自动循环 → 外部导入 → 正文替换
S4  runtime/     建立 runtime/ 目录
                 init.ts 内容拆出，src/index.ts 改为 startRuntime()
                 旧 presentation/bootstrap/init.ts 删
S5  host-api/    SUN-8 单独阶段
S6  旧 UI 删除   旧主弹窗、旧主题、旧 popup-bindings、ui-refs、settings-ui-sync 等批量删除
                 legacy adapter 同时删
                 visualizer 留待 SUN-2
S7  v2 改造收尾  v2 store 中残留的"直读 settings_ACU"、"直调 service"等改走 use-case
                 archive 守护规则切换为强制
```

每一步都是可独立 ship 的。S1 / S2 / S3 各自完成时，外部行为应无可见变化（只是内部解耦推进）。S4 是分水岭：完成后即可在不删旧主弹窗的前提下删除 `presentation/bootstrap/init.ts`。

---

## 11. 与现有计划的关系

- [04-toast-notification-plan.md](04-toast-notification-plan.md) §5 的"迁移顺序"是当前 v2 面板内 toast 的产品语义视角；本文档 §10 是旧 UI 下线后的物理结构视角。两者不要混为同一阶段：重做 v2 toast 不要求先落地本文档的完整 feedback port / runtime 分层。
- [06-popup-migration-matrix.md](06-popup-migration-matrix.md) 的逐点审计在本架构下意义不变：每一行的"待迁移"调用都会在后续旧 UI 下线阶段按域解决。2026-05-21 需求收窄后，短期不再按 [08-toast-routing-consolidation.md](08-toast-routing-consolidation.md) 将 `showToastr_ACU` 路由到独立 v2 toast layer；旧 runtime / 旧 UI toast 暂时保留旧入口，长期仍由本文档 §4.3 的 feedback port / legacy adapter 取代。
- [open-questions.md](open-questions.md) 中的 SUN-1 / SUN-7 / SUN-8 在本架构下被显式编排：SUN-1 是 S2 / S3；SUN-7 是 S6；SUN-8 是 S5。

---

## 12. 开放问题

- **v2 → 运行时状态的感知方式**：当前 v2 store 通过直读 `settings_ACU` / `state-manager` 单例感知运行时状态。本架构没有强行替换这条路径；但长期最好通过 service 暴露的"快照 + 订阅"接口替代单例直读。优先级低。
- **feedback port 的进度模型**：本文档定义了 `startTask` / `update` / `dismissTask`，但没有明确"多个并发任务"的视觉合并规则（例如同时有交火召回 + 剧情推进）。这属于旧 UI 下线后的长期反馈通道问题，不阻塞 [04-toast-notification-plan.md](04-toast-notification-plan.md) 的 v2 面板内 toast 重做。
- **use-case 与 v2 composable 的边界**：当 v2 store / composable 已经做了完整流程编排（例如 `useImportFlow`、`useDataManagement`、`useVectorIndexConfig`），是否要硬性下沉为 use-case？建议：如果该流程只服务 v2，则保持为 composable；如果未来 runtime / 外部 API 也需要触发，则下沉为 use-case 并保留 composable 作为响应式包装。
- **legacy adapter 的生命周期**：旧 UI 关闭时 legacy adapter 是否仍要保留为 fallback？建议：旧主弹窗删除时 legacy adapter 一并删除；之后 v2 关闭则 feedback port 降级为 noop（不再有 UI 反馈，只写运行日志），符合"v2 关闭即无 UI"的最终形态。
