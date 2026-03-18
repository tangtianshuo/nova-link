import { onUnmounted } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import { listen, type UnlistenFn } from '@tauri-apps/api/event'
import { useSettings } from './useSettings'

export interface HotkeyConfig {
  shortcut: string
  action: 'toggle_chat' | 'toggle_window' | 'switch_model'
  enabled?: boolean
}

// Module-level flag to prevent duplicate event listeners
let refreshListenerAdded = false

export function useHotkey() {
  const registeredShortcuts: string[] = []
  let unlistenToggleChat: UnlistenFn | null = null
  const { settings } = useSettings()

  async function register(configs: HotkeyConfig[]) {
    for (const config of configs) {
      if (config.enabled === false) continue
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

  async function setupHotkeysFromSettings() {
    const hotkeySettings = settings.value.hotkeys
    if (hotkeySettings && hotkeySettings.length > 0) {
      await register(hotkeySettings)
    } else {
      // Fallback to defaults if no settings
      await register([
        { shortcut: 'Ctrl+Shift+N', action: 'toggle_chat', enabled: true },
        { shortcut: 'Ctrl+Shift+H', action: 'toggle_window', enabled: true },
      ])
    }
  }

  async function refreshHotkeys() {
    await unregisterAll()
    await setupHotkeysFromSettings()
  }

  async function init() {
    // Listen for hotkey events from Rust
    unlistenToggleChat = await listen('toggle-chat', () => {
      // Trigger chat panel toggle
      window.dispatchEvent(new CustomEvent('hotkey-toggle-chat'))
    })

    // Listen for refresh event from settings (only once)
    if (!refreshListenerAdded) {
      window.addEventListener('refresh-hotkeys', () => {
        refreshHotkeys()
      })
      refreshListenerAdded = true
    }

    await setupHotkeysFromSettings()
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
    refreshHotkeys,
    settings,
  }
}
