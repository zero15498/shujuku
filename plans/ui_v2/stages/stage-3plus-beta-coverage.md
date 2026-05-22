# 阶段 3+：主弹窗覆盖与测试版审查

## 范围

- 阶段编号：阶段 3+ / beta coverage
- 与 charter 的关联：`00-charter.md §4` 一级页清单、`§5` 并行入口、`§8` 执行节奏
- 本阶段包含：核对 v2 主弹窗功能覆盖、更新过时 gap、记录测试版发布边界
- 本阶段不包含：下线旧 UI、Vue 化 toast / confirm、Vue 化 visualizer

## 落地记录（2026-05-09）

- 结论：v2 已覆盖旧主弹窗 7 个 Tab 的主要功能面，可在保留旧 UI 的前提下面向测试人员发布并行测试版；不可作为旧 UI 下线依据。
- 当前一级页：仪表盘、更新参数、表格模板、剧情推进、API、智能续写、外部导入、交火模式、正文替换、数据管理、SQL 控制台、运行日志、开发者选项。
- 仍不纳入测试版替代范围：toast / confirm 视觉归一、visualizer Vue 化、旧 `presentation/` 删除、api-registry 搬离 `presentation/`。

2026-05-21 后续修订：v2 toast / confirm / input dialog 试做已回滚；本阶段记录保留 2026-05-09 当时的测试版边界。当前 toast 下线前置债务仍以 [07-architecture.md](../07-architecture.md) 的 feedback port / runtime 分层为长期目标。

## 覆盖核对

| 旧 UI 区域 | v2 当前归属 | 状态 |
|---|---|---|
| 仪表盘 | `DashboardPage` | 已覆盖 |
| 更新参数 / 填表提示词 / 快速手动更新 / 手动表选择 | `FormFillPage` + `FormFillPromptDrawer` | 已覆盖；提示词保持单抽屉编辑，不升级为预设库；手动填表作为等宽面板并入更新参数页 |
| API / API 预设 | `ApiPage` + `ApiDrawer` | 已覆盖 |
| 表格模板 / 世界书注入 | `TablePage` | 已覆盖；visualizer 仍沿用旧窗口 |
| 剧情推进 | `PlotPage` + `PlotPresetDrawer` | 已覆盖 |
| 智能续写 | `ContinuationPage` | 已覆盖 |
| 外部导入 | `ImportPage` | 已覆盖；注入流程已接到 service 层，不再回旧 UI |
| 交火模式索引配置与维护 | `VectorIndexPage` | 已覆盖；高级参数受开发者选项控制 |
| 数据管理 | `DataMgmtPage` | 已覆盖；交火索引管理已迁出到交火模式页 |
| 正文替换 | `ContentReplacePage` | 已覆盖；入口仍受 feature gate 控制 |
| SQL 控制台 | `SqlConsolePage` | 已覆盖 |
| 运行日志 | `LogViewerPage` | 已覆盖 |

## 验证

- `npm run build`：通过，`scripts/check-arch.mjs` 0 违规。
- `npm run typecheck`：通过。
- v2 页面关键测试按模块 / 小批次通过：
  - `dashboard-page.test.ts`
  - `data-mgmt-page.test.ts`
  - `import-page.test.ts`
  - `api-page.test.ts`
  - `form-fill-page.test.ts`
  - `table-page.test.ts`
  - `plot-page.test.ts`
  - `continuation-page.test.ts`
  - `vector-index-page.test.ts`
  - `content-replace-page.test.ts`
  - `sql-console-page.test.ts`
  - `log-viewer-page.test.ts`
- 已知验证缺口：一次性运行 `npm test -- --run tests/presentation-v2` 会出现 Vitest 并跑超时 / DOM 未挂载类失败；同一失败文件单独或小批次重跑可通过。该问题记录到 `open-questions.md` 的 `X-7`。

## 测试版发布边界

- 允许：保留旧 UI，新增 / 保留 “打开新 UI（开发）”入口，面向测试人员收集真实酒馆环境反馈。
- 不允许：隐藏或删除旧 UI 入口；宣称 v2 已可下线旧 UI；删除旧 `presentation/` 文件。
- 测试重点：打开 / 关闭 v2、切聊天刷新、外部导入完整注入、剧情推进预设编辑、交火构建、SQL 查询、运行日志筛选、移动端导航。

## 已知缺口

- visualizer 仍是旧窗口系统。
- toast / confirm 在本阶段尚未 Vue 化；2026-05-21 试做实现已回滚，下一步 toast 收窄为 v2 主界面内短反馈，旧 `showToastr_ACU` 暂时继续服务旧 runtime / 旧 UI。
- 真机目视验收仍需覆盖 ImportPage / PlotPage 以及 2026-05-09 新增的一轮全量 smoke。
- v2 全量 Vitest 并跑稳定性需要修复或调整运行策略。
