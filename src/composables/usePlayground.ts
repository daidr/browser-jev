import { computed, onBeforeUnmount, onMounted, shallowRef, watch } from 'vue'
import {
  isRecord,
  LOCAL_MODEL,
  pretty,
  validateRequest,
  type JevRequest,
  type Question,
} from '../lib/contract'
import { restoreHistory } from '../lib/history'
import { questionTemplate, type Example } from '../lib/examples'
import {
  errorMessage,
  getModelFactory,
  modelOptions,
  PromptEngine,
  type Availability,
  type Evaluation,
  type Language,
  type ModelFactory,
} from '../lib/prompt-api'

const DRAFT_KEY = 'browserjev.draft.v1'
const HISTORY_KEY = 'browserjev.history.v1'
interface Environment {
  getFactory: () => ModelFactory | undefined
  isSecureContext: () => boolean
  storage: Pick<Storage, 'getItem' | 'setItem'>
}

export function usePlayground(environment: Partial<Environment> = {}) {
  const getFactory = environment.getFactory ?? getModelFactory
  const isSecureContext = environment.isSecureContext ?? (() => window.isSecureContext)
  const storage = environment.storage ?? {
    getItem: (key: string) => localStorage.getItem(key),
    setItem: (key: string, value: string) => localStorage.setItem(key, value),
  }
  const title = shallowRef('自定义请求')
  const stateText = shallowRef('')
  const stateMode = shallowRef<'text' | 'json'>('text')
  const questionsText = shallowRef('{}')
  const requestedModel = shallowRef('jev-latest')
  const language = shallowRef<Language>('en')
  const availability = shallowRef<Availability | 'unsupported' | 'checking'>('checking')
  const phase = shallowRef<'idle' | 'initializing' | 'ready' | 'running'>('idle')
  const progress = shallowRef<number | null>(null)
  const error = shallowRef('')
  const notice = shallowRef('')
  const evaluation = shallowRef<Evaluation | null>(null)
  const history = shallowRef<Evaluation[]>([])
  let engine: PromptEngine | undefined
  let controller: AbortController | undefined
  let capabilityVersion = 0
  let disposed = false
  const busy = computed(() => phase.value === 'initializing' || phase.value === 'running')
  const supported = computed(() =>
    ['available', 'downloadable', 'downloading'].includes(availability.value),
  )
  const inputEmpty = computed(() => {
    try {
      const state =
        stateMode.value === 'json' && stateText.value.trim()
          ? JSON.parse(stateText.value)
          : stateText.value
      const questions = JSON.parse(questionsText.value.trim() || '{}')
      const emptyState =
        typeof state === 'string'
          ? !state.trim()
          : (Array.isArray(state) || isRecord(state)) && Object.keys(state).length === 0
      return emptyState && isRecord(questions) && Object.keys(questions).length === 0
    } catch {
      return false
    }
  })
  const validation = computed(() => {
    try {
      let state: unknown = stateText.value
      if (stateMode.value === 'json') {
        try {
          state = JSON.parse(stateText.value)
        } catch (error) {
          throw new Error(`State JSON: ${errorMessage(error)}`)
        }
      }
      let questions: unknown
      try {
        questions = JSON.parse(questionsText.value.trim() || '{}')
      } catch (error) {
        throw new Error(`Questions JSON: ${errorMessage(error)}`)
      }
      return {
        request: validateRequest({ model: requestedModel.value, state, questions }),
        error: '',
      }
    } catch (e) {
      return { request: null, error: errorMessage(e) }
    }
  })
  const stale = computed(
    () =>
      !!evaluation.value && pretty(evaluation.value.request) !== pretty(validation.value.request),
  )
  const canRun = computed(() => !!validation.value.request && !busy.value && supported.value)

  async function checkAvailability() {
    if (busy.value || disposed) return
    const version = ++capabilityVersion
    const factory = getFactory()
    error.value = ''
    if (!factory || !isSecureContext()) {
      availability.value = 'unsupported'
      return
    }
    availability.value = 'checking'
    try {
      const value = await factory.availability(modelOptions(language.value))
      if (version === capabilityVersion && !disposed) availability.value = value
    } catch (e) {
      if (version === capabilityVersion && !disposed) {
        availability.value = 'unavailable'
        error.value = errorMessage(e)
      }
    }
  }
  async function run() {
    if (!canRun.value || !validation.value.request || disposed) return
    const factory = getFactory()
    if (!factory) {
      availability.value = 'unsupported'
      return
    }
    const request = structuredClone(validation.value.request)
    let ready = phase.value === 'ready'
    engine ??= new PromptEngine(factory)
    error.value = ''
    notice.value = ''
    try {
      if (!ready) {
        progress.value = null
        phase.value = 'initializing'
        controller = new AbortController()
        const signal = controller.signal
        // Keep create() on the click's call stack to preserve user activation.
        await engine.initialize(language.value, signal, (value) => {
          if (!signal.aborted && !disposed) progress.value = value
        })
        signal.throwIfAborted()
        if (disposed) return
        ready = true
        availability.value = 'available'
      }
      // Cancelling inference must not abort the reusable base session's create signal.
      controller = new AbortController()
      phase.value = 'running'
      const result = await engine.evaluate(request, controller.signal)
      if (disposed) return
      evaluation.value = result
      history.value = [result, ...history.value].slice(0, 10)
      try {
        storage.setItem(HISTORY_KEY, JSON.stringify(history.value))
      } catch {
        notice.value = '浏览器存储已满，本次历史仅保留在当前页面。'
      }
    } catch (e) {
      if (!disposed) {
        if (controller?.signal.aborted) notice.value = '已取消'
        else error.value = errorMessage(e)
      }
    } finally {
      if (!disposed) phase.value = ready ? 'ready' : 'idle'
      controller = undefined
    }
  }
  function cancel() {
    controller?.abort()
  }
  function applyRequest(request: JevRequest, name = '自定义请求') {
    if (busy.value) return
    title.value = name
    requestedModel.value = request.model
    stateMode.value = typeof request.state === 'string' ? 'text' : 'json'
    stateText.value = typeof request.state === 'string' ? request.state : pretty(request.state)
    questionsText.value = pretty(request.questions)
    error.value = ''
  }
  function selectExample(example: Example) {
    applyRequest(example.request, example.title)
  }
  function loadHistory(item: Evaluation) {
    if (!busy.value) {
      applyRequest(item.request, '历史请求')
      evaluation.value = item
    }
  }
  function importRequest(text: string) {
    if (busy.value) return false
    try {
      applyRequest(validateRequest(JSON.parse(text)))
      notice.value = '请求已导入'
      return true
    } catch (e) {
      error.value = errorMessage(e)
      return false
    }
  }
  function addQuestion(type: Question['type']) {
    if (busy.value) return
    try {
      const q = JSON.parse(questionsText.value.trim() || '{}')
      if (!isRecord(q)) throw new Error('Questions 必须是对象')
      const base = validateRequest({
        model: LOCAL_MODEL,
        state: '',
        questions: Object.keys(q).length ? q : { temp: questionTemplate('noul') },
      })
      const questions = Object.keys(q).length ? base.questions : {}
      let n = 1
      while (Object.hasOwn(questions, `${type}_${n}`)) n++
      questionsText.value = pretty({ ...questions, [`${type}_${n}`]: questionTemplate(type) })
    } catch {
      error.value = '请先修正 Questions JSON，再添加问题。'
    }
  }
  function setStateMode(mode: 'text' | 'json') {
    if (mode === stateMode.value || busy.value) return
    // Converting plain text to JSON preserves the text as a string.
    if (mode === 'json') stateText.value = pretty(stateText.value)
    else {
      try {
        const value = JSON.parse(stateText.value)
        stateText.value = typeof value === 'string' ? value : pretty(value)
      } catch {
        error.value = '请先修正 State JSON，再切换格式。'
        return
      }
    }
    stateMode.value = mode
  }
  function formatQuestions() {
    if (busy.value) return
    try {
      questionsText.value = pretty(JSON.parse(questionsText.value.trim() || '{}'))
    } catch {
      error.value = 'Questions JSON 格式有误，无法格式化。'
    }
  }
  function clear() {
    if (busy.value) return
    title.value = '自定义请求'
    stateText.value = ''
    stateMode.value = 'text'
    questionsText.value = '{}'
    evaluation.value = null
    error.value = ''
  }
  watch(language, () => {
    engine?.destroy()
    phase.value = 'idle'
    void checkAvailability()
  })
  watch([stateText, stateMode, questionsText, requestedModel, title], () => {
    try {
      storage.setItem(
        DRAFT_KEY,
        JSON.stringify({
          stateText: stateText.value,
          stateMode: stateMode.value,
          questionsText: questionsText.value,
          model: requestedModel.value,
          title: title.value,
        }),
      )
    } catch {
      notice.value = '无法保存草稿；当前编辑仍然可用。'
    }
  })
  onMounted(() => {
    try {
      const stored = JSON.parse(storage.getItem(DRAFT_KEY) ?? 'null')
      if (
        stored &&
        typeof stored.stateText === 'string' &&
        typeof stored.questionsText === 'string' &&
        ['text', 'json'].includes(stored.stateMode)
      ) {
        stateText.value = stored.stateText
        questionsText.value = stored.questionsText
        stateMode.value = stored.stateMode
        if (typeof stored.model === 'string') requestedModel.value = stored.model
        if (typeof stored.title === 'string') title.value = stored.title
      }
      const saved: unknown = JSON.parse(storage.getItem(HISTORY_KEY) ?? '[]')
      history.value = restoreHistory(saved)
    } catch {
      notice.value = '无法读取保存的草稿或历史'
    }
    void checkAvailability()
  })
  onBeforeUnmount(() => {
    disposed = true
    controller?.abort()
    engine?.destroy()
  })
  return {
    title,
    stateText,
    stateMode,
    questionsText,
    language,
    availability,
    phase,
    progress,
    error,
    notice,
    evaluation,
    history,
    busy,
    supported,
    inputEmpty,
    validation,
    stale,
    canRun,
    checkAvailability,
    run,
    cancel,
    selectExample,
    loadHistory,
    importRequest,
    addQuestion,
    setStateMode,
    formatQuestions,
    clear,
  }
}
