<script setup lang="ts">
import { HugeiconsIcon } from '@hugeicons/vue'
import { ArrowRight01Icon } from '@hugeicons/core-free-icons'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { getExamples, type Example } from '../../lib/examples'
import PanelHeader from '../ui/PanelHeader.vue'
defineProps<{ disabled: boolean }>()
const emit = defineEmits<{ select: [example: Example] }>()
const { locale, t } = useI18n()
const examples = computed(() => getExamples(locale.value))
</script>

<template>
  <section class="examples-panel" :aria-label="t('examples.title')">
    <PanelHeader :title="t('examples.title')" />
    <div class="examples">
      <button
        v-for="example in examples"
        :key="example.id"
        class="example"
        :disabled="disabled"
        @click="emit('select', example)"
      >
        <span
          ><strong>{{ example.title }}</strong
          ><span class="description">{{ example.description }}</span></span
        >
        <HugeiconsIcon :icon="ArrowRight01Icon" :size="20" aria-hidden="true" />
      </button>
    </div>
  </section>
</template>

<style scoped>
.examples-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}
.examples {
  overflow: auto;
}
.example {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 24px 20px;
  border: 0;
  border-bottom: 1px solid var(--border);
  background: transparent;
  text-align: left;
  color: var(--muted);
  cursor: pointer;
}
.example:last-child {
  border-bottom: 0;
}
.example:hover:not(:disabled),
.example:focus-visible {
  background: var(--surface-hover);
}
.example > span {
  min-width: 0;
  overflow-wrap: anywhere;
}
.example strong {
  display: block;
  color: var(--ink);
  font-size: var(--text-body);
  font-weight: 600;
}
.description {
  display: block;
  margin-top: 7px;
  font-size: var(--text-meta);
  color: var(--muted);
  line-height: 1.6;
}
</style>
