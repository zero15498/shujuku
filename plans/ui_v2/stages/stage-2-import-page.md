# 阶段 2：外部导入页 + 组件库强制提取

> 模板见 [../03-record-template.md](../03-record-template.md)。本文件包含：开发前设计（范围 / 决议 / 影响）+ 落地记录（产物 / 测试 / 体积）。

## 范围

- 阶段编号：2
- 与 charter 的关联：落地 [charter §4](../00-charter.md) "外部导入"一级页；首次启用 [02-principles §13 D21.2](../02-principles.md) 物理边界守护
- 本阶段包含：外部导入页（ImportPage）、`_lib/` 基础组件首批抽取、ApiPage 改造为 `_lib` 消费者、`check-arch.mjs` 增加 D17 / D21.2 守护
- 本阶段不包含：剧情推进（→ stage-3）、智能续写、AI 注入流程接通（缺口 G-1）

## 决议

### D21.1 第二侦察页 = 外部导入页（2026-05-03）

- **决定**：选外部导入作为阶段 2 的承载页，形态与 API 页（"切换 + 编辑面板 + 抽屉管理"）刻意不同
- **理由**：形态差异 = 特性。两种典型形态间挤出真正可复用的基础组件，避免阶段 1 的写法被当作模板套到所有页

### D21.2 `presentation/` 物理边界（2026-05-03）

- **决定**：`src/presentation-v2/**` 任何代码（含 `.vue` / `.ts` / 测试）禁止 import `src/presentation/`
- **理由**：与 D17 叠加形成新旧 UI 在源码层的物理隔离；老 `presentation/` 的归档 / 删除发生在"下线旧 UI"阶段，前置任务见 [open-questions SUN-8](../open-questions.md)
- **实施**：阶段 2 起 `scripts/check-arch.mjs` 增加该规则

### D21.3 业务组件复用方式：Vue 从零重写（2026-05-03）

- **决定**：`WorldbookSelector.vue` 与 `TableSelector.vue` 从零写一份 Vue 组件 + composable，**不**包装旧组件
- **理由**：包装旧组件会引入对 `presentation/` 的隐性依赖，与 D21.2 冲突
- **过渡**：旧组件保留至下线旧 UI 时随 `presentation/` 一并归档

### D21.4 导入流业务函数（2026-05-03）

- **决定**：v2 `useImportFlow` composable 直接调 `service/import/`、`service/worldbook/`、`shared/` 等非 presentation 层函数
- **理由**：旧 `triggers/import-process.ts` 含读 DOM 胶水，需 v2 重写
- **service 层缺口处理**：优先 composable 适配（X-5 惯例），service 层不做大改

### D21.5 导入暂存缓存的状态契约（2026-05-03）

- **决定**：`useImportFlowStore` 持有 `stagingMeta`（文件名 / 段数 / 总字符数 / 最近变更时间），由 store 的 refresh action 主动从底层 storage 读出
- **关键操作**（拆分完成 / 注入完成 / 清空缓存）执行后必须触发 store refresh；不允许只更新一段文案
- **理由**：旧 UI 文案与底层状态分离导致刷新滞后

### D21.6 SUN-7 前置任务（api-registry 搬迁，2026-05-03）

- **决定**：下线旧 UI 前必须把 `presentation/bootstrap/api-registry.ts` 与 `api-groups/*` 搬到 `presentation/` 之外（建议 `src/host-api/`）
- **理由**：它是对外契约（[实现地图 §2.9](../01-architecture-map.md)），不是 UI 代码
- **何时**：阶段 2 不必做，作为下线决策时的硬阻塞，跟踪在 [open-questions SUN-8](../open-questions.md)

### D21.7 `_lib/` 组件库布局（已升格为永久原则，见 [02-principles §14](../02-principles.md)）

### D21.8 操作区布局惯例（已升格为永久原则，见 [02-principles §15](../02-principles.md)）

### D21.9 移除"屏蔽外部导入世界书条目占位符"开关（已升格为永久原则，见 [02-principles §16](../02-principles.md)）

### D21.10 阶段 2 内部步骤

