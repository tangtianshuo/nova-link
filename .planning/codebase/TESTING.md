# Testing Patterns

**Analysis Date:** 2026-03-14

## Test Framework

**Status:** No testing framework currently configured

The project does not have any testing infrastructure set up. The codebase has:
- No test runner (Jest, Vitest, etc.)
- No test files (`.test.ts`, `.spec.ts`, etc.)
- No test configuration

This is a significant gap that should be addressed for maintainability.

## Current Testing Approach

### Manual Testing

The application is tested manually through:
1. Running the Tauri development build
2. Interacting with the Live2D model
3. Testing WebSocket connection to OpenClaw Gateway
4. Verifying settings persistence

### Areas Tested Manually

- WebSocket connection and reconnection (`src/composables/useWebSocket.ts`)
- Live2D model loading (`src/composables/useLive2D.ts`)
- Settings save/load (`src/composables/useSettings.ts`, Rust backend)
- Chat functionality
- Animation state transitions
- Context menu interactions

## Recommended Testing Infrastructure

### Framework Suggestion: Vitest

Since this is a Vue 3 + TypeScript + Vite project, Vitest is recommended:
- Built for Vite projects
- Native TypeScript support
- Compatible with Jest APIs
- Fast HMR during development

### Installation

```bash
npm install -D vitest @vue/test-utils happy-dom
```

### Configuration (vitest.config.ts)

```typescript
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'happy-dom',
    globals: true,
    include: ['src/**/*.test.ts', 'src/**/*.spec.ts'],
  },
})
```

### Package.json Scripts

```json
{
  "scripts": {
    "test": "vitest",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage"
  }
}
```

## Test File Organization

### Location

Tests should be co-located with source files or in a `tests/` directory:

```
src/
├── composables/
│   ├── useWebSocket.ts
│   ├── useWebSocket.test.ts      # Co-located test
│   └── useSettings.ts
├── utils/
│   ├── emotionParser.ts
│   └── emotionParser.test.ts     # Co-located test
├── sdk/
│   ├── client.ts
│   └── client.test.ts
└── tests/                        # Alternative: separate directory
    ├── composables/
    └── utils/
```

### Naming

- Test files: `.test.ts` or `.spec.ts` suffix
- Example: `emotionParser.test.ts`, `useWebSocket.test.ts`

## Test Structure

### Unit Test Pattern for Utilities

```typescript
// src/utils/emotionParser.test.ts
import { describe, it, expect } from 'vitest'
import { extractEmotion, parseStreamEmotion, getDefaultDuration } from './emotionParser'

describe('emotionParser', () => {
  describe('extractEmotion', () => {
    it('should extract emotion tag from text', () => {
      const result = extractEmotion('Hello [:emotion:happy:2000:]')
      expect(result.content).toBe('Hello')
      expect(result.emotion).toEqual({ type: 'happy', duration: 2000 })
    })

    it('should return content without emotion when no tag', () => {
      const result = extractEmotion('Hello world')
      expect(result.content).toBe('Hello world')
      expect(result.emotion).toBeUndefined()
    })

    it('should use default duration when not specified', () => {
      const result = extractEmotion('Hello [:emotion:sad:]')
      expect(result.emotion?.duration).toBe(3000)
    })
  })

  describe('getDefaultDuration', () => {
    it('should return correct default for happy', () => {
      expect(getDefaultDuration('happy')).toBe(2000)
    })

    it('should return correct default for sad', () => {
      expect(getDefaultDuration('sad')).toBe(3000)
    })
  })
})
```

### Unit Test Pattern for Composables

Composables require Vue test utilities for testing:

```typescript
// src/composables/useSettings.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useSettings } from './useSettings'

describe('useSettings', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('should load default settings', () => {
    const { settings } = useSettings()
    expect(settings.value.modelPath).toContain('runtime')
    expect(settings.value.chatProvider).toBe('openclaw')
  })
})
```

### Integration Test Pattern

```typescript
// src/sdk/client.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { GatewayClient } from './client'

describe('GatewayClient', () => {
  let client: GatewayClient

  beforeEach(() => {
    client = new GatewayClient({
      url: 'ws://localhost:18789',
      onStatusChange: vi.fn(),
      onConnected: vi.fn(),
      onError: vi.fn(),
    })
  })

  afterEach(() => {
    client?.disconnect()
  })

  it('should have disconnected status initially', () => {
    expect(client.isConnected).toBe(false)
    expect(client.status).toBe('disconnected')
  })
})
```

## Mocking

### What to Mock

