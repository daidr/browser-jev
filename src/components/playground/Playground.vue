<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, shallowRef, useTemplateRef } from 'vue'
import {
  ArrowUpRight,
  Braces,
  Columns2,
  Rows2,
  RotateCcw,
  Play,
  Square,
  ShieldCheck,
  X,
  CheckCheck,
} from 'lucide-vue-next'
import { usePlayground } from '../../composables/usePlayground'
import ExampleSidebar from './ExampleSidebar.vue'
import RequestEditor from './RequestEditor.vue'
import ResponsePanel from './ResponsePanel.vue'
import ModelStatus from './ModelStatus.vue'
import InspectorDialog from './InspectorDialog.vue'

const {
  title,
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
  validation,
  stale,
  canRun,
  checkAvailability,
  initialize,
  run,
  cancel,
  selectExample,
  loadHistory,
  importRequest,
  addQuestion,
  setStateMode,
  formatQuestions,
  clear,
} = usePlayground()
const inspectOpen = shallowRef(false)
const stacked = shallowRef(false)
const split = shallowRef(53)
const dragging = shallowRef(false)
const workspace = useTemplateRef<HTMLDivElement>('workspace')
const questionCount = computed(() => Object.keys(validation.value.request?.questions ?? {}).length)
const splitStyle = computed(() =>
  stacked.value
    ? {}
    : { gridTemplateColumns: `minmax(0, ${split.value}fr) 7px minmax(0, ${100 - split.value}fr)` },
)
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
  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter' && !inspectOpen.value) {
    event.preventDefault()
    void run()
  }
}
onMounted(() => window.addEventListener('keydown', shortcut))
onBeforeUnmount(() => window.removeEventListener('keydown', shortcut))
function applyImport(value: string) {
  if (importRequest(value)) inspectOpen.value = false
}
</script>

<template>
  <div class="app-shell">
    <ExampleSidebar
      :selected-title="title"
      :history="history"
      :disabled="busy"
      @select="selectExample"
      @history="loadHistory"
    />
    <main class="main">
      <header class="topbar">
        <div class="breadcrumb">工作空间<span>/</span><strong>Playground</strong></div>
        <a href="https://developer.chrome.com/docs/ai/prompt-api" target="_blank" rel="noreferrer"
          >Prompt API 文档<ArrowUpRight :size="14"
        /></a>
      </header>
      <div class="main-content">
        <div class="page-heading">
          <div>
            <h1>把问题，变成明确的输出。</h1>
            <p>一个上下文，多种判断。用浏览器内置 AI 探索 Jev 的输入与输出。</p>
          </div>
          <span class="privacy-badge"><ShieldCheck :size="14" /> 本机推理</span>
        </div>
        <ModelStatus
          v-model:language="language"
          :availability="availability"
          :phase="phase"
          :progress="progress"
          :busy="busy"
          @initialize="initialize"
          @refresh="checkAvailability"
          @cancel="cancel"
        />
        <div class="workspace-toolbar">
          <div class="workspace-title">{{ title }}<span class="draft-tag">草稿</span></div>
          <div class="toolbar-actions">
            <button class="text-button" :disabled="busy" @click="clear">
              <RotateCcw :size="13" />清空</button
            ><button class="button compact inspect-button" @click="inspectOpen = true">
              <Braces :size="14" />请求 / Schema
            </button>
            <div class="segmented layout-switch">
              <button
                :aria-pressed="!stacked"
                title="左右布局"
                aria-label="左右布局"
                @click="stacked = false"
              >
                <Columns2 :size="14" /></button
              ><button
                :aria-pressed="stacked"
                title="上下布局"
                aria-label="上下布局"
                @click="stacked = true"
              >
                <Rows2 :size="14" />
              </button>
            </div>
          </div>
        </div>
        <div v-if="error" class="error-banner" role="alert">
          <span>{{ error }}</span
          ><button class="icon-button" aria-label="关闭错误提示" @click="error = ''">
            <X :size="14" />
          </button>
        </div>
        <div ref="workspace" :class="['workspace', { stacked, dragging }]" :style="splitStyle">
          <div class="request-pane">
            <RequestEditor
              v-model:state="stateText"
              v-model:questions="questionsText"
              :state-mode="stateMode"
              :disabled="busy"
              :validation-error="validation.error"
              :question-count="questionCount"
              @mode="setStateMode"
              @add="addQuestion"
              @format="formatQuestions"
            />
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
            <ResponsePanel
              :evaluation="evaluation"
              :request="validation.request"
              :running="phase === 'running'"
              :stale="stale"
              @notice="notice = $event"
            />
          </div>
        </div>
        <footer class="run-bar">
          <div class="run-summary">
            <span class="tiny-mark"><CheckCheck :size="15" /></span
            ><strong>{{ questionCount }} 个问题</strong><span>本地运行，无 API 费用</span>
          </div>
          <button v-if="phase === 'running'" class="button primary run-button" @click="cancel">
            <Square :size="13" />停止运行</button
          ><button
            v-else
            class="button primary run-button"
            :disabled="!canRun"
            :title="phase !== 'ready' ? '请先启用本地模型' : validation.error || 'Ctrl / ⌘ + Enter'"
            @click="run"
          >
            <Play :size="14" fill="currentColor" />运行请求<kbd>Ctrl ↵</kbd>
          </button>
        </footer>
        <div class="workspace-foot">
          <span><span class="status-dot" />草稿与最近 10 次结果仅保存在此浏览器</span
          ><span>Jev 格式兼容 · Chrome 本地模型</span>
        </div>
      </div>
    </main>
    <div v-if="notice" class="toast" role="status">
      <CheckCheck :size="15" /><span>{{ notice }}</span
      ><button class="icon-button" aria-label="关闭通知" @click="notice = ''">
        <X :size="13" />
      </button>
    </div>
    <InspectorDialog
      v-model="inspectOpen"
      :request="validation.request"
      :evaluation="evaluation"
      :busy="busy"
      @import="applyImport"
    />
  </div>
