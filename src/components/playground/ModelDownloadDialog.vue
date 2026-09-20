<script setup lang="ts">
import { computed, useTemplateRef, watch } from 'vue'
const props = defineProps<{ open: boolean; progress: number | null; downloading: boolean }>()
const emit = defineEmits<{ cancel: [] }>()
const dialog = useTemplateRef<HTMLDialogElement>('dialog')
const heading = computed(() =>
  props.progress === 1 ? '正在加载模型' : props.downloading ? '正在下载模型' : '正在准备模型',
)
watch(
  [() => props.open, dialog],
  ([open, element]) => {
    if (!element) return
    if (open && !element.open) element.showModal()
    if (!open && element.open) element.close()
  },
  { flush: 'post' },
)
</script>

<template>
  <dialog
    ref="dialog"
    class="download-dialog"
    aria-labelledby="download-heading"
    @cancel.prevent="emit('cancel')"
  >
    <h2 id="download-heading">{{ heading }}</h2>
    <div class="progress-label" role="status">
      <span>{{ progress === 1 ? '等待模型就绪…' : '准备完成后将自动运行' }}</span>
      <span v-if="progress !== null">{{ Math.floor(progress * 100) }}%</span>
    </div>
    <progress :value="progress ?? undefined" max="1" :aria-label="heading" />
    <footer><button class="button" autofocus @click="emit('cancel')">取消</button></footer>
  </dialog>
</template>

<style scoped>
.download-dialog {
  width: min(420px, calc(100vw - 32px));
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 26px;
  color: var(--ink);
  background: #fff;
  box-shadow: 0 20px 70px #20283c30;
}
.download-dialog::backdrop {
  background: #17213a50;
}
h2 {
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 22px;
}
.progress-label {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  font-size: 12px;
  color: #69758c;
  margin-bottom: 10px;
  font-variant-numeric: tabular-nums;
}
progress {
  display: block;
  width: 100%;
  height: 8px;
  appearance: none;
  border: 0;
  border-radius: 4px;
  overflow: hidden;
  accent-color: var(--blue);
  background: #edf1f8;
}
progress::-webkit-progress-bar {
  background: #edf1f8;
  border-radius: 4px;
}
progress::-webkit-progress-value {
  background: var(--blue);
  border-radius: 4px;
}
progress::-moz-progress-bar {
  background: var(--blue);
  border-radius: 4px;
}
progress:indeterminate {
  background: linear-gradient(90deg, #edf1f8, #9eb3f6, #edf1f8);
  background-size: 200% 100%;
  animation: loading 1.6s linear infinite;
}
progress:indeterminate::-webkit-progress-bar {
  background: transparent;
}
footer {
  display: flex;
  justify-content: flex-end;
  margin-top: 26px;
}
@keyframes loading {
  to {
    background-position: -200% 0;
  }
}
</style>
