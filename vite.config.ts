import { defineConfig } from "vite"
import vue from "@vitejs/plugin-vue"

// @ts-expect-error process is a nodejs global
const host = process.env.TAURI_DEV_HOST

const port = parseInt(process.env.VITE_PORT || "18080")
const hmrPort = parseInt(process.env.VITE_HMR_PORT || "18081")

export default defineConfig(async () => ({
	plugins: [vue()],
	clearScreen: false,
	server: {
		port,
		strictPort: true,
		host: host || false,
		hmr: host
			? {
					protocol: "ws",
					host,
					port: hmrPort,
				}
			: {
					protocol: "ws",
					port: hmrPort,
				},
		watch: {
			ignored: ["**/src-tauri/**"],
		},
	},
	optimizeDeps: {
		include: ["pixi.js", "pixi-live2d-display"],
	},
}))
