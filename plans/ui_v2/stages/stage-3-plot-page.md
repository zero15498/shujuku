# 阶段 3：剧情推进页（PlotPage）

> 模板见 [../03-record-template.md](../03-record-template.md)。

## 范围

- 阶段编号：3
- 与 charter 的关联：落地 [charter §4](../00-charter.md) "功能 / 剧情推进"一级页，对接 [main-popup-plot.ts](../../../src/presentation/pages/main-popup-plot.ts) 5 大区块除"智能续写 / 外部导入"外的所有内容
- 本阶段包含（D23.1）：
  - 顶部启用开关（`settings_ACU.plotSettings.enabled` / `setGlobalPlotEnabled_ACU`）
  - 预设面板（D4 三件套：单下拉 + 编辑 + 管理）
  - 剧情推进 API 预设下拉（D6 / D23.4）
  - 匹配替换字段（sulv1-4 / zhaohui，由 `devOptions.plotAdvanced` 字段 gate；显示在编辑/新建预设抽屉中）
  - 剧情推进世界书选择（复用 `WorldbookSelector` + plotWorldbookConfig）
- 本阶段不包含：智能续写（→ ContinuationPage）、外部导入（已迁 ImportPage）、正文替换（→ X-6 新一级页）

## 决议（2026-05-03）

### D23.2 预设三件套（统一为单下拉，P3-8 决议）

- **决定**：旧 v1 的"全局预设 / 当前聊天预设"双下拉合并为单一下拉，与 ApiPage 保持一致
- 状态行同时显示「当前聊天: X · 全局默认: Y · 跟随全局/已覆盖」徽章
- 切换、设为全局默认、管理面板通过 `PresetDropdown` + 抽屉完成（D5 / D12 / D19 形态）
- 切换语义全部走 [plot-logic.ts](../../../src/service/plot/plot-logic.ts) 既有 API
- 抽屉里**不放**"全局/聊天"两条切换链路；管理面板专注于"预设增删改 + 设为全局默认"

### D23.3 编辑器一律放抽屉（P3-7 / P3-13 决议）

- **决定**：任务列表 + 任务编辑器 + promptGroup mini editor + 最终注入指令全部进入抽屉的 edit 视图
- **理由**：主区不暴露任何编辑控件，避免"切换当前聊天预设"时出现可见的中间状态（P3-13 自然消解）；与 ApiPage 形态一致
- 抽屉的 edit 视图：左 280px 任务列表（增/删/上/下） / 右 1fr 任务详情（基础信息 + 任务字段 + 任务 API 单独选择 + 匹配替换字段（developer gated）+ prompt segments） + 底部最终注入指令
- prompt segments 编辑器**不简化**（P3-11），1:1 复刻旧 UI 的 add / role / mainSlot A·B / deletable 行为

### D23.4 API 预设继承顺序（P3-10 决议 = B）

- **决定**：当前任务单独选择 → 剧情推进页 API 预设 → 当前活动 API
  - 任务级：`settings_ACU.plotTaskApiPresetOverridesById[taskId]` + 任务对象 `taskApiPreset`（旧字段）
  - 页面级：`settings_ACU.plotApiPreset`
  - 当前活动：`useApiPresetStore().activePresetName`
- 任务级默认值文案："继承剧情推进 API 预设"
- 页面级"剧情推进 API 预设"默认值文案："跟随当前活动 API"

### D23.5 匹配替换 = 开发者 gated 字段（P3-14 决议；2026-05-08 D24 修订）

- sulv1-4 / zhaohui 占位符代号在 description 里集中说明，字段标签只留中文语义
- 匹配替换字段（含 5 个数字字段）放在编辑/新建剧情推进预设侧抽屉中，由 `devOptions.plotAdvanced` 字段单独 gate；持久化到 `acu_v2_ui_state.devOptions.plotAdvanced`（与旧 settings 物理隔离），默认 `false`
- 字段值仍是 `settings_ACU.plotSettings` 顶层全局参数，不属于某个预设；UI 文案必须说明"立即保存、不写入当前预设 JSON、不随预设导入导出"
- 字段值与"启用开发者选项"总开关**相互独立**：总开关只控制开发者一级页在 sidebar 中的可见性（[D24](stage-3plus-dashboard.md)），不联动任何字段的真假状态
- 字段的开关 UI 仅在 [DeveloperPage.vue](../../../src/presentation-v2/pages/DeveloperPage.vue) 中提供，不在 PlotPage 内嵌

### D23.6 默认任务静默生成（P3-16 决议）

