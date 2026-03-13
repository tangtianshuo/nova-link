use crate::commands::soul::extract_system_instruction;
use crate::state::{AppState, LlmMessage};

#[tauri::command]
pub fn update_llm_config(
    state: tauri::State<AppState>,
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
}

#[tauri::command]
pub async fn chat_with_llm(
    state: tauri::State<'_, AppState>,
    provider: String,
    api_key: String,
    api_url: String,
    model: String,
    message: String,
    system_prompt: Option<String>,
) -> Result<String, String> {
    if provider == "none" || api_key.is_empty() || api_url.is_empty() {
        return Err("LLM not configured".to_string());
    }

    let url = format!("{}/chat/completions", api_url.trim_end_matches('/'));

    // 构建消息列表，支持注入 system prompt
    let mut messages: Vec<LlmMessage> = Vec::new();

    // 如果提供了 system prompt，添加到消息列表
    if let Some(system_content) = system_prompt {
        // 从 soul.md 中提取系统指令部分
        let system_instruction = extract_system_instruction(&system_content);
        if !system_instruction.is_empty() {
            messages.push(LlmMessage {
                role: "system".to_string(),
                content: system_instruction,
            });
        }
    }

    messages.push(LlmMessage {
        role: "user".to_string(),
        content: message,
    });

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
