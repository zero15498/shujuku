# 阶段 3+：组件库扩充

> 模板见 [../03-record-template.md](../03-record-template.md)。本文件包含：开发前设计（范围 / 决议 / 影响）+ 落地记录（产物 / 测试 / 缺口）。

## 范围

- 阶段编号：3+
- 与 charter 的关联：延续 [02-principles §14 D21.7](../02-principles.md) `_lib/` 组件库布局与 [02-principles §17 D22](../02-principles.md) 常驻信息条 / 表单写作惯例
- 本阶段包含：为剩余 9 个未实现页补齐基础控件、重写 AcuToggle 视觉、抽取可复用选择 / 输入 / 规则对 / prompt segments 组件
- 本阶段不包含：各业务页功能实现、已有页面全量回写、X-4 裸基础元素 check-arch 强制守护、三产物体积重新测量

## 决议

### CL-1. 控件语义拆分：toggle 与 checkbox 分离（2026-05-04）

- **背景**：旧实现中"启用/禁用"和"选项勾选"都容易落成原生 checkbox，视觉和语义都混在一起。
- **决定**：`AcuToggle` 专用于功能开关，重写为胶囊轨道 + 圆形把手；新增 `AcuCheckbox` 专用于选项勾选。
- **理由**：用户能从控件形态判断操作含义，后续页面也能避免裸 `<input type="checkbox">`。
- **退出条件**：两个组件都有自绘语义、ARIA 状态和测试覆盖。

### CL-2. 表单与互斥选择控件补齐（2026-05-04）

- **背景**：填表、智能续写、正文替换、仪表盘存储模式等后续页需要统一 input / radio 形态。
- **决定**：新增 `AcuInput`、`AcuRadioGroup`、`AcuRulePairList`，并保留 `AcuSelect` / `AcuTextarea` 等既有表单组件。
- **理由**：先补齐基础控件，后续页面实现时不再新增裸基础元素。
- **退出条件**：基础文本 / 数字 / 密码输入、radio 互斥选择、规则 pair 增删都能通过 `_lib/` 消费。

### CL-3. Prompt segments 泛化（2026-05-04）

- **背景**：PlotPage 的 `PlotPromptSegments` 已验证提示词段编辑形态，填表 / 智能续写 / 正文替换也会复用同类结构。
- **决定**：抽出 `AcuPromptSegments` 通用组件，`PlotPromptSegments` 变成薄包装层保持向后兼容。
- **理由**：复用阈值已达到 D21.7 的"两次出现 + 接口稳定"，继续复制会扩大维护成本。
- **退出条件**：通用组件支持 role / slot options / rows / emptyText 配置，PlotPage 既有行为不变。

## 影响文件清单

| 类别 | 路径 | 说明 |
|---|---|---|
| _lib 基础 | `src/presentation-v2/components/_lib/AcuToggle.vue` / `AcuCheckbox.vue` / `AcuInput.vue` / `AcuRadioGroup.vue` / `AcuRulePairList.vue` / `AcuPromptSegments.vue` | 本阶段核心新增 / 重写组件 |
| _lib 既有 | `src/presentation-v2/components/_lib/AcuButton.vue` / `AcuIconButton.vue` / `AcuPanel.vue` / `AcuInfoBanner.vue` / `AcuFormRow.vue` / `AcuSelect.vue` / `AcuPresetDropdown.vue` / `AcuTextarea.vue` / `AcuMessage.vue` | 纳入组件库清单 |
| 业务组件 | [PlotPromptSegments.vue](../../../src/presentation-v2/components/PlotPromptSegments.vue) | 改为 `AcuPromptSegments` 薄包装层 |
| 测试 | `tests/presentation-v2/components/*` | 覆盖选择控件、常驻信息条、segmented control 等基础控件 |

## 退出条件

- [x] `AcuToggle` 与 `AcuCheckbox` 语义和视觉分离。
- [x] `AcuInput` 支持 text / number / password。
- [x] `AcuRadioGroup` 支持互斥选择与选项 description。
- [x] `AcuRulePairList` 支持 `{start, end}[]` 增删编辑。
- [x] `AcuPromptSegments` 从 PlotPromptSegments 泛化，PlotPromptSegments 保持兼容。
- [ ] 旧页面裸 `<input>` / `<button>` / `<select>` 全量回写完成。
- [ ] X-4 check-arch 强制守护落地。

