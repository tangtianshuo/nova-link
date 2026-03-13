export interface HitArea {
  name: string
  id: string
}

export type ClickCallback = (hitArea: HitArea | null, x: number, y: number) => void
export type DoubleClickCallback = (hitArea: HitArea | null, x: number, y: number) => void
export type HoverCallback = (hitArea: HitArea | null) => void

export class MouseInteractionHandler {
  private model: any = null
  private container: HTMLElement | null = null
  private hitAreas: HitArea[] = []
  private trackingEnabled: boolean = false
  private mouseX: number = 0
  private mouseY: number = 0
  private lastClickTime: number = 0
  private readonly DOUBLE_CLICK_DELAY = 300
  private readonly TRACKING_SMOOTHING = 0.1

  private clickCallback: ClickCallback | null = null
  private doubleClickCallback: DoubleClickCallback | null = null
  private hoverCallback: HoverCallback | null = null

  private eventElement: HTMLElement | null = null
  private currentHoverArea: HitArea | null = null

  constructor(model: any, container: HTMLElement) {
    this.model = model
    this.container = container
    this.initHitAreas()
  }

  private initHitAreas(): void {
    try {
      const model3 = this.model?.internalModel?.model?.model3
      if (model3?.HitAreas) {
        this.hitAreas = model3.HitAreas.map((area: any) => ({
          name: area.Name || area.name || 'Unknown',
          id: area.Id || area.id || 'Unknown',
        }))
      }
    } catch (e) {
      console.error('[MouseInteraction] Failed to load HitAreas:', e)
    }

    if (this.hitAreas.length === 0) {
      this.hitAreas = [
        { name: 'Body', id: 'HitArea' },
      ]
    }
  }

  init(): void {
    if (!this.container) return

    this.eventElement = this.container

    this.eventElement.addEventListener('pointerover', this.handlePointerOver.bind(this), { passive: true })
    this.eventElement.addEventListener('pointerout', this.handlePointerOut.bind(this), { passive: true })
    this.eventElement.addEventListener('pointermove', this.handlePointerMove.bind(this), { passive: true })
    this.eventElement.addEventListener('pointerdown', this.handlePointerDown.bind(this), { passive: true })

    this.eventElement.style.cursor = 'pointer'
    this.eventElement.style.pointerEvents = 'auto'

    // this.container.style.pointerEvents = 'none'
  }

  onClick(callback: ClickCallback): void {
    this.clickCallback = callback
  }

  onDoubleClick(callback: DoubleClickCallback): void {
    this.doubleClickCallback = callback
  }

  onHover(callback: HoverCallback): void {
    this.hoverCallback = callback
  }

  getHitArea(x: number, y: number): HitArea | null {
    if (!this.container) return { name: 'Body', id: 'Body' }

    const rect = this.container.getBoundingClientRect()

    if (rect.width === 0 || rect.height === 0) {
      return { name: 'Body', id: 'Body' }
    }

    const relX = (x - rect.left) / rect.width
    const relY = (y - rect.top) / rect.height

    // 点击在容器外
    if (relX < 0 || relX > 1 || relY < 0 || relY > 1) {
      return { name: 'Body', id: 'Body' }
    }

    const centerX = 0.5
    const centerY = 0.5
    const distFromCenter = Math.sqrt(
      Math.pow(relX - centerX, 2) + Math.pow(relY - centerY, 2)
    )

    // 中心区域为 Head
    if (distFromCenter < 0.25) {
      return { name: 'Head', id: 'Head' }
    }

    // 其他区域都视为 Body（支持整个下方区域点击）
    return this.hitAreas.find(h => h.name === 'Body') || { name: 'Body', id: 'Body' }
  }

  enableTracking(enabled: boolean): void {
    this.trackingEnabled = enabled
    if (!enabled) {
      this.resetTracking()
    }
  }

  private handlePointerOver(e: PointerEvent): void {
    if (!this.eventElement) return
    
    const hitArea = this.getHitArea(e.clientX, e.clientY)
    this.currentHoverArea = hitArea
    this.eventElement.style.cursor = 'pointer'

    if (this.hoverCallback && hitArea) {
      this.hoverCallback(hitArea)
    }

    this.triggerHoverMotion(hitArea)
  }

