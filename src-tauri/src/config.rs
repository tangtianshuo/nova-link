use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tera::{Context, Tera};

/// 获取配置目录路径（exe 同级 config/ 目录）
pub fn get_config_dir() -> PathBuf {
    if let Ok(exe_path) = std::env::current_exe() {
        if let Some(exe_dir) = exe_path.parent() {
            return exe_dir.join("config");
        }
    }
    PathBuf::from("config")
}

/// 确保配置目录存在
pub fn ensure_config_dir() -> Result<PathBuf, String> {
    let config_dir = get_config_dir();
    fs::create_dir_all(&config_dir).map_err(|e| e.to_string())?;
    Ok(config_dir)
}

// ============ 模板系统 (Tera) ============

/// 初始化 Tera 模板引擎
fn init_tera() -> Tera {
    let mut tera = Tera::default();

    // 注册 identity 模板
    tera.add_raw_template("identity", include_str!("../templates/identity.md"))
        .unwrap_or_else(|e| {
            log::error!("Failed to register identity template: {}", e);
        });

    // 注册 user 模板
    tera.add_raw_template("user", include_str!("../templates/user.md"))
        .unwrap_or_else(|e| {
            log::error!("Failed to register user template: {}", e);
        });

    // 注册 soul 模板
    tera.add_raw_template("soul", include_str!("../templates/soul.md"))
        .unwrap_or_else(|e| {
            log::error!("Failed to register soul template: {}", e);
        });

    tera
}

/// 使用 Tera 渲染模板
fn render_tera(template_name: &str, vars: &serde_json::Value) -> String {
    static TERA_ONCE: std::sync::OnceLock<Tera> = std::sync::OnceLock::new();
    let tera = TERA_ONCE.get_or_init(init_tera);

    let context = Context::from_value(vars.clone()).unwrap_or_default();
    tera.render(template_name, &context).unwrap_or_else(|e| {
        log::error!("Template render error: {}", e);
        String::new()
    })
}

/// 嵌入模板（使用 include_str! 宏）- 用于默认值
#[allow(dead_code)]
pub const IDENTITY_TEMPLATE: &str = include_str!("../templates/identity.md");
#[allow(dead_code)]
pub const USER_TEMPLATE: &str = include_str!("../templates/user.md");
pub const SOUL_TEMPLATE: &str = include_str!("../templates/soul.md");

// ============ 配置结构体 ============

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AppSettings {
    pub model_path: String,
    pub ws_url: String,
    pub ws_token: String,
    pub chat_provider: String,
    pub llm_provider: String,
    pub llm_api_key: String,
    pub llm_api_url: String,
    pub llm_model: String,
    pub bg_color: String,
    pub bg_opacity: f32,
    pub bg_blur: bool,
    pub always_on_top: bool,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            model_path: "/models/hiyori_pro_zh/runtime/hiyori_pro_t11.model3.json".to_string(),
            ws_url: "ws://127.0.0.1:18789".to_string(),
            ws_token: String::new(),
            chat_provider: "openclaw".to_string(),
            llm_provider: "none".to_string(),
            llm_api_key: String::new(),
            llm_api_url: String::new(),
            llm_model: String::new(),
            bg_color: "#1e293b".to_string(),
            bg_opacity: 0.8,
            bg_blur: true,
            always_on_top: true,
        }
    }
}

/// 保存应用设置
pub fn save_settings(settings: &AppSettings) -> Result<(), String> {
    let config_dir = ensure_config_dir()?;
    let config_path = config_dir.join("config.json");
    let json = serde_json::to_string_pretty(settings).map_err(|e| e.to_string())?;
    fs::write(&config_path, json).map_err(|e| e.to_string())?;
    Ok(())
}

/// 加载应用设置
pub fn load_settings() -> Result<AppSettings, String> {
    let config_path = get_config_dir().join("config.json");
    if !config_path.exists() {
        return Ok(AppSettings::default());
    }
    let content = fs::read_to_string(&config_path).map_err(|e| e.to_string())?;
    let settings: AppSettings = serde_json::from_str(&content).map_err(|e| e.to_string())?;
    Ok(settings)
}

// ============ Identity ============

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Identity {
    pub name: String,
    pub creature_type: String,
    pub temperament: String,
    pub emoji: String,
    pub avatar_path: String,
}

impl Default for Identity {
    fn default() -> Self {
        Self {
            name: "Nova".to_string(),
            creature_type: "人类".to_string(),
            temperament: "温柔调皮活泼可爱 💕".to_string(),
            emoji: "👻".to_string(),
            avatar_path: String::new(),
        }
    }
}

