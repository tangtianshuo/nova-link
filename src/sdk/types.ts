// OpenClaw Gateway SDK - Types

export interface WsMessage {
	type: "req" | "res" | "event"
	id?: string
	method?: string
	params?: any
	event?: string
	payload?: any
	ok?: boolean
	error?: {
		type: string
		message: string
	}
	seq?: number
}

export interface ChatEventPayload {
	runId: string
	sessionKey: string
	state: "delta" | "final" | "aborted" | "error"
	message?: unknown
	errorMessage?: string
}

export interface MessageStartPayload {
	runId: string
	sessionKey: string
	messageId: string
}

export interface ContentDeltaPayload {
	runId: string
	sessionKey: string
	delta: string
}

export interface MessageDeltaPayload {
	runId: string
	sessionKey: string
	message?: unknown
}

export interface MessageStopPayload {
	runId: string
	sessionKey: string
}

export interface ToolUsePayload {
	runId: string
	sessionKey: string
	toolName: string
	toolInput: unknown
}

export interface ToolResultPayload {
	runId: string
	sessionKey: string
	toolName: string
	toolResultId: string
	content: string
}

export interface ErrorPayload {
	error: string
	code?: string
}

export interface ChatMessage {
	role: "user" | "assistant" | "system"
	content: Array<{ type: string; text?: string }>
	timestamp?: number
}

export interface ConnectParams {
	minProtocol?: number
	maxProtocol?: number
	client?: {
		id: string
		version: string
		platform: string
		mode: string
	}
	role?: string
	scopes?: string[]
	auth?: {
		token?: string
		password?: string
	}
	caps?: string[]
	locale?: string
	userAgent?: string
}

export interface GatewayHelloOk {
	protocol: number
	server: {
		version: string
		connId: string
	}
	features: {
		methods: string[]
		events: string[]
	}
	snapshot: {
		presence: PresenceEntry[]
		health: any
		stateVersion: any
		uptimeMs: number
		configPath: string
		stateDir: string
		sessionDefaults: any
		authMode: string
	}
	canvasHostUrl: string
	auth: {
		deviceToken?: string
		role: string
		scopes: string[]
		issuedAtMs: number
	}
	policy: {
		maxPayload: number
		maxBufferedBytes: number
		tickIntervalMs: number
	}
}

export interface PresenceEntry {
	instanceId?: string | null
	host?: string | null
	version?: string | null
	platform?: string
	mode?: string
	reason?: string
	text?: string
	ts?: number
	roles?: string[]
	scopes?: string[]
}

export interface ChatHistoryResponse {
	messages?: ChatMessage[]
	thinkingLevel?: string
}

export interface SendMessageOptions {
	message: string
	sessionKey?: string
	deliver?: boolean
	idempotencyKey?: string
	attachments?: Array<{
		type: string
		mimeType: string
		content: string
	}>
}

export interface AbortOptions {
	sessionKey: string
	runId?: string
}

export type ConnectionStatus =
	| "disconnected"
	| "connecting"
	| "connected"
	| "error"

export interface GatewayClientOptions {
	url: string
	token?: string
	sessionKey?: string
	autoReconnect?: boolean
	reconnectInterval?: number
	maxReconnectAttempts?: number
	onStatusChange?: (status: ConnectionStatus) => void
	onMessage?: (message: ChatMessage) => void
	onStreamUpdate?: (text: string) => void
	onMessageStart?: (payload: MessageStartPayload) => void
	onContentDelta?: (payload: ContentDeltaPayload) => void
	onMessageDelta?: (payload: MessageDeltaPayload) => void
	onMessageStop?: (payload: MessageStopPayload) => void
	onToolUse?: (payload: ToolUsePayload) => void
	onToolResult?: (payload: ToolResultPayload) => void
	onError?: (error: string) => void
	onConnected?: (hello: GatewayHelloOk) => void
	onDisconnected?: () => void
}
