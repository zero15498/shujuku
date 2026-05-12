---
name: ui-v2-principles
description: Use this skill BEFORE editing or creating any file in src/presentation-v2/ — including .vue components, Pinia stores, composables, or v2 tests. Also use when the user asks to 实现/新增/改造 a v2 page or component. The skill enforces permanent rules that, if violated, force rework. Skip for tasks confined to docs in plans/ui_v2/ or non-v2 source files.
---

# UI v2 Principles Skill

Permanent rules for any work touching `src/presentation-v2/`. Canonical content lives in [plans/ui_v2/02-principles.md](../../../plans/ui_v2/02-principles.md) — this file is a thin wrapper to load it.

## Step 1 — Load the canonical principles

Use the Read tool on `plans/ui_v2/02-principles.md` before writing or editing any v2 file. The principles cover:

- 12 visual design rules (hierarchy, hover hints, button system, focus states, motion, micro-feedback, color, typography, responsive, density, polish)
- Page / panel header rules (only status badges, no triggers)
- Engineering boundaries (D17 三档调用边界 / D21.2 物理边界)
- Component extraction & naming (D21.7：两次出现 + 接口稳定才抽，`Acu` 前缀)
- Operation area convention (D21.8：有触发按钮才有操作区)
- 外部导入占位符规则 (D21.9)
- Persistent info banner & writing conventions (D22.3 / D22.4 / D22.5)
- Testing three tiers (store / composable / page integration)

## Step 2 — Pre-implementation self-check

After loading the principles and before writing code, verify each item:

- [ ] Vue 组件没有直接 import service 函数或单例状态，除一次性副作用例外
- [ ] `src/presentation-v2/**` 没有 import `src/presentation/**`
- [ ] 新组件两次出现且接口稳定后才抽到 `_lib/`，命名前缀使用 `Acu`
- [ ] 页面和面板标题右侧只放状态徽章，不放触发按钮或配置开关
- [ ] 每个 `AcuPanel` 都有 `description` 或等价常驻信息条
- [ ] 多列布局没有 `align-items: start` / `flex-start`
- [ ] 表单控件使用 `_lib/` 组件，不新增裸基础元素
- [ ] 触发按钮只在所属功能页内的操作区出现
- [ ] 新手说明解释"是什么 / 为什么 / 出问题怎么办"
- [ ] store / composable / 页面集成测试覆盖新增行为

## Related stable references

- Charter (顶层不变决策): [plans/ui_v2/00-charter.md](../../../plans/ui_v2/00-charter.md)
- Architecture map (旧 UI 检索资料): [plans/ui_v2/01-architecture-map.md](../../../plans/ui_v2/01-architecture-map.md)
- Stage records (本阶段背景): [plans/ui_v2/stages/](../../../plans/ui_v2/stages/)
- Open questions: [plans/ui_v2/open-questions.md](../../../plans/ui_v2/open-questions.md)

## Maintenance

When principles change: edit `plans/ui_v2/02-principles.md` only. This file (SKILL.md) does not duplicate principle content — only the trigger metadata, pointer, and self-check list. The checklist must stay aligned with `plans/ui_v2/02-principles.md` §19.
