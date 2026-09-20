<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, shallowRef, useTemplateRef } from 'vue'
import { HugeiconsIcon } from '@hugeicons/vue'
import {
  Layout2ColumnIcon,
  Layout2RowIcon,
  RotateLeft01Icon,
  PlayIcon,
  StopIcon,
  Cancel01Icon,
} from '@hugeicons/core-free-icons'
import { usePlayground } from '../../composables/usePlayground'
import RequestEditor from './RequestEditor.vue'
import ResponsePanel from './ResponsePanel.vue'
import ExamplesPanel from './ExamplesPanel.vue'
import ModelDownloadDialog from './ModelDownloadDialog.vue'

const {
  stateText,
  stateMode,
  questionsText,
  language,
  availability,
  phase,
  progress,
  error,
  notice,
  evaluation,
  history,
  busy,
  supported,
  inputEmpty,
  validation,
  stale,
  canRun,
  run,
  cancel,
  selectExample,
  loadHistory,
  addQuestion,
  setStateMode,
  formatQuestions,
  clear,
} = usePlayground()
const stacked = shallowRef(false)
const split = shallowRef(50)
const dragging = shallowRef(false)
const workspace = useTemplateRef<HTMLDivElement>('workspace')
const questionCount = computed(() => Object.keys(validation.value.request?.questions ?? {}).length)
const splitStyle = computed(() =>
  stacked.value
    ? {}
    : { gridTemplateColumns: `minmax(0, ${split.value}fr) 7px minmax(0, ${100 - split.value}fr)` },
)
const availabilityMessage = computed(() => {
  if (availability.value === 'checking') return '正在检查浏览器支持…'
  if (availability.value === 'unsupported')
    return '当前浏览器不支持 Prompt API。需要使用桌面版 Chrome 148 或更高版本。'
  return '当前设备无法使用本地模型。需要使用桌面版 Chrome 148 或更高版本。'
})
function resize(event: PointerEvent) {
  if (!dragging.value || !workspace.value || stacked.value) return
  const rect = workspace.value.getBoundingClientRect()
  split.value = Math.max(32, Math.min(68, ((event.clientX - rect.left) / rect.width) * 100))
}
function startResize(event: PointerEvent) {
  dragging.value = true
  ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
}
function keyboardResize(event: KeyboardEvent) {
  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
    event.preventDefault()
    split.value = Math.max(32, Math.min(68, split.value + (event.key === 'ArrowRight' ? 2 : -2)))
  }
}
function shortcut(event: KeyboardEvent) {
  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
    event.preventDefault()
    void run()
  }
}
function selectHistory(event: Event) {
  const select = event.target as HTMLSelectElement
  const item = history.value[Number(select.value)]
  if (item) loadHistory(item)
  select.value = ''
}
onMounted(() => window.addEventListener('keydown', shortcut))
onBeforeUnmount(() => window.removeEventListener('keydown', shortcut))
</script>

<template>
  <div class="app-shell">
    <header class="topbar">
      <h1>BrowserJev</h1>
      <div v-if="supported" class="toolbar-actions">
        <select
          v-if="history.length"
          class="history-select"
          aria-label="历史记录"
          :disabled="busy"
          value=""
          @change="selectHistory"
        >
          <option disabled value="">历史记录</option>
          <option v-for="(item, index) in history" :key="item.createdAt" :value="index">
            {{ new Date(item.createdAt).toLocaleString() }} ·
            {{ Object.keys(item.request.questions).join(', ') }}
          </option>
        </select>
        <button class="text-button" :disabled="busy" @click="clear">
          <HugeiconsIcon :icon="RotateLeft01Icon" :size="13" aria-hidden="true" />清空
        </button>
        <div class="segmented layout-switch">
          <button
            :aria-pressed="!stacked"
            title="左右布局"
            aria-label="左右布局"
            @click="stacked = false"
          >
            <HugeiconsIcon :icon="Layout2ColumnIcon" :size="14" aria-hidden="true" />
          </button>
          <button
            :aria-pressed="stacked"
            title="上下布局"
            aria-label="上下布局"
            @click="stacked = true"
          >
            <HugeiconsIcon :icon="Layout2RowIcon" :size="14" aria-hidden="true" />
          </button>
        </div>
      </div>
    </header>
    <main class="main">
      <div v-if="error" class="error-banner" role="alert">
        <span>{{ error }}</span>
        <button class="icon-button" aria-label="关闭错误提示" @click="error = ''">
          <HugeiconsIcon :icon="Cancel01Icon" :size="14" aria-hidden="true" />
        </button>
      </div>
      <div v-if="!supported" class="unavailable" role="status">
        <p>{{ availabilityMessage }}</p>
      </div>
      <div v-else ref="workspace" :class="['workspace', { stacked, dragging }]" :style="splitStyle">
        <div class="request-pane">
          <RequestEditor
            v-model:state="stateText"
            v-model:questions="questionsText"
            :state-mode="stateMode"
            :disabled="busy"
            :validation-error="inputEmpty ? '' : validation.error"
            :question-count="questionCount"
            @mode="setStateMode"
            @add="addQuestion"
            @format="formatQuestions"
          />
          <footer class="run-bar">
            <label class="language-select"
              >输入语言
              <select v-model="language" :disabled="busy">
                <option value="en">English</option>
                <option value="ja">日本語</option>
                <option value="es">Español</option>
                <option value="de">Deutsch</option>
                <option value="fr">Français</option>
              </select>
            </label>
            <button v-if="phase === 'running'" class="button primary run-button" @click="cancel">
              <HugeiconsIcon :icon="StopIcon" :size="13" aria-hidden="true" />停止运行
            </button>
            <button
              v-else
              class="button primary run-button"
              :disabled="!canRun"
              :title="validation.error || 'Ctrl / ⌘ + Enter'"
              @click="run"
            >
              <HugeiconsIcon :icon="PlayIcon" :size="14" aria-hidden="true" />运行请求<kbd
                >Ctrl ↵</kbd
              >
            </button>
          </footer>
        </div>
        <div
          v-if="!stacked"
          class="resizer"
          role="separator"
          aria-label="调整输入和结果面板宽度"
          aria-orientation="vertical"
          :aria-valuenow="Math.round(split)"
          :aria-valuemin="32"
          :aria-valuemax="68"
          tabindex="0"
          @pointerdown="startResize"
          @pointermove="resize"
          @pointerup="dragging = false"
          @pointercancel="dragging = false"
          @lostpointercapture="dragging = false"
          @keydown="keyboardResize"
        >
          <span />
        </div>
        <div class="response-pane">
          <ExamplesPanel v-if="inputEmpty" :disabled="busy" @select="selectExample" />
          <ResponsePanel
            v-else
            :evaluation="evaluation"
            :request="validation.request"
            :running="phase === 'running'"
            :stale="stale"
            @notice="notice = $event"
          />
        </div>
      </div>
    </main>
    <div v-if="notice" class="toast" role="status">
      <span>{{ notice }}</span
      ><button class="icon-button" aria-label="关闭通知" @click="notice = ''">
        <HugeiconsIcon :icon="Cancel01Icon" :size="13" aria-hidden="true" />
      </button>
    </div>
    <ModelDownloadDialog
      :open="phase === 'initializing'"
      :progress="progress"
      :downloading="availability !== 'available'"
      @cancel="cancel"
    />
  </div>
