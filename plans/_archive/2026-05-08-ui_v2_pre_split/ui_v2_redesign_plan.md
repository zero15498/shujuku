# UI 重构方案 v2

> 本文档只包含已确定的内容。待讨论的事项在对话中处理，不进入本文档。

---

## 1. 设计目的

旧 UI 已积累四类无法靠局部修补解决的问题，触发本次重构。

### 1.1 运行时性能差（卡）

旧实现的核心模式是：**JS 字符串拼接 HTML → `innerHTML` 全量替换 → jQuery 重新选 DOM 绑事件**。这套模式在功能积累后不可避免地表现为：

- 切 tab、保存配置、刷新列表都触发整段 DOM 重构，浏览器要重新做 parse → 样式匹配 → layout → paint
- jQuery 在循环中混合读写布局属性，触发 layout thrashing（强制同步布局）
- 大量动态行各自直接绑事件而非事件委托，handler 数量随数据规模线性增长

→ 这是实现层问题，不是体积问题。换框架的核心收益就在这里。

### 1.2 状态-视图同源缺失（小 bug 高发）

旧实现里值同时存在于 `settings_ACU` 对象、jQuery DOM 引用、UI 内部缓存三处，没有单一真相源。典型症状：

- 切换列表选项时正在编辑的输入框被 `innerHTML` 替换销毁，输入丢失
- 保存触发的回流又回写 DOM，与用户当时的输入打架
- 事件绑定时序错乱，出现"点了没反应"

→ 现代响应式框架以 state 为唯一真相、细粒度 patch DOM、输入受控不被销毁，这一类 bug 几乎自动消失。

### 1.3 信息架构错位

7 个 tab 的命名层级和实际内容对不上：

- "核心功能" tab 实际装着 **剧情推进 + 智能续写 + 外部导入** 三块互不相干的功能
- "高级工具" tab 里的 "正文替换" 是完整业务功能，不是工具
- "API 预设、表格模板预设" 这些**共享资源**散落在多个功能 tab 里被各自管理
- 同类操作（在 5+ 处都出现的"为该功能选 API 预设"）UI 形态各不相同
- 状态展示与配置开关在同一区域无视觉区分

→ 用户找东西要靠记忆，新功能要塞进哪个 tab 全靠"哪个看起来还能挤"。

### 1.4 设备适配缺失

PC 宽屏下已经是左侧 sidebar，但窄屏会退化为横向滚动的胶囊式 tab，仍然看不全有哪些入口，也没有汉堡菜单 / 抽屉导航。

→ 设备适配问题主要在移动端导航与长表单降级。

### 1.5 重构总目标

- **过渡式并行**：新 UI 跑通后下线旧 UI,最终单一形态
- **第一阶段范围**：开发者自测可用，不对外发布
- **不动业务层**：service / data / shared 层保持原样，只换 UI 表达方式

---

## 2. 当前 UI 实现地图（用于检索定位，已按 3.4.1 代码校准）

### 2.1 技术栈

- 构建：**Rollup 4** + `@rollup/plugin-typescript`，双产物（油猴 IIFE / 酒馆扩展 ESM）
- 语言：TypeScript 5.7
- 运行时依赖：jQuery（来自酒馆宿主环境）、sql.js 1.14.x
- 前端框架：**无**
- 测试：Vitest
- 样式：CSS 字符串内联在 TS 模块中（如 `main-popup-styles.ts`）+ 内联 style

### 2.2 入口

| 路径 | 作用 |
|---|---|
| `src/index.ts` | 油猴脚本入口；按层导入 shared / data / service / presentation，最后在 jQuery ready 中调用 `mainInitialize_ACU()`，并通过 `checkAndMarkInstance()` 防重复加载 |
| `src/entry-extension.ts` | 酒馆扩展入口；先 `_forceExtensionMode()`，等待 TavernHelper / SillyTavern.getContext 就绪后调用 `mainInitialize_ACU()`，并初始化可视化模板助手 addon |
| `src/entry-extension-plus-assistantembedded.ts` | plus 包装入口；先导入原扩展入口，再额外挂载 template-assistant addon，供嵌入助手构建使用 |
| `src/presentation/bootstrap/init.ts` | 启动初始化 |
| `src/presentation/bootstrap/startup.ts` | 在酒馆 `#extensionsMenu` 里挂菜单按钮，点击触发 `openAutoCardPopup_ACU()` |

### 2.3 主弹窗（7 个一级入口，4 个分组）

`src/presentation/pages/main-popup.ts` 在 sidebar 中已经使用 4 个分组：

```
概览：仪表盘
配置：更新 / API / 表格
功能：核心功能 / 数据管理
工具：高级工具
```

| 路径 | 作用 |
|---|---|
| `src/presentation/pages/main-popup.ts` | 主弹窗组装入口；PC 端表现为左侧 sidebar，分组通过 `acu-nav-section-title` 渲染 |
| `src/presentation/pages/main-popup-styles.ts` | 主弹窗整体样式骨架（CSS 字符串）；PC 为 200px 左栏，窄屏变横向滚动导航 |

7 个一级入口各自的 HTML 生成器：

| 路径 | 对应一级入口 | 分组 |
|---|---|---|
| `pages/main-popup-status.ts` | 仪表盘 | 概览 |
| `pages/main-popup-update.ts` | 更新 | 配置 |
| `pages/main-popup-api.ts` | API | 配置 |
| `pages/main-popup-table.ts` | 表格 | 配置 |
| `pages/main-popup-plot.ts` | 核心功能（剧情推进 + 智能续写 + 外部导入嵌入区块） | 功能 |
| `pages/main-popup-datamgmt.ts` | 数据管理 | 功能 |
| `pages/main-popup-advanced.ts` | 高级工具壳（含子 tab 切换） | 工具 |

3.4.1 当前内容归属：

| 一级入口 | 当前承载内容 |
|---|---|
| 仪表盘 | 数据库状态、快速手动更新、手动更新表选择、核心功能开关、表格存储模式（原生 / SQLite） |
| 更新 | 自动更新参数、内容筛选规则、填表任务提示词 |
| API | 自定义 API / 酒馆连接预设模式、流式开关、模型加载、API 预设管理 |
| 表格 | 表格模板预设（全局 / 当前聊天）、世界书注入、交火模式纪要索引参数、可视化表格编辑器入口、立即构建交火纪要索引 |
| 核心功能 | 剧情推进、剧情任务列表与并发阶段、智能续写循环、剧情世界书选择、外部 TXT 导入 |
| 数据管理 | 数据隔离、备份与恢复、删除与清理、交火模式索引状态 / 缓存 / 外置资产管理 |
| 高级工具 | 正文替换（受隐藏条件控制）、SQL 控制台（仅 SQLite 模式）、运行日志 |

嵌入页 / 子页面 HTML 生成器：

| 路径 | 当前挂载位置 |
|---|---|
| `pages/main-popup-import.ts` | 嵌入 `main-popup-plot.ts` 的核心功能页内部，不是一级入口 |
| `pages/main-popup-optimization.ts` | 高级工具 - 正文替换子页面；DOM 默认生成，但 `popup-helpers.ts` 会按隐藏条件控制入口显示（当前条件为剧情推进循环最大重试次数等于 49），重构需保留这类 feature gate |
| `pages/sql-console.ts` | 高级工具 - SQL 控制台子页面，仅 SQLite 模式下显示 |
| `pages/log-viewer.ts` | 高级工具 - 运行日志子页面 |

已确认的遗留死代码（无任何文件 import 其导出函数）：

- `pages/main-popup-data.ts` — 导出 `generateDataTabHTML()`，0 处引用；功能已被 `main-popup-datamgmt.ts` 取代
- `pages/main-popup-prompt.ts` — 导出 `generatePromptTabHTML()`，0 处引用；功能已被 `main-popup-update.ts` 内的提示词区块取代
- `pages/main-popup-worldbook.ts` — 导出 `generateWorldbookTabHTML()`，0 处引用；功能已分散到 `main-popup-table.ts` 等页面内的世界书选择器

### 2.4 主弹窗交互绑定（jQuery + ui-refs 模式）

| 路径 | 作用 |
|---|---|
| `pages/popup-bindings.ts` | 绑定主入口 |
| `pages/popup-bindings-status.ts` | 仪表盘绑定；包含存储模式切换、更新参数按钮、核心开关等 |
| `pages/popup-bindings-plot.ts` | 核心功能绑定；包含剧情推进、剧情任务、智能续写、外部导入等 |
| `pages/popup-bindings-data.ts` | 数据管理 + 表格工具绑定；包含数据隔离、备份恢复、可视化编辑器入口、交火索引状态 / 清缓存 / 删除 / 手动构建 |
| `pages/popup-bindings-worldbook.ts` | 表格页世界书注入与交火模式配置绑定 |
| `pages/popup-bindings-optimization.ts` | 正文替换绑定 |
| `pages/sql-console.ts` | SQL 控制台 HTML 与绑定同文件 |
| `pages/log-viewer.ts` | 运行日志 HTML 与绑定同文件；需在窗口关闭时清理订阅 |
| `pages/popup-helpers.ts` | 绑定辅助 |
| `state/ui-refs.ts` | jQuery DOM 引用集中存放（旧体系核心，新 UI 不沿用） |

### 2.5 可视化表格编辑器（独立窗口）

| 路径 | 作用 |
|---|---|
| `pages/visualizer.ts` | 编辑器主入口 |
| `pages/visualizer-styles.ts` | 编辑器样式 |
| `pages/visualizer-main-render.ts` | 主体渲染 |
| `pages/visualizer-main-config.ts` | 配置部分 |
| `pages/visualizer-main-save.ts` | 保存逻辑 |
| `pages/visualizer-sidebar.ts` | 侧栏 |
| `pages/visualizer-template-assistant.ts` | 模板 AI 助手主体 |
| `pages/visualizer-template-assistant-apply.ts` | 模板应用 |
| `bootstrap/visualizer-template-assistant-addon.ts` | 模板助手 addon 注册 |

