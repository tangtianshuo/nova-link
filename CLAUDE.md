# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Nova Link is a Tauri v2 desktop overlay application featuring a floating glassmorphism UI with Live2D character display. It acts as a WebSocket server that external clients can connect to, with optional LLM integration for chat functionality.

## Technology Stack

- **Frontend**: Vanilla TypeScript + Vite 6
- **Desktop**: Tauri v2 (Rust)
- **Live2D**: pixi.js + pixi-live2d-display (Cubism 4.x)
- **Storage**: SQLite (rusqlite) for settings persistence
- **WebSocket**: tokio-tungstenite for async WebSocket server

## Common Commands

```bash
# Development
npm run dev              # Start Vite dev server (port 18080)
npm run tauri dev        # Run full Tauri app in dev mode

# Build
npm run build            # TypeScript compile + Vite build
npm run tauri build      # Build production Tauri app

# Rust backend
cargo build              # Build Rust dependencies
cargo build --release   # Optimized release build
```

## Architecture

```
┌─────────────────────────┐
│   External Clients     │  (connect via ws://localhost:8765)
└──────────┬────────────┘
           │ WebSocket
           ▼
┌─────────────────────────┐
│   Nova Link (Rust)     │  WebSocket server on port 8765
│   + WebView (TS)       │  - LLM integration (MiniMax/OpenAI)
│   + Live2D Display     │  - SQLite settings storage
└─────────────────────────┘
```

### Key Files

| File | Purpose |
|------|---------|
| `src/main.ts` | Frontend entry - UI, Live2D rendering, WebSocket client, Tauri event listeners |
| `src-tauri/src/lib.rs` | Rust backend - WebSocket server, LLM API calls, SQLite, system tray |
| `src-tauri/tauri.conf.json` | Window config (frameless, transparent, always-on-top, 400x500px) |
| `src/models/` | Live2D model files (hiyori_pro_zh) |

### Communication Flow

1. **External Client → Rust**: WebSocket message to `ws://localhost:8765`
2. **Rust processes message**: If LLM configured, calls API; otherwise echoes message
3. **Rust → External Client**: WebSocket response broadcast to all connected clients
4. **Rust → Frontend**: Tauri events (`ws-status`, `nova-link-message`)

### Frontend ↔ Rust Commands

- `invoke("send_to_nanobot", { message })` - Send message to WebSocket clients
- `invoke("chat_with_llm", { ... })` - Direct LLM API call
- `invoke("update_llm_config", { ... })` - Update LLM settings
- `invoke("save_setting", { key, value })` - Save to SQLite
- `invoke("get_setting", { key })` - Load from SQLite
- `invoke("save_window_position", { ... })` / `get_window_position` - Window state persistence

## Window Behavior

- **Close button**: Hides to system tray instead of exiting
- **System tray**: Left-click shows window, right-click shows menu (显示/退出)
- **Draggable**: Drag the title bar region to move window
- **Always on top**: Enabled by default, configurable via settings

## Settings (Right-click Context Menu)

- Model path (Live2D model .model3.json)
- Window dimensions
- WebSocket URL (for external client connection)
- LLM provider (none/MiniMax/OpenAI compatible)
- API Key, URL, and model name
