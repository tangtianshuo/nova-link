<script setup lang="ts">
import { ref, onMounted, nextTick, watch } from 'vue'
import * as PIXI from 'pixi.js'
import { Live2DModel } from 'pixi-live2d-display/cubism4'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { getCurrentWindow, LogicalSize, LogicalPosition } from '@tauri-apps/api/window'
import { GatewayClient } from './sdk/index.js'
import { AnimationStateMachine, AnimationState } from './utils/animationState'
import { MouseInteractionHandler } from './utils/mouseInteraction'

declare global {
  interface Window {
    PIXI: typeof PIXI
  }
}

window.PIXI = PIXI

const DEFAULT_MODEL_PATH = '/models/hiyori_pro_zh/runtime/hiyori_pro_t11.model3.json'

interface AppSettings {
  modelPath: string
  windowWidth: number
  windowHeight: number
  windowX: number
  windowY: number
  wsUrl: string
  wsToken: string
  chatProvider: 'llm' | 'openclaw'
  alwaysOnTop: boolean
  llmProvider: 'minimax' | 'openai' | 'none'
  llmApiKey: string
  llmApiUrl: string
  llmModel: string
}

const settings = ref<AppSettings>({
  modelPath: DEFAULT_MODEL_PATH,
  windowWidth: 400,
  windowHeight: 500,
  windowX: 100,
  windowY: 100,
  wsUrl: 'ws://127.0.0.1:18789/',
  wsToken: '',
  chatProvider: 'openclaw',
  alwaysOnTop: true,
  llmProvider: 'none',
  llmApiKey: '',
  llmApiUrl: '',
  llmModel: '',
})

const chatPanel = ref<HTMLElement | null>(null)
const messagesContainer = ref<HTMLElement | null>(null)
const messageInput = ref<HTMLInputElement | null>(null)
const sendBtn = ref<HTMLElement | null>(null)
const closeBtn = ref<HTMLElement | null>(null)
const wsStatus = ref<HTMLElement | null>(null)
const live2dPlaceholder = ref<HTMLElement | null>(null)

let live2dApp: PIXI.Application | null = null
let live2dModel: any = null
let gwClient: GatewayClient | null = null
let lastBotMessage: HTMLElement | null = null
let stateMachine: AnimationStateMachine | null = null
let mouseHandler: MouseInteractionHandler | null = null

const messages = ref<Array<{ type: 'user' | 'bot'; content: string }>>([])
const inputMessage = ref('')
const isChatVisible = ref(false)
const wsStatusClass = ref('disconnected')
const hasModel = ref(false)

async function loadSettings(): Promise<void> {
  try {
    const saved = await invoke<string | null>('get_setting', {
      key: 'app-settings',
    })
    if (saved) {
      settings.value = { ...settings.value, ...JSON.parse(saved) }
    }
  } catch (e) {
    const saved = localStorage.getItem('nova-link-settings')
    if (saved) {
      try {
        settings.value = { ...settings.value, ...JSON.parse(saved) }
      } catch {}
    }
  }
}

async function saveSettings(): Promise<void> {
  try {
    await invoke('save_setting', {
      key: 'app-settings',
      value: JSON.stringify(settings.value),
    })
  } catch (e) {
    localStorage.setItem('nova-link-settings', JSON.stringify(settings.value))
  }
}

