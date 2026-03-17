<script setup lang="ts">
	import { ref, watch } from "vue"

	const props = defineProps<{
		visible: boolean
		content: string
		duration?: number
	}>()

	const emit = defineEmits<{
		hide: []
	}>()

	const localVisible = ref(props.visible)
	const timeoutId = ref<number | null>(null)

	watch(
		() => props.visible,
		(newVal) => {
			localVisible.value = newVal
			if (newVal && props.duration && props.duration > 0) {
				if (timeoutId.value) {
					clearTimeout(timeoutId.value)
				}
				timeoutId.value = window.setTimeout(() => {
					emit("hide")
				}, props.duration)
			}
		},
	)

	function handleClose() {
		if (timeoutId.value) {
			clearTimeout(timeoutId.value)
			timeoutId.value = null
		}
		emit("hide")
	}
</script>

<template>
	<Teleport to="body">
		<div
			v-if="localVisible"
			id="speech-bubble"
			class="speech-bubble"
			@click="handleClose"
		>
			<div class="speech-bubble-content">
				{{ content }}
			</div>
			<div class="speech-bubble-tail"></div>
		</div>
	</Teleport>
</template>

<style scoped>
	.speech-bubble {
		position: absolute;
		top: 20%;
		left: 50%;
		transform: translateX(-50%);
		z-index: 1000;
		animation: bubbleAppear 0.3s ease-out;
		cursor: pointer;
	}

	@keyframes bubbleAppear {
		0% {
			opacity: 0;
			transform: translateX(-50%) scale(0.8);
		}
		50% {
			transform: translateX(-50%) scale(1.05);
		}
		100% {
			opacity: 1;
			transform: translateX(-50%) scale(1);
		}
	}

	.speech-bubble-content {
		background: linear-gradient(135deg, #fff5f5 0%, #ffe4e8 100%);
		border: 3px solid #ff8fa3;
		border-radius: 20px;
		padding: 16px 24px;
		font-size: 16px;
		color: #5a3d4a;
		box-shadow: 0 8px 32px rgba(255, 143, 163, 0.3),
			0 2px 8px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.8);
		max-width: 300px;
		min-width: 120px;
		text-align: center;
		line-height: 1.5;
		position: relative;
	}

	.speech-bubble-content::before {
		content: "";
		position: absolute;
		top: -8px;
		left: 50%;
		transform: translateX(-50%);
		width: 16px;
		height: 16px;
		background: linear-gradient(135deg, #fff5f5 0%, #ffe4e8 100%);
		border: 3px solid #ff8fa3;
		border-radius: 50%;
	}

	.speech-bubble-tail {
		position: absolute;
		bottom: -12px;
		left: 50%;
		transform: translateX(-50%);
		width: 0;
		height: 0;
		border-left: 12px solid transparent;
		border-right: 12px solid transparent;
		border-top: 16px solid #ff8fa3;
	}

	.speech-bubble-tail::after {
		content: "";
		position: absolute;
		top: -14px;
		left: -8px;
		width: 0;
		height: 0;
		border-left: 8px solid transparent;
		border-right: 8px solid transparent;
		border-top: 12px solid #ffe4e8;
	}
</style>
