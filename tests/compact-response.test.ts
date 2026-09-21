import { expect, test } from 'bun:test'
import { createPlan, decodeResponse, validateRequest } from '../src/lib/contract'
import { examples } from '../src/lib/examples'
import { restoreHistory } from '../src/lib/history'

const request = validateRequest(examples[0]!.request)
const compact = {
  q0: { billing: 0.8, technical: 0.1, account: 0.1 },
  q1: 0.95,
  q2: { '0': 0.1, '1': 0.6, '2': 0.3 },
}
const nested = {
  q0: { probabilities: compact.q0 },
  q1: { noul: compact.q1 },
  q2: { probabilities: compact.q2 },
}
const decision = { ...compact, q1: { answer: true, confidence: compact.q1 } }

test('explicit decisions preserve the external Jev response across all inference formats', () => {
  const usage = { input_tokens: 301 }
  const current = decodeResponse(request, JSON.stringify(decision), usage)
  expect(current).toEqual(decodeResponse(request, JSON.stringify(compact), usage, 'compact'))
  expect(current).toEqual(
    decodeResponse(request, JSON.stringify(nested), usage, 'nested'),
  )
  const properties = createPlan(request).schema.properties as Record<string, unknown>
  expect(properties.q0).toMatchObject({ required: ['billing', 'technical', 'account'] })
  expect(properties.q1).toEqual({
    type: 'object',
    properties: {
      answer: { type: 'boolean' },
      confidence: { type: 'number', minimum: 0.5, maximum: 1 },
    },
    required: ['answer', 'confidence'],
    additionalProperties: false,
  })
  expect(properties.q2).toMatchObject({ required: ['0', '1', '2'] })
})

test('compact inference rejects missing, invalid, extra and legacy fields', () => {
  for (const output of [
    { ...compact, q0: { billing: 1 } },
    { ...compact, q0: { billing: 0, technical: 0, account: 0 } },
    { ...compact, q0: { billing: 1, technical: 0, account: 0, other: 0 } },
    { ...compact, q1: -0.1 },
    { ...compact, q1: 1.1 },
    { ...compact, q1: null },
    { ...compact, q1: { noul: 0.95 } },
    nested,
  ])
    expect(() => decodeResponse(request, JSON.stringify(output), {}, 'compact')).toThrow()
})

test('candidate names that match old wrappers remain ordinary candidates', () => {
  const input = validateRequest({
    model: 'jev-latest',
    state: 'x',
    questions: {
      result: {
        type: 'choice',
        instructions: 'Choose',
        criteria: { probabilities: null, noul: null },
      },
    },
  })
  expect(
    decodeResponse(input, '{"q0":{"probabilities":0.8,"noul":0.2}}').answers.result,
  ).toMatchObject({ choice: 'probabilities', probabilities: { probabilities: 0.8, noul: 0.2 } })
})

test('history restores old and new wire formats without trusting saved answers', () => {
  const common = {
    request,
    response: { answers: {} },
    elapsedMs: 1200,
    createdAt: '2026-09-21T00:00:00Z',
  }
  const oldRecord = { ...common, raw: JSON.stringify(nested) }
  const compactRecord = { ...common, raw: JSON.stringify(compact), responseFormat: 'compact' }
  const newRecord = { ...common, raw: JSON.stringify(decision), responseFormat: 'decision' }
  const restored = restoreHistory([oldRecord, compactRecord, newRecord])
  expect(restored).toHaveLength(3)
  expect(restored[0]!.response).toEqual(restored[1]!.response)
  expect(restored[0]!.response).toEqual(restored[2]!.response)
  expect(restored[1]).toHaveProperty('responseFormat', 'compact')
  expect(restored[2]).toHaveProperty('responseFormat', 'decision')
  expect(restoreHistory([{ ...newRecord, responseFormat: 'unknown' }])).toEqual([])
  expect(restoreHistory([{ ...newRecord, raw: JSON.stringify(nested) }])).toEqual([])
  expect(restoreHistory([{ ...newRecord, raw: JSON.stringify(compact) }])).toEqual([])
  expect(restoreHistory([{ ...compactRecord, raw: JSON.stringify(decision) }])).toEqual([])
  const negative = restoreHistory([
    { ...newRecord, raw: JSON.stringify({ ...decision, q1: { answer: false, confidence: 0.95 } }) },
  ])
  expect((negative[0]!.response.answers.needs_human as { noul: number }).noul).toBeCloseTo(0.05)
})
