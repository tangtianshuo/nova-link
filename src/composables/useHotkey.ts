import { onUnmounted } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import { listen, type UnlistenFn } from '@tauri-apps/api/event'

export interface HotkeyConfig {
  shortcut: string
  action: 'toggle_chat' | 'toggle_window' | 'switch_model'
}

export function useHotkey() {
  const registeredShortcuts: string[] = []
  let unlistenToggleChat: UnlistenFn | null = null

  async function register(configs: HotkeyConfig[]) {
    for (const config of configs) {
      try {
        await invoke('register_global_shortcut', {
          shortcut: config.shortcut,
          action: config.action,
        })
        registeredShortcuts.push(config.shortcut)
      } catch (e) {
        console.error(`Failed to register shortcut ${config.shortcut}:`, e)
      }
    }
  }

  async function unregister(shortcut: string) {
    try {
      await invoke('unregister_global_shortcut', { shortcut })
      const idx = registeredShortcuts.indexOf(shortcut)
      if (idx > -1) registeredShortcuts.splice(idx, 1)
    } catch (e) {
      console.error(`Failed to unregister shortcut ${shortcut}:`, e)
    }
  }

  async function unregisterAll() {
    for (const shortcut of [...registeredShortcuts]) {
      await unregister(shortcut)
    }
  }

  async function setupDefaultHotkeys() {
    // Default hotkey: Ctrl+Shift+N to toggle chat
    await register([
      { shortcut: 'Ctrl+Shift+N', action: 'toggle_chat' },
      { shortcut: 'Ctrl+Shift+H', action: 'toggle_window' },
    ])
  }

  async function init() {
    // Listen for hotkey events from Rust
    unlistenToggleChat = await listen('toggle-chat', () => {
      // Trigger chat panel toggle
      window.dispatchEvent(new CustomEvent('hotkey-toggle-chat'))
    })
    await setupDefaultHotkeys()
  }

  onUnmounted(() => {
    unlistenToggleChat?.()
    unregisterAll()
  })

  return {
    register,
    unregister,
    unregisterAll,
    init,
  }
}
