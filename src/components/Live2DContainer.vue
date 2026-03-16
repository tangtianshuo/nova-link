<script setup lang="ts">
	import { ref, onMounted, onUnmounted } from "vue"

	defineProps<{
		hasModel: boolean
	}>()

	const placeholderRef = ref<HTMLElement | null>(null)

	onMounted(() => {
		placeholderRef.value = document.getElementById("live2d-placeholder")
	})

	onUnmounted(() => {
		placeholderRef.value = null
	})
</script>

<template>
	<div
		id="live2d-container"
		class="live2d-container"
		:class="{ 'has-model': hasModel }"
	>
		<canvas id="live2d-canvas"></canvas>
	</div>
</template>

<style scoped>
	.live2d-container {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.live2d-container canvas {
		display: block;
	}
</style>
