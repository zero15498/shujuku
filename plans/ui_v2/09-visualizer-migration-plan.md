# UI v2 Visualizer 迁移计划

> 日期：2026-05-21  
> 范围：迁移旧可视化表格编辑器 visualizer 到 v2 前端。变更集中在 v2 前端；`src/service/template-assistant/**` 保持现有契约。
> 2026-05-21 修订：本计划不改 `src/presentation/**` 旧入口。旧 UI 与旧 `AutoCardUpdaterAPI.openVisualizer()` 继续打开旧 visualizer；v2 内部按钮接入新的 v2 surface，并额外暴露 `AutoCardUpdaterV2API.openVisualizer()` 供其他前端主动改用。旧 UI 与新 UI 在本版本共存，不包含旧 UI 或旧 visualizer 下线。

## 1. 背景

旧 visualizer 是集中式数据库编辑工作台，承担：

- 当前聊天表格数据编辑；
- 单表结构、更新参数、提示词、DDL、世界书注入配置；
- 跨表的全局注入配置；
- AI 改表助手；
- 保存到当前聊天、保存到全局模板预设；
- 外部前端通过 `AutoCardUpdaterAPI.openVisualizer()` 打开旧编辑器；
- v2 迁移期额外提供 `AutoCardUpdaterV2API.openVisualizer()`，供其他前端主动切到 v2 visualizer；
- `ACU_Visualizer_Refresh()` 这类运行中刷新入口。

因此迁移目标是把 visualizer 重建为 v2 全屏临时工具面。本计划全程保持旧接口语义不变，避免旧 UI 和旧第三方脚本被动切换；需要使用 v2 visualizer 的其他前端改调新 v2 接口。旧接口是否统一迁移到 v2 不属于本计划范围，若未来进入兼容 facade 专项，再单独设计和验收。

## 2. 硬约束

### 2.1 只迁移前端

本阶段保持底层业务层契约稳定：

- 冻结 `src/service/template-assistant/**` 的协议、校验、compiler、session runner。
- 冻结表格保存、模板预设、聊天作用域、世界书注入、SQLite 存储等 service 契约。
- 可以新增 v2 store / composable / surface / component。
- 可以重写 `src/presentation/pages/visualizer-template-assistant*.ts` 的前端实现，或用 v2 实现替代旧 DOM 实现。
- 本计划不调整 `src/presentation/bootstrap/api-groups/*` 中打开 visualizer 的旧入口；旧 UI 和旧外部 API 行为保持不变。
- 本计划不评估也不实施旧 `AutoCardUpdaterAPI.openVisualizer()` 转发到 v2；如需兼容 facade，另立专项。

### 2.2 v2 与旧 presentation 物理隔离

`src/presentation-v2/**` 通过 UI 中立的 adapter / bridge 承载 v2 visualizer：

- v2 surface 调用 v2 composable；
- composable 调用 service、shared、或新增的 UI 中立 visualizer adapter；
- 本计划不从 `src/presentation-v2/**` import `src/presentation/**`；
- 本计划不改旧 `presentation/bootstrap/api-groups/*`，旧 API group 仍指向旧 visualizer。

### 2.3 外部打开能力必须保留

旧 UI 已暴露至少两类外部入口，本计划保持它们的旧行为：

- `AutoCardUpdaterAPI.openVisualizer()`，当前来源包含 `data-admin-api.ts` 和 `settings-config-api.ts`。
- `window.ACU_Visualizer_Refresh()`，旧运行时在数据刷新后会尝试调用。

本计划新增 v2 专用入口：

```ts
await AutoCardUpdaterV2API.openVisualizer();
```

期望行为：

