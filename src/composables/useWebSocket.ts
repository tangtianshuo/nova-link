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

  // 自动重连相关
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null
  let reconnectUrl: string = ""
  let reconnectToken: string = ""
  const RECONNECT_INTERVAL = 5000 // 5秒重连一次

  function connectWebSocket(url: string, token?: string): void {
    console.log("[useWebSocket] Connecting to Gateway with params:", {
      url,
      token: token ? "***" : "",
    })

    // 保存连接参数用于重连
    reconnectUrl = url
    reconnectToken = token || ""

    if (gwClient) {
      console.log("[useWebSocket] Disconnecting existing Gateway client")
      gwClient.disconnect()
    }

    // 清除重连定时器
    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }

    console.log("[useWebSocket] Creating new GatewayClient...")
    gwClient = new GatewayClient({
      url,
      token,
      onStatusChange: (status) => {
        console.log("[useWebSocket] Gateway status changed:", status)
        wsStatus.value = status as WsStatus
        options.onStatusChange?.(status as WsStatus)
      },
      onMessage: (message) => {
        console.log("[useWebSocket] Gateway message received:", message)

        // 过滤掉 content 中 type 为 thinking 的内容
        const filteredContent = message.content?.filter((c: any) => c.type !== "thinking") || []

        // 提取消息内容中的情绪
        const content = filteredContent?.[0]?.text || ''
        const { content: cleanContent, emotion } = extractEmotion(content)

        // 如果包含情绪，触发情绪回调
        if (emotion) {
          console.log("[useWebSocket] Emotion detected:", emotion)
          options.onEmotion?.(emotion)
        }

        // 返回处理后的消息
        options.onMessage?.({
          ...message,
          content: [{ text: cleanContent }],
          _emotion: emotion
        })
      },
      onStreamUpdate: (text) => {
        console.log("[useWebSocket] Gateway stream update:", text)
        // 解析流式内容中的情绪
        const { content, emotion } = extractEmotion(text)

        // 如果发现情绪标签，触发情绪回调
        if (emotion) {
          console.log("[useWebSocket] Stream emotion detected:", emotion)
          options.onEmotion?.(emotion)
        }

        options.onStreamUpdate?.(content)
      },
      onMessageStart: (payload) => {
        console.log("[useWebSocket] Message start:", payload)
        options.onMessageStart?.(payload)
      },
      onContentDelta: (payload) => {
        console.log("[useWebSocket] Content delta:", payload.delta)
        options.onContentDelta?.(payload)
      },
      onMessageDelta: (payload) => {
        console.log("[useWebSocket] Message delta:", payload)
      },
      onMessageStop: (payload) => {
        console.log("[useWebSocket] Message stop:", payload)
        options.onMessageStop?.(payload)
      },
      onToolUse: (payload) => {
        console.log("[useWebSocket] Tool use:", payload)
      },
      onToolResult: (payload) => {
        console.log("[useWebSocket] Tool result:", payload)
      },
      onConnected: (hello) => {
        console.log("[useWebSocket] Gateway connected, version:", hello.server.version)
        // 连接成功后清除重连定时器
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
        console.log("[useWebSocket] Gateway disconnected, scheduling reconnect...")
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
      return // 已经在等待重连
    }
    console.log(`[useWebSocket] Scheduling reconnect in ${RECONNECT_INTERVAL}ms...`)
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null
      if (reconnectUrl) {
        console.log("[useWebSocket] Attempting to reconnect...")
        connectWebSocket(reconnectUrl, reconnectToken)
      }
    }, RECONNECT_INTERVAL)
  }

  function disconnectWebSocket(): void {
    // 清除重连定时器
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
      console.log("[useWebSocket] Sending message via Gateway:", content)
      await gwClient.sendMessage({ message: content })
      console.log("[useWebSocket] Message sent successfully")
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
