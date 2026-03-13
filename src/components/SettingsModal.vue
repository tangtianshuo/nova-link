<script setup lang="ts">
	import { ref, reactive, onMounted, watch, nextTick } from "vue"
	import { getCurrentWindow, LogicalSize } from "@tauri-apps/api/window"
	import { invoke } from "@tauri-apps/api/core"
	import { useSettings, type AppSettings } from "../composables"

	const props = defineProps<{
		visible: boolean
	}>()

	const emit = defineEmits<{
		close: []
		save: [settings: AppSettings]
	}>()

	const { settings, saveSettings, updateLlmConfig } = useSettings()

	const localSettings = reactive<AppSettings>({ ...settings.value })
	const windowSize = reactive({ width: 450, height: 900 })

	// Soul 人格相关状态
	const soulContent = ref("")
	const soulLoading = ref(false)
	const soulSaving = ref(false)
	const soulSyncing = ref(false)
	const showSoulEditor = ref(false)

	// 同步人格到 OpenClaw 目录
	async function syncSoulToOpenclaw() {
		// 先保存当前内容
		if (!soulContent.value) {
			console.warn("Soul content is empty")
			return
		}

		const confirmed = confirm(
			"确定要将人格设定同步到 OpenClaw 工作目录吗？\n\n这将覆盖 .openclaw/workspace/SOUL.md 文件。",
		)
		if (!confirmed) return

		soulSyncing.value = true
		try {
			// 保存 Soul（自动同步到 OpenClaw）
			await invoke("save_soul", {
				data: {
					name: "Nova",
					personality: "",
					style: "",
					emoticons: "",
					tone: "",
					content: soulContent.value,
				}
			})
			alert(`人格已同步到：\n${path}`)
			console.log("Soul synced to OpenClaw:", path)
		} catch (e) {
			console.error("Failed to sync soul:", e)
			alert("同步失败：" + e)
		} finally {
			soulSyncing.value = false
		}
	}

	// 获取人格提示词信息（用于 LLM 模式）
	function getLlmPromptInfo() {
		return "在 LLM 模式下，人格设定已作为系统提示词自动合并到每次对话中"
	}

	// 加载 soul
	async function loadSoul() {
		soulLoading.value = true
		try {
			const content = await invoke<string>("load_soul")
			soulContent.value = content
		} catch (e) {
			console.error("Failed to load soul:", e)
		} finally {
			soulLoading.value = false
		}
	}

	// 保存 soul
	async function saveSoul() {
		soulSaving.value = true
		try {
			await invoke("save_soul", {
				data: {
					name: "Nova",
					personality: "",
					style: "",
					emoticons: "",
					tone: "",
					content: soulContent.value,
				}
			})
			console.log("Soul saved successfully")
		} catch (e) {
			console.error("Failed to save soul:", e)
		} finally {
			soulSaving.value = false
		}
	}

	// 重置 soul 为默认值
	async function resetSoul() {
		const defaultSoul = `# Nova Link 人格设定

## 角色信息
- 名字：Nova
- 性格：活泼、可爱、友好

## 说话风格
- 使用轻松可爱的语气
- 适当使用颜文字 (◕‿◕)
- 保持简洁有趣的回复
- 根据内容适当表达情绪

## 情绪表达时机
- 开心时：[:emotion:happy:2000:]
- 难过时：[:emotion:sad:3000:]
- 惊讶时：[:emotion:surprised:1500:]
- 生气时：[:emotion:angry:3000:]

## 系统指令
你是一个可爱的虚拟助手，名字叫 Nova。根据用户的对话内容，适时表达情绪。
情绪标签格式：[:emotion:{类型}:{持续时间毫秒}]

可用情绪类型：
- happy: 开心
- sad: 难过
- surprised: 惊讶
- angry: 生气

请在回复中适当嵌入情绪标签，这些标签仅用于驱动动画，不会显示给用户。`
		soulContent.value = defaultSoul
	}

	// 打开人格编辑器时加载内容
	watch(showSoulEditor, (show) => {
		if (show && !soulContent.value) {
			loadSoul()
		}
	})

	watch(
		() => props.visible,
		async (visible) => {
			if (visible) {
				Object.assign(localSettings, settings.value)
				try {
					const currentSize = await invoke<{ width: number; height: number }>(
						"get_window_size",
					)
					windowSize.width = currentSize.width
					windowSize.height = currentSize.height
				} catch (e) {
					console.error("Failed to load window size:", e)
				}
			}
		},
	)

	const chatProvider = ref<"llm" | "openclaw">(settings.value.chatProvider)

	function updateProviderUI() {
		const btnOpenclaw = document.getElementById(
			"btn-provider-openclaw",
		) as HTMLButtonElement | null
		const btnLlm = document.getElementById(
			"btn-provider-llm",
		) as HTMLButtonElement | null
		const wsUrlInput = document.getElementById(
			"setting-ws-url",
		) as HTMLInputElement | null
		const wsTokenInput = document.getElementById(
			"setting-ws-token",
		) as HTMLInputElement | null
		const llmProviderSelect = document.getElementById(
			"setting-llm-provider",
		) as HTMLSelectElement | null
		const llmApiKeyInput = document.getElementById(
			"setting-llm-api-key",
		) as HTMLInputElement | null
		const llmApiUrlInput = document.getElementById(
			"setting-llm-api-url",
		) as HTMLInputElement | null
		const llmModelInput = document.getElementById(
			"setting-llm-model",
		) as HTMLInputElement | null

		if (chatProvider.value === "openclaw") {
			btnOpenclaw &&
				(btnOpenclaw.style.background =
					"linear-gradient(135deg, #22d3ee, #3b82f6)")
			btnLlm && (btnLlm.style.background = "rgba(255,255,255,0.1)")
			wsUrlInput && (wsUrlInput.disabled = false)
			wsTokenInput && (wsTokenInput.disabled = false)
			llmProviderSelect && (llmProviderSelect.disabled = true)
			llmApiKeyInput && (llmApiKeyInput.disabled = true)
			llmApiUrlInput && (llmApiUrlInput.disabled = true)
			llmModelInput && (llmModelInput.disabled = true)
		} else {
			btnOpenclaw && (btnOpenclaw.style.background = "rgba(255,255,255,0.1)")
			btnLlm &&
				(btnLlm.style.background = "linear-gradient(135deg, #22d3ee, #3b82f6)")
			wsUrlInput && (wsUrlInput.disabled = true)
			wsTokenInput && (wsTokenInput.disabled = true)
			llmProviderSelect && (llmProviderSelect.disabled = false)
			llmApiKeyInput && (llmApiKeyInput.disabled = false)
			llmApiUrlInput && (llmApiUrlInput.disabled = false)
			llmModelInput && (llmModelInput.disabled = false)
		}
	}

	function setChatProvider(provider: "llm" | "openclaw") {
		chatProvider.value = provider
		updateProviderUI()
	}

	async function handleSave() {
		const modelPath = (
			document.getElementById("setting-model-path") as HTMLInputElement
		)?.value
		const width = windowSize.width
		const height = windowSize.height
		const wsUrl = (
			document.getElementById("setting-ws-url") as HTMLInputElement
		)?.value
		const wsToken = (
			document.getElementById("setting-ws-token") as HTMLInputElement
		)?.value
		const llmProvider = (
			document.getElementById("setting-llm-provider") as HTMLSelectElement
		)?.value as AppSettings["llmProvider"]
		const llmApiKey = (
			document.getElementById("setting-llm-api-key") as HTMLInputElement
		)?.value
		const llmApiUrl = (
			document.getElementById("setting-llm-api-url") as HTMLInputElement
		)?.value
		const llmModel = (
			document.getElementById("setting-llm-model") as HTMLInputElement
		)?.value
		const bgColor = (
			document.getElementById("setting-bg-color") as HTMLInputElement
		)?.value
		const bgOpacity = parseFloat(
			(document.getElementById("setting-bg-opacity") as HTMLInputElement)
				?.value || "0.8",
		)
		const bgBlur = (
			document.getElementById("setting-bg-blur") as HTMLInputElement
		)?.checked ?? true

		localSettings.modelPath = modelPath
		localSettings.wsUrl = wsUrl
		localSettings.wsToken = wsToken
		localSettings.chatProvider = chatProvider.value
		localSettings.llmProvider = llmProvider
		localSettings.llmApiKey = llmApiKey
		localSettings.llmApiUrl = llmApiUrl
		localSettings.llmModel = llmModel
		localSettings.bgColor = bgColor
		localSettings.bgOpacity = bgOpacity
		localSettings.bgBlur = bgBlur

		try {
			// 移除 windowX/Y 更新，因为 AppSettings 已不再包含这些字段
			// const win = await getCurrentWindow()
			// const position = await win.outerPosition()
		} catch (e) {
			console.error("[SettingsModal] Failed to get window position:", e)
		}

		Object.assign(settings.value, localSettings)
		await saveSettings()
		await updateLlmConfig()

		const win = await getCurrentWindow()
		await win.setSize(new LogicalSize(width, height))

		emit("save", localSettings)
		emit("close")
	}

	function handleCancel() {
		emit("close")
	}

	onMounted(() => {
		nextTick(() => {
			updateProviderUI()
		})
	})
