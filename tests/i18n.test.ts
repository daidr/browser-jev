import { expect, test } from 'bun:test'
import { createAppI18n, localizedError, readLocale } from '../src/i18n'
import en from '../src/i18n/en'
import zhCN from '../src/i18n/zh-CN'
import { AppError, errorMessages } from '../src/lib/errors'
import { getExamples, questionTemplate } from '../src/lib/examples'
import { validateRequest } from '../src/lib/contract'

test('locale defaults to English and safely restores only supported saved choices', () => {
  expect(createAppI18n().global.locale.value).toBe('en')
  for (const stored of [null, 'en', 'fr', '', 'ZH'])
    expect(readLocale({ getItem: () => stored })).toBe('en')
  expect(readLocale({ getItem: () => 'zh-CN' })).toBe('zh-CN')
  expect(
    readLocale({
      getItem: () => {
        throw new Error('blocked')
      },
    }),
  ).toBe('en')
})

test('both catalogs cover the same UI and domain error messages with working interpolation', () => {
  for (const section of Object.keys(en) as (keyof typeof en)[]) {
    expect(Object.keys(zhCN[section]).sort()).toEqual(Object.keys(en[section]).sort())
  }
  for (const locale of ['en', 'zh-CN'] as const) {
    const { t } = createAppI18n(locale).global
    for (const code of Object.keys(errorMessages) as (keyof typeof errorMessages)[]) {
      const error = new AppError(code, { input: 12, limit: 10 }, 'questions.item')
      const message = localizedError(error, t)
      expect(message).toStartWith('questions.item: ')
      expect(message).not.toContain(`errors.${code}`)
      expect(message).not.toContain('{input}')
    }
    expect(localizedError(new DOMException('', 'NotAllowedError'), t)).toBe(t('errors.notAllowed'))
  }
})

test('localized examples preserve Jev structure, IDs, candidate keys, and valid question templates', () => {
  const english = getExamples('en')
  const chinese = getExamples('zh-CN')
  expect(chinese.map((example) => example.id)).toEqual(english.map((example) => example.id))
  for (const [index, example] of english.entries()) {
    const translation = chinese[index]!
    expect(translation.title).not.toBe(example.title)
    expect(translation.request.state).not.toEqual(example.request.state)
    expect(Object.keys(translation.request.questions)).toEqual(
      Object.keys(example.request.questions),
    )
    for (const [id, question] of Object.entries(example.request.questions)) {
      const translated = translation.request.questions[id]!
      expect(translated.type).toBe(question.type)
      expect(translated.instructions).not.toEqual(question.instructions)
      if (question.type === 'choice' && translated.type === 'choice') {
        expect(Object.keys(translated.criteria)).toEqual(Object.keys(question.criteria))
      }
    }
    for (const item of [example, translation])
      expect(() =>
        validateRequest({ ...item.request, state: item.request.state ?? '' }),
      ).not.toThrow()
  }
  for (const locale of ['en', 'zh-CN']) {
    for (const type of ['noul', 'choice', 'score'] as const) {
      expect(() =>
        validateRequest({
          model: 'jev-latest',
          state: '',
          questions: { test: questionTemplate(type, locale) },
        }),
      ).not.toThrow()
    }
  }
})