function connectWebSocket(): void {
  console.log('[App] Connecting to Gateway with params:', {
    url: settings.value.wsUrl,
    token: settings.value.wsToken ? '***' : '',
  })

  if (gwClient) {
    console.log('[App] Disconnecting existing Gateway client')
    gwClient.disconnect()
  }

  console.log('[App] Creating new GatewayClient...')
  gwClient = new GatewayClient({
    url: settings.value.wsUrl,
    token: settings.value.wsToken || undefined,
    onStatusChange: (status) => {
      console.log('[App] Gateway status changed:', status)
      updateWsStatus(status)
    },
    onMessage: (message) => {
      console.log('[App] Gateway message received:', message)
      if (message.role === 'assistant' && message.content[0]?.text) {
        handleIncomingMessage(
          JSON.stringify({
            type: 'message',
            content: message.content[0].text,
          }),
        )
      }
    },
    onStreamUpdate: (text) => {
      console.log('[App] Gateway stream update:', text)
      if (stateMachine) {
        stateMachine.handleBotMessage(text)
      }
      if (lastBotMessage) {
        lastBotMessage.textContent = text
      } else {
        addMessage('bot', text)
        const msgEls = document.querySelectorAll('.message.bot')
        lastBotMessage = msgEls[msgEls.length - 1] as HTMLElement
      }
    },
    onMessageStart: (payload) => {
      console.log('[App] Message start:', payload)
      if (stateMachine) {
        stateMachine.handleBotThinking()
      }
      addMessage('bot', '正在思考...')
      const msgEls = document.querySelectorAll('.message.bot')
      lastBotMessage = msgEls[msgEls.length - 1] as HTMLElement
    },
    onContentDelta: (payload) => {
      console.log('[App] Content delta:', payload.delta)
    },
    onMessageDelta: (payload) => {
      console.log('[App] Message delta:', payload)
    },
    onMessageStop: (payload) => {
      console.log('[App] Message stop:', payload)
      if (stateMachine) {
        stateMachine.handleMessageComplete()
      }
      lastBotMessage = null
    },
    onToolUse: (payload) => {
      console.log('[App] Tool use:', payload)
      addMessage('bot', `[正在调用工具: ${payload.toolName}]`)
    },
    onToolResult: (payload) => {
      console.log('[App] Tool result:', payload)
      addMessage('bot', `[工具 ${payload.toolName} 返回: ${payload.content}]`)
    },
    onConnected: (hello) => {
      console.log('[App] Gateway connected, version:', hello.server.version)
    },
    onError: (error) => {
      console.error('[App] Gateway error:', error)
      addMessage('bot', `错误: ${error}`)
      lastBotMessage = null
    },
    onDisconnected: () => {
      console.log('[App] Gateway disconnected')
    },
  })

  gwClient.connect().catch((err) => {
    console.error('Failed to connect to Gateway:', err)
  })
}

async function initLive2D(): Promise<void> {
  await nextTick()
  const canvas = document.getElementById('live2d-canvas') as HTMLCanvasElement
  const container = document.getElementById('live2d-container')

  if (!canvas || !container) return

  try {
    live2dApp = new PIXI.Application({
      view: canvas,
      width: container.clientWidth,
      height: container.clientHeight,
      backgroundAlpha: 0,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
      eventMode: 'none',
      eventFeatures: {
        global: false,
        legacy: false,
        mouse: false,
        pointer: false,
        touch: false,
      },
    })

    canvas.style.pointerEvents = 'none'

    await loadLive2DModel()

    window.addEventListener('resize', () => {
      resizeLive2D()
    })
  } catch (error) {
    console.warn('Live2D initialization failed, using placeholder:', error)
  }
}

async function loadLive2DModel(): Promise<void> {
  if (!live2dApp) return

  try {
    const modelUrl = new URL(settings.value.modelPath, window.location.origin).href

    live2dModel = await Live2DModel.from(modelUrl)

    if (live2dModel) {
      const container = document.getElementById('live2d-container')
      if (container) {
        const containerWidth = container.clientWidth
        const containerHeight = container.clientHeight

        const scale =
          Math.min(
            containerWidth / live2dModel.width,
            containerHeight / live2dModel.height,
          ) * 1.2

        live2dModel.scale.set(scale)
        live2dModel.anchor.set(0.5, 0.5)
        live2dModel.x = containerWidth / 2
        live2dModel.y = containerHeight / 2
      }

      live2dApp.stage.addChild(live2dModel)

      // 禁用 Live2D 模型的事件处理，防止与 PixiJS 内部冲突
      if (live2dModel) {
        live2dModel.eventMode = 'none'

        // 递归禁用所有子元素的事件
        if (live2dModel.children) {
          live2dModel.children.forEach((child: any) => {
            if (child && typeof child === 'object') {
              child.eventMode = 'none'
            }
          })
        }
      }

      initInteractionHandlers()

      hasModel.value = true
      console.log('Live2D model loaded successfully')
    }
  } catch (error) {
    console.warn('No Live2D model found at', settings.value.modelPath, error)
  }
}

