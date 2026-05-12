# 阶段 3+：仪表盘与开发者一级页

> 模板见 [../03-record-template.md](../03-record-template.md)。跨阶段引用采用相对链接 + 简短内联摘要并存。

## 范围

- 阶段编号：3+
- 与 charter 的关联：落地 [01-architecture-map §8](../01-architecture-map.md) 中"开发者"一级页可见性语义，并修订 [stage-3 D23.5](stage-3-plot-page.md) 的开发者 gated 字段职责
- 本阶段包含：仪表盘高级设置修订、`developerOptionsEnabled` 总开关、DeveloperPage 一级页、`plotAdvanced` 字段独立持久化、存储模式辅助 toggle 删除
- 本阶段不包含：ApiPage / PlotPage header actions sweep、其他开发者 gated 字段、可隐藏页完整设置中心、三产物体积重新测量

## 决议

### D24. 仪表盘开发者选项 = 开发者一级页可见性 gate（2026-05-08）

**背景**：阶段 3 D23.5 把 `devOptions.plotAdvanced` 当作"开发者选项"的总闸 + 唯一字段，导致仪表盘"启用开发者选项"toggle 在没有任何消费者的状态下空转。本节修订 P-DB-7 的语义，把"总开关"和"字段"职责分离。

### D24.1 概念区分

- **总开关 = `devOptions.developerOptionsEnabled`**：仅控制 **sidebar 中"开发者"一级页的可见性**。
  不影响任何字段的真假状态——关闭后字段值仍按用户上次写入的值保留。
- **字段（开发者 gated 字段）= `devOptions.<fieldKey>`**：每个字段独立持久化、独立默认值、独立 setter。
  对应一级页内的 `v-if` 直接读字段值，不读总开关。
- **首批字段**：`plotAdvanced`（默认 `false`）→ gate 编辑剧情推进预设抽屉中的"匹配替换（进阶）"字段。
- **后续字段**：每个一级页落地时由用户挑选；约定字段命名为 `<pageId>Advanced` 或更具体的语义键。

### D24.2 开发者一级页

- 路径：[pages/DeveloperPage.vue](../../../src/presentation-v2/pages/DeveloperPage.vue)
- 注册：`page-registry.ts` 第 13 项；`group: 'developer'`（新增第 5 个 group）
- 可见性：`visibleWhen: () => useDevOptionsStore().developerOptionsEnabled`
- 内容形态：单个 AcuPanel "开发者 gated 字段"，内部用 [DashboardToggleRow](../../../src/presentation-v2/components/DashboardToggleRow.vue) 列字段（label + 描述 + AcuToggle）。
- 描述写作要求：每个字段的描述要写清楚"它 gate 的是哪一页的什么字段"，让用户能反向定位。

### D24.3 仪表盘侧改动

- 高级设置中的"启用开发者选项"toggle 行为由"乱接"修正为：写入 `developerOptionsEnabled` → sidebar 立即增加/移除"开发者"分组。
- 移除"存储模式"标题右侧的辅助 toggle（原本控制"切模式时是否一并重置填表提示词"）。该 toggle 是设计冗余：SQL 表与原生表必须用对应的默认提示词才能正确填写，没有"切模式但不重置提示词"的合法用例。
- `setStorageMode` 切换后**无条件**重置 `settings_ACU.charCardPrompt` 为对应模式的默认提示词。

### D24.4 dev-options-store 的副作用清理

- 旧版 `setDeveloperOptionsEnabled(false)` 会同时把 `plotAdvanced` 置 `false`；该副作用按 D24.1"职责分离"原则**删除**。
- 总开关与字段从此完全独立；store 不在彼此之间做任何联动。

### D24.5 退出条件

- 仪表盘 → 高级设置 → "启用开发者选项"开关切换后，sidebar 立即出现/消失"开发者"分组。
- 开发者一级页内"匹配替换（plotAdvanced）"toggle 翻动后，编辑剧情推进预设抽屉中的匹配替换字段可见性立即跟随（独立于总开关）。
- 仪表盘"存储模式"右侧无任何附加控件；切换 radio 后填表提示词无条件重置为对应模式的默认提示词。
- vitest `tests/presentation-v2/dashboard/**` + `tests/presentation-v2/plot/**` 全绿。

## 影响文件清单

