import { afterEach, expect, jest, mock, test } from 'bun:test'
import { setImmediate } from 'node:timers'
import { createRenderer, nextTick } from 'vue'
import { usePlayground } from '../src/composables/usePlayground'
import { examples, getExamples, questionTemplate } from '../src/lib/examples'
import { createAppI18n, readLocale } from '../src/i18n'
import type { Availability, ModelFactory, ModelSession, PromptOptions } from '../src/lib/prompt-api'
import type { UserActivationSource } from '../src/lib/user-activation'

// Mount only the composable so Vue runs its real lifecycle without a browser or DOM shim.
const renderer = createRenderer<object, object>({
  createElement: () => ({}),
  createText: () => ({}),
  createComment: () => ({}),
  insert() {},
  remove() {},
  setText() {},
  setElementText() {},
  patchProp() {},
  parentNode: () => null,
  nextSibling: () => null,
})
const cleanup: (() => void)[] = []
afterEach(() => {
  cleanup.splice(0).forEach((unmount) => unmount())
  jest.useRealTimers()
})

class Session extends EventTarget implements ModelSession {
  destroyed = false
  children: Session[] = []
  calls = 0
  respond: (options: PromptOptions) => Promise<string> = async () => '{"q0":0.8}'
  async clone() {
    if (this.destroyed) throw new Error('Base session destroyed')
    const child = new Session()
    child.respond = this.respond
    this.children.push(child)
    return child
  }
  async prompt(_input: string, options: PromptOptions) {
    this.calls++
    return this.respond(options)
  }
  destroy() {
    this.destroyed = true
  }
}

function model(availability: Availability = 'downloadable') {
  const monitors: EventTarget[] = []
  const bases: Session[] = []
  const createSignals: AbortSignal[] = []
  const downloads: ReturnType<typeof Promise.withResolvers<ModelSession>>[] = []
  let pending = true
  const factory: ModelFactory = {
    availability: async () => availability,
    create(options) {
      const monitor = new EventTarget()
      monitors.push(monitor)
      options.monitor?.(monitor)
      const base = new Session()
      bases.push(base)
      createSignals.push(options.signal!)
      options.signal?.addEventListener('abort', () => base.destroy())
      if (!pending) return Promise.resolve(base)
      const download = Promise.withResolvers<ModelSession>()
      downloads.push(download)
      return download.promise
    },
  }
  return {
    factory,
    bases,
    downloads,
    createSignals,
    ready() {
      pending = false
    },
    progress(value: number, index = monitors.length - 1) {
      monitors[index]!.dispatchEvent(
        Object.assign(new Event('downloadprogress'), { loaded: value }),
      )
    },
    finish(index = downloads.length - 1) {
      downloads[index]!.resolve(bases[index]!)
    },
  }
}

function activationSource(active = false) {
  const listeners = new Set<() => void>()
  return {
    hasBeenActive: () => active,
    subscribe(callback: () => void) {
      listeners.add(callback)
      return () => {
        listeners.delete(callback)
      }
    },
    activate() {
      active = true
      for (const listener of [...listeners]) listener()
    },
    listeners,
  } satisfies UserActivationSource & { activate: () => void; listeners: Set<() => void> }
}

const flushPromises = () => new Promise<void>((resolve) => setImmediate(resolve))

async function mount(
  factory?: ModelFactory,
  secure = true,
  stored = new Map<string, string>(),
  activation = activationSource(),
  availabilityTimeoutMs?: number,
) {
  let playground!: ReturnType<typeof usePlayground>
  const i18n = createAppI18n(readLocale({ getItem: (key) => stored.get(key) ?? null }))
  const app = renderer.createApp({
    setup() {
      playground = usePlayground({
        getFactory: () => factory,
        availabilityTimeoutMs,
        isSecureContext: () => secure,
        userActivation: activation,
        storage: {
          getItem: (key) => stored.get(key) ?? null,
          setItem: (key, value) => {
            stored.set(key, value)
          },
        },
      })
      return () => null
    },
  })
  app.use(i18n)
  app.mount({})
  cleanup.push(() => app.unmount())
  await flushPromises()
  return { playground, stored, app, i18n, activation }
}

