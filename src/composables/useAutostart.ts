import { ref } from 'vue'
import { invoke } from '@tauri-apps/api/core'

export function useAutostart() {
  const isEnabled = ref(false)

  async function checkStatus() {
    try {
      isEnabled.value = await invoke<boolean>('is_autostart_enabled')
    } catch (e) {
      console.error('Failed to check autostart status:', e)
    }
  }

  async function enable() {
    try {
      await invoke('enable_autostart')
      isEnabled.value = true
    } catch (e) {
      console.error('Failed to enable autostart:', e)
    }
  }

  async function disable() {
    try {
      await invoke('disable_autostart')
      isEnabled.value = false
    } catch (e) {
      console.error('Failed to disable autostart:', e)
    }
  }

  async function toggle() {
    if (isEnabled.value) {
      await disable()
    } else {
      await enable()
    }
  }

  return {
    isEnabled,
    checkStatus,
    enable,
    disable,
    toggle,
  }
}
