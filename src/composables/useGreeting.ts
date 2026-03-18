import { ref, onUnmounted } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import { useNotification } from './useNotification'

export interface GreetingConfig {
  enabled: boolean
  time: string // HH:mm format
  message: string
  interval: 'daily' | 'hourly'
}

const DEFAULT_GREETING: GreetingConfig = {
  enabled: false,
  time: '09:00',
  message: '早上好呀！新的一天也要开心哦~',
  interval: 'daily',
}

export function useGreeting() {
  const config = ref<GreetingConfig>({ ...DEFAULT_GREETING })
  const { notify } = useNotification()
  let checkInterval: number | null = null
  let lastTriggerDate = ''

  // Callback: triggered when greeting is sent
  let onGreetingTriggered: ((message: string) => void) | null = null

  function setOnGreetingTriggered(callback: (message: string) => void) {
    onGreetingTriggered = callback
  }

  async function loadConfig() {
    try {
      const saved = await invoke<string | null>('get_setting', { key: 'greeting_config' })
      if (saved) {
        config.value = { ...DEFAULT_GREETING, ...JSON.parse(saved) }
      }
    } catch (e) {
      console.error('Failed to load greeting config:', e)
    }
  }

  async function saveConfig() {
    try {
      await invoke('save_setting', {
        key: 'greeting_config',
        value: JSON.stringify(config.value),
      })
    } catch (e) {
      console.error('Failed to save greeting config:', e)
    }
  }

  function updateConfig(newConfig: Partial<GreetingConfig>) {
    config.value = { ...config.value, ...newConfig }
    saveConfig()
    if (config.value.enabled) {
      startChecking()
    } else {
      stopChecking()
    }
  }

  function shouldTrigger(): boolean {
    const now = new Date()
    const today = now.toISOString().split('T')[0]
    const currentTime = now.toTimeString().slice(0, 5) // HH:mm

    if (config.value.interval === 'daily') {
      // Once per day: check if target time reached and hasn't triggered today
      return currentTime >= config.value.time && lastTriggerDate !== today
    } else {
      // Hourly: check if current hour matches and same minute prefix, hasn't triggered this hour
      const currentHour = now.getHours()
      const [targetHour] = config.value.time.split(':').map(Number)
      return currentHour === targetHour && currentTime.startsWith(config.value.time.slice(0, 3)) && lastTriggerDate !== `${today}-${currentHour}`
    }
  }

  function checkAndTrigger() {
    if (!config.value.enabled) return

    if (shouldTrigger()) {
      const now = new Date()
      const today = now.toISOString().split('T')[0]

      // Record trigger time
      if (config.value.interval === 'daily') {
        lastTriggerDate = today
      } else {
        lastTriggerDate = `${today}-${now.getHours()}`
      }

      // Send greeting message
      if (onGreetingTriggered) {
        onGreetingTriggered(config.value.message)
      }

      // Send notification
      notify('Nova Link', config.value.message)
    }
  }

  function startChecking() {
    if (checkInterval) return
    // Check every minute
    checkInterval = window.setInterval(checkAndTrigger, 60000)
    // Check immediately
    checkAndTrigger()
  }

  function stopChecking() {
    if (checkInterval) {
      clearInterval(checkInterval)
      checkInterval = null
    }
  }

  function init(callback: (message: string) => void) {
    setOnGreetingTriggered(callback)
    loadConfig().then(() => {
      if (config.value.enabled) {
        startChecking()
      }
    })
  }

  onUnmounted(() => {
    stopChecking()
  })

  return {
    config,
    updateConfig,
    loadConfig,
    saveConfig,
    startChecking,
    stopChecking,
    init,
    setOnGreetingTriggered,
  }
}
