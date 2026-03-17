import { MotionPriority, SoundManager } from "pixi-live2d-display/cubism4"

export enum AnimationState {
	IDLE = "IDLE",
	GREETING = "GREETING",
	TALKING = "TALKING",
	LISTENING = "LISTENING",
	THINKING = "THINKING",
	HAPPY = "HAPPY",
	SAD = "SAD",
	SURPRISED = "SURPRISED",
	ANGRY = "ANGRY",
	SLEEPING = "SLEEPING",
}

interface MotionConfig {
	group: string
	index?: number
	priority: MotionPriority
	loop?: boolean
	interruptible?: boolean
	fadeIn?: number
	fadeOut?: number
}

interface StateConfig {
	motions: MotionConfig[]
	duration?: number
	autoReturn?: boolean
	returnDelay?: number
	onEnter?: () => void
	onExit?: () => void
}

const EMOTION_KEYWORDS: Record<AnimationState, string[]> = {
	[AnimationState.HAPPY]: [
		"开心",
		"高兴",
		"快乐",
		"幸福",
		"喜欢",
		"太好了",
		"么么哒",
		"爱你",
		"好开心",
		"超开心",
	],
	[AnimationState.SAD]: [
		"难过",
		"伤心",
		"哭",
		"悲伤",
		"沮丧",
		"郁闷",
		"不舒服",
		"心痛",
		"难受",
	],
	[AnimationState.SURPRISED]: [
		"惊讶",
		"吃惊",
		"意外",
		"震惊",
		"吓",
		"哇",
		"咦",
		"哎",
	],
	[AnimationState.ANGRY]: [
		"生气",
		"愤怒",
		"讨厌",
		"烦",
		"不爽",
		"气",
		"哼",
		"可恶",
	],
	[AnimationState.THINKING]: ["思考", "想想", "嗯", "让我想想", "考虑"],
	[AnimationState.TALKING]: ["说话", "说", "回答", "回复"],
	[AnimationState.LISTENING]: ["听", "听着", "等待"],
	[AnimationState.GREETING]: ["你好", "嗨", "哈喽", "初次见面"],
	[AnimationState.SLEEPING]: ["睡觉", "困", "晚安", "午休"],
	[AnimationState.IDLE]: [],
}

export class AnimationStateMachine {
	private model: any
	private states: Map<AnimationState, StateConfig> = new Map()
	private currentState: AnimationState = AnimationState.IDLE
	private returnTimer: number | null = null
	private interactionCount: number = 0
	private lastInteractionTime: number = 0
	private idleTimer: number | null = null
	private readonly IDLE_TIMEOUT = 5 * 60 * 1000
	private currentMotionGroup: string = ""
	private isMotionPlaying: boolean = false

	constructor(model: any) {
		this.model = model
		this.initStates()
		this.setupMotionListeners()
		this.startIdleTimer()
	}

	private initStates(): void {
		this.states.set(AnimationState.IDLE, {
			motions: [{ group: "Idle", priority: MotionPriority.IDLE, loop: true }],
			autoReturn: false,
		})

		this.states.set(AnimationState.GREETING, {
			motions: [
				{ group: "TapBody", priority: MotionPriority.NORMAL, fadeIn: 500 },
			],
			duration: 3000,
			autoReturn: true,
			returnDelay: 2000,
		})

		this.states.set(AnimationState.TALKING, {
			motions: [
				{
					group: "TapBody",
					priority: MotionPriority.NORMAL,
					interruptible: true,
				},
			],
			duration: 2000,
			autoReturn: true,
			returnDelay: 1500,
		})

		this.states.set(AnimationState.LISTENING, {
			motions: [
				{ group: "Flick", priority: MotionPriority.NORMAL, loop: true },
			],
			duration: 5000,
			autoReturn: true,
			returnDelay: 3000,
		})

		this.states.set(AnimationState.THINKING, {
			motions: [
				{ group: "FlickUp", priority: MotionPriority.NORMAL, loop: true },
			],
			duration: 5000,
			autoReturn: true,
			returnDelay: 3000,
		})

		this.states.set(AnimationState.HAPPY, {
			motions: [{ group: "Happy", priority: MotionPriority.NORMAL }],
			duration: 4000,
			autoReturn: true,
			returnDelay: 2000,
		})

		this.states.set(AnimationState.SAD, {
			motions: [{ group: "Sad", priority: MotionPriority.NORMAL }],
			duration: 4000,
			autoReturn: true,
			returnDelay: 2000,
		})

		this.states.set(AnimationState.SURPRISED, {
			motions: [{ group: "Surprised", priority: MotionPriority.NORMAL }],
			duration: 3000,
			autoReturn: true,
			returnDelay: 1500,
		})

		this.states.set(AnimationState.ANGRY, {
			motions: [{ group: "Angry", priority: MotionPriority.NORMAL }],
			duration: 4000,
			autoReturn: true,
			returnDelay: 2000,
		})

		this.states.set(AnimationState.SLEEPING, {
			motions: [
				{ group: "Sleeping", priority: MotionPriority.IDLE, loop: true },
			],
			autoReturn: false,
		})
	}

