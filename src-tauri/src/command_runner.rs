use std::process::Command;

/// 跨平台命令执行器
pub struct CommandRunner;

impl CommandRunner {
    /// 在后台执行命令
    ///
    /// # Arguments
    /// * `command` - 要执行的命令
    ///
    /// # Returns
    /// * `Ok(())` - 进程已成功启动
    /// * `Err(String)` - 启动失败
    pub fn run_background(command: &str) -> Result<(), String> {
        #[cfg(target_os = "windows")]
        {
            // Windows: 使用 PowerShell 启动
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
                Ok(_process) => Ok(()),
                Err(e) => {
                    let error_msg = format!("Failed to start command: {}", e);
                    log::error!("{}", error_msg);
                    Err(error_msg)
                }
            }
        }

        #[cfg(target_os = "macos")]
        {
            // macOS: 使用 Terminal 打开命令
            // 使用 open 命令在 Terminal 中执行
            let child = Command::new("open")
                .args(["-a", "Terminal", "--args", "-c", &format!("{}; exit", command)])
                .spawn();

            match child {
                Ok(_process) => Ok(()),
                Err(e) => {
                    // 如果 open 失败，尝试直接执行
                    let child2 = Command::new("sh")
                        .args(["-c", command])
                        .spawn();

                    match child2 {
                        Ok(_) => Ok(()),
                        Err(e2) => {
                            let error_msg = format!("Failed to start command: {} and fallback failed: {}", e, e2);
                            log::error!("{}", error_msg);
                            Err(error_msg)
                        }
                    }
                }
            }
        }

        #[cfg(not(any(target_os = "windows", target_os = "macos")))]
        {
            // Linux: 使用 sh 执行
            let child = Command::new("sh")
                .args(["-c", command])
                .spawn();

            match child {
                Ok(_process) => Ok(()),
                Err(e) => {
                    let error_msg = format!("Failed to start command: {}", e);
                    log::error!("{}", error_msg);
                    Err(error_msg)
                }
            }
        }
    }

    /// 执行 openclaw gateway 命令
    pub fn run_openclaw_gateway() -> Result<(), String> {
        #[cfg(target_os = "macos")]
        {
            // macOS: 直接执行 openclaw 命令
            Self::run_background("openclaw gateway")
        }

        #[cfg(not(target_os = "macos"))]
        {
            Self::run_background("openclaw gateway")
        }
    }
}
