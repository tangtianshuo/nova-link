// MCP HTTP Server implementation
// Provides HTTP endpoints for MCP protocol communication

use crate::mcp::{McpEvent, McpServer};
use http_body_util::{BodyExt, Full};
use hyper::body::Bytes;
use hyper::server::conn::http1;
use hyper::service::service_fn;
use hyper::{Method, Request, Response};
use hyper_util::rt::TokioIo;
use log::{error, info};
use std::convert::Infallible;
use std::net::SocketAddr;
use std::sync::Arc;
use tokio::net::TcpListener;
use tokio::sync::Mutex;

/// MCP HTTP Server state
pub struct McpHttpServer {
    mcp_server: Arc<Mutex<Option<McpServer>>>,
    app_handle: Option<tauri::AppHandle>,
    shutdown_signal: Arc<Mutex<bool>>,
}

impl McpHttpServer {
    pub fn new() -> Self {
        Self {
            mcp_server: Arc::new(Mutex::new(None)),
            app_handle: None,
            shutdown_signal: Arc::new(Mutex::new(false)),
        }
    }

    /// Set the MCP server instance
    pub async fn set_mcp_server(&self, server: McpServer) {
        let mut lock = self.mcp_server.lock().await;
        *lock = Some(server);
    }

    /// Set the Tauri app handle for event emission
    pub fn set_app_handle(&mut self, handle: tauri::AppHandle) {
        self.app_handle = Some(handle);
    }

    /// Start the HTTP server
    pub async fn start(&self, host: String, port: u16) -> Result<(), String> {
        let addr: SocketAddr = format!("{}:{}", host, port)
            .parse()
            .map_err(|e| format!("Invalid address: {}", e))?;

        let listener = TcpListener::bind(addr)
            .await
            .map_err(|e| format!("Failed to bind to {}: {}", addr, e))?;

        info!("MCP HTTP Server listening on http://{}", addr);

        // Set up graceful shutdown
        let shutdown_signal = self.shutdown_signal.clone();
        let mcp_server = self.mcp_server.clone();
        let app_handle = self.app_handle.clone();

        tokio::spawn(async move {
            loop {
                // Check for shutdown signal
                if *shutdown_signal.lock().await {
                    info!("MCP HTTP Server shutting down");
                    break;
                }

                tokio::select! {
                    result = listener.accept() => {
                        match result {
                            Ok((stream, _)) => {
                                let io = TokioIo::new(stream);
                                let mcp_server = mcp_server.clone();
                                let app_handle = app_handle.clone();

                                tokio::spawn(async move {
                                    let service = service_fn(move |req| {
                                        handle_request(req, mcp_server.clone(), app_handle.clone())
                                    });

                                    if let Err(err) = http1::Builder::new()
                                        .serve_connection(io, service)
                                        .await
                                    {
                                        error!("Error serving connection: {}", err);
                                    }
                                });
                            }
                            Err(e) => {
                                error!("Accept error: {}", e);
                            }
                        }
                    }
                    _ = tokio::time::sleep(tokio::time::Duration::from_millis(100)) => {
                        // Check periodically for shutdown
                    }
                }
            }
        });

        Ok(())
    }

    /// Stop the HTTP server
    pub async fn stop(&self) {
        let mut signal = self.shutdown_signal.lock().await;
        *signal = true;
        info!("MCP HTTP Server stop signal sent");
    }
}

impl Default for McpHttpServer {
    fn default() -> Self {
        Self::new()
    }
}

/// Handle incoming HTTP requests
async fn handle_request(
    req: Request<hyper::body::Incoming>,
    mcp_server: Arc<Mutex<Option<McpServer>>>,
    _app_handle: Option<tauri::AppHandle>,
) -> Result<Response<Full<Bytes>>, Infallible> {
    let method = req.method();
    let path = req.uri().path();

    // Handle /api/animation endpoint (simplified REST API)
    if path.starts_with("/api/animation") {
        return handle_animation_api(req, mcp_server).await;
    }

    // Only accept POST requests to /mcp endpoint
    if method != Method::POST || path != "/mcp" {
        return Ok(Response::builder()
            .status(404)
            .body(Full::new(Bytes::from("Not Found")))
            .unwrap());
    }

    // Read the request body
    let body = req.into_body().collect().await.unwrap().to_bytes();
    let request: serde_json::Value = match serde_json::from_slice(&body) {
        Ok(v) => v,
        Err(e) => {
            return Ok(Response::builder()
                .status(400)
                .body(Full::new(Bytes::from(format!(
                    "Invalid JSON: {}",
                    e
                ))))
                .unwrap());
        }
    };

    // Get MCP server and handle request
    let server_lock = mcp_server.lock().await;
    if let Some(server) = server_lock.as_ref() {
        if let Some(response) = server.handle_request(request).await {
            let response_json = serde_json::to_string(&response).unwrap();
            return Ok(Response::builder()
                .status(200)
                .header("Content-Type", "application/json")
                .body(Full::new(Bytes::from(response_json)))
                .unwrap());
        }
    }

    Ok(Response::builder()
        .status(500)
        .body(Full::new(Bytes::from("MCP Server not initialized")))
        .unwrap())
}

/// Handle /api/animation endpoint (simplified REST API for OpenClaw Skill)
async fn handle_animation_api(
    req: Request<hyper::body::Incoming>,
    mcp_server: Arc<Mutex<Option<McpServer>>>,
) -> Result<Response<Full<Bytes>>, Infallible> {
    // Parse query parameters
    let query = req.uri().query().unwrap_or("");

    // Parse emotion and duration from query string
    let mut emotion = "idle".to_string();
    let mut duration = 2000u64;

    for pair in query.split('&') {
        let kv: Vec<&str> = pair.split('=').collect();
        if kv.len() == 2 {
            match kv[0] {
                "emotion" => emotion = kv[1].to_string(),
                "duration" => {
                    duration = kv[1].parse().unwrap_or(2000);
                }
                "animation" => emotion = kv[1].to_string(), // alias for emotion
                _ => {}
            }
        }
    }

    // Build MCP request
    let mcp_request = serde_json::json!({
        "jsonrpc": "2.0",
        "id": 1,
        "method": "tools/call",
        "params": {
            "name": "play_animation",
            "arguments": {
                "animation": emotion,
                "duration": duration
            }
        }
    });

    // Get MCP server and handle request
    let server_lock = mcp_server.lock().await;
    if let Some(server) = server_lock.as_ref() {
        if let Some(response) = server.handle_request(mcp_request).await {
            let response_json = serde_json::to_string(&response).unwrap();
            return Ok(Response::builder()
                .status(200)
                .header("Content-Type", "application/json")
                .body(Full::new(Bytes::from(response_json)))
                .unwrap());
        }
    }

    Ok(Response::builder()
        .status(500)
        .body(Full::new(Bytes::from(r#"{"error": "MCP Server not initialized"}"#)))
        .unwrap())
}

/// Get server info endpoint
async fn handle_info_request() -> Result<Response<Full<Bytes>>, Infallible> {
    let info = serde_json::json!({
        "name": "nova-link",
        "version": env!("CARGO_PKG_VERSION"),
        "protocol_version": "2024-11-05"
    });

    Ok(Response::builder()
        .status(200)
        .header("Content-Type", "application/json")
        .body(Full::new(Bytes::from(info.to_string())))
        .unwrap())
}
