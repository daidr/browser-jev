<script setup lang="ts">
import { computed } from 'vue'
const props = defineProps<{ items: { key: string; label: string; value: number }[] }>()
const sortedItems = computed(() => [...props.items].sort((a, b) => b.value - a.value))
const highestProbability = computed(() => sortedItems.value[0]?.value)
</script>

<template>
  <dl class="distribution">
    <div
      v-for="item in sortedItems"
      :key="item.key"
      class="probability"
      :class="{ 'is-highest': item.value === highestProbability }"
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
  gap: 6px;
  margin: 0;
}
.probability {
  display: grid;
  grid-template-columns: minmax(0, 1fr) max-content;
  align-items: baseline;
  gap: 12px;
  padding: 7px 12px;
  border-radius: 6px;
  background: linear-gradient(
    to right,
    var(--answer-tint, #eef3ff) 0 var(--probability),
    transparent var(--probability) 100%
  );
  font-size: var(--text-meta);
  line-height: 1.5;
  color: rgb(0 0 0 / 50%);
}
.is-highest {
  color: #000;
}
dt {
  min-width: 0;
  overflow-wrap: anywhere;
}
dd {
  margin: 0;
  text-align: right;
  font-variant-numeric: tabular-nums;
}
</style>