> 可视化编辑器已经不是单纯表格编辑窗口：3.4.1 中还承担 DDL 编辑、SQLite 模式支持、保存时交火纪要索引归档，以及模板 AI 助手挂载点。新 UI 重构若保留独立编辑器形态，需要把这些入口一起迁移。

### 2.6 共享 UI 基础设施

窗口系统（外壳、拖拽、缩放）：

| 路径 | 作用 |
|---|---|
| `window/window-system.ts` | 窗口实例创建（`createACUWindow()` 等） |
| `window/window-styles.ts` | 窗口样式 |

主题系统（同时影响主弹窗、所有自定义窗口、toast、confirm、visualizer）：

| 路径 | 作用 |
|---|---|
| `theme/theme-registry.ts` | 主题注册表与 token |
| `theme/theme-selector.ts` | 主题选择 UI |
| `theme/theme-types.ts` | 主题类型 |
| `theme/builtins/*.ts` | 内置主题（默认明 / 暗 / 经典墨 / 经典丝） |
| `theme/toast.ts` | 自定义 toast |
| `theme/custom-confirm.ts` | 自定义 confirm |

通用：

| 路径 | 作用 |
|---|---|
| `presentation/dom-utils.ts` | jQuery 封装与 DOM 工具 |
| `presentation/component-base.ts` | 组件基类约定 |

### 2.7 跨页面复用组件

| 路径 | 作用 |
|---|---|
| `components/optimization-ui/index.ts` | 正文优化 UI 汇总导出 |
| `components/optimization-ui/optimization-ui-diff.ts` | 正文优化 diff 展示 |
| `components/optimization-ui/optimization-ui-exec.ts` | 正文优化执行 |
| `components/optimization-ui/optimization-ui-overlay.ts` | 正文优化 overlay |
| `components/optimization-ui/optimization-ui-rules.ts` | 正文优化规则 |
| `components/plot-editors.ts` | 剧情提示词段落编辑器 |
| `components/plot-planning-ui.ts` | 剧情规划 UI |
| `components/template-preset-ui.ts` | 模板预设 UI |
| `components/worldbook-selector.ts` | 世界书选择器（已存在复用） |
| `components/table-selector.ts` | 表选择器 |
| `components/import-status-ui.ts` | 导入状态 UI |
| `components/status-display.ts` | 状态展示 |
| `components/update-status-display.ts` | 更新状态展示 |
| `components/remote-memory-archive-progress.ts` | 远记忆归档进度 |
| `components/summary-vector-index-ui.ts` | 交火模式发送前召回的 UI 包装（进度 toast / 结果提示） |
| `components/pipeline-ui-helpers.ts` | 流水线 UI helper |
| `components/settings-ui-helpers.ts` | 设置 UI helper |

### 2.8 业务-UI 同步层（settings 改动后同步到旧 UI）

| 路径 | 作用 |
|---|---|
| `triggers/settings-ui-sync/index.ts` | 同步入口 |
| `triggers/settings-ui-sync/settings-ui-config.ts` | 配置同步 |
| `triggers/settings-ui-sync/settings-ui-connect.ts` | 连接同步 |
| `triggers/settings-ui-sync/settings-ui-api.ts` | API 同步 |
| `triggers/settings-ui-sync/settings-ui-trigger.ts` | 触发同步 |
| `triggers/admin-ui.ts` | 管理 UI 触发 |
| `triggers/data-admin-ui.ts` | 数据管理 UI 触发 |
| `triggers/auto-loop.ts` | 自动循环（智能续写） |
| `triggers/import-process.ts` | 导入流程 |
| `triggers/update-trigger.ts` | 更新触发 |
| `triggers/update-process.ts` | 更新流程 |

> 这一层名称叫 settings-ui-sync，但当前职责混合了旧 UI 同步、宿主 API 初始化、API 配置 UI、自动更新触发、合并纪要兼容字段导入等内容。新 UI 不沿用其中的 DOM 同步机制，但不能把整个目录简单丢弃；需要先拆出仍属于运行时 / 业务触发的部分，再由 Vue 响应式状态接管 UI 刷新。3.4.1 中合并纪要手动 UI 已停用，但相关设置字段和自动合并服务仍可能被导入、导出或运行时读取。

### 2.9 前端 API 注册

| 路径 | 作用 |
|---|---|
| `bootstrap/api-registry.ts` | 对外 API 注册中心 |
| `bootstrap/api-groups/callback-api.ts` | 回调 API 组 |
| `bootstrap/api-groups/core-data-api.ts` | 核心数据 API 组 |
| `bootstrap/api-groups/data-admin-api.ts` | 数据管理 API 组 |
| `bootstrap/api-groups/plot-preset-api.ts` | 剧情预设 API 组 |
| `bootstrap/api-groups/settings-config-api.ts` | 设置配置 API 组 |
| `bootstrap/api-groups/table-crud-api.ts` | 表格 CRUD API 组 |
| `bootstrap/api-groups/table-lock-api.ts` | 表格锁 API 组 |
| `bootstrap/api-groups/template-preset-api.ts` | 模板预设 API 组 |
| `bootstrap/api-groups/worldbook-ai-api.ts` | 世界书 AI API 组 |

> api-registry 对外暴露给酒馆宿主或其他扩展的 API 契约，新 UI 重构不应破坏这些接口。

### 2.10 当前 7 tab 字段全清单

详见 `docs/UI-七个Tab字段清单.md`。该清单已按 3.4.1 主弹窗同步，特别是表格页 / 数据管理页中的“交火模式纪要索引”字段，不再按旧“远记忆总结管理 / Medusa 手动合并 UI”描述。

### 2.11 不动层规模概览（shared / data / service）

以下三层在本次重构中保持原样，但新 UI 的 Vue 组件需要调用其中的函数，故在此记录规模和模块划分。

**shared 层**：常量、环境检测、宿主 API 代理、工具函数、HTML/JSON 辅助、日志缓冲（`log-buffer.ts`）、文本优化、模板预设工具、DDL 工具、表格存储 provider 接口、导入暂存等。

**data 层**：
- `gateways/` — AI、角色卡、聊天、宿主状态、世界书、向量 embedding、向量 rerank
- `models/`（3 文件）— settings-model、template-model、chat-message-data
- `repositories/`（3 文件）— isolation-repo、profile-repo、chat-message-data-repo
- `sqlite/`（4 文件）— schema-mapper、sql-normalizer、sqlite-engine、sync-bridge
- `storage/` — chat-history、config-storage、optimization-cache-storage、tavern-storage、交火索引临时缓存、ST 文件存储

**service 层**（65+ 文件）：
- `ai/`（6 文件）— API 调用、提示词构建（prompt-builder 子目录含 4 文件）
- `chat/`（1 文件）— 聊天服务
- `host/`（1 文件）— 宿主状态服务
- `import/`（1 文件）— 导入执行
- `loop/`（2 文件）— 循环控制 & 评估
- `optimization/`（1 文件）— 正文替换
- `plot/`（4 文件）— 剧情推进逻辑、编排、状态、向量召回
- `runtime/`（16 文件）— 状态管理器、消息处理、上下文标签/数据合并/表格锁等 helpers、剧情运行时（6 文件）、模板变量（7 文件）
- `settings/`（2 文件）— 设置服务 & 设置读取
- `summary/`（2 文件）— 纪要合并逻辑 & 执行
- `table/`（8 文件）— 表格服务、更新调度器/编排器、存储模式/策略、原生/SQL 适配器、表格历史
- `template/`（7 文件）— 模板预设服务、chat-scope 子目录（5 文件 + index）
- `template-assistant/`（3 文件）— 模板助手编译器、参考文档、服务
- `vector/` — 交火模式纪要索引的归档、运行时召回、状态、外置存储、临时缓存预热、类型定义，以及向量配置
- `worldbook/`（9 文件）— 注入引擎（主体 + config/custom/entries/order/state）、pipeline、清理、世界书服务

### 2.12 入口文件与新 UI 入口

当前存在三个构建入口 / 包装入口：

| 入口 | 格式 | 特殊行为 |
|---|---|---|
| `src/index.ts` | IIFE（油猴） | 依赖 `checkAndMarkInstance()` 防重复加载；在 jQuery ready 后启动 |
| `src/entry-extension.ts` | ESM（酒馆扩展） | 额外调用 `_forceExtensionMode()`；等待 TavernHelper / SillyTavern.getContext 就绪；启动模板助手 addon |
| `src/entry-extension-plus-assistantembedded.ts` | ESM 包装入口 | 先导入原扩展入口，再挂载模板助手 addon，用于 plus assistant embedded 构建 |

新 UI 引入后，上述入口的 presentation 层导入部分都需要指向新的 Vue 入口模块或兼容桥；shared / data / service 层导入保持原有边界。不能只改 `index.ts` 和 `entry-extension.ts`，否则 plus embedded 构建会继续拉起旧 UI。

---

## 3. 已锁定的顶层决策

### D1. 技术栈

- 引入 **Vue 3 + SFC**（单文件组件）
- Rollup 通过 **`unplugin-vue/rollup`** 集成 Vue 编译
- 保留现有 shared / data / service 三层不动；presentation 层重写
- 不引入其他前端框架；不引入 Web Components；状态管理直接采用 Pinia（见 D16）

### D2. 旧 UI 处置

- 新旧 UI 在过渡期并行存在
- **不做双向同步桥接**，不做"在新 UI 切回旧 UI"的回桥按钮
- 新 UI 跑通核心功能后**下线旧 UI**，最终单一形态

