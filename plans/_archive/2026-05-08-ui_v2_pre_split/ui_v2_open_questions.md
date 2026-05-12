# UI 重构 v2 — 待决问题清单

> 本文档汇集 [ui_v2_redesign_plan.md](ui_v2_redesign_plan.md) 之外**尚未拍板**的事项，按阶段组织。
> 每项含：**问题** / **为什么需要决定** / **何时必须有答案** / **当前倾向**（如有）。
> 决定落地后从本文档删除该条目，并迁移到 plan 中作为 Dn 决策或 §x.x 节点。
> 阶段编号与 plan §5.1 一致。

---

## 已关闭阶段（历史索引）

<details><summary>阶段 1：API 侦察页（P1-1 ~ P1-5，随实现落地）</summary>

- P1-1 API 页内部布局 → 阶段 1 实现时确定
- P1-2 useApiPresetStore state shape → 阶段 1 实现时确定
- P1-3 侧抽屉形态 → 右侧滑入 480px + dim，移动端全屏 sheet
- P1-4 "标记为活动 API" UI → 阶段 1 实现时确定
- P1-5 预设导出格式契约 → 阶段 1 实现时确定

</details>

<details><summary>阶段 2：第二页 + 组件提取（P2-1 ~ P2-3 → D21；D7 撤销 → 删除 P3-3）</summary>

阶段 2 启动决议（2026-05-03）：P2-1 / P2-2 / P2-3 锁定为 D21。详见 plan §D21。

</details>

<details><summary>阶段 3+：仪表盘重构（P-Dashboard 全部决议落定 → 2026-05-07）</summary>

| 编号 | 决议 |
|---|---|
| P-DB-1 | 仪表盘删除 Chat API 三件套（PresetDropdown / 编辑 / 齿轮 / ApiDrawer），改为"数据库状态"面板顶部的纯只读状态条；含 Chat API、表格模板、剧情推进三项跳转链接。 |
| P-DB-2 | 仪表盘 header 删除 subtitle / 刷新按钮 / "API 已就绪"徽章。刷新由 chat-changed watcher 驱动；徽章信息已合并进 stats 列表。 |
| P-DB-3 | "全局开关" 改名为"开关"面板，内部用 `AcuSegmentedControl` 切换"基础设置 / 高级设置"两组。基础设置默认呈现，传达"高级设置需要谨慎，动了出问题是正常的"心理预期。 |
| P-DB-4 | 基础设置内容（旧 UI 名称还原）：启用自动更新、静默提示框。 |
| P-DB-5 | 高级设置内容：启用条件模板功能、0TK 占用模式、启用向量混合增强交火方案（新增到仪表盘，对应 `worldbookConfig.summaryVectorIndexModeEnabled` 字段）、启用开发者选项（总开关）、存储模式（radio 而非 toggle，每选项带常驻 description）。 |
| P-DB-6 | 仪表盘移除"规范填表功能"开关（隐藏不再显示）。 |
| ~~P-DB-7~~（2026-05-08 D24 修订） | "启用开发者选项"**仅**控制 sidebar"开发者"一级页的可见性，不联动任何字段的真假状态。各页"开发者 gated"字段独立持久化（如 `devOptions.plotAdvanced`），其开关 UI 集中放在开发者一级页内。详见 plan §D24。 |
| P-DB-8 | `AcuPageHeader` 移除 `subtitle` prop（D22.3 收尾）；全 5 页 sweep 完成。`#actions` slot 仅允许状态徽章，不允许触发型控件（设计 guideline §12）。 |
| P-DB-9 | `AcuRadioGroup` option 增加 `description?: string` 字段，每选项下方渲染常驻 11px 灰字。 |
| P-DB-10（2026-05-08） | 仪表盘"存储模式"标题右侧原本有一个辅助 toggle（控制切模式时是否同步重置填表提示词），属于设计冗余——SQL 表与原生表必须用对应的默认提示词才能正确填写。**砍掉**该 toggle，`setStorageMode` 切换后无条件重置 `charCardPrompt`。详见 plan §D24.3。 |

未在本次落地、作为后续债务：
- ~~开发者一级页骨架与 sidebar gating~~（2026-05-08 落地，详见 plan §D24）
- ApiPage Chat API 面板 #actions 中的"流式" toggle 迁入面板正文
- PlotPage header #actions 中的"启用" toggle 迁入"剧情推进预设"面板顶部
- AcuPanel #actions 与各页内 panel 标题右侧组件统一（参考 memory `project_uiv2_header_action_widgets_debt.md`）

</details>

<details><summary>阶段 3：剧情推进页（P3-7 ~ P3-16 全部决议落定 → D23）</summary>

