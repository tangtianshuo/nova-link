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