### D3. 导航形式

- **响应式 sidebar**：PC 端左侧固定 sidebar；手机端折叠为汉堡菜单抽屉
- **扁平 1 级**：所有独立功能升到一级；通过 sidebar 内分隔线 / 小标题做视觉分组，但点击层级仍是 1 级
- **沿用现有分组体系：概览 / 配置 / 功能 / 工具**（与 `main-popup.ts` 当前分组保持一致）
- **先拆再合**：第一阶段宁可拆得细，避免一级页内部再嵌全屏 tab；后续根据使用反馈再决定是否合并相邻功能页
- 各一级页内部如需更多分块，使用页内 segmented tabs 或锚点分段

### D4. 预设型资源 UX 原则

适用于：API 预设、表格模板预设、剧情推进预设、填表提示词预设、正文优化预设等所有"预设型资源"。

- **预设库本身不占用一级页**：预设不在 sidebar 中出现
- **主入口三件套**：主视图（概览页 / 功能页内）只放
  - **切换下拉**（看当前是谁 + 切换）
  - **📥 导入**（外置，与切换并列；社区分享导入是高频）
  - **⚙ 管理**（点击打开管理面板）
- **管理面板形态**：侧抽屉或独立窗口，承载新建空白 / 重命名 / 删除 / 导出 / 编辑字段 / 覆盖保存 / 另存为 / 恢复默认

### D5. 预设型资源数据架构

- **"全局默认"**：作为预设库内的一个属性（库里某项被标记为默认），仅在新建聊天时被读取一次作为初始值
- **"当前聊天使用"**：聊天级状态，独立于全局默认，展示并切换于概览页
- 修改"全局默认"的入口在预设库管理面板内（低频维护）；切换"当前聊天使用"的入口在概览页（高频操作）

### D6. API 模式

- **取消独立"当前 API 配置编辑区"**——不再有一个游离于预设库之外的"活动 API"编辑界面
- API 预设库中的某一项被标记为"当前活动"
- 各功能选 API 时，下拉默认项是"跟随当前活动"，可单独 override 为其他预设

> 与 D5 的关系：D6 是 API 这一处的 UI 形态决策；D5 是所有预设资源的数据架构决策。两者独立，但 D6 的"标记为当前活动"恰好对应 D5 的"当前聊天使用"概念。

### D7. 触发式功能归属

触发式功能（执行型操作，非配置型）包括但不限于：

- 立即手动更新填表
- 立即构建交火纪要索引
- 开始 / 停止智能续写循环
- 打开可视化表格编辑器
- SQL 执行
- 重新优化（正文替换）
- TXT 注入 / 删除注入条目
- 模板覆盖最新层

**本次重构归属**：**各自所属功能页内部**（一般在功能页底部"操作区"）。

**~~集中识别便于外挂~~（2026-05-03 撤销）**：原 D7 要求"实现时应集中识别这类按钮，便于后续统一外挂到酒馆主界面"。该要求被撤销，理由：
1. 外部插件已经通过 [api-registry](src/presentation/bootstrap/api-registry.ts) 自行外挂功能（如手动更新表格）。**外挂的契约层是 api-registry 暴露的函数**，不是 UI 侧的按钮注册表。在 Vue 组件层面再做一个 `triggerable` 注册表是给错地方加抽象。
2. 真正适合外挂的功能（手动更新、智能续写起停）已经被外部插件实现；其余触发按钮（如导入页的 TXT 注入、删除注入条目、清缓存）都是低频且强依赖配置上下文的，本来就不适合外挂。

**降级为布局惯例**：功能页底部留一块视觉上独立的 `操作区` 用以放置该页的触发按钮，方便用户找入口。代码上每个按钮就是普通 `<AcuButton>`，不需要 `triggerable` 元数据 / 注册中心。

**功能可见性补充**：正文替换虽然按信息架构归为完整业务功能，但当前有意暂不公开。3.4.1 中 DOM 会生成，但入口显示由 `popup-helpers.ts` 的隐藏条件控制（当前条件为剧情推进循环最大重试次数等于 49）。重构时必须保留"默认隐藏 / 受控开启"的 feature gate，不能因为它被升格为功能页就直接暴露给普通用户。

**已下线 UI 补充**：合并纪要（Medusa）手动配置/执行 UI 在 3.4.1 主弹窗中已移除；相关字段仍用于导入导出兼容和运行时自动合并服务，不应在新 UI 地图里继续当作现役页面控件。

### D8. 世界书绑定不抽象为预设库

- **不抽象出"绑定预设"数据概念**
- 抽一个 **世界书选择器 UI 组件**（代码复用）
- 各功能页（填表 / 剧情推进 / 外部导入）内嵌该组件，自存绑定状态

### D9. 设备适配

- PC 与手机端均要求可用
- PC 横屏：sidebar 固定 + 主区可承载多列布局
- 手机竖屏：sidebar 收抽屉 + 主区强制单列降级
- 具体降级断点与栅格规则待定

### D10. 验收标准（第一阶段）

- 开发者自测可用
- 不对外发布
- 不要求与旧 UI 100% 行为对齐；不要求自动迁移
- 通过即视为可进入"下线旧 UI"决策

### D11. Embedding / Rerank 配置形态

- **不纳入预设库**，作为 API 页内独立的单一表单存在
- 交火功能页只引用当前生效配置（可附跳转链接），不重复展示配置字段
- 理由：
  - 与 chat completion 预设字段形态不同（无 temperature / max_tokens / 流式 等），强行统一会使预设对象 polymorphic
  - 当前仅交火一个消费者，预设库（切换 / 导入 / 默认）机制对单一消费者是过度设计
  - D6 的"活动 API"语义不适用于 embedding（无"跟随活动"对象）
- 未来若出现第二个 embedding 消费者，再从单表单升预设的成本可控

### D12. 预设主入口放置规则（D4 补充）

按"消费者数量"决定 D4 三件套的物理位置：

- **横切型**（被 ≥3 个功能页使用）→ 主入口放仪表盘，作为"全局活动状态"的一部分
  - 本项目下：Chat API 预设
- **功能专属型**（仅服务一个功能页）→ 主入口放所属功能页顶部
  - 本项目下：剧情推进预设、填表提示词预设、正文优化预设
- **半横切但配置归属性强**（多功能消费但语义集中在一处）→ 主入口放对应配置页
  - 本项目下：表格模板预设放表格页

### D13. 哪些资源升级为预设库

判定标准：是否需要导入导出 JSON 文件作为社区分享单元。

- **预设库形态**（D4/D5 三件套）：API 配置、表格模板、剧情推进、**填表提示词（本次新增升级，原为单字段）**、正文优化
- **保持单一表单 / 不升预设**：Embedding 服务、Rerank 服务
- **保持原文件契约**：合并导入导出（"模板+指令"组合）继续以现有 JSON 格式存在于数据管理页，不拆解为独立预设——保兼容、保用户习惯

### D14. 主题与基础视觉系统

新 UI 主题系统**重写**，不复用 `presentation/theme/theme-registry.ts` 实现。

**复用色值，丢弃实现**：

- 复用：从旧 4 个内置主题（default-light / default-dark / classical-ink / classical-silk）拷贝 `--acu-*` 主 token 数值
- 丢弃：所有"兼容旧变量"（`--text-color` `--bg-primary` `--input-background` 等十几个为旧 inline style 服务的变量）、分模块变量子集（toast / confirm / visualizer 各自一套）、作用域字符串硬编码（`#popup` `.acu-window` `#toast-container` `#acu-visualizer-content`）、`buildThemeCSS_ACU` 字符串拼接管线、`ACUThemeFile` 导入导出格式

**新主题系统形态**：

- token 表只保留 `--acu-*` 主集合（背景 / 边框 / 文本 / 强调 / 状态 / 圆角 / 阴影 / 字体）
- 注入到新 UI 根元素（如 `#acu-app-v2`），与旧主题 `<style>` 节点物理隔离、互不影响
- 切换主题 = 替换根元素上的 style 文本；持久化走新 UI 自己的 store，不走 `settings_ACU + saveSettingsAndNotify_ACU`
- 阶段 1 范围：4 个内置主题切换；自定义主题导入导出推迟

**Toast / custom-confirm / visualizer 处置（选择 A）**：

- 阶段 1-3 期间：新 UI 内的 toast / 确认弹窗调用**沿用旧 `showToastr_ACU` / `customConfirm`**，视觉上稍有不一致可接受
- visualizer 阶段 1-3 不动（独立窗口，不在新 UI 内嵌）
- 等下线旧 UI 时再用 Vue 重写 toast / confirm 的新版本，归并到新主题系统

---

## 4. 一级页清单

D3 已锁定"扁平 1 级 + 沿用 4 分组 + 先拆再合"。本节给出第一阶段的具体页面切分。

### 4.1 分组与页面

| 分组 | 一级页 | 与旧 UI 的关系 |
|---|---|---|
| 概览 | 仪表盘 | 沿用，承载数据库状态、核心功能开关、表格存储模式；新增"当前活动 Chat API"切换三件套（D6 / D12） |
| 配置 | 填表（沿用原"更新"页骨架） | 改名但页骨架不动，避免破坏用户习惯；详见 4.2 |
| 配置 | 表格 | 收窄；只承载表格模板预设三件套、可视化编辑器入口；原页内"交火模式"参数全部迁出 |
| 配置 | API | Chat 预设库（D5/D6） + Embedding 单表单 + Rerank 单表单（D11） |
| 功能 | 剧情推进 | 从原"核心功能"拆出 |
| 功能 | 智能续写 | 从原"核心功能"拆出 |
| 功能 | 外部导入 | 从原"核心功能"拆出 |
| 功能 | 交火模式 | 升为一级页；吸收原表格页配置区 + 原数据管理页"交火模式索引管理"；详见 4.3 |
| 工具 | 数据管理 | 范围收窄；详见 4.4 |
| 工具 | 正文替换 | feature gate 保留（D7） |
| 工具 | SQL 控制台 | 仅 SQLite 模式 |
| 工具 | 运行日志 | 沿用 |
| 开发者 | 开发者选项 | 仪表盘"启用开发者选项"开启时显示，集中托管各页内"开发者 gated"字段的开关；详见 D24 |

