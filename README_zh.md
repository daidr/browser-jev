# BrowserJev

[English](README.md) | [简体中文](README_zh.md)

**在线体验：[jev.daidr.me](https://jev.daidr.me)**

用 Chrome Prompt API 的 `responseConstraint` JSON Schema 能力，运行 Jev 格式的结构化决策 Playground。Bun + Vite 8 + Vue 3 + TypeScript；没有服务端推理、API Key、云端回退或模拟结果。图标使用 [Hugeicons 官方 Vue 组件与免费 Stroke Rounded 图标包](https://hugeicons.com/docs/integrations/vue/quick-start)，按需导入。

## 运行

```sh
bun install
bun run dev
```

在桌面 Chrome 中打开 `http://127.0.0.1:5173`，页面会在后台预热已有模型，或接入正在进行的下载。首次新下载需要用户激活，因此会在页面首次真实点击或键盘输入后静默启动，不影响编辑。从结果面板选择示例或编辑输入，然后点击「Run / 运行」（Ctrl / ⌘ + Enter）；模型尚未就绪时才弹出进度窗口，显示当前进度，准备完成后自动执行本次请求。可取消并重新运行。[Chromium 用户激活限制](https://github.com/chromium/chromium/blob/main/third_party/blink/renderer/modules/ai/ai_utils.cc)

`bun run build` 构建；`bun run preview` 预览构建结果；`bun test` 运行契约、工作台状态、语言切换和会话生命周期测试。

界面使用 [vue-i18n 11 Composition API](https://vue-i18n.intlify.dev/guide/advanced/composition)，默认英文，可在 Header 切换中文并记住选择。切换语言只更新界面、提示和示例列表，不翻译或改写 State、Questions、已有结果及历史。点击示例时才填入当前语言的完整示例；新添加的问题模板也使用当前语言。请求字段、问题 ID 和候选键保持稳定。

Chrome 官方文档当前列出 Web Prompt API 从 Chrome 148 提供，要求安全上下文（HTTPS 或 localhost）及符合要求的设备。程序以 API 检测和 `LanguageModel.availability()` 的实际结果为准；不支持或模型不可用时，以简短提示替代输入和结果面板。下载进度取自浏览器的 `downloadprogress`，尚未收到数值时使用不确定进度条。不会替用户修改浏览器设置。[Chrome 文档](https://developer.chrome.com/docs/ai/prompt-api)

可用性检测默认超时为 5 秒，浏览器未返回时按不支持处理。迟到的结果不会重新启用工作台或触发模型准备。可通过 `usePlayground({ availabilityTimeoutMs: 5_000 })` 调整超时时间。

无需选择输入语言；可用性检测和会话创建均不传 `expectedInputs` / `expectedOutputs`，使用浏览器模型的默认能力。省略语言声明不会改变模型支持的语言范围。[Prompt API 语言说明](https://github.com/webmachinelearning/prompt-api#multilingual-content-and-expected-input-languages)

## 已实现

- State 文本／JSON；CodeMirror JSON 编辑器，折叠控件使用 Hugeicons SVG；Questions 混合 Noul、Choice、Score；快速添加模板、格式化、即时校验。
- 英文／中文界面、示例、错误提示及编辑器内置控件；语言偏好独立保存，浏览器不支持模型时也可切换。
- 无侧栏的双面板工作台；输入为空时在结果面板展示五组示例；拖动或键盘调整输入／结果宽度；左右／上下布局；窄屏自动堆叠。
- 正文和代码 18px、辅助文字最小 17px；面板工具栏自动换行。按钮、切换控件、面板标题、提示、结果卡片和概率分布使用独立组件。
- 本地模型后台预热、静默下载、运行时显示当前进度、取消、错误提示、上下文容量检查；每次请求使用全新克隆，防止上下文串扰。
- 概率分布、Choice 选择、Score 加权结果、Noul 真值概率；结果展开／收起；原始 JSON、复制和下载。
- 修改输入后明确标记旧结果。
- 新草稿默认空白；已有草稿和最近 10 次成功运行保存在当前浏览器的 localStorage。历史入口位于顶部，始终关联运行时请求快照，重新载入时会重新校验。

## State 的两种编辑模式

Text 把编辑器原文作为字符串提交；JSON 会解析内容，接受 Jev 定义的字符串、对象或数组，拒绝数字、布尔值和 null 作为顶层 State。[Jev API 文档](https://docs.typesafe.ai/api)

Text → JSON 会将原文编码为 JSON 字符串，包括必要的引号和转义，不会猜测原文是否代表对象。JSON 字符串 → Text 会解码回原文；JSON 对象／数组 → Text 会变成对应的格式化文本，此后按字符串提交。要提交结构化 State，请在 JSON 模式直接输入对象／数组，或选择带结构化 State 的示例。

## 兼容范围

输入与 TypeSafe 的 `POST /v1/systemone` 使用相同顶层结构：

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

输出保留 `model / answers / usage` 和三个 primitive 的字段。`model` 始终为 `chrome-prompt-api`，输入的 Jev 名称仅为兼容 Jev 请求而保留，不会选择或调用 Jev。Chrome 不提供底层模型版本号，因此不伪装成 `jev-*` 或某个 Gemini Nano 版本。

| Primitive | 输入 criteria                   | 输出字段                                       |
| --------- | ------------------------------- | ---------------------------------------------- |
| Noul      | 可选 true / false 描述          | type, noul                                     |
| Choice    | 1–255 个具名候选，描述可为 null | type, choice, probabilities, confidence        |
| Score     | 2–10 个有序等级                 | type, score, legend, probabilities, confidence |

`state`、`instructions` 与 criteria 描述支持文档中的字符串／对象／数组。Score 的结构化描述原样保留在 legend。问题 ID 仅用于映射，不作为语义输入传给模型。候选名称按 Jev 语义参与判断。[接口文档](https://docs.typesafe.ai/api)

### 明确的语义差异

**这是 Jev I/O 兼容适配器，不是 Jev 模型复现。** Jev 是经过决策训练的模型；Chrome 内置的是生成模型。JSON Schema 约束结构，不能复现 Jev 的校准概率、延迟、准确率或并行评估架构。

1. 模型只输出 Noul 数值或完整候选概率。解码器严格检查字段、候选、范围和有限值；缺字段、全零分布、非法 JSON 均直接报错，不造答案。
2. 正数分布归一化为总和 1。Choice 用 argmax（相同时按输入顺序）；Score 为 `Σ(index × probability)`。这保证答案内部一致。
3. TypeSafe 文档未公开 confidence 的精确公式。本实现明确采用 `1 − H(p) / log(n)`，单候选为 1；它只衡量本地估计分布的集中程度。不能把它等同于 Jev 的数值或正确率。[Confidence 文档](https://docs.typesafe.ai/confidence)
4. `usage.input_tokens` 来自 Chrome 的 `measureContextUsage()` 加上初始系统上下文，数值遵循浏览器计量；当前 Chromium 实现未计入自动附加的 Schema。`output_tokens` 为可选字段，当前省略。界面只显示输入 token 和运行耗时。[Chromium 计量实现](https://github.com/chromium/chromium/blob/main/third_party/blink/renderer/modules/ai/language_model.cc)
5. 每个请求通过一次约束生成完成多个问题；输出生成仍是自回归的，不声称 Jev 的原生并行性能。

## 在代码中调用

适配器位于 `src/lib/prompt-api.ts`，契约和 Schema 编译位于 `src/lib/contract.ts`。

```ts
import { PromptEngine, getModelFactory } from './src/lib/prompt-api'
import { validateRequest } from './src/lib/contract'

const factory = getModelFactory()
if (!factory || (await factory.availability()) === 'unavailable') {
  throw new Error('Prompt API unavailable')
}
const engine = new PromptEngine(factory)
// 在用户点击事件中初始化。onProgress 接收 0–1 的下载进度。
await engine.initialize(new AbortController().signal, onProgress)
try {
  const result = await engine.evaluate(validateRequest(request), abortController.signal)
  console.log(result.response)
} finally {
  engine.destroy()
}
```

## 许可证

[MIT](LICENSE)