function initInteractionHandlers(): void {
  if (!live2dModel) return

  const container = document.getElementById('live2d-container')
  if (!container) return

  stateMachine = new AnimationStateMachine(live2dModel)
  stateMachine.onStateChange((event) => {
    console.log('[App] Animation state changed:', event.oldState, '->', event.newState)
  })

  mouseHandler = new MouseInteractionHandler(live2dModel, container)

  mouseHandler.onClick((hitArea) => {
    if (stateMachine) {
      stateMachine.handleUserInteraction()
    }
    toggleChat(true)
    nextTick(() => {
      messageInput.value?.focus()
    })
  })

  mouseHandler.onDoubleClick(async (hitArea) => {
    console.log('[App] Double click on:', hitArea?.name)
    if (stateMachine) {
      await stateMachine.playMotion('Tap')
    }
  })

  mouseHandler.onHover((hitArea) => {
    console.log('[App] Hover on:', hitArea?.name)
  })

  mouseHandler.init()
  mouseHandler.enableTracking(true)

  console.log('[App] Interaction handlers initialized')
}

function resizeLive2D(): void {
  if (!live2dApp || !live2dModel) return

  const container = document.getElementById('live2d-container')
  const canvas = document.getElementById('live2d-canvas') as HTMLCanvasElement
  if (!container || !canvas) return

  const containerWidth = container.clientWidth
  const containerHeight = container.clientHeight

  canvas.width = containerWidth
  canvas.height = containerHeight

  live2dApp.renderer.resize(containerWidth, containerHeight)

  const scale =
    Math.min(
      containerWidth / live2dModel.width,
      containerHeight / live2dModel.height,
    ) * 1.2

  live2dModel.scale.set(scale)
  live2dModel.anchor.set(0.5, 0.5)
  live2dModel.x = containerWidth / 2
  live2dModel.y = containerHeight / 2
}

function onLive2DClick(): void {
  if (stateMachine) {
    stateMachine.handleUserInteraction()
  }

  toggleChat(true)
  nextTick(() => {
    messageInput.value?.focus()
  })
}

function handleClose(): void {
  closeBtn.value?.click()
}

function handleLive2DContainerClick(): void {
  toggleChat(true)
}

async function sendMessage(): Promise<void> {
  const content = inputMessage.value.trim()
  if (!content) return

  if (stateMachine) {
    stateMachine.handleUserMessage()
  }

  addMessage('user', content)
  inputMessage.value = ''

  try {
    if (settings.value.chatProvider === 'llm') {
      if (
        settings.value.llmProvider !== 'none' &&
        settings.value.llmApiKey &&
        settings.value.llmApiUrl &&
        settings.value.llmModel
      ) {
        addMessage('bot', '正在思考...')

        const response = await invoke('chat_with_llm', {
          provider: settings.value.llmProvider,
          apiKey: settings.value.llmApiKey,
          apiUrl: settings.value.llmApiUrl,
          model: settings.value.llmModel,
          message: content,
        })

        const msgEls = document.querySelectorAll('.message.bot')
        const lastBotMsg = msgEls[msgEls.length - 1]
        if (lastBotMsg && lastBotMsg.textContent === '正在思考...') {
          lastBotMsg.textContent = response as string
        } else {
          addMessage('bot', response as string)
        }
      } else {
        addMessage('bot', '未配置 LLM。请在设置中配置 LLM API。')
      }
    } else {
      console.log('[App] Chat provider is openclaw, checking connection...')
      if (gwClient && gwClient.isConnected) {
        console.log('[App] Sending message via Gateway:', content)
        await gwClient.sendMessage({ message: content })
        console.log('[App] Message sent successfully')
      } else {
        console.log(
          '[App] Gateway not connected, isConnected:',
          gwClient?.isConnected,
        )
        addMessage(
          'bot',
          '未连接到 Gateway 服务。请在设置中配置 WebSocket 地址并确保服务正在运行。',
        )
      }
    }
  } catch (e) {
    console.error('Failed to send message:', e)
    addMessage(`bot`, `发送失败: ${e}`)
  }
}