| 类别 | 路径 | 说明 |
|---|---|---|
| store | [dev-options-store.ts](../../../src/presentation-v2/stores/dev-options-store.ts) / [router-store.ts](../../../src/presentation-v2/stores/router-store.ts) | 总开关与字段独立持久化；sidebar 可见性计算 |
| composable | [useDevOptions.ts](../../../src/presentation-v2/composables/useDevOptions.ts) / [useDashboardPage.ts](../../../src/presentation-v2/composables/useDashboardPage.ts) | 开发者字段读写；仪表盘设置项与存储模式逻辑 |
| 业务组件 | [DashboardToggleRow.vue](../../../src/presentation-v2/components/DashboardToggleRow.vue) | 仪表盘 / 开发者页复用 toggle 行 |
| 页面 | [DashboardPage.vue](../../../src/presentation-v2/pages/DashboardPage.vue) / [DeveloperPage.vue](../../../src/presentation-v2/pages/DeveloperPage.vue) / [PlotPage.vue](../../../src/presentation-v2/pages/PlotPage.vue) | 高级设置、开发者页、`plotAdvanced` gated 字段消费 |
| 路由 | [page-registry.ts](../../../src/presentation-v2/router/page-registry.ts) | 新增 developer 分组与 `visibleWhen` |
| 测试 | [dashboard-page.test.ts](../../../tests/presentation-v2/dashboard/dashboard-page.test.ts) / [plot-page.test.ts](../../../tests/presentation-v2/plot/plot-page.test.ts) / [router-store.test.ts](../../../tests/presentation-v2/router/router-store.test.ts) | 仪表盘、PlotPage gate、路由可见性 |

## 退出条件

- [x] 仪表盘高级设置中的"启用开发者选项"只写 `developerOptionsEnabled`。
- [x] sidebar 中"开发者"一级页随 `developerOptionsEnabled` 出现 / 消失。
- [x] `plotAdvanced` 独立持久化，不受总开关联动清空。
- [x] DeveloperPage 集中托管 `plotAdvanced` 开关。
- [x] 编辑剧情推进预设抽屉中的匹配替换字段只读 `plotAdvanced`。
- [x] 仪表盘存储模式标题右侧无辅助 toggle；切换后无条件重置默认提示词。
- [ ] ApiPage / PlotPage header actions sweep 完成。

---

## 落地记录（2026-05-08）

- **结论**：D24 已落地。仪表盘"启用开发者选项"改为只控制开发者一级页可见性；开发者页集中托管 `plotAdvanced`；编辑剧情推进预设抽屉中的匹配替换字段与总开关解耦；存储模式辅助 toggle 已删除。

### 产物清单

| 类别 | 路径 |
|---|---|
| store | [dev-options-store.ts](../../../src/presentation-v2/stores/dev-options-store.ts) / [router-store.ts](../../../src/presentation-v2/stores/router-store.ts) |
| composable | [useDevOptions.ts](../../../src/presentation-v2/composables/useDevOptions.ts) / [useDashboardPage.ts](../../../src/presentation-v2/composables/useDashboardPage.ts) |
| 业务组件 | [DashboardToggleRow.vue](../../../src/presentation-v2/components/DashboardToggleRow.vue) |
| 页面 | [DashboardPage.vue](../../../src/presentation-v2/pages/DashboardPage.vue) / [DeveloperPage.vue](../../../src/presentation-v2/pages/DeveloperPage.vue) / [PlotPage.vue](../../../src/presentation-v2/pages/PlotPage.vue) |
| 路由 | [page-registry.ts](../../../src/presentation-v2/router/page-registry.ts) |
| 测试 | [dashboard-page.test.ts](../../../tests/presentation-v2/dashboard/dashboard-page.test.ts) / [plot-page.test.ts](../../../tests/presentation-v2/plot/plot-page.test.ts) / [router-store.test.ts](../../../tests/presentation-v2/router/router-store.test.ts) |

### 测试覆盖

- 文件数：3
- 用例数：28
- 状态：文档补写验证（2026-05-08）全绿；覆盖 `dashboard-page` / `plot-page` / `router-store`。

### 验证

- [ ] typecheck（D24 历史记录未保存本项输出）
- [ ] check-arch（D24 历史记录未保存本项输出）
- [ ] 油猴构建（D24 历史记录未保存三产物构建结果）
- [ ] 扩展构建（D24 历史记录未保存三产物构建结果）
- [ ] plus 构建（D24 历史记录未保存三产物构建结果）

### 退出条件核对

