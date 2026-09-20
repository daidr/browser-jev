import {
  createPlan,
  decodeResponse,
  SYSTEM_PROMPT,
  type JevRequest,
  type JevResponse,
} from './contract'

export type Availability = 'available' | 'downloadable' | 'downloading' | 'unavailable'
export interface PromptOptions {
  responseConstraint: Record<string, unknown>
  signal?: AbortSignal
}
export interface ModelSession extends EventTarget {
  contextUsage?: number
  contextWindow?: number
  measureContextUsage?: (
    input: string,
    options?: { responseConstraint: Record<string, unknown> },
  ) => Promise<number>
  prompt(input: string, options: PromptOptions): Promise<string>
  clone(options?: { signal?: AbortSignal }): Promise<ModelSession>
  destroy(): void
}
export interface ModelFactory {
  availability(): Promise<Availability>
  create(options: {
    initialPrompts: { role: 'system'; content: string }[]
    signal?: AbortSignal
    monitor?: (monitor: EventTarget) => void
  }): Promise<ModelSession>
}
export interface Evaluation {
  request: JevRequest
  response: JevResponse
  raw: string
  elapsedMs: number
  contextUsage?: number
  contextWindow?: number
  createdAt: string
}
export function getModelFactory(): ModelFactory | undefined {
  return (globalThis as typeof globalThis & { LanguageModel?: ModelFactory }).LanguageModel
}

export class PromptEngine {
  private base?: ModelSession
  constructor(private factory: ModelFactory) {}

  async initialize(signal: AbortSignal, onProgress: (value: number) => void) {
    this.destroy()
    const session = await this.factory.create({
      initialPrompts: [{ role: 'system', content: SYSTEM_PROMPT }],
      signal,
      monitor: (monitor) =>
        monitor.addEventListener('downloadprogress', (event) => {
          const loaded = (event as Event & { loaded: number }).loaded
          if (Number.isFinite(loaded)) onProgress(Math.max(0, Math.min(1, loaded)))
        }),
    })
    if (signal.aborted) {
      session.destroy()
      signal.throwIfAborted()
    }
    this.base = session
  }

  async evaluate(request: JevRequest, signal: AbortSignal): Promise<Evaluation> {
    if (!this.base) throw new Error('模型尚未准备好，请重新运行')
    signal.throwIfAborted()
    const start = performance.now()
    const session = await this.base.clone({ signal })
    let overflow = false
    session.addEventListener('contextoverflow', () => {
      overflow = true
    })
    try {
      const { prompt, schema } = createPlan(request)
      const measured = await session.measureContextUsage?.(prompt, { responseConstraint: schema })
      signal.throwIfAborted()
      const inputTokens =
        measured === undefined ? undefined : measured + (session.contextUsage ?? 0)
      if (
        inputTokens !== undefined &&
        session.contextWindow !== undefined &&
        inputTokens >= session.contextWindow
      ) {
        throw new Error(
          `输入和 Schema 需要 ${inputTokens} tokens，超过模型上下文 ${session.contextWindow}；请缩短 State 或减少问题/选项。`,
        )
      }
      const raw = await session.prompt(prompt, { responseConstraint: schema, signal })
      signal.throwIfAborted()
      if (overflow) throw new Error('模型上下文发生溢出，本次结果已丢弃。请缩短 State 或减少问题。')
      const response = decodeResponse(
        request,
        raw,
        inputTokens === undefined ? {} : { input_tokens: inputTokens },
      )
      return {
        request,
        response,
        raw,
        elapsedMs: performance.now() - start,
        contextUsage: session.contextUsage,
        contextWindow: session.contextWindow,
        createdAt: new Date().toISOString(),
      }
    } finally {
      session.destroy()
    }
  }

  destroy() {
    this.base?.destroy()
    this.base = undefined
  }
}

export function errorMessage(error: unknown): string {
  if (error instanceof Error) {
    if (error.name === 'AbortError') return '已取消。可以修改输入后重新运行。'
    if (error.name === 'NotAllowedError')
      return 'Chrome 尚未允许模型初始化。请点击「运行请求」并保持页面可见。'
    if (error.name === 'NotSupportedError')
      return '当前 Chrome 不支持本次输入或 JSON Schema 约束。请更新 Chrome 并检查模型可用性。'
    if (error.name === 'QuotaExceededError')
      return '请求超过本地模型上下文限制，请缩短 State 或减少问题和选项。'
    return error.message
  }
  return String(error)
}