- 如果 v2 主界面未打开，打开 v2 宿主并进入 visualizer，关闭 visualizer 后关闭 v2 宿主，回到 SillyTavern 原位。
- 如果 v2 已打开，记录当前 v2 主界面位置 / shell 状态后进入 visualizer，关闭 visualizer 后回到进入前的位置。
- 如果 visualizer 已打开，复用现有实例并刷新必要状态。
- 返回值保持宽松兼容：成功返回 `true` 或可 await 的成功结果；失败时记录错误并返回 `false`。

本计划新增 v2 专用刷新入口：

```ts
await AutoCardUpdaterV2API.refreshVisualizer?.();
```

期望行为：

- visualizer 未打开时直接返回。
- visualizer 打开时重新从当前聊天 / 当前隔离上下文加载工作数据。
- 如果存在未保存修改，标记“外部数据已变化”，由用户选择刷新或保留当前草稿。

旧 `AutoCardUpdaterAPI.openVisualizer()` 与 `window.ACU_Visualizer_Refresh()` 在本计划不改造；它们继续服务旧 visualizer。是否把旧入口转发到 v2 属于未来兼容 facade 专项，不作为本版本目标。

## 3. 旧实现事实

当前旧入口：

- `src/presentation/pages/visualizer.ts` 创建旧窗口、维护 `_acuVisState`、绑定保存与 mode 切换。
- `src/presentation/pages/visualizer-sidebar.ts` 渲染表列表、新增、删除、排序。
- `src/presentation/pages/visualizer-main-render.ts` 渲染数据编辑与全局注入配置。
- `src/presentation/pages/visualizer-main-config.ts` 渲染单表结构与参数配置。
- `src/presentation/pages/visualizer-main-save.ts` 处理保存到当前聊天 / 全局模板。
- `src/presentation/pages/visualizer-template-assistant.ts` 与 `visualizer-template-assistant-apply.ts` 处理 AI 改表助手 UI 与应用草稿。
- `src/presentation/bootstrap/visualizer-template-assistant-addon.ts` 通过 DOM addon 挂载助手按钮。

旧 UI 的移动端经验需要保留：

- 小屏下表格列表变为顶部横向滚动；
- AI 助手在中小屏使用非常驻布局；
- 旧 fullscreen overlay 的体验迁移为 v2 surface / sheet / mode。

AI 助手边界：

- service 会把 `selectedSheet`、`allSheets`、`globalInjectionConfig` 发给 AI。
- 当前 service 协议允许 `add_sheet`、`rename_sheet`、`delete_sheet`、`move_sheet`、多类 `patch_sheet_*`、`patch_global_injection_config`。
- `protocolVersion=2` 下 compiler 测试明确允许跨表 patch。
- AI 助手以当前表为锚点，可修改整个模板。v2 UI 必须在 diff 预览和风险确认里表达这个事实。

## 4. 目标形态

### 4.1 工具面定义

新增 v2 全屏临时工具面：

- 内部 surface id：`visualizer`
- 标题建议：`数据库编辑器`
- 类型：shell-level surface。
- 状态：由 surface 激活状态承载。
- 入口：
  - 表格模板预设面板 / 填表规则页中的“打开数据库编辑器”按钮；
  - v2 专用外部 API `AutoCardUpdaterV2API.openVisualizer()`；

这里的“全屏”指使用 v2 shell / 主题 / 组件 / store 能力承载一个临时编辑器。它与 charter 中统一 v2 shell 承载的方向一致；实现时由 surface 替代旧 `createACUWindow` / `window-system.ts` 独立窗口。

关闭返回规则：

- 从 v2 内部按钮进入：关闭 visualizer 后回到进入前的 v2 主界面位置，保留原 v2 shell 打开状态。
- 从 `AutoCardUpdaterV2API.openVisualizer()` 进入，且 v2 原本未打开：关闭 visualizer 后关闭 v2 shell，回到酒馆原界面。
- 从 `AutoCardUpdaterV2API.openVisualizer()` 进入，但 v2 原本已打开：关闭 visualizer 后回到调用前的 v2 主界面位置。
- 重复调用 `openVisualizer()` 时复用现有 visualizer，并按 dirty 状态决定是否刷新。

