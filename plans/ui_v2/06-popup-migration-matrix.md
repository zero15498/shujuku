# UI v2 旧弹窗迁移矩阵

> 日期：2026-05-19  
> 范围：只审计 `src/presentation/**` 的旧弹窗、旧窗口、原生 `confirm/prompt`、自定义 overlay / progress toast；不删除旧调用，不改业务逻辑。

## 全局迁移原则

后续旧弹窗迁移阶段默认遵守本节，不需要在每次任务中重复声明：

- 旧 UI 弹窗默认都要保留语义并迁移，除非阶段任务明确允许删除。
- `src/presentation-v2/**` 不直接 import `src/presentation/**`。
- v2 按钮触发的操作优先只显示 v2 自身表层。2026-05-21 回滚后，`toast-store` / `confirm-store` / `AcuToastViewport` / `AcuConfirmViewport` 不代表当前实现，只代表后续可重新落地的目标形态。
- 旧 UI 路径继续显示旧弹窗。
- 对运行时全局任务，不再把“双弹”作为目标状态；2026-05-21 需求收窄后，新 v2 toast 不再接管旧 runtime / 旧 UI 全局反馈，旧 `showToastr_ACU` 暂时保留原语义，confirm / prompt / window 仍按本矩阵逐项迁移。
- 迁移后不要删除旧 `showToastr_ACU` / `showCustomConfirm_ACU` / 原生 `confirm/prompt` 调用，除非本阶段明确要求下线旧路径。
- 每阶段都补对应测试，至少覆盖一个成功反馈、一个失败 / 取消 / 确认分支。

## 迁移边界

- 旧 UI 路径继续保留旧 `showToastr_ACU` / `showCustomConfirm_ACU` / 原生 `confirm/prompt` / `createACUWindow` 语义，直到对应旧路径明确下线。
- 迁移 `prompt(...)` 时不要直接用 confirm-store 代替，应设计 v2 输入弹窗、drawer 表单或就地输入控件。
- 进度 toast / overlay 迁移优先落到业务执行区状态；只有短结果使用普通 toast。

## 总数统计

原始审计时旧弹窗调用点共 **368** 个；本轮复扫后当前剩余 **305** 个（2026-05-20，排除 `theme/toast.ts` / `theme/custom-confirm.ts` / `window-system.ts` 的实现定义）：

| 类型 | 数量 | 说明 |
|---|---:|---|
| `showToastr_ACU(...)` | 269 | 不含 `theme/toast.ts` 的函数定义；当前仍是旧 runtime / 旧 UI 的主要 toast 调用面。新 v2 toast 收窄为主界面内反馈后，本矩阵不再要求改造为全局路由器 |
| `showCustomConfirm_ACU(...)` | 3 | 不含 `theme/custom-confirm.ts` 的函数定义 |
| 原生 `confirm(...)` | 23 | 不含 `custom-confirm.ts` 注释 |
| 原生 `prompt(...)` | 8 | 命名 / 额外提示输入 |
| `createACUWindow(...)` | 2 | 不含 `window-system.ts` 定义和注释 |

原始审计按功能域统计：

| 功能域 | 总数 | toast | custom confirm | native confirm | prompt | window |
|---|---:|---:|---:|---:|---:|---:|
| 启动/打开 | 8 | 7 | 0 | 0 | 0 | 1 |
| 配置页 | 51 | 49 | 1 | 0 | 1 | 0 |
| 数据管理 | 129 | 109 | 0 | 14 | 6 | 0 |
| API | 22 | 22 | 0 | 0 | 0 | 0 |
| 剧情推进 | 38 | 34 | 0 | 4 | 0 | 0 |
| 外部导入 | 26 | 26 | 0 | 0 | 0 | 0 |
| 交火模式 | 2 | 2 | 0 | 0 | 0 | 0 |
| 正文替换运行时 | 43 | 39 | 0 | 4 | 0 | 0 |
| visualizer | 17 | 8 | 0 | 5 | 3 | 1 |
| 模板助手 | 8 | 8 | 0 | 0 | 0 | 0 |
| 主题管理 | 12 | 11 | 1 | 0 | 0 | 0 |
| 运行时 hooks | 12 | 11 | 1 | 0 | 0 | 0 |