	private setupMotionListeners(): void {
		const motionManager = this.model?.internalModel?.motionManager
		if (!motionManager) return

		motionManager.on(
			"motionStart",
			(group: string, _index: number, _audio: HTMLAudioElement | null) => {
				this.isMotionPlaying = true
				this.currentMotionGroup = group
			},
		)

		motionManager.on("motionEnd", (_group: string) => {
			this.isMotionPlaying = false
		})
	}

	private startIdleTimer(): void {
		this.lastInteractionTime = Date.now()

		const checkIdle = () => {
			const timeSinceInteraction = Date.now() - this.lastInteractionTime

			if (
				this.currentState === AnimationState.IDLE &&
				timeSinceInteraction > this.IDLE_TIMEOUT
			) {
				this.transition(AnimationState.SLEEPING)
			}

			this.idleTimer = window.setTimeout(checkIdle, 10000)
		}

		checkIdle()
	}

	private resetIdleTimer(): void {
		this.lastInteractionTime = Date.now()

		if (this.currentState === AnimationState.SLEEPING) {
			this.transition(AnimationState.IDLE)
		}
	}

	async transition(
		state: AnimationState,
		options?: { duration?: number },
	): Promise<void> {
		if (state === this.currentState) {
			if (options?.duration) {
				this.clearReturnTimer()
				this.setReturnTimer(options.duration)
			}
			return
		}

		const oldState = this.currentState
		const config = this.states.get(state)

		if (!config) {
			console.error(`[AnimationStateMachine] State not found: ${state}`)
			return
		}

		const oldConfig = this.states.get(oldState)
		oldConfig?.onExit?.()

		this.clearReturnTimer()
		this.currentState = state
		config.onEnter?.()

		await this.playMotion(config.motions)

		if (config.autoReturn) {
			const delay = options?.duration || config.returnDelay || 2000
			this.setReturnTimer(delay)
		}

		this.resetIdleTimer()
	}

	private async playMotion(motions: MotionConfig[]): Promise<void> {
		if (!this.model) {
			console.warn("[AnimationStateMachine] Model is null")
			return
		}

		const motionManager = this.model.internalModel?.motionManager
		if (!motionManager) {
			console.warn("[AnimationStateMachine] motionManager not available")
			return
		}

		const availableGroups = Object.keys(motionManager.motionGroups || {})

		for (const motion of motions) {
			const groupExists = availableGroups.includes(motion.group)
			if (!groupExists) {
				console.warn(
					`[AnimationStateMachine] Motion group not found: ${motion.group}`,
				)
				continue
			}

			try {
				const index = motion.index ?? -1

				if (motion.loop) {
					motionManager.startRandomMotion(motion.group, motion.priority)
				} else {
					await this.model.motion(motion.group, index, motion.priority)
				}
			} catch (error) {
				console.error(`[AnimationStateMachine] Failed to play motion:`, error)
			}
		}
	}

	private setReturnTimer(delay: number): void {
		this.clearReturnTimer()

		this.returnTimer = window.setTimeout(() => {
			if (this.currentState !== AnimationState.SLEEPING) {
				this.transition(AnimationState.IDLE)
			}
		}, delay)
	}

	private clearReturnTimer(): void {
		if (this.returnTimer !== null) {
			clearTimeout(this.returnTimer)
			this.returnTimer = null
		}
	}

