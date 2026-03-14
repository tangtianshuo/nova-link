# External Integrations

**Analysis Date:** 2026-03-14

## APIs & External Services

**OpenClaw Gateway:**
- WebSocket-based chat service
- Location: `src/sdk/client.ts`
- Default URL: ws://127.0.0.1:18789 (configurable)
- Protocol: Custom JSON-RPC over WebSocket
- Features: Chat messaging, history, tool execution, session management
- Authentication: Token-based (optional)
- Auto-reconnect: Enabled with configurable interval (default 3s, max 10 attempts)

**LLM API Integration:**
- Direct API calls to LLM providers
- Location: `src-tauri/src/commands/llm.rs`
- Endpoint: `{api_url}/chat/completions` (OpenAI-compatible)
- Authentication: Bearer token (API key)
- Request format: OpenAI chat completion format
- Response: Parses `choices[0].message.content`

**LLM Configuration (User Settings):**
- Provider selection (openclaw or llm)
- API URL (user-configured endpoint)
- API Key (user-provided)
- Model name (user-specified)
- System prompt (from soul.md content)

## Data Storage

**Configuration Storage:**
- Type: JSON files in `exe/config/` directory
- Location: `src-tauri/src/config.rs`
- Files: identity.json, user.json, soul.json, settings.json, window.json

**Character Files:**
- Identity: `~/.openclaw/workspace/IDENTITY.md`
- User: `~/.openclaw/workspace/USER.md`
- Soul: `~/.openclaw/workspace/SOUL.md`

## File Storage

**Live2D Models:**
- User-specified model path in settings
- Format: .model3.json (Cubism 4.x)

**Assets:**
- Avatars: User-specified paths
- No cloud storage integration

## Authentication & Identity

**OpenClaw Gateway:**
- Implementation: Token-based WebSocket authentication
- Token: Optional, passed via connect params

**LLM APIs:**
- Implementation: Bearer token in Authorization header
- Format: `Bearer {api_key}`

## Monitoring & Observability

**Logging (Rust):**
- Framework: log + env_logger
- Location: `src-tauri/src/lib.rs` and command handlers

**Auto-Update:**
- Service: GitHub Releases
- Endpoint: https://github.com/tangtianshuo/nova-link/releases/latest/download/latest.json
- Pubkey: RSA public key for signature verification
- Install mode: Passive (Windows)

## CI/CD & Deployment

**Hosting:**
- GitHub Releases for distribution
- Windows: MSI installer
- macOS: DMG bundle

**Build Targets:**
- Windows: x86_64-pc-windows-msvc
- macOS: x86_64-apple-darwin, aarch64-apple-darwin
- Linux: x86_64-unknown-linux-gnu

## Environment Configuration

**Settings Storage:**
- Stored in JSON files (exe/config/)
- Window state persistence

**Runtime Configuration:**
- WebSocket URL: User configurable (default ws://127.0.0.1:18789)
- Chat provider: "openclaw" or "llm"
- LLM API credentials: User-provided at runtime

## Webhooks & Callbacks

**Outgoing (MCP Server):**
- Local HTTP server for Model Context Protocol
- Default: http://localhost:18787
- Provides animation control tools
- Tools: play_animation, set_emotion, get_model_info

**Incoming:**
- WebSocket messages from OpenClaw Gateway
- Events: chat, agent (lifecycle, message, text, output), message_start, content_delta, message_stop, tool_use, tool_result, error

---

*Integration audit: 2026-03-14*
