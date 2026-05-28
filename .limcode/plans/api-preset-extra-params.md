## TODO LIST

<!-- LIMCODE_TODO_LIST_START -->
- [ ] 扩展 API 配置数据模型与默认值，兼容旧 settings/apiPresets 缺失新增字段的情况  `#t1`
- [ ] 更新预设草稿转换链路，使新增附加参数可在 UI 编辑、保存、加载和切换预设时保留  `#t2`
- [ ] 在 API 配置面板新增三个附加参数输入区，并补充 YAML 格式校验与错误提示  `#t3`
- [ ] 抽取并复用自定义 API 请求体构建逻辑，将 bodyParams 合并到请求体、excludeBodyParams 删除指定字段、requestHeaders 合并到 custom_include_headers  `#t4`
- [ ] 更新预设匹配、当前配置保存、当前聊天应用预设等链路，避免新增字段被 normalize/clone/compare 过程丢失  `#t5`
- [ ] 补充单元测试与组件测试，覆盖预设转换、store 归一化、API 请求参数合并、UI 保存加载回归  `#t6`
- [ ] 执行针对性测试与类型检查，记录回归范围和回滚方式  `#t7`
<!-- LIMCODE_TODO_LIST_END -->

# API 预设附加参数支持实施计划

## 1. 计划来源与目标边界

来源：助手直接需求。助手要求在项目的 API 配置和 API 预设保存中加入截图所示“附加参数”，包括：

- 包括主体参数：YAML 对象，用于追加/覆盖自定义 API 请求体字段。
- 排除主体参数：YAML 数组，用于从自定义 API 请求体中移除指定字段。
- 包含请求标头：YAML 对象，用于追加到请求头配置中。

目标行为：保存 API 预设时一并保存这些附加参数；调用对应预设时，附加参数直接生效。

非目标边界：

- 不改 Tavern 主 API `generateRaw_ACU` 的入参协议，除非后续确认宿主支持等价参数。当前证据显示自定义 API 请求体构建才有 `custom_include_headers`、`reverse_proxy`、`custom_url` 等可注入位置。
- 不改酒馆连接管理器 `sendConnectionManagerRequest_ACU` 的协议，避免把自定义 API 参数硬塞进 tavern profile 调用。
- 不重构整个 API 调用层。三处重复请求体构建只做最小抽取，别趁机把半个系统翻新；那不是优化，是制造事故。

## 2. 已确认现状证据

关键文件与链路已读取确认：

- `src/presentation-v2/stores/api-preset-store.ts`
  - `AcuV2ApiConfig` 当前只有 `url/apiKey/model/useMainApi/max_tokens/temperature`。
  - `normalizeApiConfig()` 会重建对象，未声明字段会被丢弃。
  - `findPresetMatchingCurrentConfig()` 只比较现有字段。
  - `setActivePresetForCurrentChat()` 会把 `preset.apiConfig` 克隆到 `settings_ACU.apiConfig`。
- `src/presentation-v2/composables/useApiPresetManagement.ts`
  - `ApiPresetDraft` 和 `apiPresetDraftFromPreset()/apiPresetFromDraft()` 未包含附加参数。
- `src/presentation-v2/components/ApiConfigPanel.vue`
  - API 预设表单只编辑连接方式、URL、Key、模型、max_tokens、temperature、tavernProfile。
  - 保存入口是 `saveActiveDraft()` -> `apiPresetFromDraft()` -> `store.savePreset()`。
- `src/service/runtime/state-manager.ts`
  - `settings_ACU.apiConfig` 默认值未包含附加参数。
- `src/service/ai/api-call.ts`
  - 自定义 API 请求体构建存在三处：`callApiWithPlotPreset_ACU()`、`callApi_ACU()`、`callAIWithPreset_ACU()`。
  - 当前请求体中 `custom_include_headers` 只包含 `Authorization: Bearer <apiKey>`。