复合表层补充：`update-process.ts:143`、`plot-planning-ui.ts:29`、`summary-vector-index-ui.ts:35`、`optimization-ui-overlay.ts:93` 是带进度 / 停止按钮 / 长任务语义的旧 toast；`optimization-ui-overlay.ts:24,90` 是正文替换 overlay + progress toast 封装；`remote-memory-archive-progress.ts:38,118,140` 是交火远程归档 overlay 工具，目前本次扫描未发现调用点。

旧表层实现入口：

| 实现 | 来源 | 行号 | 备注 |
|---|---|---|---|
| 旧 toast 包装 | `src/presentation/theme/toast.ts` | 264 | `showToastr_ACU`，仍服务旧 UI 和未迁移旧流程。 |
| 旧自定义确认框 | `src/presentation/theme/custom-confirm.ts` | 40 | `showCustomConfirm_ACU`，DOM 挂载到 top-level document。 |
| 旧窗口系统 | `src/presentation/window/window-system.ts` | 117, 231, 233, 281, 290 | `createACUWindow` 与 `.acu-window-overlay` 创建 / 点击关闭 / 移除逻辑。 |
| 旧窗口 overlay 样式 | `src/presentation/window/window-styles.ts` | 80 | `.acu-window-overlay` 的背景、模糊与入场动画。 |
| 正文替换 overlay | `src/presentation/components/optimization-ui/optimization-ui-overlay.ts` | 24, 90, 114, 124 | 全屏 overlay 与 progress toast 封装。 |
| 远程记忆归档 overlay | `src/presentation/components/remote-memory-archive-progress.ts` | 38, 118, 140 | 显示 / 更新 / 隐藏工具；本次未发现调用点。 |

## 后续阶段标签

| 阶段 | 目标 |
|---|---|
| M1 配置与短反馈 | 配置页、API、数据管理中已由 v2 页面承接的保存 / 导入 / 导出 / 校验反馈，后续重新接入 v2 toast / confirm。 |
| M2 执行流与运行时 | 手动填表、自动循环、聊天切换、启动钩子等运行时任务，旧 toast 入口暂时保留；后续若进入旧 UI 下线阶段，再按 07 的 runtime / feedback 分层重新设计。 |
| M3 长任务与进度表层 | 外部导入、剧情规划、交火索引、正文替换等进度 toast / overlay，迁移为 v2 执行区状态或专用任务反馈。 |
| M4 visualizer 与模板助手 | 迁移 visualizer、模板助手、旧 `createACUWindow` 路径；v2 侧用路由 / drawer / 后续确认表层。 |
| M5 主题与旧路径收尾 | 主题管理、旧 toast / confirm / window 系统清理；涉及旧主题文件格式时先产品确认。 |

策略枚举：

- **v2 完全替代**：v2 入口使用 v2 弹窗；旧 UI 调用只在旧入口保留。
- **v2 追加且旧 UI 保留**：同一业务在 v2 中新增 v2 反馈，旧调用不删。
- **旧 toast 保留**：运行时全局 toast 暂时保留旧 `showToastr_ACU` 调用面；不路由到 v2 面板内 toast。后续旧 UI 下线时按 [07-architecture.md](07-architecture.md) 的 runtime / feedback 分层重新处理。
- **需要产品确认**：旧语义、旧格式或长期形态不确定，先确认再迁移。

## 本轮下线准备记录（2026-05-20，2026-05-21 更正）

- 删除清单：无。复核后没有发现同时满足“v2 完全替代且旧入口不再使用”的旧弹窗文件或调用点；旧主弹窗仍由 `src/presentation/bootstrap/startup.ts` 的旧菜单项进入。
- 更正：当前代码树没有 `src/presentation/runtime-toast-adapter.ts` / `showRuntimeToast_ACU`。共享运行时反馈仍直接走 `showToastr_ACU` 与旧 toastr handle；2026-05-21 需求收窄后，后续不再沿“v2 打开时 adapter 去重”或“`showToastr_ACU` 全局路由器”的方向扩张。
- 保留清单：旧主弹窗 `main-popup.ts` / `createACUWindow`、旧主题选择器、旧数据管理 / 配置页 / API / import / plot preset / popup helper 的 toast 与原生 `confirm/prompt`、手动填表旧 `showCustomConfirm_ACU` 继续服务旧 UI；未按“阶段完成”状态盲删。
- rg 验证：`src/presentation` 内旧弹窗组合匹配从本轮改动前 **351** 降到 **306**；按矩阵排除实现定义后的当前剩余总数为 **305**。

