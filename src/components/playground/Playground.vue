<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, shallowRef } from 'vue'
import {
  Layout2ColumnIcon,
  Layout2RowIcon,
  Delete01Icon,
  PlayIcon,
  StopIcon,
} from '@hugeicons/core-free-icons'
import { usePlayground } from '../../composables/usePlayground'
import AppButton from '../ui/AppButton.vue'
import SegmentedControl from '../ui/SegmentedControl.vue'
import StatusMessage from '../ui/StatusMessage.vue'
import SplitWorkspace from './SplitWorkspace.vue'
import RequestEditor from './RequestEditor.vue'
import ResponsePanel from './ResponsePanel.vue'
import ExamplesPanel from './ExamplesPanel.vue'
import ModelDownloadDialog from './ModelDownloadDialog.vue'

const {
  stateText,
  stateMode,
  questionsText,
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
const layout = shallowRef<'columns' | 'rows'>('columns')
const layoutOptions = [
  { value: 'columns', label: '左右布局', icon: Layout2ColumnIcon },
  { value: 'rows', label: '上下布局', icon: Layout2RowIcon },
] as const
const availabilityMessage = computed(() => {
  if (availability.value === 'checking') return '正在检查浏览器支持…'
  if (availability.value === 'unsupported')
    return '当前浏览器不支持 Prompt API。需要使用桌面版 Chrome 148 或更高版本。'
  return '当前设备无法使用本地模型。需要使用桌面版 Chrome 148 或更高版本。'
})
function shortcut(event: KeyboardEvent) {
  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
    event.preventDefault()
    void run()
  }
}
function selectHistory(event: Event) {
  const select = event.target as HTMLSelectElement
  if (select.value === '') return
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
          class="control-select history-select"
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
        <SegmentedControl
          v-model="layout"
          class="layout-switch"
          label="面板布局"
          :options="layoutOptions"
          icon-only
        />
      </div>
    </header>
    <main class="main">
      <StatusMessage
        v-if="error"
        class="error-banner"
        tone="error"
        dismissible
        @dismiss="error = ''"
        >{{ error }}</StatusMessage
      >
      <div v-if="!supported" class="unavailable" role="status">
        <p>{{ availabilityMessage }}</p>
      </div>
      <SplitWorkspace v-else :layout="layout">
        <template #input>
          <RequestEditor
            v-model:state="stateText"
            v-model:questions="questionsText"
            :state-mode="stateMode"
            :disabled="busy"
            :validation-error="inputEmpty ? '' : validation.error"
            @mode="setStateMode"
            @add="addQuestion"
            @format="formatQuestions"
          />
          <footer class="run-bar">
            <AppButton
              label="清空"
              :icon="Delete01Icon"
              variant="quiet"
              :disabled="busy || inputEmpty"
              @click="clear"
            />
            <AppButton
              v-if="phase === 'running'"
              label="停止运行"
              :icon="StopIcon"
              variant="primary"
              @click="cancel"
            />
            <AppButton
              v-else
              label="运行"
              :icon="PlayIcon"
              variant="primary"
              :disabled="!canRun"
              :title="validation.error || 'Ctrl / ⌘ + Enter'"
              @click="run"
            />
          </footer>
        </template>
        <template #output>
          <ExamplesPanel v-if="inputEmpty" :disabled="busy" @select="selectExample" />
          <ResponsePanel
            v-else
            :evaluation="evaluation"
            :running="phase === 'running'"
            :stale="stale"
            @notice="notice = $event"
          />
        </template>
      </SplitWorkspace>
    </main>
    <StatusMessage v-if="notice" class="toast" dismissible @dismiss="notice = ''">{{
      notice
    }}</StatusMessage>
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
  min-height: 700px;
}
.topbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 24px;
  background: #fff;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}
.topbar h1 {
  margin: 0;
  font-size: var(--text-brand);
  font-weight: 600;
  letter-spacing: -0.5px;
}
.toolbar-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
}
.history-select {
  width: 160px;
}
.main {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  padding: 16px;
  overflow: auto;
}
.run-bar {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  border-top: 1px solid var(--border);
  flex-shrink: 0;
}
.error-banner {
  border: 1px solid #f3d5ca;
  border-radius: 8px;
  margin-bottom: 16px;
}
.unavailable {
  flex: 1;
  display: grid;
  place-items: center;
  text-align: center;
  color: var(--muted);
  font-size: var(--text-body);
  line-height: 1.8;
  padding: 24px;
}
.unavailable p {
  max-width: 640px;
}
.toast {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  background: #fff;
  border: 1px solid var(--border);
  box-shadow: 0 6px 30px #20325118;
  border-radius: 8px;
  z-index: 20;
  width: max-content;
  max-width: calc(100vw - 32px);
}
@media (max-width: 960px) {
  .app-shell {
    height: auto;
    min-height: 100dvh;
  }
  .topbar {
    padding: 16px;
  }
  .main {
    overflow: visible;
    min-height: calc(100dvh - 100px);
    padding: 12px;
  }
  .layout-switch {
    display: none;
  }
}
</style>
