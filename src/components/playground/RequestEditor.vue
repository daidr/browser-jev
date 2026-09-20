<script setup lang="ts">
import { Braces, AlignLeft, Plus, WrapText } from 'lucide-vue-next'
import { defineAsyncComponent } from 'vue'
import type { Question } from '../../lib/contract'
const CodeEditor = defineAsyncComponent(() => import('./CodeEditor.vue'))

const state = defineModel<string>('state', { required: true })
const questions = defineModel<string>('questions', { required: true })
defineProps<{
  stateMode: 'text' | 'json'
  disabled: boolean
  validationError: string
  questionCount: number
}>()
const emit = defineEmits<{
  mode: [mode: 'text' | 'json']
  add: [type: Question['type']]
  format: []
}>()
</script>

<template>
  <div class="request-editor">
    <section class="state-section">
      <header class="panel-header">
        <div class="section-heading">
          <span class="step-dot">1</span>
          <h2>State</h2>
          <span class="hint">待判断的上下文</span>
        </div>
        <div class="segmented small" aria-label="State 格式">
          <button
            :aria-pressed="stateMode === 'text'"
            :disabled="disabled"
            title="纯文本"
            @click="emit('mode', 'text')"
          >
            <AlignLeft :size="14" />文本
          </button>
          <button
            :aria-pressed="stateMode === 'json'"
            :disabled="disabled"
            title="JSON"
            @click="emit('mode', 'json')"
          >
            <Braces :size="14" />JSON
          </button>
        </div>
      </header>
      <div class="state-code">
        <CodeEditor
          v-model="state"
          label="State 编辑器"
          :json-mode="stateMode === 'json'"
          :readonly="disabled"
        />
      </div>
      <footer class="editor-foot">
        <span>给模型事实，再用问题定义判断。</span
        ><span>{{ state.length.toLocaleString() }} 字符</span>
      </footer>
    </section>
    <section class="questions-section">
      <header class="panel-header">
        <div class="section-heading">
          <span class="step-dot">2</span>
          <h2>Questions</h2>
          <span class="count">{{ questionCount }}</span>
        </div>
        <button
          class="text-button"
          :disabled="disabled"
          title="格式化 Questions JSON"
          @click="emit('format')"
        >
          <WrapText :size="15" />格式化
        </button>
      </header>
      <div class="primitive-tools">
        <span>添加问题</span>
        <button class="primitive-button noul" :disabled="disabled" @click="emit('add', 'noul')">
          <Plus :size="12" /> Noul
        </button>
        <button class="primitive-button choice" :disabled="disabled" @click="emit('add', 'choice')">
          <Plus :size="12" /> Choice
        </button>
        <button class="primitive-button score" :disabled="disabled" @click="emit('add', 'score')">
          <Plus :size="12" /> Score
        </button>
      </div>
      <div class="questions-code">
        <CodeEditor v-model="questions" label="Questions 编辑器" :readonly="disabled" />
      </div>
      <footer class="validation" :class="{ invalid: validationError }" aria-live="polite">
        <span class="status-dot" />{{ validationError || '请求有效 · 所有问题将一起评估' }}
      </footer>
    </section>
  </div>
</template>

<style scoped>
.request-editor {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}
.state-section {
  display: flex;
  flex-direction: column;
  flex: 0 0 34%;
  min-height: 195px;
  border-bottom: 1px solid var(--border);
  resize: vertical;
  overflow: auto;
  max-height: 65%;
}
.state-code {
  flex: 1;
  min-height: 90px;
}
.questions-section {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 240px;
}
.questions-code {
  flex: 1;
  min-height: 140px;
}
.step-dot {
  width: 21px;
  height: 21px;
  display: inline-grid;
  place-items: center;
  background: #edf2fe;
  color: var(--blue);
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
}
.primitive-tools {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 10px 18px;
  border-bottom: 1px solid #f0f2f7;
  font-size: 11px;
  color: var(--muted);
}
.primitive-tools > span {
  margin-right: auto;
}
.primitive-button {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  border: 0;
  border-radius: 5px;
  padding: 4px 8px;
  font-size: 11px;
  cursor: pointer;
}
.editor-foot {
  display: flex;
  justify-content: space-between;
  padding: 8px 18px 11px;
  gap: 12px;
  color: var(--muted);
  font-size: 10px;
}
.validation {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 11px 18px;
  font-size: 11px;
  border-top: 1px solid var(--border);
  color: var(--teal);
  overflow-wrap: anywhere;
}
.invalid {
  color: #ab4a27;
}
.hint {
  font-size: 11px;
  color: var(--muted);
}
@media (max-width: 1200px) {
  .hint {
    display: none;
  }
}
</style>
