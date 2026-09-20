<script setup lang="ts">
defineProps<{ title: string }>()
</script>

<template>
  <header class="panel-header">
    <h2>{{ title }}</h2>
    <div v-if="$slots.default" class="panel-actions"><slot /></div>
  </header>
</template>

<style scoped>
.panel-header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px 16px;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}
h2 {
  margin: 0;
  font-size: var(--text-heading);
  font-weight: 600;
  line-height: 1.4;
}
.panel-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  min-width: 0;
}
</style>
