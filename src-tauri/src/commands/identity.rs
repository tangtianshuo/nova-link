use crate::config::{self, Identity};

/// 保存结果
#[derive(Debug, serde::Serialize)]
pub struct SaveResult {
    pub local_ok: bool,
    pub openclaw_ok: bool,
    pub openclaw_warning: Option<String>,
}

/// 从配置文件加载 Identity
#[tauri::command]
pub fn load_identity() -> Result<Identity, String> {
    config::load_identity()
}

/// 保存 Identity（同时保存到本地和 OpenClaw 目录）
#[tauri::command]
pub fn save_identity(
    name: String,
    creature_type: String,
    temperament: String,
    emoji: String,
    avatar_path: String,
) -> Result<SaveResult, String> {
    let identity = Identity {
        name,
        creature_type,
        temperament,
        emoji,
        avatar_path,
    };

    // 先保存到本地
    let local_ok = config::save_identity(&identity).is_ok();

    // 尝试保存到 OpenClaw 目录
    let (openclaw_ok, openclaw_warning) = match save_identity_to_file_internal(&identity) {
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

/// 内部函数：保存 Identity 到 OpenClaw 目录（不创建命令）
fn save_identity_to_file_internal(identity: &Identity) -> Result<String, String> {
    let workspace_dir = get_openclaw_workspace_dir()?;
    let identity_path = workspace_dir.join("IDENTITY.md");

    let content = format!(
        r#"# 角色身份

- **名称：** {}
- **生物类型：** {}
- **气质：** {}
- **专属emoji：** {}
- **头像：** {}
"#,
        identity.name,
        identity.creature_type,
        identity.temperament,
        identity.emoji,
        identity.avatar_path
    );

    std::fs::write(&identity_path, content).map_err(|e| e.to_string())?;
    log::info!("Identity saved to OpenClaw: {:?}", identity_path);
    Ok(identity_path.to_string_lossy().to_string())
}

/// 从本地配置加载 Identity 作为结构化数据
#[tauri::command]
pub fn load_identity_from_file() -> Result<Identity, String> {
    // 从 identity.json 加载结构化数据
    let identity = config::load_identity().unwrap_or_else(|_| Identity::default());
    Ok(identity)
}

/// 保存 Identity 到 OpenClaw 工作目录的 IDENTITY.md（保留兼容）
#[tauri::command]
pub fn save_identity_to_file(
    name: String,
    creature_type: String,
    temperament: String,
    emoji: String,
    avatar_path: String,
) -> Result<String, String> {
    let identity = Identity {
        name,
        creature_type,
        temperament,
        emoji,
        avatar_path,
    };
    save_identity_to_file_internal(&identity)
}

/// 获取默认 Identity 模板
#[tauri::command]
pub fn get_default_identity() -> String {
    config::IDENTITY_TEMPLATE.to_string()
}

/// 获取 OpenClaw 工作目录路径
fn get_openclaw_workspace_dir() -> Result<std::path::PathBuf, String> {
    let home_dir = dirs::home_dir().ok_or("Cannot find home directory")?;
    let workspace_dir = home_dir.join(".openclaw").join("workspace");
    std::fs::create_dir_all(&workspace_dir).map_err(|e| e.to_string())?;
    Ok(workspace_dir)
}
