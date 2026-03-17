# 外部集成

**分析日期:** 2026-03-17

## API 与外部服务

### OpenClaw Gateway (WebSocket)

- **用途:** 聊天消息传输与 AI 代理交互
- **协议:** WebSocket
- **默认地址:** `ws://127.0.0.1:18789`
- **SDK:** 自定义 GatewayClient (`src/sdk/client.ts`)
- **认证:** Token 可选
- **文件位置:**
  - 客户端 SDK: `src/sdk/client.ts`
  - WebSocket Composable: `src/composables/useWebSocket.ts`
  - Rust 启动命令: `src-tauri/src/commands/gateway.rs`

**支持的协议方法:**
- `connect` - 建立连接
- `chat.send` - 发送消息
- `chat.history` - 获取历史消息
- `chat.abort` - 中止响应

**事件类型:**
- `agent` - AI 代理生命周期与消息
- `chat` - 聊天状态事件
- `message_start` / `message_delta` / `message_stop` - 消息流
- `tool_use` / `tool_result` - 工具调用

### LLM API

- **用途:** 直接调用大语言模型 API 进行对话
- **协议:** HTTPS (REST)
- **实现:** `src-tauri/src/commands/llm.rs`
- **认证:** Bearer Token (API Key)
- **客户端:** reqwest (Rust)

**支持的 API 格式:**
- OpenAI 兼容 API
- 端点: `{api_url}/chat/completions`
- 请求格式: JSON (model, messages, temperature, max_tokens)

**配置参数:**
- `provider` - 提供商类型
- `api_key` - API 密钥
- `api_url` - API 端点 URL
- `model` - 模型名称

### 自动更新

- **用途:** 检查并安装应用更新
- **服务:** GitHub Releases
- **端点:** `https://github.com/tangtianshuo/nova-link/releases/latest/download/latest.json`
- **实现:** tauri-plugin-updater
- **验证:** RSA 公钥签名验证
- **安装模式:**
  - Windows: 被动安装 (passive)
  - macOS: 下载模式

**配置文件:** `src-tauri/tauri.conf.json`

## 数据存储

### 文件系统 (JSON)

- **存储位置:** `exe/config/` 目录
- **格式:** JSON 文件
- **实现:** `src-tauri/src/config.rs`
- **持久化数据:**
  - `identity.json` - 角色身份信息
  - `user.json` - 用户信息
  - `soul.json` - 角色性格设置
  - `window.json` - 窗口位置和大小
  - `settings` - 应用设置 (key-value)

### Markdown 文件

- **位置:** `~/.openclaw/workspace/`
- **文件:**
  - `IDENTITY.md` - 角色身份 (同步到 OpenClaw)
  - `USER.md` - 用户信息
  - `SOUL.md` - 角色性格 (同步到 OpenClaw)

### MCP 服务器

- **用途:** 提供 Live2D 动画控制的外部接口
- **协议:** HTTP + JSON-RPC 2.0
- **默认端口:** 18787
- **实现:** `src-tauri/src/mcp/`
- **文件:**
  - `server.rs` - MCP 协议处理
  - `http_server.rs` - HTTP 服务器
  - `types.rs` - 类型定义

**可用工具:**
| 工具 | 参数 | 描述 |
|------|------|------|
| `play_animation` | animation, duration | 播放 Live2D 动画 |
| `set_emotion` | emotion, duration | 设置情感状态 |
| `get_model_info` | - | 获取模型信息 |

**API 端点:**
- `POST /mcp` - JSON-RPC 端点
- `GET /api/animation?emotion=xxx&duration=xxx` - 简化 REST API

### 动画控制脚本

- **位置:** `skill/scripts/`
- **用途:** 供 OpenClaw Skill 调用的批处理脚本
- **脚本:**
  - `happy.bat`, `sad.bat`, `surprised.bat`, `angry.bat`
  - `greeting.bat`, `talking.bat`, `listening.bat`, `thinking.bat`
  - `idle.bat`, `sleeping.bat`

## 身份验证

**当前实现:**
- 无专门身份验证提供商
- LLM API 使用 Bearer Token 认证
- OpenClaw Gateway 使用可选 Token

**配置方式:**
- 通过设置界面配置 API Key
- 存储在 JSON 配置文件中 (非加密)

## 监控与可观测性

**日志框架:**
- 前端: console.log / @tauri-apps/plugin-log
- Rust: env_logger + tauri-plugin-log
- 日志级别: 通过环境配置

**日志文件位置:**
- Windows: `%LOCALAPPDATA%\Nova Link\logs\`
- macOS: `~/Library/Logs/Nova Link/`

## CI/CD 与部署

**构建平台:**
- 本地构建 (npm run tauri build)
- GitHub Releases (自动更新源)

**持续集成:**
- 未检测到 CI 服务

**发布目标:**
- Windows: MSI 安装包
- macOS: DMG 镜像

## 环境配置

**必需环境变量 (应用内部):**
- `llm_api_key` - LLM API 密钥
- `llm_api_url` - LLM API 端点
- `llm_model` - 模型名称
- `ws_url` - WebSocket 服务器地址
- `model_path` - Live2D 模型路径

**配置文件位置:**
- `exe/config/settings.json` - 应用设置
- `.env` - 开发环境变量 (不应提交)

## Webhooks 与回调

**入站 Webhooks:**
- OpenClaw Gateway WebSocket 事件
- MCP HTTP 请求

**出站 Webhooks:**
- MCP HTTP 端点 (可被外部调用)
- 动画控制脚本 (通过命令行)

---

*集成审计: 2026-03-17*
