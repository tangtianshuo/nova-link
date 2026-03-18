import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';

export enum AppType {
  Coding = "Coding",
  Browsing = "Browsing",
  Media = "Media",
  Communication = "Communication",
  Gaming = "Gaming",
  System = "System",
  Unknown = "Unknown"
}

export interface ActiveWindowInfo {
  title: string;
  process_name: string;
  app_type: AppType;
}

const MONITORING_INTERVAL = 1000; // 1 second

export async function startMonitoring(): Promise<void> {
  try {
    // Tauri automatically converts camelCase JS args to snake_case Rust args
    await invoke('start_monitoring', { intervalMs: MONITORING_INTERVAL });
    console.log('Window monitoring started');
  } catch (error) {
    console.error('Failed to start window monitoring:', error);
  }
}

export async function stopMonitoring(): Promise<void> {
  try {
    await invoke('stop_monitoring');
    console.log('Window monitoring stopped');
  } catch (error) {
    console.error('Failed to stop window monitoring:', error);
  }
}

export async function getActiveWindowInfo(): Promise<ActiveWindowInfo | null> {
  try {
    return await invoke<ActiveWindowInfo>('get_active_window_info');
  } catch (error) {
    console.error('Failed to get active window info:', error);
    return null;
  }
}

export async function listenForWindowChanges(
  callback: (info: ActiveWindowInfo) => void
): Promise<UnlistenFn> {
  return await listen<ActiveWindowInfo>('active-window-changed', (event) => {
    callback(event.payload);
  });
}

/**
 * Captures the primary screen and returns it as a base64 PNG string.
 * @returns Base64 string of the PNG image
 */
export async function captureScreen(): Promise<string> {
  try {
    return await invoke<string>('capture_screen');
  } catch (error) {
    console.error('Failed to capture screen:', error);
    throw error;
  }
}

/**
 * Simulates typing the given text.
 * @param text The text to type
 */
export async function simulateTyping(text: string): Promise<void> {
  try {
    await invoke('simulate_typing', { text });
  } catch (error) {
    console.error('Failed to simulate typing:', error);
    throw error;
  }
}

/**
 * Simulates pressing a specific key.
 * @param key The key to press (e.g., "Enter", "Tab", "Space", "Up", "Down")
 */
export async function simulateKey(key: string): Promise<void> {
  try {
    await invoke('simulate_key', { key });
  } catch (error) {
    console.error('Failed to simulate key:', error);
    throw error;
  }
}
