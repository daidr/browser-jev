<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { HugeiconsIcon } from '@hugeicons/vue'
import { ArrowDown01Icon } from '@hugeicons/core-free-icons'
import { describe, type Answer, type Question } from '../../lib/contract'
import ProbabilityDistribution from './ProbabilityDistribution.vue'
const props = defineProps<{ id: string; question: Question; answer: Answer }>()
const { t } = useI18n()
const items = computed(() => {
  const { answer, question } = props
  if (answer.type === 'noul')
    return [
      { key: 'true', label: t('response.true'), value: answer.noul },
      { key: 'false', label: t('response.false'), value: 1 - answer.noul },
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
  <details class="answer-card" :data-type="answer.type" open>
    <summary>
      <strong>{{ id }}</strong
      ><span class="answer-type">{{ answer.type }}</span>
      <HugeiconsIcon class="chevron" :icon="ArrowDown01Icon" :size="20" aria-hidden="true" />
    </summary>
    <div class="answer-content">
      <p class="instructions">{{ describe(question.instructions) }}</p>
      <div v-if="answer.type !== 'noul'" class="answer-value">
        <strong v-if="answer.type === 'choice'">{{ answer.choice }}</strong>
        <strong v-else
          >{{ answer.score.toFixed(2) }}
          <span class="score-range">/ {{ Object.keys(answer.legend).length - 1 }}</span></strong
        >
        <span class="confidence"
          >{{ t('response.confidence') }} {{ (answer.confidence * 100).toFixed(1) }}%</span
        >
      </div>
      <ProbabilityDistribution :items="items" />
    </div>
  </details>
</template>

<style scoped>
.answer-card {
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
summary {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 20px;
  cursor: pointer;
  list-style: none;
}
summary::-webkit-details-marker {
  display: none;
}
summary strong {
  flex: 1;
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
  color: var(--muted);
  transform: rotate(-90deg);
  transform-origin: center;
  transition: transform 180ms ease;
}
.answer-card[open] > summary .chevron {
  transform: rotate(0deg);
}
.answer-content {
  padding: 0 20px 24px;
}
.instructions {
  margin: 0 0 22px;
  color: var(--muted);
  font-size: var(--text-meta);
  line-height: 1.6;
  overflow-wrap: anywhere;
}
.answer-value {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 24px;
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
</style>
