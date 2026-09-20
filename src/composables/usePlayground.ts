import { computed, onBeforeUnmount, onMounted, shallowRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { localizedError, type NoticeKey } from '../i18n'
import { AppError } from '../lib/errors'
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
import { browserUserActivation, type UserActivationSource } from '../lib/user-activation'
import {
  getModelFactory,
  PromptEngine,
  type Availability,
  type Evaluation,
  type ModelFactory,
} from '../lib/prompt-api'

const DRAFT_KEY = 'browserjev.draft.v1'
const HISTORY_KEY = 'browserjev.history.v1'
interface Environment {
  getFactory: () => ModelFactory | undefined
  availabilityTimeoutMs: number
  isSecureContext: () => boolean
  storage: Pick<Storage, 'getItem' | 'setItem'>
  userActivation: UserActivationSource
}

export function usePlayground(environment: Partial<Environment> = {}) {
  const { t, locale } = useI18n()
  const getFactory = environment.getFactory ?? getModelFactory
  const isSecureContext = environment.isSecureContext ?? (() => window.isSecureContext)
  const userActivation = environment.userActivation ?? browserUserActivation
  const storage = environment.storage ?? {
    getItem: (key: string) => localStorage.getItem(key),
    setItem: (key: string, value: string) => localStorage.setItem(key, value),
  }
  const title = shallowRef(t('request.custom'))
  const stateText = shallowRef('')
  const stateMode = shallowRef<'text' | 'json'>('text')
  const questionsText = shallowRef('{}')
  const requestedModel = shallowRef('jev-latest')
  const availability = shallowRef<Availability | 'unsupported' | 'checking'>('checking')
  const activity = shallowRef<'idle' | 'waiting' | 'running'>('idle')
  const modelReady = shallowRef(false)
  const phase = computed(() =>
    activity.value === 'waiting'
      ? 'initializing'
      : activity.value === 'running'
        ? 'running'
        : modelReady.value
          ? 'ready'
          : 'idle',
  )
  const progress = shallowRef<number | null>(null)
  const errorSource = shallowRef<unknown>('')
  const error = computed({
    get: () => localizedError(errorSource.value, t),
    set: (value: string) => {
      errorSource.value = value
    },
  })
  const notice = shallowRef<NoticeKey | ''>('')
  const noticeText = computed(() => (notice.value ? t(`notices.${notice.value}`) : ''))
  const evaluation = shallowRef<Evaluation | null>(null)
  const history = shallowRef<Evaluation[]>([])
  let engine: PromptEngine | undefined
  let controller: AbortController | undefined
  let preparation: { controller: AbortController; promise: Promise<void> } | undefined
  let stopWaitingForActivation: (() => void) | undefined
  let availabilityTimer: ReturnType<typeof setTimeout> | undefined
  let capabilityVersion = 0
  let disposed = false
  const busy = computed(() => activity.value !== 'idle')
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
        } catch {
          throw new AppError('stateJson')
        }
      }
      let questions: unknown
      try {
        questions = JSON.parse(questionsText.value.trim() || '{}')
      } catch {
        throw new AppError('questionsJson')
      }
      return {
        request: validateRequest({ model: requestedModel.value, state, questions }),
        error: '',
      }
    } catch (e) {
      return { request: null, error: localizedError(e, t) }
    }
  })
  const stale = computed(
    () =>
      !!evaluation.value && pretty(evaluation.value.request) !== pretty(validation.value.request),
  )
  const canRun = computed(() => !!validation.value.request && !busy.value && supported.value)

  function stopActivationListener() {
    stopWaitingForActivation?.()
    stopWaitingForActivation = undefined
  }
  function waitForActivation() {
    if (!disposed && !stopWaitingForActivation)
      stopWaitingForActivation = userActivation.subscribe(warmup)
  }
  function prepare(): Promise<void> {
    if (modelReady.value) return Promise.resolve()
    if (preparation && !preparation.controller.signal.aborted) return preparation.promise
    const factory = getFactory()
    if (!factory) return Promise.reject(new AppError('notSupported'))
    stopActivationListener()
    engine ??= new PromptEngine(factory)
    progress.value = null
    const operation = { controller: new AbortController(), promise: Promise.resolve() }
    const signal = operation.controller.signal
    preparation = operation
    // create() is invoked synchronously, including when called by a real user gesture.
    operation.promise = engine
      .initialize(signal, (value) => {
        if (!signal.aborted && !disposed && preparation === operation) progress.value = value
      })
      .then(() => {
        signal.throwIfAborted()
        if (disposed) return
        modelReady.value = true
        availability.value = 'available'
      })
      .finally(() => {
        if (preparation === operation) preparation = undefined
      })
    return operation.promise
  }
  function warmup() {
    if (disposed || !supported.value || modelReady.value || preparation || busy.value) return
    if (availability.value === 'downloadable' && !userActivation.hasBeenActive()) {
      waitForActivation()
      return
    }
    // Background preparation must not block editing, open the modal, or surface an error.
    void prepare().catch((error: unknown) => {
      if (!disposed && !busy.value && error instanceof Error && error.name === 'NotAllowedError')
        waitForActivation()
    })
  }
  function waitForPreparation(signal: AbortSignal) {
    signal.throwIfAborted()
    let onAbort: () => void
    return new Promise<void>((resolve, reject) => {
      onAbort = () => reject(signal.reason)
      signal.addEventListener('abort', onAbort, { once: true })
      prepare().then(resolve, reject)
    }).finally(() => signal.removeEventListener('abort', onAbort))
  }
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
      const timeout = new Promise<'unsupported'>((resolve) => {
        availabilityTimer = setTimeout(
          () => resolve('unsupported'),
          environment.availabilityTimeoutMs ?? 5_000,
        )
      })
      // Some Chromium derivatives expose the API but never settle availability().
      const value = await Promise.race([factory.availability(), timeout])
      if (version === capabilityVersion && !disposed) {
        availability.value = value
        warmup()
      }
    } catch (e) {
      if (version === capabilityVersion && !disposed) {
        availability.value = 'unavailable'
        errorSource.value = e
      }
    } finally {
      clearTimeout(availabilityTimer)
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
    const runController = new AbortController()
    const signal = runController.signal
    controller = runController
    error.value = ''
    notice.value = ''
    try {
      if (!modelReady.value) {
        activity.value = 'waiting'
        await waitForPreparation(signal)
      }
      signal.throwIfAborted()
      if (disposed) return
      activity.value = 'running'
      const result = await engine!.evaluate(request, signal)
      if (disposed) return
      evaluation.value = result
      history.value = [result, ...history.value].slice(0, 10)
      try {
        storage.setItem(HISTORY_KEY, JSON.stringify(history.value))
      } catch {
        notice.value = 'storageFull'
      }
    } catch (e) {
      if (!disposed) {
        if (signal.aborted) notice.value = 'cancelled'
        else errorSource.value = e
      }
    } finally {
      if (controller === runController) {
        if (!disposed) activity.value = 'idle'
        controller = undefined
      }
    }
  }
  function cancel() {
    controller?.abort()
    if (activity.value === 'waiting' && !modelReady.value) preparation?.controller.abort()
  }
  function applyRequest(request: JevRequest, name = t('request.custom')) {
    if (busy.value) return
    title.value = name
    requestedModel.value = request.model
    stateMode.value = typeof request.state === 'string' ? 'text' : 'json'
    stateText.value = typeof request.state === 'string' ? request.state : pretty(request.state)
    questionsText.value = pretty(request.questions)
    error.value = ''
  }
  function selectExample(example: Example) {
    applyRequest({ ...example.request, state: example.request.state ?? '' }, example.title)
  }
  function loadHistory(item: Evaluation) {
    if (!busy.value) {
      applyRequest(item.request, t('request.history'))
      evaluation.value = item
    }
  }
  function addQuestion(type: Question['type']) {
    if (busy.value) return
    try {
      const q = JSON.parse(questionsText.value.trim() || '{}')
      if (!isRecord(q)) throw new AppError('questionObject')
      const base = validateRequest({
        model: LOCAL_MODEL,
        state: '',
        questions: Object.keys(q).length ? q : { temp: questionTemplate('noul', locale.value) },
      })
      const questions = Object.keys(q).length ? base.questions : {}
      let n = 1
      while (Object.hasOwn(questions, `${type}_${n}`)) n++
      questionsText.value = pretty({
        ...questions,
        [`${type}_${n}`]: questionTemplate(type, locale.value),
      })
    } catch {
      errorSource.value = new AppError('addQuestion')
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
        errorSource.value = new AppError('stateMode')
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
      errorSource.value = new AppError('formatQuestions')
    }
  }
  function clear() {
    if (busy.value) return
    title.value = t('request.custom')
    stateText.value = ''
    stateMode.value = 'text'
    questionsText.value = '{}'
    evaluation.value = null
    error.value = ''
  }
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
      notice.value = 'draft'
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
      notice.value = 'restore'
    }
    void checkAvailability()
  })
  onBeforeUnmount(() => {
    disposed = true
    clearTimeout(availabilityTimer)
    stopActivationListener()
    preparation?.controller.abort()
    controller?.abort()
    engine?.destroy()
  })
  return {
    title,
    stateText,
    stateMode,
    questionsText,
    availability,
    phase,
    progress,
    error,
    notice,
    noticeText,
    evaluation,
    history,
    busy,
    supported,
    inputEmpty,
    validation,
    stale,
    canRun,
    run,
    cancel,
    selectExample,
    loadHistory,
    addQuestion,
    setStateMode,
    formatQuestions,
    clear,
  }
}