实现形态：

- `App.vue` 在 shell 层判断是否存在 active surface。visualizer 打开时渲染 `VisualizerSurface`。
- v2 shell header 可继续存在，但标题、关闭按钮语义切换为当前 surface；移动端 header 聚焦当前 surface 操作。
- surface 关闭只关闭 visualizer 本身；是否继续关闭 v2 shell 由打开来源快照决定。
- 交互模型：shell 内单实例编辑 surface，使用 v2 header、主题、关闭保护和响应式布局。

### 4.2 主布局

桌面端：

```text
v2 Shell Header: 数据库编辑器

顶部状态条: 当前模板 / 当前聊天 / 当前表 A / AI 草稿状态 / 未保存 / 外部数据变化

┌──────────────┬────────────────────────────────────────────┐
│ 表格列表      │ 主工作区                                    │
│ 表 A         │ [数据] [结构/参数] [AI 助手]                 │
│ 表 B         │                                            │
│ + 新增表格    │ 当前 mode 的 AcuPanel / 工作台内容           │
│              │                                            │
│ 全局注入配置  │                                            │
└──────────────┴────────────────────────────────────────────┘

底部操作区: 状态文案                 [保存到当前聊天] [保存到全局模板]
```

移动端：

- 表格列表收缩为顶部横向 chip / segmented nav；
- “全局注入配置”作为独立 chip，和表格项视觉分隔；
- 主工作区单列；
- 底部保存按钮纵向堆叠；
- AI 助手使用主工作区 mode，或在 AI mode 内使用全屏 sheet 显示长 diff / 会话历史。

### 4.3 设置页视觉一致性

visualizer 是 shell-level surface，视觉上必须像 v2 主界面的一部分。实现时沿用 v2 shell header、主题 token、字号梯度、按钮层级、focus ring、toast / message 语义和 `_lib/` 表单控件。

结构 / 参数 / 全局注入配置应沿用 v2 设置页视觉语言：

- 使用 `AcuPanel` 承载逻辑分区；
- 每个 `AcuPanel` 提供 `description` 或等价常驻说明；
- panel header actions 只放状态 badge；
- 触发按钮放在所属区域正文或底部操作区；
- 危险操作用确认表层或就地确认；
- 命名输入用 v2 输入弹窗、内联表单或小 modal。

`AcuPanelGrid` 适用边界：

- visualizer 是 shell-level surface，使用专用的“表格列表 / 主工作区 / 底部操作区”外层布局。
- 结构 / 参数 / 全局配置 / AI diff 等内部区域仍遵守 `AcuPanel`、`AcuInfoBanner`、panel actions 只放状态 badge、表单控件使用 `_lib/` 的规则。

### 4.4 实现目录建议

visualizer 推荐使用 surface 专用目录：

```text
src/presentation-v2/
  surfaces/
    visualizer/
      VisualizerSurface.vue
      VisualizerSheetNav.vue
      VisualizerWorkspace.vue
      VisualizerDataCards.vue
      VisualizerConfigPanels.vue
      VisualizerGlobalInjectionPanels.vue
      VisualizerAssistantPanel.vue
      open-visualizer-surface.ts
  stores/
    visualizer-store.ts
  composables/
    visualizer/
      useVisualizerData.ts
      useVisualizerSheets.ts
      useVisualizerContentEditing.ts
      useVisualizerConfigEditing.ts
      useVisualizerSave.ts
      useVisualizerAssistant.ts
      useVisualizerLifecycle.ts
      useVisualizerExternalRefresh.ts
```

目录边界：

