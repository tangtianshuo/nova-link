use crate::config;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct WindowSize {
    pub width: u32,
    pub height: u32,
}

/// 设置窗口大小（前端调用）
#[tauri::command]
pub async fn set_window_size(window: tauri::Window, width: u32, height: u32) -> Result<(), String> {
    // 确保最小尺寸
    let min_width = 300u32;
    let min_height = 400u32;
    let w = width.max(min_width);
    let h = height.max(min_height);

    window
        .set_size(tauri::Size::Physical(tauri::PhysicalSize::new(w, h)))
        .map_err(|e| e.to_string())?;

    Ok(())
}

/// 获取当前窗口大小
#[tauri::command]
pub async fn get_window_size(window: tauri::Window) -> Result<WindowSize, String> {
    let size = window.outer_size().map_err(|e| e.to_string())?;
    Ok(WindowSize {
        width: size.width,
        height: size.height,
    })
}

/// 根据屏幕尺寸设置默认窗口大小（首次启动时调用）
/// 宽度 = 屏幕宽度 / 6，高度 = 宽度 * 2
#[tauri::command]
pub async fn set_default_window_size(window: tauri::Window) -> Result<WindowSize, String> {
    // 获取主屏幕尺寸
    let monitor = window
        .current_monitor()
        .map_err(|e| e.to_string())?
        .ok_or("Cannot get monitor")?;

    let screen_size = monitor.size();
    let width = (screen_size.width as f64 / 6.0) as u32;
    let height = width * 2;

    // 确保最小尺寸
    let min_width = 300u32;
    let min_height = 400u32;
    let w = width.max(min_width);
    let h = height.max(min_height);

    window
        .set_size(tauri::Size::Physical(tauri::PhysicalSize::new(w, h)))
        .map_err(|e| e.to_string())?;

    Ok(WindowSize {
        width: w,
        height: h,
    })
}

/// 检查是否有保存的窗口状态
#[tauri::command]
pub fn has_window_state() -> bool {
    config::has_window_state()
}

/// 设置窗口是否忽略鼠标事件（实现点击穿透）
/// enabled: true - 忽略鼠标事件，事件穿透到下层窗口
/// enabled: false - 恢复接收鼠标事件
#[tauri::command]
pub async fn set_click_through(window: tauri::Window, enabled: bool) -> Result<(), String> {
    println!("[DEBUG] set_click_through: {}", enabled);
    window
        .set_ignore_cursor_events(enabled)
        .map_err(|e| e.to_string())?;
    Ok(())
}

/// 查询当前点击穿透状态
#[tauri::command]
pub fn is_click_through_enabled(window: tauri::Window) -> Result<bool, String> {
    // 注意：Tauri v2 目前没有直接查询 ignore_cursor_events 状态的 API
    // 这里返回 Ok(false) 作为占位，实际状态由前端管理
    let _ = window;
    Ok(false)
}
