<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, shallowRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { HugeiconsIcon } from '@hugeicons/vue'
import {
  Layout2ColumnIcon,
  Layout2RowIcon,
  Delete01Icon,
  PlayIcon,
  StopIcon,
  GithubIcon,
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
import LocaleSelect from './LocaleSelect.vue'

const { t, locale } = useI18n()

const {
  stateText,
  stateMode,
  questionsText,
  availability,
  phase,
  progress,
  error,
  notice,
  noticeText,
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
const layoutOptions = computed(
  () =>
    [
      { value: 'columns', label: t('actions.columns'), icon: Layout2ColumnIcon },
      { value: 'rows', label: t('actions.rows'), icon: Layout2RowIcon },
    ] as const,
)
const availabilityMessage = computed(() => {
  if (availability.value === 'checking') return t('availability.checking')
  if (availability.value === 'unsupported') return t('availability.unsupported')
  return t('availability.unavailable')
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
      <div class="toolbar-actions">
        <select
          v-if="supported && history.length"
          class="control-select history-select"
          :aria-label="t('actions.history')"
          :disabled="busy"
          value=""
          @change="selectHistory"
        >
          <option disabled value="">{{ t('actions.history') }}</option>
          <option v-for="(item, index) in history" :key="item.createdAt" :value="index">
            {{ new Date(item.createdAt).toLocaleString(locale) }} ·
            {{ Object.keys(item.request.questions).join(', ') }}
          </option>
        </select>
        <SegmentedControl
          v-if="supported"
          v-model="layout"
          class="layout-switch"
          :label="t('actions.layout')"
          :options="layoutOptions"
          icon-only
        />
        <LocaleSelect />
        <a
          class="github-link"
          href="https://github.com/daidr/browser-jev"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="GitHub · daidr/browser-jev"
          title="GitHub · daidr/browser-jev"
        >
          <HugeiconsIcon :icon="GithubIcon" :size="22" aria-hidden="true" />
        </a>
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
              :label="t('actions.clear')"
              :icon="Delete01Icon"
              variant="quiet"
              :disabled="busy || inputEmpty"
              @click="clear"
            />
            <AppButton
              v-if="phase === 'running'"
              :label="t('actions.stop')"
              :icon="StopIcon"
              variant="primary"
              @click="cancel"
            />
            <AppButton
              v-else
              :label="t('actions.run')"
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
    <footer class="attribution">
      by <a href="https://github.com/daidr" target="_blank" rel="noopener noreferrer">daidr</a>
    </footer>
    <StatusMessage v-if="notice" class="toast" dismissible @dismiss="notice = ''">{{
      noticeText
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
.github-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  border-radius: 7px;
  color: var(--muted);
}
.github-link:hover {
  color: var(--ink);
  background: var(--surface-hover);
}
.attribution {
  flex-shrink: 0;
  padding: 0 16px 12px;
  color: var(--muted);
  font-size: 13px;
  text-align: center;
}
.attribution a {
  color: inherit;
  text-underline-offset: 3px;
}
.attribution a:hover {
  color: var(--blue);
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
    padding: 12px;
  }
  .layout-switch {
    display: none;
  }
}
</style>
