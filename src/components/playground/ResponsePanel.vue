<script setup lang="ts">
import { computed, defineAsyncComponent, shallowRef } from 'vue'
import { HugeiconsIcon } from '@hugeicons/vue'
import {
  Tick02Icon,
  Copy01Icon,
  Download01Icon,
  Activity01Icon,
  ArrowDown01Icon,
} from '@hugeicons/core-free-icons'
import { describe, pretty, type JevRequest, type Answer, type Question } from '../../lib/contract'
import type { Evaluation } from '../../lib/prompt-api'
const CodeEditor = defineAsyncComponent(() => import('./CodeEditor.vue'))
const props = defineProps<{
  evaluation: Evaluation | null
  request: JevRequest | null
  running: boolean
  stale: boolean
}>()
const emit = defineEmits<{ notice: [text: string] }>()
const view = shallowRef<'overview' | 'json'>('overview')
const jsonText = computed(() => (props.evaluation ? pretty(props.evaluation.response) : '{}'))
const rows = computed(() =>
  Object.entries(props.evaluation?.request.questions ?? props.request?.questions ?? {}).map(
    ([id, question]) => ({ id, question, answer: props.evaluation?.response.answers[id] }),
  ),
)
const percent = (value: number) => `${(value * 100).toFixed(1)}%`
function values(answer: Answer, question: Question) {
  if (answer.type === 'noul')
    return [
      { key: 'true', label: 'True', value: answer.noul },
      { key: 'false', label: 'False', value: 1 - answer.noul },
    ]
  return Object.entries(answer.probabilities).map(([key, value]) => ({
    key,
    value,
    label:
      answer.type === 'score'
        ? `${key} · ${describe(answer.legend[key])}`
        : question.type === 'choice'
          ? `${key}${question.criteria[key] ? ` · ${describe(question.criteria[key])}` : ''}`
          : key,
  }))
}
async function copy() {
  try {
    await navigator.clipboard.writeText(jsonText.value)
    emit('notice', '响应 JSON 已复制。')
  } catch {
    emit('notice', '无法访问剪贴板，可以切换 JSON 视图手动复制。')
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
    <header class="panel-header">
      <div class="section-heading">
        <HugeiconsIcon :icon="Activity01Icon" :size="15" aria-hidden="true" />
        <h2>Response</h2>
        <span v-if="evaluation" class="success-tag"
          ><HugeiconsIcon :icon="Tick02Icon" :size="11" aria-hidden="true" />已完成</span
        >
      </div>
      <div class="segmented small">
        <button :aria-pressed="view === 'overview'" @click="view = 'overview'">概览</button
        ><button :aria-pressed="view === 'json'" @click="view = 'json'">JSON</button>
      </div>
    </header>
    <div v-if="running" class="running-banner" role="status">
      <span class="spinner" />正在本地评估
      {{ Object.keys(request?.questions ?? {}).length }} 个问题…<small v-if="evaluation"
        >下方显示上次结果</small
      >
    </div>
    <div v-if="stale" class="stale-banner">输入已修改。下方为上次运行的快照，请重新运行。</div>
    <template v-if="evaluation">
      <div class="response-meta">
        <span class="provider"><span class="status-dot" />Chrome Prompt API</span
        ><span>{{ (evaluation.elapsedMs / 1000).toFixed(2) }} s</span
        ><button class="icon-button" aria-label="复制响应 JSON" title="复制响应 JSON" @click="copy">
          <HugeiconsIcon :icon="Copy01Icon" :size="14" aria-hidden="true" /></button
        ><button
          class="icon-button"
          aria-label="下载响应 JSON"
          title="下载响应 JSON"
          @click="download"
        >
          <HugeiconsIcon :icon="Download01Icon" :size="14" aria-hidden="true" />
        </button>
      </div>
      <div v-if="view === 'json'" class="response-json">
        <CodeEditor :model-value="jsonText" label="响应 JSON" readonly />
      </div>
      <div v-else class="answers">
        <details
          v-for="row in rows"
          :key="`${evaluation.createdAt}-${row.id}`"
          class="answer-row"
          open
        >
          <summary class="answer-summary">
            <span class="answer-title"
              ><strong>{{ row.id }}</strong
              ><span class="question-instructions">{{
                describe(row.question.instructions)
              }}</span></span
            ><span :class="['type-badge', row.question.type]">{{ row.question.type }}</span
            ><HugeiconsIcon :icon="ArrowDown01Icon" :size="14" aria-hidden="true" />
          </summary>
          <template v-if="row.answer">
            <div class="answer-value">
              <strong v-if="row.answer.type === 'noul'"
                >{{ percent(row.answer.noul) }}<small>True</small></strong
              ><strong v-else-if="row.answer.type === 'choice'">{{ row.answer.choice }}</strong
              ><strong v-else
                >{{ row.answer.score.toFixed(2)
                }}<small>/ {{ Object.keys(row.answer.legend).length - 1 }}</small></strong
              ><span
                v-if="row.answer.type !== 'noul'"
                class="confidence"
                title="1 − 归一化信息熵；衡量估计分布的集中程度，不是校准置信度"
                >Confidence <b>{{ percent(row.answer.confidence) }}</b></span
              ><span v-else class="confidence">命题为真的估计概率</span>
            </div>
            <div class="distribution" :class="row.question.type">
              <div
                v-for="item in values(row.answer, row.question)"
                :key="item.key"
                class="probability-row"
              >
                <div class="probability-label">
                  <span :title="item.label">{{ item.label }}</span
                  ><b>{{ percent(item.value) }}</b>
                </div>
                <div class="bar-track">
                  <div class="bar" :style="{ width: percent(item.value) }" />
                </div>
              </div>
            </div>
          </template>
        </details>
      </div>
      <footer class="response-foot">
        <span v-if="evaluation.response.usage.input_tokens !== undefined"
          >输入 {{ evaluation.response.usage.input_tokens.toLocaleString() }} tokens</span
        ><span v-else>输入 token 数未提供</span><span>输出 token 数未提供</span>
      </footer>
    </template>
    <div v-else class="empty-result">
      <div v-if="rows.length" class="preview-list">
        <span class="preview-title">本次将评估</span>
        <div v-for="row in rows" :key="row.id" class="preview-row">
          <span :class="['preview-marker', row.question.type]" /><span>{{ row.id }}</span
          ><span :class="['type-badge', row.question.type]">{{ row.question.type }}</span
          ><span class="placeholder-value">—</span>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.response-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.success-tag {
  display: flex;
  align-items: center;
  gap: 3px;
  color: var(--teal);
  font-size: 9px;
}
.response-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 18px;
  border-bottom: 1px solid var(--border);
  color: var(--muted);
  font-size: 10px;
}
.provider {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-right: auto;
  color: #68758c;
}
.provider .status-dot {
  color: var(--teal);
}
.response-meta .icon-button {
  padding: 4px;
}
.answers {
  flex: 1;
  min-height: 0;
  overflow: auto;
}
.answer-row {
  padding: 18px 22px 20px;
  border-bottom: 1px solid var(--border);
}
.answer-summary {
  display: flex;
  align-items: flex-start;
  gap: 9px;
  cursor: pointer;
  list-style: none;
}
.answer-summary::-webkit-details-marker {
  display: none;
}
.answer-title {
  min-width: 0;
  flex: 1;
}
.answer-title strong {
  font-family: var(--font-code);
  font-size: 12px;
  font-weight: 600;
  overflow-wrap: anywhere;
}
.question-instructions {
  display: block;
  font-size: 10px;
  line-height: 1.6;
  color: var(--muted);
  margin-top: 5px;
  overflow-wrap: anywhere;
}
.answer-value {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin: 18px 0 15px;
}
.answer-value > strong {
  font-size: 24px;
  letter-spacing: -0.5px;
  font-weight: 550;
  overflow-wrap: anywhere;
}
.answer-value small {
  color: #8f99aa;
  font-size: 11px;
  font-weight: 400;
  margin-left: 7px;
  letter-spacing: 0;
}
.confidence {
  font-size: 9px;
  color: var(--muted);
  text-align: right;
  flex-shrink: 0;
}
.confidence b {
  color: #566681;
  font-weight: 500;
  display: block;
  margin-top: 4px;
  font-size: 11px;
}
.distribution {
  background: none;
}
.probability-row + .probability-row {
  margin-top: 12px;
}
.probability-label {
  display: flex;
  gap: 15px;
  align-items: baseline;
  justify-content: space-between;
  font-size: 10px;
  margin-bottom: 6px;
}
.probability-label > span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #67738b;
}
.probability-label b {
  color: #57667f;
  font-weight: 500;
  flex-shrink: 0;
  font-variant-numeric: tabular-nums;
}
.bar-track {
  height: 5px;
  border-radius: 3px;
  background: #eff2f7;
  overflow: hidden;
}
.bar {
  height: 100%;
  background: var(--blue);
  border-radius: inherit;
}
.noul .bar {
  background: #4a9d92;
}
.score .bar {
  background: #9c83c6;
}
.response-foot {
  display: flex;
  gap: 15px;
  justify-content: space-between;
  padding: 10px 18px;
  font-size: 9px;
  color: #8c96a7;
  border-top: 1px solid var(--border);
}
.response-json {
  flex: 1;
  min-height: 180px;
}
.empty-result {
  flex: 1;
  overflow: auto;
  padding: 24px 20px;
}
.preview-list {
  width: 100%;
}
.preview-title {
  font-size: 10px;
  color: #929bad;
  display: block;
  margin-bottom: 12px;
}
.preview-row {
  display: flex;
  gap: 9px;
  align-items: center;
  padding: 13px 0;
  border-bottom: 1px solid #eef1f6;
  font-size: 10px;
}
.preview-row > span:nth-child(2) {
  font-family: var(--font-code);
  margin-right: auto;
  overflow-wrap: anywhere;
}
.preview-marker {
  width: 6px;
  height: 6px;
  border-radius: 2px;
  flex-shrink: 0;
  background: currentColor !important;
}
.placeholder-value {
  color: #b3bbca;
  padding: 0 4px;
}
.running-banner,
.stale-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  font-size: 10px;
  line-height: 1.7;
}
.running-banner {
  background: #eef3ff;
  color: var(--blue);
}
.running-banner small {
  margin-left: auto;
}
.stale-banner {
  background: #fffaeb;
  color: #987230;
}
@media (max-width: 1100px) {
  .answer-row {
    padding-inline: 16px;
  }
  .empty-result {
    padding-inline: 20px;
  }
}
</style>
