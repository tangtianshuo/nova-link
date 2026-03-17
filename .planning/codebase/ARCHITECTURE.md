# 架构

**分析日期：** 2026-03-17

## 模式概述

**总体模式：** 前端-后端分离 + 事件驱动架构

**关键特性：**
- **Tauri v2 桌面应用**：Rust 后端 + Vue 3 前端的混合架构
- **WebSocket 实时通信**：与 OpenClaw Gateway 的双向通信
- **状态机驱动动画**：基于状态机的 Live2D 动画控制系统
- **Composable 组合式逻辑**：Vue 3 Composition API 封装业务逻辑

## 分层

**表现层 (Frontend - Vue 3)：**
- 位置：`src/`
- 包含：Vue 组件 (`.vue`)、Composables (`.ts`)
- 依赖：PIXI.js (Live2D渲染)、Tauri API (Rust通信)
- 被使用：Tauri WebView

**业务逻辑层 (Frontend Composables)：**
- 位置：`src/composables/`
- 包含：useWebSocket、useLive2D、useChat、useSettings、useWindow 等
- 依赖：SDK (GatewayClient)、Utils (animationState)
- 被使用：App.vue 及各组件

**SDK 层 (Frontend)：**
- 位置：`src/sdk/client.ts`
- 包含：GatewayClient 类 - WebSocket 协议封装
- 依赖：原生 WebSocket API
- 被使用：useWebSocket composable

**平台适配层 (Frontend Utils)：**
- 位置：`src/utils/`
- 包含：animationState (状态机)、emotionParser (情感解析)、mouseInteraction (鼠标交互)
- 依赖：pixi-live2d-display
- 被使用：useLive2D composable

**命令层 (Backend - Rust)：**
- 位置：`src-tauri/src/commands/`
- 包含：settings、gateway、llm、identity、user、soul、window、mcp、env_check
- 依赖：Tauri 框架、Rust 生态系统
- 被使用：Frontend via Tauri invoke

**基础设施层 (Backend - Rust)：**
- 位置：`src-tauri/src/`
- 包含：lib.rs、config.rs、state.rs、window.rs、tray.rs、powershell.rs
- 依赖：Tauri、serde、tokio、env_logger

## 数据流

**聊天消息流程：**

1. **用户发送消息** → ChatPanel.vue 触发 `@send` 事件 → App.vue `handleSendMessage()`
2. **选择发送方式** → 根据 `settings.chatProvider` 判断：
   - `openclaw`：调用 `useWebSocket().sendMessage()` → GatewayClient 发送 WebSocket 消息
   - `llm`：调用 Rust `invoke("chat_with_llm")` → 直接调用 LLM API
3. **Gateway 响应** → SDK 接收 `agent` 事件 → 触发 `onMessageStart` / `onMessageStop` 回调
4. **显示思考状态** → `startThinking()` 显示 "正在思考..." 指示器
5. **接收响应内容** → `onContentDelta` 回调更新消息 → `addMessage("bot", content)` 添加到面板
6. **情感解析** → `emotionParser.ts` 提取 `[:emotion:TYPE:DURATION:]` 标签
7. **触发动画** → `useLive2D().handleEmotion()` → AnimationStateMachine 状态转换

**窗口管理流程：**

1. **初始化** → lib.rs `setup()` 检测是否有保存的窗口状态
2. **恢复/创建** → 有状态：从 `exe/config/window.json` 恢复；无状态：根据屏幕尺寸计算 (1/6 屏幕宽度)
3. **事件处理** → `on_window_event` 监听 resize/move 事件 → 调用 `config::save_window_state()` 持久化

**MCP 动画控制流程：**

1. **外部请求** → HTTP 请求到 `localhost:18787` → `mcp/http_server.rs` 处理
2. **JSON-RPC 解析** → `server.rs` 解析请求 → 调用工具函数
3. **前端事件** → Rust 调用 `app.emit()` 发送事件到前端
4. **动画执行** → 前端监听 `mcp-animation` / `mcp-emotion` 事件 → 触发状态机转换

## 关键抽象

**GatewayClient (SDK)：**
- 目的：封装 WebSocket 协议，实现与 OpenClaw Gateway 的通信
- 示例：`src/sdk/client.ts`
- 模式：单例模式，通过回调处理各种事件

**AnimationStateMachine (状态机)：**
- 目的：管理 Live2D 模型的状态转换和动画播放
- 示例：`src/utils/animationState.ts`
- 模式：状态模式 - 定义 IDLE、GREETING、TALKING、LISTENING、THINKING、HAPPY、SAD、SURPRISED、ANGRY、SLEEPING 等状态

**useLive2D (Composable)：**
- 目的：封装 Live2D 模型的加载、交互和动画控制
- 示例：`src/composables/useLive2D.ts`
- 模式：工厂函数模式，返回丰富的 API 对象

**Tauri Commands (命令模式)：**
- 目的：前端调用 Rust 后端功能的入口
- 示例：`src-tauri/src/commands/` 下的各个模块
- 模式：命令模式 - 每个命令是一个独立的函数

## 入口点

**前端入口：**
- 位置：`src/main.ts`
- 触发：Tauri WebView 加载
- 职责：创建 Vue 应用、注册全局组件 (Dialog)、挂载到 #app

**后端入口：**
- 位置：`src-tauri/src/lib.rs`
- 触发：Tauri 应用启动
- 职责：初始化 Tauri Builder、注册命令、设置窗口、创建系统托盘

**组件入口：**
- 位置：`src/App.vue`
- 触发：Vue 应用挂载后
- 职责：初始化所有 composables、协调各组件、控制整体布局

## 错误处理

**策略：** 分层处理 + 全局捕获

**模式：**
1. **前端组件级** → try-catch 包裹异步操作，显示用户友好的错误消息
2. **Composable 级** → 内部捕获错误，转换为可显示的状态 (error ref)
3. **全局 Vue 错误处理** → `app.config.errorHandler` 捕获未处理错误 → 发送到 Rust 日志
4. **Rust 命令级** → 使用 `Result<T, String>` 返回错误 → 前端 `invoke().catch()` 处理

## 跨领域关注

**日志：**
- 前端：使用 `@tauri-apps/plugin-log` 的 `attachConsole` 和 `error`
- Rust：使用 `env_logger` 和 `println!`

**验证：**
- 组件 props 使用 TypeScript 类型
- Rust 命令参数使用 serde 验证

**认证：**
- WebSocket 连接支持 token 认证
- LLM API 使用 API Key 认证
- 环境变量存储敏感信息

---

*架构分析：2026-03-17*