- `surfaces/visualizer/**`：只放 visualizer 专属 Vue surface 与专属子组件。稳定跨功能复用后再进入 `_lib/`。
- `stores/visualizer-store.ts`：承载 active surface、打开来源快照、dirty、当前表、mode、工作副本等响应式状态。
- `composables/visualizer/**`：承载 service 编排、保存、AI 助手、外部刷新等流程；Vue 文件只调用 v2 store / composable / UI 中立 adapter。
- `bootstrap/open-visualizer-surface.ts` 或 `surfaces/visualizer/open-visualizer-surface.ts`：承载外部 `openVisualizer()` bridge。它负责确保 v2 app 挂载、打开 shell、写入打开来源、激活 surface。
- 如需调整 `mount.ts` 暴露 Pinia / shell 访问能力，应只暴露最小 helper。

## 5. 功能拆分

### 5.1 表格列表

必须支持：

- 表格选择；
- 表名展示；
- 新增表；
- 删除表；
- 上移 / 下移或拖拽排序；
- 当前表失效时自动回退到下一张有效表；
- 全局配置独立入口。

移动端要求：

- 顶部横向滚动；
- 当前项保持可见；
- 新增与全局配置入口始终容易找到；
- 窄屏使用单列工作区和顶部表格导航。

### 5.2 数据编辑

第一阶段应优先保留旧用户熟悉的卡片视图，后续再加入网格视图：

- 卡片视图适合移动端和稀疏字段；
- 网格视图适合桌面端批量编辑；
- 默认视图可以记入 v2 本地 UI 设置，底层表格模板数据保持纯净。

锁定能力必须保留：

- 行锁；
- 列锁；
- 单元格锁；
- summary / outline 编码索引列特殊锁。

视觉策略：

- 锁图标按需显示；
- 桌面端可在行头 / 列头 hover 或 focus 时显示工具条；
- 移动端提供行操作菜单和列操作菜单；
- 特殊索引锁放在表级或列级设置里，与普通单元格锁分区展示。

### 5.3 结构 / 参数配置

建议拆成短段落：

- 基本信息与列定义；
- 自动化更新参数；
- 表级 API 预设覆盖；
- AI 触发提示词：note / init / insert / update / delete；
- DDL，仅 SQLite 模式显示；
- 世界书注入配置；
- 固定条目注入配置，仅 summary / outline / important-persons 等适用表显示；
- 编码索引锁，仅适用表显示。

每段使用独立 `AcuPanel` 或 mode 内二级 segmented control。字段更新进入本地 draft，保存动作统一提交到底层。

### 5.4 全局注入配置

全局注入配置是模板级配置，作为独立入口和独立主区视图呈现。

建议：

- 表格列表底部独立入口；
- 移动端独立 chip；
- 进入后隐藏当前表 mode segmented；
- 主区只显示全局配置面板；
- AI 助手如果生成 `patch_global_injection_config`，diff 预览中单独列为“全局配置变更”并要求确认。

### 5.5 AI 改表助手

AI 助手 UI 可以重写 presentation 层实现，service 保持现有协议。

必须保留：

- 选择 / 继承表级 API 预设；
- 最大轮次；
- 会话运行、停止；
- 多轮过程展示；
- warnings；
- high risk confirmation；
- 应用草稿到 visualizer 临时态；
- baseline fingerprint 过期保护；
- 切表后草稿失效或标记为其他表草稿；
- lockChanges 应用。

必须改进：

- 文案表达“以当前表为锚点，可跨表修改模板”；
- 显示“当前锚点表”；
- diff 按作用域分组：
  - 当前表内容 / 结构 / 参数；
  - 其他表修改；
  - 新增表；
  - 删除表；
  - 表排序；
  - 全局注入配置；
  - 锁变化；
- 跨表、删表、DDL、全局配置变更进入高风险确认；
- 中小屏使用非常驻布局。

推荐形态：

- AI 助手作为主工作区 mode 可以接受，但必须在顶部信息条说明作用域；
- 或者作为“AI 助手”独立全屏 sheet，从当前 visualizer surface 打开；
- 第一阶段优先 mode，减少额外表层复杂度；diff 长内容可在 mode 内使用折叠区。

