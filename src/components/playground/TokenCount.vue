<script setup lang="ts">
import { useI18n } from 'vue-i18n'
const { locale } = useI18n()
defineProps<{ label: string; count?: number }>()
</script>

<template>
  <span class="token-count"
    >{{ label }}
    {{ count === undefined ? 'N/A token' : `${count.toLocaleString(locale)} tokens` }}</span
  >
</template>

<style scoped>
.token-count {
  font-size: var(--text-meta);
  font-variant-numeric: tabular-nums;
}
</style>
