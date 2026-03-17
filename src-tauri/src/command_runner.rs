use std::process::Command;

#[cfg(target_os = "macos")]
use std::process::Command as MacCommand;
#[cfg(target_os = "linux")]
use std::process::Command as LinuxCommand;

/// 跨平台命令执行器
pub struct CommandRunner;

impl CommandRunner {
    /// 获取当前平台名称
    pub fn get_platform_name() -> &'static str {
        #[cfg(target_os = "windows")]
        {
            "Windows"
        }
        #[cfg(target_os = "macos")]
        {
            "macOS"
        }
        #[cfg(target_os = "linux")]
        {
            "Linux"
        }
        #[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
        {
            "Unknown"
        }
    }

    /// 在后台执行命令
    ///
    /// # Arguments
    /// * `command` - 要执行的命令
    ///
    /// # Returns
    /// * `Ok(())` - 进程已成功启动
    /// * `Err(String)` - 启动失败
    pub fn run_background(command: &str) -> Result<(), String> {
        let platform = Self::get_platform_name();
        log::info!("检测到平台: {}, 正在启动 Gateway...", platform);

        #[cfg(target_os = "windows")]
        {
            Self::run_on_windows(command)
        }

        #[cfg(target_os = "macos")]
        {
            Self::run_on_macos(command)
        }

        #[cfg(target_os = "linux")]
        {
            Self::run_on_linux(command)
        }

        #[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
        {
            Err(format!("不支持的平台: {}", std::env::consts::OS))
        }
    }

    #[cfg(target_os = "windows")]
    fn run_on_windows(command: &str) -> Result<(), String> {
        let ps_command = format!(
            "Start-Process powershell -ArgumentList '-NoProfile', '-NonInteractive', '-Command', '{}' -WindowStyle Hidden",
            command.replace("'", "''")
        );

        let child = Command::new("powershell")
            .args([
                "-NoProfile",
                "-NonInteractive",
                "-WindowStyle",
                "Hidden",
                "-Command",
                &ps_command,
            ])
            .spawn();

        match child {
            Ok(_process) => {
                log::info!("Windows 平台: Gateway 命令已启动");
                Ok(())
            }
            Err(e) => {
                let error_msg = format!("Failed to start command: {}", e);
                log::error!("{}", error_msg);
                Err(error_msg)
            }
        }
    }

    #[cfg(target_os = "macos")]
    fn run_on_macos(command: &str) -> Result<(), String> {
        let child = MacCommand::new("open")
            .args(["-a", "Terminal", "--args", "-c", &format!("{}; exit", command)])
            .spawn();

        match child {
            Ok(_process) => {
                log::info!("macOS 平台: Gateway 命令已在 Terminal 中启动");
                Ok(())
            }
            Err(e) => {
                let child2 = MacCommand::new("sh")
                    .args(["-c", command])
                    .spawn();

                match child2 {
                    Ok(_) => {
                        log::info!("macOS 平台: Gateway 命令已通过 sh 启动");
                        Ok(())
                    }
                    Err(e2) => {
                        let error_msg = format!("Failed to start command: {} and fallback failed: {}", e, e2);
                        log::error!("{}", error_msg);
                        Err(error_msg)
                    }
                }
            }
        }
    }

    #[cfg(target_os = "linux")]
    fn run_on_linux(command: &str) -> Result<(), String> {
        let child = LinuxCommand::new("sh")
            .args(["-c", command])
            .spawn();

        match child {
            Ok(_process) => {
                log::info!("Linux 平台: Gateway 命令已启动");
                Ok(())
            }
            Err(e) => {
                let error_msg = format!("Failed to start command: {}", e);
                log::error!("{}", error_msg);
                Err(error_msg)
            }
        }
    }

    /// 执行 openclaw gateway 命令
    pub fn run_openclaw_gateway() -> Result<(), String> {
        let platform = Self::get_platform_name();
        log::info!("正在为 {} 平台启动 Gateway...", platform);

        #[cfg(target_os = "windows")]
        {
            let command = "openclaw gateway";
            log::debug!("Windows 平台执行命令: {}", command);
            Self::run_background(command)
        }

        #[cfg(target_os = "macos")]
        {
            let command = "openclaw gateway";
            log::debug!("macOS 平台执行命令: {}", command);
            Self::run_background(command)
        }

        #[cfg(target_os = "linux")]
        {
            let command = "openclaw gateway";
            log::debug!("Linux 平台执行命令: {}", command);
            Self::run_background(command)
        }

        #[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
        {
            Err(format!("不支持的平台: {}", std::env::consts::OS))
        }
    }
}
