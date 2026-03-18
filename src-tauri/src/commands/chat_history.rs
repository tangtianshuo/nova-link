use crate::config::{
    load_chat_history, save_chat_history, ChatHistory, ChatMessage,
    load_messages_from_db, save_messages_to_db, clear_messages_from_db,
    migrate_json_to_sqlite, init_db
};

#[tauri::command]
pub fn save_chat_history_cmd(messages: Vec<ChatMessage>) -> Result<(), String> {
    // Try SQLite first, fallback to JSON
    match init_db() {
        Ok(_) => {
            match save_messages_to_db("default", &messages) {
                Ok(_) => return Ok(()),
                Err(e) => {
                    log::warn!("SQLite save failed, falling back to JSON: {}", e);
                }
            }
        }
        Err(e) => {
            log::warn!("SQLite init failed, using JSON: {}", e);
        }
    }

    // Fallback to JSON
    let history = ChatHistory { messages };
    save_chat_history(&history)
}

#[tauri::command]
pub fn load_chat_history_cmd() -> Result<Vec<ChatMessage>, String> {
    // Try SQLite first
    match init_db() {
        Ok(_) => {
            match load_messages_from_db("default", 100) {
                Ok(messages) if !messages.is_empty() => return Ok(messages),
                Ok(_) => {
                    // SQLite empty, try migration
                    if let Err(e) = migrate_json_to_sqlite() {
                        log::warn!("Migration failed: {}", e);
                    }
                    // Try again after migration
                    if let Ok(messages) = load_messages_from_db("default", 100) {
                        if !messages.is_empty() {
                            return Ok(messages);
                        }
                    }
                }
                Err(e) => {
                    log::warn!("SQLite load failed: {}", e);
                }
            }
        }
        Err(e) => {
            log::warn!("SQLite init failed: {}", e);
        }
    }

    // Fallback to JSON
    let history = load_chat_history()?;
    Ok(history.messages)
}

#[tauri::command]
pub fn clear_chat_history() -> Result<(), String> {
    // Try SQLite first
    match init_db() {
        Ok(_) => {
            match clear_messages_from_db("default") {
                Ok(_) => return Ok(()),
                Err(e) => {
                    log::warn!("SQLite clear failed, using JSON: {}", e);
                }
            }
        }
        Err(e) => {
            log::warn!("SQLite init failed: {}", e);
        }
    }

    // Fallback to JSON
    save_chat_history(&ChatHistory { messages: vec![] })
}
