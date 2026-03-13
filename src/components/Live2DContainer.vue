<script setup lang="ts">
	import { ref, onMounted, onUnmounted } from "vue"

	defineProps<{
		hasModel: boolean
	}>()

	const emit = defineEmits<{
		click: [e: MouseEvent]
	}>()

	const placeholderRef = ref<HTMLElement | null>(null)

	function handleClick(e: MouseEvent) {
		emit("click", e)
	}

	onMounted(() => {
		placeholderRef.value = document.getElementById("live2d-placeholder")
		placeholderRef.value?.addEventListener("click", handleClick)
	})

	onUnmounted(() => {
		placeholderRef.value?.removeEventListener("click", handleClick)
	})
</script>

<template>
	<div
		id="live2d-container"
		:class="{ 'has-model': hasModel }"
		@click="handleClick"
	>
		<canvas id="live2d-canvas"></canvas>
		<!-- <div id="live2d-placeholder">Click to chat</div> -->
	</div>
</template>

<style scoped>
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
</style>
