# UI v2 文档拆分实施计划

> 目的：把当前 4 份混杂文档（合计 1443 行，主文件 1071 行）拆为按"读用时机"组织的多份文档，并将"每次开发都要遵守的原则"独立成 skill，根治 AI 落地时反复返工的问题。

---

## 1. 目标产物结构

```
plans/ui_v2/
├── README.md                    ← 索引：每份文档何时读、读什么
├── 00-charter.md                ← 项目级宪法（不变的顶层决策、范围、目标）
├── 01-architecture-map.md       ← 实现地图 + 一级页清单（稳定 lookup 资料）
├── 02-principles.md             ← 每次开发都要遵守的原则（视觉 + 工程 + 写作）
├── 03-record-template.md        ← 开发记录撰写守则（设计/落地/退出条件模板）
├── open-questions.md            ← 待决问题（合并 P-*/SUN-*/G-*/债务）
├── metrics.md                   ← 体积追踪、check-arch 规则演进
└── stages/
    ├── stage--1-spike.md
    ├── stage-0-infrastructure.md
    ├── stage-2-import-page.md
    ├── stage-3-plot-page.md
    ├── stage-3plus-component-library.md
    └── stage-3plus-dashboard.md
```

外部产物：
- `.claude/skills/ui-v2-principles/SKILL.md` — 把 02-principles 封装为 skill，触发时机见 §6

旧 4 份文档迁移完成后归档至 `plans/_archive/`，保留以便历史追溯，但不再被任何索引引用。

---

## 2. 内容拆分映射（源 → 目标）

### 2.1 `ui_v2_redesign_plan.md`（1071 行，主拆分对象）

| 源章节 | 目标位置 | 处理 |
|---|---|---|
| §1 设计目的（1.1-1.5） | `00-charter.md` | 整段搬运 |
| §2 当前 UI 实现地图（2.1-2.12） | `01-architecture-map.md` | 整段搬运；保留检索用途说明 |
| §3 顶层决策 D1-D20（**不变部分**）<br>D1/D2/D3/D9/D10/D14/D15/D15.1/D16/D18/D19 | `00-charter.md` | 搬运；编号保留方便外部引用 |
| §3 D4/D5/D6/D8/D11/D12/D13（**预设型资源决策**） | `00-charter.md` | 整组搬运为"预设资源决策"小节 |
| §3 D17（**调用边界**）<br>§D21.2 / D21.7 / D21.8 / D21.9 | `02-principles.md` | 升格为永久原则；charter 留指向链接 |
| §3 D7（已撤销） | `00-charter.md` 历史附录 | 标记 `已撤销 2026-05-03`，保留以避免外部引用断裂 |
| §3 D20 构建依赖 | `stages/stage--1-spike.md` | 阶段一次性决策 |
| §3 D21 全节 | `stages/stage-2-import-page.md` | 整段搬运 |
| §3 D22（信息条 + 等高 + 写作惯例） | `02-principles.md`（D22.3/D22.4/D22.5 写作惯例）<br>`stages/stage-2-import-page.md`（D22.1/D22.2 触发背景） | 拆 |
| §3 D23 全节 | `stages/stage-3-plot-page.md` | 整段搬运 |
| §3 D24 全节 | `stages/stage-3plus-dashboard.md` | 整段搬运 |
| §4 一级页清单（4.1-4.4） | `01-architecture-map.md` | 搬运 |
| §5.1 执行节奏 | `README.md` 索引 + `00-charter.md` | 索引侧用作时间线，charter 侧仅留范围 |
| §5.2.1 阶段 -1 spike | `stages/stage--1-spike.md` | 搬运 |
| §5.2.2 阶段 0 基础设施 | `stages/stage-0-infrastructure.md` | 搬运 |
| §5.2.3 阶段 2 导入页 | `stages/stage-2-import-page.md` | 与 D21 合并 |
| §5.2.4 阶段 3 剧情推进 | `stages/stage-3-plot-page.md` | 与 D23 合并 |
| §5.2.5 阶段 3+ 组件库 | `stages/stage-3plus-component-library.md` | 搬运 |
| §5.3 已知缺口 G-1~G-5 | `open-questions.md` | 合并入统一列表，加 `tag: gap` |
| §5.4 产物体积追踪 | `metrics.md` | 搬运并扩为持续表 |

### 2.2 `ui_v2_design_guidelines.md`（160 行）

整体并入 `02-principles.md`，§12（header 规则）与 §1-§11（视觉）作为两个并列章节。

### 2.3 `ui_v2_open_questions.md`（195 行）

