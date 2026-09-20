import { expect, test } from 'bun:test'
import { restoreHistory } from '../src/lib/history'
import { decodeResponse, type JevRequest } from '../src/lib/contract'

const request: JevRequest = {
  model: 'jev-latest',
  state: 'A package',
  questions: { damaged: { type: 'noul', instructions: 'Is it damaged?' } },
}
const raw = '{"q0":{"noul":0.9}}'
const record = {
  request,
  raw,
  response: decodeResponse(request, raw, { input_tokens: 100 }, 'nested'),
  elapsedMs: 120,
  createdAt: '2026-09-21T12:00:00Z',
  contextUsage: 117,
  contextWindow: 4096,
}
test('reload preserves response, usage, and request snapshot', () => {
  expect(restoreHistory(JSON.parse(JSON.stringify([record])))).toEqual([record])
})
test('corrupt or forged stored answers cannot bypass output validation', () => {
  const forged = {
    ...record,
    response: { ...record.response, answers: { damaged: { type: 'noul', noul: 9 } } },
  }
  expect(
    restoreHistory([null, { ...record, raw: '{}' }, { ...record, elapsedMs: -1 }, forged])[0]!
      .response.answers.damaged,
  ).toEqual({ type: 'noul', noul: 0.9 })
  expect(restoreHistory([null, { ...record, raw: '{}' }, forged])).toHaveLength(1)
  expect(restoreHistory({})).toEqual([])
})
test('history is bounded and discards invalid token metadata', () => {
  expect(restoreHistory(Array(20).fill(record))).toHaveLength(10)
  expect(
    restoreHistory([
      { ...record, response: { usage: { input_tokens: 'unknown', output_tokens: 999 } } },
    ])[0]!.response.usage,
  ).toEqual({})
})
