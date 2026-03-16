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
		console.log("[Debug useClickThrough] setIgnoreCursorEvents:", ignore)
		const win = await getCurrentWindow()
		try {
			await win.setIgnoreCursorEvents(ignore)
			console.log("[Debug useClickThrough] setIgnoreCursorEvents success")
		} catch (e) {
			console.error("[Debug useClickThrough] setIgnoreCursorEvents error:", e)
		}
	}

	async function enableClickThrough(): Promise<void> {
		console.log(
			"[Debug useClickThrough] enableClickThrough, current:",
			isClickThrough.value,
		)
		if (isClickThrough.value) return

		isClickThrough.value = true
		await setIgnoreCursorEvents(true)

		if (clickThroughTimeout) {
			clearTimeout(clickThroughTimeout)
		}
		clickThroughTimeout = setTimeout(() => {
			if (isClickThrough.value) {
				console.log("[Debug useClickThrough] timeout auto-disable")
				disableClickThrough()
			}
		}, timeout)
	}

	async function disableClickThrough(): Promise<void> {
		console.log(
			"[Debug useClickThrough] disableClickThrough, current:",
			isClickThrough.value,
		)
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
		console.log("[Debug useClickThrough] handlePointerDown:", {
			x,
			y,
			isModelHit,
		})

		if (isBottomArea(x, y)) {
			console.log("[Debug useClickThrough] Click in bottom area, not穿透")
			onBottomAreaClick?.()
			return
		}

		if (!isModelHit) {
			console.log("[Debug useClickThrough] Not model hit, start long press timer")
			longPressTimer = setTimeout(() => {
				console.log("[Debug useClickThrough] Long press triggered")
				enableClickThrough()
			}, longPressThreshold)
		}
	}

	function handlePointerUp(): void {
		console.log("[Debug useClickThrough] handlePointerUp")
		if (longPressTimer) {
			clearTimeout(longPressTimer)
			longPressTimer = null
		}
		disableClickThrough()
	}

	function handlePointerLeave(): void {
		console.log("[Debug useClickThrough] handlePointerLeave")
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