  private handlePointerOut(e: PointerEvent): void {
    if (!this.eventElement) return
    
    const relatedTarget = e.relatedTarget as HTMLElement
    if (relatedTarget && this.eventElement.contains(relatedTarget)) {
      return
    }

    this.currentHoverArea = null
    this.eventElement.style.cursor = 'pointer'

    if (this.hoverCallback) {
      this.hoverCallback(null)
    }
  }

  private handlePointerMove(e: PointerEvent): void {
    if (!this.container) return

    const rect = this.container.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) return

    const relX = ((e.clientX - rect.left) / rect.width - 0.5) * 2
    const relY = ((e.clientY - rect.top) / rect.height - 0.5) * 2

    this.mouseX += (relX - this.mouseX) * this.TRACKING_SMOOTHING
    this.mouseY += (relY - this.mouseY) * this.TRACKING_SMOOTHING

    if (this.trackingEnabled) {
      this.updateTracking()
    }
  }

  private handlePointerDown(e: PointerEvent): void {
    if (e.button !== 0) return

    const now = Date.now()
    const hitArea = this.getHitArea(e.clientX, e.clientY)

    if (now - this.lastClickTime < this.DOUBLE_CLICK_DELAY) {
      if (this.doubleClickCallback && hitArea) {
        this.doubleClickCallback(hitArea, e.clientX, e.clientY)
      }
      this.lastClickTime = 0
    } else {
      if (this.clickCallback && hitArea) {
        this.clickCallback(hitArea, e.clientX, e.clientY)
      }
      this.lastClickTime = now
    }
  }

  private triggerHoverMotion(hitArea: HitArea | null): void {
    if (!this.model || !hitArea) return

    try {
      const manager = this.model.internalModel?.motionManager as any
      if (manager?.triggerRandomMotion) {
        if (hitArea.name === 'Head') {
          manager.triggerRandomMotion('Tap')
        } else if (hitArea.name === 'Body') {
          manager.triggerRandomMotion('Tap@Body')
        }
      }
    } catch (e) {
      console.error('[MouseInteraction] Failed to trigger hover motion:', e)
    }
  }

  private updateTracking(): void {
    if (!this.model) return

    try {
      const internalModel = this.model.internalModel
      if (!internalModel?.model) return

      const model = internalModel.model
      const paramAngleX = 'ParamAngleX'
      const paramAngleY = 'ParamAngleY'
      const paramEyeX = 'ParamEyeX'
      const paramEyeY = 'ParamEyeY'

      const maxAngle = 15
      const targetAngleX = this.mouseX * maxAngle
      const targetAngleY = this.mouseY * maxAngle

      if (model.getParameterById) {
        const angleXParam = model.getParameterById(paramAngleX)
        const angleYParam = model.getParameterById(paramAngleY)
        const eyeXParam = model.getParameterById(paramEyeX)
        const eyeYParam = model.getParameterById(paramEyeY)

        if (angleXParam) angleXParam.value = targetAngleX
        if (angleYParam) angleYParam.value = targetAngleY
        if (eyeXParam) eyeXParam.value = this.mouseX * 0.5
        if (eyeYParam) eyeYParam.value = this.mouseY * 0.5
      }
    } catch (e) {
      console.error('[MouseInteraction] Failed to update tracking:', e)
    }
  }

  private resetTracking(): void {
    if (!this.model) return

    try {
      const internalModel = this.model.internalModel
      if (!internalModel?.model) return

      const model = internalModel.model

      if (model.getParameterById) {
        const angleXParam = model.getParameterById('ParamAngleX')
        const angleYParam = model.getParameterById('ParamAngleY')
        const eyeXParam = model.getParameterById('ParamEyeX')
        const eyeYParam = model.getParameterById('ParamEyeY')

        if (angleXParam) angleXParam.value = 0
        if (angleYParam) angleYParam.value = 0
        if (eyeXParam) eyeXParam.value = 0
        if (eyeYParam) eyeYParam.value = 0
      }
    } catch (e) {
      console.error('[MouseInteraction] Failed to reset tracking:', e)
    }
  }

  getCurrentHoverArea(): HitArea | null {
    return this.currentHoverArea
  }

  destroy(): void {
    if (this.eventElement) {
      this.eventElement.style.cursor = 'default'
      this.eventElement.style.pointerEvents = 'auto'
    }

    if (this.container) {
      this.container.style.pointerEvents = 'auto'
    }

    this.model = null
    this.container = null
    this.eventElement = null
    this.clickCallback = null
    this.doubleClickCallback = null
    this.hoverCallback = null
  }
}
