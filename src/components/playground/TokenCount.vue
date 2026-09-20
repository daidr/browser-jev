<script setup lang="ts">
defineProps<{ label: string; count?: number }>()
</script>

<template>
  <span class="token-count"
    >{{ label }} {{ count === undefined ? 'N/A token' : `${count.toLocaleString()} tokens` }}</span
  >
</template>

<style scoped>
.token-count {
  font-size: var(--text-meta);
  font-variant-numeric: tabular-nums;
}
</style>
