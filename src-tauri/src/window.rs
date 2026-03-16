use crate::config;
use tauri::{Emitter, WebviewWindow, Window, WindowEvent};

/// 处理窗口事件
pub fn handle_window_event(window: &Window, event: &WindowEvent) {
    // println!("[DEBUG] Window event: {:?}", event);
    if let WindowEvent::CloseRequested { api, .. } = event {
        println!("[DEBUG] Close requested, hiding window");
        // 保存窗口状态后再隐藏
        if let Ok(pos) = window.outer_position() {
            if let Ok(size) = window.outer_size() {
                let _ = config::save_window_state(pos.x, pos.y, size.width, size.height);
            }
        }
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
        // 保存窗口状态
        if let Ok(pos) = window.outer_position() {
            let _ = config::save_window_state(pos.x, pos.y, size.width, size.height);
        }
    }
    if let WindowEvent::Moved(pos) = event {
        // println!("[DEBUG] Window moved: {:?}", pos);
        // 如果移动到隐藏位置，恢复
        if pos.x < -10000 || pos.y < -10000 {
            println!("[DEBUG] Window moved to hidden position, ignoring");
            return;
        }
        // 保存窗口状态
        if let Ok(size) = window.outer_size() {
            let _ = config::save_window_state(pos.x, pos.y, size.width, size.height);
        }
    }
    if let WindowEvent::Focused(focused) = event {
        // 当窗口获得焦点时，通知前端可能需要重新加载 Live2D
        if *focused {
            let _ = window.emit("window-shown", ());
        }
    }
}

/// 设置窗口透明效果 (for WebviewWindow from get_webview_window in setup)
pub fn setup_transparent_window(window: &WebviewWindow) {
    let js = r#"
        document.body.style.background = 'transparent';
        document.documentElement.style.background = 'transparent';
        var app = document.getElementById('app');
        if (app) { app.style.background = 'transparent'; }
        var canvas = document.getElementById('live2d-canvas');
        if (canvas) { canvas.style.background = 'transparent'; }
    "#;
    // Manager trait is needed for eval method
    let _ = window.eval(js);
}
