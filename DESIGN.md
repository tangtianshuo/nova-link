# nanobot-desktop 设计文档

## 1. 项目概述

| 项目 | 内容 |
|------|------|
| 项目名称 | nanobot-desktop |
| 项目类型 | 桌面宠物应用（Tauri + Python） |
| 核心功能 | 基于 nanobot 的 AI 助手，通过 Live2D 角色进行可视化交互 |
| 依赖项 | `nanobot-ai` (pip 安装) |

## 2. 技术架构

### 2.1 整体架构

```
┌─────────────────────────────────────────┐
│           nanobot-desktop              │
│  (独立 GitHub 仓库，pip install 依赖)   │
├─────────────────────────────────────────┤
│  Python CLI (nanobot-ai)               │
│  ├── LocalPetChannel (WebSocket Server) │
│  ├── Agent / Session / Memory          │
│  └── 复用现有所有 Channel               │
└──────────────┬──────────────────────────┘
               │ WebSocket
               ▼
┌─────────────────────────────────────────┐
│           Tauri App (Rust)              │
│  ├── WebView (Live2D + UI)             │
│  ├── WebSocket Client                   │
│  ├── Window Manager (置顶/透明/无边框)   │
│  └── System Tray                        │
└─────────────────────────────────────────┘
```

### 2.2 模块设计

| 模块 | 职责 |
|------|------|
| `localpet_channel.py` | nanobot 的 Channel，实现 WebSocket Server |
| `desktop_frontend/` | Tauri 前端，Live2D 渲染 + 交互 UI |
| `desktop_backend/` | Tauri Rust 后端，窗口管理 + 系统集成 |

## 3. 功能设计

### 3.1 Live2D 展示

- **默认模型**: 内置一个开源 Live2D 模型作为默认
- **自定义模型**: 支持用户替换 `~/.nanobot/desktop/model/` 目录下的模型文件
- **模型格式**: `.moc3` + `.json` (Live2D Cubism 4.x)

### 3.2 对话交互

```
用户点击角色 → 弹出悬浮输入框 → 用户输入 →
发送至 nanobot → nanobot 处理 →
返回回复 + 情绪标签 → 气泡显示回复 + 触发动画
```

| 组件 | 设计 |
|------|------|
| 输入框 | 底部悬浮，半透明背景，圆角设计 |
| 回复气泡 | 角色右侧弹出，柔和渐变 + 科技感边框 |
| 关闭方式 | 点击空白区域 / 发送后自动关闭 |

### 3.3 动画系统 (LLM 标签驱动)

nanobot 回复时，LLM 返回 JSON 格式的情绪标签：

```json
{
  "reply": "今天天气真好呀！",
  "emotion": "happy",
  "duration": 3000
}
```

| 情绪标签 | Live2D 动作 |
|----------|-------------|
| `happy` | 开心/微笑 |
| `thinking` | 思考/眨眼 |
| `speaking` | 说话动画 |
| `idle` | 待机呼吸 |
| `sad` | 悲伤 |
| `surprised` | 惊讶 |

**实现方式**: 修改 nanobot 的 prompt，让 LLM 输出情绪标签 (Tool/JSON mode)

## 4. 窗口设计

| 属性 | 值 |
|------|------|
| 窗口类型 | 无边框 (frameless) |
| 背景透明 | 是 (transparent: true) |
| 置顶 | 是 (always on top) |
| 可穿透 | 否 (点击可交互) |
| 可拖拽 | 是 (拖拽 Live2D 区域移动窗口) |
| 关闭 | 最小化到系统托盘 |

## 5. 系统集成

| 功能 | 说明 |
|------|------|
| 系统托盘 | 右键菜单：显示/隐藏、设置、退出 |
| 全局快捷键 | 自定义（如 Ctrl+Shift+N 唤起对话） |
| 开机自启 | 可选配置 |

## 6. 配置文件

`~/.nanobot/config.json` 新增配置：

```json
{
  "channels": {
    "localpet": {
      "enabled": true,
      "port": 18791,
      "model": "default",
      "animations": {
        "emotion_mapping": {
          "happy": "Spring",
          "thinking": "Tap",
          "speaking": "Talk"
        }
      }
    }
  },
  "desktop": {
    "window": {
      "width": 400,
      "height": 500,
      "x": "right",
      "y": "bottom"
    },
    "global_shortcut": "Ctrl+Shift+N"
  }
}
```

## 7. 开发计划

