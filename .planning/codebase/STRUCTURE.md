# Codebase Structure

**Analysis Date:** 2026-03-14

## Directory Layout

```
nova-link/
├── src/                          # Vue 3 frontend
│   ├── components/               # Vue components
│   ├── composables/             # Vue composables
│   ├── sdk/                     # WebSocket SDK
│   ├── utils/                   # Utilities
│   ├── models/                  # Live2D models
│   ├── assets/                  # Static assets
│   ├── App.vue                  # Main component
│   ├── main.ts                  # Entry point
│   └── styles.css               # Global styles
├── src-tauri/                   # Rust backend
│   ├── src/
│   │   ├── commands/            # Tauri commands
│   │   ├── mcp/                 # MCP server
│   │   ├── lib.rs               # Main setup
│   │   ├── main.rs              # Entry point
│   │   ├── config.rs            # JSON config
│   │   ├── tray.rs              # System tray
│   │   ├── window.rs            # Window management
│   │   └── state.rs             # App state
│   ├── Cargo.toml
│   └── tauri.conf.json
├── package.json
└── vite.config.ts
```

## Directory Purposes

**src/components:**
- Purpose: Vue UI components
- Contains: `ChatPanel.vue`, `Live2DContainer.vue`, `TitleBar.vue`, `ContextMenu.vue`, `Dialog.vue`, `CharacterSettingsModal.vue`, `SettingsModal.vue`
- Key files: `components/index.ts` (barrel export)

**src/composables:**
- Purpose: Vue Composition API hooks for state management
- Contains: `useSettings.ts`, `useLive2D.ts`, `useWebSocket.ts`, `useChat.ts`, `useWindow.ts`, `useGlobalDialog.ts`
- Key files: `composables/index.ts` (barrel export)

**src/sdk:**
- Purpose: WebSocket client for OpenClaw Gateway
- Contains: `client.ts` (GatewayClient class), `types.ts` (TypeScript types), `index.ts` (exports)
- Key files: `src/sdk/client.ts`

**src/utils:**
- Purpose: Animation and interaction utilities
- Contains: `animationState.ts` (AnimationStateMachine), `emotionParser.ts`, `mouseInteraction.ts`, `updater.ts`

**src/models:**
- Purpose: Live2D model files
- Contains: `hiyori_pro_zh/` with .model3.json, .can3, .cmo3, textures, and motions
- Generated: No (bundled with app)

**src-tauri/src/commands:**
- Purpose: Tauri command handlers
- Contains: `settings.rs`, `gateway.rs`, `llm.rs`, `identity.rs`, `user.rs`, `soul.rs`, `window.rs`, `mcp.rs`, `mod.rs`

**src-tauri/src/mcp:**
- Purpose: MCP server implementation
- Contains: `server.rs`, `http_server.rs`, `types.rs`, `mod.rs`

## Key File Locations

**Entry Points:**
- `src/main.ts` - Vue app initialization
- `src/App.vue` - Main Vue component (root)
- `src-tauri/src/main.rs` - Rust entry point
- `src-tauri/src/lib.rs` - Tauri app setup

**Configuration:**
- `src-tauri/tauri.conf.json` - Tauri window and app config
- `package.json` - Node dependencies and scripts
- `vite.config.ts` - Vite build config

**Core Logic:**
- `src/composables/useWebSocket.ts` - WebSocket connection
- `src/composables/useLive2D.ts` - Live2D model management
- `src/sdk/client.ts` - Gateway WebSocket protocol
- `src/utils/animationState.ts` - Animation state machine
- `src-tauri/src/config.rs` - JSON file storage
- `src-tauri/src/commands/settings.rs` - Settings commands

**Testing:**
- Not detected (no test directory found)

## Naming Conventions

**Files:**
- Components: PascalCase (e.g., `ChatPanel.vue`, `CharacterSettingsModal.vue`)
- Composables: camelCase (e.g., `useWebSocket.ts`, `useLive2D.ts`)
- Utilities: camelCase (e.g., `animationState.ts`, `emotionParser.ts`)
- SDK: camelCase (e.g., `client.ts`, `types.ts`)
- Rust modules: snake_case (e.g., `settings.rs`, `mcp_server.rs`)

**Directories:**
- All lowercase with hyphens: `src/components`, `src/composables`, `src-tauri/src/commands`

**TypeScript Types:**
- PascalCase interfaces (e.g., `UseWebSocketOptions`, `EmotionData`)

## Where to Add New Code

**New Feature:**
- Primary code: `src/composables/` (if state management needed) or `src/components/`
- Tests: Not applicable (no test infrastructure)

**New Component:**
- Implementation: `src/components/NewComponent.vue`
- Export: Add to `src/components/index.ts`

**New Composable:**
- Implementation: `src/composables/useNewFeature.ts`
- Export: Add to `src/composables/index.ts`

**New Tauri Command:**
- Implementation: `src-tauri/src/commands/new_command.rs`
- Export: Add to `src-tauri/src/commands/mod.rs` and register in `src-tauri/src/lib.rs`

**New Utility:**
- Implementation: `src/utils/utility.ts`
- Import where needed

**New MCP Tool:**
- Implementation: Add to `src-tauri/src/mcp/server.rs`
- Types: Add to `src-tauri/src/mcp/types.rs`

## Special Directories

**src/models:**
- Purpose: Bundled Live2D model files
- Generated: No (checked into repo)
- Committed: Yes

**exe/config (runtime):**
- Purpose: User settings and window state stored at runtime
- Generated: Yes (created on first run)
- Committed: No (in .gitignore)

**src-tauri/target:**
- Purpose: Rust compilation output
- Generated: Yes (cargo build)
- Committed: No (in .gitignore)

**node_modules:**
- Purpose: Node.js dependencies
- Generated: Yes (npm install)
- Committed: No (in .gitignore)

---

*Structure analysis: 2026-03-14*