| 编号 | 决议 |
|---|---|
| P3-7  | B（任务编辑器在抽屉里），与 ApiPage 形态一致 |
| P3-8  | 单下拉，统一与 API 三件套形态 |
| P3-9  | 不留操作区；D21.8 同步修订 |
| P3-10 | B（任务级 → 页面级 → 当前活动 Chat API 三层 fallback） |
| P3-11 | promptGroup mini editor 不简化 |
| P3-12 | 预设 JSON 导入导出契约保留 |
| P3-13 | 编辑器在抽屉，自然规避"跟随全局编辑触发 fork"问题 |
| P3-14 | 匹配替换字段保留代号说明，整面板由仪表盘"开发者选项"控制可见性 |
| P3-15 | 旧 `loopSettings.maxRetries === 49` 隐藏开关保留；正文替换迁专属一级页（X-6） |
| P3-16 | 默认任务静默生成，无消息提示 |

~~P3-3 触发式按钮"集中识别"~~ — 2026-05-03 撤销，降级为操作区布局惯例（plan §D7 / §D21.8）。

</details>

---

## 未决项：阶段 3+ 剩余页面

### P3-1. 12 状态枚举中文文案表
- **问题**：交火模式 manifest status（building / uploading / ready / missing / corrupt / incompatible / upload_failed / rebuild_required / delete_pending / delete_failed / superseded / 未加载）的用户语翻译。
- **何时**：实现交火页状态徽章时。
- **来源**：[summary-vector-index-types.ts](../src/service/vector/summary-vector-index-types.ts)。

### P3-2. 移动端栅格断点与降级规则
- **问题**：D9 说"待定"。需确定具体断点（如 768px / 1024px）和"宽屏多列降级为单列"的规则。
- **何时**：第一个有"多列布局"的页面实现时。

### P3-4. Sidebar 一级页可见性的设置项
- **问题**：用户提到"通过设置开关显示/隐藏一级页"。设置项放在某个一级页内还是放在 sidebar 折叠菜单？哪些页可隐藏 / 哪些必显示？
- **何时**：阶段 3+ 全部页面实现完时。
- **2026-05-08 部分关闭**：开发者一级页的 sidebar 可见性已由仪表盘"启用开发者选项"实现（plan §D24）。其他可隐藏页（若有）的范围与设置入口仍待决。

### P3-5. 各功能页内部布局
- **问题**：填表 / 智能续写 / 数据管理 / 正文替换 / SQL / 运行日志 各自的内部分块。
- **何时**：每个页面实现时。
- **注**：D3 说"各一级页内部如需更多分块，使用页内 segmented tabs 或锚点分段"。剧情推进页和外部导入页已在阶段 2-3 中确立了惯例（AcuPanel 分块 + description 信息条），后续页面参照即可。

### P3-7. VectorIndexPage 新配置字段接入
- **问题**：service 层在 spv3.6.x / spv4.0.x 系列中新增了若干交火模式纪要索引相关字段，目前 [VectorIndexPage.vue](../src/presentation-v2/pages/VectorIndexPage.vue) 仍是 PagePlaceholder 没有承载，需要在阶段 3+ 实做该页时一并接入。
- **涉及字段**：
  - `worldbookConfig.recentFixedInjectCount`（最近 N 条固定注入）
  - `summaryIndexKeywordMinRows`（默认 200）
  - `topK`（默认 200）
  - `recallCandidateLimit`（默认 1000）
  - `keywordPromptGroup` 全量替换语义（版本驱动无条件替换，参考 spv3.6.3）
  - `keywordGenerationMaxAttempts`
- **不影响**：[useVectorApiConfig](../src/presentation-v2/composables/useVectorApiConfig.ts) 仅负责 embedding/rerank 6 个字段，与本条无关。
- **何时**：实现 VectorIndexPage 时一并接入；接入前 service 层默认值生效，不阻塞。

### P3-6. 填表提示词预设升级的迁移
- **问题**：D13 决定"填表提示词"由单字段升预设库。现有用户的单字段值如何迁移为初始预设？
- **何时**：实现填表页时。
- **倾向**：旧值自动转换为名为"默认"的初始预设并标记为活动。

---

## 未决项：下线旧 UI 时

### SUN-1. toast / custom-confirm Vue 化
- **问题**：D14 选择 A 推迟了。下线旧 UI 时需要：
  - Vue 版 toast 实现（动画、堆叠、分类）
  - Vue 版 confirm 实现
  - 全项目对 `showToastr_ACU` / `customConfirm` 的调用切到新版

### SUN-2. 工具窗口 Vue 化 + 全屏化（D15 后续）
- **问题**：visualizer / SQL 控制台 / 运行日志 Vue 化，按 D15 设计为全屏路由。
- **注**：visualizer 体量大（[visualizer.ts](../src/presentation/pages/visualizer.ts) 等多文件），是子项目级工作。
- **附加**：可视化编辑器还承担 DDL 编辑、SQLite 模式支持、模板 AI 助手挂载（plan §2.5），全屏路由化时这些子功能要一起迁移。

### SUN-3. 自定义主题导入导出
- **问题**：D14 推迟。新主题系统下导入导出格式重新设计，还是兼容旧 ACUThemeFile？

