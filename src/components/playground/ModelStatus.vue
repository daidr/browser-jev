<script setup lang="ts">
import { computed } from 'vue'
import { Cpu, RefreshCw, Download, Check, ExternalLink } from 'lucide-vue-next'
import type { Availability, Language } from '../../lib/prompt-api'
const props = defineProps<{
  availability: Availability | 'unsupported' | 'checking'
  phase: string
  progress: number
  busy: boolean
}>()
const language = defineModel<Language>('language', { required: true })
const emit = defineEmits<{ initialize: []; refresh: []; cancel: [] }>()
const status = computed(() => {
  if (props.phase === 'ready' || props.phase === 'running') return '本地模型已就绪'
  if (props.phase === 'initializing')
    return props.progress > 0
      ? `正在下载模型 ${Math.round(props.progress * 100)}%`
      : '正在准备本地模型…'
  return {
    checking: '正在检查浏览器…',
    available: '模型可用，等待启用',
    downloadable: '首次使用需要下载模型',
    downloading: '模型正在下载',
    unavailable: '模型暂不可用',
    unsupported: '当前浏览器未提供 Prompt API',
  }[props.availability]
})
const canInitialize = computed(
  () =>
    ['available', 'downloadable', 'downloading'].includes(props.availability) &&
    !props.busy &&
    props.phase !== 'ready',
)
</script>

<template>
  <section class="model-status" aria-label="本地模型状态">
    <div class="model-icon"><Cpu :size="20" /></div>
    <div class="model-description">
      <strong>Chrome 内置 AI <span>Gemini Nano</span></strong>
      <p aria-live="polite">
        <span class="status-dot" :class="{ ready: phase === 'ready' || phase === 'running' }" />{{
          status
        }}
      </p>
    </div>
    <label class="language-label"
      >输入语言<select v-model="language" :disabled="busy" aria-label="输入语言">
        <option value="en">English</option>
        <option value="ja">日本語</option>
        <option value="es">Español</option>
        <option value="de">Deutsch</option>
        <option value="fr">Français</option>
      </select></label
    >
    <button v-if="canInitialize" class="button primary compact" @click="emit('initialize')">
      <Download :size="14" />启用本地模型
    </button>
    <button v-else-if="phase === 'initializing'" class="button compact" @click="emit('cancel')">
      取消
    </button>
    <span v-else-if="phase === 'ready' || phase === 'running'" class="ready-label"
      ><Check :size="15" /> 已连接</span
    >
    <button
      v-else
      class="icon-button"
      title="重新检查模型"
      aria-label="重新检查模型"
      @click="emit('refresh')"
    >
      <RefreshCw :size="16" />
    </button>
    <progress
      v-if="phase === 'initializing'"
      class="download-progress"
      :value="progress || undefined"
      max="1"
      aria-label="模型下载进度"
    />
  </section>
  <div
    v-if="availability === 'unsupported' || availability === 'unavailable'"
    class="availability-help"
  >
    请在桌面版 Chrome 148+ 的 localhost 或 HTTPS 页面打开，并确认设备满足本地模型要求。
    <a href="https://developer.chrome.com/docs/ai/prompt-api" target="_blank" rel="noreferrer"
      >查看 Chrome 要求 <ExternalLink :size="11"
    /></a>
  </div>
</template>

<style scoped>
.model-status {
  position: relative;
  display: flex;
  align-items: center;
  gap: 13px;
  padding: 14px 20px;
  border: 1px solid var(--border);
  background: #fff;
  border-radius: 10px;
}
.model-icon {
  width: 39px;
  height: 39px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  background: #f0f4fc;
  color: #586d97;
}
.model-description {
  margin-right: auto;
}
.model-description strong {
  font-size: 12px;
  font-weight: 600;
}
.model-description strong span {
  color: var(--muted);
  margin-left: 9px;
  font-weight: 400;
}
.model-description p {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 5px 0 0;
  font-size: 11px;
  color: var(--muted);
}
.status-dot {
  color: #a2aabb;
}
.ready {
  color: var(--teal);
}
.language-label {
  display: flex;
  flex-direction: column;
  gap: 3px;
  color: var(--muted);
  font-size: 9px;
}
select {
  border: 0;
  background: transparent;
  color: var(--ink);
  font: inherit;
  font-size: 11px;
  padding-right: 6px;
  cursor: pointer;
}
.ready-label {
  display: flex;
  gap: 5px;
  align-items: center;
  color: var(--teal);
  font-size: 11px;
  padding: 8px;
}
.download-progress {
  position: absolute;
  bottom: 0;
  left: 10px;
  width: calc(100% - 20px);
  height: 3px;
  accent-color: var(--blue);
}
.availability-help {
  margin-top: 10px;
  color: #7d6031;
  font-size: 11px;
  line-height: 1.8;
}
.availability-help a {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  margin-left: 8px;
  color: inherit;
}
@media (max-width: 700px) {
  .model-status {
    flex-wrap: wrap;
    padding: 13px;
  }
  .model-description strong span {
    display: none;
  }
}
</style>
