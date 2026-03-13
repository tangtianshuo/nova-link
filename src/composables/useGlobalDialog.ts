import { ref, reactive } from "vue"

export interface DialogOptions {
	message: string
	title?: string
	type?: "info" | "warning" | "error" | "success"
	showCancel?: boolean
	confirmText?: string
	cancelText?: string
}

const dialogVisible = ref(false)
const dialogOptions = reactive<DialogOptions>({
	message: "",
	type: "info",
	showCancel: false,
})

// Promise resolve functions
let resolveConfirm: ((value: boolean) => void) | null = null

export function useGlobalDialog() {
	function showDialog(options: DialogOptions): void {
		Object.assign(dialogOptions, options)
		dialogVisible.value = true
	}

	function showConfirm(options: DialogOptions): Promise<boolean> {
		return new Promise((resolve) => {
			resolveConfirm = resolve
			Object.assign(dialogOptions, {
				...options,
				showCancel: true,
				confirmText: options.confirmText || "确定",
				cancelText: options.cancelText || "取消",
			})
			dialogVisible.value = true
		})
	}

	function handleConfirm() {
		dialogVisible.value = false
		if (resolveConfirm) {
			resolveConfirm(true)
			resolveConfirm = null
		}
	}

	function handleCancel() {
		dialogVisible.value = false
		if (resolveConfirm) {
			resolveConfirm(false)
			resolveConfirm = null
		}
	}

	function handleClose() {
		dialogVisible.value = false
		if (resolveConfirm) {
			resolveConfirm(false)
			resolveConfirm = null
		}
	}

	return {
		dialogVisible,
		dialogOptions,
		showDialog,
		showConfirm,
		handleConfirm,
		handleCancel,
		handleClose,
	}
}