## 6. 状态与数据边界

### 6.1 v2 store

建议新增 `visualizer-store.ts`，职责：

- `currentSheetKey`
- `mode`: `data | config | assistant | global`
- `tempData`
- `sheetOrder`
- `deletedSheetKeys`
- `dirty`
- `externalRevisionChanged`
- 当前视图偏好：数据卡片 / 网格
- assistant UI 状态的最小持久部分
- 打开来源快照：进入前 v2 shell 返回目标、v2 shell 是否已打开、是否由外部 API 触发

store 承载轻量 UI 状态。复杂 service 编排放 composable。

### 6.2 composables

建议拆分：

- `useVisualizerData()`: 载入、刷新、工作副本、dirty 管理；
- `useVisualizerSheets()`: 新增、删除、排序、选择表；
- `useVisualizerContentEditing()`: 行列单元格编辑与锁；
- `useVisualizerConfigEditing()`: 单表结构与参数配置；
- `useVisualizerSave()`: 保存到当前聊天 / 全局模板；
- `useVisualizerAssistant()`: 调用 service/template-assistant、处理 transcript、diff、应用草稿；
- `useVisualizerLifecycle()`: visualizer surface 进入 / 关闭返回 / close guard。
- `useVisualizerExternalRefresh()`: 处理 v2 专用刷新入口到 store 的刷新握手；旧 `ACU_Visualizer_Refresh()` 在本计划继续归旧 visualizer 使用。

Vue 组件只调用 store / composable / UI 中立 adapter。

`AutoCardUpdaterV2API.openVisualizer()` 的外部打开入口由 v2 mount / shell 可访问的 UI 中立 open bridge 承载，负责打开 v2 shell、记录来源、进入 visualizer；surface 侧只处理载入、刷新、dirty 冲突和关闭保护。

### 6.3 presentation 兼容层

本计划不改 `src/presentation/**` 兼容层。旧外部 API 继续打开旧 visualizer；v2 visualizer 通过 `src/presentation-v2/**` 自己的 bridge 暴露新接口。

本计划目标适配：

```text
v2 表格模板预设面板 / 填表规则页按钮
其他前端主动调用 AutoCardUpdaterV2API.openVisualizer()
        │
        ▼
UI 中立 openVisualizerBridge()
        │
        ▼
presentation-v2 mount/surface bridge: open shell + enter visualizer surface
```

如果 v2 尚未挂载，bridge 负责挂载或请求挂载；如果挂载失败，保持 `false` 返回语义。

旧 `presentation/bootstrap/api-groups/data-admin-api.ts`、`settings-config-api.ts` 不进入本计划改动范围。这样旧 UI 点击“打开可视化表格编辑器”仍使用旧窗口，避免旧页面被动切走。

## 7. Shell、Surface 与关闭流程

目标流程：

1. 外部前端主动调用 `AutoCardUpdaterV2API.openVisualizer()`。
2. v2 全局 API 调用 `openVisualizerBridge()`。
3. bridge 记录进入来源：v2 shell 是否已打开、返回目标、触发来源。
4. bridge 确保 v2 app 挂载并打开 shell。
5. visualizer store 激活 `visualizer` surface。
6. `VisualizerSurface` onMounted 调用 `loadFromCurrentContext()`。
7. 如果已有未保存草稿，聚焦现有 surface 并提示。

内部按钮流程：

1. 表格模板 / 填表规则页按钮调用同一个 `openVisualizerBridge()` 或 surface action。
2. 通过 bridge 进入 visualizer surface。

关闭流程：

1. 用户点击 visualizer 关闭按钮或宿主关闭按钮。
2. 如果 dirty，走 v2 close guard，提供保存、丢弃、取消关闭。
3. 允许关闭后，根据进入来源恢复：
   - 进入前 v2 shell 已打开：回到进入前的 shell 返回目标。
   - 进入前 v2 shell 未打开：关闭 v2 shell。
