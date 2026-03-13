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
		this.eventHandlers.set("chat", (payload: ChatEventPayload) => {
				this.handleChatEvent(payload)
		})
		// 处理 agent 事件（OpenClaw Gateway 格式）
		this.eventHandlers.set("agent", (payload: any) => {
			// 处理生命周期事件
			if (payload.stream === "lifecycle") {
				if (payload.data?.phase === "start") {
					// 开始思考
						this.onMessageStart?.(payload)
				} else if (
					payload.data?.phase === "end" ||
					payload.data?.phase === "done"
				) {
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
						this.loadHistory(undefined, 1)
							.then((result: any) => {
								if (result.messages && result.messages.length > 0) {
									const latestMsg = result.messages[result.messages.length - 1]
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
			this.onMessageStart?.(payload)
		})
		this.eventHandlers.set("content_delta", (payload: ContentDeltaPayload) => {
			this.onContentDelta?.(payload)
			this._chatStream += payload.delta
			this.onStreamUpdate?.(this._chatStream)
		})
		this.eventHandlers.set("message_delta", (payload: MessageDeltaPayload) => {
			this.onMessageDelta?.(payload)
		})
		this.eventHandlers.set("message_stop", (payload: MessageStopPayload) => {
			this.onMessageStop?.(payload)
		})
		this.eventHandlers.set("tool_use", (payload: ToolUsePayload) => {
			this.onToolUse?.(payload)
		})
		this.eventHandlers.set("tool_result", (payload: ToolResultPayload) => {
			this.onToolResult?.(payload)
		})
		this.eventHandlers.set(
			"error",
			(payload: { error: string; code?: string }) => {
				this.onError?.(payload.error)
			},
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
					try {
						const msg: WsMessage = JSON.parse(event.data)
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

		if (msg.type === "res" && msg.id) {
			const pending = this.pendingRequests.get(msg.id)
			if (pending) {
				this.pendingRequests.delete(msg.id)
				pending.resolve(msg)
			}
		} else if (msg.type === "event") {
			const handler = this.eventHandlers.get(msg.event || "")
			if (handler) {
				handler(msg.payload)
			}
		}
	}

	private handleChatEvent(event: ChatEventPayload): void {

		if (event.sessionKey !== this.sessionKey) {
			return
		}

		switch (event.state) {
			case "delta":
				this._currentRunId = event.runId
				const text = this.extractTextFromMessage(event.message)
				if (text && !this.isSilentReply(text)) {
					this._chatStream = text
					this.onStreamUpdate?.(text)
				}
				break

			case "final":
				this._currentRunId = null
				const finalText = this.extractTextFromMessage(event.message)
				const contentToSend = finalText || this._chatStream

				if (
					contentToSend &&
					contentToSend.trim() &&
					!this.isSilentReply(contentToSend)
				) {
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
			console.error("[Gateway] Cannot send message: empty content")
			return null
		}

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

		this.ws.send(JSON.stringify(msg))

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
