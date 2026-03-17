# Plan: 01-onboarding-guide

**Phase:** 1
**Wave:** 1
**Goal:** 实现分步式引导功能，介绍核心交互方式

## Tasks

### Task 1: 创建引导组件 (OnboardingGuide.vue)

**requirements:** GUIDE-01, GUIDE-02, GUIDE-03, GUIDE-04, GUIDE-11, GUIDE-12

**files_modified:**
- `src/components/OnboardingGuide.vue` (新建)

**<read_first>**
- `src/components/Dialog.vue` — 参考现有的 glassmorphism 风格和组件结构
- `src/App.vue` — 了解应用入口和状态管理方式

**</read_first>**

**<action>**
创建 `src/components/OnboardingGuide.vue`，包含：

1. **Props:**
   - `visible: boolean` - 控制显示隐藏

2. **Emits:**
   - `close` - 引导关闭时触发
   - `complete` - 引导完成时触发

3. **State:**
   - `currentStep: number` - 当前步骤索引 (0-2)
   - `steps: Array<{title: string, description: string}>` - 引导步骤数据

4. **Steps 内容:**
   - 步骤 1: "点击底部区域" / "点击窗口底部的区域可以打开聊天面板，和我聊天~"
   - 步骤 2: "右键菜单" / "点击鼠标右键可以打开菜单，设置我的参数~"
   - 步骤 3: "设置入口" / "在菜单中可以找到设置选项，定制我的外观和行为~"

5. **UI:**
   - 居中显示的玻璃态卡片
   - 标题显示当前步骤 (如 "第 1 步，共 3 步")
   - 描述文字
   - 底部按钮：跳过 / 下一步(最后一步为"完成")

6. **样式 (glassmorphism):**
   - 背景: `linear-gradient(145deg, rgba(30, 41, 59, 0.98), rgba(15, 23, 42, 0.99))`
   - 边框: `1px solid rgba(255, 255, 255, 0.1)`
   - 圆角: `16px`
   - 阴影: `0 25px 50px -12px rgba(0, 0, 0, 0.5)`
   - 文字颜色: 标题 `#f1f5f9`，描述 `#94a3b8`
   - 按钮风格参考 Dialog.vue

**</action>**

**<acceptance_criteria>**
- [ ] `src/components/OnboardingGuide.vue` 文件存在
- [ ] 组件导出 default (Vue 3 脚本 setup 格式)
- [ ] 包含 visible prop 和 close/complete emits
- [ ] 包含 3 个引导步骤的数据
- [ ] 包含下一步/跳过/完成按钮逻辑
- [ ] 样式使用 glassmorphism 风格

**</acceptance_criteria>**

---

### Task 2: 创建引导状态管理 (useOnboarding.ts)

**requirements:** GUIDE-08, GUIDE-09, GUIDE-10

**files_modified:**
- `src/composables/useOnboarding.ts` (新建)

**<read_first>**
- `src/composables/useSettings.ts` — 参考现有的设置存储方式

**</read_first>**

**<action>**
创建 `src/composables/useOnboarding.ts`，包含：

1. **State:**
   - `hasSeenOnboarding: Ref<boolean>` - 是否已看过引导
   - `isFirstLaunch: Ref<boolean>` - 是否首次启动

2. **Methods:**
   - `checkOnboardingStatus()` - 检查是否需要显示引导 (读取 settings)
   - `markOnboardingSeen()` - 标记引导已看过 (保存到 settings)
   - `resetOnboarding()` - 重置引导状态 (用于设置中重新显示)

3. **Storage Key:** 使用现有的 settings 存储机制，key 为 `has_seen_onboarding`

**</action>**

**<acceptance_criteria>**
- [ ] `src/composables/useOnboarding.ts` 文件存在
- [ ] 导出 `useOnboarding` 函数
- [ ] 包含 hasSeenOnboarding 状态
- [ ] 包含 checkOnboardingStatus, markOnboardingSeen, resetOnboarding 方法

**</acceptance_criteria>**

---

### Task 3: 集成引导到 App.vue

**requirements:** GUIDE-08

**files_modified:**
- `src/App.vue` (修改)

**<read_first>**
- `src/App.vue` — 了解现有结构，找到合适的位置集成

**</read_first>**

**<action>**
修改 `src/App.vue`：

1. 导入 OnboardingGuide 组件和 useOnboarding composable
2. 在 template 中添加 `<OnboardingGuide>` 组件
3. 在 onMounted 中检查引导状态，如果未看过则显示

**</action>**

**<acceptance_criteria>**
- [ ] App.vue 导入并使用 OnboardingGuide 组件
- [ ] 首次启动时自动显示引导

**</acceptance_criteria>**

---

### Task 4: 添加设置中的重置引导功能

**requirements:** GUIDE-10

**files_modified:**
- `src/components/CharacterSettingsModal.vue` 或 `src/components/SettingsModal.vue` (修改)

**<read_first>**
- `src/components/CharacterSettingsModal.vue` — 了解设置面板结构

**</read_first>**

**<action>**
在设置面板中添加"重新显示引导"选项，点击后调用 `resetOnboarding()` 并显示引导。

**</action>**

**<acceptance_criteria>**
- [ ] 设置中存在重置引导的选项
- [ ] 点击后能重新显示引导

**</acceptance_criteria>**

---

## Verification

### Must Have (for phase goal)

1. 首次启动应用时自动显示引导
2. 引导包含3个步骤：点击底部打开聊天、右键菜单、设置入口
3. 用户可以点击下一步、跳过或完成
4. 关闭引导后不再自动显示
5. 可从设置中重新打开引导
6. 样式与现有 glassmorphism 风格一致

---

*Plan created: 2026-03-17*
*Phase: 1 - 首次使用引导*
