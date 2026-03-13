import { check } from "@tauri-apps/plugin-updater"
import { relaunch } from "@tauri-apps/plugin-process"

type DialogKind = "info" | "warning" | "error" | "success"

function showDialog(message: string, title: string, type: DialogKind): void {
	window.$showDialog?.({ message, title, type })
}

async function showConfirm(message: string, title: string): Promise<boolean> {
	if (!window.$showConfirm) return false
	return window.$showConfirm({
		message,
		title,
		type: "info",
		showCancel: true,
		confirmText: "立即更新",
		cancelText: "稍后",
	})
}

export async function checkForUpdates(userInitiated: boolean): Promise<void> {
	try {
		const update = await check()
		if (!update) {
			if (userInitiated) {
				showDialog("检查更新失败，请稍后再试。", "更新", "error")
			}
			return
		}

		if (!update.available) {
			if (userInitiated) {
				showDialog("当前已是最新版本。", "更新", "info")
			}
			return
		}

		const body = update.body ? `\n\n${update.body}` : ""
		const ok = await showConfirm(`发现新版本 ${update.version}${body}`, "发现更新")
		if (!ok) return

		await update.downloadAndInstall()
		await relaunch()
	} catch (e) {
		if (userInitiated) {
			showDialog(`检查更新失败：${String(e)}`, "更新", "error")
		}
	}
}