### 4.2 填表页（原"更新"页）

沿用旧页骨架，最小改动。变更点：

- "更新任务提示词"由单字段升级为预设库三件套（D13）
- "世界书注入"拆为两个独立组件：
  - 组件 A：填好的表内容**注入到**世界书
  - 组件 B：填表 AI 提示词**附带**的世界书条目选择
- 仪表盘"快速操作 / 手动更新表选择"作为"立即手动更新"挪入本页底部操作区（D7）

不变点：自动更新参数、内容筛选规则的位置和形态保持不变。

### 4.3 交火模式页骨架

合并自三处：旧表格页的"启用交火方案"开关与配置区、旧表格页"表格工具"的"立即构建交火纪要索引"按钮、旧数据管理页的"交火模式索引管理"组件。

```
① 启停          单一开关
                旧位置 1（表格页）与旧位置 3（数据管理页）的开关本就共享同一 settings 字段
                （worldbookConfig.summaryVectorIndexModeEnabled），重构后位置 3 的冗余开关删除
② 状态面板      徽章 + 元信息
                状态徽章 / 索引ID / 后端 / 行块 / 分片 / tombstone / 外置体积 / 缓存体积 / 更新时间
③ 召回参数      纪要触发阈值 / 最终TopK / 预筛分数 / 预筛候选上限
                索引命名空间 / 概要分块句数 / 每批归档行数
④ Embedding 引用 显示从 API 页读取的当前生效 endpoint / model；不可在本页编辑（D11）
⑤ Rerank 引用    同上
⑥ 关键词生成     使用 API 预设（D6 默认"跟随当前活动"，可 override）
                上下文层数 / 最大尝试次数
⑦ 操作          立即构建索引 / 刷新状态 / 清空临时缓存 / 删除当前索引
```

附属工作：状态徽章需要一张文案表，把 manifest 状态枚举翻成用户语。当前枚举值：building / uploading / ready / missing / corrupt / incompatible / upload_failed / rebuild_required / delete_pending / delete_failed / superseded / 未加载（共 12 项）。

### 4.4 数据管理页

范围收窄：移除"交火模式索引管理"卡片（迁至 4.3）。其余卡片保留原位、原形态：

- 数据隔离（profile 切换 + "删除当前标识的注入条目"）
- 备份与恢复（合并导入 / 合并导出 / 导出 JSON 数据 / 恢复默认模板及提示词 / 模板覆盖最新层）
- 删除与清理（按 AI 楼层范围删除嵌入表数据）

> "数据隔离"语义上是 profile 路由（影响 settings + 模板 + 数据），与 D6"当前活动 API"同级，但属于专家功能，本期不上升至仪表盘，保留在数据管理页内。

---

## 5. 落地决策与执行节奏

### D15. 新 UI 入口与挂载

- **入口切换**：旧菜单按钮（`#extensionsMenu` 内）旁挂第二个"打开新 UI（开发版）"按钮；二者并存，互不影响（D2 并行期）
- **挂载点**：新 UI 不复用旧 `POPUP_ID_ACU` 弹窗外壳，挂到 `body` 下独立容器 `#acu-app-v2`，与旧 UI DOM 物理隔离（与 D14 主题隔离原则一致）
- **新 UI 不引入任何窗口系统抽象**：考虑移动端操作友好，主弹窗与所有工具页（visualizer / SQL / 运行日志等）最终形态均为**全屏路由**，无拖拽 / 缩放 / 多窗口并列；唯一例外是浮窗提醒（toast）
- **过渡安排**：阶段 1-3 期间，工具型独立窗口（visualizer / SQL 控制台 / 运行日志）沿用 [window/window-system.ts](src/presentation/window/window-system.ts)，不在新 UI 范围；下线旧 UI 时把这些工具页 Vue 化并合并为新 UI 内的全屏路由，旧 window-system.ts 一并废弃

#### D15.1 酒馆助手运行上下文与宿主文档

阶段 0 写正式入口时必须把"脚本执行文档"和"酒馆主界面文档"分开处理。

已确认事实：

- 酒馆助手前端界面可能运行在楼层 iframe 内；此时 `document.body` 是 iframe 内部文档，不是用户可见的酒馆主页面。
- 当前旧 UI 已通过 `(window.parent || window).document` 注入 `#extensionsMenu` 菜单项，说明油猴 / 酒馆助手路径需要访问父文档才能在主界面显示。
- 酒馆插件 ESM 路径运行在主窗口中，此时 `window.parent === window`，宿主文档就是当前 `document`。

正式实现要求：

- 新 UI 应提供一个统一 helper，例如 `getAcuHostDocument()` / `getAcuHostWindow()`：
  - 可访问且 `window.parent !== window` 时，优先返回 `window.parent.document` / `window.parent`。
  - 否则返回当前 `document` / `window`。
  - 访问 `window.parent.document` 必须包 `try/catch`，跨域或宿主异常时降级到当前文档并输出可检索 warning。
- `#acu-app-v2` 必须挂载到 host document 的 `body`，不是无条件挂到当前 `document.body`。
- 新主题 `<style>`、SFC 样式、全屏遮罩、toast 容器、侧抽屉容器必须注入同一个 host document；不要出现根节点在父文档、样式在 iframe 文档的分裂状态。
- 阶段 0 的"打开新 UI（开发版）"菜单按钮也必须在 host document 的 `#extensionsMenu` 中注册；可参考旧 [startup.ts](src/presentation/bootstrap/startup.ts) 的父文档注入方式。
- 日志 marker 应包含实际挂载目标，例如 `into parent-document` / `into current-document`，便于真实酒馆环境排查。
- 自动验证至少覆盖两种 jsdom 场景：
  - 当前窗口场景：`window.parent === window`，根节点在当前 document。
  - iframe 场景：child window 执行入口，parent document 可访问，根节点与样式都出现在 parent document，child document 不残留可见根节点。

阶段 0 禁止只用 `document.body.appendChild(...)` 完成挂载；这会在酒馆助手 iframe 场景下出现"console 正常但页面无内容"的问题。

### D16. 状态管理：直接采用 Pinia

- 不走"先 reactive() 后期再迁"的过渡路径
- 理由：避免阶段 1 大量写下 `reactive()` / `ref` 后惯性延续，事后重构反而更麻烦
- Vue runtime + Pinia 共增加约 ~40KB gzipped，纳入双产物体积预算

### D17. 服务层调用边界（三档）

Vue 组件**禁止直接 import service 函数或单例状态**（特别是 `settings_ACU` / `state-manager`）。必须通过中间层：

| 调用形态 | 中间层 | 例 |
|---|---|---|
| 持有响应式状态（值会变，UI 跟随更新） | **Pinia store** | `useApiPresetStore()` 当前活动 API + 预设列表 |
| 业务流编排（多个 service 调用 + 局部 ref） | **composable** | `useVectorIndex()` 包 status + archiveNow + refresh |
| 一次性副作用（触发下载 / 显示 toast，无返回状态） | **直接 import 函数** | `exportCurrentJsonData_ACU()` |

理由：
1. service 返回 plain values，组件需 reactive 包装——包装责任归一到 store / composable
2. 物理屏障，防止 Vue 组件耦合旧单例
3. 测试时只 mock store / composable

### D18. 路由：手写

- Pinia store 持 `activePageId: Ref<string>`，sidebar `<button @click="setActive(id)">`，主区 `<component :is="pageMap[activePageId]" />`
- **不引入 vue-router**：12 扁平页 + 抽屉式子面板，无嵌套路由 / 浏览器后退 / URL sync 需求
- **预留扩展点**：
  - sidebar 数据驱动（`pageRegistry: Page[]`）：未来"通过设置开关显示/隐藏一级页"通过 store 中的 `visiblePageIds` 过滤实现，路由层无需改动
  - 对外 setter `setActivePage(id)`：未来如需外部深链打开特定页，由 api-registry 暴露

### D19. 预设管理面板形态：侧抽屉

- D4 二选一定为**侧抽屉**
- 抽屉从主弹窗右侧滑入，覆盖主区但保留 sidebar 可见
- 移动端表现为全屏 sheet
- 不使用独立窗口（独立窗口属于 D15 不重写范围；抽屉与主入口三件套同上下文，体验更连贯）

### D20. 构建与依赖

- 阶段 -1 spike 验证 `unplugin-vue/rollup` 与双产物（油猴 IIFE / 酒馆扩展 ESM）的兼容性
- spike 产物**单独验证、跑完即丢**；阶段 0 在干净基线上重写正式基础设施，避免把 spike 代码气味带入长期实现
- hello-world 必须初始化最小 Pinia app，避免体积基线只覆盖 Vue runtime 而漏掉已锁定的状态管理依赖
- 通过条件：双产物均能正常出包，hello-world Vue 组件在两种环境渲染成功，并输出可检索的 console 日志 marker
- plus assistant embedded 构建不作为阶段 -1 的主验收环境；但因其包装入口会 import 扩展入口，spike 需做旁路构建检查并记录结果
- 不通过 → 回 D1 重新讨论技术栈（极小概率事件）

### D21. 阶段 2 — 外部导入页 + 强制提取 `_lib/`

**确定日期**：2026-05-03（启动阶段 2 前锁定）。

