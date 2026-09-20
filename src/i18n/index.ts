import { createI18n } from 'vue-i18n'
import { AppError, type ErrorCode } from '../lib/errors'
import en from './en'
import zhCN from './zh-CN'

export type AppLocale = 'en' | 'zh-CN'
export type NoticeKey = keyof typeof en.notices
export const LOCALE_KEY = 'browserjev.locale.v1'
export function readLocale(storage?: Pick<Storage, 'getItem'>): AppLocale {
  try {
    return storage?.getItem(LOCALE_KEY) === 'zh-CN' ? 'zh-CN' : 'en'
  } catch {
    return 'en'
  }
}
export function createAppI18n(locale: AppLocale = 'en') {
  return createI18n({
    legacy: false,
    locale,
    fallbackLocale: 'en',
    globalInjection: false,
    messages: { en, 'zh-CN': zhCN },
  })
}
export function localizedError(
  error: unknown,
  t: (key: string, params: Record<string, string | number>) => string,
): string {
  if (error instanceof AppError) {
    const message = t(`errors.${error.code}`, error.params)
    return error.path ? `${error.path}: ${message}` : message
  }
  if (error instanceof Error) {
    const codes: Record<string, ErrorCode> = {
      AbortError: 'aborted',
      NotAllowedError: 'notAllowed',
      NotSupportedError: 'notSupported',
      QuotaExceededError: 'quota',
    }
    const code = codes[error.name]
    return code ? t(`errors.${code}`, {}) : error.message
  }
  return String(error)
}
