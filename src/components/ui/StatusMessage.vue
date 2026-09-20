<script setup lang="ts">
import { Cancel01Icon } from '@hugeicons/core-free-icons'
import AppButton from './AppButton.vue'
import { useI18n } from 'vue-i18n'
const { t } = useI18n()
withDefaults(
  defineProps<{ tone?: 'neutral' | 'error' | 'warning'; busy?: boolean; dismissible?: boolean }>(),
  { tone: 'neutral' },
)
const emit = defineEmits<{ dismiss: [] }>()
</script>

<template>
  <div class="status-message" :data-tone="tone" :role="tone === 'error' ? 'alert' : 'status'">
    <span v-if="busy" class="spinner" aria-hidden="true" />
    <div class="message-content"><slot /></div>
    <AppButton
      v-if="dismissible"
      :icon="Cancel01Icon"
      :label="t('actions.dismiss')"
      variant="quiet"
      icon-only
      @click="emit('dismiss')"
    />
  </div>
</template>

<style scoped>
.status-message {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 20px;
  color: var(--muted);
  background: #f7f9fc;
  font-size: var(--text-meta);
  line-height: 1.6;
}
.message-content {
  flex: 1;
  min-width: 0;
  overflow-wrap: anywhere;
}
[data-tone='error'] {
  color: #a43c30;
  background: #fff2ee;
}
[data-tone='warning'] {
  color: #88601e;
  background: #fff8e8;
}
</style>
