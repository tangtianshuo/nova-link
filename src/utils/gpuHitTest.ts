import * as PIXI from "pixi.js"

export interface HitTestResult {
	drawableIndex: number
	drawableName: string
}

export class GPUHitTest {
	private app: PIXI.Application

	constructor(app: PIXI.Application) {
		this.app = app
	}

	async pick(x: number, y: number, model: any): Promise<HitTestResult | null> {
		if (!model?.internalModel) {
			return null
		}

		try {
			const rect = (this.app.view as HTMLCanvasElement).getBoundingClientRect()
			const ndcX = ((x - rect.left) / rect.width) * 2 - 1
			const ndcY = -((y - rect.top) / rect.height) * 2 + 1

			const internalModel = model.internalModel
			const drawableInfo = this.getDrawableInfo(internalModel)

			if (drawableInfo.count === 0) {
				return null
			}

			for (let i = 0; i < drawableInfo.count; i++) {
				const bounds = this.getDrawableBounds(internalModel, i)
				if (bounds && this.pointInBounds(ndcX, ndcY, bounds)) {
					const name = this.getDrawableName(internalModel, i)
					return {
						drawableIndex: i,
						drawableName: name || `Part_${i}`,
					}
				}
			}

			return null
		} catch (e) {
			console.error("[GPUHitTest] Error:", e)
			return null
		}
	}

	private getDrawableInfo(internalModel: any): { count: number } {
		try {
			const model = internalModel.model
			if (!model?.drawables) {
				return { count: 0 }
			}

			const drawables = model.drawables
			const orders = drawables.orders

			if (!orders) {
				return { count: 0 }
			}

			return { count: orders.length }
		} catch {
			return { count: 0 }
		}
	}

	private getDrawableBounds(internalModel: any, index: number): { minX: number; maxX: number; minY: number; maxY: number } | null {
		try {
			const model = internalModel.model
			if (!model?.drawables) {
				return null
			}

			const drawables = model.drawables
			const vertexPositions = drawables.vertexPositions

			if (!vertexPositions) {
				return null
			}

			const orders = drawables.orders
			const drawableIndex = orders?.[index] ?? index

			const vertexCount = drawables.vertexCount?.[drawableIndex] ?? 3
			const vertexOffset = drawableIndex * 3 * 4

			let minX = Infinity, maxX = -Infinity
			let minY = Infinity, maxY = -Infinity

			for (let i = 0; i < vertexCount && (vertexOffset + i * 2 + 1) < vertexPositions.length; i++) {
				const vx = vertexPositions[vertexOffset + i * 2]
				const vy = vertexPositions[vertexOffset + i * 2 + 1]

				minX = Math.min(minX, vx)
				maxX = Math.max(maxX, vx)
				minY = Math.min(minY, vy)
				maxY = Math.max(maxY, vy)
			}

			if (minX === Infinity) {
				return null
			}

			return { minX, maxX, minY, maxY }
		} catch (e) {
			console.error("[GPUHitTest] getDrawableBounds error:", e)
			return null
		}
	}

	private getDrawableName(internalModel: any, index: number): string {
		try {
			const model = internalModel.model
			if (!model?.drawables) {
				return ""
			}

			const orders = model.drawables.orders
			const drawableIndex = orders?.[index] ?? index

			return `Part_${drawableIndex}`
		} catch {
			return `Part_${index}`
		}
	}

	private pointInBounds(x: number, y: number, bounds: { minX: number; maxX: number; minY: number; maxY: number }): boolean {
		return x >= bounds.minX && x <= bounds.maxX && y >= bounds.minY && y <= bounds.maxY
	}
}