test('page entry warms an available model without a run, modal, or history entry', async () => {
  const m = model('available')
  const { playground: p, activation, stored } = await mount(m.factory)
  expect(m.bases).toHaveLength(1)
  expect(activation.hasBeenActive()).toBe(false)
  expect(activation.listeners.size).toBe(0)
  expect(p.phase.value).toBe('idle')
  expect(p.busy.value).toBe(false)
  p.addQuestion('noul')
  expect(p.canRun.value).toBe(true)
  m.finish()
  await flushPromises()
  expect(p.phase.value).toBe('ready')
  expect(m.bases[0]!.children).toHaveLength(0)
  expect(p.evaluation.value).toBeNull()
  expect(stored.has('browserjev.history.v1')).toBe(false)
  const running = p.run()
  expect(p.phase.value).toBe('running')
  await running
  expect(m.bases).toHaveLength(1)
  expect(p.history.value).toHaveLength(1)
})

test('first interaction downloads silently; Run joins preparation at its current progress', async () => {
  const m = model()
  const { playground: p, activation } = await mount(m.factory)
  expect(m.bases).toHaveLength(0)
  expect(activation.listeners.size).toBe(1)
  activation.activate()
  expect(m.bases).toHaveLength(1)
  expect(activation.listeners.size).toBe(0)
  m.progress(0.42)
  expect(p.phase.value).toBe('idle')
  expect(p.progress.value).toBe(0.42)
  expect(p.busy.value).toBe(false)
  p.addQuestion('noul')
  p.stateText.value = 'Edited while downloading.'
  expect(p.canRun.value).toBe(true)
  const running = p.run()
  expect(p.phase.value).toBe('initializing')
  expect(p.progress.value).toBe(0.42)
  await p.run()
  expect(m.bases).toHaveLength(1)
  m.progress(1)
  expect(p.phase.value).toBe('initializing')
  m.finish()
  await running
  expect(p.phase.value).toBe('ready')
  expect(m.bases[0]!.children).toHaveLength(1)
  expect(p.evaluation.value?.request.state).toBe('Edited while downloading.')
})

test('an existing download or prior activation prepares immediately in the background', async () => {
  for (const [status, active] of [
    ['downloading', false],
    ['downloadable', true],
  ] as const) {
    const m = model(status)
    const { playground: p, activation } = await mount(
      m.factory,
      true,
      new Map(),
      activationSource(active),
    )
    expect(m.bases).toHaveLength(1)
    expect(activation.listeners.size).toBe(0)
    m.progress(0.65)
    expect(p.phase.value).toBe('idle')
    expect(p.progress.value).toBe(0.65)
    m.finish()
    await flushPromises()
    expect(p.phase.value).toBe('ready')
    expect(p.evaluation.value).toBeNull()
  }
})

test('a background failure stays silent and Run retries in the click call stack', async () => {
  const m = model('available')
  const { playground: p } = await mount(m.factory)
  m.downloads[0]!.reject(new Error('Background initialization failed'))
  await flushPromises()
  expect(p.phase.value).toBe('idle')
  expect(p.error.value).toBe('')
  expect(p.notice.value).toBe('')
  p.addQuestion('noul')
  const running = p.run()
  expect(m.bases).toHaveLength(2)
  m.finish()
  await running
  expect(p.phase.value).toBe('ready')
})

test('NotAllowed during warmup waits for real activation without displaying an error', async () => {
  const m = model('available')
  const create = m.factory.create
  let attempts = 0
  m.factory.create = (options) =>
    ++attempts === 1
      ? Promise.reject(new DOMException('User activation required', 'NotAllowedError'))
      : create(options)
  const { playground: p, activation } = await mount(m.factory)
  await flushPromises()
  expect(attempts).toBe(1)
  expect(p.error.value).toBe('')
  expect(p.phase.value).toBe('idle')
  expect(activation.listeners.size).toBe(1)
  activation.activate()
  expect(attempts).toBe(2)
  expect(p.phase.value).toBe('idle')
  m.finish()
  await flushPromises()
  expect(p.phase.value).toBe('ready')
})

