<script setup lang="ts">
import { HugeiconsIcon } from '@hugeicons/vue'
import {
  SourceCodeIcon,
  TextAlignLeftIcon,
  Add01Icon,
  TextWrapIcon,
} from '@hugeicons/core-free-icons'
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
          <h2>State</h2>
        </div>
        <div class="segmented small" aria-label="State 格式">
          <button
            :aria-pressed="stateMode === 'text'"
            :disabled="disabled"
            title="纯文本"
            @click="emit('mode', 'text')"
          >
            <HugeiconsIcon :icon="TextAlignLeftIcon" :size="14" aria-hidden="true" />文本
          </button>
          <button
            :aria-pressed="stateMode === 'json'"
            :disabled="disabled"
            title="JSON"
            @click="emit('mode', 'json')"
          >
            <HugeiconsIcon :icon="SourceCodeIcon" :size="14" aria-hidden="true" />JSON
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
    </section>
    <section class="questions-section">
      <header class="panel-header">
        <div class="section-heading">
          <h2>Questions</h2>
          <span class="count">{{ questionCount }}</span>
        </div>
        <button
          class="text-button"
          :disabled="disabled"
          title="格式化 Questions JSON"
          @click="emit('format')"
        >
          <HugeiconsIcon :icon="TextWrapIcon" :size="15" aria-hidden="true" />格式化
        </button>
      </header>
      <div class="primitive-tools">
        <span>添加问题</span>
        <button class="primitive-button noul" :disabled="disabled" @click="emit('add', 'noul')">
          <HugeiconsIcon :icon="Add01Icon" :size="12" aria-hidden="true" /> Noul
        </button>
        <button class="primitive-button choice" :disabled="disabled" @click="emit('add', 'choice')">
          <HugeiconsIcon :icon="Add01Icon" :size="12" aria-hidden="true" /> Choice
        </button>
        <button class="primitive-button score" :disabled="disabled" @click="emit('add', 'score')">
          <HugeiconsIcon :icon="Add01Icon" :size="12" aria-hidden="true" /> Score
        </button>
      </div>
      <div class="questions-code">
        <CodeEditor v-model="questions" label="Questions 编辑器" :readonly="disabled" />
      </div>
      <footer v-if="validationError" class="validation" role="status">
        {{ validationError }}
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
  min-height: 145px;
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
  min-height: 210px;
}
.questions-code {
  flex: 1;
  min-height: 140px;
}
.primitive-tools {
  display: flex;
  flex-wrap: wrap;
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
.validation {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 11px 18px;
  font-size: 11px;
  border-top: 1px solid var(--border);
  color: #ab4a27;
  overflow-wrap: anywhere;
}
</style>
