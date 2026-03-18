# Roadmap: Nova Link

**Created:** 2026-03-17
**Current Focus:** Phase 2: 桌面集成 (已完成)

## Phase Overview

| # | Phase | Goal | Requirements | Status |
|---|-------|------|--------------|--------|
| 1 | 首次使用引导 | Complete | 12 | Completed |
| 2 | 桌面集成 (开机自启/快捷键/通知/历史/定时问候) | 实现第一阶段(v0.1.0)功能 | 6 | Completed |

## Phase 1: 首次使用引导

**Goal:** 实现分步式引导功能，介绍核心交互方式

**Requirements:**
- GUIDE-01: 分步式引导组件
- GUIDE-02: 下一步按钮
- GUIDE-03: 跳过按钮
- GUIDE-04: 完成按钮
- GUIDE-05: 聊天面板引导
- GUIDE-06: 右键菜单引导
- GUIDE-07: 设置入口引导
- GUIDE-08: 首次启动自动触发
- GUIDE-09: 本地存储引导状态
- GUIDE-10: 设置中重置引导
- GUIDE-11: glassmorphism 样式
- GUIDE-12: 居中显示

**Success Criteria:**
1. 首次启动应用时自动显示引导
2. 引导包含3个步骤：点击底部打开聊天、右键菜单、设置入口
3. 用户可以点击下一步、跳过或完成
4. 关闭引导后不再自动显示
5. 可从设置中重新打开引导
6. 样式与现有 glassmorphism 风格一致

**Plans:** 1 plan (Completed)

Plans:
- [x] 01-PLAN.md — 实现引导组件、状态管理、集成到App

---

## Phase 2: 桌面集成 (开机自启/快捷键/通知/历史/定时问候)

**Goal:** 实现第一阶段(v0.1.0)功能，提升用户粘性

**Requirements:**
- AUTO-01: 开机自启 - 系统启动时自动运行
- HOTKEY-01: 全局快捷键 - 唤起对话
- HOTKEY-02: 快捷操作 - 隐藏/显示、切换模型
- NOTIFY-01: Windows通知 - 重要消息推送
- HISTORY-01: 聊天历史持久化 - 关闭应用后历史可恢复
- GREETING-01: 定时问候 - 主动发送消息

**Success Criteria:**
- [x] 应用开机自动启动
- [x] 全局快捷键可唤起对话
- [x] 收到重要消息时有系统通知
- [x] 关闭应用后历史对话可恢复
- [x] 用户可设置定时提醒/问候

**Plans:** 3 plans (Completed)

Plans:
- [x] 02-01-PLAN.md — Tauri系统集成插件 (autostart/global-shortcut/notification) [COMPLETED]
- [x] 02-02-PLAN.md — 聊天历史持久化 (JSON存储) [COMPLETED]
- [x] 02-03-PLAN.md — 定时问候功能 (定时发送消息) [COMPLETED]

---

*Roadmap created: 2026-03-17*
*Last updated: 2026-03-18T07:45:00Z*