## 迁移矩阵

### 启动/打开

| 状态 | 类型 | 来源 | 行号 | 触发场景 | 策略 | 建议阶段 |
|---|---|---|---|---|---|---|
| 旧 toast 保留 | toast | `src/presentation/bootstrap/init.ts` | 78, 132 | 脚本启动成功；切换聊天导致自动化循环停止；当前仍走旧 `showToastr_ACU` 调用面 | 旧 toast 保留，后续按 07 重构 | M2 |
| 待迁移 | toast | `src/presentation/bootstrap/api-groups/settings-config-api.ts` | 25 | API 调用打开可视化编辑器失败 | v2 追加且旧 UI 保留 | M4 |
| 保留待下线 | toast | `src/presentation/pages/main-popup.ts` | 61, 64, 143, 170 | 打开主弹窗时缺宿主依赖、重复打开、关闭/保存异常反馈；旧菜单入口仍可进入，暂不删除 | v2 完全替代但旧入口仍在用 | M5 |
| 保留待下线 | window | `src/presentation/pages/main-popup.ts` | 119 | 创建旧主弹窗窗口；旧菜单入口仍可进入，暂不删除旧窗口系统 | v2 完全替代但旧入口仍在用 | M5 |

### 配置页

| 状态 | 类型 | 来源 | 行号 | 触发场景 | 策略 | 建议阶段 |
|---|---|---|---|---|---|---|
| 待迁移 | toast | `src/presentation/components/settings-ui-helpers.ts` | 33, 39 | 设置保存 / 应用 helper 返回错误或 warning | v2 追加且旧 UI 保留 | M1 |
| 待迁移 | toast | `src/presentation/pages/popup-bindings-status.ts` | 110, 118, 129, 142, 152, 190, 203, 205, 216 | 仪表盘开关、存储模式切换成功 / 失败 | v2 追加且旧 UI 保留 | M1 |
| 待迁移 | custom confirm | `src/presentation/pages/popup-bindings-status.ts` | 184 | 切换存储模式时询问是否重置提示词 | v2 追加且旧 UI 保留 | M1 |
| 阶段 4 部分完成 | toast | `src/presentation/triggers/settings-ui-sync/settings-ui-config.ts` | 38, 65, 72, 105, 139, 144, 157, 163, 178, 181, 196, 197, 201, 217, 220, 236, 239, 255, 258, 276, 279, 296, 299, 316, 319, 339, 341, 368, 371 | 更新预设、提示词、表格模板、配置导入导出、默认恢复反馈；v2 已覆盖填表提示词保存 / JSON 导入导出、模板导入导出、默认恢复等普通反馈，部分细粒度更新参数仍随 v2 自动保存状态承接 | v2 追加且旧 UI 保留 | M1 |
| 旧 toast 保留 | toast | `src/presentation/triggers/settings-ui-sync/settings-ui-connect.ts` | 42, 48, 53, 77, 80 | 酒馆连接 / 当前上下文读取状态反馈 | 旧 toast 保留，后续按 07 重构 | M2 |
| 旧 toast 保留 | toast | `src/presentation/triggers/settings-ui-sync/settings-ui-trigger.ts` | 75, 77, 95, 98 | 手动触发填表前的配置校验 / 启动反馈；当前仍走旧 `showToastr_ACU` 调用面 | 旧 toast 保留，后续按 07 重构 | M2 |
| 待迁移 | prompt | `src/presentation/triggers/settings-ui-sync/settings-ui-trigger.ts` | 109 | 手动填表额外提示词输入 | v2 追加且旧 UI 保留 | M2 |

### 数据管理