function handleKeyPress(e: KeyboardEvent): void {
  if (e.key === 'Enter') {
    sendMessage()
  }
}

function handleDocumentClick(e: MouseEvent): void {
  const target = e.target as HTMLElement
  const isClickInside =
    target.closest('#chat-panel') || target.closest('#live2d-container')

  if (
    !isClickInside &&
    chatPanel.value &&
    !chatPanel.value.classList.contains('hidden')
  ) {
    toggleChat(false)
  }
}

function showSettingsModal(): void {
  const existing = document.getElementById('settings-modal')
  if (existing) existing.remove()

  const modal = document.createElement('div')
  modal.id = 'settings-modal'
  modal.style.cssText = `
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2000;
  `

  const content = document.createElement('div')
  content.style.cssText = `
    background: rgba(15, 23, 42, 0.98);
    border-radius: 16px;
    padding: 24px;
    width: 360px;
    max-width: 90vw;
    max-height: 80vh;
    overflow-y: auto;
  `

  content.innerHTML = `
    <h3 style="margin: 0 0 16px; color: #e2e8f0; font-size: 16px;">设置</h3>
    <div style="margin-bottom: 12px;">
      <label style="display: block; color: #94a3b8; font-size: 12px; margin-bottom: 4px;">模型路径</label>
      <input type="text" id="setting-model-path" value="${settings.value.modelPath}" 
        style="width: 100%; padding: 8px; border: none; border-radius: 8px; background: rgba(255,255,255,0.1); color: #e2e8f0; font-size: 13px;">
    </div>
    <div style="display: flex; gap: 8px; margin-bottom: 12px;">
      <div style="flex: 1;">
        <label style="display: block; color: #94a3b8; font-size: 12px; margin-bottom: 4px;">宽度</label>
        <input type="number" id="setting-width" value="${settings.value.windowWidth}" 
          style="width: 100%; padding: 8px; border: none; border-radius: 8px; background: rgba(255,255,255,0.1); color: #e2e8f0; font-size: 13px;">
      </div>
      <div style="flex: 1;">
        <label style="display: block; color: #94a3b8; font-size: 12px; margin-bottom: 4px;">高度</label>
        <input type="number" id="setting-height" value="${settings.value.windowHeight}" 
          style="width: 100%; padding: 8px; border: none; border-radius: 8px; background: rgba(255,255,255,0.1); color: #e2e8f0; font-size: 13px;">
      </div>
    </div>
    <div style="margin-bottom: 12px;">
      <label style="display: block; color: #94a3b8; font-size: 12px; margin-bottom: 4px;">WebSocket 地址</label>
      <input type="text" id="setting-ws-url" value="${settings.value.wsUrl}" 
        style="width: 100%; padding: 8px; border: none; border-radius: 8px; background: rgba(255,255,255,0.1); color: #e2e8f0; font-size: 13px;">
    </div>
    <div style="margin-bottom: 12px;">
      <label style="display: block; color: #94a3b8; font-size: 12px; margin-bottom: 4px;">WebSocket Token (可选)</label>
      <input type="password" id="setting-ws-token" value="${settings.value.wsToken}" 
        style="width: 100%; padding: 8px; border: none; border-radius: 8px; background: rgba(255,255,255,0.1); color: #e2e8f0; font-size: 13px;">
    </div>
    <div style="margin-bottom: 12px;">
      <label style="display: block; color: #94a3b8; font-size: 12px; margin-bottom: 8px;">聊天服务</label>
      <div style="display: flex; gap: 8px;">
        <button type="button" id="btn-provider-openclaw" style="
          flex: 1;
          padding: 8px 12px;
          border: none;
          border-radius: 8px;
          background: ${settings.value.chatProvider === 'openclaw' ? 'linear-gradient(135deg, #22d3ee, #3b82f6)' : 'rgba(255,255,255,0.1)'};
          color: #e2e8f0;
          cursor: pointer;
          font-size: 13px;
        ">OpenClaw</button>
        <button type="button" id="btn-provider-llm" style="
          flex: 1;
          padding: 8px 12px;
          border: none;
          border-radius: 8px;
          background: ${settings.value.chatProvider === 'llm' ? 'linear-gradient(135deg, #22d3ee, #3b82f6)' : 'rgba(255,255,255,0.1)'};
          color: #e2e8f0;
          cursor: pointer;
          font-size: 13px;
        ">LLM</button>
      </div>
    </div>
    <hr style="border: none; border-top: 1px solid rgba(255,255,255,0.1); margin: 16px 0;">
    <h4 style="margin: 0 0 12px; color: #e2e8f0; font-size: 14px;">大模型聊天设置</h4>
    <div style="margin-bottom: 12px;">
      <label style="display: block; color: #94a3b8; font-size: 12px; margin-bottom: 4px;">API 提供商</label>
      <select id="setting-llm-provider" style="width: 100%; padding: 8px; border: none; border-radius: 8px; background: rgba(255,255,255,0.1); color: #e2e8f0; font-size: 13px;">
        <option value="none" ${settings.value.llmProvider === 'none' ? 'selected' : ''}>不使用</option>
        <option value="minimax" ${settings.value.llmProvider === 'minimax' ? 'selected' : ''}>MiniMax</option>
        <option value="openai" ${settings.value.llmProvider === 'openai' ? 'selected' : ''}>OpenAI 兼容</option>
      </select>
    </div>
    <div style="margin-bottom: 12px;">
      <label style="display: block; color: #94a3b8; font-size: 12px; margin-bottom: 4px;">API Key</label>
      <input type="password" id="setting-llm-api-key" value="${settings.value.llmApiKey}" 
        style="width: 100%; padding: 8px; border: none; border-radius: 8px; background: rgba(255,255,255,0.1); color: #e2e8f0; font-size: 13px;">
    </div>
    <div style="margin-bottom: 12px;">
      <label style="display: block; color: #94a3b8; font-size: 12px; margin-bottom: 4px;">API 地址</label>
      <input type="text" id="setting-llm-api-url" value="${settings.value.llmApiUrl}" placeholder="https://api.minimax.chat/v1/text/chatcompletion_v2"
        style="width: 100%; padding: 8px; border: none; border-radius: 8px; background: rgba(255,255,255,0.1); color: #e2e8f0; font-size: 13px;">
    </div>
    <div style="margin-bottom: 12px;">
      <label style="display: block; color: #94a3b8; font-size: 12px; margin-bottom: 4px;">模型名称</label>
      <input type="text" id="setting-llm-model" value="${settings.value.llmModel}" placeholder="abab6.5s-chat"
        style="width: 100%; padding: 8px; border: none; border-radius: 8px; background: rgba(255,255,255,0.1); color: #e2e8f0; font-size: 13px;">
    </div>
    <div style="display: flex; justify-content: flex-end; gap: 8px;">
      <button id="setting-cancel" style="padding: 8px 16px; border: none; border-radius: 8px; background: rgba(255,255,255,0.1); color: #e2e8f0; cursor: pointer;">取消</button>
      <button id="setting-save" style="padding: 8px 16px; border: none; border-radius: 8px; background: linear-gradient(135deg, #22d3ee, #3b82f6); color: white; cursor: pointer;">保存</button>
    </div>
  `

  modal.appendChild(content)
  document.body.appendChild(modal)

  const btnOpenclaw = document.getElementById('btn-provider-openclaw') as HTMLButtonElement | null
  const btnLlm = document.getElementById('btn-provider-llm') as HTMLButtonElement | null
  const wsUrlInput = document.getElementById('setting-ws-url') as HTMLInputElement | null
  const wsTokenInput = document.getElementById('setting-ws-token') as HTMLInputElement | null
  const llmProviderSelect = document.getElementById('setting-llm-provider') as HTMLSelectElement | null
  const llmApiKeyInput = document.getElementById('setting-llm-api-key') as HTMLInputElement | null
  const llmApiUrlInput = document.getElementById('setting-llm-api-url') as HTMLInputElement | null
  const llmModelInput = document.getElementById('setting-llm-model') as HTMLInputElement | null

  let chatProvider: 'llm' | 'openclaw' = settings.value.chatProvider

  function updateProviderUI() {
    if (chatProvider === 'openclaw') {
      btnOpenclaw && (btnOpenclaw.style.background = 'linear-gradient(135deg, #22d3ee, #3b82f6)')
      btnLlm && (btnLlm.style.background = 'rgba(255,255,255,0.1)')
      wsUrlInput && (wsUrlInput.disabled = false)
      wsTokenInput && (wsTokenInput.disabled = false)
      llmProviderSelect && (llmProviderSelect.disabled = true)
      llmApiKeyInput && (llmApiKeyInput.disabled = true)
      llmApiUrlInput && (llmApiUrlInput.disabled = true)
      llmModelInput && (llmModelInput.disabled = true)
    } else {
      btnOpenclaw && (btnOpenclaw.style.background = 'rgba(255,255,255,0.1)')
      btnLlm && (btnLlm.style.background = 'linear-gradient(135deg, #22d3ee, #3b82f6)')
      wsUrlInput && (wsUrlInput.disabled = true)
      wsTokenInput && (wsTokenInput.disabled = true)
      llmProviderSelect && (llmProviderSelect.disabled = false)
      llmApiKeyInput && (llmApiKeyInput.disabled = false)
      llmApiUrlInput && (llmApiUrlInput.disabled = false)
      llmModelInput && (llmModelInput.disabled = false)
    }
  }

  btnOpenclaw?.addEventListener('click', () => {
    chatProvider = 'openclaw'
    updateProviderUI()
  })
  btnLlm?.addEventListener('click', () => {
    chatProvider = 'llm'
    updateProviderUI()
  })

  updateProviderUI()

  document.getElementById('setting-cancel')?.addEventListener('click', () => modal.remove())
  document.getElementById('setting-save')?.addEventListener('click', async () => {
    const modelPath = (document.getElementById('setting-model-path') as HTMLInputElement).value
    const width = parseInt((document.getElementById('setting-width') as HTMLInputElement).value)
    const height = parseInt((document.getElementById('setting-height') as HTMLInputElement).value)
    const wsUrl = (document.getElementById('setting-ws-url') as HTMLInputElement).value
    const wsToken = (document.getElementById('setting-ws-token') as HTMLInputElement).value

    const llmProvider = (document.getElementById('setting-llm-provider') as HTMLSelectElement).value as AppSettings['llmProvider']
    const llmApiKey = (document.getElementById('setting-llm-api-key') as HTMLInputElement).value
    const llmApiUrl = (document.getElementById('setting-llm-api-url') as HTMLInputElement).value
    const llmModel = (document.getElementById('setting-llm-model') as HTMLInputElement).value

    settings.value.modelPath = modelPath
    settings.value.windowWidth = width
    settings.value.windowHeight = height
    settings.value.wsUrl = wsUrl
    settings.value.wsToken = wsToken
    settings.value.chatProvider = chatProvider
    settings.value.llmProvider = llmProvider
    settings.value.llmApiKey = llmApiKey
    settings.value.llmApiUrl = llmApiUrl
    settings.value.llmModel = llmModel

    try {
      const win = await getCurrentWindow()
      const position = await win.outerPosition()
      settings.value.windowX = position.x
      settings.value.windowY = position.y
    } catch (e) {
      console.error('[App] Failed to get window position:', e)
    }

    await saveSettings()

    invoke('update_llm_config', {
      provider: llmProvider,
      apiKey: llmApiKey,
      apiUrl: llmApiUrl,
      model: llmModel,
    })

    const win = await getCurrentWindow()
    await win.setSize(new LogicalSize(width, height))

    resizeLive2D()

    modal.remove()
    reloadModel()
    connectWebSocket()
  })
}

