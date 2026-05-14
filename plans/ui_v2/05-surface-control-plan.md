# UI v2 表面层级与控件底色调整计划

## 背景

当前 v2 主题里 `--acu-bg-2` 被同时用于两类完全不同的对象：

- **控件底色**：`AcuInput`、`AcuTextarea`、`AcuSelect`、`AcuPresetDropdown`、普通按钮等。
- **内嵌表面**：`AcuInfoBanner`、`AcuStatsList`、`AcuPromptSegments`、页面摘要块、抽屉里的表单 section、列表卡片等。

这会导致一个具体问题：输入框放进 `--acu-bg-2` 的内嵌块后，输入框和容器底色相同；又因为控件常见样式是 `border: 0`，浅色主题下输入框边界几乎消失。

参考图里的有效方向不是“继续增加卡片层级”，而是：

- 大面板承载主要分组。
- 面板内部尽量扁平，靠排版、间距、细分隔线表达结构。
- 输入区保持明确的控件边界。
- 状态/警告才使用更明显的色块。

## 结论

不建议一次性全量落地。

原因是 `--acu-bg-2` 已经覆盖大量共享组件和页面局部样式。直接把某个 token 换色会同时影响按钮、列表项、说明条、抽屉、统计块、选择器、提示词编辑器等区域；直接给输入控件加边框也会改变现有“无边框控件”的设计语言。

应该先建立语义规则，再分批替换。

## 目标规则

### 1. 背景层级

- `--acu-bg-0`：应用背景、sidebar、主区域底色。
- `--acu-bg-1`：一级面板、抽屉、弹层主体。
- `--acu-bg-2`：输入控件、弱按钮、可点击行的默认底。不要作为 `AcuPanel` 内部的静态嵌套卡片底色。
- `--acu-bg-3`：倾向移除。背景 token 不应长期承担 hover 语义；hover/pressed 应由文字色、透明度、阴影、轻量 overlay 或明确的 active/accent 状态表达。

原则上，`AcuPanel` 内部不要再默认嵌套 `--acu-bg-2` 卡片。所有使用 `--acu-bg-2` 作为静态内嵌表面的区域都应被审查并移除；需要分组时优先使用：

- 标题行。
- 边框或分隔线。
- spacing 梯度。
- 透明背景的行组。
- 语义状态条。

### 2. 控件边界

`AcuInput`、`AcuTextarea`、`AcuSelect` 这类输入控件必须在以下场景都可识别：

- 放在 `--acu-bg-1` 面板上。
- 放在透明行组里。
- 不再放进同为 `--acu-bg-2` 的静态内嵌卡片里。

推荐基线：

- 默认仍可使用 `--acu-bg-2`。
- 禁止为输入控件引入边框或 inset outline。输入控件的可识别性必须通过周围容器扁平化来保证，而不是让控件自身变成描边框。
- focus ring 继续使用 `--acu-accent-glow`。
- hover 不能依赖 `--acu-bg-3`。如需 hover 反馈，优先使用文字色变化、轻量阴影、透明 overlay 或明确的 active/accent 状态。

### 3. 信息说明

`AcuInfoBanner` 不应默认表现成一张嵌套卡片。建议改为扁平说明区：

- 默认 `info/tip`：透明背景，左侧图标或细线，文字使用 `text-2/text-3`。
- `warning`：保留语义色弱底或左侧警示线。
- `AcuPanel.description` 继续满足“常驻说明”要求，但视觉上不制造卡片嵌套。

## 分阶段计划

### P1. 最小修复：移除吞掉控件的内嵌表面

范围：

- 当前包含输入控件的 `--acu-bg-2` 静态容器。
- `AcuInfoBanner.vue` 在 `AcuPanel.description` 中的默认表现。
- 抽屉里的表单 section。
- 页面内把输入区包起来的 summary/card/form section。

改动：

- 删除这些静态内嵌卡片底色，改为透明布局、标题行、分隔线、紧凑 row。
- 保持输入控件无边框、现有尺寸、圆角、focus ring 和测试契约。
- 不把 `--acu-bg-2` 从控件本身移除。