| 状态 | 类型 | 来源 | 行号 | 触发场景 | 策略 | 建议阶段 |
|---|---|---|---|---|---|---|
| 待迁移 | toast | `src/presentation/triggers/admin-ui.ts` | 32, 52, 110, 117, 121 | 旧管理导入 JSON、提示词预设、表格模板、合并配置反馈 | v2 追加且旧 UI 保留 | M1 |
| 待重做 toast 表层 | toast | `src/presentation/triggers/data-admin-ui.ts` | 48, 70, 96, 103, 107, 122, 129, 148, 150, 158, 165, 169, 174, 181, 199, 202, 240, 242, 247, 271, 277, 281, 299, 306, 313, 325, 327, 352, 354, 362, 406, 410, 414, 434, 441, 449 | 数据管理导入 / 导出 / 删除本地数据 / 默认恢复 / 模板覆盖 / 聊天模板导入反馈；回滚后 v2 不保留 toast-store，需要重新设计短反馈承接 | v2 追加且旧 UI 保留 | M1 |
| 待重做确认表层 | native confirm | `src/presentation/triggers/data-admin-ui.ts` | 253, 288 | 恢复默认预设及模板；使用通用模板覆盖最新层；回滚后 v2 不保留 confirm-store，需要重新设计危险操作确认 | v2 追加且旧 UI 保留 | M1 |
| 阶段 4 部分完成 | toast | `src/presentation/pages/popup-bindings-data.ts` | 141, 159, 180, 187, 198, 214, 218, 221, 234, 240, 244, 247, 259, 303, 313, 314, 343, 438, 446, 476, 487, 592, 604, 618, 630, 639, 641, 650, 660, 662, 665, 684, 689, 699, 702, 713, 724, 734, 737, 744, 749, 758, 769, 776, 785, 787, 790, 818, 823, 833, 837, 877, 882 | 数据注入目标切换、交火索引、模板预设、API 切换、当前聊天数据载入 / 导入 / 导出 / 保存反馈；阶段 4 已覆盖注入目标切换、数据载入完成、API 保存 / 删除 / 模型加载、交火索引状态 / 缓存 / 删除、数据导入导出 / 删除反馈，模板命名输入已在阶段 2 覆盖 | v2 追加且旧 UI 保留 | M1 |
| 阶段 4 部分完成 | native confirm | `src/presentation/pages/popup-bindings-data.ts` | 256, 301, 483, 678, 720, 779, 812, 921, 944, 946 | 删除交火索引 / 世界书条目 / API 预设 / 全局模板预设 / 当前聊天数据库数据；阶段 4 已覆盖 API 预设、交火索引缓存 / 删除、世界书注入条目、本地数据危险确认 | v2 追加且旧 UI 保留 | M1 |
| 待迁移 | prompt | `src/presentation/pages/popup-bindings-data.ts` | 675, 709, 752, 809 | 保存 / 另存为 / 重命名全局模板预设名称输入 | v2 追加且旧 UI 保留 | M1 |
| 旧 toast 保留 | toast | `src/presentation/pages/popup-bindings.ts` | 120, 139, 141, 143, 220 | 注入目标变更、旧目标清理、新目标注入、工具加载反馈 | 旧 toast 保留，后续按 07 重构 | M2 |
| 待迁移 | toast | `src/presentation/pages/popup-helpers.ts` | 125, 141, 147, 480, 553, 590 | 通用预设名称校验、覆盖 / 新建 / 加载 / 保存反馈 | v2 追加且旧 UI 保留 | M1 |
| 待迁移 | native confirm | `src/presentation/pages/popup-helpers.ts` | 134, 559 | 覆盖同名预设 / 全局预设 | v2 追加且旧 UI 保留 | M1 |
| 待迁移 | prompt | `src/presentation/pages/popup-helpers.ts` | 123, 544 | 新建预设 / 全局预设名称输入 | v2 追加且旧 UI 保留 | M1 |
| 待迁移 | toast | `src/presentation/pages/sql-console.ts` | 87, 92, 116, 126 | SQL 控制台空语句、非 SQLite 模式、执行限制反馈 | v2 追加且旧 UI 保留 | M1 |

### API