</template>

<style scoped>
.app-shell {
  display: flex;
  flex-direction: column;
  height: 100dvh;
  min-height: 620px;
}
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 22px;
  background: #fff;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}
.topbar h1 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  letter-spacing: -0.4px;
}
.toolbar-actions {
  display: flex;
  align-items: center;
  gap: 14px;
}
.history-select {
  max-width: 120px;
  border: 0;
  background: transparent;
  color: #63718a;
  font-size: 11px;
}
.layout-switch button {
  padding: 5px 7px;
}
.main {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  padding: 18px;
  overflow: auto;
}
.workspace {
  flex: 1;
  min-height: 490px;
  display: grid;
  border: 1px solid var(--border);
  border-radius: 8px;
  overflow: hidden;
  background: #fff;
}
.request-pane,
.response-pane {
  min-width: 0;
  min-height: 0;
}
.request-pane {
  display: flex;
  flex-direction: column;
}
.request-pane :deep(.request-editor) {
  flex: 1;
  height: auto;
}
.resizer {
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: col-resize;
  background: #f8fafd;
  border-inline: 1px solid var(--border);
  touch-action: none;
}
.resizer span {
  width: 2px;
  height: 25px;
  background: #d0d9e8;
  border-radius: 3px;
}
.resizer:hover,
.resizer:focus-visible {
  background: #e4ecfd;
}
.dragging {
  cursor: col-resize;
  user-select: none;
}
.run-bar {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  padding: 12px 18px;
  border-top: 1px solid var(--border);
  flex-shrink: 0;
}
.language-select {
  color: #6d7990;
  font-size: 10px;
  display: flex;
  align-items: center;
  gap: 6px;
}
.language-select select {
  border: 0;
  background: transparent;
  color: var(--ink);
  min-width: 0;
  font-size: 11px;
}
.run-button {
  justify-content: center;
  padding: 10px 14px;
}
.run-button kbd {
  font: inherit;
  font-size: 9px;
  margin-left: 5px;
  padding-left: 9px;
  border-left: 1px solid #ffffff40;
  opacity: 0.7;
}
.error-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  color: #a94339;
  background: #fff1ed;
  border: 1px solid #f3d5ca;
  border-radius: 7px;
  padding: 9px 13px;
  font-size: 11px;
  line-height: 1.7;
  margin-bottom: 12px;
}
.error-banner span {
  overflow-wrap: anywhere;
}
.unavailable {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  text-align: center;
  color: #63718a;
  font-size: 13px;
  line-height: 1.8;
}
.toast {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 10px;
  background: #fff;
  border: 1px solid var(--border);
  box-shadow: 0 6px 30px #20325118;
  border-radius: 8px;
  padding: 10px 14px;
  font-size: 11px;
  color: #5c6a83;
  z-index: 20;
  max-width: calc(100vw - 36px);
}
.toast span {
  min-width: 0;
}
.stacked {
  display: flex;
  flex-direction: column;
  flex: none;
  overflow: visible;
}
.stacked .request-pane {
  height: 620px;
  border-bottom: 1px solid var(--border);
}
.stacked .response-pane {
  height: 540px;
}
@media (max-width: 700px) {
  .app-shell {
    height: auto;
    min-height: 100dvh;
  }
  .topbar {
    flex-wrap: wrap;
    padding: 14px 16px;
  }
  .toolbar-actions {
    gap: 10px;
    flex-wrap: wrap;
  }
  .main {
    overflow: visible;
    min-height: calc(100dvh - 100px);
    padding: 12px;
  }
  .workspace {
    display: flex;
    flex-direction: column;
    flex: none;
  }
  .resizer,
  .layout-switch {
    display: none;
  }
  .request-pane {
    height: 620px;
    border-bottom: 1px solid var(--border);
  }
  .response-pane {
    height: 540px;
  }
  .run-button kbd {
    display: none;
  }
}
</style>
