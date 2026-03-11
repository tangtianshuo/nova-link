use log::info;
use reqwest::Client;
use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager, State, WindowEvent,
};

mod command_runner;
use command_runner::CommandRunner;

/// 手动运行 OpenClaw Gateway
#[tauri::command]
fn run_gateway() -> Result<String, String> {
    match CommandRunner::run_openclaw_gateway() {
        Ok(()) => Ok("Gateway 启动命令已发送".to_string()),
        Err(e) => Err(format!("启动失败: {}", e)),
    }
}

fn get_db_path() -> PathBuf {
    let data_dir = dirs::data_local_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("nova-link");
    std::fs::create_dir_all(&data_dir).ok();
    data_dir.join("config.db")
}

fn init_db() -> Result<Connection, rusqlite::Error> {
    let conn = Connection::open(get_db_path())?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        )",
        [],
    )?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS window_position (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            x INTEGER NOT NULL,
            y INTEGER NOT NULL,
            width INTEGER NOT NULL,
            height INTEGER NOT NULL
        )",
        [],
    )?;

    Ok(conn)
}

#[derive(Debug, Serialize, Deserialize)]
struct WindowPosition {
    x: i32,
    y: i32,
    width: u32,
    height: u32,
}

#[tauri::command]
fn save_window_position(x: i32, y: i32, width: u32, height: u32) -> Result<(), String> {
    let conn = init_db().map_err(|e| e.to_string())?;

    conn.execute(
        "INSERT OR REPLACE INTO window_position (id, x, y, width, height) VALUES (1, ?1, ?2, ?3, ?4)",
        rusqlite::params![x, y, width as i32, height as i32],
    ).map_err(|e| e.to_string())?;

    info!(
        "Window position saved: x={}, y={}, width={}, height={}",
        x, y, width, height
    );
    Ok(())
}

