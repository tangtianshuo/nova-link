# Nova Link

<p align="center">
  <img src="https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-blue" alt="Platform">
  <img src="https://img.shields.io/github/v/release/nova-link/nova-link" alt="Release">
  <img src="https://img.shields.io/github/license/nova-link/nova-link" alt="License">
</p>

<p align="center">
  ✨ A beautiful desktop companion with Live2D character and AI chat ✨
</p>

<p align="center">
  <!-- Add screenshot here: docs/screenshot.png -->
  <img src="https://via.placeholder.com/400x500?text=Nova+Link+Screenshot" alt="Nova Link Screenshot" width="400">
</p>

## Features

- 🎨 **Live2D Character Display** - Beautiful animated characters rendered with WebGL
- 🤖 **AI Chat Integration** - Connect to LLM APIs (OpenAI, MiniMax, or any OpenAI-compatible endpoint)
- 🌐 **WebSocket Server** - Built-in WebSocket server for external integrations
- 🔲 **Frameless Overlay** - Transparent, always-on-top floating window
- 💬 **Context Menu Settings** - Right-click to configure model, window, and LLM
- 📦 **System Tray** - Runs quietly in background

## Quick Start

### Pre-built Releases

Download the latest release for your platform:

- **Windows**: `Nova Link_x.x.x_x64-setup.exe`
- **macOS**: `Nova Link_x.x.x_x64.dmg` / `Nova Link_x.x.x_aarch64.dmg`
- **Linux**: `Nova Link_x.x.x_amd64.AppImage`

[See all releases →](https://github.com/nova-link/nova-link/releases)

### Build from Source

#### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [Rust](https://rustup.rs/) 1.70+
- [npm](https://npmjs.com/)

#### Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run tauri dev
```

#### Production Build

```bash
# Build for current platform
npm run tauri build

# Build for all platforms (requires cross-compilation toolchains)
npm run tauri build -- --target x86_64-pc-windows-msvc
npm run tauri build -- --target x86_64-apple-darwin
npm run tauri build -- --target aarch64-apple-darwin
npm run tauri build -- --target x86_64-unknown-linux-gnu
```

## Configuration

Right-click anywhere on the window to access the context menu:

| Setting | Description |
|---------|-------------|
| Model Path | Path to Live2D model (.model3.json) |
| Window | Width and height dimensions |
| WebSocket URL | Server endpoint for external clients |
| LLM Provider | Choose: None / MiniMax / OpenAI Compatible |
| API Key | Your LLM API key |
| API URL | LLM API endpoint |
| Model | Model name to use |

### WebSocket API

Nova Link runs a WebSocket server on `ws://localhost:18789` (configurable). External clients can connect and send messages:

```json
{
  "type": "message",
  "content": "Hello!",
  "sender_id": "client_1",
  "chat_id": "default"
}
```

## Architecture

```
┌─────────────────────────┐
│   Nova Link App        │
├─────────────────────────┤
│  Tauri (Rust)          │
│  ├─ WebSocket Server   │
│  ├─ LLM Integration    │
│  ├─ SQLite Storage     │
│  └─ System Tray        │
├─────────────────────────┤
│  WebView (TypeScript)  │
│  ├─ PIXI.js            │
│  ├─ Live2D Display     │
│  └─ Chat UI            │
└─────────────────────────┘
```

## Tech Stack

- **Frontend**: TypeScript, Vite, PIXI.js, pixi-live2d-display
- **Backend**: Rust, Tauri v2, tokio-tungstenite, rusqlite
- **Build**: GitHub Actions, tauri-action

## License

MIT License - see [LICENSE](LICENSE) for details.

---

<p align="center">
  Made with ❤️ by Nova Link Team
</p>
