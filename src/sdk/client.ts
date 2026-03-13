// OpenClaw Gateway SDK - Client

import type {
	WsMessage,
	ChatEventPayload,
	ChatMessage,
	GatewayHelloOk,
	ConnectionStatus,
	GatewayClientOptions,
	SendMessageOptions,
	AbortOptions,
	ChatHistoryResponse,
	MessageStartPayload,
	ContentDeltaPayload,
	MessageDeltaPayload,
	MessageStopPayload,
	ToolUsePayload,
	ToolResultPayload,
} from "./types.js"

export class GatewayClient {
	private ws: WebSocket | null = null
	private pendingRequests: Map<
		string,
		{ resolve: (value: any) => void; reject: (reason: any) => void }
	> = new Map()
	private eventHandlers: Map<string, (payload: any) => void> = new Map()
	private requestId = 0
	private sessionKey: string
	private _currentRunId: string | null = null
	private _chatStream: string = ""
	private _chatMessages: ChatMessage[] = []
	private _connected = false
	private _status: ConnectionStatus = "disconnected"

	// Options
	private url: string
	private token?: string
	private autoReconnect: boolean
	private reconnectInterval: number
	private maxReconnectAttempts: number
	private reconnectAttempts = 0

	// Callbacks
	private onStatusChange?: (status: ConnectionStatus) => void
	private onMessage?: (message: ChatMessage) => void
	private onStreamUpdate?: (text: string) => void
	private onMessageStart?: (payload: MessageStartPayload) => void
	private onContentDelta?: (payload: ContentDeltaPayload) => void
	private onMessageDelta?: (payload: MessageDeltaPayload) => void
	private onMessageStop?: (payload: MessageStopPayload) => void
	private onToolUse?: (payload: ToolUsePayload) => void
	private onToolResult?: (payload: ToolResultPayload) => void
	private onError?: (error: string) => void
	private onConnected?: (hello: GatewayHelloOk) => void
	private onDisconnected?: () => void

	constructor(options: GatewayClientOptions) {
		this.url = options.url
		this.token = options.token
		this.sessionKey = options.sessionKey || "agent:main:main"
		this.autoReconnect = options.autoReconnect ?? true
		this.reconnectInterval = options.reconnectInterval ?? 3000
		this.maxReconnectAttempts = options.maxReconnectAttempts ?? 10

		this.onStatusChange = options.onStatusChange
		this.onMessage = options.onMessage
		this.onStreamUpdate = options.onStreamUpdate
		this.onMessageStart = options.onMessageStart
		this.onContentDelta = options.onContentDelta
		this.onMessageDelta = options.onMessageDelta
		this.onMessageStop = options.onMessageStop
		this.onToolUse = options.onToolUse
		this.onToolResult = options.onToolResult
		this.onError = options.onError
		this.onConnected = options.onConnected
		this.onDisconnected = options.onDisconnected

		this.setupEventHandlers()
	}