async function reloadModel(): Promise<void> {
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

    if (live2dApp.stage) {
      live2dApp.stage.removeAllListeners()
      ;(live2dApp.stage as any).eventMode = 'none'
    }

    const renderer = live2dApp.renderer as any
    if (renderer && renderer.events) {
      renderer.events.cursorStyles = {}
      renderer.events.trackedPointers = {}
    }
  }
  await loadLive2DModel()
}

async function toggleAlwaysOnTop(): Promise<void> {
  const win = await getCurrentWindow()
  settings.value.alwaysOnTop = !settings.value.alwaysOnTop
  await win.setAlwaysOnTop(settings.value.alwaysOnTop)
  await saveSettings()
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
    console.error('[App] Failed to save window position/size:', e)
  }

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

    if (live2dApp.stage) {
      live2dApp.stage.removeAllListeners()
      ;(live2dApp.stage as any).eventMode = 'none'
    }

    const renderer = live2dApp.renderer as any
    if (renderer && renderer.events) {
      renderer.events.cursorStyles = {}
      renderer.events.trackedPointers = {}
    }
  }
  if (live2dApp) {
    await live2dApp.destroy(true)
    live2dApp = null
  }
  const win = await getCurrentWindow()
  await win.close()
}

function updateWsStatus(status: string): void {
  wsStatusClass.value = status
}