test('cancelled preparation cannot block or overwrite a new run if it completes late', async () => {
  const m = model('downloading')
  const { playground: p } = await mount(m.factory)
  p.addQuestion('noul')
  m.progress(0.3)
  const first = p.run()
  p.cancel()
  await first // Must close even when create() has not settled yet.
  expect(p.phase.value).toBe('idle')
  expect(m.createSignals[0]!.aborted).toBe(true)
  const second = p.run()
  expect(m.bases).toHaveLength(2)
  m.progress(0.5, 1)
  m.progress(0.9, 0)
  m.finish(0)
  await flushPromises()
  expect(p.phase.value).toBe('initializing')
  expect(p.progress.value).toBe(0.5)
  expect(m.bases[0]!.destroyed).toBe(true)
  expect(m.bases[1]!.destroyed).toBe(false)
  expect(p.evaluation.value).toBeNull()
  m.finish(1)
  await second
  expect(p.history.value).toHaveLength(1)
})

test('unmount cancels background preparation and removes deferred activation listeners', async () => {
  const m = model('available')
  const { playground: p, app } = await mount(m.factory)
  app.unmount()
  expect(m.createSignals[0]!.aborted).toBe(true)
  m.finish()
  await flushPromises()
  expect(m.bases[0]!.destroyed).toBe(true)
  expect(p.phase.value).toBe('idle')
  expect(p.history.value).toHaveLength(0)
  const waiting = model()
  const deferred = await mount(waiting.factory)
  expect(deferred.activation.listeners.size).toBe(1)
  deferred.app.unmount()
  expect(deferred.activation.listeners.size).toBe(0)
  deferred.activation.activate()
  expect(waiting.bases).toHaveLength(0)
})

test('switching interface locale preserves edited input, persisted draft, and completed result', async () => {
  const m = model('available')
  m.ready()
  const { playground: p, stored, i18n } = await mount(m.factory)
  expect(i18n.global.locale.value).toBe('en')
  p.addQuestion('noul')
  p.stateText.value = 'Keep my input exactly as written.'
  await p.run()
  await nextTick()
  const result = p.evaluation.value
  const state = p.stateText.value
  const questions = p.questionsText.value
  const draft = stored.get('browserjev.draft.v1')
  const savedHistory = stored.get('browserjev.history.v1')
  i18n.global.locale.value = 'zh-CN'
  await nextTick()
  expect(p.stateText.value).toBe(state)
  expect(p.questionsText.value).toBe(questions)
  expect(p.stateMode.value).toBe('text')
  expect(p.evaluation.value).toBe(result)
  expect(p.stale.value).toBe(false)
  expect(stored.get('browserjev.draft.v1')).toBe(draft)
  expect(stored.get('browserjev.history.v1')).toBe(savedHistory)
  expect(m.bases).toHaveLength(1)
  p.selectExample(getExamples(i18n.global.locale.value)[0]!)
  expect(p.validation.value.request?.state).toEqual(getExamples('zh-CN')[0]!.request.state)
  expect(JSON.parse(p.questionsText.value)).toEqual(getExamples('zh-CN')[0]!.request.questions)
  const chineseDraft = p.stateText.value
  i18n.global.locale.value = 'en'
  await nextTick()
  expect(p.stateText.value).toBe(chineseDraft)
  p.selectExample(getExamples(i18n.global.locale.value)[0]!)
  expect(p.validation.value.request?.state).toEqual(examples[0]!.request.state)
})

test('localized templates append in the selected language without translating existing questions', async () => {
  const { playground: p, i18n } = await mount(model().factory)
  p.addQuestion('noul')
  const existing = JSON.parse(p.questionsText.value).noul_1
  i18n.global.locale.value = 'zh-CN'
  p.addQuestion('choice')
  const questions = JSON.parse(p.questionsText.value)
  expect(questions.noul_1).toEqual(existing)
  expect(questions.choice_1).toEqual(questionTemplate('choice', 'zh-CN'))
})

test('validation and stored notices change language without changing invalid input', async () => {
  const { playground: p, i18n } = await mount(model().factory)
  p.questionsText.value = '{ invalid'
  const englishValidation = p.validation.value.error
  p.addQuestion('noul')
  const englishError = p.error.value
  p.notice.value = 'copied'
  expect(p.noticeText.value).toBe('Response JSON copied.')
  i18n.global.locale.value = 'zh-CN'
  await nextTick()
  expect(p.questionsText.value).toBe('{ invalid')
  expect(p.validation.value.error).not.toBe(englishValidation)
  expect(p.error.value).not.toBe(englishError)
  expect(p.noticeText.value).toBe('响应 JSON 已复制。')
})

