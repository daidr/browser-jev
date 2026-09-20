<script setup lang="ts" generic="T extends string">
import { HugeiconsIcon } from '@hugeicons/vue'
import type Add01Icon from '@hugeicons/core-free-icons/Add01Icon'
const model = defineModel<T>({ required: true })
defineProps<{
  label: string
  options: readonly { value: T; label: string; title?: string; icon?: typeof Add01Icon }[]
  iconOnly?: boolean
  disabled?: boolean
}>()
</script>

<template>
  <div class="segmented-control" role="group" :aria-label="label">
    <button
      v-for="option in options"
      :key="option.value"
      type="button"
      :disabled="disabled"
      :aria-pressed="model === option.value"
      :aria-label="option.label"
      :title="option.title ?? (iconOnly ? option.label : undefined)"
      :class="{ 'icon-only': iconOnly }"
      @click="model = option.value"
    >
      <HugeiconsIcon v-if="option.icon" :icon="option.icon" :size="20" aria-hidden="true" />
      <span v-if="!iconOnly">{{ option.label }}</span>
    </button>
  </div>
</template>

<style scoped>
.segmented-control {
  display: inline-flex;
  max-width: 100%;
  padding: 3px;
  gap: 2px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: #f2f5f9;
}
button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 38px;
  padding: 6px 12px;
  border: 0;
  border-radius: 5px;
  background: transparent;
  color: var(--muted);
  font-size: var(--text-meta);
  line-height: 1.4;
  cursor: pointer;
}
button[aria-pressed='true'] {
  color: var(--ink);
  background: #fff;
  box-shadow: 0 1px 3px #20283c16;
}
.icon-only {
  width: 40px;
  padding: 0;
}
</style>
