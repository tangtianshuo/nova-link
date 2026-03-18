import { ref } from 'vue'
import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from '@tauri-apps/plugin-notification'

export function useNotification() {
  const hasPermission = ref(false)

  async function checkPermission() {
    try {
      hasPermission.value = await isPermissionGranted()
    } catch (e) {
      console.error('Failed to check notification permission:', e)
    }
  }

  async function request() {
    try {
      let granted = await isPermissionGranted()
      if (!granted) {
        const permission = await requestPermission()
        granted = permission === 'granted'
      }
      hasPermission.value = granted
      return granted
    } catch (e) {
      console.error('Failed to request notification permission:', e)
      return false
    }
  }

  async function notify(title: string, body: string) {
    if (!hasPermission.value) {
      const granted = await request()
      if (!granted) return
    }

    try {
      sendNotification({ title, body })
    } catch (e) {
      console.error('Failed to send notification:', e)
    }
  }

  return {
    hasPermission,
    checkPermission,
    request,
    notify,
  }
}
