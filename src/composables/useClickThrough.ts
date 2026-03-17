import { ref } from "vue"
import { getCurrentWindow } from "@tauri-apps/api/window"

export interface ClickThroughOptions {
	longPressThreshold?: number
	timeout?: number
	bottomAreaRatio?: number
}

export function useClickThrough(options: ClickThroughOptions = {}) {
	const {
		longPressThreshold = 1000,
		timeout = 3000,
		bottomAreaRatio = 0.7,
	} = options

	const isClickThrough = ref(false)
	let longPressTimer: ReturnType<typeof setTimeout> | null = null
	let clickThroughTimeout: ReturnType<typeof setTimeout> | null = null

	async function setIgnoreCursorEvents(ignore: boolean): Promise<void> {
		const win = await getCurrentWindow()
		try {
			await win.setIgnoreCursorEvents(ignore)
		} catch (e) {
			console.error("[useClickThrough] setIgnoreCursorEvents error:", e)
		}
	}

	async function enableClickThrough(): Promise<void> {
		if (isClickThrough.value) return

		isClickThrough.value = true
		await setIgnoreCursorEvents(true)

		if (clickThroughTimeout) {
			clearTimeout(clickThroughTimeout)
		}
		clickThroughTimeout = setTimeout(() => {
			if (isClickThrough.value) {
				disableClickThrough()
			}
		}, timeout)
	}

	async function disableClickThrough(): Promise<void> {
		if (!isClickThrough.value) return

		isClickThrough.value = false
		await setIgnoreCursorEvents(false)

		if (clickThroughTimeout) {
			clearTimeout(clickThroughTimeout)
			clickThroughTimeout = null
		}
	}

	function isBottomArea(_x: number, y: number): boolean {
		const container = document.getElementById("live2d-container")
		if (!container) return false

		const rect = container.getBoundingClientRect()
		const clickY = y - rect.top

		return clickY > rect.height * bottomAreaRatio
	}

	function handlePointerDown(
		x: number,
		y: number,
		isModelHit: boolean,
		onBottomAreaClick?: () => void,
	): void {
		if (isBottomArea(x, y)) {
			onBottomAreaClick?.()
			return
		}

		if (!isModelHit) {
			longPressTimer = setTimeout(() => {
				enableClickThrough()
			}, longPressThreshold)
		}
	}

	function handlePointerUp(): void {
		if (longPressTimer) {
			clearTimeout(longPressTimer)
			longPressTimer = null
		}
		disableClickThrough()
	}

	function handlePointerLeave(): void {
		if (longPressTimer) {
			clearTimeout(longPressTimer)
			longPressTimer = null
		}
		disableClickThrough()
	}

	function cleanup(): void {
		if (longPressTimer) {
			clearTimeout(longPressTimer)
			longPressTimer = null
		}
		if (clickThroughTimeout) {
			clearTimeout(clickThroughTimeout)
			clickThroughTimeout = null
		}
	}

	return {
		isClickThrough,
		enableClickThrough,
		disableClickThrough,
		isBottomArea,
		handlePointerDown,
		handlePointerUp,
		handlePointerLeave,
		cleanup,
	}
}
