use serde::{Deserialize, Serialize};
use std::process::Command;
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct NodeEnvStatus {
    pub installed: bool,
    pub version: String,
    pub version_valid: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct OpenClawEnvStatus {
    pub installed: bool,
    pub version: String,
    pub initialized: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct EnvCheckStatus {
    pub node: NodeEnvStatus,
    pub openclaw: OpenClawEnvStatus,
    pub skipped: bool,
}

fn get_config_dir() -> PathBuf {
    let home = dirs::home_dir().unwrap_or_else(|| PathBuf::from("."));
    home.join(".nova-link")
}

fn get_env_check_config_path() -> PathBuf {
    get_config_dir().join("env_check.json")
}

fn load_skipped_status() -> bool {
    let path = get_env_check_config_path();
    if path.exists() {
        if let Ok(content) = fs::read_to_string(&path) {
            if let Ok(config) = serde_json::from_str::<serde_json::Value>(&content) {
                return config.get("skipped").and_then(|v| v.as_bool()).unwrap_or(false);
            }
        }
    }
    false
}

#[tauri::command]
pub fn get_env_check_skipped() -> bool {
    load_skipped_status()
}

#[tauri::command]
pub fn skip_env_check() -> Result<(), String> {
    let config_dir = get_config_dir();
    if !config_dir.exists() {
        fs::create_dir_all(&config_dir).map_err(|e| e.to_string())?;
    }

    let config_path = get_env_check_config_path();
    let config = serde_json::json!({
        "skipped": true
    });

    fs::write(&config_path, serde_json::to_string_pretty(&config).unwrap())
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn check_node_env() -> NodeEnvStatus {
    let output = Command::new("node")
        .arg("--version")
        .output();

    match output {
        Ok(result) => {
            if result.status.success() {
                let version = String::from_utf8_lossy(&result.stdout)
                    .trim()
                    .to_string();
                let version_clean = version.trim_start_matches('v').to_string();
                let major_version: u32 = version_clean
                    .split('.')
                    .next()
                    .and_then(|v| v.parse().ok())
                    .unwrap_or(0);

                NodeEnvStatus {
                    installed: true,
                    version,
                    version_valid: major_version >= 22,
                }
            } else {
                NodeEnvStatus {
                    installed: false,
                    version: String::new(),
                    version_valid: false,
                }
            }
        }
        Err(_) => NodeEnvStatus {
            installed: false,
            version: String::new(),
            version_valid: false,
        },
    }
}

#[tauri::command]
pub fn install_node() -> Result<String, String> {
    let platform = std::env::consts::OS;

    let install_cmd = match platform {
        "windows" => vec![
            "powershell",
            "-NoProfile",
            "-Command",
            "winget install OpenJS.NodeJS.LTS --silent --accept-package-agreements --accept-source-agreements",
        ],
        "macos" => vec!["sh", "-c", "brew install node@22"],
        "linux" => vec!["sh", "-c", "curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - && sudo apt-get install -y nodejs"],
        _ => return Err(format!("Unsupported platform: {}", platform)),
    };

    let output = Command::new(&install_cmd[0])
        .args(&install_cmd[1..])
        .output();

    match output {
        Ok(result) => {
            if result.status.success() {
                Ok("Node.js installation completed".to_string())
            } else {
                let error = String::from_utf8_lossy(&result.stderr).to_string();
                Err(format!("Installation failed: {}", error))
            }
        }
        Err(e) => Err(format!("Failed to run installer: {}", e)),
    }
}

#[tauri::command]
pub fn check_openclaw_env() -> OpenClawEnvStatus {
    let output = Command::new("openclaw")
        .arg("--version")
        .output();

    let installed = match output {
        Ok(result) => result.status.success(),
        Err(_) => false,
    };

    let initialized = if installed {
        let home = dirs::home_dir().unwrap_or_else(|| PathBuf::from("."));
        let config_path = home.join(".openclaw").join("config.json");
        config_path.exists()
    } else {
        false
    };

    let version = if installed {
        if let Ok(result) = Command::new("openclaw").arg("--version").output() {
            if result.status.success() {
                String::from_utf8_lossy(&result.stdout).trim().to_string()
            } else {
                String::new()
            }
        } else {
            String::new()
        }
    } else {
        String::new()
    };

    OpenClawEnvStatus {
        installed,
        version,
        initialized,
    }
}

#[tauri::command]
pub fn install_openclaw() -> Result<String, String> {
    let output = Command::new("npm")
        .args(["install", "-g", "openclaw"])
        .output();

    match output {
        Ok(result) => {
            if result.status.success() {
                Ok("OpenClaw installation completed".to_string())
            } else {
                let error = String::from_utf8_lossy(&result.stderr).to_string();
                Err(format!("Installation failed: {}", error))
            }
        }
        Err(e) => Err(format!("Failed to run npm: {}", e)),
    }
}

#[tauri::command]
pub fn check_openclaw_init() -> Result<bool, String> {
    let home = dirs::home_dir().unwrap_or_else(|| PathBuf::from("."));
    let config_path = home.join(".openclaw").join("config.json");

    Ok(config_path.exists())
}

#[tauri::command]
pub fn run_openclaw_onboard() -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        Command::new("powershell")
            .args(["-NoProfile", "-Command", "Start-Process cmd -ArgumentList '/c', 'openclaw onboard' -Verb RunAs"])
            .spawn()
            .map_err(|e| e.to_string())?;
    }

    #[cfg(target_os = "macos")]
    {
        Command::new("open")
            .args(["-a", "Terminal", "--args", "-c", "openclaw onboard; exit"])
            .spawn()
            .map_err(|e| e.to_string())?;
    }

    #[cfg(target_os = "linux")]
    {
        Command::new("sh")
            .args(["-c", "openclaw onboard"])
            .spawn()
            .map_err(|e| e.to_string())?;
    }

    Ok(())
}

#[tauri::command]
pub fn get_env_status() -> EnvCheckStatus {
    let node_status = check_node_env();
    let openclaw_status = check_openclaw_env();
    let skipped = load_skipped_status();

    EnvCheckStatus {
        node: node_status,
        openclaw: openclaw_status,
        skipped,
    }
}

#[tauri::command]
pub fn open_manual_install_node() -> Result<(), String> {
    let platform = std::env::consts::OS;
    let url = match platform {
        "windows" => "https://nodejs.org/",
        "macos" => "https://nodejs.org/",
        "linux" => "https://nodejs.org/",
        _ => return Err(format!("Unsupported platform: {}", platform)),
    };

    #[cfg(target_os = "windows")]
    {
        Command::new("cmd")
            .args(["/c", "start", url])
            .spawn()
            .map_err(|e| e.to_string())?;
    }

    #[cfg(target_os = "macos")]
    {
        Command::new("open")
            .arg(url)
            .spawn()
            .map_err(|e| e.to_string())?;
    }

    #[cfg(target_os = "linux")]
    {
        Command::new("xdg-open")
            .arg(url)
            .spawn()
            .map_err(|e| e.to_string())?;
    }

    Ok(())
}
