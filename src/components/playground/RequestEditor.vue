<script setup lang="ts">
import { TextWrapIcon } from '@hugeicons/core-free-icons'
import { computed, defineAsyncComponent } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Question } from '../../lib/contract'
import AppButton from '../ui/AppButton.vue'
import PanelHeader from '../ui/PanelHeader.vue'
import SegmentedControl from '../ui/SegmentedControl.vue'
import StatusMessage from '../ui/StatusMessage.vue'
const CodeEditor = defineAsyncComponent(() => import('./CodeEditor.vue'))
const { t } = useI18n()

const state = defineModel<string>('state', { required: true })
const questions = defineModel<string>('questions', { required: true })
defineProps<{ stateMode: 'text' | 'json'; disabled: boolean; validationError: string }>()
const emit = defineEmits<{
  mode: [mode: 'text' | 'json']
  add: [type: Question['type']]
  format: []
}>()
const stateModes = computed(
  () =>
    [
      { value: 'text', label: t('editor.text'), title: t('editor.textHint') },
      { value: 'json', label: t('editor.json'), title: t('editor.jsonHint') },
    ] as const,
)
function addQuestion(event: Event) {
  const select = event.target as HTMLSelectElement
  const type = select.value
  if (type === 'noul' || type === 'choice' || type === 'score') emit('add', type)
  select.value = ''
}
</script>

<template>
  <div class="request-editor">
    <section class="state-section">
      <PanelHeader :title="t('editor.state')">
        <SegmentedControl
          :model-value="stateMode"
          :label="t('editor.format')"
          :options="stateModes"
          :disabled="disabled"
          @update:model-value="emit('mode', $event)"
        />
      </PanelHeader>
      <div class="state-code">
        <CodeEditor
          v-model="state"
          :label="t('editor.stateLabel')"
          :json-mode="stateMode === 'json'"
          :readonly="disabled"
        />
      </div>
    </section>
    <section class="questions-section">
      <PanelHeader :title="t('editor.questions')">
        <select
          class="control-select"
          :aria-label="t('editor.addQuestion')"
          value=""
          :disabled="disabled"
          @change="addQuestion"
        >
          <option disabled value="">{{ t('editor.addQuestion') }}</option>
          <option value="noul">Noul</option>
          <option value="choice">Choice</option>
          <option value="score">Score</option>
        </select>
        <AppButton
          :label="t('editor.formatQuestions')"
          :icon="TextWrapIcon"
          icon-only
          variant="quiet"
          :disabled="disabled"
          @click="emit('format')"
        />
      </PanelHeader>
      <div class="questions-code">
        <CodeEditor v-model="questions" :label="t('editor.questionsLabel')" :readonly="disabled" />
      </div>
      <StatusMessage v-if="validationError" class="validation" tone="error">{{
        validationError
      }}</StatusMessage>
    </section>
  </div>
</template>

<style scoped>
.request-editor {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 430px;
}
.state-section {
  display: flex;
  flex-direction: column;
  flex: 0 0 auto;
  height: 36%;
  min-height: 190px;
  border-bottom: 1px solid var(--border);
  resize: vertical;
  overflow: auto;
  max-height: min(60%, calc(100% - 240px));
}
.state-code,
.questions-code {
  flex: 1;
  min-height: 80px;
}
.questions-section {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 240px;
}
.validation {
  border-top: 1px solid var(--border);
  max-height: 35%;
  overflow: auto;
}
</style>
