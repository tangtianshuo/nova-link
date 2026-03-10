# nanobot-desktop 执行计划

## 当前执行进度

### Phase 1: 基础展示

| 任务                                      | 状态      | 说明                                                           |
| ----------------------------------------- | --------- | -------------------------------------------------------------- |
| 新增 `LocalPetChannel` (WebSocket Server) | ✅ 已完成 | 位于 nanobot 后端仓库                                          |
| Tauri 基础项目搭建                        | ✅ 已完成 | 使用 Vite + TypeScript + Tauri v2                              |
| Live2D 模型加载与渲染                     | ✅ 已实现 | 使用 pixi-live2d 实现，需模型文件                              |
| 置顶 + 透明无边框窗口                     | ✅ 已完成 | `decorations: false`, `transparent: true`, `alwaysOnTop: true` |

### Phase 2: 对话功能

| 任务               | 状态      | 说明                                |
| ------------------ | --------- | ----------------------------------- |
| 悬浮输入框 UI      | ✅ 已完成 | 底部输入框 + 发送按钮               |
| 回复气泡 UI        | ✅ 已完成 | 消息气泡样式（用户/机器人不同颜色） |
| WebSocket 消息收发 | ✅ 已完成 | Rust 后端 WebSocket 客户端          |
| nanobot 集成       | ✅ 已完成 | 连接 `ws://127.0.0.1:18791`         |

### Phase 3: 动画交互

| 任务             | 状态      | 说明                       |
| ---------------- | --------- | -------------------------- |
| LLM 情绪标签输出 | ❌ 未开始 | 需修改 nanobot 后端 prompt |
| 动画状态机       | ✅ 已完成 | 前端动画状态管理           |
| 情绪 → 动作映射  | ✅ 已完成 | 情绪到 Live2D 动作映射     |

### 后续版本功能

| 任务       | 状态      | 说明                            |
| ---------- | --------- | ------------------------------- |
| 系统托盘   | ❌ 未开始 | 需 tauri-plugin-shell           |
| 全局快捷键 | ❌ 未开始 | 需 tauri-plugin-global-shortcut |
| 开机自启   | ❌ 未开始 | 需 autostart 插件               |
| 自定义模型 | ❌ 未开始 | 模型文件替换功能                |

---

## 待执行任务

### 优先级 1: MVP 完善

#### 1.1 Live2D 模型加载与渲染

- ✅ 调研前端 Live2D 渲染方案（使用 pixi-live2d）
- ✅ 添加 Live2D 库依赖 (pixi.js 7 + pixi-live2d)
- ✅ 实现模型加载逻辑（从 `./src/models/` 目录加载）
- ✅ 添加 Live2D 模型文件（hiyori_pro_zh - 日和 Pro 中文版）
- ✅ 实现基本动画（待机呼吸、点击反馈 - 代码已实现）

#### 1.2 拖拽移动窗口

- ✅ 已实现拖拽功能（使用 `win.startDragging()`）

### 优先级 2: Phase 3 动画系统

#### 2.1 LLM 情绪标签输出

- 需修改 nanobot 的 prompt，让 LLM 输出 JSON 格式情绪标签
- 定义情绪标签格式（emotion, duration）

#### 2.2 动画状态机

- 在前端实现动画状态管理
- 支持状态切换（idle → speaking → idle）

#### 2.3 情绪 → 动作映射

- 配置情绪到 Live2D 动作的映射表
- 根据 nanobot 返回的情绪标签触发动画

### 优先级 3: 系统集成

#### 3.1 系统托盘

- 使用 tauri-plugin-shell 或 tauri-plugin-notification
- 实现托盘图标和右键菜单（显示/隐藏、设置、退出）

#### 3.2 全局快捷键

- 使用 tauri-plugin-global-shortcut
- 注册全局快捷键（如 Ctrl+Shift+N）唤起对话

#### 3.3 开机自启

- 使用 Tauri 的 autostart 插件

---

## 实施步骤

### Step 1: Live2D 集成

1. 安装 Live2D 渲染库（如 `@pixi/live2d` 或 `cubism-core`）
2. 下载一个开源 Live2D 模型作为默认模型
3. 实现模型加载和渲染
4. 添加拖拽窗口功能

### Step 2: 动画系统

1. 与 nanobot 仓库协调，修改 prompt 输出情绪标签
2. 实现前端动画状态机
3. 配置情绪-动作映射

### Step 3: 系统集成

1. 添加系统托盘
2. 添加全局快捷键
3. 添加开机自启

### Step 4: 增强功能

1. 支持自定义模型（用户替换模型文件）
2. 窗口位置配置
3. 界面个性化设置

---

## 项目技术栈

- **前端**: Vite + TypeScript + PixiJS + pixi-live2d
- **后端**: Tauri v2 (Rust)
- **通信**: WebSocket (ws://127.0.0.1:18791)
- **窗口**: 透明、无边框、置顶

## 已实现功能清单

1. ✅ 透明无边框窗口（decorations: false, transparent: true）
2. ✅ 窗口置顶（alwaysOnTop: true）
3. ✅ 拖拽移动窗口（drag-region + startDragging）
4. ✅ 关闭按钮
5. ✅ Live2D 模型加载（pixi-live2d + hiyori_pro_zh 日和 Pro）
6. ✅ 点击 Live2D 触发动画（支持 Tap@Body/TapBody/Tap）
7. ✅ 对话面板 UI
8. ✅ 消息气泡样式
9. ✅ WebSocket 客户端（Rust 后端）
10. ✅ 自动重连（指数退避）
11. ✅ 连接状态指示器
12. ✅ 消息发送/接收

## 未实现功能清单

1. ✅ ~~Live2D 模型文件~~（已添加 hiyori_pro_zh）
2. ❌ LLM 情绪标签输出（需 nanobot 后端配合）
3. ✅ ~~动画状态机~~（已实现）
4. ✅ ~~情绪-动作映射~~（已实现）
5. ❌ 系统托盘
6. ❌ 全局快捷键
7. ❌ 开机自启
8. ❌ 自定义模型功能
