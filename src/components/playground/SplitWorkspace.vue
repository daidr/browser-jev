<script setup lang="ts">
import { computed, shallowRef, useTemplateRef } from 'vue'
import { useI18n } from 'vue-i18n'
const { t } = useI18n()
const props = defineProps<{ layout: 'columns' | 'rows' }>()
const split = shallowRef(50)
const dragging = shallowRef(false)
const workspace = useTemplateRef<HTMLDivElement>('workspace')
const splitStyle = computed(() =>
  props.layout === 'rows'
    ? {}
    : {
        gridTemplateColumns: `minmax(0, ${split.value}fr) 9px minmax(0, ${100 - split.value}fr)`,
      },
)
function resize(event: PointerEvent) {
  if (!dragging.value || !workspace.value || props.layout === 'rows') return
  const rect = workspace.value.getBoundingClientRect()
  split.value = Math.max(40, Math.min(60, ((event.clientX - rect.left) / rect.width) * 100))
}
function startResize(event: PointerEvent) {
  dragging.value = true
  ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
}
function keyboardResize(event: KeyboardEvent) {
  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
    event.preventDefault()
    split.value = Math.max(40, Math.min(60, split.value + (event.key === 'ArrowRight' ? 2 : -2)))
  }
}
</script>

<template>
  <div
    ref="workspace"
    :class="['workspace', { stacked: layout === 'rows', dragging }]"
    :style="splitStyle"
  >
    <div class="input-pane"><slot name="input" /></div>
    <div
      v-if="layout === 'columns'"
      class="resizer"
      role="separator"
      :aria-label="t('actions.resize')"
      aria-orientation="vertical"
      :aria-valuenow="Math.round(split)"
      :aria-valuemin="40"
      :aria-valuemax="60"
      tabindex="0"
      @pointerdown="startResize"
      @pointermove="resize"
      @pointerup="dragging = false"
      @pointercancel="dragging = false"
      @lostpointercapture="dragging = false"
      @keydown="keyboardResize"
    >
      <span />
    </div>
    <div class="output-pane"><slot name="output" /></div>
  </div>
</template>

<style scoped>
.workspace {
  flex: 1;
  min-height: 560px;
  display: grid;
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 10px;
  overflow: hidden;
}
.input-pane,
.output-pane {
  min-width: 0;
  min-height: 0;
}
.input-pane {
  display: flex;
  flex-direction: column;
}
.resizer {
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: col-resize;
  background: #f8fafd;
  border-inline: 1px solid var(--border);
  touch-action: none;
}
.resizer span {
  width: 2px;
  height: 32px;
  background: #c4cfe1;
  border-radius: 2px;
}
.resizer:hover,
.resizer:focus-visible {
  background: #e4ecfd;
}
.dragging {
  cursor: col-resize;
  user-select: none;
}
.stacked {
  display: flex;
  flex-direction: column;
  flex: none;
}
.stacked .input-pane {
  height: 700px;
  border-bottom: 1px solid var(--border);
}
.stacked .output-pane {
  height: 600px;
}
@media (max-width: 960px) {
  .workspace {
    display: flex;
    flex-direction: column;
    flex: none;
  }
  .resizer {
    display: none;
  }
  .input-pane {
    height: 700px;
    border-bottom: 1px solid var(--border);
  }
  .output-pane {
    height: 600px;
  }
}
</style>
