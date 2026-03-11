import { ref, nextTick } from "vue"

export interface ChatMessage {
  type: "user" | "bot"
  content: string
}

export function useChat() {
  const messages = ref<ChatMessage[]>([])
  const isChatVisible = ref(false)
  const isSending = ref(false)
  let lastBotMessageEl: HTMLElement | null = null

  function addMessage(type: "user" | "bot", content: string): void {
    messages.value.push({ type, content })

    nextTick(() => {
      const container = document.getElementById("messages")
      if (container) {
        container.scrollTop = container.scrollHeight
      }

      const chatPanel = document.getElementById("chat-panel")
      if (chatPanel?.classList.contains("hidden")) {
        toggleChat(true)
      }
    })
  }

  function toggleChat(show: boolean): void {
    isChatVisible.value = show
    if (show) {
      nextTick(() => {
        const inputEl = document.getElementById("message-input") as HTMLInputElement
        inputEl?.focus()
      })
    }
  }

  function clearMessages(): void {
    messages.value = []
    lastBotMessageEl = null
  }

  function updateLastBotMessage(text: string): void {
    if (lastBotMessageEl) {
      lastBotMessageEl.textContent = text
    } else {
      addMessage("bot", text)
      const msgEls = document.querySelectorAll(".message.bot")
      lastBotMessageEl = msgEls[msgEls.length - 1] as HTMLElement
    }
  }

  function startThinking(): void {
    addMessage("bot", "正在思考...")
    const msgEls = document.querySelectorAll(".message.bot")
    lastBotMessageEl = msgEls[msgEls.length - 1] as HTMLElement
  }

  function stopStreaming(): void {
    lastBotMessageEl = null
  }

  function handleKeyPress(e: KeyboardEvent, sendFn: () => void): void {
    if (e.key === "Enter") {
      sendFn()
    }
  }

  return {
    messages,
    isChatVisible,
    isSending,
    addMessage,
    toggleChat,
    clearMessages,
    updateLastBotMessage,
    startThinking,
    stopStreaming,
    handleKeyPress,
  }
}
