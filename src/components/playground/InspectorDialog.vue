<script setup lang="ts">
import { computed, defineAsyncComponent, shallowRef, useTemplateRef, watch } from 'vue'
import { HugeiconsIcon } from '@hugeicons/vue'
import { Cancel01Icon, Download01Icon, Copy01Icon } from '@hugeicons/core-free-icons'
import { createPlan, pretty, validateRequest, type JevRequest } from '../../lib/contract'
import type { Evaluation } from '../../lib/prompt-api'
const CodeEditor = defineAsyncComponent(() => import('./CodeEditor.vue'))
const open = defineModel<boolean>({ required: true })
const props = defineProps<{
  request: JevRequest | null
  evaluation: Evaluation | null
  busy: boolean
}>()
const emit = defineEmits<{ import: [value: string] }>()
const dialog = useTemplateRef<HTMLDialogElement>('dialog')
const tab = shallowRef<'request' | 'schema' | 'raw'>('request')
const requestText = shallowRef('')
const feedback = shallowRef('')
const importError = shallowRef('')
const schemaText = computed(() => (props.request ? pretty(createPlan(props.request).schema) : '{}'))
const content = computed(() =>
  tab.value === 'request'
    ? requestText.value
    : tab.value === 'schema'
      ? schemaText.value
      : (props.evaluation?.raw ?? '{}'),
)
watch([open, dialog], ([value]) => {
  if (value) {
    feedback.value = ''
    importError.value = ''
    requestText.value = props.request
      ? pretty(props.request)
      : '{\n  "model": "jev-latest",\n  "state": "",\n  "questions": {}\n}'
    tab.value = 'request'
    dialog.value?.showModal()
  } else dialog.value?.close()
})
watch(requestText, () => {
  importError.value = ''
})
async function copy() {
  try {
    await navigator.clipboard.writeText(content.value)
    feedback.value = '已复制。'
  } catch {
    feedback.value = '复制失败，请在编辑器中手动选择并复制。'
  }
}
function apply() {
  try {
    validateRequest(JSON.parse(requestText.value))
    emit('import', requestText.value)
  } catch (error) {
    importError.value = error instanceof Error ? error.message : String(error)
  }
}
function download() {
  const url = URL.createObjectURL(new Blob([content.value], { type: 'application/json' }))
  const a = document.createElement('a')
  a.href = url
  a.download = `browserjev-${tab.value}.json`
  a.click()
  URL.revokeObjectURL(url)
}
</script>

<template>
  <dialog
    ref="dialog"
    class="inspector"
    aria-labelledby="inspect-title"
    @close="open = false"
    @cancel="open = false"
    @click="
      (event) => {
        if (event.target === dialog) open = false
      }
    "
  >
    <div class="inspector-shell">
      <header class="dialog-header">
        <div>
          <h2 id="inspect-title">检查请求与约束</h2>
          <p>Jev 输入结构，Chrome 本地推理。</p>
        </div>
        <button class="icon-button" aria-label="关闭检查窗口" @click="open = false">
          <HugeiconsIcon :icon="Cancel01Icon" :size="18" aria-hidden="true" />
        </button>
      </header>
      <div class="inspect-toolbar">
        <div class="segmented">
          <button :aria-pressed="tab === 'request'" @click="tab = 'request'">请求 JSON</button
          ><button :aria-pressed="tab === 'schema'" @click="tab = 'schema'">生成 Schema</button
          ><button :aria-pressed="tab === 'raw'" :disabled="!evaluation" @click="tab = 'raw'">
            模型原文
          </button>
        </div>
        <button class="icon-button" aria-label="复制当前内容" title="复制" @click="copy">
          <HugeiconsIcon :icon="Copy01Icon" :size="15" aria-hidden="true" /></button
        ><button class="icon-button" aria-label="下载当前内容" title="下载" @click="download">
          <HugeiconsIcon :icon="Download01Icon" :size="15" aria-hidden="true" />
        </button>
      </div>
      <div class="inspect-code">
        <CodeEditor
          v-if="tab === 'request'"
          v-model="requestText"
          label="完整请求 JSON"
          :readonly="busy"
        /><CodeEditor
          v-else
          :key="tab"
          :model-value="content"
          :label="tab === 'schema' ? '生成约束 Schema' : '模型原始输出'"
          readonly
        />
      </div>
      <div v-if="importError" class="import-error" role="alert">{{ importError }}</div>
      <div v-if="feedback" class="copy-feedback" role="status">{{ feedback }}</div>
      <footer class="dialog-footer">
        <p v-if="tab === 'request'">
          可以粘贴 TypeSafe 请求直接导入。model 字段保留在请求中；实际响应标识为 chrome-prompt-api。
        </p>
        <p v-else-if="tab === 'schema'">
          此 Schema 直接传入 responseConstraint。问题 ID 映射为 q0、q1…；概率归一化后由代码生成 Jev
          响应。
        </p>
        <p v-else>原文来自最近一次成功推理，未作 JSON 修补。最终响应中的选择和评分由概率计算。</p>
        <button v-if="tab === 'request'" class="button primary" :disabled="busy" @click="apply">
          应用请求
        </button>
      </footer>
    </div>
  </dialog>
</template>

<style scoped>
.import-error,
.copy-feedback {
  padding: 10px 25px;
  font-size: 11px;
  line-height: 1.7;
  overflow-wrap: anywhere;
}
.import-error {
  color: #a94339;
  background: #fff1ed;
}
.copy-feedback {
  color: var(--teal);
}
.inspector {
  width: min(780px, calc(100vw - 40px));
  max-height: calc(100dvh - 60px);
  padding: 0;
  border: 1px solid #d8e0ee;
  border-radius: 14px;
  box-shadow: 0 20px 90px #1a2f4d26;
  color: var(--ink);
  background: #fff;
}
.inspector::backdrop {
  background: #172b4650;
  backdrop-filter: blur(3px);
}
.inspector-shell {
  height: min(760px, calc(100dvh - 64px));
  display: flex;
  flex-direction: column;
}
.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 23px 25px 18px;
}
.dialog-header h2 {
  font-size: 17px;
  font-weight: 600;
  margin: 0;
}
.dialog-header p {
  font-size: 11px;
  color: var(--muted);
  margin: 7px 0 0;
}
.inspect-toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 25px 16px;
  border-bottom: 1px solid var(--border);
}
.inspect-toolbar .segmented {
  margin-right: auto;
}
.inspect-code {
  flex: 1;
  min-height: 100px;
}
.dialog-footer {
  display: flex;
  align-items: center;
  gap: 20px;
  border-top: 1px solid var(--border);
  padding: 16px 25px;
  background: #fafbfe;
}
.dialog-footer p {
  flex: 1;
  font-size: 10px;
  color: var(--muted);
  line-height: 1.8;
  margin: 0;
}
.dialog-footer .button {
  flex-shrink: 0;
}
</style>