| 状态 | 类型 | 来源 | 行号 | 触发场景 | 策略 | 建议阶段 |
|---|---|---|---|---|---|---|
| 旧 toast 保留 | toast | `src/presentation/bootstrap/api-groups/core-data-api.ts` | 39, 177, 186 | 数据导入 API 空输入 / 失败；更新任务已在后台运行 | 旧 toast 保留，后续按 07 重构 | M2 |
| 旧 toast 保留 | toast | `src/presentation/bootstrap/api-groups/worldbook-ai-api.ts` | 65 | 世界书 AI 任务被取消 | 旧 toast 保留，后续按 07 重构 | M2 |
| 待迁移 | toast | `src/presentation/pages/popup-bindings-worldbook.ts` | 474, 541 | 世界书选择 / 条目注入相关反馈 | v2 追加且旧 UI 保留 | M1 |
| 阶段 4 完成 | toast | `src/presentation/triggers/settings-ui-sync/settings-ui-api.ts` | 134, 151, 155, 171, 178, 185, 201, 204, 215, 225, 232, 261 | API 预设加载、校验、保存、清除、删除反馈；v2 已覆盖保存成功、校验失败、模型加载成功 / 失败、导入导出、删除预设反馈；旧 UI 独有“清除当前 API 配置”暂无 v2 按钮，不新增旧形态入口 | v2 追加且旧 UI 保留 | M1 |
| 阶段 4 完成 | toast | `src/presentation/triggers/update-trigger.ts` | 17, 22, 60, 63 | 合并总结停用、无可导出提示词、导出合并配置成功 / 失败；v2 数据管理页已承接合并配置导出成功 / 失败反馈 | v2 追加且旧 UI 保留 | M1 |

### 剧情推进

| 状态 | 类型 | 来源 | 行号 | 触发场景 | 策略 | 建议阶段 |
|---|---|---|---|---|---|---|
| 待迁移 | toast | `src/presentation/components/plot-editors.ts` | 439, 518, 527, 542 | 剧情任务保存、新增、至少保留一个、删除反馈 | v2 追加且旧 UI 保留 | M1 |
| 待迁移 | native confirm | `src/presentation/components/plot-editors.ts` | 530 | 删除剧情任务确认 | v2 追加且旧 UI 保留 | M1 |
| 旧 toast 保留 | toast | `src/presentation/components/plot-planning-ui.ts` | 29, 64, 98, 102, 111, 115, 122 | 剧情规划进度 toast、用户中止、规划失败、标签摘取结果；当前仍依赖旧 toastr handle / HTML 按钮 | 旧 toast 保留，后续按 07 重构任务反馈 | M3 |
| 待迁移 | toast | `src/presentation/pages/popup-bindings-plot.ts` | 346, 364, 371, 393, 401, 418, 440, 446, 467, 483, 512, 514, 533, 537, 630, 640, 644, 662, 669, 678 | 剧情推进预设导入 / 导出 / 覆盖 / 删除 / 恢复默认 / 自动循环启动停止反馈 | v2 追加且旧 UI 保留 | M1 / M2 |
| 待迁移 | native confirm | `src/presentation/pages/popup-bindings-plot.ts` | 432, 487, 522 | 覆盖 / 删除 / 恢复全局剧情推进预设确认 | v2 追加且旧 UI 保留 | M1 |
| 旧 toast 保留 | toast | `src/presentation/triggers/auto-loop.ts` | 26, 43, 97 | 自动化循环无法启动、倒计时结束、连续失败中止 | 旧 toast 保留，后续按 07 重构 | M2 |

### 外部导入

| 状态 | 类型 | 来源 | 行号 | 触发场景 | 策略 | 建议阶段 |
|---|---|---|---|---|---|---|
| 待迁移 | toast | `src/presentation/components/import-status-ui.ts` | 121, 136, 158, 168 | 外部文件分割参数校验、空文件、拆分成功、读取失败 | v2 追加且旧 UI 保留 | M1 |
| 待迁移 | toast | `src/presentation/triggers/import-process.ts` | 49, 56, 63, 73, 102, 114, 121, 126, 128, 130, 142, 156, 157, 166, 175, 183, 185, 193, 201, 209, 211, 215 | 外部导入目标校验、分块处理、暂存保存、最终注入、缓存 / 注入条目清理反馈 | v2 追加且旧 UI 保留 | M3 |

### 交火模式

