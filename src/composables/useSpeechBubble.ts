import { ref, computed } from "vue"

export interface SpeechBubbleOptions {
	duration?: number
}

export function useSpeechBubble() {
	const visible = ref(false)
	const content = ref("")
	const duration = ref(0)

	function show(text: string, options: SpeechBubbleOptions = {}) {
		content.value = text
		duration.value = options.duration ?? 0
		visible.value = true
	}

	function hide() {
		visible.value = false
		content.value = ""
	}

	function showWelcome() {
		show("你好呀！我是你的虚拟助手，很高兴认识你！", { duration: 5000 })
	}

	function showGuidance(step: number) {
		const messages: Record<number, string> = {
			1: "欢迎使用 Nova Link！让我来教你如何使用吧~",
			2: "点击左下角的设置按钮，可以配置我的外观和行为哦~",
			3: "你可以通过对话框和我聊天，我会尽力帮助你~",
			4: "右键点击窗口边缘，可以打开更多功能菜单！",
			5: "现在你可以开始探索了，有什么问题随时问我~",
		}
		const message = messages[step] ?? "让我们一起探索吧！"
		show(message, { duration: 6000 })
	}

	return {
		visible: computed(() => visible.value),
		content: computed(() => content.value),
		duration: computed(() => duration.value),
		show,
		hide,
		showWelcome,
		showGuidance,
	}
}
