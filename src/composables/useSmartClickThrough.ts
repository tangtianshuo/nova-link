import { ref } from "vue"
import { getCurrentWindow } from "@tauri-apps/api/window"
import { useSettings } from "./useSettings"

export interface SmartClickThroughOptions {
	topDragHeight?: number
	bottomAreaRatio?: number
}

export function useSmartClickThrough(options: SmartClickThroughOptions = {}) {
	const { topDragHeight = 32, bottomAreaRatio = 0.7 } = options

	const { settings } = useSettings()
	const isClickThrough = ref(false)

	// Constants for click-through behavior
	const DRAG_REGION_HEIGHT = topDragHeight
	const BOTTOM_AREA_RATIO = bottomAreaRatio

	/**
	 * Set ignore cursor events (click-through mode)
	 */
	async function setIgnoreCursorEvents(ignore: boolean): Promise<void> {
		const win = await getCurrentWindow()
		try {
			await win.setIgnoreCursorEvents(ignore)
			isClickThrough.value = ignore
		} catch (e) {
			console.error("[useSmartClickThrough] setIgnoreCursorEvents error:", e)
		}
	}

	/**
	 * Enable click-through mode
	 */
	async function enableClickThrough(): Promise<void> {
		if (!settings.value.clickThroughEnabled) return
		if (isClickThrough.value) return
		await setIgnoreCursorEvents(true)
	}

	/**
	 * Disable click-through mode
	 */
	async function disableClickThrough(): Promise<void> {
		if (!isClickThrough.value) return
		await setIgnoreCursorEvents(false)
	}

	/**
	 * Check if click is in the top drag region
	 * This region is reserved for window dragging via Tauri
	 */
	function isInDragRegion(y: number): boolean {
		return y <= DRAG_REGION_HEIGHT
	}

	/**
	 * Check if click is in the bottom chat area
	 */
	function isInBottomArea(y: number): boolean {
		const container = document.getElementById("live2d-container")
		if (!container) return false

		const rect = container.getBoundingClientRect()
		const clickY = y - rect.top

		return clickY > rect.height * BOTTOM_AREA_RATIO
	}

	/**
	 * Check if the canvas background is transparent
	 * We check the four corners of the canvas
	 */
	async function isCanvasBackgroundTransparent(): Promise<boolean> {
		const canvas = document.getElementById("live2d-canvas") as HTMLCanvasElement
		if (!canvas) return false

		try {
			const ctx = canvas.getContext("2d", { willReadFrequently: true })
			if (!ctx) return false

			const width = canvas.width
			const height = canvas.height
			if (width === 0 || height === 0) return false

			// Check four corners
			const corners = [
				{ x: 0, y: 0 },
				{ x: width - 1, y: 0 },
				{ x: 0, y: height - 1 },
				{ x: width - 1, y: height - 1 },
			]

			for (const corner of corners) {
				const pixel = ctx.getImageData(corner.x, corner.y, 1, 1).data
				// If any corner has non-zero alpha, background is not fully transparent
				if (pixel[3] > 0) {
					return false
				}
			}

			return true
		} catch (e) {
			console.warn("[useSmartClickThrough] Cannot read canvas:", e)
			return false
		}
	}

	/**
	 * Main handler for pointer down events
	 * Determines what action to take based on click location
	 */
	async function handlePointerDown(
		_x: number,
		y: number,
		isModelHit: boolean,
	): Promise<{
		action: "drag" | "chat" | "model" | "through" | "none"
		shouldEnableThrough: boolean
	}> {
		// 1. Check if in drag region (top 32px)
		// Return "drag" to let Tauri handle window dragging
		if (isInDragRegion(y)) {
			return { action: "drag", shouldEnableThrough: false }
		}

		// 2. Check if in bottom chat area
		if (isInBottomArea(y)) {
			return { action: "chat", shouldEnableThrough: false }
		}

		// 3. Check if hitting the Live2D model
		if (isModelHit) {
			return { action: "model", shouldEnableThrough: false }
		}

		// 4. If click-through is enabled and in empty area (not model, not bottom)
		// Check if canvas background is transparent
		if (settings.value.clickThroughEnabled) {
			const isBgTransparent = await isCanvasBackgroundTransparent()

			// If background is transparent, enable click-through
			if (isBgTransparent) {
				return { action: "through", shouldEnableThrough: true }
			}
		}

		// Default: no special action
		return { action: "none", shouldEnableThrough: false }
	}

	/**
	 * Handle pointer up events
	 */
	function handlePointerUp(): void {
		// Disable click-through on pointer up
		disableClickThrough()
	}

	/**
	 * Handle pointer leave events
	 */
	function handlePointerLeave(): void {
		// Disable click-through when leaving the window
		disableClickThrough()
	}

	/**
	 * Initialize the smart click-through handler
	 * This sets up any necessary event listeners
	 */
	function init(): void {
		// Currently no global listeners needed
		// The handler is called from App.vue
	}

	/**
	 * Cleanup
	 */
	function cleanup(): void {
		disableClickThrough()
	}

	return {
		isClickThrough,
		enableClickThrough,
		disableClickThrough,
		isInDragRegion,
		isInBottomArea,
		isCanvasBackgroundTransparent,
		handlePointerDown,
		handlePointerUp,
		handlePointerLeave,
		init,
		cleanup,
	}
}
