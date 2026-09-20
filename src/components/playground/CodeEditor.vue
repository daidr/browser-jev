<script setup lang="ts">
import { onBeforeUnmount, onMounted, useTemplateRef, watch } from 'vue'
import { EditorState, Compartment } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { json } from '@codemirror/lang-json'
import { editorSetup } from '../../lib/editor-setup'

const model = defineModel<string>({ required: true })
const props = withDefaults(
  defineProps<{ label: string; jsonMode?: boolean; readonly?: boolean }>(),
  { jsonMode: true, readonly: false },
)
const host = useTemplateRef<HTMLDivElement>('host')
const language = new Compartment()
const editable = new Compartment()
let view: EditorView | undefined
onMounted(() => {
  view = new EditorView({
    parent: host.value!,
    state: EditorState.create({
      doc: model.value,
      extensions: [
        editorSetup,
        EditorView.lineWrapping,
        language.of(props.jsonMode ? json() : []),
        editable.of([
          EditorState.readOnly.of(props.readonly),
          EditorView.editable.of(!props.readonly),
        ]),
        EditorView.contentAttributes.of({
          'aria-label': props.label,
          'aria-multiline': 'true',
          role: 'textbox',
        }),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) model.value = update.state.doc.toString()
        }),
        EditorView.theme({
          '&': { height: '100%', fontSize: 'var(--text-body)' },
          '&.cm-focused': { outline: 'none' },
          '.cm-scroller': { fontFamily: 'var(--font-code)', lineHeight: '1.7', overflow: 'auto' },
          '.cm-content': { padding: '18px 0', minHeight: '100px' },
          '.cm-line': { padding: '0 18px 0 10px' },
          '.cm-gutters': {
            backgroundColor: 'transparent',
            color: 'var(--muted)',
            border: 'none',
            padding: '0 4px 0 8px',
          },
          '.cm-activeLineGutter, .cm-activeLine': { backgroundColor: 'transparent' },
          '&.cm-focused .cm-activeLine': { backgroundColor: '#f3f6fc' },
          '.cm-selectionBackground': { backgroundColor: '#dde6ff !important' },
          '.cm-foldGutter': { width: '24px' },
          '.cm-foldGutter .cm-gutterElement': {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0',
          },
          '.cm-foldControl': {
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '24px',
            height: '24px',
            padding: '0',
            border: 'none',
            borderRadius: '4px',
            background: 'transparent',
            color: 'inherit',
            cursor: 'pointer',
            verticalAlign: 'middle',
          },
          '.cm-foldControl:hover': { background: '#e9eef8', color: '#63718a' },
          '.cm-foldPlaceholder': {
            width: '24px',
            height: '24px',
            margin: '0 3px',
            background: '#f0f3f9',
            color: '#75849e',
          },
        }),
      ],
    }),
  })
})
watch(model, (value) => {
  if (view && value !== view.state.doc.toString())
    view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: value } })
})
watch(
  () => props.jsonMode,
  (value) => view?.dispatch({ effects: language.reconfigure(value ? json() : []) }),
)
watch(
  () => props.readonly,
  (value) =>
    view?.dispatch({
      effects: editable.reconfigure([
        EditorState.readOnly.of(value),
        EditorView.editable.of(!value),
      ]),
    }),
)
onBeforeUnmount(() => view?.destroy())
</script>

<template><div ref="host" class="code-editor" /></template>

<style scoped>
.code-editor {
  min-width: 0;
  min-height: 0;
  height: 100%;
  overflow: hidden;
}
.code-editor:focus-within {
  box-shadow: inset 2px 0 var(--blue);
}
/* CodeMirror's built-in panels and tooltips use smaller fonts by default. */
.code-editor :deep(.cm-editor *),
.code-editor :deep(.cm-editor .cm-panel *),
.code-editor :deep(.cm-editor *::before),
.code-editor :deep(.cm-editor *::after) {
  font-size: inherit;
}
.code-editor :deep(.cm-panel button),
.code-editor :deep(.cm-panel input:not([type='checkbox'])) {
  min-height: 40px;
}
.code-editor :deep(.cm-search) {
  padding: 12px;
}
.code-editor :deep(.cm-search input[type='checkbox']) {
  width: 18px;
  height: 18px;
  vertical-align: middle;
}
</style>