- 测试位置已确认：
  - `tests/presentation-v2/api/api-preset-management.test.ts`
  - `tests/presentation-v2/api/api-preset-store.test.ts`
  - `tests/service/ai/api-call.test.ts`

## 3. 数据模型方案

在 `AcuV2ApiConfig` 增加：

- `bodyParams: string`
- `excludeBodyParams: string`
- `requestHeaders: string`

这里刻意保存为字符串，而不是保存解析后的对象。理由：

1. UI 输入就是 YAML 文本，保存原文可避免格式和注释被无意义重排。
2. 旧配置兼容最简单：缺失即空字符串。
3. 真正需要结构化数据的是调用前构建请求体阶段，那里可以统一解析并报错。

风险：运行时 YAML 解析失败会导致调用失败。应在 UI 保存前校验，调用前仍二次防御，避免历史坏数据绕过 UI 直接炸成不可读错误。

## 4. 实施步骤

### 阶段 1：类型、默认值、归一化

修改：

- `src/presentation-v2/stores/api-preset-store.ts`
- `src/presentation-v2/composables/useApiPresetManagement.ts`
- `src/service/runtime/state-manager.ts`

任务：

1. 扩展 `AcuV2ApiConfig` 与 `ApiPresetDraft`。
2. `createEmptyApiPresetDraft()` 增加三个空字符串字段。
3. `normalizeApiConfig()` 保留新增字段，非字符串归一为空字符串。
4. `settings_ACU.apiConfig` 默认值加入空字符串字段。
5. `apiPresetDraftFromPreset()` 与 `apiPresetFromDraft()` 双向搬运字段。
6. `findPresetMatchingCurrentConfig()` 增加三字段比较，避免当前配置实际不同却错误匹配旧预设。

验收：旧 settings 无新增字段时不会报错；保存现有预设不会丢失新增字段；切换预设后 `settings_ACU.apiConfig` 含新增字段。

### 阶段 2：UI 增加附加参数编辑

修改：

- `src/presentation-v2/components/ApiConfigPanel.vue`
- 必要时新增/复用 textarea 基础组件；若无现成组件，可直接使用 `<textarea>` 并按现有 CSS 风格补类。

任务：

1. 在 `activeConnectionMode === 'custom'` 的配置区域增加“附加参数”小节。
2. 增加三个多行输入：
   - 包括主体参数：占位示例 `top_k: 20`、`repetition_penalty: 1.1`
   - 排除主体参数：占位示例 `- frequency_penalty`、`- presence_penalty`
   - 包含请求标头：占位示例 `CustomHeader: 自定义值`
3. 在 `validateActiveDraft()` 增加 YAML 校验：
   - bodyParams 必须为空或 YAML 对象。
   - excludeBodyParams 必须为空或 YAML 数组，元素为非空字符串。
   - requestHeaders 必须为空或 YAML 对象，键值最终可转为字符串。
4. 错误提示应说明哪个输入区格式错误，不要只说“保存失败”。

注意：如果项目没有 YAML 解析依赖，优先检查 `package.json`。若已有 `yaml` 或 `js-yaml` 则复用；若没有，实施前必须决定是否引入依赖或实现极窄 YAML 子集解析。别自己手搓“看起来像 YAML”的解析器然后假装安全，那是事故模板。

### 阶段 3：抽取请求体构建与参数应用

修改：

- `src/service/ai/api-call.ts`
- 可新增同目录私有 helper，或在本文件内先抽取函数，避免扩大模块边界。

任务：

1. 抽取 `buildCustomApiRequestBody_ACU(messages, effectiveApiConfig, maxTokens?)`。
2. 抽取 `parseApiExtraParams_ACU(apiConfig)`，统一解析三类 YAML。
3. 构建基础 requestBody 后应用顺序：
   1. 生成默认请求体。
   2. 合并 `bodyParams` 到 requestBody。后写覆盖前写，允许用户覆盖默认值。
   3. 按 `excludeBodyParams` 删除 requestBody 顶层字段。
   4. 合并 `requestHeaders` 到 `custom_include_headers`。