- **WebSocket**: Mock the WebSocket class for network tests
- **Tauri API**: Mock `@tauri-apps/api/core` (invoke) and `@tauri-apps/api/event`
- **LocalStorage**: Mock browser storage
- **External dependencies**: pixi.js, GatewayClient

### Mocking Example

```typescript
// Mock Tauri invoke
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn().mockResolvedValue('{"modelPath": "/test"}'),
}))

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
}
global.localStorage = localStorageMock as any

// Mock WebSocket
class MockWebSocket {
  static CONNECTING = 0
  static OPEN = 1
  static CLOSING = 2
  static CLOSED = 3

  readyState = MockWebSocket.CONNECTING
  onopen: (() => void) | null = null
  onmessage: ((event: any) => void) | null = null
  onerror: ((error: any) => void) | null = null
  onclose: (() => void) | null = null

  constructor(public url: string) {}

  send(data: string) {}
  close() {}
}
global.WebSocket = MockWebSocket as any
```

### AnimationStateMachine Testing

Since it has no external dependencies, it's ideal for unit testing:

```typescript
// src/utils/anotionState.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { AnimationState, AnimationStateMachine } from './animationState'

describe('AnimationStateMachine', () => {
  let machine: AnimationStateMachine
  let mockModel: any

  beforeEach(() => {
    mockModel = {
      internalModel: {
        motionManager: {
          startMotion: vi.fn().mockResolvedValue(undefined),
          randomMotion: vi.fn().mockResolvedValue(undefined),
        },
      },
    }
    machine = new AnimationStateMachine(mockModel)
  })

  it('should start in IDLE state', () => {
    expect(machine.getState()).toBe(AnimationState.IDLE)
  })

  it('should transition to GREETING on first interaction', () => {
    machine.handleUserInteraction()
    expect(machine.getState()).toBe(AnimationState.GREETING)
  })

  it('should detect emotion from text', () => {
    expect(machine.detectEmotion('今天真开心')).toBe(AnimationState.HAPPY)
    expect(machine.detectEmotion('我很难过')).toBe(AnimationState.SAD)
  })

  it('should not detect emotion from empty text', () => {
    expect(machine.detectEmotion('')).toBeNull()
    expect(machine.detectEmotion('  ')).toBeNull()
  })
})
```

## Fixtures and Factories

### Test Data Location

```typescript
// src/tests/fixtures/
// - chatMessages.json
// - settings.json
// - mockGatewayResponses.ts

export const mockChatMessages = [
  { role: 'user', content: 'Hello' },
  { role: 'assistant', content: 'Hi there!' },
]

export const defaultSettings = {
  modelPath: '/models/test.model3.json',
  wsUrl: 'ws://localhost:18789',
  chatProvider: 'openclaw' as const,
}
```

### Factory Functions

```typescript
export function createMockChatMessage(overrides = {}) {
  return {
    role: 'user' as const,
    content: [{ type: 'text' as const, text: 'Test message' }],
    timestamp: Date.now(),
    ...overrides,
  }
}
```

## Coverage

### Requirements

**Recommendation:** Target 70% code coverage minimum

### Areas Critical to Cover

1. **Utils**: `emotionParser.ts`, `animationState.ts`
2. **SDK**: `client.ts` - WebSocket message handling
3. **Composables**: Core business logic

### View Coverage

```bash
npm run test:coverage
```

## Test Types

### Unit Tests

- Pure utility functions (`emotionParser.ts`, `animationState.ts`)
- Class methods (`AnimationStateMachine`)
- Type guards and validation

### Integration Tests

- WebSocket connection flow (with mocked WebSocket)
- Settings save/load (with mocked Tauri invoke)
- Chat message flow

### Manual E2E Tests

Since the project uses Tauri, visual testing is manual:
- Live2D model rendering
- Transparent window behavior
- System tray integration

## Common Patterns

### Async Testing

```typescript
import { vi } from 'vitest'

it('should connect to WebSocket', async () => {
  const connectPromise = client.connect()

  // Simulate WebSocket open
  wsInstance.readyState = WebSocket.OPEN
  wsInstance.onopen?.()

  await expect(connectPromise).resolves.toBeDefined()
})
```

### Error Testing

```typescript
it('should throw when sending without connection', async () => {
  await expect(client.sendMessage({ message: 'test' })).rejects.toThrow('Not connected')
})
```

### Watch Testing

```typescript
import { watch } from 'vue'
import { nextTick } from '@vue/runtime-core'

it('should react to settings changes', async () => {
  const { settings, loadSettings } = useSettings()

  // Trigger watch callback manually
  settings.value.bgColor = '#000000'
  await nextTick()

  expect(document.body.style.background).toBe('transparent')
})
```

---

*Testing analysis: 2026-03-14*
