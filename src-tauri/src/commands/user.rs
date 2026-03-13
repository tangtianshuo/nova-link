use crate::commands::identity::SaveResult;
use crate::config::User;

/// 获取默认 User 模板
#[tauri::command]
pub fn get_default_user() -> String {
    crate::config::USER_TEMPLATE.to_string()
}

/// 从本地配置加载 User 作为结构化数据
#[tauri::command]
pub fn load_user_from_file() -> Result<User, String> {
    // 从 user.json 加载结构化数据
    let user = crate::config::load_user().unwrap_or_else(|_| User::default());
    Ok(user)
}

/// 保存 User（同时保存到本地和 OpenClaw 目录）
#[tauri::command]
pub fn save_user(
    name: String,
    call_name: String,
    pronouns: String,
    timezone: String,
    notes: String,
    context: String,
) -> Result<SaveResult, String> {
    let user = User {
        name: name.clone(),
        call_name: call_name.clone(),
        pronouns: pronouns.clone(),
        timezone: timezone.clone(),
        notes: notes.clone(),
        context: context.clone(),
    };

    // 先保存到本地
    let local_ok = crate::config::save_user(&user).is_ok();

    // 尝试保存到 OpenClaw 目录
    let (openclaw_ok, openclaw_warning) = match save_user_to_file_internal(&user) {
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

/// 保存 User 到 OpenClaw 工作目录的 USER.md
#[tauri::command]
pub fn save_user_to_file(
    name: String,
    call_name: String,
    pronouns: String,
    timezone: String,
    notes: String,
    context: String,
) -> Result<String, String> {
    let user = User {
        name,
        call_name,
        pronouns,
        timezone,
        notes,
        context,
    };
    save_user_to_file_internal(&user)
}

/// 内部函数：保存 User 到 OpenClaw 目录
fn save_user_to_file_internal(user: &User) -> Result<String, String> {
    let workspace_dir = get_openclaw_workspace_dir()?;
    let user_path = workspace_dir.join("USER.md");

    let content = format!(
        r#"# USER.md - About Your Human

_Learn about the person you're helping. Update this as you go._

- **Name:** {}
- **What to call them:** {}
- **Pronouns:** {} _(optional)_
- **Timezone:** {}
- **Notes:** {}

## Context

{}

---

"#,
        user.name, user.call_name, user.pronouns, user.timezone, user.notes, user.context
    );

    std::fs::write(&user_path, content).map_err(|e| e.to_string())?;
    log::info!("User saved to OpenClaw: {:?}", user_path);
    Ok(user_path.to_string_lossy().to_string())
}

/// 获取 OpenClaw 工作目录路径
fn get_openclaw_workspace_dir() -> Result<std::path::PathBuf, String> {
    let home_dir = dirs::home_dir().ok_or("Cannot find home directory")?;
    let workspace_dir = home_dir.join(".openclaw").join("workspace");
    std::fs::create_dir_all(&workspace_dir).map_err(|e| e.to_string())?;
    Ok(workspace_dir)
}
