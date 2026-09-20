<script setup lang="ts">
import { HugeiconsIcon } from '@hugeicons/vue'
import type { Add01Icon } from '@hugeicons/core-free-icons'
withDefaults(
  defineProps<{
    label: string
    icon?: typeof Add01Icon
    iconOnly?: boolean
    variant?: 'default' | 'primary' | 'quiet'
    disabled?: boolean
  }>(),
  { variant: 'default', iconOnly: false, disabled: false },
)
const emit = defineEmits<{ click: [event: MouseEvent] }>()
</script>

<template>
  <button
    type="button"
    :class="['app-button', variant, { 'icon-only': iconOnly }]"
    :disabled="disabled"
    :aria-label="iconOnly ? label : undefined"
    :title="iconOnly ? label : undefined"
    @click="emit('click', $event)"
  >
    <HugeiconsIcon v-if="icon" :icon="icon" :size="20" aria-hidden="true" />
    <span v-if="!iconOnly">{{ label }}</span>
  </button>
</template>

<style scoped>
.app-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 44px;
  padding: 9px 14px;
  border: 1px solid var(--border);
  border-radius: 7px;
  color: var(--ink);
  background: #fff;
  font-size: var(--text-meta);
  font-weight: 500;
  line-height: 1.4;
  cursor: pointer;
  white-space: nowrap;
}
.app-button:hover:not(:disabled) {
  background: var(--surface-hover);
  border-color: #b9c7dd;
}
.primary {
  color: #fff;
  background: var(--blue);
  border-color: var(--blue);
}
.primary:hover:not(:disabled) {
  background: #244bd1;
  border-color: #244bd1;
}
.quiet {
  color: var(--muted);
  background: transparent;
  border-color: transparent;
}
.icon-only {
  width: 44px;
  padding: 0;
  flex-shrink: 0;
}
</style>
