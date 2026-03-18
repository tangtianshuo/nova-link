use active_win_pos_rs::get_active_window;
use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};
use std::time::Duration;
use tauri::{AppHandle, Emitter, State};
use tokio::task::JoinHandle;
use screenshots::Screen;
use enigo::{Enigo, Key, Settings, Direction, Keyboard};
use std::io::Cursor;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum AppType {
    Coding,
    Browsing,
    Media,
    Communication,
    Gaming,
    System,
    Unknown,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ActiveWindowInfo {
    pub title: String,
    pub process_name: String,
    pub app_type: AppType,
}

// State to manage the monitoring task
pub struct WindowMonitorState {
    pub monitoring_task: Arc<Mutex<Option<JoinHandle<()>>>>,
}

impl Default for WindowMonitorState {
    fn default() -> Self {
        Self {
            monitoring_task: Arc::new(Mutex::new(None)),
        }
    }
}

fn get_app_type(process_name: &str) -> AppType {
    let name = process_name.to_lowercase();
    
    // Coding / Development
    if name.contains("code") 
        || name.contains("idea") 
        || name.contains("studio") 
        || name.contains("nvim") 
        || name.contains("terminal") 
        || name.contains("powershell") 
        || name.contains("cmd")
        || name.contains("sublime")
        || name.contains("atom")
        || name.contains("cursor")
        || name.contains("trae")
        || name.contains("warp")
        || name.contains("iterm")
        || name.contains("webstorm")
        || name.contains("pycharm")
        || name.contains("goland")
        || name.contains("clion")
        || name.contains("rider")
    {
        AppType::Coding
    } 
    // Browsing
    else if name.contains("chrome") 
        || name.contains("firefox") 
        || name.contains("edge") 
        || name.contains("safari") 
        || name.contains("brave")
        || name.contains("opera")
        || name.contains("vivaldi")
        || name.contains("arc")
        || name.contains("chromium")
    {
        AppType::Browsing
    } 
    // Media
    else if name.contains("vlc") 
        || name.contains("spotify") 
        || name.contains("music") 
        || name.contains("player")
        || name.contains("iina")
        || name.contains("mpv")
        || name.contains("quicktime")
        || name.contains("obs")
    {
        AppType::Media
    } 
    // Communication
    else if name.contains("wechat") 
        || name.contains("qq") 
        || name.contains("discord") 
        || name.contains("slack") 
        || name.contains("telegram") 
        || name.contains("feishu") 
        || name.contains("dingtalk")
        || name.contains("skype")
        || name.contains("zoom")
        || name.contains("teams")
        || name.contains("whatsapp")
        || name.contains("messenger")
        || name.contains("lark")
    {
        AppType::Communication
    } 
    // Gaming
    else if name.contains("game") 
        || name.contains("steam") 
        || name.contains("epic")
        || name.contains("unity")
        || name.contains("unreal")
        || name.contains("godot")
        || name.contains("minecraft")
        || name.contains("roblox")
        || name.contains("genshin")
        || name.contains("league")
        || name.contains("warcraft")
    {
        AppType::Gaming
    } 
    // System
    else if name.contains("explorer") 
        || name.contains("finder") 
        || name.contains("desktop")
        || name.contains("settings")
        || name.contains("control")
        || name.contains("taskmgr")
        || name.contains("activity")
    {
        AppType::System
    } 
    else {
        AppType::Unknown
    }
}

fn get_process_name(path: &std::path::Path) -> String {
    path.file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("")
        .to_string()
}

#[tauri::command]
pub fn get_active_window_info() -> Result<ActiveWindowInfo, String> {
    match get_active_window() {
        Ok(window) => {
            let process_name = get_process_name(&window.process_path);
            Ok(ActiveWindowInfo {
                title: window.title,
                process_name: process_name.clone(),
                app_type: get_app_type(&process_name),
            })
        },
        Err(()) => Err("Failed to get active window".to_string()),
    }
}

#[tauri::command]
pub async fn start_monitoring(
    app_handle: AppHandle,
    state: State<'_, WindowMonitorState>,
    interval_ms: u64,
) -> Result<(), String> {
    let mut task_guard = state.monitoring_task.lock().map_err(|e| e.to_string())?;

    if task_guard.is_some() {
        return Ok(()); // Already running
    }

    let interval = Duration::from_millis(interval_ms);
    let app_handle_clone = app_handle.clone();
    
    let task = tokio::spawn(async move {
        let mut last_process_name = String::new();
        let mut last_title = String::new();
        let mut last_app_type = AppType::Unknown;

        loop {
            if let Ok(window) = get_active_window() {
                let current_process_name = get_process_name(&window.process_path);
                let current_app_type = get_app_type(&current_process_name);
                
                // Only emit if changed significantly (app type change or significant title change)
                // We prioritize AppType changes, and only emit title changes if the app type is the same
                // This reduces noise from browser tab title updates unless it's relevant
                
                let is_app_changed = current_process_name != last_process_name;
                let is_type_changed = current_app_type != last_app_type;
                let is_title_changed = window.title != last_title;
                
                // Decide when to emit:
                // 1. App process changed
                // 2. App type changed (e.g. if we refine logic)
                // 3. Title changed AND it's not a browser (browsers update title too often)
                //    OR it is a browser but we might want to know (optional, keeping it simple for now)
                
                let should_emit = is_app_changed || is_type_changed || (is_title_changed && current_app_type != AppType::Browsing);

                if should_emit {
                    let info = ActiveWindowInfo {
                        title: window.title.clone(),
                        process_name: current_process_name.clone(),
                        app_type: current_app_type.clone(),
                    };
                    
                    if let Err(e) = app_handle_clone.emit("active-window-changed", &info) {
                        eprintln!("Failed to emit event: {}", e);
                    }
                    
                    last_process_name = current_process_name;
                    last_title = window.title;
                    last_app_type = current_app_type;
                }
            }
            tokio::time::sleep(interval).await;
        }
    });

    *task_guard = Some(task);
    Ok(())
}

#[tauri::command]
pub fn stop_monitoring(state: State<'_, WindowMonitorState>) -> Result<(), String> {
    let mut task_guard = state.monitoring_task.lock().map_err(|e| e.to_string())?;
    
    if let Some(task) = task_guard.take() {
        task.abort();
    }
    
    Ok(())
}

#[tauri::command]
pub fn capture_screen() -> Result<String, String> {
    // Capture the primary screen
    let screens = Screen::all().map_err(|e| e.to_string())?;
    let screen = screens.first().ok_or("No screen found")?;
    
    let image = screen.capture().map_err(|e| e.to_string())?;
    
    let mut buffer = Vec::new();
    // Use the ImageFormat from screenshots::image which is re-exported
    image.write_to(&mut Cursor::new(&mut buffer), screenshots::image::ImageFormat::Png).map_err(|e| e.to_string())?;
    
    use base64::{Engine as _, engine::general_purpose};
    let encoded = general_purpose::STANDARD.encode(&buffer);
    
    Ok(format!("data:image/png;base64,{}", encoded))
}

#[tauri::command]
pub fn simulate_typing(text: String) -> Result<(), String> {
    let mut enigo = Enigo::new(&Settings::default()).map_err(|e| e.to_string())?;
    enigo.text(&text).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn simulate_key(key: String) -> Result<(), String> {
    let mut enigo = Enigo::new(&Settings::default()).map_err(|e| e.to_string())?;
    let key_code = match key.to_lowercase().as_str() {
        "enter" => Key::Return,
        "tab" => Key::Tab,
        "space" => Key::Space,
        "backspace" => Key::Backspace,
        "delete" => Key::Delete,
        "escape" => Key::Escape,
        "up" => Key::UpArrow,
        "down" => Key::DownArrow,
        "left" => Key::LeftArrow,
        "right" => Key::RightArrow,
        _ => return Err("Unsupported key".to_string()),
    };
    
    enigo.key(key_code, Direction::Click).map_err(|e| e.to_string())?;
    Ok(())
}
