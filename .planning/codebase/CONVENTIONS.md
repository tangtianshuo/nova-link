# Coding Conventions

**Analysis Date:** 2026-03-14

## Naming Patterns

### Files

- **Vue Components**: PascalCase with `.vue` extension
  - Example: `CharacterSettingsModal.vue`, `ChatPanel.vue`, `Dialog.vue`
- **TypeScript Files**: camelCase
  - Example: `useWebSocket.ts`, `emotionParser.ts`, `animationState.ts`
- **Type Definition Files**: camelCase with `.d.ts` suffix
  - Example: `global.d.ts`, `shims-vue.d.ts`
- **Barrel Files**: `index.ts` for exporting modules

### Directories

- **Feature Directories**: camelCase
  - Example: `src/composables/`, `src/utils/`, `src/sdk/`
- **Components**: Plural `components/` for Vue components

### Functions

- **Composable Functions**: camelCase, prefixed with `use`
  - Example: `useWebSocket()`, `useSettings()`, `useLive2D()`
- **Utility Functions**: camelCase
  - Example: `extractEmotion()`, `cleanContent()`, `hexToRgb()`
- **Class Methods**: camelCase
  - Example: `connect()`, `disconnect()`, `sendMessage()`

### Variables

- **General Variables**: camelCase
  - Example: `wsStatus`, `reconnectTimer`, `dialogVisible`
- **Vue Refs**: camelCase (often suffixed with `Ref` when used with Composition API)
  - Example: `const wsStatus = ref(...)`
- **Constants**: UPPER_SNAKE_CASE for compile-time constants
  - Example: `const RECONNECT_INTERVAL = 5000`
- **Type Aliases**: PascalCase
  - Example: `WsStatus`, `EmotionType`, `ChatMessage`

### Types

- **Interfaces**: PascalCase with descriptive suffixes
  - Example: `UseWebSocketOptions`, `StateChangeEvent`, `AppSettings`
- **Enums**: PascalCase with descriptive values
  - Example: `AnimationState.IDLE`, `AnimationState.GREETING`

## Code Style

### Formatting

- **Tool**: Built into Vite (esbuild) with TypeScript
- **Indentation**: 2 spaces (consistent throughout codebase)
- **Semicolons**: Used in TypeScript/JS
- **Quotes**: Double quotes for strings in TypeScript

### Linting

- **Configuration**: Uses TypeScript strict mode
- **tsconfig.json settings:**
  ```json
  {
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  }
  ```

### Vue SFC (Single File Components)

- **Script**: `<script setup lang="ts">` for Composition API
- **Props**: Defined with `defineProps<{...}>()` generic syntax
- **Emits**: Defined with `defineEmits<{...}>()` generic syntax
- **Style**: Scoped `<style scoped>` with Tailwind CSS classes

## Import Organization

### Order

1. **Vue/Framework imports**: `vue` and `@vue/*`
   ```typescript
   import { ref, computed, onMounted } from "vue"
   ```
2. **External libraries**: `@tauri-apps/*`, `pixi.js`, etc.
   ```typescript
   import { invoke } from "@tauri-apps/api/core"
   import { listen } from "@tauri-apps/api/event"
   ```
3. **Internal modules**: `./composables`, `./components`, `./utils`, `./sdk`
   ```typescript
   import { useSettings, useLive2D } from "./composables"
   import { extractEmotion } from "../utils/emotionParser"
   import { GatewayClient } from "../sdk/index.js"
   ```
4. **Type imports**: Separate `import type` statements
   ```typescript
   import type { EmotionData } from "../sdk/types"
   ```

### Path Aliases

- Not explicitly configured in tsconfig (uses relative paths)
- Common relative path patterns: `../`, `./`

### File Extensions

- TypeScript files: Explicit `.ts` or `.tsx` extensions in imports
- Vue files: `.vue` extension
- JavaScript imports from SDK: `.js` extension
  ```typescript
  import { GatewayClient } from "../sdk/index.js"
  ```

## Error Handling

### Pattern: Try-Catch with Fallbacks

