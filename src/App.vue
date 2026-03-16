<script setup lang="ts">
	import { ref, reactive, onMounted, watch, nextTick } from "vue"
	import { listen } from "@tauri-apps/api/event"
	import { invoke } from "@tauri-apps/api/core"
	import {
		useSettings,
		useLive2D,
		useWebSocket,
		useChat,
		useWindow,
	} from "./composables"
	import {
		TitleBar,
		Live2DContainer,
		ChatPanel,
		CharacterSettingsModal,
		ContextMenu,
		Dialog,
	} from "./components"
	import { checkForUpdates } from "./utils/updater"

	const { settings, loadSettings } = useSettings()

	// 全局 Dialog 状态
	const dialogVisible = ref(false)
	const dialogOptions = reactive({
		message: "",
		title: "",
		type: "info" as "info" | "warning" | "error" | "success",
		showCancel: false,
		confirmText: "",
		cancelText: "",
	})
	let resolveConfirm: ((value: boolean) => void) | null = null

	function showGlobalDialog(options: {
		message: string
		title?: string
		type?: "info" | "warning" | "error" | "success"
		showCancel?: boolean
		confirmText?: string
		cancelText?: string
	}) {
		Object.assign(dialogOptions, options)
		dialogVisible.value = true
	}

	function showGlobalConfirm(options: {
		message: string
		title?: string
		type?: "info" | "warning" | "error" | "success"
		showCancel?: boolean
		confirmText?: string
		cancelText?: string
	}): Promise<boolean> {
		return new Promise((resolve) => {
			resolveConfirm = resolve
			Object.assign(dialogOptions, {
				...options,
				showCancel: true,
				confirmText: options.confirmText || "确定",
				cancelText: options.cancelText || "取消",
			})
			dialogVisible.value = true
		})
	}

	function handleDialogConfirm() {
		dialogVisible.value = false
		if (resolveConfirm) {
			resolveConfirm(true)
			resolveConfirm = null
		}
	}

	function handleDialogCancel() {
		dialogVisible.value = false
		if (resolveConfirm) {
			resolveConfirm(false)
			resolveConfirm = null
		}
	}

	// 暴露全局 Dialog 方法到 window
	if (typeof window !== "undefined") {
		;(window as any).$showDialog = showGlobalDialog
		;(window as any).$showConfirm = showGlobalConfirm
	}
	const {
		initLive2D,
		loadLive2DModel,
		reloadModel,
		hasModel,
		handleUserInteraction,
		handleBotMessage,
		handleEmotion,
		previewState,
		previewMotion,
		resetToIdle,
		getAvailableMotions,
		onModelClick,
		onContainerClick,
		checkHitArea,
	} = useLive2D()

	// 可用的动画组列表
	const availableMotions = ref<string[]>([])

	// 更新可用动画组列表
	function updateAvailableMotions() {
		availableMotions.value = getAvailableMotions()
	}
	const {
		wsStatus,
		connectWebSocket,
		sendMessage: sendWsMessage,
		isConnected,
		loadHistory,
	} = useWebSocket({
		onStatusChange: () => {},
		onConnected: () => {},
		onDisconnected: () => {},
		onError: (error) => {
			console.error("[App] WebSocket error:", error)
		},
		onMessageStart: () => {
			startThinking()
		},
		onContentDelta: (payload: any) => {
			updateLastBotMessage(payload.delta.content || "")
		},
		onMessageStop: () => {
			stopStreaming()
		},
		onEmotion: (emotion) => {
			handleEmotion(emotion)
		},
		onMessage: (message: any) => {
			if (message.role === "user") {
				return
			}
			let content = ""
			if (message.content) {
				if (Array.isArray(message.content)) {
					content = message.content.map((c: any) => c.text || "").join("")
				} else if (typeof message.content === "string") {
					content = message.content
				}
				if (content) {
					addMessage("bot", content)
				}
			}
		},
	})

	async function handleCheckUpdates() {
		await checkForUpdates(true)
	}
	const {
		messages,
		isChatVisible,
		toggleChat,
		addMessage,
		updateLastBotMessage,
		startThinking,
		stopStreaming,
	} = useChat()
	const {
		toggleAlwaysOnTop,
		minimizeWindow,
		closeWindow: closeAppWindow,
		setIgnoreCursorEvents,
	} = useWindow()

	const showSettings = ref(false)
	const showContextMenu = ref(false)
	const contextMenuX = ref(0)
	const contextMenuY = ref(0)
	const mcpStatus = ref(true)

	function hexToRgb(hex: string): string {
		const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
		if (result) {
			return `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
		}
		return "30, 41, 59" // 默认值
	}

	function applyBackground() {
		const app = document.getElementById("app")
		const chatPanel = document.getElementById("chat-panel")
		if (app) {
			app.style.background = `rgba(${hexToRgb(settings.value.bgColor)}, ${settings.value.bgOpacity})`
			app.style.backdropFilter = settings.value.bgBlur ? "blur(20px)" : "none"
		}
		if (chatPanel) {
			chatPanel.style.background = `rgba(${hexToRgb(settings.value.bgColor)}, ${settings.value.bgOpacity * 0.8})`
			chatPanel.style.backdropFilter = settings.value.bgBlur
				? "blur(10px)"
				: "none"
		}
	}

	async function init() {
		await loadSettings()
		applyBackground()

		await initLive2D()
		await loadLive2DModel(settings.value.modelPath)
		updateAvailableMotions()

		onContainerClick(async (x, y, isModelHit) => {
			if (isModelHit) {
				return
			}

			const container = document.getElementById("live2d-container")
			if (!container) return

			const rect = container.getBoundingClientRect()
			const clickY = y - rect.top
			const containerHeight = rect.height

			if (clickY > containerHeight * 0.7) {
				handleUserInteraction()
				toggleChat(true)
				nextTick(() => {
					const inputEl = document.getElementById(
						"message-input",
					) as HTMLInputElement
					inputEl?.focus()
				})
			} else {
				if (isChatVisible.value) {
					toggleChat(false)
				}
				await setIgnoreCursorEvents(true)
				setTimeout(async () => {
					await setIgnoreCursorEvents(false)
				}, 100)
			}
		})

		if (settings.value.wsUrl) {
			connectWebSocket(settings.value.wsUrl, settings.value.wsToken)
		}

		await setupTauriListeners()
		setupEventListeners()

		setTimeout(() => {
			checkForUpdates(false)
		}, 8000)
	}

	async function setupTauriListeners() {
		await listen("ws-status", (event) => {
			const status = event.payload as string
			wsStatus.value = status as any
		})

		await listen("nova-link-message", (event) => {
			const payload = event.payload as string
			handleIncomingMessage(payload)
		})

		await listen("window-shown", async () => {
			if (hasModel.value) {
				return
			}
			await nextTick()
			setTimeout(async () => {
				await initLive2D()
				await loadLive2DModel(settings.value.modelPath)
				updateAvailableMotions()
			}, 100)
		})
	}

	function setupEventListeners() {
		document.addEventListener("contextmenu", handleContextMenu)
		document.addEventListener("click", handleDocumentClick)
	}

	function handleSendMessage(content: string) {
		if (!content) return

		if (settings.value.chatProvider === "llm") {
			sendViaLlm(content)
		} else {
			sendViaGateway(content)
		}
	}

	async function sendViaGateway(content: string) {
		addMessage("user", content)

		if (isConnected()) {
			try {
				await sendWsMessage(content)
			} catch (e) {
				addMessage("bot", `发送失败: ${e}`)
			}
		} else {
			addMessage(
				"bot",
				"未连接到 Gateway 服务。请在设置中配置 WebSocket 地址并确保服务正在运行。",
			)
		}
	}

	async function sendViaLlm(content: string) {
		addMessage("user", content)

		if (
			settings.value.llmProvider !== "none" &&
			settings.value.llmApiKey &&
			settings.value.llmApiUrl &&
			settings.value.llmModel
		) {
			startThinking()

			try {
				const { invoke } = await import("@tauri-apps/api/core")

				// 加载人格设定
				let systemPrompt: string | undefined = undefined
				try {
					systemPrompt = await invoke<string>("load_soul")
				} catch (e) {
					console.error("Failed to load soul:", e)
				}

				const response = await invoke<string>("chat_with_llm", {
					provider: settings.value.llmProvider,
					apiKey: settings.value.llmApiKey,
					apiUrl: settings.value.llmApiUrl,
					model: settings.value.llmModel,
					message: content,
					systemPrompt: systemPrompt,
				})

				stopStreaming()
				addMessage("bot", response)
			} catch (e) {
				stopStreaming()
				addMessage("bot", `发送失败: ${e}`)
			}
		} else {
			addMessage("bot", "未配置 LLM。请在设置中配置 LLM API。")
		}
	}

	function handleIncomingMessage(payload: string) {
		try {
			const data = JSON.parse(payload)
			if (data.type === "message" && data.content) {
				handleBotMessage(data.content)
				addMessage("bot", data.content)
			}
		} catch (e) {
			handleBotMessage(payload)
			addMessage("bot", payload)
		}
	}

	function handleContextMenu(e: MouseEvent) {
		e.preventDefault()
		contextMenuX.value = e.clientX
		contextMenuY.value = e.clientY
		showContextMenu.value = true
	}

	function handleDocumentClick(e: MouseEvent) {
		const target = e.target as HTMLElement

		// 检查是否点击了 Live2D 容器
		const live2dContainer = target.closest("#live2d-container")
		if (live2dContainer) {
			// 点击在 Live2D 容器内，由 handleLive2DClick 处理
			return
		}

		// 检查是否点击了聊天面板
		const isClickInside = target.closest("#chat-panel")

		if (!isClickInside && isChatVisible.value) {
			toggleChat(false)
		}
	}

	function openSettings() {
		showSettings.value = true
		showContextMenu.value = false
	}

	function closeSettings() {
		showSettings.value = false
	}

	async function handleSettingsSave() {
		applyBackground()
		// 使用 reloadModel 确保先移除旧模型再加载新模型（已包含正确的缩放）
		await reloadModel(settings.value.modelPath)
		// WebSocket 连接改为手动触发
	}

	function handleReloadModel() {
		reloadModel(settings.value.modelPath)
		showContextMenu.value = false
	}

	function handleToggleAlwaysOnTop() {
		toggleAlwaysOnTop()
		showContextMenu.value = false
	}

	function handleMinimize() {
		minimizeWindow()
		showContextMenu.value = false
	}

	function handleCloseWindow() {
		handleAppClose()
		showContextMenu.value = false
	}

	async function handleResetWindowSize() {
		await invoke<{ width: number; height: number }>("set_default_window_size")
		showContextMenu.value = false
	}

	function handlePreviewState(state: string) {
		previewState(state)
		showContextMenu.value = false
	}

	function handlePreviewMotion(motion: string) {
		previewMotion(motion)
		showContextMenu.value = false
	}

	function handleResetToIdle() {
		resetToIdle()
		showContextMenu.value = false
	}

	async function handleRunGateway() {
		try {
			await import("@tauri-apps/api/core")
			await invoke<string>("run_gateway")
		} catch (e) {
			console.error("启动 Gateway 失败:", e)
		}
		showContextMenu.value = false
	}

	function handleReconnectWs() {
		connectWebSocket(settings.value.wsUrl, settings.value.wsToken)
		showContextMenu.value = false
	}

	async function handleAppClose() {
		// 只隐藏窗口，不销毁 Live2D（从托盘恢复时需要）
		await closeAppWindow()
	}

	// 监听聊天面板打开，加载历史记录
	watch(isChatVisible, async (show) => {
		if (show && isConnected()) {
			// 先清除 "正在思考..." 消息
			stopStreaming()

			try {
				const result = await loadHistory(20)
				if (result && result.messages) {
					// 清空当前消息并添加历史消息
					messages.value = []
					for (const msg of result.messages) {
						if (msg.role === "user" || msg.role === "assistant") {
							let content = ""
							if (Array.isArray(msg.content)) {
								content = msg.content.map((c: any) => c.text || "").join("")
							} else if (typeof msg.content === "string") {
								content = msg.content
							}
							if (content) {
								addMessage(msg.role, content)
							}
						}
					}
				}
			} catch (e) {
				console.error("加载历史记录失败:", e)
			}
		}
	})

	onMounted(async () => {
		// 多层透明保障机制 - 参考技术文档
		// 确保透明背景在 Vue 挂载后正确设置
		setTimeout(() => {
			document.body.style.background = "transparent"
			document.documentElement.style.background = "transparent"
			const app = document.getElementById("app")
			if (app) {
				app.style.background = "transparent"
			}
			// 同时设置 canvas 透明
			const canvas = document.getElementById("live2d-canvas")
			if (canvas) {
				canvas.style.background = "transparent"
			}
		}, 100)

		try {
			const hasState = await invoke<boolean>("has_window_state")
			if (!hasState) {
				await invoke("set_default_window_size")
			}
		} catch (e) {
			console.error("Error checking window state:", e)
		}

		listen<{ animation: string; duration: number }>(
			"mcp-animation",
			(event) => {
				const { animation, duration } = event.payload
				handleEmotion({ type: animation, duration })
			},
		)

		listen<{ emotion: string }>("mcp-emotion", (event) => {
			const { emotion } = event.payload
			handleEmotion({ type: emotion, duration: 3000 })
		})

		listen<{ state: string }>("mcp-state", (event) => {
			const { state } = event.payload
			previewState(state)
		})

		init().catch((e) => {
			console.error("[App] init() failed:", e)
		})
	})
</script>

<template>
	<div id="app">
		<TitleBar
			:ws-status="wsStatus"
			@close="handleAppClose"
		/>
		<Live2DContainer :has-model="hasModel" />
		<ChatPanel
			:visible="isChatVisible"
			:messages="messages"
			:ws-status="wsStatus"
			@send="handleSendMessage"
			@toggle="toggleChat"
		/>
		<CharacterSettingsModal
			:visible="showSettings"
			:ws-status="wsStatus"
			:mcp-status="mcpStatus"
			@close="closeSettings"
			@save="handleSettingsSave"
		/>
		<ContextMenu
			:visible="showContextMenu"
			:x="contextMenuX"
			:y="contextMenuY"
			:available-motions="availableMotions"
			@close="showContextMenu = false"
			@settings="openSettings"
			@check-updates="handleCheckUpdates"
			@reload-model="handleReloadModel"
			@toggle-always-on-top="handleToggleAlwaysOnTop"
			@minimize="handleMinimize"
			@close-window="handleCloseWindow"
			@reset-window-size="handleResetWindowSize"
			@preview-state="handlePreviewState"
			@preview-motion="handlePreviewMotion"
			@reset-to-idle="handleResetToIdle"
			@run-gateway="handleRunGateway"
			@reconnect-ws="handleReconnectWs"
		/>
		<!-- 全局 Dialog -->
		<Dialog
			:visible="dialogVisible"
			:title="dialogOptions.title"
			:message="dialogOptions.message"
			:type="dialogOptions.type"
			:show-cancel="dialogOptions.showCancel"
			:confirm-text="dialogOptions.confirmText"
			:cancel-text="dialogOptions.cancelText"
			@close="handleDialogCancel"
			@confirm="handleDialogConfirm"
			@cancel="handleDialogCancel"
		/>
	</div>
</template>

<style>
	* {
		margin: 0;
		padding: 0;
		box-sizing: border-box;
	}

	html,
	body {
		width: 100%;
		height: 100%;
		overflow: hidden;
		background: transparent;
		font-family:
			-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
	}

	#app {
		width: 100%;
		height: 100%;
		position: relative;
		overflow: hidden;
	}

	#drag-region {
		position: absolute;
		top: 0;
		left: 0;
		right: 40px;
		height: 32px;
		-webkit-app-region: drag;
		z-index: 100;
	}

	#close-btn {
		position: absolute;
		top: 8px;
		right: 8px;
		width: 28px;
		height: 28px;
		border: none;
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.1);
		color: #e2e8f0;
		font-size: 18px;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: background 0.2s;
		z-index: 100;
	}

	#close-btn:hover {
		background: #ef4444;
	}

	#live2d-container {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	#live2d-container canvas {
		display: block;
	}

	#live2d-placeholder {
		position: absolute;
		color: rgba(255, 255, 255, 0.5);
		font-size: 14px;
		pointer-events: auto;
		cursor: pointer;
		transition: opacity 0.3s;
	}

	#live2d-container.has-model #live2d-placeholder {
		opacity: 0;
		pointer-events: none;
	}

	#status-indicator {
		position: absolute;
		top: 12px;
		right: 12px;
		z-index: 50;
	}

	.status {
		display: inline-block;
		font-size: 10px;
	}

	.status.connected {
		color: #22c55e;
	}

	.status.connecting {
		color: #eab308;
	}

	.status.disconnected {
		color: #6b7280;
	}

	.status.error {
		color: #ef4444;
	}

	#chat-panel {
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
		background: rgba(15, 23, 42, 0.85);
		backdrop-filter: blur(10px);
		-webkit-backdrop-filter: blur(10px);
		border-top: 1px solid rgba(255, 255, 255, 0.1);
		display: flex;
		flex-direction: column;
		max-height: 50%;
		transition:
			transform 0.3s ease,
			opacity 0.3s ease;
	}

	#chat-panel.hidden {
		transform: translateY(100%);
		opacity: 0;
		pointer-events: none;
	}

	#messages {
		flex: 1;
		overflow-y: auto;
		padding: 12px;
		display: flex;
		flex-direction: column;
		gap: 8px;
		min-height: 100px;
		max-height: 200px;
	}

	.message {
		padding: 8px 12px;
		border-radius: 12px;
		font-size: 13px;
		line-height: 1.4;
		word-break: break-word;
		max-width: 85%;
	}

	.message.user {
		align-self: flex-end;
		background: linear-gradient(135deg, #22d3ee, #3b82f6);
		color: white;
	}

	.message.bot {
		align-self: flex-start;
		background: rgba(255, 255, 255, 0.1);
		color: #e2e8f0;
	}

	#input-area {
		display: flex;
		gap: 8px;
		padding: 12px;
		border-top: 1px solid rgba(255, 255, 255, 0.1);
	}

	#input-area input {
		flex: 1;
		padding: 10px 14px;
		border: none;
		border-radius: 20px;
		background: rgba(255, 255, 255, 0.1);
		color: #e2e8f0;
		font-size: 13px;
		outline: none;
	}

	#input-area input::placeholder {
		color: rgba(255, 255, 255, 0.5);
	}

	#input-area button {
		padding: 10px 20px;
		border: none;
		border-radius: 20px;
		background: linear-gradient(135deg, #22d3ee, #3b82f6);
		color: white;
		font-size: 13px;
		cursor: pointer;
		transition: opacity 0.2s;
	}

	#input-area button:hover {
		opacity: 0.9;
	}
</style>
