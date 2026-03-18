import { ref } from "vue"
import { invoke } from "@tauri-apps/api/core"
import { useGlobalDialog } from "./useGlobalDialog"

export interface HotkeySetting {
	shortcut: string
	action: "toggle_chat" | "toggle_window" | "switch_model"
	enabled: boolean
}

export interface AppSettings {
	modelPath: string
	wsUrl: string
	wsToken: string
	chatProvider: "llm" | "openclaw"
	alwaysOnTop: boolean
	llmProvider: "minimax" | "openai" | "none"
	llmApiKey: string
	llmApiUrl: string
	llmModel: string
	bgColor: string
	bgOpacity: number
	bgBlur: boolean
	windowWidth?: number
	windowHeight?: number
	windowX?: number
	windowY?: number
	hotkeys: HotkeySetting[]
}

const DEFAULT_MODEL_PATH =
	"/models/hiyori_pro_zh/runtime/hiyori_pro_t11.model3.json"

const defaultSettings: AppSettings = {
	modelPath: DEFAULT_MODEL_PATH,
	wsUrl: "ws://127.0.0.1:18789/",
	wsToken: "",
	chatProvider: "openclaw",
	alwaysOnTop: true,
	llmProvider: "none",
	llmApiKey: "",
	llmApiUrl: "",
	llmModel: "",
	bgColor: "#1e293b",
	bgOpacity: 0.2,
	bgBlur: true,
	hotkeys: [
		{ shortcut: "Ctrl+Shift+N", action: "toggle_chat", enabled: true },
		{ shortcut: "Ctrl+Shift+H", action: "toggle_window", enabled: true },
	],
}

const settings = ref<AppSettings>({ ...defaultSettings })

export function useSettings() {
	const isLoading = ref(false)

	async function loadSettings(): Promise<void> {
		isLoading.value = true
		try {
			const saved = await invoke<string | null>("get_setting", {
				key: "app-settings",
			})
			if (saved) {
				settings.value = { ...defaultSettings, ...JSON.parse(saved) }
			}
		} catch (e) {
			console.warn("[useSettings] Failed to load from Tauri, trying localStorage:", e)
			const saved = localStorage.getItem("nova-link-settings")
			if (saved) {
				try {
					settings.value = { ...defaultSettings, ...JSON.parse(saved) }
				} catch {
					// Both failed - show warning but use defaults
					const { showDialog } = useGlobalDialog()
					showDialog({
						title: "设置加载警告",
						message: "无法从磁盘加载设置，已使用默认配置。\n\n您的设置更改可能无法保存。",
						type: "warning",
					})
				}
			} else {
				// No saved settings, use defaults - no need to warn
			}
		} finally {
			isLoading.value = false
		}
	}

	async function saveSettings(): Promise<void> {
		try {
			await invoke("save_setting", {
				key: "app-settings",
				value: JSON.stringify(settings.value),
			})
		} catch (e) {
			localStorage.setItem("nova-link-settings", JSON.stringify(settings.value))
		}
	}

	async function updateSetting<K extends keyof AppSettings>(
		key: K,
		value: AppSettings[K],
	): Promise<void> {
		settings.value[key] = value
		await saveSettings()
	}

	async function updateLlmConfig(): Promise<void> {
		await invoke("update_llm_config", {
			provider: settings.value.llmProvider,
			apiKey: settings.value.llmApiKey,
			apiUrl: settings.value.llmApiUrl,
			model: settings.value.llmModel,
		})
	}

	return {
		settings,
		isLoading,
		loadSettings,
		saveSettings,
		updateSetting,
		updateLlmConfig,
	}
}
