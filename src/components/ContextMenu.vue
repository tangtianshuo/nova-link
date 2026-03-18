<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch, computed } from "vue"

const props = defineProps<{
  visible: boolean
  x: number
  y: number
  availableMotions?: string[]  // 模型可用的动画组
}>()

// 菜单元件的引用（用于获取实际尺寸）
const menuRef = ref<HTMLElement | null>(null)

// 计算菜单位置（避免超出边界）
const menuStyle = computed(() => {
  let left = props.x
  let top = props.y

  // 获取窗口尺寸
  const windowWidth = window.innerWidth
  const windowHeight = window.innerHeight

  // 获取菜单实际尺寸（如果已渲染）
  const menuWidth = menuRef.value?.offsetWidth || 180
  const menuHeight = menuRef.value?.offsetHeight || 400

  // 如果右边空间不足，显示在左边
  if (left + menuWidth > windowWidth - 10) {
    left = Math.max(10, windowWidth - menuWidth - 10)
  }

  // 如果底部空间不足，显示在上方
  if (top + menuHeight > windowHeight - 10) {
    top = Math.max(10, windowHeight - menuHeight - 10)
  }

  return {
    left: `${left}px`,
    top: `${top}px`,
  }
})

const emit = defineEmits<{
  close: []
  settings: []
  checkUpdates: []
  reloadModel: []
  toggleAlwaysOnTop: []
  minimize: []
  closeWindow: []
  resetWindowSize: []
  previewState: [state: string]
  previewMotion: [motion: string]
  resetToIdle: []
  runGateway: []
  reconnectWs: []
  clearChatHistory: []
}>()

// 开发环境标识
const isDev = ref(import.meta.env.DEV)

// 动画状态列表（已移除情绪相关状态）
const animationStates = [
  { label: "IDLE (待机)", value: "IDLE" },
  { label: "GREETING (问候)", value: "GREETING" },
  { label: "TALKING (说话)", value: "TALKING" },
  { label: "LISTENING (倾听)", value: "LISTENING" },
  { label: "THINKING (思考)", value: "THINKING" },
  { label: "SLEEPING (睡觉)", value: "SLEEPING" },
]

// 动态获取的动作列表（基于模型可用动画组）
const motionGroups = computed(() => {
  if (props.availableMotions && props.availableMotions.length > 0) {
    return props.availableMotions.map(motion => ({
      label: motion,
      value: motion
    }))
  }
  // 默认动作列表
  return [
    { label: "Idle (待机)", value: "Idle" },
    { label: "TapBody (点击身体)", value: "TapBody" },
    { label: "TapLeft (点击左侧)", value: "TapLeft" },
    { label: "TapRight (点击右侧)", value: "TapRight" },
  ]
})

// 显示可用动画组的调试信息
const showMotionInfo = ref(false)

const showDebugSubmenu = ref(false)
const showStateSubmenu = ref(false)
const showMotionSubmenu = ref(false)

function toggleMotionInfo() {
  showMotionInfo.value = !showMotionInfo.value
}

function handleClick(item: string) {
  switch (item) {
    case "settings":
      emit("settings")
      break
    case "checkUpdates":
      emit("checkUpdates")
      break
    case "reloadModel":
      emit("reloadModel")
      break
    case "toggleAlwaysOnTop":
      emit("toggleAlwaysOnTop")
      break
    case "minimize":
      emit("minimize")
      break
    case "close":
      emit("closeWindow")
      break
    case "resetWindowSize":
      emit("resetWindowSize")
      break
    case "resetToIdle":
      emit("resetToIdle")
      break
    case "reconnectWs":
      emit("reconnectWs")
      break
    case "clearChatHistory":
      emit("clearChatHistory")
      break
  }
  emit("close")
}

function handleStateClick(state: string) {
  emit("previewState", state)
  showStateSubmenu.value = false
  showDebugSubmenu.value = false
  emit("close")
}

function handleMotionClick(motion: string) {
  emit("previewMotion", motion)
  showMotionSubmenu.value = false
  showDebugSubmenu.value = false
  emit("close")
}

function toggleDebugMenu() {
  showDebugSubmenu.value = !showDebugSubmenu.value
  showStateSubmenu.value = false
  showMotionSubmenu.value = false
}

function toggleStateMenu() {
  showStateSubmenu.value = !showStateSubmenu.value
  showMotionSubmenu.value = false
}

function toggleMotionMenu() {
  showMotionSubmenu.value = !showMotionSubmenu.value
  showStateSubmenu.value = false
}

function handleDocumentClick() {
  emit("close")
}

// 监听 visible 变化，点击外部时关闭菜单
watch(
  () => props.visible,
  (newVal) => {
    if (newVal) {
      // 显示菜单时，延迟添加点击监听器，确保当前点击不触发关闭
      setTimeout(() => {
        document.addEventListener("click", handleDocumentClick, { once: true })
      }, 0)
    } else {
      // 隐藏菜单时，移除点击监听器
      document.removeEventListener("click", handleDocumentClick)
    }
  },
)

