# BrowserJev

[English](README.md) | [简体中文](README_zh.md)

**在线体验：[jev.daidr.me](https://jev.daidr.me)**

用 Chrome 内置 AI 判断是非、选择选项和评分。所有计算在浏览器中完成，无需 API Key。

## 使用方法

1. 选择一个示例，或在 **State** 中填写背景信息，在 **Questions** 中填写问题。
2. 点击「运行」，也可以按 Ctrl / ⌘ + Enter。
3. 查看答案和各选项的概率，复制或下载结果。

首次使用可能需要下载模型。如果点击运行时模型尚未准备好，页面会显示进度窗口。

界面支持英文和简体中文。切换语言不会改动已输入的内容，点击示例时会填入当前语言的版本。草稿和最近 10 次运行记录保存在当前浏览器中。

## 使用要求

需要桌面版 Chrome 148 或更高版本，以及[符合要求的设备](https://developer.chrome.com/docs/ai/prompt-api)。页面需通过 HTTPS 或 localhost 访问。浏览器无法运行模型时，页面会显示提示。

## 本地运行

安装 [Bun](https://bun.sh)，然后运行：

```sh
bun install
bun run dev
```

在 Chrome 中打开 `http://127.0.0.1:5173`。

使用 `bun run build` 构建，`bun run preview` 预览，`bun test` 运行测试。

项目使用 Bun、Vite 8 和 Vue 3。

## 与 Jev 的关系

BrowserJev 沿用 [Jev 的输入输出格式](https://docs.typesafe.ai/api)，实际运行的是 Chrome 内置模型，结果可能与 Jev 不同。页面中的概率是模型估计值，置信度不代表答案的正确率。

## 许可证

[MIT](LICENSE)