test('Text submits literal strings while JSON parses structured state and rejects invalid roots', async () => {
  const { playground: p } = await mount(model().factory)
  p.addQuestion('noul')
  p.stateText.value = '{"amount":42}'
  expect(p.validation.value.request?.state).toBe('{"amount":42}')
  p.setStateMode('json')
  expect(JSON.parse(p.stateText.value)).toBe('{"amount":42}')
  expect(p.validation.value.request?.state).toBe('{"amount":42}')
  p.stateText.value = '{"amount":42}'
  expect(p.validation.value.request?.state).toEqual({ amount: 42 })
  p.stateText.value = '["first", {"amount":42}]'
  expect(p.validation.value.request?.state).toEqual(['first', { amount: 42 }])
  p.stateText.value = '"line 1\\nline 2"'
  p.setStateMode('text')
  expect(p.stateText.value).toBe('line 1\nline 2')
  p.setStateMode('json')
  expect(p.validation.value.request?.state).toBe('line 1\nline 2')
  for (const value of ['null', 'true', '42', '{bad']) {
    p.stateText.value = value
    expect(p.canRun.value).toBe(false)
    expect(p.validation.value.request).toBeNull()
  }
  p.setStateMode('text')
  expect(p.stateMode.value).toBe('json')
  expect(p.stateText.value).toBe('{bad')
})

test('empty draft offers examples; selecting or editing inputs hides them, clearing restores them', async () => {
  const { playground: p } = await mount(model().factory)
  expect(p.inputEmpty.value).toBe(true)
  expect(p.canRun.value).toBe(false)
  p.selectExample(examples[0]!)
  expect(p.inputEmpty.value).toBe(false)
  expect(p.canRun.value).toBe(true)
  p.clear()
  expect(p.inputEmpty.value).toBe(true)
  p.stateMode.value = 'json'
  p.stateText.value = '{}'
  expect(p.inputEmpty.value).toBe(true)
  p.stateText.value = '{invalid'
  expect(p.inputEmpty.value).toBe(false)
  p.clear()
  p.questionsText.value = ''
  p.addQuestion('noul')
  expect(p.inputEmpty.value).toBe(false)
  expect(p.canRun.value).toBe(true)
})

test('saved drafts are preserved instead of replaced by the empty starting state', async () => {
  const stored = new Map([
    [
      'browserjev.draft.v1',
      JSON.stringify({
        stateText: 'My saved input',
        stateMode: 'text',
        questionsText: '{}',
        model: 'jev-latest',
        title: 'Saved',
      }),
    ],
  ])
  const { playground: p } = await mount(model().factory, true, stored)
  expect(p.stateText.value).toBe('My saved input')
  expect(p.inputEmpty.value).toBe(false)
})

test('selecting examples populates both editor models and clears State when the example omits it', async () => {
  const { playground: p, stored } = await mount(model().factory)
  for (const example of examples) {
    p.selectExample(example)
    await nextTick()
    expect(JSON.parse(p.questionsText.value)).toEqual(example.request.questions)
    if (example.request.state === undefined || typeof example.request.state === 'string') {
      expect(p.stateMode.value).toBe('text')
      expect(p.stateText.value).toBe(example.request.state ?? '')
    } else {
      expect(p.stateMode.value).toBe('json')
      expect(JSON.parse(p.stateText.value)).toEqual(example.request.state)
    }
    expect(p.validation.value.request).toEqual({
      ...example.request,
      state: example.request.state ?? '',
    })
    const draft = JSON.parse(stored.get('browserjev.draft.v1')!)
    expect(draft.stateText).toBe(p.stateText.value)
    expect(draft.questionsText).toBe(p.questionsText.value)
  }
  const questions = { check: { type: 'noul' as const, instructions: 'Is one plus one two?' } }
  p.selectExample({
    id: 'no-state',
    title: 'Questions only',
    description: '',
    type: 'noul',
    request: { model: 'jev-latest', questions },
  })
  await nextTick()
  expect(p.stateMode.value).toBe('text')
  expect(p.stateText.value).toBe('')
  expect(JSON.parse(p.questionsText.value)).toEqual(questions)
  expect(p.canRun.value).toBe(true)
})

