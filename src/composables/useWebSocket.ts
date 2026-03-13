import { ref } from "vue"
import { GatewayClient } from "../sdk/index.js"
import type { EmotionData } from "../sdk/types"
import { extractEmotion } from "../utils/emotionParser"

export type WsStatus = "connected" | "connecting" | "disconnected" | "error"

export interface UseWebSocketOptions {
  onMessage?: (message: any) => void
  onStatusChange?: (status: WsStatus) => void
  onStreamUpdate?: (text: string) => void
  onMessageStart?: (payload: any) => void
  onContentDelta?: (payload: any) => void
  onMessageStop?: (payload: any) => void
  onConnected?: (hello: any) => void
  onError?: (error: string) => void
  onEmotion?: (emotion: EmotionData) => void
  onDisconnected?: () => void
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const wsStatus = ref<WsStatus>("disconnected")
  let gwClient: GatewayClient | null = null

  let reconnectTimer: ReturnType<typeof setTimeout> | null = null
  let reconnectUrl: string = ""
  let reconnectToken: string = ""
  const RECONNECT_INTERVAL = 5000

  function connectWebSocket(url: string, token?: string): void {
    reconnectUrl = url
    reconnectToken = token || ""

    if (gwClient) {
      gwClient.disconnect()
    }

    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }

    gwClient = new GatewayClient({
      url,
      token,
      onStatusChange: (status) => {
        wsStatus.value = status as WsStatus
        options.onStatusChange?.(status as WsStatus)
      },
      onMessage: (message) => {
        const filteredContent = message.content?.filter((c: any) => c.type !== "thinking") || []
        const content = filteredContent?.[0]?.text || ''
        const { content: cleanContent, emotion } = extractEmotion(content)

        if (emotion) {
          options.onEmotion?.(emotion)
        }

        options.onMessage?.({
          ...message,
          content: [{ text: cleanContent }],
          _emotion: emotion
        })
      },
      onStreamUpdate: (text) => {
        const { content, emotion } = extractEmotion(text)

        if (emotion) {
          options.onEmotion?.(emotion)
        }

        options.onStreamUpdate?.(content)
      },
      onMessageStart: (payload) => {
        options.onMessageStart?.(payload)
      },
      onContentDelta: (payload) => {
        options.onContentDelta?.(payload)
      },
      onMessageDelta: () => {},
      onMessageStop: (payload) => {
        options.onMessageStop?.(payload)
      },
      onToolUse: () => {},
      onToolResult: () => {},
      onConnected: (hello) => {
        if (reconnectTimer) {
          clearTimeout(reconnectTimer)
          reconnectTimer = null
        }
        options.onConnected?.(hello)
      },
      onError: (error) => {
        console.error("[useWebSocket] Gateway error:", error)
        options.onError?.(error)
      },
      onDisconnected: () => {
        scheduleReconnect()
      },
    })

    gwClient.connect().catch((err) => {
      console.error("Failed to connect to Gateway:", err)
      scheduleReconnect()
    })
  }

  function scheduleReconnect(): void {
    if (reconnectTimer) {
      return
    }
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null
      if (reconnectUrl) {
        connectWebSocket(reconnectUrl, reconnectToken)
      }
    }, RECONNECT_INTERVAL)
  }

  function disconnectWebSocket(): void {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }
    reconnectUrl = ""
    reconnectToken = ""

    if (gwClient) {
      gwClient.disconnect()
      gwClient = null
    }
    wsStatus.value = "disconnected"
  }

  async function sendMessage(content: string): Promise<void> {
    if (gwClient && gwClient.isConnected) {
      await gwClient.sendMessage({ message: content })
    } else {
      throw new Error("Gateway not connected")
    }
  }

  function isConnected(): boolean {
    return gwClient?.isConnected ?? false
  }

  async function loadHistory(limit: number = 20): Promise<any> {
    if (gwClient && gwClient.isConnected) {
      return await gwClient.loadHistory(undefined, limit)
    }
    return null
  }

  return {
    wsStatus,
    connectWebSocket,
    disconnectWebSocket,
    sendMessage,
    isConnected,
    loadHistory,
  }
}
