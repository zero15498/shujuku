# UI v2 文档索引

> 本目录是 UI v2 拆分后的主文档入口。旧文档已归档到 `plans/_archive/2026-05-08-ui_v2_pre_split/`，仅用于历史追溯；新开发以本目录为唯一入口。
> 在编辑 `src/presentation-v2/` 前，Claude 使用本仓库 skill：[../../.claude/skills/ui-v2-principles/SKILL.md](../../.claude/skills/ui-v2-principles/SKILL.md)；Codex 使用用户级 skill：`ui-v2-principles`。

## 这套文档怎么用

- **新接手 UI v2**：先读 `00-charter.md` 理解目标与不可变决策，再读 `01-architecture-map.md` 定位旧/新实现。
- **准备开新阶段**：读对应 `stages/*.md`、`open-questions.md`，再补充本阶段的新决议。
- **落地中**：每次编辑 v2 文件前读/触发 `ui-v2-principles` skill；遇到范围、边界、视觉写作问题查 [02-principles.md](02-principles.md)。
- **收尾记录**：按 [03-record-template.md](03-record-template.md) 更新阶段记录（参考 [stage-2](stages/stage-2-import-page.md) 范例），并把体积、测试、未决项同步到 [metrics.md](metrics.md) / [open-questions.md](open-questions.md)。

## 文件清单

| 文件 | 何时读 | 内容 |
|---|---|---|
| `00-charter.md` | 判断范围与顶层方向时 | 设计目的、验收标准、稳定决策、入口与挂载 |
| `01-architecture-map.md` | 找旧代码、页面归属、实现地图时 | 旧 UI 地图、业务层规模、v2 一级页清单 |
| `02-principles.md` | 每次 v2 开发前 | 视觉、工程边界、组件抽取、写作和测试原则 |
| `03-record-template.md` | 新增/补充阶段记录时 | 开发前设计模板、开发后落地记录模板 |
| `04-toast-notification-plan.md` | 落地 toast / 通知前 | 全局通知语义、日志分工、迁移顺序 |
| `open-questions.md` | 开新页面或下线旧 UI 前 | P/SUN/X/G/债务统一列表 |
| `metrics.md` | 阶段收尾或构建体积变化时 | 产物体积、check-arch、测试规模追踪 |
| `stages/*.md` | 查某一阶段背景与完成记录时 | 阶段决议、产物、验证、退出条件 |

## 当前阶段

已完成：阶段 -1 / 0 / 2 / 3、组件库扩充、仪表盘开发者页修订、主弹窗 14 个 v2 一级页覆盖审查。

当前状态（2026-05-09）：v2 已覆盖旧主弹窗主要功能面，可在保留旧 UI 的前提下面向测试人员发布并行测试版；不可作为旧 UI 下线依据。toast / confirm、visualizer、旧 `presentation/` 删除仍属于下线前置债务。

阶段细节见 `stages/*.md`；长期节奏见 [00-charter.md](00-charter.md)。

## 修订规则

- 顶层不可变目标或已锁定长期决策 → 改 [00-charter.md](00-charter.md)。
- 旧/新实现定位资料 → 改 [01-architecture-map.md](01-architecture-map.md)；一级页归属在 charter §4。
- 每次开发都必须遵守的规则 → 改 [02-principles.md](02-principles.md)（**单一来源**）；SKILL.md 是 thin wrapper，仅在自检清单变动时需同步。
- 某阶段的一次性决议、产物、验证、退出条件 → 改对应 `stages/*.md`。
- 未决问题、债务、缺口 → 改 [open-questions.md](open-questions.md)。
- 体积、测试数量、架构守护规则演进 → 改 [metrics.md](metrics.md)。
