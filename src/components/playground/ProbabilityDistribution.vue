<script setup lang="ts">
defineProps<{ items: { key: string; label: string; value: number }[] }>()
</script>

<template>
  <dl class="distribution">
    <div
      v-for="item in items"
      :key="item.key"
      class="probability"
      :style="{ '--probability': `${item.value * 100}%` }"
    >
      <dt>{{ item.label }}</dt>
      <dd>{{ (item.value * 100).toFixed(1) }}%</dd>
    </div>
  </dl>
</template>

<style scoped>
.distribution {
  display: grid;
  gap: 10px;
  margin: 0;
}
.probability {
  display: grid;
  grid-template-columns: minmax(0, 1fr) max-content;
  align-items: baseline;
  gap: 16px;
  padding: 12px 14px;
  border-radius: 8px;
  background: linear-gradient(
    to right,
    var(--answer-tint, #eef3ff) 0 var(--probability),
    transparent var(--probability) 100%
  );
  font-size: var(--text-meta);
  line-height: 1.5;
}
dt {
  min-width: 0;
  overflow-wrap: anywhere;
  color: var(--muted);
}
dd {
  margin: 0;
  color: var(--answer-color, var(--blue));
  text-align: right;
  font-variant-numeric: tabular-nums;
}
</style>