	handleUserInteraction(): void {
		this.interactionCount++
		this.resetIdleTimer()

		if (this.interactionCount === 1) {
			this.transition(AnimationState.GREETING)
		} else if (
			this.currentState === AnimationState.IDLE ||
			this.currentState === AnimationState.SLEEPING
		) {
			this.transition(AnimationState.TALKING)
		} else {
			this.transition(AnimationState.IDLE)
		}
	}

	handleUserMessage(): void {
		this.resetIdleTimer()
		this.transition(AnimationState.LISTENING)
	}

	handleBotThinking(): void {
		this.resetIdleTimer()
		this.transition(AnimationState.THINKING)
	}

	handleBotMessage(text: string): void {
		this.resetIdleTimer()

		const emotion = this.detectEmotion(text)
		if (emotion) {
			this.transition(emotion)
		} else {
			this.transition(AnimationState.TALKING)
		}
	}

	handleMessageComplete(): void {
		if (this.currentState === AnimationState.TALKING) {
			this.transition(AnimationState.IDLE)
		}
	}

	async playMotionGroup(motionGroup: string): Promise<boolean> {
		if (!this.model) return false

		try {
			const result = await this.model.motion(
				motionGroup,
				undefined,
				MotionPriority.FORCE,
			)
			if (!result) {
				console.warn(
					`[AnimationStateMachine] Motion "${motionGroup}" was rejected (already playing), trying to force stop and replay`,
				)
				this.model.internalModel?.motionManager?.stopAllMotions()
				await new Promise((resolve) => setTimeout(resolve, 50))
				return await this.model.motion(
					motionGroup,
					undefined,
					MotionPriority.FORCE,
				)
			}
			return result
		} catch (error) {
			console.error(
				`[AnimationStateMachine] Failed to play motion group: ${motionGroup}`,
				error,
			)
			return false
		}
	}

	async playExpression(expressionName: string): Promise<boolean> {
		if (!this.model?.internalModel?.motionManager?.expressionManager) {
			console.warn("[AnimationStateMachine] ExpressionManager not available")
			return false
		}

		try {
			const expressionManager =
				this.model.internalModel.motionManager.expressionManager
			await expressionManager.setExpression(expressionName)
			return true
		} catch (error) {
			console.error(`[AnimationStateMachine] Failed to play expression:`, error)
			return false
		}
	}

	async playRandomExpression(): Promise<void> {
		if (!this.model?.internalModel?.motionManager?.expressionManager) {
			console.warn("[AnimationStateMachine] ExpressionManager not available")
			return
		}

		try {
			const expressionManager =
				this.model.internalModel.motionManager.expressionManager
			await expressionManager.setRandomExpression()
		} catch (error) {
			console.error(
				"[AnimationStateMachine] Failed to play random expression:",
				error,
			)
		}
	}

	detectEmotion(text: string): AnimationState | null {
		if (!text) return null

		for (const [state, keywords] of Object.entries(EMOTION_KEYWORDS)) {
			for (const keyword of keywords) {
				if (text.includes(keyword)) {
					return state as AnimationState
				}
			}
		}

		return null
	}

	getState(): AnimationState {
		return this.currentState
	}

	getAvailableMotions(): string[] {
		if (!this.model?.internalModel?.motionManager?.motionGroups) {
			return []
		}
		return Object.keys(this.model.internalModel.motionManager.motionGroups)
	}

	getAvailableExpressions(): string[] {
		const expressionManager =
			this.model?.internalModel?.motionManager?.expressionManager
		if (!expressionManager?.expressions) {
			return []
		}
		return Object.keys(expressionManager.expressions)
	}

	isCurrentlyPlaying(): boolean {
		return this.isMotionPlaying
	}

	getCurrentMotionGroup(): string {
		return this.currentMotionGroup
	}

	setVolume(volume: number): void {
		SoundManager.volume = Math.max(0, Math.min(1, volume))
	}

	destroy(): void {
		this.clearReturnTimer()
		if (this.idleTimer !== null) {
			clearTimeout(this.idleTimer)
			this.idleTimer = null
		}

		if (this.model?.internalModel?.motionManager) {
			this.model.internalModel.motionManager.stopAllMotions()
		}
	}
}

export { AnimationStateMachine as Live2DStateMachine }