---

## 落地记录（2026-05-04）

- **结论**：为剩余 9 个未实现页补齐基础控件。AcuToggle 重写为胶囊把手样式；新增 5 个 `_lib` 组件；PlotPromptSegments 泛化为 AcuPromptSegments 通用组件。

### 产物清单

| 类别 | 路径 |
|---|---|
| _lib 新增 / 重写 | [AcuToggle.vue](../../../src/presentation-v2/components/_lib/AcuToggle.vue) / [AcuCheckbox.vue](../../../src/presentation-v2/components/_lib/AcuCheckbox.vue) / [AcuInput.vue](../../../src/presentation-v2/components/_lib/AcuInput.vue) / [AcuRadioGroup.vue](../../../src/presentation-v2/components/_lib/AcuRadioGroup.vue) / [AcuRulePairList.vue](../../../src/presentation-v2/components/_lib/AcuRulePairList.vue) / [AcuPromptSegments.vue](../../../src/presentation-v2/components/_lib/AcuPromptSegments.vue) |
| 业务组件 | [PlotPromptSegments.vue](../../../src/presentation-v2/components/PlotPromptSegments.vue)（改为薄包装层） |
| 测试 | [acu-choice-controls.test.ts](../../../tests/presentation-v2/components/acu-choice-controls.test.ts) / [acu-info-banner.test.ts](../../../tests/presentation-v2/components/acu-info-banner.test.ts) / [acu-segmented-control.test.ts](../../../tests/presentation-v2/components/acu-segmented-control.test.ts) |

### _lib 组件库清单（截至本次记录）

| 组件 | 用途 | props 要点 |
|---|---|---|
| [AcuButton.vue](../../../src/presentation-v2/components/_lib/AcuButton.vue) | 通用按钮 | variant: default/primary/danger; size: sm/md; iconOnly |
| [AcuIconButton.vue](../../../src/presentation-v2/components/_lib/AcuIconButton.vue) | 纯图标按钮 | icon; variant: default/danger/accent; size: md/sm |
| [AcuPanel.vue](../../../src/presentation-v2/components/_lib/AcuPanel.vue) | 面板容器 | title; description（自动渲染 AcuInfoBanner）; slots: title/actions/description |
| [AcuInfoBanner.vue](../../../src/presentation-v2/components/_lib/AcuInfoBanner.vue) | 常驻说明条 | tone: info/tip/warning |
| [AcuFormRow.vue](../../../src/presentation-v2/components/_lib/AcuFormRow.vue) | 表单行布局 | label; hint; slot 内子元素自动获取主题样式 |
| [AcuSelect.vue](../../../src/presentation-v2/components/_lib/AcuSelect.vue) | 自定义单选下拉 | options: {value,label}[]; modelValue; placeholder; size: sm/md |
| [AcuPresetDropdown.vue](../../../src/presentation-v2/components/_lib/AcuPresetDropdown.vue) | 预设选择下拉（带星标全局默认） | items: {name?, value?, label?, meta}[]; modelValue; defaultName; disabled; placeholder; emits: set-default |
| [AcuTextarea.vue](../../../src/presentation-v2/components/_lib/AcuTextarea.vue) | 多行文本输入 | modelValue; rows; placeholder; disabled |
| [AcuMessage.vue](../../../src/presentation-v2/components/_lib/AcuMessage.vue) | 提示消息 | type: info/success/warning/error |
| [AcuToggle.vue](../../../src/presentation-v2/components/_lib/AcuToggle.vue) | 胶囊把手开关 | modelValue: boolean; label; disabled — **本次重写**：从原生 checkbox 改为胶囊轨道 + 圆形滑块 |
| [AcuCheckbox.vue](../../../src/presentation-v2/components/_lib/AcuCheckbox.vue) | 传统勾选框 | modelValue: boolean; label; disabled — **本次新增** |
| [AcuInput.vue](../../../src/presentation-v2/components/_lib/AcuInput.vue) | 统一文本/数字/密码输入 | modelValue; type: text/number/password; min/max/step; size: sm/md — **本次新增** |
| [AcuRadioGroup.vue](../../../src/presentation-v2/components/_lib/AcuRadioGroup.vue) | 单选组 | options: {value,label}[]; modelValue; name; direction: horizontal/vertical — **本次新增** |
| [AcuRulePairList.vue](../../../src/presentation-v2/components/_lib/AcuRulePairList.vue) | 可增删的开始词/结束词 pair 列表 | modelValue: {start,end}[]; startPlaceholder; endPlaceholder; addLabel — **本次新增** |
| [AcuPromptSegments.vue](../../../src/presentation-v2/components/_lib/AcuPromptSegments.vue) | 提示词段编辑器（通用） | segments: PromptSegment[]; roleOptions; slotOptions; showSlot; rows; emptyText — **本次从 PlotPromptSegments 提取** |