- 用户首次打开 PlotPage 时，若 `plotSettings.plotTasks` 为空，由 `ensurePlotTasksCompat_ACU` 从 [DEFAULT_PLOT_SETTINGS_ACU](../../../src/shared/defaults-json.js) + `DEFAULT_PLOT_PROMPT_GROUP_ACU` 生成默认任务
- **不显示**"已为你生成默认任务"之类的 AcuMessage

### D23.7 预设 JSON 契约保留（P3-12 决议）

- 抽屉的"导出/导入预设"按钮保留旧 JSON 结构（`promptGroup` / `plotTasks` / `loopSettings` / `plotWorldbookConfig` 等多层），不引入版本号也不做 schema 检查
- 导出走 `stripPlotPresetWorldbookEntrySelectionForExport_ACU` 去掉聊天级 `enabledEntries`

## 影响文件清单（D23.8）

| 类别 | 路径 |
|---|---|
| Pinia store | [plot-preset-store.ts](../../../src/presentation-v2/stores/plot-preset-store.ts) / [dev-options-store.ts](../../../src/presentation-v2/stores/dev-options-store.ts) |
| Composables | [usePlotPresetManagement.ts](../../../src/presentation-v2/composables/usePlotPresetManagement.ts) / [usePlotTaskEditing.ts](../../../src/presentation-v2/composables/usePlotTaskEditing.ts) / [useDevOptions.ts](../../../src/presentation-v2/composables/useDevOptions.ts) / [usePlotWorldbookConfig.ts](../../../src/presentation-v2/composables/usePlotWorldbookConfig.ts) / [usePlotRates.ts](../../../src/presentation-v2/composables/usePlotRates.ts) |
| 业务组件 | [PlotPresetDrawer.vue](../../../src/presentation-v2/components/PlotPresetDrawer.vue) / [PlotTaskList.vue](../../../src/presentation-v2/components/PlotTaskList.vue) / [PlotTaskEditor.vue](../../../src/presentation-v2/components/PlotTaskEditor.vue) / [PlotPromptSegments.vue](../../../src/presentation-v2/components/PlotPromptSegments.vue) |
| 页面 | [PlotPage.vue](../../../src/presentation-v2/pages/PlotPage.vue) / [DashboardPage.vue](../../../src/presentation-v2/pages/DashboardPage.vue)（新增开发者选项区） |

## 退出条件（D23.9）

- PlotPage 主区预设 / 世界书面板渲染正常；匹配替换字段仅在编辑/新建预设抽屉中按 `devOptions.plotAdvanced` gate 渲染
- 单下拉切换三种语义可达：跟随全局 / 切到具体预设 / 设为全局默认
- 抽屉支持新建 / 编辑 / 删除 / 导入 / 导出 / 重命名 / 任务 API 单独选择
- 默认任务在空 promptPresets 场景下静默生成
- 匹配替换字段在 `devOptions.plotAdvanced` 关闭时不渲染、开启时在编辑/新建预设抽屉渲染
- vitest `tests/presentation-v2/plot/**` 全绿
- check-arch / typecheck / 三产物构建通过；体积增量 < X-1 30% 警戒线

---

## 落地记录（2026-05-03）

- **结论**：D23 全部落地。PlotPage 跑通：预设抽屉、任务编辑器、prompt segments、世界书选择器、dev-options gated 匹配替换、API 预设继承顺序。

### 测试覆盖

- 文件数：15
- 用例数：103
- 状态：全绿

### 验证

- [x] typecheck
- [x] check-arch（0 违规）
- [x] 油猴构建
- [x] 扩展构建
- [x] plus 构建

### 退出条件核对

| 条件 | 状态 |
|---|---|
| PlotPage 五大面板渲染 | 通过 |
| 三种切换语义可达 | 通过 |
| 抽屉支持完整 CRUD + 导入导出 | 通过 |
| 默认任务静默生成 | 通过 |
| 匹配替换 gate 行为 | 通过 |
| vitest 全绿 | 通过（103/103） |
| 三产物构建 | 通过 |
| 体积 < 警戒线 | 通过（+2.33%） |
| 真机目视验收 | 待补（G-3） |

### 体积变化（vs 阶段 2 基线）

| 产物 | raw | Δ raw |
|---|---:|---:|
| 油猴 | 4,897,623 | +2.33% |
| 扩展 | 4,637,018 | +2.26% |
| plus | 4,637,221 | +2.26% |

### 已知缺口

- G-3（PlotPage 真机目视验收）/ G-4（PresetDropdown 复用形态）/ G-5（默认任务名差异）见 [open-questions.md](../open-questions.md)