</script>

<template>
	<Teleport to="body">
		<div
			v-if="visible"
			id="settings-modal"
			class="modal-overlay"
			@click.self="handleCancel"
		>
			<div class="modal-content">
				<h3>设置</h3>

				<div class="form-group">
					<label>模型路径</label>
					<input
						id="setting-model-path"
						type="text"
						:value="localSettings.modelPath"
					/>
				</div>

				<div class="form-row">
					<div class="form-group">
						<label>宽度</label>
						<input
							id="setting-width"
							type="number"
							v-model="windowSize.width"
						/>
					</div>
					<div class="form-group">
						<label>高度</label>
						<input
							id="setting-height"
							type="number"
							v-model="windowSize.height"
						/>
					</div>
				</div>

				<div class="form-row">
					<div class="form-group">
						<label>背景颜色</label>
						<input
							id="setting-bg-color"
							type="color"
							:value="localSettings.bgColor"
						/>
					</div>
					<div class="form-group">
						<label>背景透明度 ({{ localSettings.bgOpacity }})</label>
						<input
							id="setting-bg-opacity"
							type="range"
							min="0"
							max="1"
							step="0.05"
							:value="localSettings.bgOpacity"
						/>
					</div>
				</div>

				<div class="form-group">
					<label class="checkbox-label">
						<input
							id="setting-bg-blur"
							type="checkbox"
							:checked="localSettings.bgBlur"
						/>
						启用毛玻璃效果
					</label>
				</div>

				<div class="form-group">
					<label>WebSocket 地址</label>
					<input
						id="setting-ws-url"
						type="text"
						:value="localSettings.wsUrl"
					/>
				</div>

				<div class="form-group">
					<label>WebSocket Token (可选)</label>
					<input
						id="setting-ws-token"
						type="password"
						:value="localSettings.wsToken"
					/>
				</div>

				<div class="form-group">
					<label>聊天服务</label>
					<div class="btn-group">
						<button
							id="btn-provider-openclaw"
							type="button"
							:class="{ active: chatProvider === 'openclaw' }"
							@click="setChatProvider('openclaw')"
						>
							OpenClaw
						</button>
						<button
							id="btn-provider-llm"
							type="button"
							:class="{ active: chatProvider === 'llm' }"
							@click="setChatProvider('llm')"
						>
							LLM
						</button>
					</div>
				</div>

				<hr />

				<!-- 人格设置 -->
				<div class="form-group">
					<h4>人格设定 (Soul)</h4>
					<p class="help-text">
						定义角色的性格、说话风格和情绪表达方式
					</p>
					<div v-if="!showSoulEditor" class="soul-actions">
						<button
							id="setting-soul-edit"
							@click="showSoulEditor = true"
						>
							编辑人格
						</button>
						<!-- 同步按钮 - 根据聊天模式显示不同内容 -->
						<button
							v-if="chatProvider === 'openclaw'"
							id="setting-soul-sync"
							@click="syncSoulToOpenclaw"
							:disabled="soulSyncing"
							class="sync-btn"
						>
							{{ soulSyncing ? "同步中..." : "同步到 OpenClaw" }}
						</button>
						<span v-else class="llm-prompt-info">
							{{ getLlmPromptInfo() }}
						</span>
					</div>
					<div v-else class="soul-editor">
						<div class="soul-toolbar">
							<button @click="loadSoul" :disabled="soulLoading">
								{{ soulLoading ? "加载中..." : "重新加载" }}
							</button>
							<button @click="resetSoul">重置默认</button>
							<!-- 编辑模式下的同步按钮 -->
							<button
								v-if="chatProvider === 'openclaw'"
								@click="syncSoulToOpenclaw"
								:disabled="soulSyncing"
								class="sync-btn"
							>
								{{ soulSyncing ? "同步中..." : "同步到 OpenClaw" }}
							</button>
						</div>
						<textarea
							v-model="soulContent"
							class="soul-textarea"
							placeholder="在此编辑人格设定..."
							rows="15"
						></textarea>
						<div class="soul-toolbar">
							<button @click="showSoulEditor = false">取消</button>
							<button
								id="setting-soul-save"
								@click="saveSoul"
								:disabled="soulSaving"
								class="primary"
							>
								{{ soulSaving ? "保存中..." : "保存人格" }}
							</button>
						</div>
					</div>
				</div>

				<h4>大模型聊天设置</h4>

				<div class="form-group">
					<label>API 提供商</label>
					<select
						id="setting-llm-provider"
						:value="localSettings.llmProvider"
					>
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
						:value="localSettings.llmApiKey"
					/>
				</div>

				<div class="form-group">
					<label>API 地址</label>
					<input
						id="setting-llm-api-url"
						type="text"
						:value="localSettings.llmApiUrl"
						placeholder="https://api.minimax.chat/v1/text/chatcompletion_v2"
					/>
				</div>

				<div class="form-group">
					<label>模型名称</label>
					<input
						id="setting-llm-model"
						type="text"
						:value="localSettings.llmModel"
						placeholder="abab6.5s-chat"
					/>
				</div>

				<div class="form-actions">
					<button
						id="setting-cancel"
						@click="handleCancel"
					>
						取消
					</button>
					<button
						id="setting-save"
						@click="handleSave"
					>
						保存
					</button>
				</div>
			</div>
		</div>
	</Teleport>
