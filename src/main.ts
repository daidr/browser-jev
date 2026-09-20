import { createApp, watch } from 'vue'
import { createAppI18n, LOCALE_KEY, readLocale } from './i18n'
import App from './App.vue'
import './style.css'

let locale: 'en' | 'zh-CN' = 'en'
try {
  locale = readLocale(localStorage)
} catch {
  /* Storage can be blocked. */
}
const i18n = createAppI18n(locale)
watch(
  i18n.global.locale,
  (value) => {
    document.documentElement.lang = value
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute('content', i18n.global.t('app.description'))
    try {
      localStorage.setItem(LOCALE_KEY, value)
    } catch {
      /* Language switching still works. */
    }
  },
  { immediate: true },
)
createApp(App).use(i18n).mount('#app')
