<script setup lang="ts">
defineProps<{ items: { key: string; label: string; value: number }[] }>()
</script>

<template>
  <dl class="distribution">
    <div v-for="item in items" :key="item.key" class="probability">
      <dt>{{ item.label }}</dt>
      <dd>
        {{ (item.value * 100).toFixed(1) }}%
        <span class="bar-track" aria-hidden="true">
          <span class="bar" :style="{ width: `${item.value * 100}%` }" />
        </span>
      </dd>
    </div>
  </dl>
</template>

<style scoped>
.distribution {
  display: grid;
  gap: 18px;
  margin: 0;
}
.probability {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr) max-content;
  align-items: baseline;
  gap: 16px;
  padding-bottom: 14px;
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
  flex-shrink: 0;
  font-variant-numeric: tabular-nums;
}
.bar-track {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 6px;
  border-radius: 3px;
  background: #edf1f7;
  overflow: hidden;
}
.bar {
  display: block;
  height: 100%;
  background: var(--answer-color, var(--blue));
  border-radius: inherit;
}
</style>