### SUN-4. 旧 settings_ACU 处置
- **问题**：旧 `settings_ACU` 单例是否完全移除？还是保留作为新 store 的 storage adapter（持久化层）？
- **为什么**：data / service 层有大量代码读 `settings_ACU`，全部改造成本巨大。保留作 adapter 可能更现实。
- **注**：关系到 D1 "presentation 层重写但不动业务层"原则的边界。

### SUN-5. 旧 window-system.ts 废弃
- **问题**：D15 说下线旧 UI 时旧 `window-system.ts` 一并废弃。需确认无任何代码路径还依赖。

### SUN-6. api-registry 接口扩展
- **问题**：新 UI 是否需新增对外接口（如 `setActivePage(id)`）？是否需废弃任何旧接口？
- **注**：plan §2.9 提到 api-registry 是对外契约，新 UI 重构不应破坏。

### SUN-7. 旧 presentation 文件删除清单
- **问题**：下线时需要删除哪些文件？
- **预期范围**：
  - `pages/main-popup-*.ts`（除 visualizer）
  - `pages/popup-bindings-*.ts`
  - `pages/popup-helpers.ts`
  - `state/ui-refs.ts`
  - `triggers/settings-ui-sync/*`（注意 plan §2.8 警告：先拆出仍属于运行时的部分）
  - `triggers/auto-loop.ts` / `update-trigger.ts` / `update-process.ts` / `import-process.ts`：DOM 胶水部分删；流程逻辑视情况搬到 `service/flows/` 或在 v2 composable 已重写后整段删
  - 旧主题相关：`theme/theme-registry.ts` / `theme-selector.ts` / 4 个 builtins（如新主题已完全继承）
- **何时**：下线决策落地后。

### SUN-8. api-registry 搬出 `presentation/`（下线前置）
- **问题**：`src/presentation/bootstrap/api-registry.ts` 与 `api-groups/*` 是对外契约（plan §2.9），不是 UI。`presentation/` 整体归档前必须先把它们搬到 `presentation/` 之外。
- **倾向位置**：`src/host-api/`（与 service / data / shared 同级）。
- **影响**：所有外部插件依赖；搬迁要以"目录改名"+ 旧路径暂时 re-export 的方式做，或确认外部插件读取的是函数本体而非 import 路径。
- **何时**：下线旧 UI 决策前必须完成。否则 SUN-7 删 `presentation/` 时会破坏外部契约。
- **关联**：plan §D21.6。

---

## 未决项：跨阶段持续关注

### X-1. 双产物体积监控
- **问题**：每阶段末测一次产物大小，超出基线 30% 时警告。
- **何时**：每阶段末。
- **状态**：持续执行中，追踪表见 plan §5.4。

### ~~X-2. 测试模板与覆盖率~~（已确认）
- 阶段 1-2 中已确立三档测试范式：store test / composable test / 页面集成 test。参考 `tests/presentation-v2/` 目录。

### ~~X-3. D17 中间层守护~~（已落地）
- `scripts/check-arch.mjs` 已在阶段 2 实施 D17 + D21.2 双规则守护。每次验证均 0 违规。

### X-4. 组件统一性守护（防裸基础元素）
- **问题**：阶段 3+ 怎么阻止"在某个页面又写了一个 input"这种行为？
- **倾向**：加一条 check-arch 规则禁止 `.vue` 文件出现裸 `<input>` `<button>` `<select>` 等基础元素，必须用 `_lib/` 下组件。
- **何时**：`_lib/` 组件集基本稳定后（当前已有 AcuButton / AcuPanel / AcuFormRow / AcuMessage / AcuInfoBanner）。

### ~~X-5. service 层契约稳定性~~（已确认惯例）
- 惯例已确立：**composable 层做适配，service 层非必要不动**。阶段 2-3 均按此执行，未做 service 层大改。

### X-6. 正文替换升一级页（P3-15 后续）
- **问题**：plan §4.1 把"正文替换"列在工具组、由 `loopSettings.maxRetries === 49` 触发显示。阶段 3 决议后，该功能要单独成一级页。
- **触发条件**：仍保留旧的隐藏开关作为 sidebar 可见性 gate，不公开给普通用户。
- **范围**：旧 [main-popup-optimization.ts](src/presentation/pages/main-popup-optimization.ts) + [popup-bindings-optimization.ts](src/presentation/pages/popup-bindings-optimization.ts) + [components/optimization-ui/*](src/presentation/components/optimization-ui/) 的 v2 重写。
- **何时**：ContinuationPage 落地之后。
- **依赖**：需要 `service/optimization` 暴露的接口检查（D17 中间层），可能需要补充 composable。

---

## 索引：未来可能新增的阶段

- **阶段 4**：过渡期收尾（旧 UI 用户回流处理、bug fix）
- **阶段 5**：下线旧 UI（删除 SUN-7 清单文件）
- **阶段 6**：清理（消化 SUN-* 全部）