| 源 | 目标 | 处理 |
|---|---|---|
| 已关闭阶段（折叠节） | `open-questions.md` 历史附录 | 保留为可折叠节，便于追溯 |
| P3-1~P3-7（未决） | `open-questions.md` 主表 | 加 `tag: design`、`status: open` |
| SUN-1~SUN-8 | `open-questions.md` 主表 | 加 `tag: shutdown` |
| X-1/X-4/X-6 | `open-questions.md` 主表 | 加 `tag: cross-stage` |
| 索引：未来阶段 | `README.md` | 移到索引文档的"路线图"小节 |

### 2.4 `ui_v2_followup_optimization_directions.md`（17 行）

整体并入 `open-questions.md`，加 `tag: debt`。文件内"§1 API 预设管理逻辑下沉"作为首条债务条目。

### 2.5 `MEMORY.md` 中的关联条目

现有 5 条 ui v2 相关 memory 条目内容不变，仅在迁移 §3 完成后批量更新内部链接：
- `project_uiv2_missing_textreplace_page.md` → 引用 `stages/stage-3plus-text-replace.md`（待新增占位）
- `project_uiv2_header_action_widgets_debt.md` → 引用 `02-principles.md#header-规则`
- `project_uiv2_lib_component_extraction.md` → 引用 `stages/stage-3plus-component-library.md`
- `project_uiv2_formfill_prompt_preset_pending.md` → 引用 `open-questions.md` 中对应条目
- `project_uiv2_open_questions.md`（如存在）→ 直接指向新 `open-questions.md`

---

## 3. 各文档骨架定义

### 3.1 `README.md`（索引，目标 < 80 行）

```
- 这套文档怎么用（按角色读：新接手 / 准备开新阶段 / 落地中 / 收尾）
- 文件清单与一句话作用
- 当前阶段状态（一行）
- 路线图（已完成阶段 + 待启动阶段）
- 修订规则：什么时候改哪份文档
```

### 3.2 `00-charter.md`（目标 250-350 行）

```
1. 设计目的与范围
2. 总目标与第一阶段验收标准
3. 不变的顶层决策（D1/D2/D3/D9/D10/D14/D15/D15.1/D16/D18/D19）
4. 预设型资源决策（D4/D5/D6/D8/D11/D12/D13）
5. 入口与挂载（D15 + D15.1 完整版）
6. 历史附录：已撤销决策（D7）
```

### 3.3 `01-architecture-map.md`（目标 200-280 行）

```
1. 技术栈与构建（§2.1）
2. 入口（§2.2）
3. 主弹窗结构与 7 个一级入口（§2.3-2.4）
4. 可视化编辑器（§2.5）
5. 共享 UI 基础设施（§2.6-2.7）
6. 业务 sync 层与 API registry（§2.8-2.9）
7. 不动层规模（§2.11-2.12）
8. v2 一级页清单与分组（§4.1-4.4）
```

### 3.4 `02-principles.md`（目标 250-300 行）—— **skill 化目标**

```
1. 视觉原则（原 design_guidelines §1-§11）
2. 页面 header / panel header 规则（原 §12 + memory 摘要）
3. 工程边界
   - D17 三档调用边界（store / composable / 直接 import）
   - D21.2 presentation 物理边界
4. 组件抽取与命名
   - D21.7 抽取阈值与平铺布局
   - X-4 防裸基础元素守护
5. 写作惯例
   - D22.3 常驻信息条 + 行级等高
   - D22.4 内容写作规则（用户画像、字数、引号）
   - D22.5 新页面强制约定（description 必填、不允许 align-items: start）
6. 操作区惯例（D21.8）
7. 测试三档（store / composable / 页面集成）
8. 自检清单（落地 PR 前必过）
```

### 3.5 `03-record-template.md`（目标 80-120 行）

定义两份内嵌模板供 stages/ 文件引用：

```
A. 开发前设计模板
   - 阶段编号 / 范围 / 与 charter 的关联
   - 决议（Dn 形式，含日期）
   - 决议要点（每条决议含：背景 / 决定 / 理由 / 退出条件）
   - 影响的文件清单（v2 路径）
   - 退出条件勾选清单

B. 开发后落地记录模板
   - 结论（一句话）
   - 产物清单（按 store / composable / 业务组件 / 页面 / 守护 / service 变更分类）
   - 测试覆盖（文件数 / 用例数 / 状态）
   - 验证（typecheck / check-arch / 三产物构建）
   - 退出条件逐条核对
   - 体积变化（油猴 / 扩展 / plus，三产物 raw + gzip + Δ）
   - 已知缺口（同步到 open-questions.md）

C. 文件命名规则
   - stages/stage-<编号>-<短描述>.md
   - 编号与 plan §5.1 对齐；同一编号下多次开发用 -aN 后缀
```