| 状态 | 类型 | 来源 | 行号 | 触发场景 | 策略 | 建议阶段 |
|---|---|---|---|---|---|---|
| 旧 toast 保留 | toast | `src/presentation/components/summary-vector-index-ui.ts` | 35, 49 | 发送前召回进度 toast；召回结果 / 失败反馈；当前仍依赖旧 toastr handle 清理 | 旧 toast 保留，后续按 07 重构任务反馈 | M3 |
| 待迁移 | overlay utility | `src/presentation/components/remote-memory-archive-progress.ts` | 38, 118, 140 | 远程记忆归档进度 overlay 的显示 / 更新 / 隐藏工具；本次未发现调用点 | 需要产品确认 | M3 |

### 正文替换运行时

| 状态 | 类型 | 来源 | 行号 | 触发场景 | 策略 | 建议阶段 |
|---|---|---|---|---|---|---|
| 旧 toast 保留 | toast | `src/presentation/components/optimization-ui/optimization-ui-diff.ts` | 180, 312, 319, 340 | 正文替换 diff / 应用 / 取消 / 失败反馈；当前仍走旧 `showToastr_ACU` 调用面 | 旧 toast 保留，后续按 07 重构 | M3 |
| 旧 toast 保留 | toast | `src/presentation/components/optimization-ui/optimization-ui-exec.ts` | 43, 49, 57, 65, 92, 97, 112, 242, 245, 400, 455, 473, 475, 512, 535, 537 | 正文优化重试、执行、替换、取消、失败、结果摘要反馈；当前仍走旧 `showToastr_ACU` 调用面 | 旧 toast 保留，后续按 07 重构 | M3 |
| 旧 toast 保留 | toast | `src/presentation/components/optimization-ui/optimization-ui-overlay.ts` | 80, 93, 102 | 正文优化 overlay 取消、progress toast 显示与停止按钮反馈；当前仍依赖旧 progress toast / overlay | 旧 toast 保留，后续按 07 重构任务反馈 | M3 |
| 待迁移 | overlay/progress wrapper | `src/presentation/components/optimization-ui/optimization-ui-overlay.ts` | 24, 90, 114, 124 | 正文优化全屏 overlay 与 progress toast 封装显示 / 隐藏；当前仍是旧 overlay | 长任务 task / overlay 形态另行迁移 | M3 |
| 待迁移 | toast | `src/presentation/pages/popup-bindings-optimization.ts` | 130, 220, 237, 245, 261, 283, 299, 317, 319, 333, 383, 393, 396, 412, 426, 454 | 正文替换预设加载 / 导出 / 覆盖 / 删除 / 导入 / 保存 / 测试校验反馈 | v2 追加且旧 UI 保留 | M1 |
| 待迁移 | native confirm | `src/presentation/pages/popup-bindings-optimization.ts` | 275, 303, 327, 420 | 覆盖 / 删除 / 恢复正文替换预设确认 | v2 追加且旧 UI 保留 | M1 |

### visualizer

