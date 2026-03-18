use tauri_plugin_autostart::ManagerExt;

#[tauri::command]
pub fn enable_autostart(app: tauri::AppHandle) -> Result<(), String> {
    let autostart = app.autolaunch();
    autostart.enable().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn disable_autostart(app: tauri::AppHandle) -> Result<(), String> {
    let autostart = app.autolaunch();
    autostart.disable().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn is_autostart_enabled(app: tauri::AppHandle) -> Result<bool, String> {
    let autostart = app.autolaunch();
    autostart.is_enabled().map_err(|e| e.to_string())
}