impl Identity {
    /// 从 Identity 生成 Markdown (使用 Tera)
    pub fn to_markdown(&self) -> String {
        let vars = serde_json::json!({
            "name": self.name,
            "creature_type": self.creature_type,
            "temperament": self.temperament,
            "emoji": self.emoji,
            "avatar_path": self.avatar_path,
        });
        render_tera("identity", &vars)
    }
}

/// 保存 Identity
pub fn save_identity(identity: &Identity) -> Result<(), String> {
    let config_dir = ensure_config_dir()?;
    let config_path = config_dir.join("identity.json");
    let json = serde_json::to_string_pretty(identity).map_err(|e| e.to_string())?;
    fs::write(&config_path, json).map_err(|e| e.to_string())?;

    // 同时保存 Markdown 版本
    let md_path = config_dir.join("identity.md");
    fs::write(&md_path, identity.to_markdown()).map_err(|e| e.to_string())?;

    Ok(())
}

/// 加载 Identity
pub fn load_identity() -> Result<Identity, String> {
    let config_path = get_config_dir().join("identity.json");
    if !config_path.exists() {
        return Ok(Identity::default());
    }
    let content = fs::read_to_string(&config_path).map_err(|e| e.to_string())?;
    let identity: Identity = serde_json::from_str(&content).map_err(|e| e.to_string())?;
    Ok(identity)
}

// ============ User ============

#[allow(dead_code)]
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct User {
    pub name: String,
    pub call_name: String,
    pub pronouns: String,
    pub timezone: String,
    pub notes: String,
    pub context: String,
}

impl Default for User {
    fn default() -> Self {
        Self {
            name: String::new(),
            call_name: String::new(),
            pronouns: String::new(),
            timezone: String::new(),
            notes: String::new(),
            context: String::new(),
        }
    }
}

#[allow(dead_code)]
impl User {
    /// 从 User 生成 Markdown (使用 Tera)
    pub fn to_markdown(&self) -> String {
        let vars = serde_json::json!({
            "name": self.name,
            "call_name": self.call_name,
            "pronouns": self.pronouns,
            "timezone": self.timezone,
            "notes": self.notes,
            "context": self.context,
        });
        render_tera("user", &vars)
    }
}

/// 保存 User
#[allow(dead_code)]
pub fn save_user(user: &User) -> Result<(), String> {
    let config_dir = ensure_config_dir()?;
    let config_path = config_dir.join("user.json");
    let json = serde_json::to_string_pretty(user).map_err(|e| e.to_string())?;
    fs::write(&config_path, json).map_err(|e| e.to_string())?;

    // 同时保存 Markdown 版本
    let md_path = config_dir.join("user.md");
    fs::write(&md_path, user.to_markdown()).map_err(|e| e.to_string())?;

    Ok(())
}

/// 加载 User
#[allow(dead_code)]
pub fn load_user() -> Result<User, String> {
    let config_path = get_config_dir().join("user.json");
    if !config_path.exists() {
        return Ok(User::default());
    }
    let content = fs::read_to_string(&config_path).map_err(|e| e.to_string())?;
    let user: User = serde_json::from_str(&content).map_err(|e| e.to_string())?;
    Ok(user)
}

// ============ Soul ============

#[allow(dead_code)]
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Soul {
    pub name: String,
    pub personality: String,
    pub style: String,
    pub emoticons: String,
    pub tone: String,
    pub content: String,
}

impl Default for Soul {
    fn default() -> Self {
        Self {
            name: "Nova".to_string(),
            personality: "活泼、可爱、友好".to_string(),
            style: "轻松可爱".to_string(),
            emoticons: "◕‿◕".to_string(),
            tone: "简洁有趣".to_string(),
            content: SOUL_TEMPLATE.to_string(),
        }
    }
}

#[allow(dead_code)]
impl Soul {
    /// 从 Soul 生成 Markdown (使用 Tera)
    pub fn to_markdown(&self) -> String {
        let vars = serde_json::json!({
            "name": self.name,
            "personality": self.personality,
            "style": self.style,
            "emoticons": self.emoticons,
            "tone": self.tone,
        });
        render_tera("soul", &vars)
    }
}

/// 保存 Soul
#[allow(dead_code)]
pub fn save_soul(soul: &Soul) -> Result<(), String> {
    let config_dir = ensure_config_dir()?;
    let config_path = config_dir.join("soul.json");
    let json = serde_json::to_string_pretty(soul).map_err(|e| e.to_string())?;
    fs::write(&config_path, json).map_err(|e| e.to_string())?;

    // 同时保存 Markdown 版本
    let md_path = config_dir.join("soul.md");
    fs::write(&md_path, soul.to_markdown()).map_err(|e| e.to_string())?;

    Ok(())
}

