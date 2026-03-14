# Architecture

**Analysis Date:** 2026-03-14

## Pattern Overview

**Overall:** Event-driven composable architecture with Tauri IPC bridge

**Key Characteristics:**
- Vue 3 Composition API pattern with composables for state management
- Tauri v2 Rust backend providing native system integration and LLM API calls
- WebSocket-based real-time communication with OpenClaw Gateway
- State machine pattern for Live2D animation control
- Transparent frameless window with glassmorphism UI

## Layers

**Frontend (Vue 3 + TypeScript):**
- Location: `src/`
- Contains: Vue components, composables, SDK, utilities
- Depends on: Tauri API, PIXI.js, pixi-live2d-display

**Composables Layer:**
- Purpose: Reactive state management and business logic
- Location: `src/composables/`
- Contains: `useSettings`, `useLive2D`, `useWebSocket`, `useChat`, `useWindow`
- Depends on: SDK, utilities, Tauri invoke
- Used by: App.vue and components

**SDK Layer:**
- Purpose: WebSocket protocol handling for OpenClaw Gateway
- Location: `src/sdk/`
- Contains: `client.ts` - GatewayClient class with WebSocket connection management
- Depends on: Native WebSocket API
- Used by: `useWebSocket.ts` composable

**Utilities Layer:**
- Purpose: Animation state machine, emotion parsing, mouse interaction
- Location: `src/utils/`
- Contains: `animationState.ts`, `emotionParser.ts`, `mouseInteraction.ts`
- Used by: `useLive2D.ts` composable

**Components Layer:**
- Purpose: UI rendering
- Location: `src/components/`
- Contains: `ChatPanel.vue`, `Live2DContainer.vue`, `TitleBar.vue`, `ContextMenu.vue`, `Dialog.vue`, `CharacterSettingsModal.vue`
- Depends on: Composables for state

**Backend (Tauri/Rust):**
- Purpose: Native system integration, JSON config, LLM API, MCP server
- Location: `src-tauri/src/`
- Contains: `lib.rs`, `commands/`, `mcp/`, `config.rs`, `tray.rs`, `window.rs`

**Commands Layer:**
- Purpose: Tauri command handlers exposed to frontend
- Location: `src-tauri/src/commands/`
- Contains: `settings.rs`, `gateway.rs`, `llm.rs`, `identity.rs`, `user.rs`, `soul.rs`, `window.rs`, `mcp.rs`
- Depends on: `config.rs`, Tauri APIs
- Used by: Frontend via `invoke()`

**MCP Layer:**
- Purpose: Model Context Protocol server for external animation control
- Location: `src-tauri/src/mcp/`
- Contains: `server.rs`, `http_server.rs`, `types.rs`
- Provides: JSON-RPC based tools for animation control

## Data Flow

**Chat Message Flow:**

1. **User sends message**
   - ChatPanel.vue emits send event
   - App.vue `handleSendMessage()` determines provider (openclaw/llm)

2. **OpenClaw Gateway mode:**
   - `sendWsMessage(content)` from `useWebSocket`
   - GatewayClient sends via WebSocket to OpenClaw Gateway

3. **Gateway responds**
   - SDK receives `agent` event with lifecycle (start/end)
   - `onMessageStart` callback displays thinking indicator
   - `onStreamUpdate` / `onContentDelta` for streaming content
   - `onMessageStop` triggers final message handling

4. **Display in chat**
   - `addMessage("bot", content)` from `useChat`
   - Emotion parser extracts `[:emotion:type:duration:]` tags

5. **Trigger animation**
   - `handleEmotion()` from `useLive2D`
   - AnimationStateMachine transitions to emotion state

**State Management:**
- Composables use Vue 3 `ref` and `reactive` for reactive state
- Settings persist via Tauri invoke to Rust backend
- Window state saved to JSON config on resize/move

## Key Abstractions

**GatewayClient:**
- Purpose: WebSocket client for OpenClaw Gateway protocol
- Location: `src/sdk/client.ts`
- Pattern: Event-driven with callback options

**AnimationStateMachine:**
- Purpose: Manages Live2D model animation states
- Location: `src/utils/animationState.ts`
- Pattern: State machine with timer-based transitions

**useWebSocket:**
- Purpose: Composable wrapper around GatewayClient
- Location: `src/composables/useWebSocket.ts`
- Pattern: Vue composable with reactive state

**useLive2D:**
- Purpose: Live2D model loading and animation control
- Location: `src/composables/useLive2D.ts`
- Pattern: Vue composable with PIXI.js integration

## Entry Points

**Frontend Entry:**
- Location: `src/main.ts`
- Triggers: Tauri app launch
- Responsibilities: Vue app initialization, global component registration

**Main App Component:**
- Location: `src/App.vue`
- Triggers: Vue app mount
- Responsibilities: Initialize composables, setup event listeners, coordinate UI

**Rust Entry:**
- Location: `src-tauri/src/main.rs`
- Triggers: Tauri app launch
- Responsibilities: Call `lib::run()` for Tauri setup

**Tauri Setup:**
- Location: `src-tauri/src/lib.rs`
- Triggers: From main.rs
- Responsibilities: Command registration, window setup, system tray, transparent window handling

## Error Handling

**Frontend:**
- Try-catch blocks in async operations
- Error callbacks in WebSocket SDK
- Console.error for debugging

**Backend:**
- Rust Result types for error propagation
- env_logger for debug output
- Error messages returned via Tauri invoke responses

## Cross-Cutting Concerns

**Logging:** Console.log/console.error in frontend, env_logger in Rust
**Validation:** TypeScript types in frontend, JSON schema for MCP
**Authentication:** WebSocket token support in GatewayClient
**Window Management:** Tauri window API, JSON config persistence

---

*Architecture analysis: 2026-03-14*