### 3.6 `open-questions.md`（目标 200-250 行）

主表为统一表格，每行格式：

```
| ID | tag | status | 描述 | 影响范围 | 阻塞 | 提出日期 |
```

`tag` 取值：`design` / `shutdown` / `gap` / `debt` / `cross-stage`
`status` 取值：`open` / `partially-closed` / `closed`

每条目下方可追加 1-2 段详情。已关闭条目折叠到末尾。

### 3.7 `metrics.md`（目标 60-100 行）

```
1. 双产物体积追踪（每阶段油猴 / 扩展 / plus 三产物 raw + gzip）
2. check-arch 规则演进（D17 / D21.2 / X-4 ……）
3. 测试规模演进（store / composable / page 三档计数）
4. 体积警戒线（X-1 30%）触发记录
```

### 3.8 `stages/<stage>.md`（每份目标 200-400 行）

```
> 引用 03-record-template.md 中的 A/B 两段模板。
> 同时承载本阶段决议（Dn）+ 落地记录 + 退出条件核对 + 体积。
> 跨阶段链接通过 plans/ui_v2/ 内相对路径。
```

---

## 4. 实施阶段

### 阶段 A：脚手架（无破坏性，1 步）

1. 创建 `plans/ui_v2/`、`plans/ui_v2/stages/`、`plans/_archive/`
2. 写入 `README.md` 占位（仅含 §1 目标产物结构 + "迁移中"标记）
3. 写入 `03-record-template.md`（先有模板，后续 stages/ 文件按模板生成）

### 阶段 B：稳定参考资料先行（低风险，因为这部分没有交叉引用）

1. `01-architecture-map.md` ← redesign_plan §2 + §4
2. `metrics.md` ← redesign_plan §5.4
3. 验证：grep 全仓 `ui_v2_redesign_plan.md` 引用，记录现存外部引用点

### 阶段 C：宪法与原则（核心拆分）

1. `00-charter.md` ← redesign_plan §1 + §3 不变决策 + §5.1
2. `02-principles.md` ← design_guidelines + redesign_plan §3 中的原则性条款（D17/D21.2/D21.7/D21.8/D21.9/D22.3-5/§12 header）
3. 内部交叉引用全部改为新路径
4. **关键校验**：人工读一遍 `02-principles.md`，确认是"读完就能动手"的密度，不能再回看 plan

### 阶段 D：阶段记录拆分

按时间序拆 6 份 stages/ 文件：

```
stage--1-spike.md         ← redesign_plan §D20 + §5.2.1
stage-0-infrastructure.md ← redesign_plan §5.2.2
stage-2-import-page.md    ← redesign_plan §D21 + §D22.1-2 + §5.2.3
stage-3-plot-page.md      ← redesign_plan §D23 + §5.2.4
stage-3plus-component-library.md ← redesign_plan §5.2.5
stage-3plus-dashboard.md  ← redesign_plan §D24 + open_questions P-DB-* 决议
```

每份用 03-record-template 模板格式重写，去掉与其他阶段的耦合上下文。

### 阶段 E：开放问题统一

1. `open-questions.md` ← open_questions 全量 + followup_optimization_directions 全量 + redesign_plan §5.3
2. 统一为 §3.6 表格格式
3. 已关闭条目折叠保留

### 阶段 F：索引与 skill 化

1. 完成 `README.md`：补 §3.1 完整内容
2. 创建 skill：`.claude/skills/ui-v2-principles/SKILL.md`
   - description 触发条件：编辑 `src/presentation-v2/**/*.vue` 或新增一级页 / 抽屉 / 面板时
   - body 内容：02-principles.md 全文 + "落地前自检清单"
3. 在仓库 `CLAUDE.md`（如存在）或新建 `plans/ui_v2/README.md` 顶部加一行触发提示，指向该 skill

### 阶段 G：交叉引用回写

需要更新内部链接的位置（grep 验证）：

- `plans/ui_v2/**/*.md` 内部 ✓
- `MEMORY.md` 中 5 条 ui v2 相关条目（详见 §2.5）
- `docs/UI-七个Tab字段清单.md` 顶部如有指向 plan 的链接
- 任何 `src/presentation-v2/**/*.{ts,vue}` 注释中引用 plan 路径的（grep `ui_v2_redesign_plan` / `ui_v2_design_guidelines` / `ui_v2_open_questions` / `ui_v2_followup_optimization_directions`）

