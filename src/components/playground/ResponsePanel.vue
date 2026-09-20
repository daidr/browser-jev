<script setup lang="ts">
import { computed, defineAsyncComponent, shallowRef } from 'vue'
import { useI18n } from 'vue-i18n'
import type { NoticeKey } from '../../i18n'
import { Copy01Icon, Download01Icon } from '@hugeicons/core-free-icons'
import { pretty } from '../../lib/contract'
import type { Evaluation } from '../../lib/prompt-api'
import AppButton from '../ui/AppButton.vue'
import PanelHeader from '../ui/PanelHeader.vue'
import SegmentedControl from '../ui/SegmentedControl.vue'
import StatusMessage from '../ui/StatusMessage.vue'
import AnswerCard from './AnswerCard.vue'
import TokenCount from './TokenCount.vue'
const CodeEditor = defineAsyncComponent(() => import('./CodeEditor.vue'))
const props = defineProps<{ evaluation: Evaluation | null; running: boolean; stale: boolean }>()
const emit = defineEmits<{ notice: [key: NoticeKey] }>()
const { t } = useI18n()
const view = shallowRef<'overview' | 'json'>('overview')
const views = computed(
  () =>
    [
      { value: 'overview', label: t('response.overview') },
      { value: 'json', label: 'JSON' },
    ] as const,
)
const jsonText = computed(() => (props.evaluation ? pretty(props.evaluation.response) : '{}'))
const rows = computed(() =>
  Object.entries(props.evaluation?.request.questions ?? {}).map(([id, question]) => ({
    id,
    question,
    answer: props.evaluation?.response.answers[id],
  })),
)
async function copy() {
  try {
    await navigator.clipboard.writeText(jsonText.value)
    emit('notice', 'copied')
  } catch {
    emit('notice', 'clipboard')
  }
}
function download() {
  const url = URL.createObjectURL(new Blob([jsonText.value], { type: 'application/json' }))
  const a = document.createElement('a')
  a.href = url
  a.download = 'browserjev-response.json'
  a.click()
  URL.revokeObjectURL(url)
}
</script>

<template>
  <section class="response-panel" :aria-busy="running">
    <PanelHeader :title="t('response.title')">
      <template v-if="evaluation" #default>
        <SegmentedControl v-model="view" :label="t('response.view')" :options="views" />
        <AppButton
          :label="t('response.copy')"
          :icon="Copy01Icon"
          icon-only
          variant="quiet"
          @click="copy"
        />
        <AppButton
          :label="t('response.download')"
          :icon="Download01Icon"
          icon-only
          variant="quiet"
          @click="download"
        />
      </template>
    </PanelHeader>
    <StatusMessage v-if="running" busy>{{ t('response.running') }}</StatusMessage>
    <StatusMessage v-else-if="stale" tone="warning">{{ t('response.stale') }}</StatusMessage>
    <template v-if="evaluation">
      <div v-if="view === 'json'" class="response-json">
        <CodeEditor :model-value="jsonText" :label="t('response.json')" readonly />
      </div>
      <div v-else class="answers">
        <template v-for="row in rows" :key="`${evaluation.createdAt}-${row.id}`">
          <AnswerCard
            v-if="row.answer"
            :id="row.id"
            :question="row.question"
            :answer="row.answer"
          />
        </template>
      </div>
      <footer class="response-foot">
        <TokenCount :label="t('response.input')" :count="evaluation.response.usage.input_tokens" />
        <TokenCount
          :label="t('response.output')"
          :count="evaluation.response.usage.output_tokens"
        />
        <span class="elapsed">{{ (evaluation.elapsedMs / 1000).toFixed(2) }} s</span>
      </footer>
    </template>
  </section>
</template>

<style scoped>
.response-panel {
  container: response / inline-size;
  height: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.answers {
  flex: 1;
  min-height: 0;
  overflow: auto;
}
.response-json {
  flex: 1;
  min-height: 0;
}
.response-foot {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 20px;
  padding: 16px 20px;
  font-size: var(--text-meta);
  color: var(--muted);
  border-top: 1px solid var(--border);
}
.elapsed {
  margin-left: auto;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}
</style>