/// 加载 Soul
#[allow(dead_code)]
pub fn load_soul() -> Result<Soul, String> {
    let config_path = get_config_dir().join("soul.json");
    if !config_path.exists() {
        return Ok(Soul::default());
    }
    let content = fs::read_to_string(&config_path).map_err(|e| e.to_string())?;
    let soul: Soul = serde_json::from_str(&content).map_err(|e| e.to_string())?;
    Ok(soul)
}

/// 加载 Soul Markdown 内容（供 LLM 使用）
#[allow(dead_code)]
pub fn load_soul_markdown() -> Result<String, String> {
    let md_path = get_config_dir().join("soul.md");
    if !md_path.exists() {
        return Ok(Soul::default().to_markdown());
    }
    fs::read_to_string(&md_path).map_err(|e| e.to_string())
}

// ============ Window State ============

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct WindowState {
    pub x: i32,
    pub y: i32,
    pub width: u32,
    pub height: u32,
}

impl WindowState {
    pub fn new(x: i32, y: i32, width: u32, height: u32) -> Self {
        Self {
            x,
            y,
            width,
            height,
        }
    }
}

/// 保存窗口状态
pub fn save_window_state(x: i32, y: i32, width: u32, height: u32) -> Result<(), String> {
    let config_dir = ensure_config_dir()?;
    let state = WindowState::new(x, y, width, height);
    let json = serde_json::to_string_pretty(&state).map_err(|e| e.to_string())?;
    let config_path = config_dir.join("window.json");
    fs::write(&config_path, json).map_err(|e| e.to_string())?;
    Ok(())
}

/// 加载窗口状态
pub fn load_window_state() -> Result<Option<WindowState>, String> {
    let config_path = get_config_dir().join("window.json");
    if !config_path.exists() {
        return Ok(None);
    }
    let content = fs::read_to_string(&config_path).map_err(|e| e.to_string())?;
    let state: WindowState = serde_json::from_str(&content).map_err(|e| e.to_string())?;
    Ok(Some(state))
}

/// 检查是否有保存的窗口状态
pub fn has_window_state() -> bool {
    load_window_state().map(|s| s.is_some()).unwrap_or(false)
}

// ============ 配置初始化 ============

/// 初始化所有配置文件（首次安装时调用）
pub fn init_config_files() -> Result<(), String> {
    let config_dir = ensure_config_dir()?;
    println!("[CONFIG] Initializing config files in: {:?}", config_dir);

    // 初始化 config.json
    let config_path = config_dir.join("config.json");
    if !config_path.exists() {
        let default_settings = AppSettings::default();
        let json = serde_json::to_string_pretty(&default_settings).map_err(|e| e.to_string())?;
        fs::write(&config_path, json).map_err(|e| e.to_string())?;
        println!("[CONFIG] Created default config.json");
    }

    // 初始化 identity.json
    let identity_path = config_dir.join("identity.json");
    if !identity_path.exists() {
        let default_identity = Identity::default();
        let json = serde_json::to_string_pretty(&default_identity).map_err(|e| e.to_string())?;
        fs::write(&identity_path, json).map_err(|e| e.to_string())?;
        // 同时生成 identity.md
        let md_path = config_dir.join("identity.md");
        fs::write(&md_path, default_identity.to_markdown()).map_err(|e| e.to_string())?;
        println!("[CONFIG] Created default identity.json and identity.md");
    }

    // 初始化 user.json
    let user_path = config_dir.join("user.json");
    if !user_path.exists() {
        let default_user = User::default();
        let json = serde_json::to_string_pretty(&default_user).map_err(|e| e.to_string())?;
        fs::write(&user_path, json).map_err(|e| e.to_string())?;
        // 同时生成 user.md
        let md_path = config_dir.join("user.md");
        fs::write(&md_path, default_user.to_markdown()).map_err(|e| e.to_string())?;
        println!("[CONFIG] Created default user.json and user.md");
    }

    // 初始化 soul.json
    let soul_path = config_dir.join("soul.json");
    if !soul_path.exists() {
        let default_soul = Soul::default();
        let json = serde_json::to_string_pretty(&default_soul).map_err(|e| e.to_string())?;
        fs::write(&soul_path, json).map_err(|e| e.to_string())?;
        // 同时生成 soul.md
        let md_path = config_dir.join("soul.md");
        fs::write(&md_path, default_soul.to_markdown()).map_err(|e| e.to_string())?;
        println!("[CONFIG] Created default soul.json and soul.md");
    }

    // 初始化 window.json（只在没有保存状态时创建默认窗口状态）
    let window_path = config_dir.join("window.json");
    if !window_path.exists() {
        let default_window = WindowState::new(0, 0, 400, 800);
        let json = serde_json::to_string_pretty(&default_window).map_err(|e| e.to_string())?;
        fs::write(&window_path, json).map_err(|e| e.to_string())?;
        println!("[CONFIG] Created default window.json");
    }

    println!("[CONFIG] Config initialization complete");
    Ok(())
}
