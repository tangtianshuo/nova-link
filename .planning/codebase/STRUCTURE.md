# 代码库结构

**分析日期：** 2026-03-17

## 目录布局

```
nova-link/
├── src/                          # Vue 3 前端源码
│   ├── main.ts                   # 前端入口点
│   ├── App.vue                   # 主应用组件
│   ├── assets/                  # 静态资源 (图片)
│   ├── models/                  # Live2D 模型文件
│   │   └── hiyori_pro_zh/       # 示例模型 (Hiyori)
│   ├── sdk/                     # WebSocket SDK
│   │   ├── client.ts            # GatewayClient 实现
│   │   ├── types.ts             # TypeScript 类型定义
│   │   └── index.ts             # SDK 导出
│   ├── composables/             # Vue 组合式函数
│   │   ├── useWebSocket.ts      # WebSocket 连接管理
│   │   ├── useLive2D.ts         # Live2D 模型控制
│   │   ├── useChat.ts           # 聊天消息状态
│   │   ├── useSettings.ts       # 设置持久化
│   │   ├── useWindow.ts         # 窗口控制
│   │   ├── useClickThrough.ts   # 透明穿透
│   │   ├── useSpeechBubble.ts   # 气泡框
│   │   ├── useEnvCheck.ts       # 环境检测
│   │   └── index.ts             # 统一导出
│   ├── components/              # Vue 组件
│   │   ├── TitleBar.vue         # 自定义标题栏
│   │   ├── Live2DContainer.vue  # Live2D 画布容器
│   │   ├── ChatPanel.vue        # 聊天面板
│   │   ├── ContextMenu.vue      # 右键菜单
│   │   ├── Dialog.vue           # 全局对话框
│   │   ├── CharacterSettingsModal.vue  # 角色设置模态框
│   │   ├── SpeechBubble.vue     # 气泡框组件
│   │   ├── EnvironmentCheckModal.vue    # 环境检测模态框
│   │   └── index.ts             # 组件统一导出
│   ├── utils/                   # 工具函数
│   │   ├── animationState.ts    # 动画状态机
│   │   ├── emotionParser.ts     # 情感标签解析
│   │   ├── mouseInteraction.ts  # 鼠标交互处理
│   │   ├── logger.ts            # 日志工具
│   │   ├── updater.ts          # 自动更新
│   │   ├── gpuHitTest.ts        # GPU 区域检测
│   │   └── pixelHitTest.ts      # 像素区域检测
│   └── styles.css               # 全局样式
├── src-tauri/                   # Rust 后端源码
│   ├── src/
│   │   ├── main.rs              # Rust 入口点
│   │   ├── lib.rs               # 主库文件 (Tauri setup)
│   │   ├── config.rs            # JSON 配置文件管理
│   │   ├── state.rs             # 应用状态管理
│   │   ├── window.rs            # 窗口管理
│   │   ├── tray.rs              # 系统托盘
│   │   ├── powershell.rs        # PowerShell 执行
│   │   ├── command_runner.rs    # 命令执行器
│   │   ├── commands/            # Tauri 命令模块
│   │   │   ├── mod.rs           # 命令模块入口
│   │   │   ├── settings.rs      # 设置命令
│   │   │   ├── gateway.rs       # Gateway 启动命令
│   │   │   ├── llm.rs           # LLM API 调用
│   │   │   ├── identity.rs      # 角色身份管理
│   │   │   ├── user.rs          # 用户信息管理
│   │   │   ├── soul.rs          # 角色人格管理
│   │   │   ├── window.rs        # 窗口命令
│   │   │   ├── mcp.rs           # MCP 服务器命令
│   │   │   └── env_check.rs     # 环境检测命令
│   │   └── mcp/                 # MCP 服务器实现
│   │       ├── mod.rs           # MCP 模块入口
│   │       ├── server.rs        # JSON-RPC 服务器
│   │       ├── http_server.rs   # HTTP 服务器
│   │       └── types.rs         # 类型定义
│   ├── templates/               # 默认模板
│   │   ├── identity.md          # 角色身份模板
│   │   ├── user.md              # 用户信息模板
│   │   └── soul.md              # 角色人格模板
│   └── tauri.conf.json          # Tauri 配置
├── python_channel/             # Python 通道 (可选)
│   └── localpet.py              # Python 脚本
├── skill/                      # 动画控制脚本
│   └── scripts/                 # .bat 脚本
│       ├── happy.bat
│       ├── sad.bat
│       └── ...
├── public/                     # Vite 公共资源
│   └── live2d/                 # Live2D 核心库
│       └── live2dCubismCore.min.js
├── docs/                       # 项目文档
├── package.json                 # Node.js 依赖
├── tsconfig.json               # TypeScript 配置
├── vite.config.ts              # Vite 配置
├── tailwind.config.js          # Tailwind CSS 配置
└── CLAUDE.md                  # 项目说明
```

