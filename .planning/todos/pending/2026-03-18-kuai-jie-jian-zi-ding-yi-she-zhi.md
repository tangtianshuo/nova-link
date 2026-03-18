---
created: 2026-03-18T09:45:33.301Z
title: 快捷键自定义设置
area: ui
files:
  - src/composables/useHotkey.ts:1-100 (已实现快捷键逻辑，缺少配置读取)
  - src/components/CharacterSettingsModal.vue:1 (需要添加快捷键设置 UI)
---

## Problem

快捷键功能已实现（useHotkey.ts），但用户无法在设置面板中自定义快捷键。当前硬编码的快捷键：
- Ctrl+Shift+N：切换聊天面板
- Ctrl+Shift+H：切换窗口显示

用户需要能够在设置中修改这些快捷键。

## Solution

在 CharacterSettingsModal.vue 中添加快捷键自定义设置 UI：
1. 添加快捷键设置区块
2. 支持自定义修改快捷键
3. 保存到配置并实时生效