onMounted(() => {
  if (props.visible) {
    setTimeout(() => {
      document.addEventListener("click", handleDocumentClick, { once: true })
    }, 0)
  }
})

onUnmounted(() => {
  document.removeEventListener("click", handleDocumentClick)
})
</script>

<template>
  <Teleport to="body">
    <div
      v-if="visible"
      id="context-menu"
      ref="menuRef"
      class="context-menu"
      :style="menuStyle"
    >
      <div
        class="menu-item"
        @click="handleClick('settings')"
      >
        设置
      </div>
      <div
        class="menu-item"
        @click="handleClick('checkUpdates')"
      >
        检查更新
      </div>
      <div
        class="menu-item"
        @click="handleClick('reloadModel')"
      >
        重载模型
      </div>
      <div
        class="menu-item"
        @click="handleClick('toggleAlwaysOnTop')"
      >
        置顶
      </div>
      <div
        class="menu-item"
        @click="handleClick('minimize')"
      >
        最小化
      </div>
      <div
        class="menu-item"
        @click="handleClick('close')"
      >
        关闭
      </div>
      <div
        class="menu-item"
        @click="handleClick('clearChatHistory')"
      >
        清除聊天历史
      </div>

      <!-- 启动 Gateway 和 Debug (仅开发环境显示) -->
      <template v-if="isDev">
        <div class="menu-divider"></div>
        <div
          class="menu-item"
          @click="handleClick('reconnectWs')"
        >
          重连 WebSocket
        </div>
        <div
          class="menu-item"
          @click="handleClick('runGateway')"
        >
          启动 Gateway
        </div>
        <div class="menu-divider"></div>
        <div class="menu-item has-submenu" @click.stop="toggleDebugMenu">
          Debug ▼
        </div>
        <div v-if="showDebugSubmenu">
          <div class="menu-item submenu-item" @click.stop="handleClick('resetWindowSize')">
            重置窗体大小
          </div>
          <div class="menu-item submenu-item" @click.stop="handleClick('resetToIdle')">
            重置为待机
          </div>
          <!-- 显示可用动画组 -->
          <div class="menu-item has-submenu submenu-item" @click.stop="toggleMotionInfo">
            可用动画组 ▼
          </div>
          <div v-if="showMotionInfo" class="motion-info-box">
            <div v-if="availableMotions && availableMotions.length > 0">
              <div v-for="motion in availableMotions" :key="motion" class="motion-info-item">
                {{ motion }}
              </div>
            </div>
            <div v-else class="motion-info-empty">
              未加载模型
            </div>
          </div>
          <div class="menu-item has-submenu submenu-item" @click.stop="toggleStateMenu">
            动画状态 ►
          </div>
          <div v-if="showStateSubmenu">
            <div
              v-for="state in animationStates"
              :key="state.value"
              class="menu-item submenu-item submenu-item-end"
              @click="handleStateClick(state.value)"
            >
              {{ state.label }}
            </div>
          </div>
          <div class="menu-item has-submenu submenu-item" @click.stop="toggleMotionMenu">
            播放动作 ►
          </div>
          <div v-if="showMotionSubmenu">
            <div
              v-for="motion in motionGroups"
              :key="motion.value"
              class="menu-item submenu-item submenu-item-end"
              @click="handleMotionClick(motion.value)"
            >
              {{ motion.label }}
            </div>
          </div>
        </div>
      </template>
    </div>
  </Teleport>
</template>

<style scoped>
.context-menu {
  position: fixed;
  background: rgba(15, 23, 42, 0.95);
  border-radius: 8px;
  padding: 4px 0;
  min-width: 150px;
  z-index: 1000;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
}

.menu-item {
  padding: 8px 16px;
  cursor: pointer;
  color: #e2e8f0;
  font-size: 13px;
  transition: background 0.15s;
}

.menu-item:hover {
  background: rgba(56, 189, 248, 0.3);
}

.menu-divider {
  height: 1px;
  background: rgba(255, 255, 255, 0.1);
  margin: 4px 0;
}

.submenu-item {
  padding-left: 24px;
}

.submenu-item-end {
  padding-left: 32px;
}

.has-submenu {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.motion-info-box {
  background: rgba(0, 0, 0, 0.3);
  margin: 4px 8px;
  padding: 6px 8px;
  border-radius: 4px;
  max-height: 120px;
  overflow-y: auto;
}

.motion-info-item {
  font-size: 11px;
  color: #94a3b8;
  padding: 2px 0;
  font-family: monospace;
}

.motion-info-empty {
  font-size: 11px;
  color: #64748b;
  font-style: italic;
}
</style>
