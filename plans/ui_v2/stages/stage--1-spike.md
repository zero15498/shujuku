# 阶段 -1：构建 spike

> 模板见 [../03-record-template.md](../03-record-template.md)。本文件包含：开发前设计（范围 / 决议 / 影响）+ 落地记录（产物 / 验证 / 体积）。

## 范围

- 阶段编号：-1
- 与 charter 的关联：验证 [charter §3 D16](../00-charter.md) Vue 3 / Pinia 技术栈与 D20 构建依赖是否能进入正式阶段
- 本阶段包含：`unplugin-vue/rollup` spike、最小 Vue + Pinia hello world、油猴 IIFE / 扩展 ESM 双产物验证、plus embedded 旁路构建检查
- 本阶段不包含：正式入口、正式主题 / 路由 store、长期可维护源码、旧 UI 接入

## 决议

### D20. 构建与依赖（2026-05-02）

- **背景**：UI v2 计划使用 Vue SFC + Pinia，但仓库原构建链长期服务于非 Vue userscript / extension 产物，必须先证明 Rollup 4 与 Vue SFC 插件能同时覆盖目标产物。
- **决定**：阶段 -1 只做 spike。验证 `unplugin-vue/rollup` 与双产物（油猴 IIFE / 酒馆扩展 ESM）的兼容性；hello world 必须初始化最小 Pinia app；plus assistant embedded 不作为主验收环境，但做旁路构建检查。
- **理由**：spike 产物单独验证、跑完即丢，阶段 0 在干净基线上重写正式基础设施，避免把临时构建配置和实验代码带入长期实现。Pinia 必须进入 spike，避免体积基线只覆盖 Vue runtime。
- **退出条件**：双产物均能正常出包；hello-world Vue 组件在两种环境渲染成功；输出可检索 console marker；plus embedded 旁路构建有记录。不通过则回到 D1 重新讨论技术栈。

## 影响文件清单

| 类别 | 路径 | 说明 |
|---|---|---|
| 构建 | `rollup.ui-v2-spike.config.js` | spike 专用构建配置，完成后不进入正式链路 |
| spike 源码 | `src/spikes/ui-v2/` | 最小 Vue + Pinia hello world |
| spike 产物 | `dist/ui-v2-spike/` | 单独验证、跑完即丢 |
| 正式源码 | 无 | 本阶段不得改正式 v2 源码 |

## 退出条件

- [x] 油猴 IIFE 能出包并渲染 hello world。
- [x] userscript iframe 场景能挂到 host document 并渲染。
- [x] extension ESM 能出包并渲染 hello world。
- [x] plus embedded 旁路构建与 jsdom import 通过。
- [x] console marker 可检索。
- [x] 阶段 0 从干净基线重写，不复用 spike 产物。

---

## 落地记录（2026-05-02）

- **结论**：通过。`unplugin-vue/rollup` 可与 Rollup 4 构建链同时产出油猴 IIFE / 酒馆扩展 ESM / plus embedded ESM。

### 产物清单

| 类别 | 路径 |
|---|---|
| 构建 | `rollup.ui-v2-spike.config.js` |
| spike 源码 | `src/spikes/ui-v2/` |
| 验证组件 | `src/spikes/ui-v2/App.vue`（`<script setup lang="ts">`，最小 Pinia store） |
| spike 产物 | `dist/ui-v2-spike/` |

### 测试覆盖

- 文件数：0
- 用例数：0
- 状态：本阶段为构建 spike，未建立 vitest 用例；以四路冒烟验证作为退出依据。

### 验证

- [x] userscript IIFE：渲染 hello，Pinia `mountCount=1`，marker `mounted userscript into current-document`
- [x] userscript iframe 模拟：根节点出现在 parent document，marker `mounted userscript into parent-document`
- [x] extension ESM：渲染 hello，marker `mounted extension into current-document`
- [x] plus embedded：旁路构建与 jsdom import 通过，marker 含 `plus wrapper loaded`

### 退出条件核对

| 条件 | 状态 |
|---|---|
| 双产物正常出包 | 通过 |
| Vue + Pinia hello world 渲染 | 通过 |
| console marker 可检索 | 通过 |
| plus embedded 旁路检查 | 通过 |
| spike 产物不进入长期实现 | 通过 |

### 体积变化

本阶段记录的是 spike 前主产物基线，用于后续 X-1 30% 警戒线对比。

| 产物 | raw | Δ raw | gzip | Δ gzip |
|---|---:|---:|---:|---:|
| 油猴 | 4,036,719 | — | 981,240 | — |
| 扩展 | 3,863,846 | — | 973,792 | — |
| plus | 3,864,049 | — | 973,915 | — |

### 关键发现

- 首次手测在酒馆助手 iframe 场景下无入口（spike 未注册菜单按钮）；调整为优先挂载父文档后通过。
- 正式阶段 0 需保留 Vue feature flags / `process.env.NODE_ENV` production 替换，否则 gzip 体积上升至约 102KB。
- `<style scoped>` 通过本地 `sfc-style-injector` 闭环；阶段 0 需决定正式 CSS 方案。

### 已知缺口

- 无新增 open question；关键发现已在阶段 0 基础设施中消化。