</template>

<style scoped>
	.modal-overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.7);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 2000;
	}

	.modal-content {
		background: rgba(15, 23, 42, 0.98);
		border-radius: 16px;
		padding: 24px;
		width: 360px;
		max-width: 90vw;
		max-height: 80vh;
		overflow-y: auto;
	}

	h3 {
		margin: 0 0 16px;
		color: #e2e8f0;
		font-size: 16px;
	}

	h4 {
		margin: 0 0 12px;
		color: #e2e8f0;
		font-size: 14px;
	}

	hr {
		border: none;
		border-top: 1px solid rgba(255, 255, 255, 0.1);
		margin: 16px 0;
	}

	.form-group {
		margin-bottom: 12px;
	}

	.form-row {
		display: flex;
		gap: 8px;
	}

	.form-row .form-group {
		flex: 1;
	}

	label {
		display: block;
		color: #94a3b8;
		font-size: 12px;
		margin-bottom: 4px;
	}

	input,
	select {
		width: 100%;
		padding: 8px;
		border: none;
		border-radius: 8px;
		background: rgba(255, 255, 255, 0.1);
		color: #e2e8f0;
		font-size: 13px;
		box-sizing: border-box;
	}

	input:focus,
	select:focus {
		outline: 2px solid rgba(34, 211, 238, 0.5);
	}

	input[type="color"] {
		padding: 2px;
		height: 36px;
		cursor: pointer;
	}

	input[type="range"] {
		padding: 0;
		background: transparent;
	}

	.checkbox-label {
		display: flex;
		align-items: center;
		gap: 8px;
		cursor: pointer;
		color: #e2e8f0;
		font-size: 13px;
	}

	.checkbox-label input[type="checkbox"] {
		width: 16px;
		height: 16px;
		cursor: pointer;
	}

	.btn-group {
		display: flex;
		gap: 8px;
	}

	.btn-group button {
		flex: 1;
		padding: 8px 12px;
		border: none;
		border-radius: 8px;
		background: rgba(255, 255, 255, 0.1);
		color: #e2e8f0;
		cursor: pointer;
		font-size: 13px;
		transition: background 0.2s;
	}

	.btn-group button.active {
		background: linear-gradient(135deg, #22d3ee, #3b82f6);
	}

	.form-actions {
		display: flex;
		justify-content: flex-end;
		gap: 8px;
		margin-top: 16px;
	}

	.form-actions button {
		padding: 8px 16px;
		border: none;
		border-radius: 8px;
		cursor: pointer;
		font-size: 13px;
	}

	#setting-cancel {
		background: rgba(255, 255, 255, 0.1);
		color: #e2e8f0;
	}

	#setting-save {
		background: linear-gradient(135deg, #22d3ee, #3b82f6);
		color: white;
	}

	/* Soul 人格编辑器样式 */
	.help-text {
		font-size: 12px;
		color: #94a3b8;
		margin-bottom: 12px;
	}

	.soul-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		align-items: center;
	}

	.soul-actions button {
		padding: 8px 16px;
		border: 1px solid rgba(56, 189, 248, 0.5);
		border-radius: 8px;
		background: rgba(56, 189, 248, 0.1);
		color: #22d3ee;
		cursor: pointer;
		font-size: 13px;
		transition: all 0.2s;
	}

	.soul-actions button:hover {
		background: rgba(56, 189, 248, 0.2);
	}

	.soul-actions button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	/* 同步按钮样式 */
	.soul-actions .sync-btn {
		border-color: rgba(34, 197, 94, 0.5);
		background: rgba(34, 197, 94, 0.1);
		color: #22c55e;
	}

	.soul-actions .sync-btn:hover {
		background: rgba(34, 197, 94, 0.2);
	}

	/* LLM 模式提示信息 */
	.llm-prompt-info {
		font-size: 12px;
		color: #94a3b8;
		padding: 8px 12px;
		background: rgba(255, 255, 255, 0.05);
		border-radius: 8px;
	}

	.soul-editor {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.soul-toolbar {
		display: flex;
		gap: 8px;
	}

	.soul-toolbar button {
		padding: 6px 12px;
		border: none;
		border-radius: 6px;
		background: rgba(255, 255, 255, 0.1);
		color: #e2e8f0;
		cursor: pointer;
		font-size: 12px;
		transition: background 0.2s;
	}

	.soul-toolbar button:hover {
		background: rgba(255, 255, 255, 0.2);
	}

	.soul-toolbar button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.soul-toolbar button.primary {
		background: linear-gradient(135deg, #22d3ee, #3b82f6);
		color: white;
	}

	.soul-toolbar button.sync-btn {
		border-color: rgba(34, 197, 94, 0.5);
		background: rgba(34, 197, 94, 0.1);
		color: #22c55e;
	}

	.soul-toolbar button.sync-btn:hover {
		background: rgba(34, 197, 94, 0.2);
	}

	.soul-textarea {
		width: 100%;
		min-height: 200px;
		padding: 12px;
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 8px;
		background: rgba(0, 0, 0, 0.3);
		color: #e2e8f0;
		font-size: 12px;
		font-family: "Consolas", "Monaco", monospace;
		line-height: 1.5;
		resize: vertical;
	}

	.soul-textarea:focus {
		outline: none;
		border-color: rgba(56, 189, 248, 0.5);
	}
</style>