```typescript
async function loadSettings(): Promise<void> {
  isLoading.value = true
  try {
    const saved = await invoke<string | null>("get_setting", {
      key: "app-settings",
    })
    if (saved) {
      settings.value = { ...defaultSettings, ...JSON.parse(saved) }
    }
  } catch (e) {
    // Fallback to localStorage
    const saved = localStorage.getItem("nova-link-settings")
    if (saved) {
      try {
        settings.value = { ...defaultSettings, ...JSON.parse(saved) }
      } catch {}
    }
  } finally {
    isLoading.value = false
  }
}
```

### Pattern: Error Boundaries in Callbacks

```typescript
gwClient.connect().catch((err) => {
  console.error("Failed to connect to Gateway:", err)
  scheduleReconnect()
})
```

### Pattern: Optional Chaining with Nullish Coalescing

```typescript
const content = filteredContent?.[0]?.text || ''
```

### Pattern: Type Guards

```typescript
function isValidEmotionType(type: string): type is EmotionType {
  return ["happy", "sad", "surprised", "angry", "idle"].includes(type)
}
```

## Logging

### Framework: console

- **Debug logs**: `console.debug()` (rarely used)
- **Info logs**: `console.log()` (used sparingly for major flow)
- **Warnings**: `console.warn()` (used for recoverable issues)
- **Errors**: `console.error()` (used for failures)

### Pattern: Tagged Console Logs

```typescript
console.error("[useWebSocket] Gateway error:", error)
console.error("[App] WebSocket error:", error)
console.error("[AnimationState] Failed to play motion:", error)
```

## Comments

### When to Comment

- **Chinese comments** for module-level documentation
  ```typescript
  // 情绪解析工具模块
  // 用于从大模型回复中提取情绪标签
  ```
- **JSDoc** for exported functions that have complex logic
  ```typescript
  /**
   * 从文本中提取情绪标签
   */
  export function extractEmotion(text: string) { ... }
  ```
- **Inline comments** for non-obvious logic
  ```typescript
  // 只有点击最下方 30% 区域时才显示输入框
  if (clickY > containerHeight * 0.7) { ... }
  ```

### Language

- Comments are primarily in **Chinese** (based on the project's target audience)
- Variable names and code are in English

## Function Design

### Size Guidelines

- Functions are typically single-purpose
- Large functions are broken into smaller helper functions
- Example: `emotionParser.ts` has `extractEmotion()`, `parseStreamEmotion()`, `cleanContent()`, `isValidEmotionType()`

### Parameters

- **Options Objects** for multiple optional parameters
  ```typescript
  export interface UseWebSocketOptions {
    onMessage?: (message: any) => void
    onStatusChange?: (status: WsStatus) => void
    onStreamUpdate?: (text: string) => void
    // ...
  }
  ```
- **Default values** provided in function signature
  ```typescript
  async function loadHistory(limit: number = 20): Promise<any> { ... }
  ```

### Return Values

- **Explicit return types** for exported functions
- **Void** for side-effect functions
- **Promise** for async operations
- **null** used as explicit "not found" value

## Module Design

### Exports

- **Named exports** for composables and utilities
  ```typescript
  export { useSettings } from "./useSettings"
  export type { AppSettings } from "./useSettings"
  ```
- **Default exports** for Vue components
  ```typescript
  export default defineComponent({ ... })
  // or just the component in SFC
  ```

### Barrel Files

- **composables/index.ts**: Re-exports all composables
- **components/index.ts**: Re-exports all Vue components
- **sdk/index.ts**: Re-exports SDK classes

### Vue Component Patterns

- **Composition API with `<script setup>`**
- **Reactive state** using `ref()` and `reactive()`
- **Props** defined with `defineProps()`
- **Events** defined with `defineEmits()`
- **Lifecycle hooks**: `onMounted()`, `watch()`, `onUnmounted()`

### Rust Backend Conventions

- **Module organization**: Separate files in `commands/` directory
- **Command handlers**: `#[tauri::command]` attribute
- **Error handling**: `Result<T, String>` for command returns
- **Logging**: `println!("[DEBUG] ...")` for debug output

---

*Convention analysis: 2026-03-14*
