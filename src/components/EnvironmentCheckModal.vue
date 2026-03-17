<script setup lang="ts">
	import { ref, reactive, computed, onMounted } from "vue"
	import { invoke } from "@tauri-apps/api/core"

	interface NodeStatus {
		installed: boolean
		version: string
		version_valid: boolean
	}

	interface OpenClawStatus {
		installed: boolean
		version: string
		initialized: boolean
	}

	interface EnvStatus {
		node: NodeStatus
		openclaw: OpenClawStatus
		skipped: boolean
	}

	const props = defineProps<{
		visible: boolean
	}>()

	const emit = defineEmits<{
		close: []
		done: []
	}>()

	const loading = ref(true)
	const status = reactive<EnvStatus>({
		node: { installed: false, version: "", version_valid: false },
		openclaw: { installed: false, version: "", initialized: false },
		skipped: false,
	})

	const installing = ref<string | null>(null)
	const error = ref<string | null>(null)
	const currentStep = ref<"checking" | "node" | "openclaw" | "done">("checking")

	const allPassed = computed(() => {
		return status.node.installed &&
			status.node.version_valid &&
			status.openclaw.installed &&
			status.openclaw.initialized
	})

	const needsNodeInstall = computed(() => {
		return !status.node.installed || !status.node.version_valid
	})

	const needsOpenClawInstall = computed(() => {
		return !status.openclaw.installed
	})

	const needsOpenClawInit = computed(() => {
		return status.openclaw.installed && !status.openclaw.initialized
	})

	async function checkEnv() {
		loading.value = true
		error.value = null
		try {
			const result = await invoke<EnvStatus>("get_env_status")
			status.node = result.node
			status.openclaw = result.openclaw
			status.skipped = result.skipped
		} catch (e) {
			error.value = `检测失败: ${e}`
		} finally {
			loading.value = false
		}
	}

	async function installNode() {
		installing.value = "node"
		error.value = null
		currentStep.value = "node"
		try {
			await invoke("install_node")
			await checkEnv()
		} catch (e) {
			error.value = `安装失败: ${e}`
		} finally {
			installing.value = null
		}
	}

	async function installOpenClaw() {
		installing.value = "openclaw"
		error.value = null
		currentStep.value = "openclaw"
		try {
			await invoke("install_openclaw")
			await checkEnv()
		} catch (e) {
			error.value = `安装失败: ${e}`
		} finally {
			installing.value = null
		}
	}

	async function runOnboard() {
		try {
			await invoke("run_openclaw_onboard")
			await checkEnv()
		} catch (e) {
			error.value = `启动 onboard 失败: ${e}`
		}
	}

	async function skipCheck() {
		try {
			await invoke("skip_env_check")
			emit("close")
		} catch (e) {
			error.value = `跳过失败: ${e}`
		}
	}

	async function openManualInstall() {
		try {
			await invoke("open_manual_install_node")
		} catch (e) {
			error.value = `打开网页失败: ${e}`
		}
	}

	async function handleRetry() {
		if (currentStep.value === "node") {
			await installNode()
		} else if (currentStep.value === "openclaw") {
			await installOpenClaw()
		}
	}

	async function handleContinue() {
		emit("done")
	}

	onMounted(() => {
		checkEnv()
	})
</script>

<template>
	<div v-if="visible" class="modal-overlay" @click.self="skipCheck">
		<div class="modal-content">
			<div class="modal-header">
				<h2>环境检测</h2>
				<button class="close-btn" @click="skipCheck">×</button>
			</div>

			<div class="modal-body">
				<div v-if="loading" class="loading">
					<div class="spinner"></div>
					<p>正在检测环境...</p>
				</div>

				<div v-else-if="error && !allPassed" class="error-section">
					<div class="error-message">{{ error }}</div>
				</div>

				<div v-else class="status-list">
					<div class="status-item" :class="{ success: status.node.installed && status.node.version_valid, error: needsNodeInstall }">
						<div class="status-icon">
							<span v-if="status.node.installed && status.node.version_valid">✓</span>
							<span v-else-if="installing === 'node'">⟳</span>
							<span v-else>✗</span>
						</div>
						<div class="status-info">
							<div class="status-title">Node.js 环境</div>
							<div class="status-desc">
								<template v-if="status.node.installed">
									已安装 v{{ status.node.version }}
									<span v-if="!status.node.version_valid" class="version-warning">(需要 v22+)</span>
								</template>
								<template v-else>
									未安装 (需要 v22+)
								</template>
							</div>
						</div>
						<button
							v-if="needsNodeInstall && installing !== 'node'"
							class="action-btn"
							@click="installNode"
						>
							自动安装
						</button>
					</div>

					<div class="status-item" :class="{ success: status.openclaw.installed, error: needsOpenClawInstall }">
						<div class="status-icon">
							<span v-if="status.openclaw.installed">✓</span>
							<span v-else-if="installing === 'openclaw'">⟳</span>
							<span v-else>✗</span>
						</div>
						<div class="status-info">
							<div class="status-title">OpenClaw</div>
							<div class="status-desc">
								<template v-if="status.openclaw.installed">
									已安装 v{{ status.openclaw.version }}
								</template>
								<template v-else>
									未安装
								</template>
							</div>
						</div>
						<button
							v-if="needsOpenClawInstall && installing !== 'openclaw' && status.node.version_valid"
							class="action-btn"
							@click="installOpenClaw"
						>
							自动安装
						</button>
					</div>

					<div v-if="needsOpenClawInit" class="init-section">
						<p class="init-message">OpenClaw 需要初始化配置</p>
						<button class="action-btn primary" @click="runOnboard">
							运行初始化向导
						</button>
					</div>
				</div>
			</div>

			<div class="modal-footer">
				<div v-if="error" class="footer-error">
					<button class="footer-btn" @click="handleRetry">重试</button>
					<button class="footer-btn" @click="openManualInstall">手动安装</button>
					<button class="footer-btn" @click="skipCheck">跳过</button>
				</div>
				<div v-else-if="allPassed" class="footer-success">
					<button class="footer-btn primary" @click="handleContinue">开始使用</button>
				</div>
				<div v-else class="footer-skip">
					<button class="footer-btn" @click="skipCheck">跳过</button>
				</div>
			</div>
		</div>
	</div>
