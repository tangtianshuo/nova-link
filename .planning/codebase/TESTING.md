# Testing Patterns

**Analysis Date:** 2026-03-17

## Test Framework

**Status:** Not Detected

**Current State:**
- No test runner configured (no `jest.config.js`, `vitest.config.ts`, or similar)
- No test files found in the codebase (`*.test.ts`, `*.spec.ts`)
- This is a notable gap in the project's quality assurance

## Test File Organization

**Location:** Not applicable - no tests exist

**Naming:** Not applicable

**Recommended Structure (for future):**
```
src/
├── __tests__/              # Test files
│   ├── composables/
│   │   └── useWebSocket.test.ts
│   ├── utils/
│   │   └── emotionParser.test.ts
│   └── sdk/
│       └── client.test.ts
├── components/
│   ├── __tests__/
│   │   └── Dialog.test.ts
│   └── Dialog.vue
└── composables/
    └── useWebSocket.ts
```

## Test Structure

**Recommended Patterns (based on codebase analysis):**

### Composables Testing
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useWebSocket } from '../useWebSocket'

describe('useWebSocket', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should initialize with disconnected status', () => {
    const { wsStatus } = useWebSocket()
    expect(wsStatus.value).toBe('disconnected')
  })

  it('should connect to WebSocket URL', () => {
    const { connectWebSocket } = useWebSocket()
    connectWebSocket('ws://localhost:18789')
    // assertions...
  })
})
```

### Utility Functions Testing
```typescript
import { describe, it, expect } from 'vitest'
import { extractEmotion } from '../utils/emotionParser'

describe('extractEmotion', () => {
  it('should extract happy emotion from text', () => {
    const result = extractEmotion('你好呀！[:emotion:happy:2000:]')
    expect(result.content).toBe('你好呀！')
    expect(result.emotion).toEqual({ type: 'happy', duration: 2000 })
  })

  it('should return original content if no emotion tag', () => {
    const result = extractEmotion('Hello world')
    expect(result.content).toBe('Hello world')
    expect(result.emotion).toBeUndefined()
  })
})
```

### SDK/Client Testing
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GatewayClient } from '../sdk/client'

describe('GatewayClient', () => {
  it('should throw error when not connected', async () => {
    const client = new GatewayClient({ url: 'ws://localhost:18789' })
    await expect(client.sendMessage({ message: 'test' })).rejects.toThrow('Not connected')
  })
})
```

## Mocking

**Framework:** Not configured - recommend Vitest with vi.fn()

**Patterns to Use:**

### Mocking WebSocket
```typescript
class MockWebSocket {
  static instances: MockWebSocket[] = []
  onopen: (() => void) | null = null
  onmessage: ((event: { data: string }) => void) | null = null
  onerror: ((error: Event) => void) | null = null
  onclose: (() => void) | null = null

  constructor(public url: string) {
    MockWebSocket.instances.push(this)
  }

  send(data: string) {}
  close() {}
}

// Setup global mock
global.WebSocket = MockWebSocket as any
```

### Mocking Tauri API
```typescript
import { vi } from 'vitest'

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}))

vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn(),
}))
```

### Mocking External Dependencies
```typescript
vi.mock('pixi-live2d-display/cubism4', () => ({
  MotionPriority: {
    IDLE: 0,
    NORMAL: 1,
    FORCE: 2,
  },
  SoundManager: {
    volume: 1,
  },
}))
```

## Fixtures and Factories

**Location:** Not applicable (no tests exist)

**Recommended Location:** `src/__fixtures__/`

**Example Fixtures:**
```typescript
// src/__fixtures__/chat.ts
export const mockChatMessages = [
  { role: 'user', content: [{ type: 'text', text: '你好' }] },
  { role: 'assistant', content: [{ type: 'text', text: '你好呀！' }] },
]

// src/__fixtures__/settings.ts
export const mockSettings = {
  modelPath: '/path/to/model.model3.json',
  wsUrl: 'ws://127.0.0.1:18789',
  chatProvider: 'openclaw',
  bgColor: '#1e293b',
  bgOpacity: 0.8,
  bgBlur: true,
}
```

## Coverage

**Requirements:** Not enforced

**View Coverage (recommend):**
```bash
# With Vitest
vitest run --coverage

# Configuration example (vitest.config.ts)
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts', 'src/**/*.vue'],
      exclude: ['src/**/*.d.ts', 'src/main.ts'],
    },
  },
})
```

## Test Types

**Unit Tests:**
- Scope: Composables, utility functions, SDK client
- Recommended coverage: Core business logic

**Integration Tests:**
- Not currently implemented
- Could test: Tauri commands, file system operations

**E2E Tests:**
- Not used
- Could use: Playwright or Cypress for full app testing

## Common Patterns Observed in Code

**Async Testing:**
- Use `async/await` with proper error handling
- Note: Codebase uses `.catch()` pattern extensively

**Error Testing:**
```typescript
// Example pattern in codebase
try {
  await sendWsMessage(content)
} catch (e) {
  addMessage("bot", `发送失败: ${e}`)
}
```

**State Testing:**
- Vue refs: `expect(wsStatus.value).toBe('connected')`
- Component state: Check computed properties

## Recommended Test Setup

**Package.json additions:**
```json
{
  "devDependencies": {
    "vitest": "^2.0.0",
    "@vue/test-utils": "^2.4.0",
    "happy-dom": "^15.0.0",
    "@vitest/coverage-v8": "^2.0.0"
  },
  "scripts": {
    "test": "vitest",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage"
  }
}
```

**Vitest config (vitest.config.ts):**
```typescript
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'happy-dom',
    globals: true,
    include: ['src/**/*.test.ts', 'src/**/*.spec.ts'],
    exclude: ['node_modules', 'dist'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

---

*Testing analysis: 2026-03-17*
