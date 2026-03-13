// MCP Server implementation for Nova Link
// Provides tools for Live2D animation control

use crate::mcp::types::*;

use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::Mutex;
use log::{info, error};

/// MCP Server state
#[derive(Clone)]
pub struct McpServer {
    tools: HashMap<String, Tool>,
    event_sender: Arc<Mutex<Option<tokio::sync::mpsc::Sender<McpEvent>>>>,
}

/// MCP Events that can be sent to the frontend
#[derive(Debug, Clone)]
pub enum McpEvent {
    Animation { name: String, duration: u64 },
    Emotion { emotion: String },
    StateChange { state: String },
}

impl McpServer {
    pub fn new() -> Self {
        let mut server = Self {
            tools: HashMap::new(),
            event_sender: Arc::new(Mutex::new(None)),
        };
        server.register_animation_tools();
        server
    }

    /// Register animation control tools
    fn register_animation_tools(&mut self) {
        // Play animation tool
        self.tools.insert(
            "play_animation".to_string(),
            Tool {
                name: "play_animation".to_string(),
                description: "Play a Live2D model animation".to_string(),
                input_schema: serde_json::json!({
                    "type": "object",
                    "properties": {
                        "animation": {
                            "type": "string",
                            "enum": ["idle", "happy", "sad", "surprised", "angry", "greeting", "talking", "listening", "thinking", "sleeping"],
                            "description": "Animation state to play"
                        },
                        "duration": {
                            "type": "number",
                            "description": "Duration in milliseconds (optional)"
                        }
                    },
                    "required": ["animation"]
                }),
            },
        );

        // Set emotion tool
        self.tools.insert(
            "set_emotion".to_string(),
            Tool {
                name: "set_emotion".to_string(),
                description: "Set the Live2D model's emotion state".to_string(),
                input_schema: serde_json::json!({
                    "type": "object",
                    "properties": {
                        "emotion": {
                            "type": "string",
                            "enum": ["happy", "sad", "surprised", "angry", "neutral"],
                            "description": "Emotion to display"
                        },
                        "duration": {
                            "type": "number",
                            "description": "Duration in milliseconds (optional)"
                        }
                    },
                    "required": ["emotion"]
                }),
            },
        );

        // Get model info tool
        self.tools.insert(
            "get_model_info".to_string(),
            Tool {
                name: "get_model_info".to_string(),
                description: "Get information about the current Live2D model".to_string(),
                input_schema: serde_json::json!({
                    "type": "object",
                    "properties": {}
                }),
            },
        );

        info!("Registered {} MCP tools", self.tools.len());
    }

    /// Set event sender for communicating with frontend
    pub async fn set_event_sender(&self, sender: tokio::sync::mpsc::Sender<McpEvent>) {
        let mut sender_lock = self.event_sender.lock().await;
        *sender_lock = Some(sender);
    }

    /// List all available tools
    pub fn list_tools(&self) -> Vec<Tool> {
        self.tools.values().cloned().collect()
    }

    /// Handle tool call
    pub async fn call_tool(&self, name: &str, arguments: serde_json::Value) -> CallToolResult {
        info!("MCP tool call: {} with args: {:?}", name, arguments);

        let result = match name {
            "play_animation" => {
                let animation = arguments.get("animation")
                    .and_then(|v| v.as_str())
                    .unwrap_or("idle");
                let duration = arguments.get("duration")
                    .and_then(|v| v.as_u64())
                    .unwrap_or(2000);

                // Send event to frontend
                if let Some(sender) = self.event_sender.lock().await.as_ref() {
                    let _ = sender.send(McpEvent::Animation {
                        name: animation.to_string(),
                        duration,
                    }).await;
                }

                CallToolResult {
                    content: vec![ToolContent {
                        content_type: "text".to_string(),
                        text: format!("Playing animation: {} for {}ms", animation, duration),
                    }],
                    is_error: Some(false),
                }
            }
            "set_emotion" => {
                let emotion = arguments.get("emotion")
                    .and_then(|v| v.as_str())
                    .unwrap_or("neutral");
                let duration = arguments.get("duration")
                    .and_then(|v| v.as_u64())
                    .unwrap_or(3000);

                // Send event to frontend
                if let Some(sender) = self.event_sender.lock().await.as_ref() {
                    let _ = sender.send(McpEvent::Emotion {
                        emotion: emotion.to_string(),
                    }).await;
                }

                CallToolResult {
                    content: vec![ToolContent {
                        content_type: "text".to_string(),
                        text: format!("Setting emotion: {} for {}ms", emotion, duration),
                    }],
                    is_error: Some(false),
                }
            }
            "get_model_info" => {
                CallToolResult {
                    content: vec![ToolContent {
                        content_type: "text".to_string(),
                        text: r#"{"model_name": "Live2D Model", "version": "1.0", "animations": ["idle", "happy", "sad", "surprised", "angry", "greeting", "talking", "listening", "thinking", "sleeping"]}"#.to_string(),
                    }],
                    is_error: Some(false),
                }
            }
            _ => {
                CallToolResult {
                    content: vec![ToolContent {
                        content_type: "text".to_string(),
                        text: format!("Unknown tool: {}", name),
                    }],
                    is_error: Some(true),
                }
            }
        };

        result
    }

    /// Handle MCP JSON-RPC request
    pub async fn handle_request(&self, request: serde_json::Value) -> Option<serde_json::Value> {
        let id = request.get("id")?.as_u64()?;
        let method = request.get("method")?.as_str()?;
        let params = request.get("params");

        info!("Handling MCP request: {} (id: {})", method, id);

        match method {
            "initialize" => {
                let _params: InitializeParams = serde_json::from_value(
                    params.cloned().unwrap_or(serde_json::Value::Null)
                ).unwrap_or_default();

                let result = InitializeResult {
                    protocol_version: "2024-11-05".to_string(),
                    capabilities: ServerCapabilities {
                        tools: Some(ToolsServerCapability {
                            list_changed: Some(true),
                        }),
                        resources: None,
                        prompts: None,
                    },
                    server_info: ServerInfo {
                        name: "nova-link".to_string(),
                        version: env!("CARGO_PKG_VERSION").to_string(),
                    },
                };

                Some(serde_json::json!({
                    "jsonrpc": "2.0",
                    "id": id,
                    "result": result
                }))
            }
            "tools/list" => {
                let tools = self.list_tools();
                let result = ListToolsResult {
                    tools,
                    next_cursor: None,
                };

                Some(serde_json::json!({
                    "jsonrpc": "2.0",
                    "id": id,
                    "result": result
                }))
            }
            "tools/call" => {
                let params: CallToolParams = serde_json::from_value(
                    params.cloned().unwrap_or(serde_json::Value::Null)
                ).unwrap_or(CallToolParams {
                    name: String::new(),
                    arguments: serde_json::Value::Null,
                });

                let result = self.call_tool(&params.name, params.arguments).await;

                Some(serde_json::json!({
                    "jsonrpc": "2.0",
                    "id": id,
                    "result": result
                }))
            }
            _ => {
                error!("Unknown MCP method: {}", method);
                Some(serde_json::json!({
                    "jsonrpc": "2.0",
                    "id": id,
                    "error": {
                        "code": -32601,
                        "message": format!("Method not found: {}", method)
                    }
                }))
            }
        }
    }
}

impl Default for McpServer {
    fn default() -> Self {
        Self::new()
    }
}