test('availability and creation use the browser defaults without language declarations', async () => {
  const m = model('available')
  m.ready()
  const availability = mock(m.factory.availability)
  const create = mock(m.factory.create)
  m.factory.availability = availability
  m.factory.create = create
  const { playground: p } = await mount(m.factory)
  expect(availability).toHaveBeenCalledWith()
  p.addQuestion('noul')
  await p.run()
  const options = create.mock.calls[0]![0]
  expect(options).not.toHaveProperty('expectedInputs')
  expect(options).not.toHaveProperty('expectedOutputs')
  expect(options).toHaveProperty('initialPrompts')
  expect(options.signal).toBeInstanceOf(AbortSignal)
  expect(p.evaluation.value?.response.answers.noul_1).toEqual({ type: 'noul', noul: 0.8 })
})

test('unsupported API, insecure origin and unavailable device hide the workspace and cannot run', async () => {
  for (const [factory, secure, status] of [
    [undefined, true, 'unsupported'],
    [model().factory, false, 'unsupported'],
    [model('unavailable').factory, true, 'unavailable'],
  ] as const) {
    const { playground: p } = await mount(factory, secure)
    p.addQuestion('noul')
    expect(p.availability.value).toBe(status)
    expect(p.supported.value).toBe(false)
    expect(p.canRun.value).toBe(false)
    await p.run()
    expect(p.phase.value).toBe('idle')
  }
})

test('a hanging availability check becomes unsupported at 5 seconds and ignores late success', async () => {
  jest.useFakeTimers()
  const m = model('available')
  const pending = Promise.withResolvers<Availability>()
  m.factory.availability = () => pending.promise
  const { playground: p, activation } = await mount(m.factory)
  p.addQuestion('noul')
  expect(p.availability.value).toBe('checking')
  jest.advanceTimersByTime(4_999)
  await flushPromises()
  expect(p.availability.value).toBe('checking')
  jest.advanceTimersByTime(1)
  await flushPromises()
  expect(p.availability.value).toBe('unsupported')
  expect(p.supported.value).toBe(false)
  expect(p.canRun.value).toBe(false)
  pending.resolve('available')
  await flushPromises()
  activation.activate()
  await p.run()
  expect(p.availability.value).toBe('unsupported')
  expect(p.error.value).toBe('')
  expect(m.bases).toHaveLength(0)
})

test('availability timeout is configurable and handles a late rejection', async () => {
  jest.useFakeTimers()
  const m = model()
  const pending = Promise.withResolvers<Availability>()
  m.factory.availability = () => pending.promise
  const { playground: p } = await mount(m.factory, true, new Map(), activationSource(), 100)
  jest.advanceTimersByTime(99)
  await flushPromises()
  expect(p.availability.value).toBe('checking')
  jest.advanceTimersByTime(1)
  await flushPromises()
  expect(p.availability.value).toBe('unsupported')
  pending.reject(new Error('Late browser failure'))
  await flushPromises()
  expect(p.availability.value).toBe('unsupported')
  expect(p.error.value).toBe('')
  expect(m.bases).toHaveLength(0)
})

test('availability completion clears its timeout, while unmount prevents late warmup', async () => {
  jest.useFakeTimers()
  const ready = await mount(model('available').factory)
  expect(ready.playground.availability.value).toBe('available')
  expect(jest.getTimerCount()).toBe(0)
  jest.advanceTimersByTime(5_000)
  await flushPromises()
  expect(ready.playground.availability.value).toBe('available')

  const m = model('available')
  const pending = Promise.withResolvers<Availability>()
  m.factory.availability = () => pending.promise
  const { playground: p, app } = await mount(m.factory)
  expect(jest.getTimerCount()).toBe(1)
  app.unmount()
  expect(jest.getTimerCount()).toBe(0)
  pending.resolve('available')
  await flushPromises()
  expect(p.availability.value).toBe('checking')
  expect(m.bases).toHaveLength(0)
})

