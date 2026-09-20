import { expect, test } from 'bun:test'
import {
  PromptEngine,
  type ModelFactory,
  type ModelSession,
  type PromptOptions,
} from '../src/lib/prompt-api'
import type { JevRequest } from '../src/lib/contract'

const request: JevRequest = {
  model: 'jev-latest',
  state: 'A test document.',
  questions: { result: { type: 'noul', instructions: 'Does this contain a document?' } },
}
class Session extends EventTarget implements ModelSession {
  contextUsage = 20
  contextWindow = 4096
  destroyed = false
  children: Session[] = []
  calls: { input: string; options: PromptOptions }[] = []
  result = '{"q0":{"noul":0.8}}'
  overflow = false
  async measureContextUsage() {
    return 80
  }
  async clone() {
    const child = new Session()
    child.contextWindow = this.contextWindow
    child.result = this.result
    child.overflow = this.overflow
    this.children.push(child)
    return child
  }
  async prompt(input: string, options: PromptOptions) {
    this.calls.push({ input, options })
    if (this.overflow) this.dispatchEvent(new Event('contextoverflow'))
    return this.result
  }
  destroy() {
    this.destroyed = true
  }
}
function factory(base: Session): ModelFactory {
  return { availability: async () => 'available', create: async () => base }
}
test('every evaluation clones a clean base and destroys only its child', async () => {
  const base = new Session()
  const engine = new PromptEngine(factory(base))
  const signal = new AbortController().signal
  await engine.initialize('en', signal, () => {})
  const one = await engine.evaluate(request, signal)
  await engine.evaluate(request, signal)
  expect(base.children).toHaveLength(2)
  expect(base.calls).toHaveLength(0)
  expect(base.destroyed).toBe(false)
  expect(base.children.every((child) => child.destroyed)).toBe(true)
  expect(base.children[0]!.calls[0]!.options.responseConstraint).toHaveProperty('required', ['q0'])
  expect(one.response.usage).toEqual({ input_tokens: 100 })
  engine.destroy()
  expect(base.destroyed).toBe(true)
})
test('rejects overflowing input before inference and releases session', async () => {
  const base = new Session()
  base.contextWindow = 50
  const engine = new PromptEngine(factory(base))
  const signal = new AbortController().signal
  await engine.initialize('en', signal, () => {})
  await expect(engine.evaluate(request, signal)).rejects.toThrow('超过')
  expect(base.children[0]!.calls).toHaveLength(0)
  expect(base.children[0]!.destroyed).toBe(true)
})
test('never exposes a malformed or truncated answer as success', async () => {
  for (const overflow of [false, true]) {
    const base = new Session()
    base.overflow = overflow
    base.result = overflow ? '{"q0":{"noul":0.8}}' : 'not json'
    const engine = new PromptEngine(factory(base))
    const signal = new AbortController().signal
    await engine.initialize('en', signal, () => {})
    await expect(engine.evaluate(request, signal)).rejects.toThrow()
    expect(base.children[0]!.destroyed).toBe(true)
  }
})
test('cancellation cannot publish a late response', async () => {
  const base = new Session()
  const controller = new AbortController()
  const engine = new PromptEngine(factory(base))
  await engine.initialize('en', new AbortController().signal, () => {})
  base.clone = async () => {
    const child = new Session()
    child.prompt = async () => {
      controller.abort()
      return '{"q0":{"noul":1}}'
    }
    base.children.push(child)
    return child
  }
  await expect(engine.evaluate(request, controller.signal)).rejects.toThrow()
  expect(base.children[0]!.destroyed).toBe(true)
})
