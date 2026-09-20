// CodeMirror uses phrase keys rather than Vue components for its built-in controls.
const chinesePhrases: Record<string, string> = {
  'Fold line': '折叠代码',
  'Unfold line': '展开代码',
  'folded code': '已折叠的代码',
  unfold: '展开代码',
  Find: '查找',
  Replace: '替换',
  next: '下一个',
  previous: '上一个',
  all: '全部',
  'match case': '区分大小写',
  regexp: '正则表达式',
  'by word': '全词匹配',
  replace: '替换',
  'replace all': '全部替换',
  close: '关闭',
  'Go to line': '跳转到行',
  go: '跳转',
  'current match': '当前匹配',
  'on line': '所在行',
  'replaced match on line $': '已替换第 $ 行的匹配项',
  'replaced $ matches': '已替换 $ 个匹配项',
  'Selection deleted': '已删除选区',
  Completions: '补全建议',
  Diagnostics: '诊断信息',
  'No diagnostics': '无诊断信息',
}
const englishPhrases: Record<string, string> = {}
export function editorPhrases(locale: string): Record<string, string> {
  return locale === 'zh-CN' ? chinesePhrases : englishPhrases
}
