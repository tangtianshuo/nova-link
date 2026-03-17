# Requirements: Nova Link 首次使用引导

**Defined:** 2026-03-17
**Core Value:** 让新用户在首次使用时快速理解应用的操作方式

## v1 Requirements

### 引导组件

- [ ] **GUIDE-01**: 分步式引导组件，支持显示标题、描述、当前步骤/总步骤数
- [ ] **GUIDE-02**: 支持"下一步"按钮，点击后显示下一条引导
- [ ] **GUIDE-03**: 支持"跳过"按钮，点击后关闭引导
- [ ] **GUIDE-04**: 最后一步显示"完成"按钮

### 引导内容

- [ ] **GUIDE-05**: 点击底部区域打开聊天面板的引导说明
- [ ] **GUIDE-06**: 右键菜单的引导说明
- [ ] **GUIDE-07**: 设置入口的引导说明

### 触发逻辑

- [ ] **GUIDE-08**: 应用首次启动时自动检测并显示引导
- [ ] **GUIDE-09**: 引导状态存储在本地配置中（首次使用标记）
- [ ] **GUIDE-10**: 设置中添加"重新显示引导"选项

### 样式

- [ ] **GUIDE-11**: 使用 glassmorphism 风格与现有 UI 一致
- [ ] **GUIDE-12**: 引导面板居中显示

## v2 Requirements

- **GUIDE-13**: 蒙版高亮模式（可选）
- **GUIDE-14**: 可配置的引导步骤（从配置文件加载）

## Out of Scope

| Feature | Reason |
|---------|--------|
| 复杂动画效果 | 保持简洁，减少干扰 |
| 云端引导配置 | 一次性功能，本地配置足够 |
| 多语言引导 | 首版仅支持中文 |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| GUIDE-01 | Phase 1 | Pending |
| GUIDE-02 | Phase 1 | Pending |
| GUIDE-03 | Phase 1 | Pending |
| GUIDE-04 | Phase 1 | Pending |
| GUIDE-05 | Phase 1 | Pending |
| GUIDE-06 | Phase 1 | Pending |
| GUIDE-07 | Phase 1 | Pending |
| GUIDE-08 | Phase 1 | Pending |
| GUIDE-09 | Phase 1 | Pending |
| GUIDE-10 | Phase 1 | Pending |
| GUIDE-11 | Phase 1 | Pending |
| GUIDE-12 | Phase 1 | Pending |

**Coverage:**
- v1 requirements: 12 total
- Mapped to phases: 1
- Unmapped: 0 ✓

---

*Requirements defined: 2026-03-17*
