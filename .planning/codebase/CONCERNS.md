# Codebase Concerns

**Analysis Date:** 2026-03-17

## Tech Debt

### 调试日志未清理
- Issue: 大量 `console.log` 调试语句散布在代码中，生产环境应移除
- Files:
  - `src/composables/useClickThrough.ts` - 15+ 处调试日志
  - `src/utils/pixelHitTest.ts` - 调试日志
  - `src/utils/gpuHitTest.ts` - 调试日志
  - `src/utils/mouseInteraction.ts` - 调试日志
- Impact: 控制台输出混乱，可能泄露调试信息
- Fix approach: 使用条件编译或日志库替换，生产环境关闭调试日志

### 空返回模式过度使用
- Issue: 大量函数返回 `null`、`[]`、`{}` 作为默认值，缺乏类型安全
- Files:
  - `src/utils/gpuHitTest.ts` - 多处返回 null
  - `src/utils/animationState.ts` - 返回 null 和空数组
  - `src/composables/useEnvCheck.ts` - 返回 null
  - `src/utils/mouseInteraction.ts` - 返回 null
  - `src/sdk/client.ts` - 返回 null
  - `src/composables/useWebSocket.ts` - 返回 null
- Impact: 调用方需要大量 null 检查，代码可读性差
- Fix approach: 使用 Option/Maybe 类型或明确返回类型，添加类型守卫

### 缺少单元测试
- Issue: 项目没有任何测试文件（除 node_modules）
- Files: 整个项目无测试
- Impact: 重构风险高，bug 难以发现
- Fix approach: 为核心模块添加 Vitest 单元测试

## Known Bugs

### Live2D 模型加载失败无友好提示
- Symptoms: 模型路径错误时只抛出异常，无用户友好的错误提示
- Files: `src/composables/useLive2D.ts`
- Trigger: 错误的模型路径或模型文件损坏
- Workaround: 用户需手动检查配置文件

### 设置加载失败静默回退
- Symptoms: Tauri invoke 失败时静默使用 localStorage，无错误提示
- Files: `src/composables/useSettings.ts` 第 55-61 行
- Trigger: Rust 后端未响应或配置损坏
- Workaround: 用户可能不知道设置未正确保存

### 聊天消息历史可能被截断
- Symptoms: 只加载最近 20 条消息
- Files: `src/composables/useChat.ts`
- Trigger: 长对话场景
- Workaround: 无

## Security Considerations

### 敏感信息明文存储
- Risk: API Key、Token 以明文存储在 JSON 配置文件中
- Files:
  - `src/composables/useSettings.ts` - llmApiKey, wsToken 明文存储
  - `src-tauri/src/config.rs` - JSON 文件明文存储
- Current mitigation: 无
- Recommendations:
  - 使用系统密钥链（Windows Credential Manager）存储敏感信息
  - 考虑加密存储 API 密钥
  - 不在 localStorage 中存储敏感数据

### 外部 URL 无验证
- Risk: WebSocket URL 和 LLM API URL 用户可自定义，无白名单
- Files:
  - `src/composables/useSettings.ts`
  - `src/composables/useWebSocket.ts`
- Current mitigation: 无
- Recommendations: 添加 URL 白名单或安全提示

## Performance Bottlenecks

### Live2D 渲染可能卡顿
- Problem: GPU hit test 每帧调用，无缓存机制
- Files: `src/utils/gpuHitTest.ts`
- Cause: 每次交互都进行 WebGL picking
- Improvement path: 添加命中结果缓存或节流

### WebSocket 消息处理无批处理
- Problem: 每条消息立即处理，可能导致 UI 卡顿
- Files: `src/sdk/client.ts`
- Cause: 实时流式响应无缓冲
- Improvement path: 使用消息队列批量更新 UI

### 内存泄漏风险
- Problem: 回调函数数组持续增长未清理
- Files:
  - `src/composables/useLive2D.ts` - onModelClickCallbacks, onModelDoubleClickCallbacks 等
  - `src/utils/animationState.ts` - 状态回调
- Cause: 未提供移除回调的方法，组件卸载时未清理
- Improvement path: 添加回调清理机制，在组件 unmounted 时自动清理

## Fragile Areas

### 透明穿透检测逻辑复杂
- Why fragile: 多层检测逻辑（GPU hit test → pixel hit test → fallback），边界条件多
- Files:
  - `src/utils/gpuHitTest.ts`
  - `src/utils/pixelHitTest.ts`
  - `src/utils/mouseInteraction.ts`
  - `src/composables/useClickThrough.ts`
- Safe modification: 添加单元测试覆盖各种场景
- Test coverage: 无测试

### 动画状态机状态转换复杂
- Why fragile: 10+ 状态，状态转换规则复杂，容易出现意外行为
- Files: `src/utils/animationState.ts`
- Safe modification: 绘制状态转换图，添加日志
- Test coverage: 无测试

### Window 状态管理
- Why fragile: 窗口位置/大小在多处保存（resize、move、quit），可能冲突
- Files:
  - `src-tauri/src/window.rs`
  - `src-tauri/src/commands/window.rs`
- Safe modification: 统一窗口状态管理，使用单一数据源

## Scaling Limits

### 单聊天会话限制
- Current capacity: 只支持单一 chat_id
- Limit: 多角色/多会话场景无法支持
- Scaling path: 添加会话管理

### 消息历史内存存储
- Current capacity: 消息存储在内存中
- Limit: 大量消息会占用大量内存
- Scaling path: 分页加载，持久化存储

### WebSocket 连接单一
- Current capacity: 一个 WebSocket 连接
- Limit: 无法连接多个 Gateway
- Scaling path: 连接池或多实例

## Dependencies at Risk

### pixi-live2d-display
- Risk: 第三方库，维护不活跃
- Impact: Live2D 功能完全依赖此库
- Migration plan: 考虑迁移到官方 Cubism SDK 或寻找替代方案

### tauri v2
- Risk: 相对较新，部分 API 可能不稳定
- Impact: 桌面功能可能受影响
- Migration plan: 关注官方更新，及时迁移

## Missing Critical Features

### 错误边界
- Problem: Vue 组件无错误边界，错误会导致白屏
- Blocks: 生产环境稳定性

### 离线支持
- Problem: 完全依赖 WebSocket 连接，无法离线使用
- Blocks: 无网络环境使用

### 无障碍支持
- Problem: 无键盘导航、屏幕阅读器支持
- Blocks: 特殊用户群体使用

## Test Coverage Gaps

### 核心逻辑无测试
- What's not tested:
  - 动画状态转换逻辑
  - 情感标签解析
  - WebSocket 消息处理
  - 设置加载/保存
  - 窗口状态管理
- Files: 整个 `src/` 目录
- Risk: 重构或修改可能破坏功能而不自知
- Priority: High

### 组件无测试
- What's not tested: 所有 Vue 组件
- Files: `src/components/*.vue`
- Risk: UI bug 难以发现
- Priority: Medium

### 集成测试缺失
- What's not tested: 前端与 Rust 后端通信
- Files: 所有 `invoke` 调用
- Risk: API 变更导致前端崩溃
- Priority: High

---

*Concerns audit: 2026-03-17*
