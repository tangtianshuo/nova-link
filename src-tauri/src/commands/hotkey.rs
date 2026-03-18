use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut};

#[tauri::command]
pub fn register_global_shortcut(
    app: AppHandle,
    shortcut: String,
    action: String,
) -> Result<(), String> {
    // Parse shortcut string, e.g., "Ctrl+Shift+N"
    let (modifiers, key) = parse_shortcut(&shortcut)?;

    let shortcut = Shortcut::new(Some(modifiers), key);
    let app_handle = app.clone();

    app.global_shortcut()
        .on_shortcut(shortcut, move |_app, _shortcut, _event| {
            match action.as_str() {
                "toggle_chat" => {
                    if let Some(window) = app_handle.get_webview_window("main") {
                        let _ = window.emit("toggle-chat", ());
                    }
                }
                "toggle_window" => {
                    if let Some(window) = app_handle.get_webview_window("main") {
                        if window.is_visible().unwrap_or(false) {
                            let _ = window.hide();
                        } else {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                }
                _ => {}
            }
        })
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn unregister_global_shortcut(app: AppHandle, shortcut: String) -> Result<(), String> {
    let (modifiers, key) = parse_shortcut(&shortcut)?;
    let shortcut = Shortcut::new(Some(modifiers), key);
    app.global_shortcut()
        .unregister(shortcut)
        .map_err(|e| e.to_string())
}

fn parse_shortcut(shortcut: &str) -> Result<(Modifiers, Code), String> {
    let parts: Vec<&str> = shortcut.split('+').collect();
    let mut modifiers = Modifiers::empty();
    let mut key = None;

    for part in parts {
        match part.to_uppercase().as_str() {
            "CTRL" | "CONTROL" => modifiers |= Modifiers::CONTROL,
            "SHIFT" => modifiers |= Modifiers::SHIFT,
            "ALT" => modifiers |= Modifiers::ALT,
            "META" | "WIN" => modifiers |= Modifiers::META,
            k => {
                key = Some(match k {
                    "A" => Code::KeyA,
                    "B" => Code::KeyB,
                    "C" => Code::KeyC,
                    "D" => Code::KeyD,
                    "E" => Code::KeyE,
                    "F" => Code::KeyF,
                    "G" => Code::KeyG,
                    "H" => Code::KeyH,
                    "I" => Code::KeyI,
                    "J" => Code::KeyJ,
                    "K" => Code::KeyK,
                    "L" => Code::KeyL,
                    "M" => Code::KeyM,
                    "N" => Code::KeyN,
                    "O" => Code::KeyO,
                    "P" => Code::KeyP,
                    "Q" => Code::KeyQ,
                    "R" => Code::KeyR,
                    "S" => Code::KeyS,
                    "T" => Code::KeyT,
                    "U" => Code::KeyU,
                    "V" => Code::KeyV,
                    "W" => Code::KeyW,
                    "X" => Code::KeyX,
                    "Y" => Code::KeyY,
                    "Z" => Code::KeyZ,
                    _ => return Err(format!("Unknown key: {}", k)),
                });
            }
        }
    }

    key.ok_or_else(|| "No key specified".to_string())
        .map(|k| (modifiers, k))
}