function handleIncomingMessage(payload: string): void {
  try {
    const data = JSON.parse(payload)
    if (data.type === 'message' && data.content) {
      if (stateMachine) {
        stateMachine.handleBotMessage(data.content)
      }
      addMessage('bot', data.content)
    }
  } catch (e) {
    if (stateMachine) {
      stateMachine.handleBotMessage(payload)
    }
    addMessage('bot', payload)
  }
}

function addMessage(type: 'user' | 'bot', content: string): void {
  messages.value.push({ type, content })

  nextTick(() => {
    const container = messagesContainer.value
    if (container) {
      container.scrollTop = container.scrollHeight
    }

    if (chatPanel.value?.classList.contains('hidden')) {
      toggleChat(true)
    }
  })
}

function toggleChat(show: boolean): void {
  isChatVisible.value = show
  if (show) {
    nextTick(() => {
      messageInput.value?.focus()
    })
  }
}

function setupContextMenu(e: MouseEvent): void {
  e.preventDefault()

  const existingMenu = document.getElementById('context-menu')
  if (existingMenu) {
    existingMenu.remove()
  }

  const menu = document.createElement('div')
  menu.id = 'context-menu'
  menu.style.cssText = `
    position: fixed;
    left: ${e.clientX}px;
    top: ${e.clientY}px;
    background: rgba(15, 23, 42, 0.95);
    border-radius: 8px;
    padding: 4px 0;
    min-width: 150px;
    z-index: 1000;
    box-shadow: 0 4px 20px rgba(0,0,0,0.5);
  `

  const items = [
    { label: '设置', action: () => showSettingsModal() },
    { label: '重载模型', action: () => reloadModel() },
    { label: '置顶', action: () => toggleAlwaysOnTop() },
    { label: '最小化', action: () => minimizeWindow() },
    { label: '关闭', action: () => closeWindow() },
  ]

  items.forEach((item) => {
    const menuItem = document.createElement('div')
    menuItem.textContent = item.label
    menuItem.style.cssText = `
      padding: 8px 16px;
      cursor: pointer;
      color: #e2e8f0;
      font-size: 13px;
    `
    menuItem.addEventListener('mouseenter', () => {
      menuItem.style.background = 'rgba(56, 189, 248, 0.3)'
    })
    menuItem.addEventListener('mouseleave', () => {
      menuItem.style.background = 'transparent'
    })
    menuItem.addEventListener('click', () => {
      item.action()
      menu.remove()
    })
    menu.appendChild(menuItem)
  })

  document.body.appendChild(menu)

  setTimeout(() => {
    document.addEventListener('click', () => menu.remove(), { once: true })
  }, 0)
}

