<script setup lang="ts">
	import { ref, reactive, onMounted, onUnmounted, watch, computed } from "vue"
	import { getCurrentWindow } from "@tauri-apps/api/window"
	import { invoke } from "@tauri-apps/api/core"
	import { useSettings, type AppSettings, type HotkeySetting, useGreeting, type GreetingConfig } from "../composables"
	const props = defineProps<{
		visible: boolean
		wsStatus?: string
		mcpStatus?: boolean
	}>()

	const emit = defineEmits<{
		close: []
		save: [settings: AppSettings]
		resetOnboarding: []
	}>()

	const { settings, saveSettings, updateLlmConfig } = useSettings()

	// 全局 Dialog 方法
	const gShowDialog = (window as any).$showDialog
	const gShowConfirm = (window as any).$showConfirm

	// ============ 窗口尺寸约束 ============

	// 获取父窗口尺寸
	const parentWindowSize = reactive({ width: 0, height: 0 })

	async function updateParentWindowSize() {
		try {
			const win = await getCurrentWindow()
			const size = await win.outerSize()
			parentWindowSize.width = size.width
			parentWindowSize.height = size.height
		} catch (e) {
			console.error("Failed to get window size:", e)
		}
	}

	// Modal 样式 - 动态约束不超过父窗口
	const modalStyle = computed(() => {
		const maxW = Math.min(parentWindowSize.width - 40, 800)
		const maxH = Math.min(parentWindowSize.height - 40, 1200)
		return {
			maxWidth: `${maxW}px`,
			maxHeight: `${maxH}px`,
		}
	})

	// ============ 状态定义 ============

	// 加载状态
	const loading = ref(false)
	const saving = ref(false)

	// 手风琴折叠状态
	const activeSections = ref<string[]>(["identity"])

	// 身份设置
	const identity = reactive({
		name: "",
		creatureType: "",
		temperament: "",
		emoji: "",
		avatarPath: "",
	})

	// 用户设置 (User)
	const user = reactive({
		name: "",
		callName: "",
		pronouns: "",
		timezone: "",
		notes: "",
		context: "",
	})

	// Soul 设置
	const soul = reactive({
		name: "",
		personality: "",
		style: "",
		emoticons: "",
		tone: "",
		content: "",
	})
	const soulEditable = ref(false)
	const soulOriginal = reactive({ ...soul })

	// 同步状态
	const syncing = ref(false)

	// 应用设置
	const localSettings = reactive<AppSettings>({ ...settings.value })
	// 窗口尺寸独立管理
	const windowSize = reactive({ width: 400, height: 500 })

	// 定时问候设置
	const { config: greetingConfig, updateConfig: updateGreeting, loadConfig: loadGreetingConfig } = useGreeting()

	// 快捷键设置
	const hotkeySettings = ref<HotkeySetting[]>([])

	function getHotkeyActionLabel(action: string): string {
		const labels: Record<string, string> = {
			toggle_chat: "切换聊天面板",
			toggle_window: "显示/隐藏窗口",
			switch_model: "切换模型",
		}
		return labels[action] || action
	}

	async function loadHotkeySettings() {
		hotkeySettings.value = settings.value.hotkeys || [
			{ shortcut: "Ctrl+Shift+N", action: "toggle_chat", enabled: true },
			{ shortcut: "Ctrl+Shift+H", action: "toggle_window", enabled: true },
		]
	}

	function updateHotkey(index: number, field: keyof HotkeySetting, value: string | boolean) {
		hotkeySettings.value[index] = { ...hotkeySettings.value[index], [field]: value }
	}

	// 快捷键录制状态
	const recordingIndex = ref<number | null>(null)

	function startRecording(index: number) {
		recordingIndex.value = index
	}

	function handleKeyDown(event: KeyboardEvent) {
		if (recordingIndex.value === null) return
		event.preventDefault()

		const parts: string[] = []
		if (event.ctrlKey) parts.push("Ctrl")
		if (event.shiftKey) parts.push("Shift")
		if (event.altKey) parts.push("Alt")
		if (event.metaKey) parts.push("Meta")

		const key = event.key
		if (!["Control", "Shift", "Alt", "Meta"].includes(key)) {
			parts.push(key.length === 1 ? key.toUpperCase() : key)
		}

		if (parts.length > 0) {
			hotkeySettings.value[recordingIndex.value].shortcut = parts.join("+")
		}
		recordingIndex.value = null
	}

	function cancelRecording() {
		recordingIndex.value = null
	}

	// ============ 数据加载 ============

	async function loadAllData() {
		loading.value = true
		try {
			// 更新父窗口尺寸
			await updateParentWindowSize()

			// 加载 Identity（从文件读取）
			const identityData = await invoke<any>("load_identity_from_file")
			Object.assign(identity, {
				name: identityData.name || "Nova",
				creatureType: identityData.creature_type || "人类",
				temperament: identityData.temperament || "温柔调皮活泼可爱 💕",
				emoji: identityData.emoji || "👻",
				avatarPath: identityData.avatar_path || "",
			})

			// 加载 User（从文件读取）
			const userData = await invoke<any>("load_user_from_file")
			Object.assign(user, {
				name: userData.name || "",
				callName: userData.call_name || "",
				pronouns: userData.pronouns || "",
				timezone: userData.timezone || "",
				notes: userData.notes || "",
				context: userData.context || "",
			})

			// 加载 Soul（从 OpenClaw 目录读取，结构化数据）
			const soulData: any = await invoke("load_soul_from_file")
			Object.assign(soul, {
				name: soulData.name || "Nova",
				personality: soulData.personality || "活泼、可爱、友好",
				style: soulData.style || "轻松可爱",
				emoticons: soulData.emoticons || "◕‿◕",
				tone: soulData.tone || "简洁有趣",
				content: soulData.content || "",
			})
			Object.assign(soulOriginal, soul)
			soulEditable.value = false

			// 从后端获取当前窗口尺寸
			const currentSize = await invoke<{ width: number; height: number }>(
				"get_window_size",
			)
			windowSize.width = currentSize.width
			windowSize.height = currentSize.height
			// 加载其他应用设置
			Object.assign(localSettings, settings.value)
			// 加载定时问候设置
			await loadGreetingConfig()
			// 加载快捷键设置
			await loadHotkeySettings()
		} catch (e) {
			console.error("Failed to load data:", e)
		} finally {
			loading.value = false
		}
	}

	// ============ MCP 配置 ============

	// MCP 配置数据
	const mcpConfig = ref<{
		http: { url: string; host: string; port: number }
		stdio: { command: string; args: string[] }
		usage: string
	} | null>(null)

	// 加载 MCP 配置
	async function loadMcpConfig() {
		try {
			const config: any = await invoke("get_mcp_config")
			// 构建完整配置
			mcpConfig.value = {
				http: config.http,
				stdio: {
					command: "path-to-nova-link",
					args: ["--mcp-stdio"],
				},
				usage: `## Nova Link MCP 使用指南

### 方式一：HTTP 模式（推荐，本地）
\`\`\`json
{
  "mcpServers": {
    "nova-link": {
      "command": "npx",
      "args": ["@anthropic/mcp-client", "--url", "${config.http.url}"]
    }
  }
}
\`\`\`

### 方式二：HTTP 模式（远程，需要 Nova Link 开启远程访问）
使用 Nova Link 所在电脑的局域网 IP 地址。

### 方式三：直接调用 Tauri 命令
在 OpenClaw 系统提示词中直接调用：
- play_animation - 播放动画
- set_emotion - 设置情感
- get_model_info - 获取模型信息

### 可用动画/情感
- idle, greeting, talking, listening, thinking
- happy, sad, surprised, angry, sleeping`,
			}
		} catch (e) {
			console.error("Failed to load MCP config:", e)
		}
	}

	async function copyMcpConfig() {
		if (!mcpConfig.value) {
			await loadMcpConfig()
		}
		try {
			const config: any = await invoke("get_mcp_config")
			const mcpConfigJson = {
				mcpServers: {
					"nova-link": {
						command: "npx",
						args: ["@anthropic-ai/mcp-client", "--url", config.http.url],
					},
				},
			}
			await navigator.clipboard.writeText(
				JSON.stringify(mcpConfigJson, null, 2),
			)
			gShowDialog({ message: "MCP HTTP 配置已复制到剪贴板", type: "success" })
		} catch (e) {
			console.error("Failed to copy MCP config:", e)
			gShowDialog({ message: "复制失败：" + e, type: "error" })
		}
	}

	// 重置引导
	async function handleResetOnboarding() {
		// 先关闭设置面板
		emit("close")
		// 延迟一点再显示引导，确保设置面板关闭动画完成
		setTimeout(() => {
			emit("resetOnboarding")
		}, 300)
	}

	// ============ 保存函数 ============

	let saveDebounceTimeout: ReturnType<typeof setTimeout> | null = null

	async function saveAll() {
		// 防抖：清除之前的定时器
		if (saveDebounceTimeout) {
			clearTimeout(saveDebounceTimeout)
		}

		saveDebounceTimeout = setTimeout(async () => {
			await doSave()
		}, 300) // 300ms 防抖
	}

	// 保存结果的警告信息
	const saveWarnings = ref<string[]>([])

	async function doSave() {
		saving.value = true
		saveWarnings.value = []
		try {
			// 保存 Identity（同时保存到本地和 OpenClaw 目录）
			const identityResult: any = await invoke("save_identity", {
				name: identity.name,
				creatureType: identity.creatureType,
				temperament: identity.temperament,
				emoji: identity.emoji,
				avatarPath: identity.avatarPath,
			})
			if (identityResult.openclaw_warning) {
				saveWarnings.value.push(identityResult.openclaw_warning)
			}

			// 保存 User（同时保存到本地和 OpenClaw 目录）
			const userResult: any = await invoke("save_user", {
				name: user.name,
				callName: user.callName,
				pronouns: user.pronouns,
				timezone: user.timezone,
				notes: user.notes,
				context: user.context,
			})
			if (userResult.openclaw_warning) {
				saveWarnings.value.push(userResult.openclaw_warning)
			}

			// 保存 Soul（同时保存到本地和 OpenClaw 目录）
			const soulResult: any = await invoke("save_soul", {
				data: {
					name: soul.name,
					personality: soul.personality,
					style: soul.style,
					emoticons: soul.emoticons,
					tone: soul.tone,
					content: soul.content,
				},
			})
			if (soulResult.openclaw_warning) {
				saveWarnings.value.push(soulResult.openclaw_warning)
			}

			// 保存应用设置到后端
			// 显式赋值确保类型正确（range input 返回字符串需要转为数字）
			settings.value.bgOpacity = Number(localSettings.bgOpacity)
			settings.value.bgColor = localSettings.bgColor
			settings.value.bgBlur = localSettings.bgBlur
			settings.value.modelPath = localSettings.modelPath
			settings.value.wsUrl = localSettings.wsUrl
			settings.value.wsToken = localSettings.wsToken
			settings.value.chatProvider = localSettings.chatProvider
			settings.value.alwaysOnTop = localSettings.alwaysOnTop
			settings.value.llmProvider = localSettings.llmProvider
			settings.value.llmApiKey = localSettings.llmApiKey
			settings.value.llmApiUrl = localSettings.llmApiUrl
			settings.value.llmModel = localSettings.llmModel
			await saveSettings()
			await updateLlmConfig()

			// 应用窗口大小
			await invoke("set_window_size", {
				width: Math.max(300, windowSize.width),
				height: Math.max(400, windowSize.height),
			})

			// 保存快捷键设置并刷新
			settings.value.hotkeys = hotkeySettings.value
			await saveSettings()
			// 刷新全局快捷键
			window.dispatchEvent(new CustomEvent('refresh-hotkeys'))

			// 如果有 OpenClaw 相关的警告，显示给用户
			if (saveWarnings.value.length > 0) {
				gShowDialog({
					message:
						"部分设置已保存到本地，但 OpenClaw 目录保存失败：\n\n" +
						saveWarnings.value.join("\n\n"),
					title: "保存结果",
					type: "warning",
					showCancel: false,
					confirmText: "确定",
				})
			}

			emit("save", localSettings)
			emit("close")
		} catch (e) {
			console.error("Failed to save:", e)
			gShowDialog({ message: "保存失败：" + e, type: "error" })
		} finally {
			saving.value = false
		}
	}

	// ============ 同步功能 ============
	// 注意：由于保存时已自动同步，此功能现在用于手动触发同步

	async function syncToOpenClaw() {
		const confirmed = await gShowConfirm({
			message:
				"确定要重新同步到 OpenClaw 工作目录吗？\n\n这将覆盖 ~/.openclaw/workspace/ 下的 Soul 设置文件。",
			title: "确认同步",
		})
		if (!confirmed) return

		syncing.value = true
		try {
			// 重新保存 Soul（自动同步到 OpenClaw）
			const result: any = await invoke("save_soul", {
				data: {
					name: soul.name,
					personality: soul.personality,
					style: soul.style,
					emoticons: soul.emoticons,
					tone: soul.tone,
					content: soul.content,
				},
			})

			if (result.openclaw_warning) {
				gShowDialog({ message: result.openclaw_warning, type: "warning" })
			} else {
				gShowDialog({ message: "已同步到 OpenClaw 工作目录", type: "success" })
			}
		} catch (e) {
			console.error("Sync failed:", e)
			gShowDialog({ message: "同步失败：" + e, type: "error" })
		} finally {
			syncing.value = false
		}
	}

	// ============ 手风琴控制 ============

	function toggleSection(section: string) {
		const index = activeSections.value.indexOf(section)
		if (index > -1) {
			activeSections.value.splice(index, 1)
		} else {
			activeSections.value.push(section)
		}
	}

	function isSectionActive(section: string): boolean {
		return activeSections.value.includes(section)
	}

	// ============ 生命周期 ============

	watch(
		() => props.visible,
		(visible) => {
			if (visible) {
				loadAllData()
				loadMcpConfig()
			}
		},
	)

	onMounted(() => {
		if (props.visible) {
			loadAllData()
			loadMcpConfig()
		}
		// 监听窗口大小变化
		window.addEventListener("resize", updateParentWindowSize)
		// 监听键盘事件用于快捷键录制
		window.addEventListener("keydown", handleKeyDown)
	})

	// 组件卸载时移除监听
	onUnmounted(() => {
		window.removeEventListener("resize", updateParentWindowSize)
		window.removeEventListener("keydown", handleKeyDown)
	})
