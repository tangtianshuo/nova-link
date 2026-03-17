import { createApp } from "vue"
import App from "./App.vue"
import { Dialog } from "./components"
import { attachConsole, error } from "@tauri-apps/plugin-log"
import { useGlobalDialog } from "./composables/useGlobalDialog"

// 初始化日志插件
attachConsole().then(() => {
  console.log("[Frontend] Nova Link frontend initialized")
})

const app = createApp(App)

// 全局注册 Dialog 组件
app.component("Dialog", Dialog)

// 全局错误处理 - 将错误日志发送到 Rust 控制台并显示用户提示
app.config.errorHandler = (err, _instance, info) => {
  error(`[Vue Error] ${err}: ${info}`)

  // Show user-friendly error dialog
  try {
    const { showDialog } = useGlobalDialog()
    showDialog({
      title: "应用错误",
      message: "发生了错误，请重启应用。\n\n错误信息：" + String(err).slice(0, 200),
      type: "error",
    })
  } catch {
    // Dialog not available yet, ignore
  }
}

// Global unhandled promise rejection handler
window.addEventListener("unhandledrejection", (event) => {
  error(`[Unhandled Promise Rejection] ${event.reason}`)
})

// Global error handler
window.addEventListener("error", (event) => {
  error(`[Global Error] ${event.error?.message || event.message}`)
})

app.mount("#app")