| 状态 | 类型 | 来源 | 行号 | 触发场景 | 策略 | 建议阶段 |
|---|---|---|---|---|---|---|
| 旧 toast 保留 | toast | `src/presentation/pages/visualizer.ts` | 81 | 数据未加载时打开 visualizer 的警告；当前仍走旧 `showToastr_ACU` 调用面 | 旧 toast 保留，visualizer 仍待 Vue 化 | M4 |
| 旧 overlay 债务 | window | `src/presentation/pages/visualizer.ts` | 129 | 创建旧 visualizer 窗口；本轮不删除旧窗口系统，后续 visualizer Vue 化时全屏路由替代 | 暂时允许旧窗口 | M4 |
| 待迁移 | native confirm | `src/presentation/pages/visualizer.ts` | 141 | 关闭 visualizer 时丢弃未保存修改确认；回滚后不保留 v2 confirm / input dialog 试做 | v2 追加且旧 UI 保留 | M4 |
| 待迁移 | native confirm | `src/presentation/pages/visualizer-main-config.ts` | 424 | 删除列并删除该列所有数据确认；回滚后不保留 v2 confirm 试做 | v2 追加且旧 UI 保留 | M4 |
| 待迁移 | prompt | `src/presentation/pages/visualizer-main-config.ts` | 433 | 新列名输入；回滚后不保留 v2 input dialog 试做 | v2 追加且旧 UI 保留 | M4 |
| 待迁移 | native confirm | `src/presentation/pages/visualizer-main-render.ts` | 245 | 删除表格行确认；回滚后不保留 v2 confirm 试做 | v2 追加且旧 UI 保留 | M4 |
| 旧 toast 保留 | toast | `src/presentation/pages/visualizer-main-save.ts` | 251, 253, 263, 299, 346, 354, 360 | 保存到全局预设 / 聊天记录 / 交火索引归档入队成功或失败反馈；当前仍走旧 `showToastr_ACU` 调用面 | 旧 toast 保留，visualizer 仍待 Vue 化 | M4 |
| 待迁移 | native confirm | `src/presentation/pages/visualizer-main-save.ts` | 227 | 覆盖全局预设确认；回滚后不保留 v2 confirm 试做 | v2 追加且旧 UI 保留 | M4 |
| 待迁移 | prompt | `src/presentation/pages/visualizer-main-save.ts` | 224 | 保存到全局模板预设名称输入；回滚后不保留 v2 input dialog 试做 | v2 追加且旧 UI 保留 | M4 |
| 待迁移 | native confirm | `src/presentation/pages/visualizer-sidebar.ts` | 136 | 删除表格确认；回滚后不保留 v2 confirm 试做 | v2 追加且旧 UI 保留 | M4 |
| 待迁移 | prompt | `src/presentation/pages/visualizer-sidebar.ts` | 167 | 新表格名称输入；回滚后不保留 v2 input dialog 试做 | v2 追加且旧 UI 保留 | M4 |

### 模板助手

| 状态 | 类型 | 来源 | 行号 | 触发场景 | 策略 | 建议阶段 |
|---|---|---|---|---|---|---|
| 旧 toast 保留 | toast | `src/presentation/pages/visualizer-template-assistant-apply.ts` | 21, 69 | assistant 草稿失效；草稿应用到当前编辑器临时态；当前仍走旧 `showToastr_ACU` 调用面 | 旧 toast 保留，模板助手仍随 visualizer 迁移 | M4 |
| 旧 toast 保留 | toast | `src/presentation/pages/visualizer-template-assistant.ts` | 374, 384, 825, 856, 866, 904 | 会话失效 / 取消、生成 warning / error、高风险项未确认；当前仍走旧 `showToastr_ACU` 调用面 | 旧 toast 保留，模板助手仍随 visualizer 迁移 | M4 |

补充债务：`src/presentation/pages/visualizer-template-assistant.ts` 的 `fullscreen-overlay` / portal 布局仍是旧 visualizer 内部 overlay。本轮只迁移短反馈 toast，不重写该 overlay；后续 visualizer Vue 化或助手独立全屏路由化时统一处理。

### 主题管理

| 状态 | 类型 | 来源 | 行号 | 触发场景 | 策略 | 建议阶段 |
|---|---|---|---|---|---|---|
| 主题入口保留，toast 待重做 | toast | `src/presentation/theme/theme-registry.ts` | 284, 290, 296, 306, 319, 353, 358, 378, 688, 713 | 旧主题导入 / 删除 / 文件解析 / 完整模板导出反馈；v2 保留自定义主题导入 / 导出 / 删除入口，但回滚后不保留 v2 toast 表层，临时反馈不计入完成迁移 | v2 追加且旧 UI 保留 | M5 |
| 主题入口保留，toast 待重做 | toast | `src/presentation/theme/theme-selector.ts` | 140 | 内置主题不可删除；回滚后 v2 不保留 warning toast 表层 | v2 追加且旧 UI 保留 | M5 |
| 主题入口保留，confirm 待重做 | custom confirm | `src/presentation/theme/theme-selector.ts` | 144 | 删除主题确认；v2 自定义主题删除入口保留，但回滚后不保留 confirm-store，临时使用原生确认 | v2 追加且旧 UI 保留 | M5 |