test('one click starts create synchronously, reports real download progress and then evaluates once', async () => {
  const m = model()
  const { playground: p, stored } = await mount(m.factory)
  p.addQuestion('noul')
  const running = p.run()
  expect(m.bases).toHaveLength(1) // create called before the click handler's first await
  expect(p.phase.value).toBe('initializing')
  expect(p.progress.value).toBeNull()
  expect(p.canRun.value).toBe(false)
  await p.run()
  expect(m.bases).toHaveLength(1)
  m.progress(0)
  expect(p.progress.value).toBe(0)
  m.progress(0.42)
  expect(p.progress.value).toBe(0.42)
  m.progress(1)
  expect(p.phase.value).toBe('initializing') // 100% downloaded is not yet a ready session
  m.finish()
  await running
  expect(p.phase.value).toBe('ready')
  expect(p.evaluation.value?.response.answers.noul_1).toEqual({ type: 'noul', noul: 0.8 })
  expect(p.history.value).toHaveLength(1)
  expect(stored.has('browserjev.history.v1')).toBe(true)
  await p.run()
  expect(m.bases).toHaveLength(1)
  expect(m.bases[0]!.children).toHaveLength(2)
})

test('cancelling download discards late completion and progress; next click can retry', async () => {
  const m = model('downloading')
  const { playground: p } = await mount(m.factory)
  p.addQuestion('noul')
  const running = p.run()
  m.progress(0.2)
  p.cancel()
  expect(m.createSignals[0]!.aborted).toBe(true)
  m.progress(0.8)
  expect(p.progress.value).toBe(0.2)
  m.finish()
  await running
  expect(m.bases[0]!.destroyed).toBe(true)
  expect(m.bases[0]!.children).toHaveLength(0)
  expect(p.evaluation.value).toBeNull()
  expect(p.history.value).toHaveLength(0)
  expect(p.phase.value).toBe('idle')
  expect(p.error.value).toBe('')
  expect(p.canRun.value).toBe(true)
  m.ready()
  await p.run()
  expect(m.bases).toHaveLength(2)
  expect(p.phase.value).toBe('ready')
  expect(p.history.value).toHaveLength(1)
})

test('a failed download closes preparation, preserves input and allows retry', async () => {
  const m = model()
  const { playground: p } = await mount(m.factory)
  p.addQuestion('noul')
  const original = p.questionsText.value
  const running = p.run()
  m.downloads[0]!.reject(new Error('Download failed'))
  await running
  expect(p.phase.value).toBe('idle')
  expect(p.error.value).toBe('Download failed')
  expect(p.questionsText.value).toBe(original)
  expect(p.canRun.value).toBe(true)
  m.ready()
  await p.run()
  expect(p.phase.value).toBe('ready')
  expect(p.error.value).toBe('')
})

test('cancelling inference leaves the base session reusable after initialization on the same run', async () => {
  const m = model('available')
  const { playground: p } = await mount(m.factory)
  p.addQuestion('noul')
  const running = p.run()
  m.bases[0]!.respond = async () => {
    p.cancel()
    return '{"q0":1}'
  }
  m.finish()
  await running
  expect(p.evaluation.value).toBeNull()
  expect(p.phase.value).toBe('ready')
  expect(m.createSignals[0]!.aborted).toBe(false)
  expect(m.bases[0]!.destroyed).toBe(false)
  expect(m.bases[0]!.children[0]!.destroyed).toBe(true)
  m.bases[0]!.respond = async () => '{"q0":0.5}'
  await p.run()
  expect(m.bases).toHaveLength(1)
  expect(p.evaluation.value?.response.answers.noul_1).toEqual({ type: 'noul', noul: 0.5 })
})

test('unmounting during download aborts initialization and cannot publish late results', async () => {
  const m = model()
  const { playground: p, app } = await mount(m.factory)
  p.addQuestion('noul')
  const running = p.run()
  app.unmount()
  m.finish()
  await running
  expect(m.createSignals[0]!.aborted).toBe(true)
  expect(m.bases[0]!.destroyed).toBe(true)
  expect(p.evaluation.value).toBeNull()
  expect(p.history.value).toHaveLength(0)
})
