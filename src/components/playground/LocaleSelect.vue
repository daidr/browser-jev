<script setup lang="ts">
import { useI18n } from 'vue-i18n'
const { locale, t } = useI18n()
</script>

<template>
  <select v-model="locale" class="control-select" :aria-label="t('actions.language')">
    <option value="en" lang="en">English</option>
    <option value="zh-CN" lang="zh-CN">中文</option>
  </select>
</template>