## 目录用途

**src/ (前端源码)：**
- 目的：Vue 3 前端应用的所有源代码
- 包含：组件、Composable、工具函数、SDK
- 关键文件：`main.ts`, `App.vue`

**src/composables/ (组合式函数)：**
- 目的：封装可复用的业务逻辑
- 包含：WebSocket、Live2D、Chat、Settings、Window 等功能模块
- 关键文件：`useWebSocket.ts`, `useLive2D.ts`

**src/components/ (Vue 组件)：**
- 目的：UI 组件库
- 包含：TitleBar、ChatPanel、ContextMenu、Dialog、SettingsModal 等
- 关键文件：`CharacterSettingsModal.vue`, `ChatPanel.vue`

**src/utils/ (工具函数)：**
- 目的：底层工具和算法
- 包含：动画状态机、情感解析、鼠标交互、日志
- 关键文件：`animationState.ts`, `emotionParser.ts`

**src/sdk/ (SDK 层)：**
- 目的：封装与外部服务的通信协议
- 包含：GatewayClient (WebSocket 协议)
- 关键文件：`client.ts`, `types.ts`

**src-tauri/src/commands/ (Tauri 命令)：**
- 目的：前端调用 Rust 后端的接口
- 包含：settings、gateway、llm、identity、user、soul、window、mcp、env_check
- 关键文件：`mod.rs`, `settings.rs`, `llm.rs`

**src-tauri/src/mcp/ (MCP 服务器)：**
- 目的：提供外部工具调用 Live2D 动画的 HTTP 接口
- 包含：JSON-RPC 服务器、HTTP 服务器
- 关键文件：`server.rs`, `http_server.rs`

## 关键文件位置

**入口点：**
- `src/main.ts`：Vue 应用入口
- `src/App.vue`：主应用组件 (协调所有功能)
- `src-tauri/src/lib.rs`：Tauri 应用入口
- `src-tauri/src/main.rs`：Rust 程序入口

**配置：**
- `src-tauri/tauri.conf.json`：Tauri 应用配置
- `package.json`：Node.js 依赖配置
- `vite.config.ts`：Vite 构建配置
- `tsconfig.json`：TypeScript 配置

**核心逻辑：**
- `src/composables/useWebSocket.ts`：WebSocket 连接管理
- `src/composables/useLive2D.ts`：Live2D 模型控制
- `src/utils/animationState.ts`：动画状态机
- `src/sdk/client.ts`：GatewayClient SDK
- `src-tauri/src/commands/llm.rs`：LLM API 调用

**测试相关：**
- 当前项目无专门测试目录

## 命名约定

**文件：**
- Vue 组件：PascalCase (如 `ChatPanel.vue`, `CharacterSettingsModal.vue`)
- TypeScript 模块：kebab-case (如 `useWebSocket.ts`, `animationState.ts`)
- Rust 模块：snake_case (如 `command_runner.rs`, `env_check.rs`)

**目录：**
- 前端：kebab-case (如 `composables/`, `components/`, `utils/`)
- 后端 Rust：snake_case (如 `commands/`, `mcp/`)

**函数/方法：**
- TypeScript：camelCase (如 `connectWebSocket`, `loadLive2DModel`)
- Rust：snake_case (如 `save_setting`, `run_gateway`)

**类型/接口：**
- TypeScript：PascalCase (如 `WsMessage`, `ChatEventPayload`, `AnimationState`)
- Rust：PascalCase (如 `AppState`, `McpRequest`)

## 新增代码位置

**新增功能：**
- 前端逻辑 → `src/composables/` (创建新的 useXXX.ts)
- 前端组件 → `src/components/` (创建新的 Vue 组件)
- 工具函数 → `src/utils/`
- 后端命令 → `src-tauri/src/commands/` (创建新的模块)
- MCP 工具 → `src-tauri/src/mcp/server.rs`

**测试：**
- 项目当前未配置测试框架，无专门测试目录

**配置：**
- Tauri 配置 → `src-tauri/tauri.conf.json`
- 前端构建 → `vite.config.ts`, `tsconfig.json`

---

*结构分析：2026-03-17*
