<script setup lang="ts">
	import { ref, nextTick, watch } from "vue"
	import { marked } from "marked"
	import type { ChatMessage, WsStatus } from "../composables"

	// 配置 marked
	marked.setOptions({
		breaks: true,
		gfm: true
	})

	const props = defineProps<{
		visible: boolean
		messages: ChatMessage[]
		wsStatus: WsStatus
	}>()

	const emit = defineEmits<{
		send: [content: string]
		toggle: [show: boolean]
	}>()

	const messagesContainer = ref<HTMLElement | null>(null)
	const localInput = ref("")

	// 解析 Markdown
	function parseMarkdown(content: string): string {
		if (!content) return ''
		try {
			return marked(content) as string
		} catch {
			return content
		}
	}

	watch(
		() => props.messages.length,
		() => {
			nextTick(() => {
				if (messagesContainer.value) {
					messagesContainer.value.scrollTop =
						messagesContainer.value.scrollHeight
				}
			})
		},
	)

	function send() {
		const content = localInput.value.trim()
		if (!content) return
		emit("send", content)
		localInput.value = ""
	}

	function handleKeyPress(e: KeyboardEvent) {
		if (e.key === "Enter") {
			send()
		}
	}
</script>

<template>
	<div
		id="chat-panel"
		:class="{ hidden: !visible }"
	>
		<div
			id="messages"
			ref="messagesContainer"
		>
			<div
				v-for="(msg, index) in messages"
				:key="index"
				class="message"
				:class="msg.type !== 'user' ? 'bot' : 'user'"
			>
				<span v-html="parseMarkdown(msg.content)"></span>
			</div>
		</div>

		<div id="input-area">
			<input
				id="message-input"
				v-model="localInput"
				type="text"
				placeholder="Type a message..."
				autocomplete="off"
				@keypress="handleKeyPress"
			/>
			<button
				id="send-btn"
				@click="send"
			>
				Send
			</button>
		</div>
	</div>
</template>

<style scoped>
	.unselectable {
		user-select: none; /* 标准语法 */
		-webkit-user-select: none; /* Safari/Chrome */
		-moz-user-select: none; /* Firefox */
		-ms-user-select: none; /* IE/Edge */
	}
	#chat-panel {
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
		background: rgba(15, 23, 42, 0.85);
		border-top: 1px solid rgba(255, 255, 255, 0.1);
		display: flex;
		flex-direction: column;
		max-height: 50%;
		transition:
			transform 0.3s ease,
			opacity 0.3s ease;
	}

	#chat-panel.hidden {
		transform: translateY(100%);
		opacity: 0;
		pointer-events: none;
	}

	#messages {
		flex: 1;
		overflow-y: auto;
		overflow-x: hidden;
		padding: 12px;
		display: flex;
		flex-direction: column;
		gap: 8px;
		min-height: 100px;
		max-height: 200px;
	}

	.message {
		padding: 8px 12px;
		border-radius: 12px;
		font-size: 13px;
		line-height: 1.4;
		word-break: break-word;
		overflow-wrap: break-word;
		white-space: pre-wrap;
		max-width: 85%;
	}

	.message span {
		display: block;
		word-break: break-word;
		overflow-wrap: break-word;
	}

	/* 代码块样式 */
	.message pre {
		background: rgba(0, 0, 0, 0.3);
		border-radius: 8px;
		padding: 12px;
		margin: 8px 0;
		overflow-x: auto;
		word-break: break-all;
	}

	.message code {
		background: rgba(0, 0, 0, 0.2);
		padding: 2px 6px;
		border-radius: 4px;
		font-family: "Consolas", "Monaco", monospace;
		font-size: 12px;
	}

	.message pre code {
		background: none;
		padding: 0;
	}

	.message.user {
		align-self: flex-end;
		background: linear-gradient(135deg, #22d3ee, #3b82f6);
		color: white;
		border-radius: 16px;
		padding: 14px 18px;
		box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
	}

	.message.bot,
	div[class*="bot"] {
		align-self: flex-start;
		background: rgba(26, 39, 70, 0.65) !important;
		backdrop-filter: blur(16px) !important;
		-webkit-backdrop-filter: blur(16px) !important;
		border: 1px solid rgba(255, 255, 255, 0.15);
		border-radius: 16px;
		padding: 14px 18px;
		color: #e2e8f0;
		box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
	}

	#input-area {
		display: flex;
		gap: 8px;
		padding: 12px;
		border-top: 1px solid rgba(255, 255, 255, 0.1);
	}

	#input-area input {
		flex: 1;
		padding: 10px 14px;
		border: none;
		border-radius: 20px;
		background: rgba(255, 255, 255, 0.1);
		color: #e2e8f0;
		font-size: 13px;
		outline: none;
	}

	#input-area input::placeholder {
		color: rgba(255, 255, 255, 0.5);
	}

	#input-area button {
		padding: 10px 20px;
		border: none;
		border-radius: 20px;
		background: linear-gradient(135deg, #22d3ee, #3b82f6);
		color: white;
		font-size: 13px;
		cursor: pointer;
		transition: opacity 0.2s;
	}

	#input-area button:hover {
		opacity: 0.9;
	}
</style>
