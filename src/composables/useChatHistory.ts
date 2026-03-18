import { ref } from 'vue'
import { invoke } from '@tauri-apps/api/core'

export interface ChatHistoryMessage {
  msg_type: 'user' | 'bot'
  content: string
  timestamp: number
}

export function useChatHistory() {
  const isLoading = ref(false)

  async function loadHistory(): Promise<ChatHistoryMessage[]> {
    isLoading.value = true
    try {
      const messages = await invoke<ChatHistoryMessage[]>('load_chat_history_cmd')
      return messages
    } catch (e) {
      console.error('Failed to load chat history:', e)
      return []
    } finally {
      isLoading.value = false
    }
  }

  async function saveHistory(messages: ChatHistoryMessage[]): Promise<void> {
    try {
      // Only save last 100 messages
      const trimmed = messages.slice(-100)
      await invoke('save_chat_history_cmd', { messages: trimmed })
    } catch (e) {
      console.error('Failed to save chat history:', e)
    }
  }

  async function clearHistory(): Promise<void> {
    try {
      await invoke('clear_chat_history')
    } catch (e) {
      console.error('Failed to clear chat history:', e)
    }
  }

  return {
    isLoading,
    loadHistory,
    saveHistory,
    clearHistory,
  }
}
