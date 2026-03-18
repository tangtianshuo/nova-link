use crate::config::{load_chat_history, save_chat_history, ChatHistory, ChatMessage};

#[tauri::command]
pub fn save_chat_history_cmd(messages: Vec<ChatMessage>) -> Result<(), String> {
    let history = ChatHistory { messages };
    save_chat_history(&history)
}

#[tauri::command]
pub fn load_chat_history_cmd() -> Result<Vec<ChatMessage>, String> {
    let history = load_chat_history()?;
    Ok(history.messages)
}

#[tauri::command]
pub fn clear_chat_history() -> Result<(), String> {
    save_chat_history(&ChatHistory { messages: vec![] })
}