4. 清理 visualizer surface 局部状态；明确需要跨关闭保留的草稿必须留在 store，且带 dirty 语义。

刷新流程：

1. 运行时调用 `AutoCardUpdaterV2API.refreshVisualizer()`。
2. 如果 visualizer store 已初始化，执行 `requestExternalRefresh()`。
3. 无 dirty 时直接刷新。
4. dirty 时标记冲突，显示常驻 warning，提供“重新载入外部数据”和“保留当前草稿”。

旧 `window.ACU_Visualizer_Refresh()` 在本计划仍属于旧 visualizer 刷新入口，不作为 v2 surface 的验收项。

## 8. 迁移阶段

### VZ-0 计划与接口冻结

- 确认旧对外 API 名称：`AutoCardUpdaterAPI.openVisualizer()` 继续保留并指向旧 visualizer。
- 确认 v2 对外 API 名称：新增 `AutoCardUpdaterV2API.openVisualizer()`。
- 确认 v2 refresh 入口：新增 `AutoCardUpdaterV2API.refreshVisualizer()`。
- 记录 service 契约边界。
- 补测试锁定旧 API 行为不被本计划改动，并锁定 v2 新接口行为。

### VZ-1 v2 surface 空壳与打开桥

- 新增 `surfaces/visualizer/VisualizerSurface.vue` 空壳。
- 新增 `visualizer-store.ts` 的 surface 激活状态。
- 在 `App.vue` shell 层接入 active surface 渲染：visualizer 打开时渲染 `VisualizerSurface`。
- 新增 open bridge。
- 实现进入来源记录与关闭返回。
- 安装 `AutoCardUpdaterV2API.openVisualizer()` 与 `AutoCardUpdaterV2API.refreshVisualizer()`。
- 表格模板 / 填表规则页按钮改为同一路径。
- 不改 `src/presentation/**`，旧 API group 继续调用旧 visualizer。
- 验证：v2 内部按钮与 `AutoCardUpdaterV2API.openVisualizer()` 可打开 v2 visualizer。

### VZ-2 数据载入、表格列表、保存闭环

- 实现 tempData / sheetOrder / deletedSheetKeys。
- 实现表格选择、新增、删除、排序。
- 实现保存到当前聊天 / 保存到全局模板。
- 先保留卡片数据编辑。
- 实现 dirty 与关闭保护。

### VZ-3 结构 / 参数 / 全局配置

- 迁移单表结构配置。
- 迁移更新参数、表级 API 预设、AI 提示词、DDL。
- 迁移世界书注入与固定条目配置。
- 迁移全局注入配置独立视图。
- 替换 prompt / confirm。

### VZ-4 AI 助手 Vue 化

- 用 v2 composable 调用现有 `runTemplateAssistantSession_ACU`。
- 重做 transcript、diff、风险确认、应用草稿 UI。
- service 协议保持冻结。
- 按“当前表锚点 + 可跨表变更”重新写文案和 diff 分组。
- 移除旧 addon / portal 依赖。

### VZ-5 响应式与可用性验收

- 桌面、平板、手机三档验证。
- 移动端表格列表横向 nav。
- AI 助手使用非常驻布局。
- 数据卡片 / 网格布局稳定，无挤压或重叠。
- 保存操作区在移动端可用。

## 9. 测试计划

### 单元测试

- store：载入、dirty、切表、删除当前表回退、外部刷新冲突。
- composable：新增 / 删除 / 排序、锁状态、保存路径。
- assistant：service mock 下的多轮、停止、warning、高风险确认、baseline 失效、应用草稿。
- bridge：v2 未挂载时打开、已挂载时导航、重复打开复用实例、失败返回 false。
- lifecycle：从 v2 内进入后关闭回原页；从外部进入且 v2 原本未打开时关闭 shell；dirty 时 close guard 可取消关闭。

