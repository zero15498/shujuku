# UI v2 后续优化方向

本文记录 UI v2 落地过程中发现的、暂不阻塞当前页面交付但需要后续统一处理的架构与体验债务。

## 1. API 预设管理逻辑需要下沉到 service 层

**问题**：当前 API 预设的 CRUD、默认预设、当前聊天绑定、删除引用清理等规则主要实现在 `src/presentation-v2/stores/api-preset-store.ts`。旧 UI 中同类逻辑也主要位于 `src/presentation/triggers/settings-ui-sync/settings-ui-api.ts`，service 层目前只提供运行时按名称解析配置的能力（如 `getApiConfigByPreset_ACU` / `resolveCurrentChatApiPresetName_ACU`），不是完整的预设管理服务。

**风险**：
- Pinia store 承担了业务规则和 settings schema 归一化职责，边界偏厚。
- 删除预设时需要清理填表、剧情推进、正文替换、交火关键词等多个功能的引用，后续新增 API override 容易漏改。
- 其他入口若需要管理 API 预设，可能复制 store 规则，或错误依赖 presentation-v2。
- settings 形状迁移隐藏在 UI store 的 refresh 流程中，不利于非 UI 场景复用。

**后续方向**：新增 `service/ai/api-preset-service.ts` 或 `service/settings/api-preset-service.ts`，把预设归一化、增删改、默认项、当前聊天绑定、引用清理迁入 service。v2 store 只保留响应式包装和 UI 状态。迁移时保留现有 settings 字段契约：`apiPresets`、`defaultApiPresetName`、`apiPresetBindingsByChat`、`tableApiPreset`、`plotApiPreset` 等。

**当前阶段处理**：不阻塞填表页改造。填表提示词暂不新造完整预设库，先将单一提示词编辑器移入侧抽屉，避免复制 API 预设当前的架构债务。