```
1. 调研：通读旧 import 代码 + service/import / service/worldbook，列出 _lib 候选清单
2. 桥接：useImportFlowStore + useWorldbookSelector + useImportFlow
3. 业务组件：WorldbookSelector.vue + TableSelector.vue
4. 落地页：ImportPage.vue（先有意保留与 API 页的重复写法）
5. 强制抽取：把两次以上出现的写法搬到 _lib/，回写改造 ApiPage
6. 守护：扩展 check-arch.mjs（D17 + D21.2 双规则）
7. 测试：store / composable / 组件 / 页面四档
8. 体积：跑三产物，记录在落地记录
```

### D22.1 / D22.2 触发背景（D22 起源）

- **D22.1 用户画像约束**：新 UI 预设用户是"完全不懂电脑、也不懂软件设计常识"的人。任何需要 hover / 点击 / 展开才能看到的说明，对该用户群体等于不存在
- **D22.2 旧 `subtitle` 形态的两个问题**：
  1. 可见性不可控：在 header 里渲染较长 subtitle，窄屏会被压缩到 2-3 行，与同行无 subtitle 的面板高度严重不一致
  2. 无字数预算：把 subtitle 限制成短句又会牺牲对新手用户最关键的"为什么"信息
- **决议结果（D22.3 / D22.4 / D22.5）**：见 [02-principles §17](../02-principles.md)

## 退出条件（D21.11）

- ImportPage 功能等价于旧 import tab（视觉验收）
- ApiPage / ImportPage 之间无重复实现（裸基础元素仅限合理例外）
- check-arch.mjs 通过（不引入新违规）
- vitest `tests/presentation-v2/**` 全绿
- 三产物体积增量记录在册

---

## 落地记录（2026-05-03）

- **结论**：D21 全部落地。ImportPage 形态搭建完毕，`_lib/` 基础组件集抽出，ApiPage 改造为 `_lib` 消费者。`check-arch.mjs` 增加 D17/D21.2 守护规则。

### 产物清单

| 类别 | 路径 |
|---|---|
| 业务组件 | [WorldbookSelector.vue](../../../src/presentation-v2/components/WorldbookSelector.vue) / [TableSelector.vue](../../../src/presentation-v2/components/TableSelector.vue) |
| _lib 基础 | [AcuButton.vue](../../../src/presentation-v2/components/_lib/AcuButton.vue) / [AcuPanel.vue](../../../src/presentation-v2/components/_lib/AcuPanel.vue) / [AcuFormRow.vue](../../../src/presentation-v2/components/_lib/AcuFormRow.vue) / [AcuMessage.vue](../../../src/presentation-v2/components/_lib/AcuMessage.vue) |
| Pinia store | [import-flow-store.ts](../../../src/presentation-v2/stores/import-flow-store.ts) |
| Composables | [useImportFlow.ts](../../../src/presentation-v2/composables/useImportFlow.ts) / [useWorldbookSelector.ts](../../../src/presentation-v2/composables/useWorldbookSelector.ts) |
| 页面 | [ImportPage.vue](../../../src/presentation-v2/pages/ImportPage.vue)（重写）/ [ApiPage.vue](../../../src/presentation-v2/pages/ApiPage.vue)（改造） |
| service 变更 | [update-orchestrator.ts:301](../../../src/service/table/update-orchestrator.ts#L301) — D21.9 强制排除导入标签世界书条目 |
| 守护 | [check-arch.mjs](../../../scripts/check-arch.mjs) 新增 3 条 v2 边界规则 |

### 测试覆盖

- 文件数：11
- 用例数：57
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
| ImportPage 功能等价旧 import tab | 部分（jsdom 通过；G-2 真机待补；G-1 按设计延后） |
| 两页无重复实现 | 通过 |
| check-arch 通过 | 通过 |
| v2 测试全绿 | 通过（57/57） |
| 体积记录在册 | 通过 |

### 体积变化（vs 阶段 0 基线）

| 产物 | raw | Δ raw | gzip | Δ gzip |
|---|---:|---:|---:|---:|
| 油猴 | 4,786,121 | +2.97% | 1,139,164 | +2.27% |
| 扩展 | 4,534,652 | +2.87% | 1,129,028 | +2.33% |
| plus | 4,534,855 | +2.87% | 1,129,142 | +2.33% |

### 已知缺口

- G-1（AI 注入流程未在 v2 接通）/ G-2（ImportPage 真机目视验收）见 [open-questions.md](../open-questions.md)