	private setupEventHandlers(): void {
		console.log("[Gateway] Setting up event handlers...")
		// 处理 chat 事件（标准格式）
		this.eventHandlers.set("chat", (payload: ChatEventPayload) => {
			console.log("[Gateway] chat event received:", payload)
			this.handleChatEvent(payload)
		})
		// 处理 agent 事件（OpenClaw Gateway 格式）
		this.eventHandlers.set("agent", (payload: any) => {
			console.log(
				"[Gateway] agent event received:",
				JSON.stringify(payload, null, 2),
			)

			// 处理生命周期事件
			if (payload.stream === "lifecycle") {
				if (payload.data?.phase === "start") {
					// 开始思考
					console.log("[Gateway] Agent started, showing thinking...")
					this.onMessageStart?.(payload)
				} else if (
					payload.data?.phase === "end" ||
					payload.data?.phase === "done"
				) {
					// 消息结束，删除"正在思考"提示
					console.log(
						"[Gateway] Agent lifecycle end, current stream:",
						this._chatStream,
					)
					this.onMessageStop?.(payload)

					// 如果有流式内容，先发送
					if (this._chatStream && this._chatStream.trim()) {
						const chatPayload: ChatEventPayload = {
							sessionKey: payload.sessionKey || this.sessionKey,
							runId: payload.runId,
							state: "final",
							message: {
								role: "assistant",
								content: [{ type: "text", text: this._chatStream }],
							},
						}
						this.handleChatEvent(chatPayload)
					} else {
						// 没有流式内容，尝试获取历史消息
						console.log("[Gateway] No stream content, fetching history...")
						this.loadHistory(undefined, 1)
							.then((result: any) => {
								console.log("[Gateway] History result:", result)
								if (result.messages && result.messages.length > 0) {
									const latestMsg = result.messages[result.messages.length - 1]
									console.log("[Gateway] Latest message:", latestMsg)
									if (latestMsg.role === "assistant") {
										this.onMessage?.(latestMsg)
									}
								}
							})
							.catch((err: any) => {
								console.error("[Gateway] Failed to get history:", err)
							})
					}
				}
				return
			}

			// 处理消息内容 - stream 可以是 message, text, output 等
			if (
				payload.stream === "message" ||
				payload.stream === "text" ||
				payload.stream === "output"
			) {
				// 从 data 中提取文本
				let text = ""
				if (payload.data) {
					text =
						payload.data.content ||
						payload.data.text ||
						payload.data.output ||
						payload.data.message ||
						""
				}
				console.log("[Gateway] Processing agent message text:", text)
				if (text) {
					this._chatStream = text
					this.onStreamUpdate?.(text)

					const chatPayload: ChatEventPayload = {
						sessionKey: payload.sessionKey || this.sessionKey,
						runId: payload.runId,
						state: "delta",
						message: {
							role: "assistant",
							content: [{ type: "text", text }],
						},
					}
					this.handleChatEvent(chatPayload)
				}
			}
		})
		this.eventHandlers.set("message_start", (payload: MessageStartPayload) => {
			console.log("[Gateway] message_start event received:", payload)
			this.onMessageStart?.(payload)
		})
		this.eventHandlers.set("content_delta", (payload: ContentDeltaPayload) => {
			console.log("[Gateway] content_delta event received:", payload)
			this.onContentDelta?.(payload)
			this._chatStream += payload.delta
			this.onStreamUpdate?.(this._chatStream)
		})
		this.eventHandlers.set("message_delta", (payload: MessageDeltaPayload) => {
			console.log("[Gateway] message_delta event received:", payload)
			this.onMessageDelta?.(payload)
		})
		this.eventHandlers.set("message_stop", (payload: MessageStopPayload) => {
			console.log("[Gateway] message_stop event received:", payload)
			this.onMessageStop?.(payload)
		})
		this.eventHandlers.set("tool_use", (payload: ToolUsePayload) => {
			console.log("[Gateway] tool_use event received:", payload)
			this.onToolUse?.(payload)
		})
		this.eventHandlers.set("tool_result", (payload: ToolResultPayload) => {
			console.log("[Gateway] tool_result event received:", payload)
			this.onToolResult?.(payload)
		})
		this.eventHandlers.set(
			"error",
			(payload: { error: string; code?: string }) => {
				console.log("[Gateway] error event received:", payload)
				this.onError?.(payload.error)
			},
		)
		console.log(
			"[Gateway] Event handlers registered:",
			Array.from(this.eventHandlers.keys()),
		)
	}

	private setStatus(status: ConnectionStatus): void {
		this._status = status
		this.onStatusChange?.(status)
	}

	get status(): ConnectionStatus {
		return this._status
	}

	get isConnected(): boolean {
		return this._connected
	}

	get messages(): ChatMessage[] {
		return [...this._chatMessages]
	}

	get currentStream(): string {
		return this._chatStream
	}

	get currentRunId(): string | null {
		return this._currentRunId
	}

	private generateId(): string {
		return `req-${Date.now()}-${++this.requestId}`
	}