### 阶段 H：旧文件归档

1. 将旧 4 份原文移动到 `plans/_archive/2026-05-08-ui_v2_pre_split/`
2. 在归档目录写一份 `README.md` 说明"已拆分到 plans/ui_v2/，本目录仅用于历史追溯"
3. 提交后再做一次全仓 grep，确保无遗漏引用

---

## 5. 验证与退出条件

### 5.1 内容完整性

- 旧 4 份文档每个章节、每个决策编号（D1-D24、P*-*、SUN-*、X-*、G-*、§5.2.x）至少在新结构中出现一次
- 用脚本或人工对照 `2.1-2.4` 映射表，逐项打勾
- 任何一条删除（而非搬运）必须在本计划中显式标注"废弃"理由

### 5.2 可读性

- 单文件不超过 400 行（除 stages/ 个别复杂阶段外）
- AI 阅读 `02-principles.md` 后无需再读其他文档即可开始落地（密度自检）
- `README.md` 在 80 行内说清楚"按角色该读什么"

### 5.3 链接健康度

- grep 全仓 `plans/ui_v2_*` 与 `ui_v2/` 相对路径，无 404
- MEMORY.md 5 条相关条目链接全部有效

### 5.4 skill 可用性

- 在 `src/presentation-v2/**` 编辑场景下手动触发一次 skill，确认 description 命中
- skill 内容自洽，不要求读外部文件

---

## 6. skill 化设计要点

`.claude/skills/ui-v2-principles/SKILL.md` 的 description 应包含触发关键词：

```
Use this skill BEFORE editing or creating any file in src/presentation-v2/, including .vue components, Pinia stores, composables, or test files. Also use when the user requests "实现 v2 页面 X" / "新增 v2 组件 X" / "改造 v2 X". The skill carries permanent rules that, if violated, force rework.
```

skill body 包含：
- 02-principles 全部章节
- "落地前自检清单"（10 条勾选项，覆盖 D17 边界 / 命名 / description 必填 / panel header 规则 / 测试三档）
- 与稳定参考的链接（指向 charter / architecture-map）

skill 不包含的内容：
- 各阶段决议（属于一次性，不应每次都加载）
- 待决问题（应用户主动询问时才查阅）
- 阶段完成记录（属于历史）

---

## 7. 风险与对策

| 风险 | 对策 |
|---|---|
| 拆分过程中链接失效 | 阶段 G 集中回写，提交前 grep 全仓 |
| Dn 编号被外部引用（commit / PR / memory） | 编号保留不变，只改路径；charter 与 stages 都用原编号 |
| skill description 过于宽泛导致每次都触发 | 限定为"v2 文件编辑场景"，并在 description 末尾写"非 v2 任务跳过" |
| 拆完后用户读不懂索引 | README §3.1 用"按场景"组织，不按文件名 |
| 阶段记录被改动后 charter 跟着失真 | 03-record-template 中明确"完成记录只读，不再修改；新决议写新一份" |

---

## 8. 工作量估算

| 阶段 | 内容 | 估时 |
|---|---|---|
| A | 脚手架 + 模板 | 30 分钟 |
| B | 稳定参考资料 | 1 小时 |
| C | 宪法 + 原则（含密度自检） | 2-3 小时 |
| D | 6 份阶段记录 | 2-3 小时 |
| E | 开放问题统一 | 1 小时 |
| F | 索引 + skill | 1 小时 |
| G | 交叉引用回写 | 30 分钟 |
| H | 归档 | 15 分钟 |

合计：8-10 小时，可拆为 2-3 个工作单元分批落地。建议从 **B+C+F** 开始（拿到最高 ROI 部分），D/E 可跟进。

---

## 9. 启动条件确认

正式执行前需用户确认：

1. 目录名 `plans/ui_v2/` 是否合适，还是另起 `docs/ui_v2/`？（当前 `docs/` 已被字段清单占用）
2. 旧文件归档路径用 `plans/_archive/` 还是直接保留并在文件顶部加 `> 已拆分，见 ...`？
3. 是否同意把 `02-principles.md` skill 化（需要在 `.claude/skills/` 下新建）？
4. 阶段 D 拆分时遇到决议跨阶段引用（如 D24 中提到 P3-14 的 plotAdvanced 字段），用相对链接还是内联说明？建议相对链接 + 简短内联摘要并存。
