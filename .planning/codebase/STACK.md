# Technology Stack

**Analysis Date:** 2026-03-14

## Languages

**Primary:**
- TypeScript 5.6.2 - Frontend development
- Rust (2021 edition) - Tauri desktop backend
- Vue 3.5.30 - UI framework

## Runtime

**Environment:**
- Node.js 18+ (development)
- Tauri v2 (desktop runtime)

**Package Manager:**
- npm (Node.js)
- Cargo (Rust)
- Lockfiles: `package-lock.json` (present), `Cargo.lock` (present)

## Frameworks

**Core:**
- Vue 3.5.30 - Frontend framework with Composition API
- Tauri v2 - Desktop application framework with Rust backend

**Build/Dev:**
- Vite 6.0.3 - Frontend build tool
- TypeScript 5.6.2 - Type checking and compilation

**Live2D Rendering:**
- pixi.js 6.3.2 - 2D WebGL renderer
- pixi-live2d-display 0.4.0 - Live2D model rendering for PIXI.js

**Styling:**
- Tailwind CSS 4.2.1 - Utility-first CSS framework
- PostCSS 8.5.8 - CSS processing
- Autoprefixer 10.4.27 - CSS vendor prefixing

**Tauri Plugins:**
- tauri-plugin-opener 2 - System file/URL opening
- tauri-plugin-process 2 - Process management
- tauri-plugin-updater 2 - Auto-update functionality

## Key Dependencies

**Frontend:**
- vue 3.5.30 - UI framework
- @tauri-apps/api 2 - Tauri frontend API bindings
- @tauri-apps/plugin-updater 2 - Update checker
- @tauri-apps/plugin-process 2 - Process control
- @tauri-apps/plugin-opener 2 - Open external resources
- marked 17.0.4 - Markdown parsing

**Backend (Rust):**
- tauri 2 - Desktop framework
- tokio 1 - Async runtime
- reqwest 0.12 - HTTP client for LLM API calls
- serde 1 / serde_json 1 - Serialization
- log / env_logger - Logging
- dirs 5 - Directory access
- tera 1 - Template rendering
- hyper 1 / hyper-util 0.1 - HTTP server for MCP
- tower 0.4 - HTTP utility middleware
- http 1 - HTTP types
- async-trait 0.1 - Async trait support

## Configuration

**TypeScript:**
- Target: ES2020
- Module: ESNext with bundler resolution
- Strict mode enabled
- Config: `tsconfig.json`

**Vite:**
- Port: 18080 (dev), HMR: 18081
- Rollup chunks: pixi-core and pixi-live2d for optimization
- Config: `vite.config.ts`

**Tauri:**
- Window: 400x800, frameless, transparent, always-on-top
- CSP: null (disabled)
- macOS private API enabled
- Config: `tauri.conf.json`

**Tailwind CSS:**
- Content paths: index.html, src/**/*.{vue,js,ts,jsx,tsx}
- Config: `tailwind.config.js`

**PostCSS:**
- Plugins: @tailwindcss/postcss, autoprefixer
- Config: `postcss.config.js`

## Platform Requirements

**Development:**
- Node.js 18+
- Rust toolchain (stable)
- npm for dependency management

**Production:**
- Windows/macOS desktop
- Executable output via Tauri build
- Supports MSI (Windows) and DMG (macOS) bundles

---

*Stack analysis: 2026-03-14*
