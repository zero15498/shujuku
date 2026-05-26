/**
 * rollup.config.js — 双入口模块化构建
 *
 * 使用 @rollup/plugin-typescript 编译 TS，Rollup 做真正的模块图解析。
 *
 * 构建目标：
 * 1. 油猴脚本（默认）：IIFE 格式 + UserScript 头 → dist/index.bundle.js
 * 2. 酒馆插件：ESM 格式（无 UserScript 头）→ dist/extension/index.js
 *
 * 使用方式：
 * - npm run build          → 构建油猴脚本
 * - npm run build:extension → 构建酒馆插件
 * - npm run build:all      → 同时构建两者
 */
import typescript from '@rollup/plugin-typescript';
import commonjs from '@rollup/plugin-commonjs';
import nodeResolve from '@rollup/plugin-node-resolve';
import replace from '@rollup/plugin-replace';
import vuePlugin from 'unplugin-vue/rollup';
import sfcStyleInjector from './src/presentation-v2/build/rollup-sfc-style-injector.js';
import vueScriptTranspiler from './src/presentation-v2/build/rollup-vue-script-transpiler.js';
import { readFileSync, copyFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const BUILD_MODE = process.env.BUILD_MODE || 'userscript';

// ═══════════════════════════════════════════════════════════════
// UserScript 头（仅油猴脚本使用）
// ═══════════════════════════════════════════════════════════════
const USER_SCRIPT_BANNER = `// ==UserScript==
// @name         SP·数据库 IV
// @namespace    http://tampermonkey.net/
// @version      4.0
// @description  SillyTavern 数据库自动更新与交火模式索引管理脚本。
// @author       Cline (AI Assisted)
// @match        */*
// @grant        none
// @注释掉的require  https://code.jquery.com/jquery-3.7.1.min.js
// @注释掉的require  https://cdnjs.cloudflare.com/ajax/libs/toastr.js/latest/toastr.min.js
// ==/UserScript==`;

// ═══════════════════════════════════════════════════════════════
// Node.js 内置模块浏览器 shim
// sql.js (sql-asm-memory-growth.js) 内部引用了 fs 和 crypto：
//   var fs = require('fs')       → require$$0
//   var a  = require('crypto')   → require$$1（用于 randomFillSync）
// 浏览器环境下这些代码路径不会真正执行（被 typeof process 条件分支保护），
// 但 Rollup commonjs 插件会把 require() 调用提升为 IIFE 形参，
// 导致浏览器运行时出现 ReferenceError: require$$0 is not defined。
// 解决方式：在 Rollup 解析阶段将 fs/crypto 替换为空模块 shim。
//
// 必须同时拦截裸名 (fs/crypto) 和 node: 前缀 (node:fs/node:crypto) 两种形式，
// 因为 sql.js 内部使用裸名 require('fs')，而部分工具链可能用 node: 前缀。
// ═══════════════════════════════════════════════════════════════
const nodeBuiltinsShim = {
  name: 'node-builtins-shim',
  resolveId(source) {
    if (source === 'fs' || source === 'node:fs') {
      return { id: '\0shim:fs', moduleSideEffects: false };
    }
    if (source === 'crypto' || source === 'node:crypto') {
      return { id: '\0shim:crypto', moduleSideEffects: false };
    }
    return null;
  },
  load(id) {
    if (id === '\0shim:fs') {
      return 'export default {}; export const readFileSync = () => null;';
    }
    if (id === '\0shim:crypto') {
      return 'export default {}; export const randomFillSync = (buf) => { for(let i=0;i<buf.length;i++) buf[i]=Math.random()*256|0; return buf; };';
    }
    return null;
  },
};

// ═══════════════════════════════════════════════════════════════
// Vue 编译与产物常量替换
// - unplugin-vue/rollup：编译 .vue SFC（template / script / style）
// - @rollup/plugin-replace：把 process.env.NODE_ENV / Vue feature flags
//   替换为生产值，避免运行时 console 警告并压缩 gzip 体积。
//   见 plans/ui_v2/stages/stage--1-spike.md 的关键发现。
// ═══════════════════════════════════════════════════════════════
function createVuePlugin() {
  // isProduction: true → SFC 编译器不输出 __file 字段，避免泄漏构建机绝对路径
  // root: cwd → 组件 id / 错误位置以 cwd 为根计算
  // inlineTemplate: false → 避免把 TS 模板渲染函数内联到 <script setup lang="ts">
  //   虚拟模块；@rollup/plugin-typescript 的 filter 不识别 `?vue&...&lang.ts`
  //   query 形态的 id，会导致 rollup 直接以 JS 解析 TS 失败
  return vuePlugin({
    isProduction: true,
    root: process.cwd(),
    sourceMap: false,
    inlineTemplate: false,
  });
}

function createReplacePlugin() {
  return replace({
    preventAssignment: true,
    values: {
      'process.env.NODE_ENV': JSON.stringify('production'),
      __VUE_OPTIONS_API__: 'true',
      __VUE_PROD_DEVTOOLS__: 'false',
      __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: 'false',
    },
  });
}

// ═══════════════════════════════════════════════════════════════
// 共享插件配置
// ═══════════════════════════════════════════════════════════════
const sharedPlugins = [
  nodeBuiltinsShim,
  createVuePlugin(),
  vueScriptTranspiler(),
  sfcStyleInjector(),
  nodeResolve({
    browser: true,
    preferBuiltins: false,
    extensions: ['.mjs', '.js', '.json', '.ts', '.vue'],
  }),
  commonjs(),
];

function createTsPlugin() {
  return typescript({
    tsconfig: './tsconfig.json',
    compilerOptions: {
      noEmit: false,
      declaration: false,
      declarationMap: false,
      sourceMap: false,
      outDir: 'dist',
    },
    // SFC 虚拟脚本模块由 vueScriptTranspiler 单独处理（@rollup/pluginutils
    // 会剥掉 query 串再 glob，导致无法在这里走 include 匹配）。
    include: ['src/**/*.ts', 'src/**/*.js'],
  });
}

const sharedOnWarn = (warning, warn) => {
  if (warning.code === 'THIS_IS_UNDEFINED') return;
  if (warning.code === 'CIRCULAR_DEPENDENCY') return;
  warn(warning);
};

// ═══════════════════════════════════════════════════════════════
// 油猴脚本构建配置
// ═══════════════════════════════════════════════════════════════
const userscriptConfig = {
  input: 'src/index.ts',
  output: {
    file: 'dist/index.bundle.js',
    format: 'iife',
    banner: USER_SCRIPT_BANNER,
    sourcemap: false,
  },
  treeshake: false,
  plugins: [...sharedPlugins, createTsPlugin(), createReplacePlugin()],
  external: [
    './script.js',
    './scripts/extensions.js',
  ],
  onwarn: sharedOnWarn,
};

// ═══════════════════════════════════════════════════════════════
// 酒馆插件构建配置
// ═══════════════════════════════════════════════════════════════
const extensionConfig = {
  input: 'src/entry-extension.ts',
  output: {
    file: 'dist/extension/index.js',
    format: 'es',
    sourcemap: false,
  },
  treeshake: false,
  plugins: [
    ...sharedPlugins,
    createTsPlugin(),
    createReplacePlugin(),
    // 构建完成后复制 manifest.json 到 dist/extension/
    {
      name: 'copy-manifest',
      writeBundle() {
        try {
          mkdirSync(join(__dirname, 'dist', 'extension'), { recursive: true });
          copyFileSync(
            join(__dirname, 'manifest.json'),
            join(__dirname, 'dist', 'extension', 'manifest.json')
          );
        } catch (e) {
          console.warn('复制 manifest.json 失败:', e.message);
        }
      },
    },
  ],
  // 油猴分支的 import('./script.js') 等代码在插件构建中不会运行时执行，
  // 但 Rollup 仍会尝试解析。标记为 external 让 Rollup 跳过解析。
  external: [
    './script.js',
    './scripts/extensions.js',
  ],
  onwarn: sharedOnWarn,
};

// ═══════════════════════════════════════════════════════════════
// 根据 BUILD_MODE 选择构建目标
// ═══════════════════════════════════════════════════════════════
let configs;
switch (BUILD_MODE) {
  case 'extension':
    configs = extensionConfig;
    break;
  case 'all':
    configs = [userscriptConfig, extensionConfig];
    break;
  case 'concat':
    // 保留原有的 concat 模式兼容
    configs = userscriptConfig;
    break;
  case 'userscript':
  default:
    configs = userscriptConfig;
    break;
}

export default configs;