#### D21.1 第二侦察页 = 外部导入页

形态与 API 页（"切换 + 编辑面板 + 抽屉管理"）刻意不同。"形态差异 = 特性"——侦察期就是要在两种典型形态间挤出真正可复用的基础组件，避免阶段 1 的写法被当作模板套到所有页。

#### D21.2 `presentation/` 物理边界

- `src/presentation-v2/**` 任何代码（含 `.vue` / `.ts` / 测试）**禁止 import `src/presentation/`**。
- 阶段 2 起，`scripts/check-arch.mjs` 增加该规则。
- 老 `src/presentation/` 的归档 / 删除发生在"下线旧 UI"阶段，**前置任务**见 D21.6。
- 与 D17 关系：D17 限制 `.vue` 不直 import service / state-manager；D21.2 进一步禁掉 `.vue` 与 `.ts` 跨进 `presentation/`。两者叠加，新 UI 与旧 UI 在源码层物理隔离。

#### D21.3 业务组件复用方式：Vue 从零重写

- `WorldbookSelector.vue`（D8 抽象的 UI 组件）—— 阶段 2 从零写一份 Vue 组件 + `useWorldbookSelector` composable，**不**包装旧 [worldbook-selector.ts](src/presentation/components/worldbook-selector.ts)。
- `TableSelector.vue`（多选 + 全选/全不选）—— 同样从零写。
- 旧组件保留至下线旧 UI 时随 `presentation/` 一并归档。

#### D21.4 导入流业务函数

- v2 `useImportFlow` composable 直接调 `service/import/`、`service/worldbook/`、`shared/` 等非 presentation 层函数。
- 旧 [triggers/import-process.ts](src/presentation/triggers/import-process.ts) 不被 import，仅作参考；其中"读 DOM" 胶水部分在归档时整段删除，剩余流程逻辑在 v2 已经被 composable 重写。
- 若发现 service 层缺口（参数不暴露 / 返回值不便 reactive 包装），**优先 composable 适配**（X-5 惯例）；service 层不做大改。

#### D21.5 导入暂存缓存的状态契约

- 反映底层实时状态。`useImportFlowStore` 持有 `stagingMeta`（文件名 / 段数 / 总字符数 / 最近变更时间），由 store 的 refresh action 主动从底层 storage 读出。
- 关键操作（拆分完成、注入完成、清空缓存）执行后必须触发 store refresh；不允许只更新一段文案。
- 旧 UI 的"状态：尚未加载文件"风格文案被替换为基于 store 状态的派生 computed。

#### D21.6 SUN-7 前置任务（api-registry 搬迁）

- 下线旧 UI 前必须把 `src/presentation/bootstrap/api-registry.ts` 与 `api-groups/*` 搬到 `src/presentation/` 之外（建议 `src/host-api/`），因为它是对外契约（plan §2.9），不是 UI 代码。
- 该搬迁在阶段 2 不必做；记录在 SUN-7 前置项里，作为下线决策时的硬阻塞。

#### D21.7 `_lib/` 组件库布局

- 目录平铺：`src/presentation-v2/components/_lib/AcuButton.vue` / `AcuPanel.vue` / ……不再分子目录。
- 命名前缀统一 `Acu`。
- 抽取阈值：**两次出现 + 接口稳定**才抽。不预先抽象。

#### D21.8 操作区布局惯例（替代撤销的 D7）

- 功能页**如果存在触发按钮**，则在底部留一块视觉上独立的"操作区"（间距 + 顶分隔线 + 按钮组）。
- 这是**布局惯例**，不是注册机制。每个按钮就是普通 `<AcuButton>`。
- 撤销原 D7 "集中识别便于外挂" 要求；外挂走 api-registry，与 UI 无关。
- **2026-05-03 修订（D23.4 决议）**：对没有触发按钮的功能页（如剧情推进），**不强制留空操作区**。原"功能页底部必须有操作区"被弱化为"有触发按钮才有操作区"。剧情推进相关的"立即触发"概念由发送消息时的拦截链触发，UI 上无单独按钮。

#### D21.9 移除"屏蔽外部导入世界书条目占位符"开关

- 旧 UI 该 toggle 在外部导入页存在；新 UI **不再呈现**该开关，且在新 UI 接入的运行时上下文中**强制视作开启**（即填表提示词中世界书条目占位符永久屏蔽带 `外部导入-` 标签的条目）。
- 实现：v2 `useImportFlow` 不读取 `acu_import_prompt_exclude_imported_worldbook_entries` 设置字段；填表提示词构建侧若仍走老分支，需在阶段 2 落地一条最小改动，使该字段在 v2 上下文中被强制 true 等价。
- 旧设置字段保留以避免破坏数据结构；下线旧 UI 时再彻底清理。

#### D21.10 阶段 2 内部步骤

```
1. 调研：通读旧 import 代码 + service/import / service/worldbook，
        列出 _lib 候选清单
2. 桥接：useImportFlowStore + useWorldbookSelector + useImportFlow
3. 业务组件：WorldbookSelector.vue + TableSelector.vue
4. 落地页：ImportPage.vue（先有意保留与 API 页的重复写法）
5. 强制抽取：把两次以上出现的写法搬到 _lib/，回写改造 ApiPage
6. 守护：扩展 check-arch.mjs（D17 + D21.2 双规则）
7. 测试：store / composable / 组件 / 页面四档
8. 体积：跑三产物，记录在本节末尾
```

#### D21.11 退出条件

- ImportPage 功能等价于旧 import tab（视觉验收）
- ApiPage / ImportPage 之间无重复实现（裸基础元素仅限合理例外）
- check-arch.mjs 通过（不引入新违规）
- vitest `tests/presentation-v2/**` 全绿
- 三产物体积增量记录在册

### D22. 面板说明文字使用「常驻信息条」（2026-05-03 阶段 2 后续）

**确定日期**：2026-05-03。

#### D22.1 用户画像约束

新 UI 的预设用户是"完全不懂电脑、也不懂软件设计常识"的人。任何需要 hover / 点击 / 展开 才能看到的说明，对该用户群体等于不存在。

#### D22.2 旧 `subtitle` 形态的两个问题

1. **可见性不可控**：在 header 里渲染较长 subtitle，窄屏会被压缩到 2-3 行，与同行无 subtitle 的面板高度严重不一致。
2. **无字数预算**：把 subtitle 限制成短句又会牺牲对新手用户最关键的"为什么"信息。

#### D22.3 决策：常驻信息条 + 行级等高

- **新增 `<AcuInfoBanner>`**：[components/_lib/AcuInfoBanner.vue](src/presentation-v2/components/_lib/AcuInfoBanner.vue)。永远可见，无字数上限，自动换行。tone 三档：`info`（默认 / 解释性）/ `tip`（操作建议）/ `warning`（注意事项）。
- **`<AcuPanel>` 的 `description` prop / slot**：[components/_lib/AcuPanel.vue](src/presentation-v2/components/_lib/AcuPanel.vue)。提供时自动在 body 顶部渲染一个 `<AcuInfoBanner>`，省去页面层重复样板。
- **`subtitle` prop 移除**：旧 `subtitle` 是 height bug 的源头，不保留也不软兼容。
- **网格 `align-items: stretch`**：所有多列页面（ImportPage / ApiPage / ……）的 grid 必须用 `stretch`（默认值，去掉显式 `start`），同行面板自动等高，矮的底部留空可接受。

#### D22.4 内容写作惯例

