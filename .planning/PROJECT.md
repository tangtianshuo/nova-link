# Nova Link - 首次使用引导功能

## What This Is

Nova Link 是一款 Tauri v2 桌面悬浮窗应用，带有 Live2D 角色显示和聊天功能。本次规划新增首次使用引导功能，帮助新用户快速了解应用的核心交互方式。

## Core Value

让新用户在首次使用时快速理解应用的操作方式，降低学习成本，提升首次体验的友好度。

## Requirements

### Active

- [ ] 首次使用引导组件 - 分步式指引 UI
- [ ] 引导步骤配置 - 可自定义的步骤数据
- [ ] 引导触发逻辑 - 检测是否为首次使用
- [ ] 引导重置功能 - 在设置中可重新打开引导
- [ ] 跳过/继续交互 - 支持跳过按钮和点击继续

### Out of Scope

- 复杂的动画效果
- 云端引导配置
- 多语言引导

## Context

- 现有应用：Tauri v2 + Vue 3 桌面悬浮窗
- 已有功能：Live2D 显示、聊天面板、右键菜单、设置面板
- 新增功能：首次使用引导

## Constraints

- **技术栈**: Vue 3 + TypeScript
- **UI 风格**: 与现有 glassmorphism 风格保持一致
- **兼容性**: Windows/macOS/Linux

---

*Last updated: 2026-03-17 after initial feature discussion*
