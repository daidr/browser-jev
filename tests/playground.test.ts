import { afterEach, expect, test } from 'bun:test'
import { createRenderer, nextTick } from 'vue'
import { usePlayground } from '../src/composables/usePlayground'
import { examples } from '../src/lib/examples'
import type { Availability, ModelFactory, ModelSession, PromptOptions } from '../src/lib/prompt-api'

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
})

class Session extends EventTarget implements ModelSession {
  destroyed = false
  children: Session[] = []
  calls = 0
  respond: (options: PromptOptions) => Promise<string> = async () => '{"q0":{"noul":0.8}}'
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
  const monitor = new EventTarget()
  const bases: Session[] = []
  const createSignals: AbortSignal[] = []
  const downloads: ReturnType<typeof Promise.withResolvers<ModelSession>>[] = []
  let pending = true
  const factory: ModelFactory = {
    availability: async () => availability,
    create(options) {
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
    progress(value: number) {
      monitor.dispatchEvent(Object.assign(new Event('downloadprogress'), { loaded: value }))
    },
    finish() {
      downloads.at(-1)!.resolve(bases.at(-1)!)
    },
  }
}

async function mount(factory?: ModelFactory, secure = true, stored = new Map<string, string>()) {
  let playground!: ReturnType<typeof usePlayground>
  const app = renderer.createApp({
    setup() {
      playground = usePlayground({
        getFactory: () => factory,
        isSecureContext: () => secure,
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
  app.mount({})
  cleanup.push(() => app.unmount())
  await nextTick()
  return { playground, stored, app }
}

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
    return '{"q0":{"noul":1}}'
  }
  m.finish()
  await running
  expect(p.evaluation.value).toBeNull()
  expect(p.phase.value).toBe('ready')
  expect(m.createSignals[0]!.aborted).toBe(false)
  expect(m.bases[0]!.destroyed).toBe(false)
  expect(m.bases[0]!.children[0]!.destroyed).toBe(true)
  m.bases[0]!.respond = async () => '{"q0":{"noul":0.5}}'
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