验收：

- 浅色主题下，输入框不再放在同色 `--acu-bg-2` 静态容器里。
- 深色主题下，扁平分组仍能通过标题、间距、分隔线识别。
- 表单控件 focus 状态仍明显。

### P2. 扁平化说明与只读信息块

范围：

- `AcuInfoBanner.vue`
- `AcuStatsList.vue`
- `AcuPromptSegments.vue`
- `AcuMessage.vue` 的 info 态
- 页面内 `summary` / `status` / `empty` 一类非交互展示块

改动：

- 默认说明区从 `bg2` 卡片改为透明或弱分隔线样式。
- 统计/摘要类块按用途区分：只读数据可用透明行组、标题行、分隔线或紧凑 row；不要再用 `bg2` 做静态卡片底色。
- warning/success/danger 仍保留语义底色，但降低面积和饱和度。

验收：

- `AcuPanel` 内的 `description` 不再像“卡片中套卡片”。
- 页面仍能满足“每个面板有常驻说明”的测试。
- 输入控件不会和说明区底色混在一起。

### P3. 页面级清理

范围：

- `ApiPage`
- `DashboardPage`
- `ContinuationPage`
- `ContentReplacePage`
- `SqlConsolePage`
- `LogViewerPage`
- `FormFillPage`
- 抽屉组件中的 section/list item

改动：

- 逐页判断 `bg2` 是在表达控件、弱按钮、可点击行，还是静态嵌套卡片。
- 对只读摘要和静态分组优先改为透明布局、分隔线、紧凑 row。
- 可点击列表项保留 hover 态，静态块不使用交互态样式。

验收：

- 同一面板内常驻背景层级不超过 `bg1/bg2` 两层。
- 页面没有明显的卡片嵌套。
- 可交互元素和静态展示区在 0.3 秒内可区分。

### P4. 主题 token 收敛与 `bg3` 移除

范围：

- `theme-types.ts`
- `builtin-themes.ts`
- `02-principles.md`

改动：

- 移除 `bg3` token，新增语义 token `hoverOverlay` / `--acu-hover-overlay`。
- hover/pressed 不再以“背景层级 +1”作为默认表达。
- 对普通 hover，优先使用文字色、透明度、轻量阴影、`--acu-hover-overlay`、`color-mix()` overlay 或局部元素变化。
- 对当前项、主操作、focus ring，继续使用 accent/focus 语义；不要把 accent 当成所有 hover 的通用色。
- 自绘 button 型控件使用 `:focus-visible` 展示 focus ring，触屏点击后的普通 focus 不残留外框。
- 语义 token 必须同时更新全部内置主题。

验收：

- 主题 token 命名能表达用途，而不是让 `bg2/bg3` 同时承担所有职责。
- 浅色/深色/经典/特殊主题都能通过视觉检查。

## 推荐执行顺序

先做 P1，再做 P2。P1 通过删除同色内嵌表面解决当前“输入框看不见”的功能性问题，同时保留输入控件无边框设计；P2 解决“卡片嵌套”的主要观感问题。P3 和 P4 适合作为 sweep，不要和 P1/P2 混在同一个提交里。

## 测试与检查

- 运行现有 v2 组件测试和页面集成测试。
- 对浅色管理台、深色管理台至少各做一次人工视觉检查。
- 重点检查：
  - `FormFillPage` 数字输入和规则输入。
  - API/剧情预设抽屉里的表单 section。
  - 面板 description。
  - 下拉、按钮、分段控制、checkbox/toggle 的 hover/focus。
  - 是否还有输入控件被放在 `--acu-bg-2` 静态内嵌卡片中。

## 非目标

- 不在本轮重写主题系统。
- 不新增大面积装饰背景。
- 不为输入控件新增边框。
- 不把所有页面改成参考图的视觉风格；只吸收“少嵌套、控件明确、排版分组”的原则。