#[tauri::command]
fn get_window_position() -> Result<Option<WindowPosition>, String> {
    let conn = init_db().map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare("SELECT x, y, width, height FROM window_position WHERE id = 1")
        .map_err(|e| e.to_string())?;

    let result = stmt.query_row([], |row| {
        Ok(WindowPosition {
            x: row.get(0)?,
            y: row.get(1)?,
            width: row.get::<_, i32>(2)? as u32,
            height: row.get::<_, i32>(3)? as u32,
        })
    });
    println!("{:?}", result);
    match result {
        Ok(pos) => {
            info!(
                "Loaded window position: x={}, y={}, width={}, height={}",
                pos.x, pos.y, pos.width, pos.height
            );
            Ok(Some(pos))
        }
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
fn save_setting(key: String, value: String) -> Result<(), String> {
    let conn = init_db().map_err(|e| e.to_string())?;

    conn.execute(
        "INSERT OR REPLACE INTO settings (key, value) VALUES (?1, ?2)",
        rusqlite::params![key, value],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
fn get_setting(key: String) -> Result<Option<String>, String> {
    let conn = init_db().map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare("SELECT value FROM settings WHERE key = ?1")
        .map_err(|e| e.to_string())?;

    let result = stmt.query_row([&key], |row| row.get(0));

    match result {
        Ok(value) => Ok(Some(value)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct LlmMessage {
    role: String,
    content: String,
}

#[derive(Clone)]
struct LlmConfig {
    provider: String,
    api_key: String,
    api_url: String,
    model: String,
}

impl Default for LlmConfig {
    fn default() -> Self {
        Self {
            provider: "none".to_string(),
            api_key: String::new(),
            api_url: String::new(),
            model: String::new(),
        }
    }
}

struct AppState {
    llm_config: Mutex<LlmConfig>,
    http_client: Client,
}

#[tauri::command]
fn update_llm_config(
    state: State<AppState>,
    provider: String,
    api_key: String,
    api_url: String,
    model: String,
) {
    let mut config = state.llm_config.lock().unwrap();
    config.provider = provider;
    config.api_key = api_key;
    config.api_url = api_url;
    config.model = model;
    info!("LLM config updated");
}

#[tauri::command]
async fn chat_with_llm(
    state: State<'_, AppState>,
    provider: String,
    api_key: String,
    api_url: String,
    model: String,
    message: String,
) -> Result<String, String> {
    if provider == "none" || api_key.is_empty() || api_url.is_empty() {
        return Err("LLM not configured".to_string());
    }

    let url = format!("{}/chat/completions", api_url.trim_end_matches('/'));

    let messages = vec![LlmMessage {
        role: "user".to_string(),
        content: message,
    }];

    let request_body = serde_json::json!({
        "model": model,
        "messages": messages,
        "temperature": 0.7,
        "max_tokens": 2048
    });

    let response = state
        .http_client
        .post(&url)
        .header("Authorization", format!("Bearer {}", api_key))
        .header("Content-Type", "application/json")
        .json(&request_body)
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_default();
        return Err(format!("API error ({}): {}", status, error_text));
    }

    let response_json: serde_json::Value = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse response: {}", e))?;

    let content = response_json["choices"]
        .as_array()
        .and_then(|arr| arr.first())
        .and_then(|c| c.get("message"))
        .and_then(|m| m.get("content"))
        .and_then(|c| c.as_str())
        .unwrap_or("")
        .to_string();

    if content.is_empty() {
        return Err("Empty response from LLM".to_string());
    }

    Ok(content)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    env_logger::init();

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(AppState {
            llm_config: Mutex::new(LlmConfig::default()),
            http_client: Client::new(),
        })
        .invoke_handler(tauri::generate_handler![
            chat_with_llm,
            update_llm_config,
            save_window_position,
            get_window_position,
            save_setting,
            get_setting,
            run_gateway,
        ])
        .setup(|app| {
            println!("[DEBUG] Nova Link setup starting...");

            // 平台特定的透明窗口处理
            #[cfg(target_os = "macos")]
            {
                use tauri::Manager;
                if let Some(window) = app.get_webview_window("main") {
                    // macOS 上启用透明需要设置 NSWindow 的相关属性
                    // 通过 JavaScript 注入来确保透明生效
                    if let Err(e) = window.eval("document.body.style.background = 'transparent'; document.documentElement.style.background = 'transparent';") {
                        println!("[WARN] Failed to set transparent style: {}", e);
                    }
                    println!("[DEBUG] macOS transparent window setup complete");
                }
            }

            // Windows 透明窗口处理
            #[cfg(target_os = "windows")]
            {
                use tauri::Manager;
                if let Some(window) = app.get_webview_window("main") {
                    if let Err(e) = window.eval("document.body.style.background = 'transparent'; document.documentElement.style.background = 'transparent';") {
                        println!("[WARN] Failed to set transparent style: {}", e);
                    }
                    println!("[DEBUG] Windows transparent window setup complete");
                }
            }

            // 简单的窗口位置恢复
            if let Ok(Some(pos)) = get_window_position() {
                if let Some(window) = app.get_webview_window("main") {
                    // 先设置位置
                    let _ = window.set_position(tauri::Position::Physical(
                        tauri::PhysicalPosition::new(pos.x, pos.y),
                    ));
                    // 再设置大小
                    let _ = window.set_size(tauri::Size::Physical(tauri::PhysicalSize::new(
                        pos.width, pos.height,
                    )));
                    println!("[DEBUG] Window position restored: {:?}", pos);
                }
            }

            // 创建系统托盘
            let show_item = MenuItem::with_id(app, "show", "显示", true, None::<&str>).unwrap();
            let quit_item = MenuItem::with_id(app, "quit", "退出", true, None::<&str>).unwrap();
            let menu = Menu::with_items(app, &[&show_item, &quit_item]).unwrap();

            let _tray = TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "show" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    "quit" => {
                        if let Some(window) = app.get_webview_window("main") {
                            if let Ok(pos) = window.outer_position() {
                                if let Ok(size) = window.outer_size() {
                                    let _ =
                                        save_window_position(pos.x, pos.y, size.width, size.height);
                                }
                            }
                        }
                        app.exit(0);
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                })
                .build(app)?;

            Ok(())
        })
        .on_window_event(|window, event| {
            println!("[DEBUG] Window event: {:?}", event);
            if let WindowEvent::CloseRequested { api, .. } = event {
                println!("[DEBUG] Close requested, hiding window");
                api.prevent_close();
                let _ = window.hide();
            }
            if let WindowEvent::Resized(size) = event {
                println!("[DEBUG] Window resized: {:?}", size);
                // 如果大小异常（标题栏大小），尝试恢复
                if size.width < 100 || size.height < 100 {
                    println!("[DEBUG] Window size too small, ignoring");
                    return;
                }
            }
            if let WindowEvent::Moved(pos) = event {
                println!("[DEBUG] Window moved: {:?}", pos);
                // 如果移动到隐藏位置，恢复
                if pos.x < -10000 || pos.y < -10000 {
                    println!("[DEBUG] Window moved to hidden position, ignoring");
                    return;
                }
            }
            if let WindowEvent::Focused(focused) = event {
                println!("[DEBUG] Window focused: {}", focused);
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