</script>

<template>
	<Teleport to="body">
		<div
			v-if="visible"
			class="modal-overlay"
			@click.self="emit('close')"
		>
			<div
				class="modal-content"
				:style="modalStyle"
			>
				<!-- 加载状态 -->
				<div
					v-if="loading"
					class="loading-overlay"
				>
					<div class="loading-spinner"></div>
					<p>加载中...</p>
				</div>

				<!-- 主要内容 -->
				<template v-else>
					<!-- 标题栏 -->
					<div class="modal-header">
						<h2>角色设置</h2>
						<button
							class="close-btn"
							@click="emit('close')"
						>
							×
						</button>
					</div>

					<!-- 手风琴内容 -->
					<div class="accordion">
						<!-- 身份设置 -->
						<div class="accordion-item">
							<div
								class="accordion-header"
								@click="toggleSection('identity')"
							>
								<span class="accordion-icon">👤</span>
								<span class="accordion-title">身份设置</span>
								<span
									class="accordion-arrow"
									:class="{ active: isSectionActive('identity') }"
									>▼</span
								>
							</div>
							<div
								class="accordion-content"
								:class="{ active: isSectionActive('identity') }"
							>
								<div class="form-grid">
									<div class="form-group">
										<label>名称</label>
										<input
											v-model="identity.name"
											type="text"
											placeholder="选一个你喜欢的名字"
										/>
									</div>
									<div class="form-group">
										<label>生物类型</label>
										<input
											v-model="identity.creatureType"
											type="text"
											placeholder="AI？机器人？使魔？"
										/>
									</div>
									<div class="form-group">
										<label>气质</label>
										<input
											v-model="identity.temperament"
											type="text"
											placeholder="犀利？温暖？混乱？沉稳？"
										/>
									</div>
									<div class="form-group">
										<label>表情符号</label>
										<input
											v-model="identity.emoji"
											type="text"
											placeholder="你的标志"
											maxlength="10"
										/>
									</div>
									<div class="form-group full-width">
										<label>头像路径</label>
										<input
											v-model="identity.avatarPath"
											type="text"
											placeholder="工作区相对路径、http(s) URL 或 data URI"
										/>
									</div>
								</div>
							</div>
						</div>

						<!-- 用户设置 (User) -->
						<div class="accordion-item">
							<div
								class="accordion-header"
								@click="toggleSection('user')"
							>
								<span class="accordion-icon">👥</span>
								<span class="accordion-title">用户设置</span>
								<span
									class="accordion-arrow"
									:class="{ active: isSectionActive('user') }"
									>▼</span
								>
							</div>
							<div
								class="accordion-content"
								:class="{ active: isSectionActive('user') }"
							>
								<p class="section-hint">
									了解使用者的信息，用于提供更好的对话体验
								</p>
								<div class="form-grid">
									<div class="form-group">
										<label>使用者名称</label>
										<input
											v-model="user.name"
											type="text"
											placeholder="用户的名字"
										/>
									</div>
									<div class="form-group">
										<label>称呼</label>
										<input
											v-model="user.callName"
											type="text"
											placeholder="希望你怎么称呼"
										/>
									</div>
									<div class="form-group">
										<label>代词 (可选)</label>
										<input
											v-model="user.pronouns"
											type="text"
											placeholder="他/她/他们"
										/>
									</div>
									<div class="form-group">
										<label>时区</label>
										<input
											v-model="user.timezone"
											type="text"
											placeholder="Asia/Shanghai"
										/>
									</div>
									<div class="form-group full-width">
										<label>备注</label>
										<input
											v-model="user.notes"
											type="text"
											placeholder="其他需要注意的信息"
										/>
									</div>
									<div class="form-group full-width">
										<label>背景上下文</label>
										<textarea
											v-model="user.context"
											class="soul-textarea"
											placeholder="他们关心什么？正在做什么项目？什么让他们烦恼？什么让他们笑？"
											rows="4"
										></textarea>
									</div>
								</div>
							</div>
						</div>

						<!-- 灵魂设置 -->
						<div class="accordion-item">
							<div
								class="accordion-header"
								@click="toggleSection('soul')"
							>
								<span class="accordion-icon">✨</span>
								<span class="accordion-title">灵魂设置</span>
								<span
									class="accordion-arrow"
									:class="{ active: isSectionActive('soul') }"
									>▼</span
								>
							</div>
							<div
								class="accordion-content"
								:class="{ active: isSectionActive('soul') }"
							>
								<p class="section-hint">
									定义角色的性格、说话风格和情绪表达方式
								</p>
								<div class="form-grid">
									<div class="form-group">
										<label>名字</label>
										<input
											v-model="soul.name"
											type="text"
											placeholder="Nova"
										/>
									</div>
									<div class="form-group">
										<label>性格</label>
										<input
											v-model="soul.personality"
											type="text"
											placeholder="活泼、可爱、友好"
										/>
									</div>
									<div class="form-group">
										<label>说话风格</label>
										<input
											v-model="soul.style"
											type="text"
											placeholder="轻松可爱"
										/>
									</div>
									<div class="form-group">
										<label>颜文字</label>
										<input
											v-model="soul.emoticons"
											type="text"
											placeholder="◕‿◕"
										/>
									</div>
									<div class="form-group">
										<label>语气</label>
										<input
											v-model="soul.tone"
											type="text"
											placeholder="简洁有趣"
										/>
									</div>
								</div>
								<div class="form-group full-width">
									<label>系统指令</label>
									<textarea
										v-model="soul.content"
										class="soul-textarea"
										placeholder="在这里输入系统指令..."
										rows="8"
									></textarea>
								</div>
								<p class="section-hint">
									情绪标签 [:emotion:xxx:] 会自动添加到回复中
								</p>
							</div>
						</div>

						<!-- 应用设置 -->
						<div class="accordion-item">
							<div
								class="accordion-header"
								@click="toggleSection('app')"
							>
								<span class="accordion-icon">⚙️</span>
								<span class="accordion-title">应用设置</span>
								<span
									class="accordion-arrow"
									:class="{ active: isSectionActive('app') }"
									>▼</span
								>
							</div>

							<!-- 服务状态面板 -->
							<div class="status-panel">
								<h4>服务状态</h4>
								<div class="status-grid">
									<div class="status-item">
										<span
											class="status-dot"
											:class="
												wsStatus === 'connected'
													? 'online'
													: wsStatus === 'connecting'
														? 'connecting'
														: 'offline'
											"
										></span>
										<span class="status-label">WebSocket</span>
										<span class="status-value">{{
											wsStatus === "connected"
												? "已连接"
												: wsStatus === "connecting"
													? "连接中"
													: "未连接"
										}}</span>
									</div>
									<div class="status-item">
										<span
											class="status-dot"
											:class="mcpStatus ? 'online' : 'offline'"
										></span>
										<span class="status-label">MCP Server</span>
										<span class="status-value">{{
											mcpStatus ? "运行中" : "未运行"
										}}</span>
									</div>
								</div>
								<button
									class="btn-mcp-copy"
									@click="copyMcpConfig"
								>
									复制 MCP 配置
								</button>
							</div>

							<div
								class="accordion-content"
								:class="{ active: isSectionActive('app') }"
							>
								<div class="form-grid">
									<div class="form-group">
										<label>模型路径</label>
										<input
											id="setting-model-path"
											type="text"
											v-model="localSettings.modelPath"
										/>
									</div>
									<div class="form-group">
										<label>窗口宽度</label>
										<input
											id="setting-width"
											type="number"
											v-model="windowSize.width"
										/>
									</div>
									<div class="form-group">
										<label>窗口高度</label>
										<input
											id="setting-height"
											type="number"
											v-model="windowSize.height"
										/>
									</div>
									<div class="form-group">
										<label>聊天服务</label>
										<select v-model="localSettings.chatProvider">
											<option value="openclaw">OpenClaw Gateway</option>
											<option value="llm">LLM (大模型)</option>
										</select>
									</div>
									<!-- OpenClaw 模式下显示 WebSocket 设置 -->
									<template v-if="localSettings.chatProvider === 'openclaw'">
										<div class="form-group">
											<label>WebSocket 地址</label>
											<input
												id="setting-ws-url"
												type="text"
												v-model="localSettings.wsUrl"
												placeholder="ws://127.0.0.1:18789"
											/>
										</div>
										<div class="form-group">
											<label>WebSocket Token (可选)</label>
											<input
												id="setting-ws-token"
												type="password"
												v-model="localSettings.wsToken"
												placeholder="连接 OpenClaw 的认证令牌"
											/>
										</div>
									</template>
									<div class="form-group full-width">
										<label>背景颜色</label>
										<div class="color-picker-row">
											<input
												id="setting-bg-color"
												type="color"
												v-model="localSettings.bgColor"
											/>
											<span class="color-value">{{
												localSettings.bgColor
											}}</span>
											<label class="checkbox-label">
												<input
													id="setting-bg-blur"
													type="checkbox"
													v-model="localSettings.bgBlur"
												/>
												毛玻璃效果
											</label>
										</div>
									</div>
									<div class="form-group full-width">
										<label>背景透明度 ({{ localSettings.bgOpacity }})</label>
										<input
											id="setting-bg-opacity"
											type="range"
											min="0"
											max="1"
											step="0.05"
											v-model="localSettings.bgOpacity"
										/>
									</div>
								</div>

								<!-- LLM 设置 -->
								<div
									v-if="localSettings.chatProvider === 'llm'"
									class="llm-settings"
								>
									<h4>大模型聊天设置</h4>
									<div class="form-grid">
										<div class="form-group">
											<label>API 提供商</label>
											<select v-model="localSettings.llmProvider">
												<option value="none">不使用</option>
												<option value="minimax">MiniMax</option>
												<option value="openai">OpenAI 兼容</option>
											</select>
										</div>
										<div class="form-group">
											<label>API Key</label>
											<input
												id="setting-llm-api-key"
												type="password"
												v-model="localSettings.llmApiKey"
											/>
										</div>
										<div class="form-group full-width">
											<label>API 地址</label>
											<input
												id="setting-llm-api-url"
												type="text"
												v-model="localSettings.llmApiUrl"
												placeholder="https://api.minimax.chat/v1/text/chatcompletion_v2"
											/>
										</div>
										<div class="form-group">
											<label>模型名称</label>
											<input
												id="setting-llm-model"
												type="text"
												v-model="localSettings.llmModel"
												placeholder="abab6.5s-chat"
											/>
										</div>
									</div>
								</div>

								<!-- 定时问候设置 -->
								<div class="greeting-settings">
									<h4>定时问候</h4>
									<div class="form-grid">
										<div class="form-group full-width">
											<label class="switch-label">
												<input
													type="checkbox"
													:checked="greetingConfig.enabled"
													@change="updateGreeting({ enabled: ($event.target as HTMLInputElement).checked })"
												/>
												<span class="switch-text">启用定时问候</span>
											</label>
										</div>
										<template v-if="greetingConfig.enabled">
											<div class="form-group">
												<label>提醒时间</label>
												<select
													:value="greetingConfig.time"
													@change="updateGreeting({ time: ($event.target as HTMLSelectElement).value })"
												>
													<option value="09:00">09:00 早上</option>
													<option value="12:00">12:00 中午</option>
													<option value="18:00">18:00 傍晚</option>
													<option value="21:00">21:00 晚上</option>
												</select>
											</div>
											<div class="form-group">
												<label>提醒频率</label>
												<select
													:value="greetingConfig.interval"
													@change="updateGreeting({ interval: ($event.target as HTMLSelectElement).value as 'daily' | 'hourly' })"
												>
													<option value="daily">每天</option>
													<option value="hourly">每小时</option>
												</select>
											</div>
											<div class="form-group full-width">
												<label>问候消息</label>
												<textarea
													:value="greetingConfig.message"
													@input="updateGreeting({ message: ($event.target as HTMLTextAreaElement).value })"
													placeholder="输入问候消息..."
													rows="3"
												></textarea>
											</div>
										</template>
									</div>
								</div>

								<!-- 快捷键设置 -->
								<div class="hotkey-settings">
									<h4>快捷键设置</h4>
									<p class="section-hint">点击快捷键按钮，然后按下新的快捷键组合</p>
									<div class="hotkey-list">
										<div
											v-for="(hotkey, index) in hotkeySettings"
											:key="index"
											class="hotkey-item"
										>
											<div class="hotkey-action">
												{{ getHotkeyActionLabel(hotkey.action) }}
											</div>
											<div class="hotkey-controls">
												<button
													class="hotkey-btn"
													:class="{ recording: recordingIndex === index }"
													@click="startRecording(index)"
												>
													{{ recordingIndex === index ? "按键中..." : hotkey.shortcut }}
												</button>
												<label class="switch-label">
													<input
														type="checkbox"
														:checked="hotkey.enabled"
														@change="updateHotkey(index, 'enabled', ($event.target as HTMLInputElement).checked)"
													/>
												</label>
											</div>
										</div>
									</div>
									<button
										v-if="recordingIndex !== null"
										class="cancel-record-btn"
										@click="cancelRecording"
									>
										取消
									</button>
								</div>

								<!-- 重置引导按钮 -->
								<div class="reset-onboarding-section">
									<button
										class="reset-onboarding-btn"
										@click="handleResetOnboarding"
									>
										重新显示引导
									</button>
									<p class="reset-hint">点击重新显示首次使用引导</p>
								</div>
							</div>
						</div>
					</div>

					<!-- 底部操作栏 -->
					<div class="modal-footer">
						<button
							class="sync-btn"
							@click="syncToOpenClaw"
							:disabled="syncing"
						>
							{{ syncing ? "同步中..." : "同步到 OpenClaw" }}
						</button>
						<div class="footer-right">
							<button
								class="cancel-btn"
								@click="emit('close')"
							>
								取消
							</button>
							<button
								class="save-btn"
								@click="saveAll"
								:disabled="saving"
							>
								{{ saving ? "保存中..." : "保存" }}
							</button>
						</div>
					</div>
				</template>
			</div>
		</div>
	</Teleport>
