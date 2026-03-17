import * as PIXI from "pixi.js"

export interface PixelHitResult {
	isTransparent: boolean
	alpha: number
}

export class PixelHitTest {
	private app: PIXI.Application

	constructor(app: PIXI.Application) {
		this.app = app
	}

	async checkHit(x: number, y: number): Promise<PixelHitResult> {
		try {
			const canvas = this.app.view as HTMLCanvasElement
			if (!canvas) {
				return { isTransparent: true, alpha: 0 }
			}

			const rect = canvas.getBoundingClientRect()
			const canvasX = Math.floor((x - rect.left) * (canvas.width / rect.width))
			const canvasY = Math.floor((y - rect.top) * (canvas.height / rect.height))

			const renderer = this.app.renderer as PIXI.Renderer
			const gl = renderer.gl

			if (!gl) {
				return { isTransparent: true, alpha: 0 }
			}

			const pixel = new Uint8Array(4)
			const prevFramebuffer = gl.getParameter(gl.FRAMEBUFFER_BINDING)

			gl.bindFramebuffer(gl.FRAMEBUFFER, (renderer as any).framebuffer?.glFramebuffers?.default?.framebuffer || null)
			gl.readPixels(
				canvasX,
				canvas.height - canvasY,
				1,
				1,
				gl.RGBA,
				gl.UNSIGNED_BYTE,
				pixel,
			)

			gl.bindFramebuffer(gl.FRAMEBUFFER, prevFramebuffer)

			const alpha = pixel[3] / 255

			const isTransparent = alpha < 0.1

			return { isTransparent, alpha }
		} catch (e) {
			console.error("[PixelHitTest] Error:", e)
			return { isTransparent: true, alpha: 0 }
		}
	}

	async isOpaque(x: number, y: number): Promise<boolean> {
		const result = await this.checkHit(x, y)
		return !result.isTransparent
	}

	destroy(): void {}
}
