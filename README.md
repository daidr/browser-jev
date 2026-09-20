# BrowserJev

[English](README.md) | [简体中文](README_zh.md)

**Demo: [jev.daidr.me](https://jev.daidr.me)**

Use Chrome's built-in AI to answer yes/no questions, choose between options, and give scores. Everything runs in your browser, with no API key needed.

## Using the playground

1. Choose an example, or enter background information in **State** and questions in **Questions**.
2. Click **Run**, or press Ctrl / ⌘ + Enter.
3. View the answers and probabilities, then copy or download the results.

The first run may need to download a model. A progress window appears if it is still preparing.

The interface supports English and Simplified Chinese. Switching languages keeps your input unchanged; selecting an example uses the current language. Drafts and the last 10 runs are saved in your browser.

## Requirements

Use desktop Chrome 148 or later on a [supported device](https://developer.chrome.com/docs/ai/prompt-api). The page must be served over HTTPS or localhost. If the browser cannot run the model, the page displays a message.

## Run locally

Install [Bun](https://bun.sh), then run:

```sh
bun install
bun run dev
```

Open `http://127.0.0.1:5173` in Chrome.

Use `bun run build` to build, `bun run preview` to preview, and `bun test` to run tests.

Built with Bun, Vite 8, and Vue 3.

## About Jev

BrowserJev follows [Jev's input and output formats](https://docs.typesafe.ai/api) and runs on Chrome's model. Results can differ from Jev. The displayed probabilities are model estimates; confidence does not indicate how likely an answer is to be correct.

## License

[MIT](LICENSE)
