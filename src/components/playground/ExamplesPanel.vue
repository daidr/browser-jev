<script setup lang="ts">
import { ArrowUpRight } from 'lucide-vue-next'
import { examples, type Example } from '../../lib/examples'
defineProps<{ disabled: boolean }>()
const emit = defineEmits<{ select: [example: Example] }>()
</script>

<template>
  <section class="examples-panel" aria-label="示例">
    <header class="panel-header">
      <div class="section-heading"><h2>示例</h2></div>
    </header>
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
          ><small>{{ example.description }}</small></span
        >
        <ArrowUpRight :size="16" />
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
  padding: 8px 18px;
  overflow: auto;
}
.example {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 20px 8px;
  border: 0;
  border-bottom: 1px solid var(--border);
  background: transparent;
  text-align: left;
  color: #75849e;
  cursor: pointer;
}
.example:last-child {
  border-bottom: 0;
}
.example:hover:not(:disabled) {
  background: #f8faff;
}
.example strong {
  display: block;
  color: var(--ink);
  font-size: 12px;
  font-weight: 500;
}
.example small {
  display: block;
  margin-top: 7px;
  font-size: 11px;
  color: #8993a5;
  line-height: 1.7;
}
</style>
