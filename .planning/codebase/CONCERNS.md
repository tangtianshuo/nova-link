# Codebase Concerns

**Analysis Date:** 2026-03-14

## Tech Debt

**Debug Println Statements in Production:**
- Issue: Excessive debug logging with `println!` macros throughout Rust backend
- Files: `src-tauri/src/lib.rs`, `src-tauri/src/window.rs`
- Impact: Performance degradation and noise in production logs
- Fix approach: Replace with proper `log` crate with appropriate log levels, or remove entirely

**Deprecated Components Still in Codebase:**
- Issue: `src/components/SettingsModal.vue` is marked deprecated but still present
- Files: `src/components/SettingsModal.vue`, `src/components/CharacterSettingsModal.vue`
- Impact: Code confusion and maintenance burden
- Fix approach: Remove `SettingsModal.vue` after confirming all functionality moved to `CharacterSettingsModal.vue`

**Debug Commented Code:**
- Issue: Multiple commented-out debug print statements remain in source
- Files: `src-tauri/src/window.rs`
- Impact: Cluttered codebase
- Fix approach: Remove commented debug statements

## Known Bugs

**WebSocket Message Race Condition:**
- Symptoms: Chat history sometimes shows "thinking" indicator indefinitely after bot response
- Files: `src/sdk/client.ts`, `src/composables/useWebSocket.ts`
- Trigger: When bot responds without streaming content, relies on history fetch which can fail or return late
- Workaround: Manual refresh of chat panel

**Window Position Not Restored on First Launch:**
- Symptoms: Window may appear at incorrect position or hidden on first run
- Files: `src-tauri/src/lib.rs`, `src-tauri/src/window.rs`
- Trigger: When no saved window state exists
- Workaround: Manual window repositioning by user

## Security Considerations

**API Keys in Memory:**
- Risk: LLM API keys stored in Rust state and passed around
- Files: `src-tauri/src/state.rs`, `src-tauri/src/commands/llm.rs`
- Current mitigation: Keys are runtime-only, not persisted to disk
- Recommendations: Consider encrypting keys at rest in memory, use secure string handling

**System Command Execution:**
- Risk: PowerShell execution for Gateway startup
- Files: `src-tauri/src/command_runner.rs`, `src-tauri/src/powershell.rs`
- Current mitigation: Limited to specific Gateway executable paths
- Recommendations: Validate executable paths, add user confirmation before execution

**MCP Server HTTP Exposure:**
- Risk: MCP HTTP server may be accessible without authentication
- Files: `src-tauri/src/mcp/http_server.rs`
- Current mitigation: Default localhost binding only
- Recommendations: Add authentication layer or limit to Unix socket

## Performance Bottlenecks

**Chat History Loading:**
- Problem: Loads up to 200 messages on history fetch
- Files: `src/sdk/client.ts:562-617`
- Cause: No pagination, always fetches maximum
- Improvement path: Add pagination support, load on-demand

**Live2D Model Reload:**
- Problem: Full model destroy and recreate on reload, causing visible lag
- Files: `src/composables/useLive2D.ts:179-230`
- Cause: No model caching or incremental reload
- Improvement path: Implement model pooling or background preloading

**Emotion Parsing on Every Stream Update:**
- Problem: `extractEmotion()` called on every WebSocket stream update
- Files: `src/composables/useWebSocket.ts:65-72`
- Cause: No debouncing or throttling
- Improvement path: Add debounce for emotion extraction

## Fragile Areas

**GatewayClient Message Handling:**
- Why fragile: Complex event type handling with multiple fallbacks
- Files: `src/sdk/client.ts:82-188`
- Safe modification: Test each event type (lifecycle, message, text, output) after changes
- Test coverage: No unit tests exist

**Animation State Machine:**
- Why fragile: State transitions can be triggered from multiple sources (WebSocket, MCP, user interaction)
- Files: `src/utils/animationState.ts`
- Safe modification: Ensure proper state cleanup before transitions
- Test coverage: No unit tests exist

**MCP Event Communication:**
- Why fragile: Async channel between Rust backend and frontend can drop events
- Files: `src-tauri/src/mcp/server.rs`, `src/composables/useLive2D.ts`
- Safe modification: Add event acknowledgment or retry mechanism

## Scaling Limits

**WebSocket Connection:**
- Current capacity: Single connection to Gateway
- Limit: Cannot handle multiple Gateway instances
- Scaling path: Implement connection pooling if multi-Gateway support needed

**Chat Message Storage:**
- Current capacity: In-memory only, no persistence
- Limit: Lost on app restart
- Scaling path: Implement SQLite or JSON file persistence for chat history

**Configuration Storage:**
- Current capacity: JSON files in exe/config directory
- Limit: Single user, no profile switching
- Scaling path: Add profile support for different character configurations

## Dependencies at Risk

**pixi-live2d-display:**
- Risk: Low maintenance, last release 2022
- Impact: Live2D rendering breaks if Pixi.js version incompatible
- Migration plan: Monitor compatibility, prepare fallback to Cubism.js directly

**Tailwind CSS v4:**
- Risk: Very new major version (v4.2.1), breaking changes likely
- Impact: Styling may break on upgrade
- Migration plan: Pin to current version, test thoroughly before upgrading

**Vue 3.5+:**
- Risk: Recent version with reactivity improvements
- Impact: Generally stable but some edge cases
- Migration plan: Monitor changelog for breaking changes

## Missing Critical Features

**Error Recovery:**
- Feature gap: No automatic recovery from WebSocket disconnects during message send
- Blocks: User messages can be lost without feedback

**Offline Mode:**
- Feature gap: App requires Gateway or LLM to function
- Blocks: No local fallback for basic interactions

**Test Coverage:**
- Feature gap: Zero unit tests for core functionality
- Blocks: Safe refactoring difficult, regressions undetected

## Test Coverage Gaps

**SDK Client:**
- What's not tested: All message parsing, event handling, reconnection logic
- Files: `src/sdk/client.ts`
- Risk: Message format changes from Gateway break functionality silently
- Priority: High

**WebSocket Composable:**
- What's not tested: Reconnection, error handling, message routing
- Files: `src/composables/useWebSocket.ts`
- Risk: Connection issues go undetected
- Priority: High

**Animation State Machine:**
- What's not tested: All state transitions, emotion keyword detection
- Files: `src/utils/animationState.ts`
- Risk: Broken animations not caught until runtime
- Priority: High

**Rust Commands:**
- What's not tested: All Tauri commands
- Files: `src-tauri/src/commands/*.rs`
- Risk: Backend failures not detected
- Priority: Medium

---

*Concerns audit: 2026-03-14*
