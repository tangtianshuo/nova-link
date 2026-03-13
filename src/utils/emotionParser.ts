// 情绪解析工具模块
// 用于从大模型回复中提取情绪标签

import type { EmotionData } from "../sdk/types"

// 情绪标签正则表达式
const EMOTION_REGEX = /\[:emotion:(\w+):(\d+):\]/g

// 支持的情绪类型
export type EmotionType = "happy" | "sad" | "surprised" | "angry" | "idle"

// 默认持续时间（毫秒）
const DEFAULT_DURATIONS: Record<EmotionType, number> = {
	happy: 2000,
	sad: 3000,
	surprised: 1500,
	angry: 3000,
	idle: 0,
}

/**
 * 验证情绪类型是否有效
 */
function isValidEmotionType(type: string): type is EmotionType {
	return ["happy", "sad", "surprised", "angry", "idle"].includes(type)
}

/**
 * 清理大模型返回的特殊标签
 */
function cleanContent(text: string): string {
	let cleaned = text
	// 移除多余的空白
	cleaned = cleaned.replace(/\n{3,}/g, "\n\n")
	cleaned = cleaned.trim()
	return cleaned
}

/**
 * 从文本中提取情绪标签
 */
export function extractEmotion(text: string): {
	content: string
	emotion?: EmotionData
} {
	EMOTION_REGEX.lastIndex = 0
	const match = EMOTION_REGEX.exec(text)

	if (match) {
		const emotionType = match[1] as EmotionType
		const duration = parseInt(match[2], 10)

		if (isValidEmotionType(emotionType)) {
			return {
				content: cleanContent(text.replace(EMOTION_REGEX, "")),
				emotion: {
					type: emotionType,
					duration: duration || DEFAULT_DURATIONS[emotionType],
				},
			}
		}
	}

	return { content: cleanContent(text) }
}

/**
 * 解析流式更新中的情绪标签
 */
export function parseStreamEmotion(chunk: string): {
	text: string
	emotion?: EmotionData
} | null {
	EMOTION_REGEX.lastIndex = 0
	const match = EMOTION_REGEX.exec(chunk)

	if (match) {
		const emotionType = match[1] as EmotionType
		const duration = parseInt(match[2], 10)

		if (isValidEmotionType(emotionType)) {
			return {
				text: cleanContent(chunk.replace(EMOTION_REGEX, "")),
				emotion: {
					type: emotionType,
					duration: duration || DEFAULT_DURATIONS[emotionType],
				},
			}
		}
	}

	return null
}

/**
 * 获取默认情绪持续时间
 */
export function getDefaultDuration(type: EmotionType): number {
	return DEFAULT_DURATIONS[type] || 2000
}