4. `custom_include_headers` 格式需要与现有酒馆后端兼容。当前代码使用字符串：`Authorization: Bearer xxx`。计划采用多行字符串：
   - API Key 生成的 Authorization 保留。
   - requestHeaders 每个键值生成 `Key: value`。
   - 多项用 `\n` 连接。
5. 将三处自定义 API 请求体构建替换为 helper 调用：
   - `callApiWithPlotPreset_ACU()`
   - `callApi_ACU()`
   - `callAIWithPreset_ACU()`

验收：三个调用入口行为一致。新增参数不会只在某一个入口生效，然后另两个入口悄悄失效；这种半成品最恶心。

### 阶段 4：测试覆盖

修改/新增测试：

- `tests/presentation-v2/api/api-preset-management.test.ts`
- `tests/presentation-v2/api/api-preset-store.test.ts`
- `tests/service/ai/api-call.test.ts`
- 必要时补 `ApiConfigPanel` 组件测试。

覆盖点：

1. `apiPresetDraftFromPreset()` 能读取三个新增字段。
2. `apiPresetFromDraft()` 能保存三个新增字段。
3. `normalizeApiConfig()` 对旧数据补空字符串，对非字符串字段归一为空。
4. `findPresetMatchingCurrentConfig()` 会把新增字段纳入匹配判断。
5. `callAIWithPreset_ACU()` 自定义 API 请求：
   - `bodyParams` 合并到 JSON body。
   - `excludeBodyParams` 删除字段。
   - `requestHeaders` 与 Authorization 合并到 `custom_include_headers`。
6. 至少覆盖一个通过预设名调用的场景，确认 `getApiConfigByPreset_ACU()` 返回的配置能一路影响请求体。

### 阶段 5：验证命令

建议执行：

1. `npm test -- tests/presentation-v2/api/api-preset-management.test.ts`
2. `npm test -- tests/presentation-v2/api/api-preset-store.test.ts`
3. `npm test -- tests/service/ai/api-call.test.ts`
4. `npm run typecheck` 或项目现有等价类型检查脚本；若 package 中没有，则执行现有 Vitest 相关脚本并说明限制。

## 5. 风险与回滚

风险：

- YAML 依赖不存在或打包配置不兼容，会影响构建。实施前必须读取 `package.json` 确认。
- `custom_include_headers` 的多行格式若酒馆后端不接受，会导致自定义请求失败。测试只能验证本项目传参，不能完全证明宿主解析行为。
- 用户通过 `bodyParams` 覆盖关键字段如 `messages/model/custom_url` 可能造成请求异常。这是功能能力的一部分，但 UI 文案需要提示“会覆盖默认请求体字段”。
- 删除 `custom_include_headers` 或 `custom_url` 这类字段可能破坏请求。若允许完全自由删除，就必须接受高级用户自担风险；否则需要保留黑名单保护。建议第一版允许删除但在文案中明确风险。

回滚：

- 数据层回滚安全：新增字段都是可选字符串，旧代码忽略即可。
- 代码回滚路径：恢复 `AcuV2ApiConfig`、draft 转换、UI 小节和 api-call helper 替换即可；已保存 settings 中残留字段不会破坏旧逻辑。
- 若仅请求调用异常，可优先回滚 `api-call.ts` 的 helper 应用，保留 UI 保存能力，降低用户数据丢失风险。

## 6. 自我复查

这份计划基于已读取的核心文件和测试入口，覆盖了数据模型、UI、保存加载、调用链、测试与回滚。质量算合格。

但还有一个必须在实施前确认的缺口：项目是否已有 YAML 解析依赖。没有确认依赖就直接写解析逻辑，会让计划看起来漂亮、实现时一脚踩空。执行计划第一步应读取 `package.json`，确认可用依赖后再决定解析实现。
