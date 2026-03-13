// MCP Server commands for Nova Link
// Handles MCP protocol communication and tool calls (HTTP and Stdio modes)

use crate::mcp::{McpEvent, McpHttpServer, McpServer};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::sync::Mutex;
use tauri::{AppHandle, Emitter, Manager};

/// Global MCP Server instance
static MCP_SERVER: once_cell::sync::Lazy<Arc<Mutex<Option<McpServer>>>> =
    once_cell::sync::Lazy::new(|| Arc::new(Mutex::new(None)));

/// Global MCP HTTP Server instance
static MCP_HTTP_SERVER: once_cell::sync::Lazy<Arc<Mutex<Option<McpHttpServer>>>> =
    once_cell::sync::Lazy::new(|| Arc::new(Mutex::new(None)));

/// MCP Server configuration
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct McpConfig {
    pub host: Option<String>,
    pub port: Option<u16>,
    pub mode: Option<String>, // "http" or "stdio"
}

/// Initialize and start MCP Server (core only)
#[tauri::command]
pub async fn start_mcp_server(app: AppHandle) -> Result<String, String> {
    start_mcp_server_with_config(app, McpConfig::default()).await
}

/// Initialize and start MCP Server with configuration
#[tauri::command]
pub async fn start_mcp_server_with_config(
    app: AppHandle,
    config: McpConfig,
) -> Result<String, String> {
    let server = McpServer::new();

    // Create channel for sending events to frontend
    let (tx, mut rx) = tokio::sync::mpsc::channel::<McpEvent>(100);

    // Clone app handle for event emission
    let app_handle = app.clone();

    // Spawn task to forward MCP events to frontend
    tokio::spawn(async move {
        while let Some(event) = rx.recv().await {
            match event {
                McpEvent::Animation { name, duration } => {
                    let _ = app_handle.emit(
                        "mcp-animation",
                        serde_json::json!({
                            "animation": name,
                            "duration": duration
                        }),
                    );
                }
                McpEvent::Emotion { emotion } => {
                    let _ = app_handle.emit(
                        "mcp-emotion",
                        serde_json::json!({
                            "emotion": emotion
                        }),
                    );
                }
                McpEvent::StateChange { state } => {
                    let _ = app_handle.emit(
                        "mcp-state",
                        serde_json::json!({
                            "state": state
                        }),
                    );
                }
            }
        }
    });

    // Store server
    let mut server_lock = MCP_SERVER.lock().await;
    *server_lock = Some(server);

    // Start HTTP server if mode is "http" or default
    let mode = config.mode.as_deref().unwrap_or("http");
    if mode == "http" {
        let host = config.host.unwrap_or_else(|| "0.0.0.0".to_string());
        let port = config.port.unwrap_or(18790);

        let mut http_server = McpHttpServer::new();
        http_server.set_app_handle(app);

        // Set the MCP server in HTTP server
        {
            let server_lock = MCP_SERVER.lock().await;
            if let Some(ref server) = *server_lock {
                http_server.set_mcp_server(server.clone()).await;
            }
        }

        // Start HTTP server
        if let Err(e) = http_server.start(host, port).await {
            log::error!("Failed to start MCP HTTP server: {}", e);
        }

        // Store HTTP server
        let mut http_lock = MCP_HTTP_SERVER.lock().await;
        *http_lock = Some(http_server);
    }

    Ok(format!("MCP Server started in {} mode", mode))
}

/// Stop MCP Server
#[tauri::command]
pub async fn stop_mcp_server() -> Result<String, String> {
    // Stop HTTP server
    {
        let mut http_lock = MCP_HTTP_SERVER.lock().await;
        if let Some(http_server) = http_lock.as_ref() {
            http_server.stop().await;
        }
        *http_lock = None;
    }

    // Stop core server
    {
        let mut server_lock = MCP_SERVER.lock().await;
        *server_lock = None;
    }

    Ok("MCP Server stopped".to_string())
}

/// Get MCP Server status
#[tauri::command]
pub async fn get_mcp_status() -> Result<serde_json::Value, String> {
    let server_running = {
        let lock = MCP_SERVER.lock().await;
        lock.is_some()
    };

    let http_running = {
        let lock = MCP_HTTP_SERVER.lock().await;
        lock.is_some()
    };

    Ok(serde_json::json!({
        "core_running": server_running,
        "http_running": http_running,
        "http_url": "http://localhost:18790"
    }))
}

/// Get available MCP tools
#[tauri::command]
pub async fn get_mcp_tools() -> Result<Vec<serde_json::Value>, String> {
    let server_lock = MCP_SERVER.lock().await;

    if let Some(server) = server_lock.as_ref() {
        let tools = server.list_tools();
        Ok(tools.into_iter().map(|t| serde_json::to_value(t).unwrap()).collect())
    } else {
        Err("MCP Server not running".to_string())
    }
}

/// Handle incoming MCP request (JSON-RPC format)
#[tauri::command]
pub async fn handle_mcp_request(request: serde_json::Value) -> Result<serde_json::Value, String> {
    let server_lock = MCP_SERVER.lock().await;

    if let Some(server) = server_lock.as_ref() {
        if let Some(response) = server.handle_request(request).await {
            Ok(response)
        } else {
            Err("Failed to handle MCP request".to_string())
        }
    } else {
        Err("MCP Server not running".to_string())
    }
}

/// Check if MCP Server is running
#[tauri::command]
pub async fn is_mcp_server_running() -> bool {
    let server_lock = MCP_SERVER.lock().await;
    server_lock.is_some()
}

/// Get MCP configuration for OpenClaw
#[tauri::command]
pub async fn get_mcp_config() -> Result<serde_json::Value, String> {
    // Get local IP address
    let host = get_local_ip().unwrap_or_else(|| "localhost".to_string());

    Ok(serde_json::json!({
        "http": {
            "url": format!("http://{}:18790/mcp", host),
            "host": host,
            "port": 18790
        },
        "description": "HTTP 模式：直接连接到 Nova Link 的 HTTP API"
    }))
}

/// Get local IP address
fn get_local_ip() -> Option<String> {
    use std::net::ToSocketAddrs;

    // Try to connect to a public DNS server to determine local IP
    if let Ok(socket) = std::net::UdpSocket::bind("0.0.0.0:0") {
        if socket.connect("8.8.8.8:80").is_ok() {
            if let Ok(addr) = socket.local_addr() {
                return Some(addr.ip().to_string());
            }
        }
    }
    None
}
