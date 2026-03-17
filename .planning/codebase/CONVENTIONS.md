# Coding Conventions

**Analysis Date:** 2026-03-17

## Naming Patterns

**Files:**
- Composables/Utils: `camelCase.ts` (e.g., `useWebSocket.ts`, `emotionParser.ts`, `animationState.ts`)
- Vue Components: `PascalCase.vue` (e.g., `Dialog.vue`, `ChatPanel.vue`, `CharacterSettingsModal.vue`)
- SDK: `camelCase.ts` (e.g., `client.ts`, `types.ts`)
- Barrel files: `index.ts`

**Functions:**
- camelCase: `connectWebSocket()`, `extractEmotion()`, `handleUserInteraction()`
- Vue composables: `useWebSocket()`, `useChat()`, `useLive2D()`

**Variables:**
- camelCase: `wsStatus`, `reconnectTimer`, `gwClient`
- Vue refs: `const wsStatus = ref<WsStatus>("disconnected")`
- Boolean flags: `isConnected`, `hasModel`, `isMobile`

**Types:**
- PascalCase: `WsStatus`, `ChatMessage`, `EmotionData`, `UseWebSocketOptions`
- Enum values: `UPPER_SNAKE_CASE` for enum members (e.g., `AnimationState.IDLE`)

**Constants:**
- UPPER_SNAKE_CASE for magic numbers: `RECONNECT_INTERVAL = 5000`
- Also camelCase for internal constants: `IDLE_TIMEOUT = 5 * 60 * 1000`

## Code Style

**Formatting:**
- Tool: Not explicitly configured (no .prettierrc)
- Indentation: 4 spaces (based on source files)
- Semicolons: Used consistently

**TypeScript:**
- `tsconfig.json` settings:
  - `strict: true` - Full strict type checking
  - `noUnusedLocals: true` - Error on unused variables
  - `noUnusedParameters: true` - Error on unused parameters
  - `noFallthroughCasesInSwitch: true` - Require all switch cases

**Linting:**
- No explicit ESLint configuration found

## Import Organization

**Order:**
1. Vue core: `import { ref, computed } from "vue"`
2. External SDKs: `import { listen } from "@tauri-apps/api/event"`
3. Local modules: `import { GatewayClient } from "../sdk/index.js"`
4. Utilities: `import { extractEmotion } from "../utils/emotionParser"`
5. Type imports: `import type { EmotionData } from "../sdk/types"`

**Path Aliases:**
- `@` alias configured in `vite.config.ts`: maps to `./src`
- Example: `import { TitleBar } from "@/components"`

**Extensions:**
- Relative imports use `.js` extension for JavaScript files: `from "../sdk/index.js"`

## Error Handling

**Patterns:**

1. **Optional Chaining & Nullish Coalescing:**
```typescript
const content = filteredContent?.[0]?.text || ''
gwClient?.isConnected ?? false
options.onMessage?.(message)
```

2. **Try-Catch with Error Logging:**
```typescript
try {
  const result = await gwClient.loadHistory(undefined, limit)
} catch (e) {
  console.error("[Gateway] Failed to get history:", e)
}
```

3. **Promise Rejection:**
```typescript
return new Promise((resolve, reject) => {
  // ...
  reject(new Error("Connection timeout"))
})
```

4. **Error Throwing:**
```typescript
throw new Error("Gateway not connected")
```

5. **Console Error Patterns:**
```typescript
console.error("[useWebSocket] Gateway error:", error)
console.warn("[AnimationStateMachine] Motion group not found:", motion.group)
```

## Logging

**Framework:** `@tauri-apps/plugin-log`

**Logger Utilities:** `src/utils/logger.ts`
```typescript
import { logInfo, logError, logWarn, logDebug, logTrace } from "@/utils/logger"
import { info, error, warn, debug, trace } from "@tauri-apps/plugin-log"
```

**Patterns:**
- Prefix with module name: `[Nova Link]`, `[useWebSocket]`, `[Gateway]`
- Use appropriate level: `info`, `warn`, `error`, `debug`, `trace`
- Include context in error messages

**Fallback:** Uses `console.error`, `console.warn`, `console.log` in some legacy code

## Comments

**When to Comment:**
- Chinese comments for logic explanation (common in this codebase)
- JSDoc-style for exported functions
- Section dividers in complex components

**Examples:**
```typescript
// 情绪解析工具模块
// 用于从大模型回复中提取情绪标签
// 情绪标签正则表达式
const EMOTION_REGEX = /\[:emotion:(\w+):(\d+):\]/g
```

```typescript
/**
 * 信息日志
 */
export function logInfo(message: string, ...args: unknown[]) {
  // ...
}
```

**In Vue Components:**
```typescript
// 默认文案
const defaultConfirmText = "确定"
// 响应式窗口尺寸
const windowWidth = ref(window.innerWidth)
```

## Function Design

**Size:** Functions tend to be medium-sized with single responsibility

**Parameters:**
- Use interfaces for complex options: `UseWebSocketOptions`
- Default values for optional parameters: `limit: number = 20`
- Use `options` object pattern for multiple optional params

**Return Values:**
- Explicit return types: `function connectWebSocket(url: string, token?: string): void`
- Promise for async: `async function loadHistory(limit: number = 20): Promise<any>`
- Return early for error cases

## Module Design

**Exports:**
- Named exports preferred: `export function useWebSocket()`
- Also re-export from index: `export { AnimationStateMachine as Live2DStateMachine }`

**Barrel Files:**
- `src/components/index.ts` - Component re-exports
- `src/composables/index.ts` - Composable re-exports
- `src/sdk/index.ts` - SDK re-exports

## Vue-Specific Conventions

**Composition API:**
- Use `<script setup lang="ts">` syntax
- `defineProps` with type inference: `defineProps<{ visible: boolean }>()`
- `defineEmits` for event definitions
- Destructured composable returns

**State Management:**
- Vue `ref` for reactive primitives
- Vue `reactive` for object state
- Computed properties for derived state

**Event Handling:**
- Props for parent-to-child communication
- Emits for child-to-parent communication
- Global event bus via `window` object for dialogs: `(window as any).$showDialog`

## Rust Backend Conventions (src-tauri)

**Naming:**
- snake_case for functions and variables
- PascalCase for structs and enums
- Modules: `snake_case.rs`

**Command Pattern:**
```rust
#[tauri::command]
pub fn save_setting(key: String, value: String) -> Result<(), String> {
    // ...
}
```

**Error Handling:**
- Return `Result<T, String>` for error propagation
- Use `println!` for debug output

---

*Convention analysis: 2026-03-17*
