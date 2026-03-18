use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tera::{Context, Tera};
use rusqlite::{Connection, params};
use thiserror::Error;

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

// ============ Chat History ============

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ChatHistory {
    pub messages: Vec<ChatMessage>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ChatMessage {
    pub msg_type: String,
    pub content: String,
    pub timestamp: i64,
}

pub fn get_chat_history_path() -> std::path::PathBuf {
    get_config_dir().join("chat_history.json")
}

pub fn load_chat_history() -> Result<ChatHistory, String> {
    let path = get_chat_history_path();
    if !path.exists() {
        return Ok(ChatHistory { messages: vec![] });
    }
    let content = std::fs::read_to_string(&path).map_err(|e| e.to_string())?;
    serde_json::from_str(&content).map_err(|e| e.to_string())
}

pub fn save_chat_history(history: &ChatHistory) -> Result<(), String> {
    let path = get_chat_history_path();
    let content = serde_json::to_string_pretty(history).map_err(|e| e.to_string())?;
    std::fs::write(&path, content).map_err(|e| e.to_string())
}

// ============ SQLite Database ============

/// Database error types
#[derive(Error, Debug)]
pub enum DbError {
    #[error("SQLite error: {0}")]
    Sqlite(#[from] rusqlite::Error),
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
    #[error("JSON error: {0}")]
    Json(#[from] serde_json::Error),
}

/// Get database file path
pub fn get_db_path() -> std::path::PathBuf {
    get_config_dir().join("chat_history.db")
}

/// Initialize database connection and create tables
pub fn init_db() -> Result<Connection, String> {
    let db_path = get_db_path();
    let conn = Connection::open(&db_path).map_err(|e| e.to_string())?;

    // Create conversations table
    conn.execute(
        "CREATE TABLE IF NOT EXISTS conversations (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL DEFAULT '',
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
        )",
        [],
    ).map_err(|e| e.to_string())?;

    // Create messages table
    conn.execute(
        "CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            conversation_id TEXT NOT NULL,
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            timestamp INTEGER NOT NULL,
            created_at INTEGER NOT NULL,
            FOREIGN KEY (conversation_id) REFERENCES conversations(id)
        )",
        [],
    ).map_err(|e| e.to_string())?;

    // Create index for faster queries
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id)",
        [],
    ).map_err(|e| e.to_string())?;

    Ok(conn)
}

/// Load messages from SQLite (with pagination support)
pub fn load_messages_from_db(conversation_id: &str, limit: i64) -> Result<Vec<ChatMessage>, String> {
    let conn = init_db()?;

    let mut stmt = conn.prepare(
        "SELECT role, content, timestamp FROM messages
         WHERE conversation_id = ?1
         ORDER BY timestamp DESC
         LIMIT ?2"
    ).map_err(|e| e.to_string())?;

    let messages: Vec<ChatMessage> = stmt.query_map(params![conversation_id, limit], |row| {
        Ok(ChatMessage {
            msg_type: row.get(0)?,
            content: row.get(1)?,
            timestamp: row.get(2)?,
        })
    }).map_err(|e| e.to_string())?
    .filter_map(|r| r.ok())
    .collect();

    // Return in chronological order (oldest first)
    Ok(messages.into_iter().rev().collect())
}

/// Save messages to SQLite (replace entire conversation messages)
pub fn save_messages_to_db(conversation_id: &str, messages: &[ChatMessage]) -> Result<(), String> {
    let conn = init_db()?;

    // Start transaction
    conn.execute("BEGIN TRANSACTION", [])
        .map_err(|e| e.to_string())?;

    // Delete existing messages for this conversation
    conn.execute("DELETE FROM messages WHERE conversation_id = ?1", params![conversation_id])
        .map_err(|e| e.to_string())?;

    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs() as i64;

    for msg in messages {
        conn.execute(
            "INSERT INTO messages (conversation_id, role, content, timestamp, created_at) VALUES (?1, ?2, ?3, ?4, ?5)",
            params![conversation_id, msg.msg_type, msg.content, msg.timestamp, now]
        ).map_err(|e| e.to_string())?;
    }

    // Update conversation timestamp
    conn.execute(
        "INSERT OR REPLACE INTO conversations (id, title, updated_at, created_at) VALUES (?1, '', ?2, ?2)",
        params![conversation_id, now]
    ).map_err(|e| e.to_string())?;

    conn.execute("COMMIT", []).map_err(|e| e.to_string())?;

    Ok(())
}

/// Clear messages for a conversation
pub fn clear_messages_from_db(conversation_id: &str) -> Result<(), String> {
    let conn = init_db()?;
    conn.execute("DELETE FROM messages WHERE conversation_id = ?1", params![conversation_id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

/// Migrate existing JSON data to SQLite (if SQLite is empty)
pub fn migrate_json_to_sqlite() -> Result<(), String> {
    let conn = init_db()?;

    // Check if already migrated
    let count: i64 = conn.query_row(
        "SELECT COUNT(*) FROM messages",
        [],
        |row| row.get(0)
    ).unwrap_or(0);

    if count > 0 {
        return Ok(()); // Already has data
    }

    // Load from JSON
    let json_history = load_chat_history()?;
    if json_history.messages.is_empty() {
        return Ok(());
    }

    // Migrate to SQLite
    save_messages_to_db("default", &json_history.messages)?;

    Ok(())
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
