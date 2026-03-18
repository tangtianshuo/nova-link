mod command_runner;
mod commands;
mod config;
mod mcp;
mod state;
mod tray;
mod window;

use state::AppState;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    env_logger::init();

    let mut builder = tauri::Builder::default().plugin(tauri_plugin_opener::init());

    #[cfg(desktop)]
    {
        builder = builder
            .plugin(tauri_plugin_process::init())
            .plugin(tauri_plugin_updater::Builder::new().build())
            .plugin(tauri_plugin_autostart::init(
                tauri_plugin_autostart::MacosLauncher::LaunchAgent,
                Some(vec!["--minimized"]),
            ))
            .plugin(tauri_plugin_global_shortcut::Builder::new().build())
            .plugin(tauri_plugin_notification::init());
    }

    builder
        .manage(AppState::default())
        .manage(commands::window_monitor::WindowMonitorState::default())
        .invoke_handler(tauri::generate_handler![
            // Environment Check
            commands::get_env_check_skipped,
            commands::skip_env_check,
            commands::check_node_env,
            commands::install_node,
            commands::check_openclaw_env,
            commands::install_openclaw,
            commands::check_openclaw_init,
            commands::run_openclaw_onboard,
            commands::get_env_status,
            commands::open_manual_install_node,
            // Chat
            commands::chat_with_llm,
            commands::update_llm_config,
            // Window
            commands::set_window_size,
            commands::get_window_size,
            commands::set_default_window_size,
            commands::has_window_state,
            commands::set_click_through,
            commands::is_click_through_enabled,
            // Settings
            commands::save_setting,
            commands::get_setting,
            commands::gateway::run_gateway,
            // Identity
            commands::save_identity,
            commands::load_identity_from_file,
            // User
            commands::save_user,
            commands::load_user_from_file,
            // Soul (结构化数据)
            commands::save_soul,
            commands::load_soul_from_file,
            // MCP
            commands::start_mcp_server,
            commands::start_mcp_server_with_config,
            commands::stop_mcp_server,
            commands::get_mcp_tools,
            commands::get_mcp_status,
            commands::get_mcp_config,
            commands::handle_mcp_request,
            commands::is_mcp_server_running,
            // Autostart
            commands::enable_autostart,
            commands::disable_autostart,
            commands::is_autostart_enabled,
            // Hotkey
            commands::register_global_shortcut,
            commands::unregister_global_shortcut,
            // Chat History
            commands::save_chat_history_cmd,
            commands::load_chat_history_cmd,
            commands::clear_chat_history,
            // Window Monitor
            commands::window_monitor::start_monitoring,
            commands::window_monitor::stop_monitoring,
            commands::window_monitor::get_active_window_info,
            commands::window_monitor::capture_screen,
            commands::window_monitor::simulate_typing,
            commands::window_monitor::simulate_key,
        ])
        .setup(|app| {
            println!("[DEBUG] Nova Link setup starting...");

            // 首次启动时初始化配置文件
            if let Err(e) = config::init_config_files() {
                println!("[ERROR] Failed to initialize config files: {}", e);
            }

            // 迁移现有 JSON 聊天历史到 SQLite
            if let Err(e) = config::migrate_json_to_sqlite() {
                println!("[WARN] Failed to migrate chat history to SQLite: {}", e);
            }

            // 首次启动时根据屏幕尺寸计算窗口大小
            // 如果之前有保存的状态，会被 has_window_state() 检测到并恢复
            let has_saved_state = config::has_window_state();
            println!("[DEBUG] Has saved window state: {}", has_saved_state);

            if let Some(window) = app.get_webview_window("main") {
                if has_saved_state {
                    // 如果有保存的状态，从配置文件恢复
                    if let Ok(Some(state)) = config::load_window_state() {
                        let _ = window.set_position(tauri::Position::Physical(
                            tauri::PhysicalPosition::new(state.x, state.y),
                        ));
                        let _ = window.set_size(tauri::Size::Physical(tauri::PhysicalSize::new(
                            state.width,
                            state.height,
                        )));
                        println!(
                            "[DEBUG] Window state restored: {}x{} at ({}, {})",
                            state.width, state.height, state.x, state.y
                        );
                    }
                } else {
                    // 首次启动，根据屏幕尺寸计算默认大小
                    if let Ok(monitor) = window.current_monitor() {
                        if let Some(monitor) = monitor {
                            let screen_size = monitor.size();
                            let width = (screen_size.width as f64 / 6.0) as u32;
                            let height = width * 2;
                            let min_width = 300u32;
                            let min_height = 400u32;
                            let w = width.max(min_width);
                            let h = height.max(min_height);
                            let _ = window
                                .set_size(tauri::Size::Physical(tauri::PhysicalSize::new(w, h)));
                            // 立即保存这个默认窗口状态
                            let _ = config::save_window_state(
                                0, // 首次使用默认位置（居中）
                                0, w, h,
                            );
                            println!(
                                "[DEBUG] Default window size set (saved): {}x{} (1/6 screen width)",
                                w, h
                            );
                        }
                    }
                }

                // 平台特定的透明窗口处理
                #[cfg(target_os = "macos")]
                {
                    window::setup_transparent_window(&window);
                    println!("[DEBUG] macOS transparent window setup complete");
                }

                // Windows 透明窗口处理
                #[cfg(target_os = "windows")]
                {
                    window::setup_transparent_window(&window);
                    println!("[DEBUG] Windows transparent window setup complete");
                }

                // Linux 透明窗口处理
                #[cfg(target_os = "linux")]
                {
                    window::setup_transparent_window(&window);
                    println!("[DEBUG] Linux transparent window setup complete");
                }
            }

            // 创建系统托盘
            tray::create_tray(app)?;

            Ok(())
        })
        .on_window_event(|window, event| {
            window::handle_window_event(window, &event);
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