### 变更说明

- **AcuToggle**：视觉从原生 checkbox 改为 36×20px 胶囊轨道 + 14px 圆形把手，开启时强调色填充。AcuToggle 用于"启用/禁用"型功能开关。
- **AcuCheckbox**：16×16px 方形框，勾选时填充强调色 + 白色对勾。用于列表批量勾选、选项勾选等场景。两者语义区分：toggle = 开关状态切换，checkbox = 选项勾选。
- **AcuInput**：统一兼容 text/number/password 三种类型，number 模式隐藏原生 spinner，emit `update:modelValue`（实时）和 `change`（失焦）。替代此前各页面散落的裸 `<input>` 标签。
- **AcuRadioGroup**：支持水平/垂直布局，自定义圆形 radio dot。用于仪表盘存储模式、表格页世界书来源等互斥选择。
- **AcuRulePairList**：内嵌 AcuInput + AcuIconButton，v-model 驱动的 `{start, end}[]` 数组。填表/智能续写/正文替换 3 页 ×2（提取规则 + 排除规则）= 6 处消费。
- **AcuPromptSegments**：从 [PlotPromptSegments.vue](../../../src/presentation-v2/components/PlotPromptSegments.vue) 泛化。接口类型由 `PlotPromptSegment` 改为通用 `PromptSegment`（结构相同）；role/slot options 改为可配置 props（默认值保持 SYSTEM/USER/ASSISTANT + 普通段/主插槽A/主插槽B）。PlotPromptSegments 改为 AcuPromptSegments 的薄包装层，保持向后兼容。
- 已有页面（ApiPage、PlotPage、ImportPage）中的裸 `<input>` / 裸 `<input type="radio">` 尚未回写替换为新 _lib 组件；回写计划在各页面迭代时顺带进行。

### 测试覆盖

- 文件数：未完整记录
- 用例数：116
- 状态：112/116 通过；4 个失败为预存 DOM 选择器问题，与本次无关。
- 文档补写验证（2026-05-08）：组件相关测试 3 files / 19 tests 全绿（`acu-choice-controls` / `acu-info-banner` / `acu-segmented-control`）。

### 验证

- [x] typecheck
- [ ] check-arch（X-4 守护尚未落地）
- [ ] 油猴构建（本阶段记录未保存三产物构建结果）
- [ ] 扩展构建（本阶段记录未保存三产物构建结果）
- [ ] plus 构建（本阶段记录未保存三产物构建结果）

### 退出条件核对

| 条件 | 状态 |
|---|---|
| Toggle / Checkbox 语义拆分 | 通过 |
| Input / Radio / RulePairList 补齐 | 通过 |
| PromptSegments 泛化 | 通过 |
| v2 测试未引入新增失败 | 通过（历史记录 112/116，4 个失败为预存问题；2026-05-08 相关组件测试 19/19 通过） |
| 旧页面裸基础元素全量回写 | 未完成 |
| X-4 check-arch 守护 | 未完成 |

### 体积变化

| 产物 | raw | Δ raw | gzip | Δ gzip |
|---|---:|---:|---:|---:|
| 油猴 | 未记录 | 未记录 | 未记录 | 未记录 |
| 扩展 | 未记录 | 未记录 | 未记录 | 未记录 |
| plus | 未记录 | 未记录 | 未记录 | 未记录 |

### 已知缺口

- X-4（防裸基础元素守护）仍在 [open-questions.md](../open-questions.md) 跟踪。
- 已有页面回写替换裸基础元素未在本阶段完成，计划在各页面迭代时顺带处理。

---
