# BrowserJev

[English](README.md) | [简体中文](README_zh.md)

**Demo: [jev.daidr.me](https://jev.daidr.me)**

A playground for Jev-format structured decisions, powered by the Chrome Prompt API and its `responseConstraint` JSON Schema support. Built with Bun, Vite 8, Vue 3, and TypeScript. Inference runs in your browser, without an API key, server inference, cloud fallback, or simulated results. Icons use the [official Hugeicons Vue component and free Stroke Rounded package](https://hugeicons.com/docs/integrations/vue/quick-start), imported individually.

## Getting started

```sh
bun install
bun run dev
```

Open `http://127.0.0.1:5173` in desktop Chrome. The page warms up an available model in the background or joins an ongoing download. Starting a new download requires user activation, so it begins silently after your first real click or keyboard input while you continue editing. Choose an example from the response panel or enter your own input, then click **Run** (Ctrl / ⌘ + Enter). If the model is not ready, a dialog shows its current download progress and runs your request once preparation completes. You can cancel and run again. [Chromium user activation requirements](https://github.com/chromium/chromium/blob/main/third_party/blink/renderer/modules/ai/ai_utils.cc)

Use `bun run build` to build, `bun run preview` to preview the build, and `bun test` to run contract, playground state, localization, and session lifecycle tests.

The interface uses [vue-i18n 11 Composition API](https://vue-i18n.intlify.dev/guide/advanced/composition). English is the default; switch to Simplified Chinese in the header, and your preference is saved. Switching languages updates the interface, messages, and example list without translating or rewriting State, Questions, existing results, or history. Selecting an example inserts the full example in the current language; new question templates also use that language. Request fields, question IDs, and candidate keys remain stable.

Chrome's documentation lists web Prompt API support from Chrome 148, requiring a secure context (HTTPS or localhost) and an eligible device. The application checks API support and the actual result of `LanguageModel.availability()`. When unsupported or unavailable, a short message replaces the input and response panels. Download progress comes from the browser's `downloadprogress` event, with an indeterminate bar until a value is available. The application does not change browser settings. [Chrome documentation](https://developer.chrome.com/docs/ai/prompt-api)

Availability checks time out after 5 seconds and treat the browser as unsupported if it does not respond. Late results do not enable the workspace or start model preparation. The timeout can be configured with `usePlayground({ availabilityTimeoutMs: 5_000 })`.

No input language selection is needed. Availability checks and session creation omit `expectedInputs` and `expectedOutputs`, using the model's defaults. Omitting language declarations does not expand the model's supported languages. [Prompt API language support](https://github.com/webmachinelearning/prompt-api#multilingual-content-and-expected-input-languages)

## Features

- Text and JSON State modes; CodeMirror JSON editors with Hugeicons SVG folding controls; mixed Noul, Choice, and Score questions; quick templates, formatting, and live validation.
- English and Simplified Chinese interface, examples, errors, and editor controls. Language preferences are saved separately, and the switch remains available when the model is unsupported.
- A two-panel workspace without a sidebar. Five example sets appear in the response panel when input is empty. Resize panels by dragging or using the keyboard, switch between horizontal and vertical layouts, and stack automatically on narrow screens.
- 18px body and code text, with supporting text at least 17px and wrapping panel toolbars. Buttons, switches, panel headers, messages, answer cards, and probability distributions are reusable components.
- Background model warmup, silent downloads, a progress dialog on run, cancellation, error handling, and context capacity checks. Each request uses a fresh session clone to avoid context leaking between requests.
- Probability distributions, Choice selections, weighted Score results, and Noul true probabilities; expandable results; raw JSON, copying, and downloads.
- Results are marked as outdated when the input changes.
- New drafts start empty. Drafts and the last 10 successful runs are stored in this browser's localStorage. History is available in the header, keeps the original request snapshot, and is validated again when restored.

## State editing modes

**Text** submits the editor content as a string. **JSON** parses the content and accepts the strings, objects, and arrays defined by Jev; numbers, booleans, and null are rejected as top-level State values. [Jev API documentation](https://docs.typesafe.ai/api)

Switching from Text to JSON encodes the original text as a JSON string, including quotes and escaping, without guessing whether the text represents an object. Switching a JSON string to Text decodes it back to its original content. Switching a JSON object or array to Text produces formatted text, which is then submitted as a string. To submit structured State, enter an object or array directly in JSON mode, or choose an example with structured State.

## Compatibility

Input uses the same top-level structure as TypeSafe's `POST /v1/systemone`:

```json
{
  "model": "jev-latest",
  "state": "I was charged twice. Please refund the extra charge.",
  "questions": {
    "refund_requested": {
      "type": "noul",
      "instructions": "Is the customer requesting a refund?"
    }
  }
}
```

Output preserves `model / answers / usage` and the fields of all three primitives. The output `model` is always `chrome-prompt-api`. A Jev model name in the input is accepted for request compatibility only; it does not select or call Jev. Chrome does not expose the underlying model version, so the adapter does not claim to be `jev-*` or a particular Gemini Nano version.

| Primitive | Input criteria | Output fields |
| --------- | -------------- | ------------- |
| Noul | Optional true / false descriptions | type, noul |
| Choice | 1–255 named candidates; descriptions may be null | type, choice, probabilities, confidence |
| Score | 2–10 ordered levels | type, score, legend, probabilities, confidence |

`state`, `instructions`, and criteria descriptions accept the documented string, object, and array forms. Structured Score descriptions are preserved in the legend. Question IDs are used only for mapping and are not passed to the model as semantic input. Candidate names participate in evaluation, following Jev semantics. [API documentation](https://docs.typesafe.ai/api)

### Semantic differences

**This is a Jev I/O compatibility adapter, not a reproduction of the Jev model.** Jev is trained for decisions; Chrome's built-in model is generative. JSON Schema constrains output structure but does not reproduce Jev's calibrated probabilities, latency, accuracy, or parallel evaluation architecture.

1. The model generates only Noul values or full candidate probability distributions. The decoder strictly checks fields, candidates, ranges, and finite values. Missing fields, all-zero distributions, and invalid JSON produce errors rather than fabricated answers.
2. Distributions with a positive total are normalized to sum to 1. Choice uses argmax, breaking ties by input order. Score is `Σ(index × probability)`, keeping answers internally consistent.
3. TypeSafe's documentation does not publish the exact confidence formula. This implementation uses `1 − H(p) / log(n)`, with confidence 1 for a single candidate. It measures only the concentration of the locally estimated distribution, not Jev's confidence or the probability of being correct. [Confidence documentation](https://docs.typesafe.ai/confidence)
4. `usage.input_tokens` comes from Chrome's `measureContextUsage()` plus the initial system context. It follows browser accounting; the current Chromium implementation excludes the automatically appended schema. `output_tokens` is optional and currently omitted. The interface shows only input tokens and elapsed time. [Chromium accounting implementation](https://github.com/chromium/chromium/blob/main/third_party/blink/renderer/modules/ai/language_model.cc)
5. Each request evaluates multiple questions in one constrained generation call. Output generation remains autoregressive; the adapter does not claim Jev's native parallel performance.

## Using the adapter

The adapter lives in `src/lib/prompt-api.ts`; contracts and schema compilation are in `src/lib/contract.ts`.

```ts
import { PromptEngine, getModelFactory } from './src/lib/prompt-api'
import { validateRequest } from './src/lib/contract'

const factory = getModelFactory()
if (!factory || (await factory.availability()) === 'unavailable') {
  throw new Error('Prompt API unavailable')
}
const engine = new PromptEngine(factory)
// Initialize from a user click handler. onProgress receives download progress from 0 to 1.
await engine.initialize(new AbortController().signal, onProgress)
try {
  const result = await engine.evaluate(validateRequest(request), abortController.signal)
  console.log(result.response)
} finally {
  engine.destroy()
}
```

## License

[MIT](LICENSE)
