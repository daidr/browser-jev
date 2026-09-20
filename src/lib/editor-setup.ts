import { EditorState } from '@codemirror/state'
import {
  lineNumbers,
  highlightActiveLineGutter,
  highlightSpecialChars,
  drawSelection,
  dropCursor,
  rectangularSelection,
  crosshairCursor,
  highlightActiveLine,
  keymap,
} from '@codemirror/view'
import {
  codeFolding,
  foldGutter,
  indentOnInput,
  syntaxHighlighting,
  defaultHighlightStyle,
  bracketMatching,
  foldKeymap,
} from '@codemirror/language'
import { history, defaultKeymap, historyKeymap } from '@codemirror/commands'
import { highlightSelectionMatches, searchKeymap } from '@codemirror/search'
import {
  closeBrackets,
  autocompletion,
  closeBracketsKeymap,
  completionKeymap,
} from '@codemirror/autocomplete'
import { lintKeymap } from '@codemirror/lint'
import { ArrowDown01Icon, ArrowRight01Icon, MoreHorizontalIcon } from '@hugeicons/core-free-icons'

// CodeMirror's DOM hooks own these nodes, so render Hugeicons data directly without mounting Vue instances.
function foldButton(icon: typeof ArrowDown01Icon, label: string): HTMLButtonElement {
  const button = document.createElement('button')
  button.type = 'button'
  button.className = 'cm-foldControl'
  button.title = label
  button.setAttribute('aria-label', label)
  button.onmousedown = (event) => event.preventDefault()
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('viewBox', '0 0 24 24')
  svg.setAttribute('width', '14')
  svg.setAttribute('height', '14')
  svg.setAttribute('fill', 'none')
  svg.setAttribute('aria-hidden', 'true')
  for (const [tag, attributes] of icon) {
    const element = document.createElementNS(svg.namespaceURI, tag)
    for (const [name, value] of Object.entries(attributes)) {
      if (name !== 'key')
        element.setAttribute(
          name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`),
          String(value),
        )
    }
    svg.append(element)
  }
  button.append(svg)
  return button
}

// CodeMirror basicSetup, with its default character-based fold gutter replaced.
// Based on codemirror 6.0.2; see THIRD_PARTY_NOTICES.md for the upstream MIT license.
export const editorSetup = [
  lineNumbers(),
  highlightActiveLineGutter(),
  highlightSpecialChars(),
  history(),
  foldGutter({
    markerDOM(open) {
      const button = foldButton(
        open ? ArrowDown01Icon : ArrowRight01Icon,
        open ? '折叠代码' : '展开代码',
      )
      // CodeMirror gutters are aria-hidden; keyboard users retain the fold keymap below.
      button.tabIndex = -1
      return button
    },
  }),
  codeFolding({
    placeholderDOM(view, onclick) {
      const button = foldButton(MoreHorizontalIcon, '展开代码')
      button.classList.add('cm-foldPlaceholder')
      button.onclick = (event) => {
        onclick(event)
        view.focus()
      }
      return button
    },
  }),
  drawSelection(),
  dropCursor(),
  EditorState.allowMultipleSelections.of(true),
  indentOnInput(),
  syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
  bracketMatching(),
  closeBrackets(),
  autocompletion(),
  rectangularSelection(),
  crosshairCursor(),
  highlightActiveLine(),
  highlightSelectionMatches(),
  keymap.of([
    ...closeBracketsKeymap,
    ...defaultKeymap,
    ...searchKeymap,
    ...historyKeymap,
    ...foldKeymap,
    ...completionKeymap,
    ...lintKeymap,
  ]),
]
