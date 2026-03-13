// Global type declarations for CDN-loaded libraries
declare global {
	interface ImportMetaEnv {
		readonly DEV: boolean
	}

	interface ImportMeta {
		readonly env: ImportMetaEnv
	}

	interface Window {
		PIXI: any
		$showDialog?: (options: {
			message: string
			title?: string
			type?: "info" | "warning" | "error" | "success"
			showCancel?: boolean
			confirmText?: string
			cancelText?: string
		}) => void
		$showConfirm?: (options: {
			message: string
			title?: string
			type?: "info" | "warning" | "error" | "success"
			showCancel?: boolean
			confirmText?: string
			cancelText?: string
		}) => Promise<boolean>
	}
}

declare const PIXI: any
declare const Live2DModel: any
declare const live2dCubismCore: any

export {}
