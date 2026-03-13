<script setup lang="ts">
	import { getCurrentWindow } from "@tauri-apps/api/window"
	import { onMounted, ref } from "vue"

	const props = defineProps<{
		wsStatus?: string
	}>()

	const emit = defineEmits<{
		close: []
	}>()

	const dragRegion = ref<HTMLElement | null>(null)
	const closeBtn = ref<HTMLElement | null>(null)

	async function handleClose() {
		emit("close")
	}

	async function startDrag() {
		try {
			const win = await getCurrentWindow()
			await win.startDragging()
		} catch (err) {
			console.error("[TitleBar] Drag error:", err)
		}
	}

	function getStatusClass(): string {
		return props.wsStatus || "disconnected"
	}

	onMounted(() => {
		dragRegion.value = document.getElementById("drag-region")
		closeBtn.value = document.getElementById("close-btn")

		closeBtn.value?.addEventListener("click", handleClose)

		if (dragRegion.value) {
			dragRegion.value.addEventListener("mousedown", (e) => {
				if (e.button === 0) {
					startDrag()
				}
			})
		}
	})
</script>

<template>
	<div id="drag-region"></div>
	<div id="status-indicator">
		<span
			id="ws-status"
			class="status unselectable"
			:class="getStatusClass()"
			>●</span
		>
	</div>
	<button
		id="close-btn"
		class="title-bar-btn close-btn unselectable"
		@click="handleClose"
	>
		×
	</button>
</template>

<style scoped>
	.unselectable {
		user-select: none; /* 标准语法 */
		-webkit-user-select: none; /* Safari/Chrome */
		-moz-user-select: none; /* Firefox */
		-ms-user-select: none; /* IE/Edge */
	}
	.title-bar-btn {
		position: absolute;
		top: 8px;
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
		user-select: none;
		-webkit-user-select: none;
		-moz-user-select: none;
		-ms-user-select: none;
	}

	.title-bar-btn:hover {
		background: rgba(255, 255, 255, 0.2);
	}

	.close-btn {
		right: 8px;
	}

	.close-btn:hover {
		background: #ef4444;
	}

	#status-indicator {
		position: absolute;
		top: 12px;
		right: 48px;
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
</style>
