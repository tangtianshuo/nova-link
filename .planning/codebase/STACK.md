# 技术栈

**分析日期:** 2026-03-17

## 编程语言

**主要语言:**
- TypeScript 5.6 - 前端开发
- Rust (2021 edition) - Tauri 后端
- Vue 3 - 前端框架

**次要语言:**
- HTML/CSS - 页面结构与样式

## 运行时

**前端:**
- Node.js 18+ (通过 Vite 开发服务器)
- 浏览器环境 (WebView2 for Windows)

**桌面:**
- Tauri v2 (Rust 运行时)
- WebView2 (Windows), WebKit (macOS/Linux)

**包管理:**
- npm - 前端依赖管理
- Cargo - Rust 依赖管理

## 框架

**前端核心:**
- Vue 3.5.30 - 渐进式前端框架
- TypeScript 5.6 - 类型安全
- Vite 6.0.3 - 构建工具与开发服务器

**Live2D 渲染:**
- pixi.js 6.3.2 - 2D 渲染引擎
- pixi-live2d-display 0.4.0 - Live2D 模型显示

**样式:**
- Tailwind CSS 4.2.1 - 实用优先 CSS 框架
- PostCSS 8.5.8 - CSS 处理
- Autoprefixer 10.4.27 - CSS 前缀处理

**桌面框架:**
- Tauri v2 - 桌面应用框架
  - features: macos-private-api, tray-icon

**Tauri 插件:**
- tauri-plugin-opener 2 - 系统默认程序打开
- tauri-plugin-process 2 - 进程管理
- tauri-plugin-updater 2 - 自动更新
- tauri-plugin-log 2 - 日志记录

## Rust 核心依赖

**异步运行时:**
- tokio 1 (full features) - 异步运行时

**HTTP 客户端:**
- reqwest 0.12 (json feature) - HTTP 请求
- hyper 1 (server, http1, http2 features) - HTTP 服务器
- hyper-util 0.1 - Hyper 工具库
- tower 0.4 (util feature) - 服务中间件
- http 1 - HTTP 类型定义
- http-body-util 0.1 - HTTP body 工具

**序列化:**
- serde 1 (derive feature) - 序列化框架
- serde_json 1 - JSON 处理

**模板引擎:**
- tera 1 - Jinja2 风格模板引擎

**其他:**
- log 0.4 - 日志接口
- env_logger 0.11 - 环境日志实现
- dirs 5 - 目录路径工具
- once_cell 1 - 延迟初始化
- async-trait 0.1 - 异步 trait

## 前端依赖

**Vue 生态:**
- vue 3.5.30 - Vue 核心库

**Tauri API:**
- @tauri-apps/api 2 - Tauri JavaScript API
- @tauri-apps/plugin-opener 2 - 打开默认程序插件
- @tauri-apps/plugin-process 2 - 进程插件
- @tauri-apps/plugin-updater 2 - 更新插件
- @tauri-apps/plugin-log 2 - 日志插件

**构建:**
- @vitejs/plugin-vue 6.0.4 - Vite Vue 插件
- typescript ~5.6.2 - TypeScript 编译器
- @types/node 25.4.0 - Node.js 类型
- @tauri-apps/cli 2 - Tauri CLI

**开发:**
- @tailwindcss/postcss 4.2.1 - Tailwind PostCSS

**工具库:**
- marked 17.0.4 - Markdown 解析

## 配置

**构建配置:**

- `vite.config.ts`: Vite 构建配置
  - 路径别名: `@` → `./src`
  - 代码分割: pixi-core, pixi-live2d
  - 开发服务器端口: 18080
  - HMR 端口: 18081

- `tsconfig.json`: TypeScript 配置
  - 目标: ES2020
  - 模块: ESNext
  - 严格模式: 启用

- `tailwind.config.js`: Tailwind CSS 配置
  - 内容扫描: `./index.html`, `./src/**/*.{vue,js,ts,jsx,tsx}`

- `postcss.config.js`: PostCSS 配置

**Tauri 配置:**

- `tauri.conf.json`:
  - 产品名: Nova Link
  - 版本: 0.0.12
  - 窗口: 无装饰、透明、置顶
  - 自动更新端点: GitHub Releases

- `Cargo.toml`: Rust 依赖配置

**环境变量:**

- 开发环境通过 `.env` 文件配置
- 关键变量: API 密钥、WebSocket URL 等
- 注意: `.env` 文件包含敏感信息，不应提交到版本控制

## 平台要求

**开发:**
- Node.js 18+
- Rust 1.70+
- Tauri CLI v2

**生产:**
- Windows: WebView2 运行时
- macOS: WebKit
- Linux: WebKitGTK

**构建目标:**
- Windows: x86_64-pc-windows-msvc (MSI)
- macOS: x86_64-apple-darwin, aarch64-apple-darwin (DMG)

---

*技术栈分析: 2026-03-17*
