use std::process::Command;

/// 执行后台 PowerShell 脚本的工具类
pub struct PowerShellRunner;

impl PowerShellRunner {
    /// 在后台执行 PowerShell 命令
    ///
    /// # Arguments
    /// * `command` - 要执行的 PowerShell 命令
    ///
    /// # Returns
    /// * `Ok(())` - 进程已成功启动
    /// * `Err(String)` - 启动失败
    pub fn run_background(command: &str) -> Result<(), String> {
        // 使用 PowerShell 的 -NoProfile -NonInteractive 标志
        // 使用 -WindowStyle Hidden 隐藏窗口
        // 使用 Start-Process 在后台运行
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
                let error_msg = format!("Failed to start PowerShell: {}", e);
                log::error!("{}", error_msg);
                Err(error_msg)
            }
        }
    }

    /// 执行 openclaw gateway 命令
    pub fn run_openclaw_gateway() -> Result<(), String> {
        Self::run_background("openclaw gateway")
    }
}
