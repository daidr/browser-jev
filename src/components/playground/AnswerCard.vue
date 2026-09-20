<script setup lang="ts">
import { computed, shallowRef, useId } from 'vue'
import { useI18n } from 'vue-i18n'
import { HugeiconsIcon } from '@hugeicons/vue'
import { ArrowDown01Icon } from '@hugeicons/core-free-icons'
import { describe, type Answer, type Question } from '../../lib/contract'
import ProbabilityDistribution from './ProbabilityDistribution.vue'
const props = defineProps<{ id: string; question: Question; answer: Answer }>()
const { t } = useI18n()
const expanded = shallowRef(true)
const questionLabelId = useId()
const descriptionId = useId()
const resultsId = useId()
const items = computed(() => {
  const { answer, question } = props
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
        : question.type === 'choice' && question.criteria[key]
          ? `${key} · ${describe(question.criteria[key])}`
          : key,
  }))
})
</script>

<template>
  <article class="answer-card" :class="{ 'is-collapsed': !expanded }" :data-type="answer.type">
    <div class="answer-question">
      <div class="question-heading">
        <strong :id="questionLabelId" class="question-id">{{ id }}</strong>
        <span class="answer-type">{{ answer.type }}</span>
      </div>
      <div v-show="expanded" :id="descriptionId" class="question-details">
        <p class="instructions">{{ describe(question.instructions) }}</p>
        <p v-if="answer.type === 'score'" class="answer-value">
          <strong>{{ answer.score.toFixed(2) }}</strong>
          <span class="score-range">/ {{ Object.keys(answer.legend).length - 1 }}</span>
        </p>
      </div>
    </div>
    <button
      class="answer-toggle"
      type="button"
      :aria-expanded="expanded"
      :aria-controls="`${descriptionId} ${resultsId}`"
      :aria-labelledby="questionLabelId"
      @click="expanded = !expanded"
    >
      <HugeiconsIcon class="chevron" :icon="ArrowDown01Icon" :size="20" aria-hidden="true" />
    </button>
    <div v-show="expanded" :id="resultsId" class="answer-results">
      <ProbabilityDistribution :items="items" />
      <p v-if="answer.type !== 'noul'" class="confidence">
        <span>{{ t('response.confidence') }}</span>
        <span>{{ (answer.confidence * 100).toFixed(1) }}%</span>
      </p>
    </div>
  </article>
</template>

<style scoped>
.answer-card {
  display: grid;
  grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr) 32px;
  align-items: start;
  gap: 20px;
  padding: 20px;
  border-bottom: 1px solid var(--border);
  --answer-color: var(--blue);
  --answer-tint: #eef3ff;
}
.answer-card[data-type='noul'] {
  --answer-color: var(--teal);
  --answer-tint: #edf8f5;
}
.answer-card[data-type='score'] {
  --answer-color: #8260b0;
  --answer-tint: #f5effb;
}
.answer-question {
  grid-column: 1;
  grid-row: 1;
  min-width: 0;
}
.question-heading {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 12px;
  min-height: 32px;
}
.question-id {
  min-width: 0;
  font-family: var(--font-code);
  font-size: var(--text-body);
  font-weight: 600;
  overflow-wrap: anywhere;
}
.answer-type {
  flex-shrink: 0;
  padding: 3px 9px;
  border-radius: 6px;
  color: var(--answer-color);
  background: var(--answer-tint);
  font-size: var(--text-meta);
  text-transform: capitalize;
}
.chevron {
  flex-shrink: 0;
  transform: rotate(-90deg);
  transform-origin: center;
  transition: transform 180ms ease;
}
.answer-toggle[aria-expanded='true'] .chevron {
  transform: rotate(0deg);
}
.answer-toggle {
  grid-column: 3;
  grid-row: 1;
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  padding: 0;
  border: 0;
  border-radius: 6px;
  color: var(--muted);
  background: transparent;
  cursor: pointer;
}
.answer-toggle:hover {
  background: var(--surface-hover);
}
.answer-results {
  grid-column: 2;
  grid-row: 1;
  min-width: 0;
}
.is-collapsed .answer-question {
  grid-column: 1 / 3;
}
.instructions {
  margin: 10px 0 0;
  color: var(--muted);
  font-size: var(--text-meta);
  line-height: 1.6;
  overflow-wrap: anywhere;
}
.answer-value {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 8px;
  margin: 18px 0 0;
}
.answer-value > strong {
  font-size: var(--text-result);
  font-weight: 600;
  overflow-wrap: anywhere;
}
.score-range,
.confidence {
  color: var(--muted);
  font-size: var(--text-meta);
  font-weight: 400;
}
.confidence {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 8px 16px;
  margin: 16px 0 0;
  padding: 0 12px;
  color: var(--answer-color);
  font-variant-numeric: tabular-nums;
}
@container response (max-width: 420px) {
  .answer-card {
    grid-template-columns: minmax(0, 1fr) 32px;
    gap: 16px;
  }
  .answer-toggle {
    grid-column: 2;
  }
  .answer-results {
    grid-column: 1 / -1;
    grid-row: 2;
  }
  .is-collapsed .answer-question {
    grid-column: 1;
  }
}
</style>