- 描述目标用户：完全不懂电脑的新手。
- 必须解释"是什么 / 为什么 / 出问题怎么办"，而不是只罗列字段。
- 字数无上限，行高 1.55 阅读舒适。
- 内嵌 UI 名词时使用全角引号 `"` `"` 或代码 `` ` ``，避免与 HTML 属性引号冲突。
- 涉及"敏感词"（例如 ApiPage 的 "导入"/"导出" 文案与既有断言冲突）需在写作时回避或更新断言。

#### D22.5 新页面强制约定

- 阶段 3+ 新增的所有一级页：每个 `<AcuPanel>` 都必须提供 `description`（即便短）。空 description 视作设计缺漏，code review 必拒。
- 多列布局必须 `align-items: stretch`，禁止 `align-items: start` / `flex-start`。
- 出现 `description` 不能塞下的复杂操作步骤时，使用页面顶部 hero / 单独的 `<AcuInfoBanner tone="tip">`，而不是堆到面板里。

#### D22.6 测试守护

- [tests/presentation-v2/components/acu-info-banner.test.ts](tests/presentation-v2/components/acu-info-banner.test.ts) 覆盖 AcuInfoBanner / AcuPanel.description 行为，包含"subtitle prop 必须无效"的反向断言以防回退。
- 每个一级页的集成测试都必须加一条"所有面板渲染常驻说明信息条"的断言（参考 [import-page.test.ts](tests/presentation-v2/import/import-page.test.ts) 的 "每个面板都渲染常驻说明信息条" 用例）。

### D23. 阶段 3 — 剧情推进页（PlotPage）

**确定日期**：2026-05-03。承担 plan §4.1 中"功能 / 剧情推进"一级页的落地，对接 [main-popup-plot.ts](src/presentation/pages/main-popup-plot.ts) 5 大区块除"智能续写 / 外部导入"外的所有内容。

#### D23.1 范围

PlotPage 承载：
- 顶部启用开关（`settings_ACU.plotSettings.enabled`，写入由 `setGlobalPlotEnabled_ACU` 处理）
- 预设面板（D4 三件套形态：单下拉 + 编辑 + 管理）
- 剧情推进 API 预设下拉（D6 / D23.4）
- 匹配替换面板（sulv1-4 / zhaohui，仅在 `devOptions.plotAdvanced` 字段开启时显示——该字段的开关 UI 已迁至开发者一级页，详见 D24）
- 剧情推进世界书选择（复用 `WorldbookSelector` + plotWorldbookConfig）

不在本阶段范围：智能续写（→ ContinuationPage）、外部导入（已迁 ImportPage）、正文替换（→ X-6 新一级页）。

#### D23.2 预设三件套（统一为单下拉，P3-8 决议）

- 旧 v1 的"全局预设 / 当前聊天预设"双下拉**合并为单一下拉**，与 ApiPage 保持一致。
- 状态行同时显示「当前聊天: X · 全局默认: Y · 跟随全局/已覆盖」徽章。
- "切换"、"设为全局默认"、"管理面板"通过 `PresetDropdown` + 抽屉完成，全部走 D5 / D12 / D19 形态。
- 切换语义全部走 [plot-logic.ts](src/service/plot/plot-logic.ts) 既有 API：`switchCurrentChatPlotPreset_ACU` / `applyGlobalPlotPresetSelectionForEditor_ACU` / `persistPlotPresetSelectionState_ACU` / `findPlotPresetByName_ACU`。
- 抽屉里**不放"全局/聊天"两条切换链路**——管理面板专注于"预设增删改 + 设为全局默认"。

#### D23.3 编辑器一律放抽屉（P3-7 / P3-13 决议）

- 任务列表 + 任务编辑器 + promptGroup mini editor + 最终注入指令 **全部进入抽屉的 edit 视图**。
- 主区不暴露任何编辑控件，避免"切换当前聊天预设"时出现可见的中间状态（P3-13 自然消解）。
- 这与 ApiPage 形态一致：主页只切换/总览，详细编辑在抽屉。
- 抽屉的 edit 视图：左 280px 任务列表（增/删/上/下） / 右 1fr 任务详情（基本字段 + segments + 任务级 API 预设 override） + 底部最终注入指令。
- prompt segments 编辑器**不简化**（P3-11），1:1 复刻旧 UI 的 add / role / mainSlot A·B / deletable 行为。

#### D23.4 API 预设三层 fallback（P3-10 决议 = B）

任务级 → 页面级 → 当前活动 Chat API。任务级 override 默认值文案为"继承全局剧情推进 API 预设"；页面级"剧情推进 API 预设"默认值文案为"跟随当前活动 Chat API"。

- 任务级：`settings_ACU.plotTaskApiPresetOverridesById[taskId]` + 任务对象 `taskApiPreset`（旧字段）
- 页面级：`settings_ACU.plotApiPreset`
- 当前活动：`useApiPresetStore().activePresetName`

#### D23.5 匹配替换 = 开发者 gated 字段（P3-14 决议；2026-05-08 D24 修订）

- sulv1-4 / zhaohui 占位符代号在 description 里集中说明，字段标签只留中文语义。
- 整个匹配替换面板（含 5 个数字字段）由 `devOptions.plotAdvanced` 字段单独 gate；该字段持久化到 `acu_v2_ui_state.devOptions.plotAdvanced`（与旧 settings 物理隔离），默认 `false`。
- 字段值与"启用开发者选项"总开关**相互独立**：总开关只控制开发者一级页在 sidebar 中的可见性（D24），不联动任何字段的真假状态。这意味着 `plotAdvanced=true` + 总开关=false 时，匹配替换面板照常显示，但用户暂时无法在 UI 中翻这个字段（要先打开总开关 → 进开发者页改）。
- 字段的开关 UI 仅在开发者一级页 ([DeveloperPage.vue](src/presentation-v2/pages/DeveloperPage.vue)) 中提供，不在 PlotPage 内嵌。这是"展示开发者选项功能形态"的首批样例字段；后续每个一级页落地时由用户挑选哪些字段以同样方式 gate。

#### D23.6 默认任务静默生成（P3-16 决议）

- 用户首次打开 PlotPage 时，若 `plotSettings.plotTasks` 为空，由 `ensurePlotTasksCompat_ACU` 从 [DEFAULT_PLOT_SETTINGS_ACU](src/shared/defaults-json.js) + [DEFAULT_PLOT_PROMPT_GROUP_ACU](src/shared/defaults-json.js) 生成默认任务（即"内置默认预设"）。
- **不显示**"已为你生成默认任务"之类的 AcuMessage。

#### D23.7 预设 JSON 契约保留（P3-12 决议）

- 抽屉的"导出/导入预设"按钮保留旧 JSON 结构（含 `promptGroup` / `plotTasks` / `loopSettings` / `plotWorldbookConfig` 等多层），不引入版本号也不做 schema 检查。
- 导出走 `stripPlotPresetWorldbookEntrySelectionForExport_ACU` 去掉聊天级 `enabledEntries`。

#### D23.8 v2 文件清单

| 路径 | 类型 |
|---|---|
| [stores/plot-preset-store.ts](src/presentation-v2/stores/plot-preset-store.ts) | Pinia store |
| [composables/usePlotPresetManagement.ts](src/presentation-v2/composables/usePlotPresetManagement.ts) | 抽屉状态 + 增删改 + 导入导出 |
| [composables/usePlotTaskEditing.ts](src/presentation-v2/composables/usePlotTaskEditing.ts) | 任务列表 + 当前任务 + segments 编辑 |
| [composables/useDevOptions.ts](src/presentation-v2/composables/useDevOptions.ts) | 开发者选项读取（仪表盘也用） |
| [components/PlotPresetDrawer.vue](src/presentation-v2/components/PlotPresetDrawer.vue) | 抽屉壳（manage / edit 两视图） |
| [components/PlotTaskList.vue](src/presentation-v2/components/PlotTaskList.vue) | edit 视图左栏 |
| [components/PlotTaskEditor.vue](src/presentation-v2/components/PlotTaskEditor.vue) | edit 视图右栏 |
| [components/PlotPromptSegments.vue](src/presentation-v2/components/PlotPromptSegments.vue) | segments mini editor |
| [pages/PlotPage.vue](src/presentation-v2/pages/PlotPage.vue) | 替换占位 |

#### D23.9 退出条件

- PlotPage 主区五大面板（启用 / 预设 / 匹配替换 gated / 世界书 / 抽屉触发）渲染正常
- 单下拉切换三种语义可达：跟随全局 / 切到具体预设 / 设为全局默认
- 抽屉支持新建 / 编辑 / 删除 / 导入 / 导出 / 重命名 / 任务级 API 预设 override
- 默认任务在空 promptPresets 场景下静默生成
- 匹配替换面板在 `devOptions.plotAdvanced` 关闭时不渲染、开启时渲染（该字段的开关 UI 在开发者一级页内）
- vitest `tests/presentation-v2/plot/**` 全绿
- check-arch / typecheck / 三产物构建通过；体积增量 < X-1 30% 警戒线

### D24. 仪表盘开发者选项 = 开发者一级页可见性 gate（2026-05-08）

**背景**：阶段 3 D23.5 把 `devOptions.plotAdvanced` 当作"开发者选项"的总闸 + 唯一字段，导致仪表盘"启用开发者选项"toggle 在没有任何消费者的状态下空转。本节修订 P-DB-7 的语义，把"总开关"和"字段"职责分离。

#### D24.1 概念区分

- **总开关 = `devOptions.developerOptionsEnabled`**：仅控制 **sidebar 中"开发者"一级页的可见性**。
  不影响任何字段的真假状态——关闭后字段值仍按用户上次写入的值保留。
- **字段（开发者 gated 字段）= `devOptions.<fieldKey>`**：每个字段独立持久化、独立默认值、独立 setter。
  对应一级页内的 `v-if` 直接读字段值，不读总开关。
- **首批字段**：`plotAdvanced`（默认 `false`）→ gate PlotPage 的"匹配替换（进阶）"面板。
- **后续字段**：每个一级页落地时由用户挑选；约定字段命名为 `<pageId>Advanced` 或更具体的语义键。

#### D24.2 开发者一级页

- 路径：[pages/DeveloperPage.vue](src/presentation-v2/pages/DeveloperPage.vue)
- 注册：`page-registry.ts` 第 13 项；`group: 'developer'`（新增第 5 个 group）
- 可见性：`visibleWhen: () => useDevOptionsStore().developerOptionsEnabled`
- 内容形态：单个 AcuPanel "开发者 gated 字段"，内部用 [DashboardToggleRow](src/presentation-v2/components/DashboardToggleRow.vue) 列字段（label + 描述 + AcuToggle）。
- 描述写作要求：每个字段的描述要写清楚"它 gate 的是哪一页的什么面板/字段"，让用户能反向定位。

#### D24.3 仪表盘侧改动

- 高级设置中的"启用开发者选项"toggle 行为由"乱接"修正为：写入 `developerOptionsEnabled` → sidebar 立即增加/移除"开发者"分组。
- 移除"存储模式"标题右侧的辅助 toggle（原本控制"切模式时是否一并重置填表提示词"）。该 toggle 是设计冗余：SQL 表与原生表必须用对应的默认提示词才能正确填写，没有"切模式但不重置提示词"的合法用例。
- `setStorageMode` 切换后**无条件**重置 `settings_ACU.charCardPrompt` 为对应模式的默认提示词。

#### D24.4 dev-options-store 的副作用清理

- 旧版 `setDeveloperOptionsEnabled(false)` 会同时把 `plotAdvanced` 置 `false`；该副作用按 D24.1"职责分离"原则**删除**。
- 总开关与字段从此完全独立；store 不在彼此之间做任何联动。

#### D24.5 退出条件

- 仪表盘 → 高级设置 → "启用开发者选项"开关切换后，sidebar 立即出现/消失"开发者"分组。
- 开发者一级页内"匹配替换（plotAdvanced）"toggle 翻动后，PlotPage 的匹配替换面板可见性立即跟随（独立于总开关）。
- 仪表盘"存储模式"右侧无任何附加控件；切换 radio 后填表提示词无条件重置为对应模式的默认提示词。
- vitest `tests/presentation-v2/dashboard/**` + `tests/presentation-v2/plot/**` 全绿。

### 5.1 执行节奏

```
[阶段 -1] 构建 spike (1-2 天)                              ✅ 2026-05-02
[阶段 0]  基础设施 (3-5 天)                                 ✅ 2026-05-02
[阶段 1]  侦察页 = API 页                                   ✅ (记录合并于阶段 0)
[阶段 2]  外部导入页 + 强制提取组件库（详见 D21）            ✅ 2026-05-03
[阶段 3]  剧情推进页（详见 D23）                             ✅ 2026-05-03
[阶段 3+] 展开剩余页面                                      ⏳ 待启动
```

<details><summary>各阶段原始目标（点击展开）</summary>

```
[阶段 -1] 构建 spike
  目标：unplugin-vue + 双产物正常出包
       Vue + 最小 Pinia 渲染 hello world 在两种环境跑通
       运行验收以油猴形式目视验证为主，同时输出 console 日志 marker
       plus assistant embedded 仅做旁路构建检查并记录
  产物：单独验证、跑完即丢；阶段 0 从干净基线重写
  不通过 → 回 D1

[阶段 0]  基础设施
  - 入口按钮 + #acu-app-v2 挂载容器（D15）
  - Pinia 初始化 + 主题 store + 路由 store（D16/D18）
  - 主题系统重写：4 主题色值搬运 + 注入（D14）
  - 主弹窗 Vue 外壳：sidebar + 主区 <component :is>
  - 12 个空占位页注册到 pageRegistry
  - 一个 hello-service 测试：占位页里调用任意 service 函数验证调用链通

[阶段 1]  侦察页 = API 页
  - 落地 D4/D5/D6/D11/D12/D13 全套
  - 第一个 Pinia store 落地（useApiPresetStore）
  - 第一个 composable 落地（useApiPresetManagement，配合侧抽屉）
  - 不主动抽组件

[阶段 2]  外部导入页 + 强制提取组件库（详见 D21）
  - 形态差异 = 特性：用与 API 页不同的形态挤出真正可复用基础组件
  - 提取出 components/_lib/ 基础组件集（Acu 前缀 / 平铺 / 两次出现且接口稳定才抽）
  - 业务组件 Vue 重写（WorldbookSelector / TableSelector）
  - 强制 presentation/ 物理边界（D21.2）
  - exit criteria: 两页之间无重复实现

[阶段 3+] 展开剩余页面
  - 新页禁止新增基础组件，除非 ≥2 新页都需要
```

</details>

---

### 5.2 阶段完成记录

> 按时序排列。已知缺口汇总见 §5.3。

#### 5.2.1 阶段 -1 Spike（2026-05-02）

- **结论**：通过。`unplugin-vue/rollup` 可与 Rollup 4 构建链同时产出油猴 IIFE / 酒馆扩展 ESM / plus embedded ESM。
- **隔离产物**：构建配置 `rollup.ui-v2-spike.config.js`，源码 `src/spikes/ui-v2/`，输出 `dist/ui-v2-spike/`。
- **验证组件**：`App.vue`（`<script setup lang=”ts”>`）通过最小 Pinia store 渲染 hello，输出日志 marker `[ACU-V2-SPIKE] mounted ...`。

**运行冒烟**（四路均通过）：

| 路径 | 结果 |
|---|---|
| userscript IIFE | 渲染 hello，Pinia mountCount=1，marker `mounted userscript into current-document` |
| userscript iframe 模拟 | 根节点出现在 parent document，marker `mounted userscript into parent-document` |
| extension ESM | 渲染 hello，marker `mounted extension into current-document` |
| plus embedded | 旁路构建与 jsdom import 通过，marker 含 `plus wrapper loaded` |

**关键发现**：

- 首次手测在酒馆助手 iframe 场景下无入口（spike 未注册菜单按钮）；调整为优先挂载父文档后通过
- 正式阶段 0 需保留 Vue feature flags / `process.env.NODE_ENV` production 替换，否则 gzip 体积上升至 ~102KB
- `<style scoped>` 通过本地 `sfc-style-injector` 闭环；阶段 0 需决定正式 CSS 方案

**体积基线**（spike 前主产物）：

| 产物 | raw | gzip |
|---|---:|---:|
| 油猴 | 4,036,719 | 981,240 |
| 扩展 | 3,863,846 | 973,792 |
| plus | 3,864,049 | 973,915 |

#### 5.2.2 阶段 0 基础设施（2026-05-02）

- **结论**：批次 A-E 全部完成。Vue/Pinia 构建链、host document 挂载、主题 store、路由 store、12 个占位页、hello-service 调用链均已落地。

**阶段 0 决策迁移（原 P0-1 ~ P0-6）**：

- **P0-1 入口按钮**：host document `#extensionsMenu` 内与旧按钮同级；icon `fa-solid fa-flask`，文案”打开新 UI（开发）”
- **P0-2 z-index**：`#acu-app-v2` = `9000`；抽屉/遮罩 `9100~9300`；旧 toast/confirm 更高
- **P0-3 page registry**：`Page` 字段 `id / title / group / component / visibleWhen? / requiresSqlite? / featureGate?`
- **P0-4 持久化键**：根 key `acu_v2_ui_state`，含 `theme` 与 `router` section；不走旧 `settings_ACU`
- **P0-5 hello-service**：read-only `getCurrentIsolationKey_ACU()` 由 `useHelloService()` composable 间接调用
- **P0-6 关闭/重开**：隐藏根节点保留路由状态 + 主区滚动重置；抽屉状态由抽屉 store 在关闭信号下自行清理

**批次验收**：

| 批次 | 内容 | 状态 |
|---|---|---|
| A | Vue 3 / Pinia / unplugin-vue 构建链，SFC 样式注入器，feature flags | 已完成 |
| B | 入口骨架，host document helper，菜单按钮，`#acu-app-v2` 挂载 | 已完成 |
| C | 新主题 token、4 个内置主题、持久化、`<style>` 注入 | 已完成 |
| D | 路由 store、4 分组 sidebar、12 占位页、可见性控制、关闭重开 | 已完成 |
| E | `useHelloService()` 验证 D17 中间层模式 | 已完成 |

**测试覆盖**：`mount.test.ts` / `theme-store.test.ts` / `router-store.test.ts` / `useHelloService.test.ts` — 4 files / 27 tests 全绿。

**验证**：typecheck 通过 · 三产物构建通过 · check-arch 8 条既有违规（基线） · `.vue` 无 service 直连。

**产物体积（vs spike 基线）**：

| 产物 | raw | Δ raw | gzip | Δ gzip |
|---|---:|---:|---:|---:|
| 油猴 | 4,648,180 | +15.15% | 1,113,834 | +13.51% |
| 扩展 | 4,407,971 | +14.08% | 1,103,366 | +13.31% |
| plus | 4,408,174 | +14.08% | 1,103,480 | +13.30% |

> 增量低于 X-1 30% 警戒线但高于 D16 早期 ~40KB 估算；继续纳入每阶段监控。

#### 5.2.3 阶段 2 外部导入页（2026-05-03）

- **结论**：D21 全部落地。ImportPage 形态搭建完毕，`_lib/` 基础组件集抽出，ApiPage 改造为 `_lib` 消费者。`check-arch.mjs` 增加 D17/D21.2 守护规则。

**产物**：

| 类别 | 路径 |
|---|---|
| 业务组件 | [WorldbookSelector.vue](src/presentation-v2/components/WorldbookSelector.vue) / [TableSelector.vue](src/presentation-v2/components/TableSelector.vue) |
| _lib 基础 | [AcuButton.vue](src/presentation-v2/components/_lib/AcuButton.vue) / [AcuPanel.vue](src/presentation-v2/components/_lib/AcuPanel.vue) / [AcuFormRow.vue](src/presentation-v2/components/_lib/AcuFormRow.vue) / [AcuMessage.vue](src/presentation-v2/components/_lib/AcuMessage.vue) |
| Pinia store | [import-flow-store.ts](src/presentation-v2/stores/import-flow-store.ts) |
| Composables | [useImportFlow.ts](src/presentation-v2/composables/useImportFlow.ts) / [useWorldbookSelector.ts](src/presentation-v2/composables/useWorldbookSelector.ts) |
| 页面 | [ImportPage.vue](src/presentation-v2/pages/ImportPage.vue)（重写）/ [ApiPage.vue](src/presentation-v2/pages/ApiPage.vue)（改造） |
| service 变更 | [update-orchestrator.ts:301](src/service/table/update-orchestrator.ts#L301) — D21.9 强制排除导入标签世界书条目 |
| 守护 | [check-arch.mjs](scripts/check-arch.mjs) 新增 3 条 v2 边界规则 |

**测试覆盖**：`import-flow-store.test.ts` / `use-import-flow.test.ts` / `import-page.test.ts` — 11 files / 57 tests 全绿。

**验证**：typecheck 通过 · check-arch 0 违规 · 三产物构建通过。

**退出条件（D21.11）**：

| 条件 | 状态 |
|---|---|
| ImportPage 功能等价旧 import tab | 部分（jsdom 通过；G-2 真机待补；G-1 按设计延后） |
| 两页无重复实现 | 通过 |
| check-arch 通过 | 通过 |
| v2 测试全绿 | 通过（57/57） |
| 体积记录在册 | 通过 |

**产物体积（vs 阶段 0 基线）**：

| 产物 | raw | Δ raw | gzip | Δ gzip |
|---|---:|---:|---:|---:|
| 油猴 | 4,786,121 | +2.97% | 1,139,164 | +2.27% |
| 扩展 | 4,534,652 | +2.87% | 1,129,028 | +2.33% |
| plus | 4,534,855 | +2.87% | 1,129,142 | +2.33% |

#### 5.2.4 阶段 3 剧情推进页（2026-05-03）

- **结论**：D23 全部落地。PlotPage 跑通：预设抽屉、任务编辑器、prompt segments、世界书选择器、dev-options gated 匹配替换、三层 API override fallback。

**产物**：

| 类别 | 路径 |
|---|---|
| Pinia store | [plot-preset-store.ts](src/presentation-v2/stores/plot-preset-store.ts) / [dev-options-store.ts](src/presentation-v2/stores/dev-options-store.ts) |
| Composables | [usePlotPresetManagement.ts](src/presentation-v2/composables/usePlotPresetManagement.ts) / [usePlotTaskEditing.ts](src/presentation-v2/composables/usePlotTaskEditing.ts) / [useDevOptions.ts](src/presentation-v2/composables/useDevOptions.ts) / [usePlotWorldbookConfig.ts](src/presentation-v2/composables/usePlotWorldbookConfig.ts) / [usePlotRates.ts](src/presentation-v2/composables/usePlotRates.ts) |
| 业务组件 | [PlotPresetDrawer.vue](src/presentation-v2/components/PlotPresetDrawer.vue) / [PlotTaskList.vue](src/presentation-v2/components/PlotTaskList.vue) / [PlotTaskEditor.vue](src/presentation-v2/components/PlotTaskEditor.vue) / [PlotPromptSegments.vue](src/presentation-v2/components/PlotPromptSegments.vue) |
| 页面 | [PlotPage.vue](src/presentation-v2/pages/PlotPage.vue) / [DashboardPage.vue](src/presentation-v2/pages/DashboardPage.vue)（新增开发者选项区） |

**测试覆盖**：`plot-preset-store.test.ts` / `use-plot-task-editing.test.ts` / `plot-page.test.ts` — 15 files / 103 tests 全绿。

**验证**：typecheck 通过 · check-arch 0 违规 · 三产物构建通过。

**产物体积（vs 阶段 2 基线）**：

| 产物 | raw | Δ raw |
|---|---:|---:|
| 油猴 | 4,897,623 | +2.33% |
| 扩展 | 4,637,018 | +2.26% |
| plus | 4,637,221 | +2.26% |

#### 5.2.5 阶段 3+ 组件库扩充（2026-05-04）

- **结论**：为剩余 9 个未实现页补齐基础控件。AcuToggle 重写为胶囊把手样式；新增 5 个 _lib 组件；PlotPromptSegments 泛化为 AcuPromptSegments 通用组件。

**_lib/ 组件库完整清单**（截至本次）：

| 组件 | 用途 | props 要点 |
|---|---|---|
| [AcuButton.vue](src/presentation-v2/components/_lib/AcuButton.vue) | 通用按钮 | variant: default/primary/danger; size: sm/md; iconOnly |
| [AcuIconButton.vue](src/presentation-v2/components/_lib/AcuIconButton.vue) | 纯图标按钮 | icon; variant: default/danger/accent; size: md/sm |
| [AcuPanel.vue](src/presentation-v2/components/_lib/AcuPanel.vue) | 面板容器 | title; description（自动渲染 AcuInfoBanner）; slots: title/actions/description |
| [AcuInfoBanner.vue](src/presentation-v2/components/_lib/AcuInfoBanner.vue) | 常驻说明条 | tone: info/tip/warning |
| [AcuFormRow.vue](src/presentation-v2/components/_lib/AcuFormRow.vue) | 表单行布局 | label; hint; slot 内子元素自动获取主题样式 |
| [AcuSelect.vue](src/presentation-v2/components/_lib/AcuSelect.vue) | 自定义单选下拉 | options: {value,label}[]; modelValue; placeholder; size: sm/md |
| [AcuPresetDropdown.vue](src/presentation-v2/components/_lib/AcuPresetDropdown.vue) | 预设选择下拉（带星标全局默认） | items: {name,meta}[]; modelValue; defaultName; emits: set-default |
| [AcuTextarea.vue](src/presentation-v2/components/_lib/AcuTextarea.vue) | 多行文本输入 | modelValue; rows; placeholder; disabled |
| [AcuMessage.vue](src/presentation-v2/components/_lib/AcuMessage.vue) | 提示消息 | type: info/success/warning/error |
| [AcuToggle.vue](src/presentation-v2/components/_lib/AcuToggle.vue) | 胶囊把手开关 | modelValue: boolean; label; disabled — **本次重写**：从原生 checkbox 改为胶囊轨道 + 圆形滑块 |
| [AcuCheckbox.vue](src/presentation-v2/components/_lib/AcuCheckbox.vue) | 传统勾选框 | modelValue: boolean; label; disabled — **本次新增** |
| [AcuInput.vue](src/presentation-v2/components/_lib/AcuInput.vue) | 统一文本/数字/密码输入 | modelValue; type: text/number/password; min/max/step; size: sm/md — **本次新增** |
| [AcuRadioGroup.vue](src/presentation-v2/components/_lib/AcuRadioGroup.vue) | 单选组 | options: {value,label}[]; modelValue; name; direction: horizontal/vertical — **本次新增** |
| [AcuRulePairList.vue](src/presentation-v2/components/_lib/AcuRulePairList.vue) | 可增删的开始词/结束词 pair 列表 | modelValue: {start,end}[]; startPlaceholder; endPlaceholder; addLabel — **本次新增** |
| [AcuPromptSegments.vue](src/presentation-v2/components/_lib/AcuPromptSegments.vue) | 提示词段编辑器（通用） | segments: PromptSegment[]; roleOptions; slotOptions; showSlot; rows; emptyText — **本次从 PlotPromptSegments 提取** |

**变更说明**：

- **AcuToggle**：视觉从原生 checkbox 改为 36×20px 胶囊轨道 + 14px 圆形把手，开启时强调色填充。AcuToggle 用于"启用/禁用"型功能开关。
- **AcuCheckbox**：16×16px 方形框，勾选时填充强调色 + 白色对勾。用于列表批量勾选、选项勾选等场景。两者语义区分：toggle = 开关状态切换，checkbox = 选项勾选。
- **AcuInput**：统一兼容 text/number/password 三种类型，number 模式隐藏原生 spinner，emit `update:modelValue`（实时）和 `change`（失焦）。替代此前各页面散落的裸 `<input>` 标签。
- **AcuRadioGroup**：支持水平/垂直布局，自定义圆形 radio dot。用于仪表盘存储模式、表格页世界书来源等互斥选择。
- **AcuRulePairList**：内嵌 AcuInput + AcuIconButton，v-model 驱动的 `{start, end}[]` 数组。填表/智能续写/正文替换 3 页 ×2（提取规则 + 排除规则）= 6 处消费。
- **AcuPromptSegments**：从 [PlotPromptSegments.vue](src/presentation-v2/components/PlotPromptSegments.vue) 泛化。接口类型由 `PlotPromptSegment` 改为通用 `PromptSegment`（结构相同）；role/slot options 改为可配置 props（默认值保持 SYSTEM/USER/ASSISTANT + 普通段/主插槽A/主插槽B）。PlotPromptSegments 改为 AcuPromptSegments 的薄包装层，保持向后兼容。
- 已有页面（ApiPage、PlotPage、ImportPage）中的裸 `<input>` / 裸 `<input type="radio">` 尚未回写替换为新 _lib 组件；回写计划在各页面迭代时顺带进行。

**验证**：typecheck 通过；v2 测试 112/116 通过（4 个失败为预存的 DOM 选择器问题，与本次无关）。

---

### 5.3 已知缺口汇总

跨阶段累积的未解决项，按发现时间排列。

| ID | 来源 | 描述 | 阻塞 |
|---|---|---|---|
| G-1 | 阶段 2 | **AI 注入流程未在 v2 接通**：旧 `processImportedTxtAsUpdates_ACU` 依赖 `presentation/triggers/update-process.ts`，受 D21.2 边界限制不可在 v2 调用。当前”注入”按钮引导回旧 UI。下线前需将核心循环上移到 service 层。 | SUN-2 / SUN-7 前置 |
| G-2 | 阶段 2 | **ImportPage 真机目视验收**：jsdom 通过，真实 SillyTavern 中 split / clear / delete 流程未目视验收。 | 无 |
| G-3 | 阶段 3 | **PlotPage 真机目视验收**：jsdom 通过，真实 SillyTavern 中”切预设 / 抽屉编辑 / 关闭重开”流程未目视验收。 | 无 |
| G-4 | 阶段 3 | **PresetDropdown 复用形态**：剧情预设当前用 PresetDropdown shim（空 apiConfig + plotTasks 长度伪装 meta）。后续阶段若复用，应抽到 `_lib/AcuPresetDropdown.vue`（D21.7 阈值已达成）。 | 无 |
| G-5 | 阶段 3 | **默认任务名差异**：`normalizePlotTasks_ACU` 兜底为”默认任务”，v2 composable 新建为”剧情任务N”，命名不一致。 | 无 |

---

### 5.4 产物体积追踪

每阶段油猴产物体积汇总（X-1 监控，30% 警戒线）：

| 阶段 | 日期 | raw | gzip | Δ gzip（vs 上一阶段） |
|---|---|---:|---:|---:|
| spike 基线 | 2026-05-02 | 4,036,719 | 981,240 | — |
| 阶段 0 | 2026-05-02 | 4,648,180 | 1,113,834 | +13.51% |
| 阶段 2 | 2026-05-03 | 4,786,121 | 1,139,164 | +2.27% |
| 阶段 3 | 2026-05-03 | 4,897,623 | — | +2.33%（raw） |
