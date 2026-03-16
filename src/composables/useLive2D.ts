import { ref, nextTick } from "vue"
import * as PIXI from "pixi.js"
import {
	Live2DModel,
	config,
	MotionPreloadStrategy,
	MotionPriority,
} from "pixi-live2d-display/cubism4"
import { AnimationStateMachine, AnimationState } from "../utils/animationState"
import { MouseInteractionHandler } from "../utils/mouseInteraction"
;(window as any).PIXI = PIXI

async function ensureCubismCoreLoaded(): Promise<void> {
	if ((window as any).Live2DCubismCore) {
		return
	}
	await new Promise<void>((resolve, reject) => {
		const script = document.createElement("script")
		script.src = "/live2d/core/live2dCubismCore.min.js"
		script.onload = () => resolve()
		script.onerror = () => reject(new Error("Failed to load Cubism Core"))
		document.head.appendChild(script)
	})
}

ensureCubismCoreLoaded()

export interface Live2DOptions {
	motionPreload?: MotionPreloadStrategy
	idleMotionGroup?: string
	autoInteract?: boolean
}

export function useLive2D() {
	config.logLevel = config.LOG_LEVEL_VERBOSE

	const hasModel = ref(false)
	const isLoading = ref(false)
	const error = ref<string | null>(null)
	const model = ref<any>(null)

	let live2dApp: PIXI.Application | null = null
	let live2dModel: any = null
	let stateMachine: AnimationStateMachine | null = null
	let mouseHandler: MouseInteractionHandler | null = null

	const onModelClickCallbacks: Array<(hitArea: any) => void> = []
	const onModelDoubleClickCallbacks: Array<(hitArea: any) => void> = []
	const onModelHoverCallbacks: Array<(hitArea: any) => void> = []
	const onMotionStartCallbacks: Array<(group: string) => void> = []
	const onMotionEndCallbacks: Array<(group: string) => void> = []
	const onExpressionChangeCallbacks: Array<(expression: string) => void> = []
	const onContainerClickCallbacks: Array<
		(x: number, y: number, isModelHit: boolean) => void
	> = []

	async function initLive2D(
		containerId: string = "live2d-container",
	): Promise<void> {
		if (live2dApp) {
			return
		}

		await nextTick()
		const canvas = document.getElementById("live2d-canvas") as HTMLCanvasElement
		const container = document.getElementById(containerId)

		if (!canvas || !container) {
			console.error("[useLive2D] Canvas or container not found")
			return
		}

		isLoading.value = true
		error.value = null

		try {
			live2dApp = new PIXI.Application({
				view: canvas,
				width: container.clientWidth,
				height: container.clientHeight,
				backgroundAlpha: 0,
				antialias: true,
				resolution: 1,
				autoDensity: true,
			} as any)

			canvas.style.pointerEvents = "none"
			canvas.style.width = "100%"
			canvas.style.height = "100%"

			window.addEventListener("resize", () => {
				resizeLive2D(containerId)
			})
		} catch (e) {
			console.error("Live2D initialization failed:", e)
			error.value = String(e)
		} finally {
			isLoading.value = false
		}
	}

	async function loadLive2DModel(
		modelPath: string,
		containerId: string = "live2d-container",
		options: Live2DOptions = {},
	): Promise<void> {
		await ensureCubismCoreLoaded()

		if (!live2dApp) {
			console.error("[useLive2D] live2dApp is null, cannot load model")
			return
		}

		isLoading.value = true
		error.value = null

		try {
			const modelUrl = new URL(modelPath, window.location.origin).href

			const loadOptions = {
				motionPreload: options.motionPreload ?? MotionPreloadStrategy.ALL,
				idleMotionGroup: options.idleMotionGroup ?? "Idle",
				autoInteract: options.autoInteract ?? true,
			}

			live2dModel = await Live2DModel.from(modelUrl, loadOptions as any)

			if (live2dModel) {
				model.value = live2dModel
				hasModel.value = true

				const container = document.getElementById(containerId)
				if (container) {
					const containerWidth = container.clientWidth
					const containerHeight = container.clientHeight

					const scale = (containerHeight * 0.9) / live2dModel.height

					live2dModel.scale.set(scale)
					live2dModel.anchor.set(0.5, 0.5)
					live2dModel.x = containerWidth / 2
					live2dModel.y = containerHeight / 2
				}

				setupModelEventListeners(live2dModel)

				const stageChildren = live2dApp.stage.children as any[]
				if (stageChildren.includes(live2dModel)) {
					live2dApp.stage.removeChild(live2dModel)
				}
				live2dApp.stage.addChild(live2dModel)

				initInteractionHandlers(containerId)

				logModelInfo()
			} else {
				console.error("[useLiveD] Model is null after loading")
			}
		} catch (e) {
			console.error("[useLive2D] Failed to load model:", e)
			error.value = String(e)
			hasModel.value = false
		} finally {
			isLoading.value = false
		}
	}

	function setupModelEventListeners(model: any): void {
		model.on("hit", (hitAreas: string[]) => {
			console.log("[useLive2D] Hit areas:", hitAreas)

			hitAreas.forEach((area) => {
				try {
					model.motion(area, undefined, MotionPriority.FORCE)
				} catch (e) {
					console.warn(`[useLive2D] No motion for hit area: ${area}`)
				}
			})
		})

		const motionManager = model.internalModel?.motionManager
		if (motionManager) {
			motionManager.on(
				"motionStart",
				(group: string, index: number, _audio: any) => {
					console.log(`[useLive2D] Motion started: ${group}[${index}]`)
					onMotionStartCallbacks.forEach((cb) => cb(group))
				},
			)

			motionManager.on("motionEnd", (group: string) => {
				console.log(`[useLive2D] Motion ended: ${group}`)
				onMotionEndCallbacks.forEach((cb) => cb(group))
			})

			if (motionManager.expressionManager) {
				motionManager.expressionManager.on(
					"expressionChange",
					(expression: string) => {
						console.log(`[useLive2D] Expression changed: ${expression}`)
						onExpressionChangeCallbacks.forEach((cb) => cb(expression))
					},
				)
			}
		}
	}

	function logModelInfo(): void {
		if (!live2dModel?.internalModel?.motionManager) {
			console.warn("[useLive2D] No motionManager found")
			return
		}

		const motionManager = live2dModel.internalModel.motionManager

		console.log("[useLive2D] === Model Info ===")
		console.log(
			"[useLive2D] Available motion groups:",
			Object.keys(motionManager.motionGroups || {}),
		)

		const motionGroupCounts: Record<string, number> = {}
		for (const [group, motions] of Object.entries(
			motionManager.motionGroups || {},
		)) {
			motionGroupCounts[group] = Array.isArray(motions) ? motions.length : 0
		}
		console.log("[useLive2D] Motion counts:", motionGroupCounts)

		if (motionManager.expressionManager?.expressions) {
			console.log(
				"[useLive2D] Available expressions:",
				Object.keys(motionManager.expressionManager.expressions),
			)
		}

		const settings = live2dModel.internalModel?.modelSettings
		if (settings) {
			console.log("[useLive2D] Model settings:", {
				name: settings.model?.name,
				version: settings.model?.version,
				groups: settings.json?.FileReferences?.Groups,
			})
		}
	}

	function initInteractionHandlers(
		containerId: string = "live2d-container",
	): void {
		if (!live2dModel) return

		const container = document.getElementById(containerId)
		if (!container) return

		stateMachine = new AnimationStateMachine(live2dModel)

		mouseHandler = new MouseInteractionHandler(live2dModel, container)

		mouseHandler.onClick((_hitArea) => {
			if (stateMachine) {
				stateMachine.handleUserInteraction()
			}
			onModelClickCallbacks.forEach((cb) => cb(_hitArea))
			onContainerClickCallbacks.forEach((cb) => cb(0, 0, true))
		})

		mouseHandler.onDoubleClick(async (hitArea) => {
			if (stateMachine) {
				await stateMachine.playMotionGroup("TapBody")
			}
			onModelDoubleClickCallbacks.forEach((cb) => cb(hitArea))
		})

		mouseHandler.onHover((hitArea) => {
			onModelHoverCallbacks.forEach((cb) => cb(hitArea))
		})

		container.addEventListener("click", (e: MouseEvent) => {
			const isModelHit = mouseHandler?.getHitArea(e.clientX, e.clientY) !== null
			onContainerClickCallbacks.forEach((cb) =>
				cb(e.clientX, e.clientY, isModelHit),
			)
		})

		mouseHandler.init()
		mouseHandler.enableTracking(true)
	}

	function resizeLive2D(containerId: string = "live2d-container"): void {
		if (!live2dApp || !live2dModel) {
			return
		}

		const container = document.getElementById(containerId)
		const canvas = document.getElementById("live2d-canvas") as HTMLCanvasElement
		if (!container || !canvas) return

		const containerWidth = container.clientWidth
		const containerHeight = container.clientHeight

		canvas.width = containerWidth
		canvas.height = containerHeight

		live2dApp.renderer.resize(containerWidth, containerHeight)

		const scale = (containerHeight * 0.9) / live2dModel.height

		live2dModel.scale.set(scale)
		live2dModel.anchor.set(0.5, 0.5)
		live2dModel.x = containerWidth / 2
		live2dModel.y = containerHeight / 2
	}

	async function reloadModel(
		modelPath: string,
		options?: Live2DOptions,
	): Promise<void> {
		if (mouseHandler) {
			mouseHandler.destroy()
			mouseHandler = null
		}
		if (stateMachine) {
			stateMachine.destroy()
			stateMachine = null
		}

		if (live2dApp && live2dModel) {
			const stageChildren = live2dApp.stage.children as any[]
			if (stageChildren.includes(live2dModel)) {
				live2dApp.stage.removeChild(live2dModel)
			}

			live2dModel.removeAllListeners()

			try {
				live2dModel.destroy({
					children: true,
					texture: true,
					baseTexture: true,
				})
			} catch (e) {
				console.error("[useLive2D] Error destroying model:", e)
			}
			live2dModel = null
			model.value = null

			if (live2dApp.stage) {
				live2dApp.stage.removeAllListeners()
				;(live2dApp.stage as any).eventMode = "none"
			}

			const renderer = live2dApp.renderer as any
			if (renderer?.events) {
				renderer.events.cursorStyles = {}
				renderer.events.trackedPointers = {}
			}
		}

		hasModel.value = false
		await loadLive2DModel(modelPath, undefined, options)
	}

	function handleUserInteraction(): void {
		if (stateMachine) {
			stateMachine.handleUserInteraction()
		}
	}

	function handleUserMessage(): void {
		if (stateMachine) {
			stateMachine.handleUserMessage()
		}
	}

	function handleBotThinking(): void {
		if (stateMachine) {
			stateMachine.handleBotThinking()
		}
	}

	function handleBotMessage(text: string): void {
		if (stateMachine) {
			stateMachine.handleBotMessage(text)
		}
	}

	function handleMessageComplete(): void {
		if (stateMachine) {
			stateMachine.handleMessageComplete()
		}
	}

	function handleEmotion(emotion: { type: string; duration?: number }): void {
		if (!stateMachine) {
			return
		}

		const stateMap: Record<string, AnimationState> = {
			happy: AnimationState.HAPPY,
			sad: AnimationState.SAD,
			surprised: AnimationState.SURPRISED,
			angry: AnimationState.ANGRY,
			idle: AnimationState.IDLE,
		}

		const state = stateMap[emotion.type] || AnimationState.IDLE

		if (emotion.duration && state !== AnimationState.IDLE) {
			stateMachine.transition(state, { duration: emotion.duration })
		} else {
			stateMachine.transition(state)
		}
	}

	async function playMotion(
		motionGroup: string,
		priority: number = MotionPriority.FORCE,
	): Promise<boolean> {
		if (!live2dModel) return false

		try {
			const result = await live2dModel.motion(motionGroup, undefined, priority)
			if (!result) {
				console.warn(
					`[useLive2D] Motion "${motionGroup}" was rejected (already playing), trying to force stop`,
				)
				live2dModel.internalModel?.motionManager?.stop()
				await new Promise((resolve) => setTimeout(resolve, 50))
				return await live2dModel.motion(
					motionGroup,
					undefined,
					MotionPriority.FORCE,
				)
			}
			return result
		} catch (e) {
			console.error(`[useLive2D] Failed to play motion: ${motionGroup}`, e)
			return false
		}
	}

	async function playExpression(expressionName: string): Promise<boolean> {
		if (!stateMachine) return false

		try {
			return await stateMachine.playExpression(expressionName)
		} catch (e) {
			console.error(
				`[useLive2D] Failed to play expression: ${expressionName}`,
				e,
			)
			return false
		}
	}

	async function playRandomExpression(): Promise<void> {
		if (stateMachine) {
			await stateMachine.playRandomExpression()
		}
	}

	function onModelClick(callback: () => void): void {
		onModelClickCallbacks.push(callback)
	}

	function onContainerClick(
		callback: (x: number, y: number, isModelHit: boolean) => void,
	): void {
		onContainerClickCallbacks.push(callback)
	}

	function onModelDoubleClick(callback: (hitArea: any) => void): void {
		onModelDoubleClickCallbacks.push(callback)
	}

	function onModelHover(callback: (hitArea: any) => void): void {
		onModelHoverCallbacks.push(callback)
	}

	function onMotionStart(callback: (group: string) => void): void {
		onMotionStartCallbacks.push(callback)
	}

	function onMotionEnd(callback: (group: string) => void): void {
		onMotionEndCallbacks.push(callback)
	}

	function onExpressionChange(callback: (expression: string) => void): void {
		onExpressionChangeCallbacks.push(callback)
	}

	function getCurrentState(): string {
		return stateMachine?.getState() || "unknown"
	}

	function getAvailableMotions(): string[] {
		return stateMachine?.getAvailableMotions() || []
	}

	function getAvailableExpressions(): string[] {
		return stateMachine?.getAvailableExpressions() || []
	}

	function isMotionPlaying(): boolean {
		return stateMachine?.isCurrentlyPlaying() || false
	}

	function getCurrentMotionGroup(): string {
		return stateMachine?.getCurrentMotionGroup() || ""
	}

	function setMotionVolume(volume: number): void {
		if (stateMachine) {
			stateMachine.setVolume(volume)
		}
	}

	function previewState(stateName: string): void {
		if (!stateMachine) return
		const state = stateName as AnimationState
		if (Object.values(AnimationState).includes(state)) {
			stateMachine.transition(state)
		}
	}

	function previewMotion(motionName: string): void {
		if (stateMachine) {
			stateMachine.playMotionGroup(motionName)
		}
	}

	function checkHitArea(x: number, y: number): boolean {
		if (!mouseHandler) return false
		const hitArea = mouseHandler.getHitArea(x, y)
		return hitArea !== null
	}

	function resetToIdle(): void {
		if (stateMachine) {
			stateMachine.transition(AnimationState.IDLE)
		}
	}

	async function destroy(): Promise<void> {
		if (mouseHandler) {
			mouseHandler.destroy()
			mouseHandler = null
		}
		if (stateMachine) {
			stateMachine.destroy()
			stateMachine = null
		}

		if (live2dApp && live2dModel) {
			live2dModel.removeAllListeners()
			live2dApp.stage.removeChild(live2dModel)
			live2dModel.destroy({
				children: true,
				texture: true,
				baseTexture: true,
			})
			live2dModel = null
			model.value = null
		}

		if (live2dApp) {
			await live2dApp.destroy(true)
			live2dApp = null
		}

		hasModel.value = false
	}

	if (typeof window !== "undefined") {
		;(window as any).live2dModel = () => live2dModel
		;(window as any).live2dApp = () => live2dApp
		;(window as any).live2dStateMachine = () => stateMachine
		;(window as any).testMotion = async (group: string) => {
			if (live2dModel) {
				return await live2dModel.motion(group, undefined, MotionPriority.FORCE)
			}
			return false
		}
		;(window as any).testExpression = async (name: string) => {
			if (stateMachine) {
				return await stateMachine.playExpression(name)
			}
			return false
		}
		;(window as any).getLive2DInfo = () => {
			if (!live2dModel) return "No model loaded"
			const mm = live2dModel.internalModel?.motionManager
			if (!mm) return "No motionManager"

			return {
				motionGroups: Object.keys(mm.motionGroups || {}),
				motionCounts: Object.entries(mm.motionGroups || {}).map(([k, v]) => ({
					group: k,
					count: Array.isArray(v) ? v.length : 0,
				})),
				expressions: mm.expressionManager?.expressions
					? Object.keys(mm.expressionManager.expressions)
					: [],
				currentState: stateMachine?.getState(),
				isPlaying: stateMachine?.isCurrentlyPlaying(),
			}
		}
	}

	return {
		model,
		hasModel,
		isLoading,
		error,
		stateMachine,
		initLive2D,
		loadLive2DModel,
		reloadModel,
		resizeLive2D,
		handleUserInteraction,
		handleUserMessage,
		handleBotThinking,
		handleBotMessage,
		handleEmotion,
		handleMessageComplete,
		playMotion,
		playExpression,
		playRandomExpression,
		onModelClick,
		onContainerClick,
		onModelDoubleClick,
		onModelHover,
		onMotionStart,
		onMotionEnd,
		onExpressionChange,
		getCurrentState,
		getAvailableMotions,
		getAvailableExpressions,
		isMotionPlaying,
		getCurrentMotionGroup,
		setMotionVolume,
		previewState,
		previewMotion,
		checkHitArea,
		resetToIdle,
		destroy,
	}
}
