import { ref } from "vue"
import { invoke } from "@tauri-apps/api/core"

const hasSeenOnboarding = ref(false)
const isFirstLaunch = ref(true)

// Storage key
const ONBOARDING_KEY = "has_seen_onboarding"

export function useOnboarding() {
	/**
	 * 检查是否需要显示引导
	 */
	async function checkOnboardingStatus(): Promise<boolean> {
		try {
			// 尝试从 Tauri 设置获取
			const saved = await invoke<string | null>("get_setting", {
				key: ONBOARDING_KEY,
			})
			if (saved) {
				hasSeenOnboarding.value = saved === "true"
			}
		} catch (e) {
			// 回退到 localStorage
			const saved = localStorage.getItem(ONBOARDING_KEY)
			if (saved) {
				hasSeenOnboarding.value = saved === "true"
			}
		}

		// 如果没有看过引导，则显示
		return !hasSeenOnboarding.value
	}

	/**
	 * 标记引导已看过
	 */
	async function markOnboardingSeen(): Promise<void> {
		hasSeenOnboarding.value = true
		try {
			await invoke("save_setting", {
				key: ONBOARDING_KEY,
				value: "true",
			})
		} catch (e) {
			localStorage.setItem(ONBOARDING_KEY, "true")
		}
	}

	/**
	 * 重置引导状态（用于设置中重新显示）
	 */
	async function resetOnboarding(): Promise<void> {
		hasSeenOnboarding.value = false
		try {
			await invoke("save_setting", {
				key: ONBOARDING_KEY,
				value: "false",
			})
		} catch (e) {
			localStorage.setItem(ONBOARDING_KEY, "false")
		}
	}

	return {
		hasSeenOnboarding,
		isFirstLaunch,
		checkOnboardingStatus,
		markOnboardingSeen,
		resetOnboarding,
	}
}
