import { ref } from "vue"
import { invoke } from "@tauri-apps/api/core"

export interface NodeStatus {
	installed: boolean
	version: string
	version_valid: boolean
}

export interface OpenClawStatus {
	installed: boolean
	version: string
	initialized: boolean
}

export interface EnvStatus {
	node: NodeStatus
	openclaw: OpenClawStatus
	skipped: boolean
}

export function useEnvCheck() {
	const showEnvCheckModal = ref(false)
	const envStatus = ref<EnvStatus | null>(null)
	const loading = ref(false)
	const error = ref<string | null>(null)

	async function checkEnvStatus(): Promise<EnvStatus | null> {
		loading.value = true
		error.value = null
		try {
			const status = await invoke<EnvStatus>("get_env_status")
			envStatus.value = status
			return status
		} catch (e) {
			error.value = `检测失败: ${e}`
			return null
		} finally {
			loading.value = false
		}
	}

	async function checkAndShowModal() {
		const status = await checkEnvStatus()
		if (!status) return false

		if (status.skipped) {
			return false
		}

		const needsCheck =
			!status.node.installed ||
			!status.node.version_valid ||
			!status.openclaw.installed ||
			!status.openclaw.initialized

		if (needsCheck) {
			showEnvCheckModal.value = true
			return true
		}

		return false
	}

	function closeModal() {
		showEnvCheckModal.value = false
	}

	function onModalDone() {
		showEnvCheckModal.value = false
	}

	async function silentCheckOpenClaw(): Promise<boolean> {
		try {
			const status = await invoke<OpenClawStatus>("check_openclaw_env")
			return status.installed && status.initialized
		} catch {
			return false
		}
	}

	return {
		showEnvCheckModal,
		envStatus,
		loading,
		error,
		checkEnvStatus,
		checkAndShowModal,
		closeModal,
		onModalDone,
		silentCheckOpenClaw,
	}
}