</template>

<style scoped>
	/* 遮罩层 */
	.modal-overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.6);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 2000;
		backdrop-filter: blur(4px);
	}

	/* 主内容区 */
	.modal-content {
		background: linear-gradient(
			145deg,
			rgba(30, 41, 59, 0.95),
			rgba(15, 23, 42, 0.98)
		);
		border-radius: 24px;
		padding: 0;
		width: 90vw;
		height: 90vh;
		min-width: 300px;
		min-height: 600px;
		max-width: 800px;
		max-height: 1200px;
		overflow: hidden;
		display: flex;
		flex-direction: column;
		box-shadow:
			0 25px 50px -12px rgba(0, 0, 0, 0.5),
			0 0 0 1px rgba(255, 255, 255, 0.1);
	}

	/* 响应式调整 */
	@media (max-width: 600px) {
		.modal-content {
			width: 95vw;
			height: 95vh;
			border-radius: 16px;
		}
	}

	@media (max-height: 700px) {
		.modal-content {
			height: 95vh;
			max-height: none;
		}
	}

	/* 加载状态 */
	.loading-overlay {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 16px;
		color: #94a3b8;
	}

	.loading-spinner {
		width: 40px;
		height: 40px;
		border: 3px solid rgba(56, 189, 248, 0.2);
		border-top-color: #22d3ee;
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	/* 标题栏 */
	.modal-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 16px;
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
		background: rgba(0, 0, 0, 0.2);
	}

	@media (min-width: 600px) {
		.modal-header {
			padding: 20px 24px;
		}
	}

	.modal-header h2 {
		margin: 0;
		font-size: 16px;
		font-weight: 600;
		color: #f1f5f9;
		background: linear-gradient(135deg, #22d3ee, #818cf8);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
	}

	@media (min-width: 600px) {
		.modal-header h2 {
			font-size: 20px;
		}
	}

	.close-btn {
		width: 32px;
		height: 32px;
		font-size: 20px;
		border: none;
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.1);
		color: #94a3b8;
		font-size: 24px;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.2s;
	}

	@media (min-width: 600px) {
		.close-btn {
			width: 36px;
			height: 36px;
			border-radius: 50%;
			background: rgba(255, 255, 255, 0.1);
			color: #94a3b8;
			font-size: 24px;
			cursor: pointer;
			display: flex;
			align-items: center;
			justify-content: center;
			transition: all 0.2s;
		}
	}

	.close-btn:hover {
		background: rgba(239, 68, 68, 0.2);
		color: #ef4444;
	}

	/* 手风琴 */
	.accordion {
		flex: 1;
		overflow-y: auto;
		padding: 12px 16px;
	}

	@media (min-width: 600px) {
		.accordion {
			padding: 16px 24px;
		}
	}

	.accordion-item {
		margin-bottom: 8px;
		border-radius: 12px;
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid rgba(255, 255, 255, 0.05);
		overflow: hidden;
		transition: all 0.3s ease;
	}

	.accordion-item:hover {
		border-color: rgba(56, 189, 248, 0.2);
	}

	@media (min-width: 500px) {
		.accordion-item {
			margin-bottom: 12px;
			border-radius: 16px;
		}
	}

	.accordion-header {
		display: flex;
		align-items: center;
		padding: 12px 14px;
		cursor: pointer;
		gap: 10px;
		transition: background 0.2s;
	}

	.accordion-header:hover {
		background: rgba(255, 255, 255, 0.03);
	}

	.accordion-icon {
		font-size: 16px;
	}

	.accordion-title {
		flex: 1;
		font-size: 13px;
		font-weight: 500;
		color: #e2e8f0;
	}

	@media (min-width: 500px) {
		.accordion-header {
			padding: 16px 20px;
			gap: 12px;
		}

		.accordion-icon {
			font-size: 20px;
		}

		.accordion-title {
			font-size: 15px;
		}
	}

	.accordion-arrow {
		font-size: 12px;
		color: #64748b;
		transition: transform 0.3s;
	}

	.accordion-arrow.active {
		transform: rotate(180deg);
	}

	.accordion-content {
		max-height: 0;
		overflow: hidden;
		transition:
			max-height 0.3s ease,
			padding 0.3s ease;
	}

	.accordion-content.active {
		max-height: 2000px;
		padding: 12px;
	}

	@media (min-width: 500px) {
		.accordion-content.active {
			padding: 20px;
		}
	}

	/* 表单样式 */
	.form-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 16px;
	}

	.form-group {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.form-group.full-width {
		grid-column: span 2;
	}

	/* 响应式表单 - 根据窗体宽度调整列数 */
	@media (max-width: 400px) {
		.form-grid {
			grid-template-columns: 1fr;
			gap: 12px;
		}

		.form-group.full-width {
			grid-column: span 1;
		}
	}

	@media (min-width: 401px) and (max-width: 500px) {
		.form-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	.form-group label {
		font-size: 12px;
		color: #94a3b8;
		font-weight: 500;
	}

	/* 区块提示文字 */
	.section-hint {
		font-size: 12px;
		color: #64748b;
		margin: 0 0 16px;
		font-style: italic;
	}

	.form-group input,
	.form-group select {
		padding: 8px 10px;
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 8px;
		background: rgba(0, 0, 0, 0.3);
		color: #e2e8f0;
		font-size: 13px;
		transition: all 0.2s;
	}

	@media (min-width: 500px) {
		.form-group input,
		.form-group select {
			padding: 10px 14px;
			font-size: 14px;
			border-radius: 10px;
		}
	}

	.form-group input:focus,
	.form-group select:focus {
		outline: none;
		border-color: rgba(56, 189, 248, 0.5);
		background: rgba(0, 0, 0, 0.4);
	}

	.form-group input::placeholder {
		color: #475569;
	}

	.form-group select {
		cursor: pointer;
	}

	/* 颜色选择器 */
	.color-picker-row {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.color-picker-row input[type="color"] {
		width: 40px;
		height: 40px;
		padding: 2px;
		border-radius: 8px;
		cursor: pointer;
	}

	.color-value {
		font-size: 13px;
		color: #64748b;
		font-family: monospace;
	}

	.checkbox-label {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 13px;
		color: #94a3b8;
		cursor: pointer;
	}

	.checkbox-label input {
		width: 16px;
		height: 16px;
	}

	/* Soul 编辑器 */
	.soul-controls {
		display: flex;
		align-items: center;
		gap: 12px;
		margin-bottom: 12px;
	}

	.soul-hint {
		font-size: 12px;
		color: #64748b;
		font-style: italic;
	}

	.soul-textarea {
		width: 100%;
		height: 35vh;
		min-height: 150px;
		max-height: 60vh;
		padding: 10px;
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 10px;
		background: rgba(0, 0, 0, 0.4);
		color: #e2e8f0;
		font-size: 12px;
		font-family: "Consolas", "Monaco", monospace;
		line-height: 1.5;
		resize: vertical;
		transition: all 0.2s;
	}

	@media (min-width: 500px) {
		.soul-textarea {
			height: 40vh;
			min-height: 200px;
			padding: 14px;
			font-size: 13px;
			border-radius: 12px;
			line-height: 1.6;
		}
	}

	.soul-textarea:focus {
		outline: none;
		border-color: rgba(56, 189, 248, 0.5);
	}

	.soul-textarea[readonly] {
		background: rgba(0, 0, 0, 0.2);
		cursor: default;
	}

	/* 编辑按钮 */
	.edit-btn,
	.cancel-btn {
		padding: 8px 16px;
		border: 1px solid rgba(56, 189, 248, 0.5);
		border-radius: 8px;
		background: rgba(56, 189, 248, 0.1);
		color: #22d3ee;
		font-size: 13px;
		cursor: pointer;
		transition: all 0.2s;
	}

	.edit-btn:hover {
		background: rgba(56, 189, 248, 0.2);
	}

	.cancel-btn {
		border-color: rgba(239, 68, 68, 0.5);
		background: rgba(239, 68, 68, 0.1);
		color: #ef4444;
	}

	.cancel-btn:hover {
		background: rgba(239, 68, 68, 0.2);
	}

	/* LLM 设置 */
	.llm-settings {
		margin-top: 20px;
		padding-top: 20px;
		border-top: 1px solid rgba(255, 255, 255, 0.1);
	}

	.llm-settings h4 {
		margin: 0 0 16px;
		font-size: 14px;
		color: #94a3b8;
	}

	/* 定时问候设置 */
	.greeting-settings {
		margin-top: 20px;
		padding-top: 20px;
		border-top: 1px solid rgba(255, 255, 255, 0.1);
	}

	.greeting-settings h4 {
		margin: 0 0 16px;
		font-size: 14px;
		color: #94a3b8;
	}

	.switch-label {
		display: flex;
		align-items: center;
		gap: 12px;
		cursor: pointer;
	}

	.switch-label input[type="checkbox"] {
		width: 20px;
		height: 20px;
		accent-color: #22d3ee;
		cursor: pointer;
	}

	.switch-text {
		font-size: 14px;
		color: #e2e8f0;
	}

	.greeting-settings textarea {
		width: 100%;
		padding: 10px;
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 8px;
		background: rgba(0, 0, 0, 0.3);
		color: #e2e8f0;
		font-size: 13px;
		resize: vertical;
		transition: all 0.2s;
	}

	.greeting-settings textarea:focus {
		outline: none;
		border-color: rgba(56, 189, 248, 0.5);
	}

	/* 底部操作栏 */
	.modal-footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 12px 16px;
		border-top: 1px solid rgba(255, 255, 255, 0.1);
		background: rgba(0, 0, 0, 0.2);
		flex-wrap: wrap;
		gap: 12px;
	}

	@media (min-width: 600px) {
		.modal-footer {
			padding: 16px 24px;
		}
	}

	.footer-right {
		display: flex;
		gap: 8px;
	}

	@media (min-width: 600px) {
		.footer-right {
			gap: 12px;
		}
	}

	.sync-btn {
		padding: 8px 12px;
		font-size: 13px;
		border: 1px solid rgba(34, 197, 94, 0.5);
		border-radius: 10px;
	}

	@media (min-width: 600px) {
		.sync-btn {
			padding: 10px 20px;
			font-size: 14px;
			background: rgba(34, 197, 94, 0.1);
			color: #22c55e;
			font-size: 14px;
			cursor: pointer;
			transition: all 0.2s;
		}
	}

	.sync-btn:hover:not(:disabled) {
		background: rgba(34, 197, 94, 0.2);
	}

	.sync-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.reset-onboarding-section {
		margin-top: 20px;
		padding-top: 16px;
		border-top: 1px solid rgba(255, 255, 255, 0.1);
		text-align: center;
	}

	.reset-onboarding-btn {
		padding: 10px 20px;
		border-radius: 10px;
		font-size: 14px;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s;
		border: none;
		background: linear-gradient(135deg, #22d3ee, #3b82f6);
		color: white;
	}

	.reset-onboarding-btn:hover {
		background: linear-gradient(135deg, #67e8f9, #60a5fa);
		transform: translateY(-1px);
	}

	.reset-hint {
		margin: 8px 0 0;
		font-size: 12px;
		color: #64748b;
	}

	.cancel-btn {
		padding: 8px 16px;
		font-size: 13px;
		border: none;
		border-radius: 10px;
		background: rgba(255, 255, 255, 0.1);
		color: #94a3b8;
	}

	@media (min-width: 600px) {
		.cancel-btn {
			padding: 10px 20px;
			font-size: 14px;
			cursor: pointer;
			transition: all 0.2s;
		}
	}

	.cancel-btn:hover {
		background: rgba(255, 255, 255, 0.15);
	}

	.save-btn {
		padding: 8px 16px;
		font-size: 13px;
		border: none;
		border-radius: 10px;
		background: linear-gradient(135deg, #22d3ee, #3b82f6);
		color: white;
	}

	@media (min-width: 600px) {
		.save-btn {
			padding: 10px 24px;
			font-size: 14px;
			font-weight: 500;
			cursor: pointer;
			transition: all 0.2s;
		}
	}
	.save-btn:hover:not(:disabled) {
		background: linear-gradient(135deg, #67e8f9, #60a5fa);
		transform: translateY(-1px);
	}

	.save-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	/* 滚动条 */
	.accordion::-webkit-scrollbar {
		width: 8px;
	}

	.accordion::-webkit-scrollbar-track {
		background: rgba(0, 0, 0, 0.2);
		border-radius: 4px;
	}

	.accordion::-webkit-scrollbar-thumb {
		background: rgba(255, 255, 255, 0.1);
		border-radius: 4px;
	}

	.accordion::-webkit-scrollbar-thumb:hover {
		background: rgba(255, 255, 255, 0.2);
	}

	/* 服务状态面板 */
	.status-panel {
		background: rgba(0, 0, 0, 0.3);
		border-radius: 12px;
		padding: 16px;
		margin: 12px 16px;
	}

	.status-panel h4 {
		margin: 0 0 12px;
		font-size: 14px;
		color: #94a3b8;
		font-weight: 500;
	}

	.status-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 12px;
		margin-bottom: 12px;
	}

	.status-item {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.status-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		flex-shrink: 0;
	}

	.status-dot.online {
		background: #22c55e;
		box-shadow: 0 0 6px #22c55e;
	}

	.status-dot.connecting {
		background: #eab308;
		animation: pulse 1s infinite;
	}

	.status-dot.offline {
		background: #6b7280;
	}

	@keyframes pulse {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0.5;
		}
	}

	.status-label {
		font-size: 12px;
		color: #94a3b8;
	}

	.status-value {
		font-size: 12px;
		color: #f1f5f9;
		margin-left: auto;
	}

	.btn-mcp-copy {
		width: 100%;
		padding: 10px 16px;
		background: rgba(59, 130, 246, 0.2);
		border: 1px solid rgba(59, 130, 246, 0.3);
		border-radius: 8px;
		color: #60a5fa;
		font-size: 13px;
		cursor: pointer;
		transition: all 0.2s;
	}

	.btn-mcp-copy:hover {
		background: rgba(59, 130, 246, 0.3);
		border-color: rgba(59, 130, 246, 0.5);
	}

	/* 快捷键设置 */
	.hotkey-settings {
		margin-top: 20px;
		padding-top: 20px;
		border-top: 1px solid rgba(255, 255, 255, 0.1);
	}

	.hotkey-settings h4 {
		margin: 0 0 12px;
		font-size: 14px;
		color: #94a3b8;
	}

	.hotkey-list {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.hotkey-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 10px 12px;
		background: rgba(0, 0, 0, 0.2);
		border-radius: 8px;
		border: 1px solid rgba(255, 255, 255, 0.05);
	}

	.hotkey-action {
		font-size: 13px;
		color: #e2e8f0;
	}

	.hotkey-controls {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.hotkey-btn {
		min-width: 120px;
		padding: 6px 12px;
		background: rgba(255, 255, 255, 0.1);
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 6px;
		color: #e2e8f0;
		font-size: 12px;
		font-family: monospace;
		cursor: pointer;
		transition: all 0.2s;
	}

	.hotkey-btn:hover {
		background: rgba(255, 255, 255, 0.15);
		border-color: rgba(56, 189, 248, 0.5);
	}

	.hotkey-btn.recording {
		background: rgba(234, 179, 8, 0.2);
		border-color: #eab308;
		color: #eab308;
		animation: pulse 1s infinite;
	}

	.cancel-record-btn {
		margin-top: 12px;
		padding: 6px 16px;
		background: rgba(239, 68, 68, 0.1);
		border: 1px solid rgba(239, 68, 68, 0.3);
		border-radius: 6px;
		color: #ef4444;
		font-size: 12px;
		cursor: pointer;
	}

	.cancel-record-btn:hover {
		background: rgba(239, 68, 68, 0.2);
	}
</style>
