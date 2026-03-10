export enum AnimationState {
  IDLE = 'IDLE',
  GREETING = 'GREETING',
  TALKING = 'TALKING',
  LISTENING = 'LISTENING',
  THINKING = 'THINKING',
  HAPPY = 'HAPPY',
  SAD = 'SAD',
  SURPRISED = 'SURPRISED',
  ANGRY = 'ANGRY',
  SLEEPING = 'SLEEPING',
}

export interface StateChangeEvent {
  oldState: AnimationState
  newState: AnimationState
}

export type StateChangeCallback = (event: StateChangeEvent) => void

const emotionKeywords: Record<string, string[]> = {
  happy: ['开心', '高兴', '喜欢', '棒', '好', '谢谢', '爱你', '么么哒', '好耶', '太好了', '赞', '优秀', '完美', '哈哈', '呵呵', '嘿嘿', '真好', '太棒了', '爱了'],
  sad: ['难过', '伤心', '哭', '失望', '抱歉', '对不起', '遗憾', '心疼', '难受', '沮丧', '呜呜', '泪', '悲伤', '心碎', '哭诉'],
  surprised: ['哇', '真的', '惊讶', '震惊', '不可思议', '没想到', '居然', '竟然', '啥', '哈', '诶', '哎哟', '咦'],
  angry: ['生气', '愤怒', '讨厌', '烦', '滚', '去死', '傻', '笨', '蠢', '够了', '哼', '哼唧'],
}

const stateMotionMap: Record<AnimationState, string[]> = {
  [AnimationState.IDLE]: ['Idle'],
  [AnimationState.GREETING]: ['Tap'],
  [AnimationState.TALKING]: ['Tap@Body', 'Tap'],
  [AnimationState.LISTENING]: ['Flick'],
  [AnimationState.THINKING]: ['FlickUp'],
  [AnimationState.HAPPY]: ['Tap', 'Tap@Body'],
  [AnimationState.SAD]: ['FlickDown'],
  [AnimationState.SURPRISED]: ['Flick', 'FlickUp'],
  [AnimationState.ANGRY]: ['FlickDown'],
  [AnimationState.SLEEPING]: ['Idle'],
}

const stateDurations: Partial<Record<AnimationState, number>> = {
  [AnimationState.GREETING]: 2000,
  [AnimationState.TALKING]: 1500,
  [AnimationState.THINKING]: 5000,
  [AnimationState.HAPPY]: 2000,
  [AnimationState.SAD]: 3000,
  [AnimationState.SURPRISED]: 1500,
  [AnimationState.ANGRY]: 3000,
  [AnimationState.SLEEPING]: 60000,
}

export class AnimationStateMachine {
  private model: any = null
  private currentState: AnimationState = AnimationState.IDLE
  private callbacks: StateChangeCallback[] = []
  private idleTimer: number | null = null
  private lastInteractionTime: number = Date.now()
  private isFirstInteraction: boolean = true
  private sleepTimeout: number | null = null
  private readonly SLEEP_THRESHOLD = 5 * 60 * 1000

  constructor(model: any) {
    this.model = model
    this.startIdleTimer()
  }

  getState(): AnimationState {
    return this.currentState
  }

  transition(newState: AnimationState): void {
    if (this.currentState === newState) return

    const oldState = this.currentState
    this.currentState = newState
    this.lastInteractionTime = Date.now()

    this.clearTimers()

    console.log(`[AnimationState] State transition: ${oldState} -> ${newState}`)

    this.callbacks.forEach(cb => cb({ oldState, newState }))

    this.playStateMotion(newState)

    const duration = stateDurations[newState]
    if (duration && newState !== AnimationState.IDLE) {
      this.idleTimer = window.setTimeout(() => {
        this.transition(AnimationState.IDLE)
      }, duration)
    }

    if (newState === AnimationState.IDLE) {
      this.startIdleTimer()
    }
  }

  onStateChange(callback: StateChangeCallback): void {
    this.callbacks.push(callback)
  }

  removeStateChangeCallback(callback: StateChangeCallback): void {
    const index = this.callbacks.indexOf(callback)
    if (index > -1) {
      this.callbacks.splice(index, 1)
    }
  }

  detectEmotion(text: string): AnimationState | null {
    if (!text) return null

    const lowerText = text.toLowerCase()
    for (const [emotion, keywords] of Object.entries(emotionKeywords)) {
      for (const keyword of keywords) {
        if (lowerText.includes(keyword)) {
          const stateMap: Record<string, AnimationState> = {
            happy: AnimationState.HAPPY,
            sad: AnimationState.SAD,
            surprised: AnimationState.SURPRISED,
            angry: AnimationState.ANGRY,
          }
          return stateMap[emotion] || null
        }
      }
    }
    return null
  }

  async playMotion(motionGroup: string): Promise<void> {
    if (!this.model) {
      console.warn('[AnimationState] Model not available')
      return
    }

    try {
      const manager = this.model.internalModel?.motionManager as any
      if (manager?.randomMotion) {
        await manager.randomMotion(motionGroup)
      } else if (manager?.startMotion) {
        await manager.startMotion(motionGroup)
      }
    } catch (error) {
      console.warn(`[AnimationState] Failed to play motion ${motionGroup}:`, error)
    }
  }

  async playStateMotion(state: AnimationState): Promise<void> {
    const motions = stateMotionMap[state]
    if (!motions || motions.length === 0) {
      return
    }

    const randomMotion = motions[Math.floor(Math.random() * motions.length)]
    await this.playMotion(randomMotion)
  }

  handleUserInteraction(): void {
    this.lastInteractionTime = Date.now()

    if (this.isFirstInteraction) {
      this.isFirstInteraction = false
      this.transition(AnimationState.GREETING)
      return
    }

    if (this.currentState === AnimationState.SLEEPING) {
      this.transition(AnimationState.IDLE)
    }
  }

  handleUserMessage(): void {
    if (this.currentState !== AnimationState.IDLE && this.currentState !== AnimationState.THINKING) {
      return
    }
    this.transition(AnimationState.TALKING)
  }

  handleBotThinking(): void {
    this.transition(AnimationState.THINKING)
  }

  handleBotMessage(text: string): void {
    const emotion = this.detectEmotion(text)
    if (emotion) {
      this.transition(emotion)
    } else {
      this.transition(AnimationState.TALKING)
    }
  }

  handleMessageComplete(): void {
    setTimeout(() => {
      if (this.currentState === AnimationState.TALKING) {
        this.transition(AnimationState.IDLE)
      }
    }, 2000)
  }

  private startIdleTimer(): void {
    this.clearSleepTimer()
    this.sleepTimeout = window.setTimeout(() => {
      if (Date.now() - this.lastInteractionTime >= this.SLEEP_THRESHOLD) {
        this.transition(AnimationState.SLEEPING)
      }
    }, this.SLEEP_THRESHOLD + 1000)
  }

  private clearTimers(): void {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer)
      this.idleTimer = null
    }
  }

  private clearSleepTimer(): void {
    if (this.sleepTimeout) {
      clearTimeout(this.sleepTimeout)
      this.sleepTimeout = null
    }
  }

  destroy(): void {
    this.clearTimers()
    this.clearSleepTimer()
    this.callbacks = []
    this.model = null
  }
}