### 集成测试

- 旧 `AutoCardUpdaterAPI.openVisualizer()` 在本计划仍调用旧 visualizer，防止误改 `src/presentation/**`。
- `AutoCardUpdaterV2API.openVisualizer()` 打开 visualizer surface。
- 表格模板 / 填表规则页按钮打开同一 visualizer surface。
- visualizer 打开时保留进入前的 shell 返回目标。
- 保存到当前聊天成功后 dirty 清零。
- 保存到全局模板成功后刷新模板状态。
- `AutoCardUpdaterV2API.refreshVisualizer()` 在 dirty / clean 两种状态下行为正确。
- 每个 `AcuPanel` 有常驻说明信息。

### 视觉 / 响应式验收

- ≥ 1024px：表格列表与主工作区并列，主区保留稳定宽度。
- 768-1024px：布局平滑收缩，表格列表可折叠或合理收缩。
- < 768px：表格列表为顶部横向 nav，底部保存按钮可点击，文本完整换行。
- < 480px：数据卡片、配置表单、AI diff 宽度受容器约束。

## 10. 风险与处理

| 风险 | 处理 |
|---|---|
| 外部脚本依赖旧 `openVisualizer` 返回值 | 本计划不改旧 API；需要 v2 的外部前端主动改调 `AutoCardUpdaterV2API.openVisualizer()` |
| 旧 `ACU_Visualizer_Refresh` 会在运行时任意时刻触发 | 本计划继续归旧 visualizer；v2 另用 `AutoCardUpdaterV2API.refreshVisualizer()` |
| AI 助手 service v2 协议可跨表修改 | UI diff 按作用域展示，危险项确认覆盖跨表影响 |
| surface 外层布局套用错误 | surface 外层使用专用工作台布局；结构、参数、全局配置、AI diff 等内部区域仍遵守 AcuPanel 规则 |
| visualizer 生命周期实现偏离 surface 模型 | 以 shell-level surface 管理生命周期；关闭后按进入来源恢复 |
| visualizer 承载形态回退到旧窗口模型 | 由 v2 shell 承载 header、主题、关闭保护和响应式布局 |
| 只改前端但旧保存逻辑复杂 | `useVisualizerSave()` 包裹现有保存 service / shared 契约 |
| 旧 presentation 与 v2 import 边界冲突 | 本计划不改 `src/presentation/**`，v2 bridge 保持在 `src/presentation-v2/**` 内 |

## 11. 完成标准

- v2 visualizer 可从 v2 表格模板页打开。
- v2 visualizer 可从 v2 填表规则页中的表格模板区域打开。
- `AutoCardUpdaterV2API.openVisualizer()` 可从酒馆其他前端主动改用并打开同一个 v2 visualizer。
- 旧 `AutoCardUpdaterAPI.openVisualizer()` 在本计划继续打开旧 visualizer，不作为 v2 surface 入口。
- visualizer 作为 shell-level surface 打开；关闭后能按进入来源回到原位。
- visualizer 由 v2 shell 承载。
- `AutoCardUpdaterV2API.refreshVisualizer()` 在 visualizer 打开时能刷新或提示冲突。
- 数据编辑、结构参数、全局配置、AI 助手、保存到当前聊天、保存到全局模板全部可用。
- 移动端使用顶部表格导航和非常驻 AI 布局。
- v2 代码通过 UI 中立 adapter / bridge 连接 v2 surface，不 import `src/presentation/**`。
- `src/service/template-assistant/**` 保持现有契约。
- 旧 visualizer、旧 UI 入口和旧窗口系统依赖保持现状；本版本不下线、不删除、不转发旧入口。

## 12. 未决项

- 数据编辑桌面端默认卡片还是网格。建议第一阶段卡片，第二阶段加入网格并记忆偏好。
- AI 助手是主工作区 mode，还是独立全屏 sheet。建议第一阶段 mode，避免额外表层。