</template>

<style scoped>
	.modal-overlay {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background: rgba(0, 0, 0, 0.6);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 9999;
	}

	.modal-content {
		background: #1a1a2e;
		border-radius: 12px;
		width: 420px;
		max-height: 80vh;
		display: flex;
		flex-direction: column;
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
		border: 1px solid #2d2d44;
	}

	.modal-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 16px 20px;
		border-bottom: 1px solid #2d2d44;
	}

	.modal-header h2 {
		margin: 0;
		color: #fff;
		font-size: 18px;
		font-weight: 600;
	}

	.close-btn {
		background: none;
		border: none;
		color: #888;
		font-size: 24px;
		cursor: pointer;
		padding: 0;
		line-height: 1;
	}

	.close-btn:hover {
		color: #fff;
	}

	.modal-body {
		padding: 20px;
		flex: 1;
		overflow-y: auto;
	}

	.loading {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 40px 0;
		color: #888;
	}

	.spinner {
		width: 40px;
		height: 40px;
		border: 3px solid #2d2d44;
		border-top-color: #6366f1;
		border-radius: 50%;
		animation: spin 1s linear infinite;
		margin-bottom: 16px;
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}

	.error-section {
		padding: 16px;
		background: rgba(239, 68, 68, 0.1);
		border-radius: 8px;
		border: 1px solid rgba(239, 68, 68, 0.3);
	}

	.error-message {
		color: #ef4444;
		font-size: 14px;
	}

	.status-list {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.status-item {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 12px;
		background: #16162a;
		border-radius: 8px;
		border: 1px solid #2d2d44;
	}

	.status-item.success {
		border-color: rgba(34, 197, 94, 0.3);
	}

	.status-item.error {
		border-color: rgba(239, 68, 68, 0.3);
	}

	.status-icon {
		width: 32px;
		height: 32px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 16px;
		flex-shrink: 0;
	}

	.status-item.success .status-icon {
		background: rgba(34, 197, 94, 0.2);
		color: #22c55e;
	}

	.status-item.error .status-icon {
		background: rgba(239, 68, 68, 0.2);
		color: #ef4444;
	}

	.status-info {
		flex: 1;
		min-width: 0;
	}

	.status-title {
		color: #fff;
		font-size: 14px;
		font-weight: 500;
	}

	.status-desc {
		color: #888;
		font-size: 12px;
		margin-top: 2px;
	}

	.version-warning {
		color: #f59e0b;
	}

	.action-btn {
		padding: 6px 12px;
		background: #6366f1;
		color: #fff;
		border: none;
		border-radius: 6px;
		font-size: 12px;
		cursor: pointer;
		transition: background 0.2s;
	}

	.action-btn:hover {
		background: #4f46e5;
	}

	.action-btn.primary {
		background: #22c55e;
	}

	.action-btn.primary:hover {
		background: #16a34a;
	}

	.init-section {
		margin-top: 16px;
		padding: 16px;
		background: rgba(99, 102, 241, 0.1);
		border-radius: 8px;
		border: 1px solid rgba(99, 102, 241, 0.3);
		text-align: center;
	}

	.init-message {
		color: #a5b4fc;
		font-size: 14px;
		margin: 0 0 12px 0;
	}

	.modal-footer {
		padding: 16px 20px;
		border-top: 1px solid #2d2d44;
		display: flex;
		justify-content: center;
	}

	.footer-btn {
		padding: 8px 20px;
		background: #2d2d44;
		color: #fff;
		border: none;
		border-radius: 6px;
		font-size: 14px;
		cursor: pointer;
		transition: background 0.2s;
	}

	.footer-btn:hover {
		background: #3d3d54;
	}

	.footer-btn.primary {
		background: #6366f1;
	}

	.footer-btn.primary:hover {
		background: #4f46e5;
	}

	.footer-error, .footer-skip {
		display: flex;
		gap: 12px;
	}
</style>