补充说明：旧主题选择器继续使用旧弹窗与旧 `ACUThemeFile` 格式；v2 主题菜单只支持 v2 自有 `acu-v2-theme` JSON 格式，不兼容旧主题文件。旧主题完整可编辑模板导出能力未搬进 v2；v2 提供当前 v2 token 主题 JSON 导出入口。

### 运行时 hooks

| 状态 | 类型 | 来源 | 行号 | 触发场景 | 策略 | 建议阶段 |
|---|---|---|---|---|---|---|
| 旧 toast 保留 | toast | `src/presentation/triggers/update-process.ts` | 102, 143, 156, 184, 221, 236, 250, 267, 289, 294, 301 | 手动填表 / 批处理更新的进度 toast、停止按钮、取消、成功、失败、自动合并结果；当前仍依赖旧 toastr handle / HTML 按钮 | 旧 toast 保留，后续按 07 重构任务反馈 | M2 / M3 |
| 保留待迁移 | custom confirm | `src/presentation/triggers/update-process.ts` | 256 | 手动填表前确认更新范围；仍服务旧 UI，回滚后 v2 不保留独立 confirm-store 流程 | 旧 UI 保留 | M2 |

## v2 目标承接面（当前实现已回滚）

- Toast：后续可重新设计 `toast-store` / `AcuToastViewport`，但当前实现层不保留。
- Confirm：后续可重新设计 `confirm-store` / `AcuConfirmViewport`，但当前实现层不保留。
- Input dialog：后续可重新设计输入弹窗、drawer 表单或就地输入控件，用于替代 v2 路径上的 `window.prompt`。
- Drawer：`src/presentation-v2/components/_lib/AcuDrawer.vue` 已用于提示词、预设、表格等管理抽屉。
- 测试：当前只保留既有 v2 页面 / 组件测试；上述 toast / confirm / input dialog 试做测试已随实现回滚。

## 阶段 4 历史记录（toast / confirm 试做已回滚）

- API：曾用 v2 toast 试承接 API 保存成功、模型加载成功 / 失败、导入导出、删除预设；回滚后不代表当前实现。
- 数据管理：曾用 v2 toast / confirm 试承接数据管理反馈与危险操作确认；回滚后不代表当前实现。
- 注入目标：曾用 v2 toast 试承接数据注入目标切换；回滚后不代表当前实现。
- 交火索引：曾用 v2 toast / confirm 试承接状态刷新、缓存清理、删除当前索引及失败反馈；回滚后不代表当前实现。
- 验收测试：相关 toast / confirm 试做测试已随实现回滚，后续重做时重新补。

## 阶段 8 主题记录（只保留自定义主题实现）

- 主题管理：`App.vue` 主题菜单保留为 v2 自定义主题入口，覆盖内置主题切换、自定义主题导入、自定义主题导出、自定义主题删除。
- Toast / Confirm：回滚后自定义主题不依赖新 v2 toast / confirm 表层；删除自定义主题临时使用原生确认。
- 未迁移能力：旧 `ACUThemeFile` 完整可编辑模板与旧主题文件兼容性不进入 v2；v2 只导入 / 导出 v2 token JSON。
- 验收测试：只保留自定义主题 store / 类型相关测试；toast / confirm 相关验收已随实现回滚。

## 去重验收记录

2026-05-21 更正：当前代码树没有上述 runtime toast adapter 及对应测试文件。本节不再记录为已完成验收；后续按 [04-toast-notification-plan.md](04-toast-notification-plan.md) 的 v2 面板内 toast 范围与 [07-architecture.md](07-architecture.md) 的长期分层重新补充：

- v2 面板内 toast 单测：队列、自动消失、手动关闭、静默规则、最大堆叠。
- 旧 UI 下线阶段若重做 feedback port，再补 runtime / 长任务 task 的 update / clear 流程测试。

## 阶段验收提醒

- 每迁移一个功能域，保留旧 UI 旧调用，新增 v2 store / composable 调用。
- 每阶段至少补一个成功 toast 测试、一个失败 / 取消 / 确认测试。
- 迁移进度 toast / overlay 时，优先落到业务执行区状态；只有短结果使用普通 toast。
- 迁移 `prompt(...)` 时不要直接用 confirm-store 代替，应设计 v2 输入弹窗、drawer 表单或就地输入控件。