### Phase 1: 基础展示
- [x] 新增 `LocalPetChannel` (WebSocket Server) ✅ 已完成
- [x] Tauri 基础项目搭建 ✅ 已完成
- [ ] Live2D 模型加载与渲染 (MVP 暂不包含)
- [x] 置顶 + 透明无边框窗口 ✅ 已完成

### Phase 2: 对话功能
- [x] 悬浮输入框 UI ✅ 已完成
- [x] 回复气泡 UI ✅ 已完成
- [x] WebSocket 消息收发 ✅ 已完成
- [x] nanobot 集成 ✅ 已完成

### nanobot 集成说明

1. **启动 nanobot gateway**:
   ```bash
   cd nanobot
   python test_localpet.py
   ```

2. **启动 Tauri 桌宠**:
   ```
   src-tauri/target/release/nanobot-desktop.exe
   ```

3. **测试**:
   - 桌宠会尝试连接 ws://127.0.0.1:18791
   - 连接成功后可以在桌宠中对话

### Phase 3: 动画交互
- [ ] LLM 情绪标签输出
- [ ] 动画状态机
- [ ] 情绪 → 动作映射

## 8. nanobot 集成状态

### 8.1 已完成的修改

已在 nanobot 仓库中完成以下修改：

| 文件 | 修改内容 |
|------|---------|
| `nanobot/config/schema.py` | 添加 `LocalPetConfig` 配置类 |
| `nanobot/channels/localpet.py` | 新建 WebSocket Server Channel |
| `nanobot/channels/manager.py` | 添加 LocalPetChannel 加载逻辑 |

### 8.2 配置文件

`~/.nanobot/config.json` 添加：

```json
{
  "channels": {
    "localpet": {
      "enabled": true,
      "host": "127.0.0.1",
      "port": 18791,
      "allowFrom": ["*"]
    }
  }
}
```

## 9. MVP (最小可行产品)

MVP 版本只包含最核心的功能，可以快速验证产品方向。

### 9.1 MVP 目标

- 快速验证 Live2D + nanobot 结合的可行性
- 提供可演示的原型
- 核心功能闭环：显示 → 对话 → 回复

### 9.2 MVP 功能范围

| 功能 | MVP 状态 | 说明 |
|------|---------|------|
| Live2D 角色显示 | ✅ | 内置默认模型，只读显示 |
| 置顶透明窗口 | ✅ | 固定配置，无需设置 UI |
| 点击对话 | ✅ | 弹出输入框 |
| 文字对话 | ✅ | 简化版：纯文本，不含 markdown 渲染 |
| 回复气泡 | ✅ | 简化版：纯文字气泡 |
| WebSocket 通信 | ✅ | 基础消息收发 |
| 系统托盘 | ❌ | 后续版本 |
| 全局快捷键 | ❌ | 后续版本 |
| 自定义模型 | ❌ | 后续版本 |
| LLM 情绪动画 | ❌ | 后续版本（先用固定说话动画） |
| 开机自启 | ❌ | 后续版本 |

### 9.3 MVP 技术范围

```
MVP 仅包含：
- nanobot: LocalPetChannel (简化版)
- Tauri: 基础窗口 + Live2D 渲染 + 基础 UI
- 通信: 固定端口 18791，无配置项
```

### 9.4 MVP 验收标准

- [ ] 运行 `nanobot gateway` 后，Tauri 窗口显示 Live2D 角色
- [ ] 窗口保持置顶、背景透明、无边框
- [ ] 点击角色，弹出输入框
- [ ] 输入文字并发送，收到 nanobot 回复
- [ ] 回复内容以气泡形式显示在界面上
- [ ] 对话完成后可继续对话

### 9.5 MVP 预计工作量

| 模块 | 预估 |
|------|------|
| LocalPetChannel (简化版) | 0.5 天 |
| Tauri 项目搭建 + 窗口 | 0.5 天 |
| Live2D 渲染 (静态) | 0.5 天 |
| 输入框 + 回复气泡 UI | 0.5 天 |
| WebSocket 通信联调 | 0.5 天 |
| **总计** | **~2.5 天** |

### 9.6 MVP 后的迭代

```
MVP 发布后 → 收集反馈 → 迭代

v1.1: 添加系统托盘 + 关闭按钮
v1.2: 添加固定说话动画（发送/接收时触发）
v1.3: 支持自定义模型
v2.0: LLM 情绪标签 + 完整动画系统
```