async function setupTauriListeners(): Promise<void> {
  await listen('ws-status', (event) => {
    const status = event.payload as string
    updateWsStatus(status)
  })

  await listen('nova-link-message', (event) => {
    const payload = event.payload as string
    console.log('[nova-link-message]', payload)
    handleIncomingMessage(payload)
  })
}

watch(() => messages.value.length, () => {
  nextTick(() => {
    const container = messagesContainer.value
    if (container) {
      container.scrollTop = container.scrollHeight
    }
  })
})

onMounted(async () => {
  await loadSettings()

  try {
    const win = await getCurrentWindow()
    if (settings.value.windowWidth && settings.value.windowHeight) {
      await win.setSize(new LogicalSize(settings.value.windowWidth, settings.value.windowHeight))
    }
    if (settings.value.windowX !== undefined && settings.value.windowY !== undefined) {
      await win.setPosition(new LogicalPosition(settings.value.windowX, settings.value.windowY))
    }
  } catch (e) {
    console.error('[App] Failed to restore window position/size:', e)
  }

  chatPanel.value = document.getElementById('chat-panel')
  messagesContainer.value = document.getElementById('messages')
  messageInput.value = document.getElementById('message-input') as HTMLInputElement
  sendBtn.value = document.getElementById('send-btn')
  closeBtn.value = document.getElementById('close-btn')
  wsStatus.value = document.getElementById('ws-status')
  live2dPlaceholder.value = document.getElementById('live2d-placeholder')

  closeBtn.value?.addEventListener('click', async () => {
    const win = await getCurrentWindow()
    await win.close()
  })

  const dragRegion = document.getElementById('drag-region')
  if (dragRegion) {
    console.log('[App] Drag region found, attaching events')
    dragRegion.addEventListener('mousedown', async (e) => {
      console.log('[App] Drag mousedown event:', e.button)
      if (e.button === 0) {
        try {
          const win = await getCurrentWindow()
          console.log('[App] Starting drag...')
          await win.startDragging()
          console.log('[App] Drag started')
        } catch (err) {
          console.error('[App] Drag error:', err)
        }
      }
    })
  } else {
    console.error('[App] Drag region not found!')
  }

  live2dPlaceholder.value?.addEventListener('click', () => {
    toggleChat(true)
  })

  sendBtn.value?.addEventListener('click', sendMessage)

  document.addEventListener('contextmenu', setupContextMenu)
  document.addEventListener('click', handleDocumentClick)

  await setupTauriListeners()

  connectWebSocket()

  await initLive2D()

  console.log('Nova Link initialized')
})
</script>

<template>
  <div id="app">
    <div id="drag-region"></div>
    <button id="close-btn" @click="handleClose">×</button>

    <div id="live2d-container" :class="{ 'has-model': hasModel }" @click="handleLive2DContainerClick">
      <canvas id="live2d-canvas"></canvas>
      <div id="live2d-placeholder">Click to chat</div>
    </div>

    <div id="status-indicator">
      <span id="ws-status" class="status" :class="wsStatusClass">●</span>
    </div>

    <div id="chat-panel" :class="{ hidden: !isChatVisible }">
      <div id="messages" ref="messagesContainer">
        <div
          v-for="(msg, index) in messages"
          :key="index"
          class="message"
          :class="msg.type"
        >
          {{ msg.content }}
        </div>
      </div>

      <div id="input-area">
        <input
          id="message-input"
          v-model="inputMessage"
          type="text"
          placeholder="Type a message..."
          autocomplete="off"
          @keypress="handleKeyPress"
        />
        <button id="send-btn">Send</button>
      </div>
    </div>
  </div>
</template>
