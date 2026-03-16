import { getCurrentWindow, LogicalSize, LogicalPosition } from "@tauri-apps/api/window"
import { useSettings } from "./useSettings"

export function useWindow() {
  const { settings, saveSettings } = useSettings()

  async function toggleAlwaysOnTop(): Promise<void> {
    const win = await getCurrentWindow()
    settings.value.alwaysOnTop = !settings.value.alwaysOnTop
    await win.setAlwaysOnTop(settings.value.alwaysOnTop)
    await saveSettings()
  }

  async function setIgnoreCursorEvents(ignore: boolean): Promise<void> {
    const win = await getCurrentWindow()
    await win.setIgnoreCursorEvents(ignore)
  }

  async function minimizeWindow(): Promise<void> {
    const win = await getCurrentWindow()
    await win.minimize()
  }

  async function closeWindow(): Promise<void> {
    try {
      const win = await getCurrentWindow()
      const size = await win.outerSize()
      const position = await win.outerPosition()
      settings.value.windowWidth = size.width
      settings.value.windowHeight = size.height
      settings.value.windowX = position.x
      settings.value.windowY = position.y
      await saveSettings()
    } catch (e) {
      console.error("[useWindow] Failed to save window position/size:", e)
    }

    const win = await getCurrentWindow()
    await win.close()
  }

  async function restoreWindowBounds(): Promise<void> {
    try {
      const win = await getCurrentWindow()
      if (settings.value.windowWidth && settings.value.windowHeight) {
        await win.setSize(
          new LogicalSize(settings.value.windowWidth, settings.value.windowHeight),
        )
      }
      if (settings.value.windowX !== undefined && settings.value.windowY !== undefined) {
        await win.setPosition(new LogicalPosition(settings.value.windowX, settings.value.windowY))
      }
    } catch (e) {
      console.error("[useWindow] Failed to restore window position/size:", e)
    }
  }

  async function resizeWindow(width: number, height: number): Promise<void> {
    const win = await getCurrentWindow()
    await win.setSize(new LogicalSize(width, height))
  }

  return {
    toggleAlwaysOnTop,
    setIgnoreCursorEvents,
    minimizeWindow,
    closeWindow,
    restoreWindowBounds,
    resizeWindow,
  }
}