| 条件 | 状态 |
|---|---|
| 仪表盘总开关控制开发者页可见性 | 通过 |
| `plotAdvanced` 与总开关独立 | 通过 |
| DeveloperPage 托管 gated 字段 | 通过 |
| 编辑剧情推进预设抽屉中的匹配替换字段跟随 `plotAdvanced` | 通过 |
| 存储模式辅助 toggle 删除 | 通过 |
| dashboard / plot / router 相关测试 | 通过（2026-05-08 当前相关测试 28/28） |
| ApiPage / PlotPage header actions sweep | 未完成 |

### 体积变化

| 产物 | raw | Δ raw | gzip | Δ gzip |
|---|---:|---:|---:|---:|
| 油猴 | 未记录 | 未记录 | 未记录 | 未记录 |
| 扩展 | 未记录 | 未记录 | 未记录 | 未记录 |
| plus | 未记录 | 未记录 | 未记录 | 未记录 |

### 已知缺口

- ApiPage API 预设面板 `#actions` 中的"流式" toggle 仍需迁入面板正文。
- PlotPage header `#actions` 中的"启用" toggle 仍需迁入"剧情推进预设"面板顶部。
- 其余可隐藏页范围与设置入口仍在 [open-questions X-6](../open-questions.md) 跟踪。

---

## 关联历史决议：P-DB-*

<details><summary>阶段 3+：仪表盘重构（P-Dashboard 全部决议落定 → 2026-05-07）</summary>

| 编号 | 决议 |
|---|---|
| P-DB-1 | 仪表盘删除 API 三件套（PresetDropdown / 编辑 / 齿轮 / ApiDrawer），改为"数据库状态"面板顶部的纯只读状态条；含 API、表格模板、剧情推进三项跳转链接。 |
| P-DB-2 | 仪表盘 header 删除 subtitle / 刷新按钮 / "API 已就绪"徽章。刷新由 chat-changed watcher 驱动；徽章信息已合并进 stats 列表。 |
| P-DB-3 | "全局开关" 改名为"开关"面板，内部用 `AcuSegmentedControl` 切换"基础设置 / 高级设置"两组。基础设置默认呈现，传达"高级设置需要谨慎，动了出问题是正常的"心理预期。 |
| P-DB-4 | 基础设置内容（旧 UI 名称还原）：启用自动更新、静默提示框。 |
| P-DB-5 | 高级设置内容：启用条件模板功能、0TK 占用模式、启用向量混合增强交火方案（新增到仪表盘，对应 `worldbookConfig.summaryVectorIndexModeEnabled` 字段）、启用开发者选项（总开关）、存储模式（radio 而非 toggle，每选项带常驻 description）。 |
| P-DB-6 | 仪表盘移除"规范填表功能"开关（隐藏不再显示）。 |
| ~~P-DB-7~~（2026-05-08 D24 修订） | "启用开发者选项"**仅**控制 sidebar"开发者"一级页的可见性，不联动任何字段的真假状态。各页"开发者 gated"字段独立持久化（如 `devOptions.plotAdvanced`），其开关 UI 集中放在开发者一级页内。详见 [D24](stage-3plus-dashboard.md)。 |
| P-DB-8 | `AcuPageHeader` 移除 `subtitle` prop（D22.3 收尾）；全 5 页 sweep 完成。`#actions` slot 仅允许状态徽章，不允许触发型控件（[原则 §12](../02-principles.md)）。 |
| P-DB-9 | `AcuRadioGroup` option 增加 `description?: string` 字段，每选项下方渲染常驻 11px 灰字。 |
| P-DB-10（2026-05-08） | 仪表盘"存储模式"标题右侧原本有一个辅助 toggle（控制切模式时是否同步重置填表提示词），属于设计冗余——SQL 表与原生表必须用对应的默认提示词才能正确填写。**砍掉**该 toggle，`setStorageMode` 切换后无条件重置 `charCardPrompt`。详见本页 §D24.3。 |

未在本次落地、作为后续债务：
- ~~开发者一级页骨架与 sidebar gating~~（2026-05-08 落地，详见 [D24](stage-3plus-dashboard.md)）
- ApiPage API 预设面板 #actions 中的"流式" toggle 迁入面板正文
- PlotPage header #actions 中的"启用" toggle 迁入"剧情推进预设"面板顶部
- AcuPanel #actions 与各页内 panel 标题右侧组件统一（参考 memory `project_uiv2_header_action_widgets_debt.md`）</details>