</template>

<style scoped>
.app-shell {
  display: flex;
  min-height: 100dvh;
  height: 100dvh;
  overflow: hidden;
}
.main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow: auto;
}
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 30px;
  background: #fff;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}
.breadcrumb {
  display: flex;
  gap: 13px;
  font-size: 11px;
  color: #9aa4b4;
}
.breadcrumb strong {
  color: #5d6a81;
  font-weight: 500;
}
.topbar a {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 10px;
  color: #718097;
  text-decoration: none;
}
.main-content {
  padding: 27px 30px 14px;
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 700px;
}
.page-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 25px;
}
.page-heading h1 {
  font-size: 23px;
  letter-spacing: -0.7px;
  font-weight: 600;
  margin: 0 0 9px;
}
.page-heading p {
  margin: 0;
  color: #8c97aa;
  font-size: 11px;
  line-height: 1.8;
}
.privacy-badge {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 10px;
  color: #73839a;
  white-space: nowrap;
}
.workspace-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 22px 0 13px;
}
.workspace-title {
  display: flex;
  align-items: center;
  gap: 9px;
  font-size: 12px;
  font-weight: 600;
}
.draft-tag {
  font-size: 9px;
  color: #9ca5b5;
  font-weight: 400;
}
.toolbar-actions {
  display: flex;
  align-items: center;
  gap: 14px;
}
.layout-switch {
  padding: 2px;
}
.layout-switch button {
  padding: 5px 7px;
}
.workspace {
  flex: 1;
  min-height: 350px;
  display: grid;
  border: 1px solid var(--border);
  border-radius: 9px 9px 0 0;
  overflow: hidden;
  background: #fff;
}
.request-pane,
.response-pane {
  min-width: 0;
  min-height: 0;
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
  justify-content: space-between;
  align-items: center;
  gap: 15px;
  padding: 12px 17px;
  background: #fff;
  border: 1px solid var(--border);
  border-top: 0;
  border-radius: 0 0 9px 9px;
}
.run-summary {
  display: flex;
  align-items: center;
  gap: 9px;
  font-size: 10px;
  color: #9aa4b4;
}
.run-summary strong {
  color: #6d7990;
  font-size: 10px;
  font-weight: 500;
}
.tiny-mark {
  display: inline-flex;
  color: #9baac4;
}
.run-button {
  padding: 10px 17px;
  min-width: 145px;
  justify-content: center;
}
.run-button kbd {
  font: inherit;
  font-size: 9px;
  margin-left: 9px;
  padding-left: 10px;
  border-left: 1px solid #ffffff40;
  opacity: 0.7;
}
.workspace-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 12px;
  font-size: 9px;
  color: #a3adbd;
  gap: 16px;
}
.workspace-foot > span:first-child {
  display: flex;
  align-items: center;
  gap: 6px;
}
.workspace-foot .status-dot {
  width: 4px;
  height: 4px;
}
.error-banner {
  display: flex;
  align-items: center;
  gap: 10px;
  justify-content: space-between;
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
  overflow: visible;
  flex: none;
  min-height: 1000px;
}
.stacked .request-pane {
  height: 620px;
  flex: none;
  border-bottom: 1px solid var(--border);
}
.stacked .response-pane {
  min-height: 400px;
}
@media (min-width: 1700px) {
  .main-content {
    padding: 34px 40px 18px;
  }
  .topbar {
    padding-inline: 40px;
  }
  .page-heading {
    margin-bottom: 30px;
  }
  .page-heading h1 {
    font-size: 26px;
  }
}
@media (max-width: 1200px) {
  .main-content {
    padding-inline: 19px;
  }
  .topbar {
    padding-inline: 19px;
  }
  .run-summary > span:last-child {
    display: none;
  }
  .toolbar-actions {
    gap: 8px;
  }
  .privacy-badge {
    display: none;
  }
}
@media (max-width: 1000px) {
  .workspace {
    grid-template-columns: 1fr !important;
    display: flex;
    flex-direction: column;
    flex: none;
    overflow: visible;
  }
  .resizer,
  .layout-switch {
    display: none;
  }
  .request-pane {
    height: 600px;
    border-bottom: 1px solid var(--border);
  }
  .response-pane {
    min-height: 430px;
  }
  .main-content {
    min-height: auto;
  }
  .workspace-foot > span:last-child {
    display: none;
  }
}
@media (max-width: 800px) {
  .app-shell {
    height: auto;
    display: block;
    overflow: visible;
  }
  .main {
    overflow: visible;
  }
  .topbar {
    display: none;
  }
  .main-content {
    padding: 25px 16px 18px;
  }
  .page-heading h1 {
    font-size: 21px;
  }
  .page-heading p {
    font-size: 10px;
  }
  .workspace-toolbar {
    gap: 8px;
  }
  .workspace-title {
    font-size: 11px;
  }
  .draft-tag {
    display: none;
  }
  .inspect-button {
    font-size: 10px;
  }
  .run-bar {
    position: sticky;
    bottom: 0;
    z-index: 5;
    box-shadow: 0 -3px 15px #1d355108;
  }
  .toast {
    bottom: 80px;
    width: max-content;
  }
}
</style>
