use crate::config::{self, Soul};
use crate::commands::identity::SaveResult;

/// Soul 结构化数据（用于前后端交互）
#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct SoulData {
    pub name: String,
    pub personality: String,
    pub style: String,
    pub emoticons: String,
    pub tone: String,
    pub content: String,
}

/// 保存人格设定（同时保存到本地和 OpenClaw 目录）
#[tauri::command]
pub fn save_soul(data: SoulData) -> Result<SaveResult, String> {
    let soul = Soul {
        name: data.name,
        personality: data.personality,
        style: data.style,
        emoticons: data.emoticons,
        tone: data.tone,
        content: data.content.clone(),
    };

    // 先保存到本地 JSON
    let local_ok = config::save_soul(&soul).is_ok();

    // 使用 Tera 渲染生成 Markdown 并保存到 OpenClaw 目录
    let markdown = soul.to_markdown();
    let (openclaw_ok, openclaw_warning) = match save_soul_to_file_internal(&markdown) {
        Ok(_) => (true, None),
        Err(e) => {
            let warning = if local_ok {
                format!("OpenClaw 目录保存失败，已降级保存到本地: {}", e)
            } else {
                format!("保存失败: {}", e)
            };
            (false, Some(warning))
        }
    };

    Ok(SaveResult {
        local_ok,
        openclaw_ok,
        openclaw_warning,
    })
}

/// 从本地配置加载 Soul 作为结构化数据
#[tauri::command]
pub fn load_soul_from_file() -> Result<SoulData, String> {
    // 从 soul.json 加载结构化数据
    let soul = config::load_soul().unwrap_or_else(|_| Soul::default());

    Ok(SoulData {
        name: soul.name,
        personality: soul.personality,
        style: soul.style,
        emoticons: soul.emoticons,
        tone: soul.tone,
        content: soul.content,
    })
}

/// 从 Markdown 内容解析 Soul 数据
fn parse_soul_from_markdown(content: &str) -> SoulData {
    let mut data = SoulData {
        name: String::new(),
        personality: String::new(),
        style: String::new(),
        emoticons: String::new(),
        tone: String::new(),
        content: String::new(),
    };

    let mut in_system_instruction = false;
    let mut system_instruction_lines: Vec<String> = Vec::new();

    for line in content.lines() {
        let trimmed = line.trim();

        // 检测系统指令部分
        if trimmed == "## 系统指令" {
            in_system_instruction = true;
            continue;
        }

        if in_system_instruction {
            if trimmed.starts_with("## ") {
                // 新的章节，结束系统指令
                in_system_instruction = false;
            } else if !trimmed.is_empty() && !trimmed.starts_with("可用情绪") && !trimmed.starts_with("- ") && !trimmed.starts_with("情绪标签") && !trimmed.starts_with("请") {
                system_instruction_lines.push(line.to_string());
            }
            continue;
        }

        // 解析其他字段
        if let Some((key, value)) = trimmed.split_once("：") {
            let key = key.trim().trim_start_matches('-').trim();
            let value = value.trim();
            match key {
                "名字" => data.name = value.to_string(),
                "性格" => data.personality = value.to_string(),
                _ => {}
            }
        } else if let Some((key, value)) = trimmed.split_once(':') {
            let key = key.trim().trim_start_matches('-').trim();
            let value = value.trim();
            match key {
                "名字" | "Name" => data.name = value.to_string(),
                "性格" | "Personality" => data.personality = value.to_string(),
                _ => {}
            }
        }

        // 解析说话风格
        if trimmed.contains("使用") && trimmed.contains("的语气") {
            if let Some(start) = trimmed.find("使用") {
                if let Some(end) = trimmed.find("的语气") {
                    data.style = trimmed[start + 2..end].trim().to_string();
                }
            }
        }
        if trimmed.contains("颜文字") && trimmed.contains("(") {
            if let Some(start) = trimmed.find("(") {
                if let Some(end) = trimmed.find(")") {
                    data.emoticons = trimmed[start + 1..end].trim().to_string();
                }
            }
        }
        if trimmed.contains("保持") && trimmed.contains("的回复") {
            if let Some(start) = trimmed.find("保持") {
                if let Some(end) = trimmed.find("的回复") {
                    data.tone = trimmed[start + 2..end].trim().to_string();
                }
            }
        }
    }

    // 如果没有解析到系统指令，使用整个内容
    if system_instruction_lines.is_empty() {
        data.content = content.to_string();
    } else {
        data.content = system_instruction_lines.join("\n");
    }

    // 如果仍有空字段，使用默认值
    if data.name.is_empty() {
        data.name = "Nova".to_string();
    }
    if data.personality.is_empty() {
        data.personality = "活泼、可爱、友好".to_string();
    }
    if data.style.is_empty() {
        data.style = "轻松可爱".to_string();
    }
    if data.emoticons.is_empty() {
        data.emoticons = "◕‿◕".to_string();
    }
    if data.tone.is_empty() {
        data.tone = "简洁有趣".to_string();
    }

    data
}

/// 内部函数：保存 Soul 到 OpenClaw 目录
fn save_soul_to_file_internal(content: &str) -> Result<String, String> {
    let workspace_dir = get_openclaw_workspace_dir()?;
    let soul_path = workspace_dir.join("SOUL.md");

    std::fs::write(&soul_path, content).map_err(|e| e.to_string())?;
    Ok(soul_path.to_string_lossy().to_string())
}

/// 获取 OpenClaw 工作目录路径
fn get_openclaw_workspace_dir() -> Result<std::path::PathBuf, String> {
    let home_dir = dirs::home_dir().ok_or("Cannot find home directory")?;
    let workspace_dir = home_dir.join(".openclaw").join("workspace");
    std::fs::create_dir_all(&workspace_dir).map_err(|e| e.to_string())?;
    Ok(workspace_dir)
}

/// 从 soul.md 内容中提取系统指令（供 LLM 使用）
pub fn extract_system_instruction(soul_content: &str) -> String {
    // 查找 "## 系统指令" 部分
    if let Some(idx) = soul_content.find("## 系统指令") {
        let after_title = &soul_content[idx + "## 系统指令".len()..];
        // 找到下一个 ## 标题之前的内容，或者文件结尾
        let end_idx = after_title.find("##").unwrap_or(after_title.len());
        let instruction = after_title[..end_idx].trim();
        return instruction.to_string();
    }
    // 如果没有找到系统指令部分，返回整个内容
    soul_content.to_string()
}
