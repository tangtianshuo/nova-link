import { ref, nextTick } from "vue"
import * as PIXI from "pixi.js"
import { Live2DModel } from "pixi-live2d-display/cubism4"
import { AnimationStateMachine, AnimationState } from "../utils/animationState"
import { MouseInteractionHandler } from "../utils/mouseInteraction"

// Make PIXI available globally for Live2D
;(window as any).PIXI = PIXI

export function useLive2D() {
  const hasModel = ref(false)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  let live2dApp: PIXI.Application | null = null
  let live2dModel: any = null
  let stateMachine: AnimationStateMachine | null = null
  let mouseHandler: MouseInteractionHandler | null = null

  const onModelClickCallbacks: Array<() => void> = []
  const onModelDoubleClickCallbacks: Array<(hitArea: any) => void> = []
  const onModelHoverCallbacks: Array<(hitArea: any) => void> = []

  async function initLive2D(containerId: string = "live2d-container"): Promise<void> {
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
  ): Promise<void> {
    if (!live2dApp) {
      console.error("[useLive2D] live2dApp is null, cannot load model")
      return
    }

    isLoading.value = true

    try {
      const modelUrl = new URL(modelPath, window.location.origin).href

      live2dModel = await Live2DModel.from(modelUrl)

      if (live2dModel) {
        const container = document.getElementById(containerId)
        if (container) {
          const containerWidth = container.clientWidth
          const containerHeight = container.clientHeight

          // 计算缩放 - 使用容器高度的 90%
          const scale = (containerHeight * 0.9) / live2dModel.height

          live2dModel.scale.set(scale)
          // 居中显示
          live2dModel.anchor.set(0.5, 0.5)
          live2dModel.x = containerWidth / 2
          live2dModel.y = containerHeight / 2

        }

        // 确保模型不在 stage 中（防止重复添加）
        const stageChildren = live2dApp.stage.children as any[]
        if (stageChildren.includes(live2dModel)) {
          live2dApp.stage.removeChild(live2dModel)
        }
        live2dApp.stage.addChild(live2dModel)

        initInteractionHandlers(containerId)

        hasModel.value = true
      } else {
        console.error("[useLive2D] Model is null after loading")
      }
    } catch (e) {
      console.error("[useLive2D] Failed to load model:", e)
      hasModel.value = false
    } finally {
      isLoading.value = false
    }
  }

  function initInteractionHandlers(containerId: string = "live2d-container"): void {
    if (!live2dModel) return

    const container = document.getElementById(containerId)
    if (!container) return

    stateMachine = new AnimationStateMachine(live2dModel)

    mouseHandler = new MouseInteractionHandler(live2dModel, container)

    mouseHandler.onClick((_hitArea) => {
      if (stateMachine) {
        stateMachine.handleUserInteraction()
      }
      onModelClickCallbacks.forEach((cb) => cb())
    })

    mouseHandler.onDoubleClick(async (hitArea) => {
      if (stateMachine) {
        await stateMachine.playMotion("Tap")
      }
      onModelDoubleClickCallbacks.forEach((cb) => cb(hitArea))
    })

    mouseHandler.onHover((hitArea) => {
      onModelHoverCallbacks.forEach((cb) => cb(hitArea))
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

  async function reloadModel(modelPath: string): Promise<void> {

    // 销毁旧的交互处理器
    if (mouseHandler) {
      mouseHandler.destroy()
      mouseHandler = null
    }
    if (stateMachine) {
      stateMachine.destroy()
      stateMachine = null
    }

    // 销毁旧模型
    if (live2dApp && live2dModel) {

      // 从 stage 移除
      const stageChildren = live2dApp.stage.children as any[]
      if (stageChildren.includes(live2dModel)) {
        live2dApp.stage.removeChild(live2dModel)
      }

      live2dModel.removeAllListeners()

      // 销毁模型
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

      // 重置 stage 事件
      if (live2dApp.stage) {
        live2dApp.stage.removeAllListeners()
        ;(live2dApp.stage as any).eventMode = "none"
      }

      // 重置渲染器事件
      const renderer = live2dApp.renderer as any
      if (renderer && renderer.events) {
        renderer.events.cursorStyles = {}
        renderer.events.trackedPointers = {}
      }
    }

    hasModel.value = false
    await loadLive2DModel(modelPath)
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

  function onModelClick(callback: () => void): void {
    onModelClickCallbacks.push(callback)
  }

  function onModelDoubleClick(callback: (hitArea: any) => void): void {
    onModelDoubleClickCallbacks.push(callback)
  }

  function onModelHover(callback: (hitArea: any) => void): void {
    onModelHoverCallbacks.push(callback)
  }

  // Debug functions
  function getCurrentState(): string {
    return stateMachine?.getState() || "unknown"
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
      stateMachine.playMotion(motionName)
    }
  }

  function resetToIdle(): void {
    if (stateMachine) {
      stateMachine.transition(AnimationState.IDLE)
    }
  }

  /**
   * 处理外部传入的情绪数据
   * 用于从大模型回复中提取的情绪标签触发动画
   */
  function handleEmotion(emotion: { type: string; duration?: number }): void {
    if (!stateMachine) {
      return
    }

    const stateMap: Record<string, AnimationState> = {
      happy: AnimationState.HAPPY,
      sad: AnimationState.SAD,
      surprised: AnimationState.SURPRISED,
      angry: AnimationState.ANGRY,
      idle: AnimationState.IDLE
    }

    const state = stateMap[emotion.type] || AnimationState.IDLE

    stateMachine.transition(state)
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
    }

    if (live2dApp) {
      await live2dApp.destroy(true)
      live2dApp = null
    }

    hasModel.value = false
  }

  return {
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
    onModelClick,
    onModelDoubleClick,
    onModelHover,
    // Debug functions
    getCurrentState,
    previewState,
    previewMotion,
    resetToIdle,
    destroy,
  }
}
