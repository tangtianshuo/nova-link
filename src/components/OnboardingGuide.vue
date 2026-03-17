<script setup lang="ts">
import { ref, computed } from "vue"

const props = defineProps<{
	visible: boolean
}>()

const emit = defineEmits<{
	close: []
	complete: []
}>()

// 当前步骤索引
const currentStep = ref(0)

// 引导步骤数据
const steps = [
	{
		title: "点击底部区域",
		description: "点击窗口底部的区域可以打开聊天面板，和我聊天~",
	},
	{
		title: "右键菜单",
		description: "点击鼠标右键可以打开菜单，设置我的参数~",
	},
	{
		title: "设置入口",
		description: "在菜单中可以找到设置选项，定制我的外观和行为~",
	},
]

// 总步骤数
const totalSteps = computed(() => steps.length)

// 当前步骤信息
const currentStepInfo = computed(() => steps[currentStep.value])

// 是否是最后一步
const isLastStep = computed(() => currentStep.value === steps.length - 1)

// 下一步
function handleNext() {
	if (isLastStep.value) {
		handleComplete()
	} else {
		currentStep.value++
	}
}

// 跳过
function handleSkip() {
	emit("close")
}

// 完成
function handleComplete() {
	emit("complete")
}

// 遮罩点击不关闭（防止误触）
function handleOverlayClick(_e: MouseEvent) {
	// 不阻止默认行为，让用户必须点击按钮
}
</script>

<template>
	<Teleport to="body">
		<div
			v-if="visible"
			class="onboarding-overlay"
			@click="handleOverlayClick"
		>
			<div class="onboarding-card" role="dialog" aria-modal="true">
				<!-- 步骤指示器 -->
				<div class="step-indicator">
					<span class="step-text">
						第 {{ currentStep + 1 }} 步，共 {{ totalSteps }} 步
					</span>
					<div class="step-dots">
						<span
							v-for="i in totalSteps"
							:key="i"
							class="dot"
							:class="{ active: i - 1 === currentStep, completed: i - 1 < currentStep }"
						/>
					</div>
				</div>

				<!-- 标题 -->
				<h2 class="onboarding-title">
					{{ currentStepInfo.title }}
				</h2>

				<!-- 描述 -->
				<p class="onboarding-description">
					{{ currentStepInfo.description }}
				</p>

				<!-- 按钮 -->
				<div class="onboarding-buttons">
					<button class="btn btn-skip" @click="handleSkip">
						跳过
					</button>
					<button class="btn btn-next" @click="handleNext">
						{{ isLastStep ? "完成" : "下一步" }}
					</button>
				</div>
			</div>
		</div>
	</Teleport>
</template>

<style scoped>
.onboarding-overlay {
	position: fixed;
	inset: 0;
	background: rgba(0, 0, 0, 0.6);
	display: flex;
	align-items: center;
	justify-content: center;
	z-index: 3000;
	backdrop-filter: blur(4px);
	padding: 20px;
	animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
	from {
		opacity: 0;
	}
	to {
		opacity: 1;
	}
}

.onboarding-card {
	background: linear-gradient(
		145deg,
		rgba(30, 41, 59, 0.98),
		rgba(15, 23, 42, 0.99)
	);
	border-radius: 16px;
	padding: 28px;
	width: 100%;
	max-width: 380px;
	box-shadow:
		0 25px 50px -12px rgba(0, 0, 0, 0.5),
		0 0 0 1px rgba(255, 255, 255, 0.1);
	text-align: center;
	animation: scaleIn 0.2s ease;
}

@keyframes scaleIn {
	from {
		transform: scale(0.95);
		opacity: 0;
	}
	to {
		transform: scale(1);
		opacity: 1;
	}
}

/* 步骤指示器 */
.step-indicator {
	margin-bottom: 20px;
}

.step-text {
	font-size: 13px;
	color: #94a3b8;
	display: block;
	margin-bottom: 10px;
}

.step-dots {
	display: flex;
	justify-content: center;
	gap: 8px;
}

.dot {
	width: 8px;
	height: 8px;
	border-radius: 50%;
	background: rgba(255, 255, 255, 0.2);
	transition: all 0.3s ease;
}

.dot.active {
	background: #22d3ee;
	transform: scale(1.2);
}

.dot.completed {
	background: #22c55e;
}

/* 标题 */
.onboarding-title {
	margin: 0 0 16px;
	font-size: 22px;
	font-weight: 600;
	color: #f1f5f9;
}

/* 描述 */
.onboarding-description {
	margin: 0 0 28px;
	font-size: 15px;
	color: #94a3b8;
	line-height: 1.6;
}

/* 按钮 */
.onboarding-buttons {
	display: flex;
	gap: 12px;
	justify-content: center;
}

.btn {
	padding: 12px 28px;
	border-radius: 12px;
	font-size: 14px;
	font-weight: 500;
	cursor: pointer;
	transition: all 0.2s;
	border: none;
}

.btn-skip {
	background: rgba(255, 255, 255, 0.1);
	color: #94a3b8;
}

.btn-skip:hover {
	background: rgba(255, 255, 255, 0.15);
	color: #e2e8f0;
}

.btn-next {
	background: linear-gradient(135deg, #22d3ee, #3b82f6);
	color: white;
}

.btn-next:hover {
	background: linear-gradient(135deg, #67e8f9, #60a5fa);
	transform: translateY(-1px);
}
</style>