	private generateUUID(): string {
		return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
			const r = (Math.random() * 16) | 0
			const v = c === "x" ? r : (r & 0x3) | 0x8
			return v.toString(16)
		})
	}

	async connect(): Promise<GatewayHelloOk> {
		return new Promise((resolve, reject) => {
			try {
				this.setStatus("connecting")
				this.ws = new WebSocket(this.url)

				this.ws.onopen = () => {
					this.sendConnectRequest().then(resolve).catch(reject)
				}

				this.ws.onmessage = (event) => {
					console.log("[SDK] ========== Raw WebSocket message ==========")
					console.log("[SDK] Raw data:", event.data)
					try {
						const msg: WsMessage = JSON.parse(event.data)
						console.log("[SDK] Parsed message type:", msg.type)
						this.handleMessage(msg)
					} catch (e) {
						console.error("[SDK] Failed to parse message:", e)
					}
				}

				this.ws.onerror = (error) => {
					console.error("WebSocket error:", error)
					this.setStatus("error")
					this.onError?.("Connection error")
					reject(error)
				}

				this.ws.onclose = () => {
					this._connected = false
					this.setStatus("disconnected")
					this.onDisconnected?.()
					this.handleDisconnect()
				}
			} catch (e) {
				this.setStatus("error")
				reject(e)
			}
		})
	}

	private async sendConnectRequest(): Promise<GatewayHelloOk> {
		const id = this.generateId()

		const connectParams: any = {
			minProtocol: 3,
			maxProtocol: 3,
			client: {
				id: "cli",
				version: "1.0.0",
				platform: "web",
				mode: "webchat",
			},
			role: "operator",
			scopes: ["operator.admin", "operator.approvals", "operator.pairing"],
			caps: ["tool-events"],
			locale: typeof navigator !== "undefined" ? navigator.language : "en",
			userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
		}

		if (this.token) {
			connectParams.auth = { token: this.token, password: "" }
		}

		const connectReq: WsMessage = {
			type: "req",
			id,
			method: "connect",
			params: connectParams,
		}

		this.ws!.send(JSON.stringify(connectReq))

		return new Promise((resolve, reject) => {
			const timeout = setTimeout(() => {
				this.pendingRequests.delete(id)
				reject(new Error("Connection timeout"))
			}, 10000)

			this.pendingRequests.set(id, {
				resolve: (msg: WsMessage) => {
					clearTimeout(timeout)
					if (msg.ok) {
						this._connected = true
						this._chatMessages = []
						this.setStatus("connected")
						this.reconnectAttempts = 0
						this.onConnected?.(msg.payload as GatewayHelloOk)
						resolve(msg.payload as GatewayHelloOk)
					} else {
						const errMsg = msg.error?.message || "Unknown error"
						this.onError?.(`Connection failed: ${errMsg}`)
						reject(new Error(errMsg))
					}
				},
				reject: (e) => {
					clearTimeout(timeout)
					reject(e)
				},
			})
		})
	}

	private handleDisconnect(): void {
		if (
			this.autoReconnect &&
			this.reconnectAttempts < this.maxReconnectAttempts
		) {
			this.reconnectAttempts++
			console.log(
				`Reconnecting... attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`,
			)
			setTimeout(() => {
				this.connect().catch(console.error)
			}, this.reconnectInterval)
		}
	}

	disconnect(): void {
		this.autoReconnect = false // Prevent auto-reconnect
		if (this.ws) {
			this.ws.close()
			this.ws = null
		}
		this._connected = false
		this._chatMessages = []
		this._chatStream = ""
		this._currentRunId = null
		this.setStatus("disconnected")
	}

	private handleMessage(msg: WsMessage): void {
		console.log("[Gateway] Raw message received:", JSON.stringify(msg))

		if (msg.type === "res" && msg.id) {
			console.log("[Gateway] Response message, id:", msg.id)
			const pending = this.pendingRequests.get(msg.id)
			if (pending) {
				this.pendingRequests.delete(msg.id)
				pending.resolve(msg)
			}
		} else if (msg.type === "event") {
			console.log(
				"[Gateway] Event message, event type:",
				msg.event,
				"payload:",
				JSON.stringify(msg.payload),
			)
			const handler = this.eventHandlers.get(msg.event || "")
			if (handler) {
				console.log("[Gateway] Found handler for event:", msg.event)
				handler(msg.payload)
			} else {
				console.log("[Gateway] No handler found for event:", msg.event)
				console.log(
					"[Gateway] Available handlers:",
					Array.from(this.eventHandlers.keys()),
				)
			}
		} else {
			console.log("[Gateway] Unknown message type:", msg.type)
		}
	}

	private handleChatEvent(event: ChatEventPayload): void {
		console.log("[SDK] handleChatEvent called:", JSON.stringify(event, null, 2))
		console.log("[SDK] event.message:", JSON.stringify(event.message, null, 2))

		if (event.sessionKey !== this.sessionKey) {
			console.log("[SDK] Session key mismatch, ignoring")
			return
		}

		switch (event.state) {
			case "delta":
				this._currentRunId = event.runId
				const text = this.extractTextFromMessage(event.message)
				console.log("[SDK] delta message, extracted text:", text)
				if (text && !this.isSilentReply(text)) {
					this._chatStream = text
					this.onStreamUpdate?.(text)
				}
				break

			case "final":
				this._currentRunId = null
				const finalText = this.extractTextFromMessage(event.message)
				console.log(
					"[SDK] final message, extracted from event.message:",
					finalText,
				)
				// 如果 event.message 没有内容，尝试从 _chatStream 获取
				const contentToSend = finalText || this._chatStream
				console.log("[SDK] content to send:", contentToSend)

				if (
					contentToSend &&
					contentToSend.trim() &&
					!this.isSilentReply(contentToSend)
				) {
					console.log("[SDK] Sending final message via onMessage callback")
					const newMessage: ChatMessage = {
						role: "assistant",
						content: [{ type: "text", text: contentToSend }],
						timestamp: Date.now(),
					}
					this._chatMessages.push(newMessage)
					this.onMessage?.(newMessage)
				}
				this._chatStream = ""
				break

			case "aborted":
				this._currentRunId = null
				if (
					this._chatStream &&
					this._chatStream.trim() &&
					!this.isSilentReply(this._chatStream)
				) {
					const newMessage: ChatMessage = {
						role: "assistant",
						content: [{ type: "text", text: this._chatStream }],
						timestamp: Date.now(),
					}
					this._chatMessages.push(newMessage)
					this.onMessage?.(newMessage)
				}
				this._chatStream = ""
				break

			case "error":
				this._currentRunId = null
				this._chatStream = ""
				const errorMsg = event.errorMessage || "Unknown error"
				this.onError?.(errorMsg)
				break
		}
	}

	private extractTextFromMessage(message: unknown): string {
		if (!message || typeof message !== "object") return ""
		const msg = message as Record<string, unknown>

		if (typeof msg.text === "string") {
			return msg.text
		}

		if (Array.isArray(msg.content)) {
			return this.extractTextFromContent(msg.content)
		}

		return ""
	}

	private extractTextFromContent(content: any): string {
		if (!content) return ""
		if (typeof content === "string") return content
		if (Array.isArray(content)) {
			return content.map((c) => c.text || "").join("")
		}
		return JSON.stringify(content)
	}

	private isSilentReply(text: string): boolean {
		return /^\s*NO_REPLY\s*$/i.test(text)
	}

	async sendMessage(options: SendMessageOptions): Promise<string | null> {
		console.log("[Gateway] sendMessage called with options:", options)

		const {
			message,
			sessionKey = this.sessionKey,
			deliver = false,
			idempotencyKey,
			attachments,
		} = options

		if (!this.ws || !this._connected) {
			console.error(
				"[Gateway] Cannot send message: not connected, ws:",
				!!this.ws,
				"_connected:",
				this._connected,
			)
			this.onError?.("Not connected")
			return null
		}

		const content = message.trim()
		if (!content && !attachments?.length) {
			console.warn("[Gateway] Cannot send message: empty content")
			return null
		}

		console.log("[Gateway] Adding user message to local state")
		// Add user message to local state
		const userMessage: ChatMessage = {
			role: "user",
			content: [{ type: "text", text: content }],
			timestamp: Date.now(),
		}
		this._chatMessages.push(userMessage)
		this.onMessage?.(userMessage)

		const runId = idempotencyKey || this.generateUUID()
		this._currentRunId = runId
		this._chatStream = ""

		const id = this.generateId()
		const msg: WsMessage = {
			type: "req",
			id,
			method: "chat.send",
			params: {
				message: content,
				sessionKey,
				deliver,
				idempotencyKey: runId,
				attachments,
			},
		}

		console.log("[Gateway] Sending WebSocket message:", JSON.stringify(msg))
		this.ws.send(JSON.stringify(msg))
		console.log("[Gateway] WebSocket message sent successfully")

		return new Promise((resolve, reject) => {
			const timeout = setTimeout(() => {
				this.pendingRequests.delete(id)
				reject(new Error("Request timeout"))
			}, 30000)

			this.pendingRequests.set(id, {
				resolve: (res: WsMessage) => {
					clearTimeout(timeout)
					if (res.ok) {
						resolve(runId)
					} else {
						this._currentRunId = null
						const errMsg = res.error?.message || "Unknown error"
						this.onError?.(errMsg)
						reject(new Error(errMsg))
					}
				},
				reject: (e) => {
					clearTimeout(timeout)
					this._currentRunId = null
					reject(e)
				},
			})
		})
	}

	async abort(options?: AbortOptions): Promise<void> {
		if (!this.ws || !this._connected) return

		const sessionKey = options?.sessionKey || this.sessionKey
		const runId = options?.runId || this._currentRunId

		const id = this.generateId()
		const msg: WsMessage = {
			type: "req",
			id,
			method: "chat.abort",
			params: runId ? { sessionKey, runId } : { sessionKey },
		}

		this.ws.send(JSON.stringify(msg))
	}

	async loadHistory(
		sessionKey?: string,
		limit: number = 200,
	): Promise<ChatHistoryResponse> {
		if (!this.ws || !this._connected) {
			throw new Error("Not connected")
		}

		const id = this.generateId()
		const msg: WsMessage = {
			type: "req",
			id,
			method: "chat.history",
			params: {
				sessionKey: sessionKey || this.sessionKey,
				limit,
			},
		}

		this.ws.send(JSON.stringify(msg))

		return new Promise((resolve, reject) => {
			const timeout = setTimeout(() => {
				this.pendingRequests.delete(id)
				reject(new Error("History request timeout"))
			}, 15000)

			this.pendingRequests.set(id, {
				resolve: (res: WsMessage) => {
					clearTimeout(timeout)
					if (res.ok && res.payload) {
						const messages = (res.payload.messages || []) as ChatMessage[]
						// 过滤掉 system 消息和 thinking 内容
						this._chatMessages = messages
							.filter((m) => m.role !== "system")
							.map((m) => ({
								...m,
								// 过滤掉 content 中的 thinking 类型
								content: m.content?.filter((c) => c.type !== "thinking") || [],
							}))
							// 过滤掉 content 为空的消息
							.filter((m) => m.content.length > 0)
						resolve({
							messages: this._chatMessages,
							thinkingLevel: res.payload.thinkingLevel,
						})
					} else {
						reject(new Error(res.error?.message || "Failed to load history"))
					}
				},
				reject: (e) => {
					clearTimeout(timeout)
					reject(e)
				},
			})
		})
	}

	clearHistory(): void {
		this._chatMessages = []
		this._chatStream = ""
		this._currentRunId = null
	}

	setSessionKey(sessionKey: string): void {
		this.sessionKey = sessionKey
	}
	isAssistantSilentReply(message: unknown): boolean {
		if (!message || typeof message !== "object") {
			return false
		}
		const entry = message as Record<string, unknown>
		const role = typeof entry.role === "string" ? entry.role.toLowerCase() : ""
		if (role !== "assistant") {
			return false
		}
		// entry.text takes precedence — matches gateway extractAssistantTextForSilentCheck
		if (typeof entry.text === "string") {
			return this.isSilentReplyStream(entry.text)
		}
		const text = message
		return typeof text === "string" && this.isSilentReplyStream(text)
	}
	SILENT_REPLY_PATTERN = /^\s*NO_REPLY\s*$/

	isSilentReplyStream(text: string): boolean {
		return this.SILENT_REPLY_PATTERN.test(text)
	}
}

export default GatewayClient
