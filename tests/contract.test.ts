import { describe, expect, test } from 'bun:test'
import {
  createPlan,
  decodeResponse,
  distributionConfidence,
  validateRequest,
  type JevRequest,
} from '../src/lib/contract'
import { examples } from '../src/lib/examples'

const request = validateRequest(examples[0]!.request)
describe('Jev request compatibility', () => {
  test('accepts mixed primitives and nested descriptions', () => {
    for (const example of examples) {
      const input = { ...example.request, state: example.request.state ?? '' }
      expect(validateRequest(input)).toEqual(input)
    }
    expect(
      validateRequest({
        model: 'jev-latest',
        state: ['context'],
        questions: {
          check: {
            type: 'noul',
            instructions: { question: 'Same record?', candidate: { id: 7 } },
            criteria: { true: ['same'] },
          },
          choice: {
            type: 'choice',
            instructions: 'Choose',
            criteria: { a: null, b: { description: 'Other' } },
          },
          score: { type: 'score', instructions: 'Rate', criteria: [['low'], { label: 'high' }] },
        },
      }).questions,
    ).toHaveProperty('check')
  })
  test('rejects invalid schema before using the model', () => {
    const bad = [
      null,
      { ...request, state: true },
      { ...request, questions: {} },
      {
        ...request,
        questions: { x: { type: 'score', instructions: 'Rate', criteria: ['only one'] } },
      },
      { ...request, questions: { x: { type: 'choice', instructions: 'Pick', criteria: {} } } },
      { ...request, questions: { x: { type: 'noul', instructions: '', criteria: { yes: 'y' } } } },
      { ...request, questions: { x: { type: 'noul', instructions: 'Is it?', typo: true } } },
    ]
    for (const value of bad) expect(() => validateRequest(value)).toThrow()
  })
  test('enforces published choice and score limits', () => {
    const q = (count: number) => ({
      ...request,
      questions: {
        x: {
          type: 'choice',
          instructions: 'Choose',
          criteria: Object.fromEntries(Array.from({ length: count }, (_, i) => [String(i), null])),
        },
      },
    })
    expect(() => validateRequest(q(255))).not.toThrow()
    expect(() => validateRequest(q(256))).toThrow()
    expect(() =>
      validateRequest({
        ...request,
        questions: {
          x: { type: 'score', instructions: 'Rate', criteria: Array(11).fill('Level') },
        },
      }),
    ).toThrow()
  })
  test('hides question identifiers from inference and requires every candidate', () => {
    const { prompt, schema } = createPlan(request)
    expect(prompt).not.toContain('needs_human')
    expect(schema.required).toEqual(['q0', 'q1', 'q2'])
    const serialized = JSON.stringify(schema)
    expect(serialized).toContain('billing')
    expect(serialized).toContain('"additionalProperties":false')
    expect(serialized).toContain('"maximum":1')
  })
  test('does not silently coerce non-JSON values when serializing inference input', () => {
    expect(() => validateRequest({ ...request, state: { value: Infinity } })).toThrow()
    expect(() => validateRequest({ ...request, state: { value: undefined } })).toThrow()
    const circular: Record<string, unknown> = {}
    circular.self = circular
    expect(() => validateRequest({ ...request, state: circular })).toThrow()
  })
})

describe('answer invariants', () => {
  const raw = {
    q0: { billing: 0.8, technical: 0.1, account: 0.1 },
    q1: 0.95,
    q2: { '0': 0.1, '1': 0.6, '2': 0.3 },
  }
  test('computes choice and weighted score from complete distributions', () => {
    const output = decodeResponse(request, JSON.stringify(raw), { input_tokens: 521 })
    expect(output.model).toBe('chrome-prompt-api')
    expect(output.answers.department).toMatchObject({ type: 'choice', choice: 'billing' })
    expect(output.answers.needs_human).toEqual({ type: 'noul', noul: 0.95 })
    expect(output.answers.frustration).toMatchObject({
      type: 'score',
      score: 1.2,
      legend: { '0': 'Calm or neutral; simply requesting information' },
    })
    expect(output.usage).toEqual({ input_tokens: 521 })
    expect(output.usage).not.toHaveProperty('output_tokens')
  })
  test('normalizes positive estimates without inventing missing values', () => {
    const output = decodeResponse(
      request,
      JSON.stringify({
        ...raw,
        q0: { billing: 0.7, technical: 0.7, account: 0.7 },
      }),
    )
    const choice = output.answers.department
    if (choice?.type !== 'choice') throw new Error('Missing choice')
    expect(Object.values(choice.probabilities).reduce((a, b) => a + b, 0)).toBeCloseTo(1, 14)
    expect(choice.confidence).toBeCloseTo(0)
    expect(distributionConfidence([1, 0, 0])).toBe(1)
    expect(distributionConfidence([1])).toBe(1)
    expect(distributionConfidence([0.5, 0.5])).toBe(0)
  })
  test('rejects incomplete, nonfinite, negative, zero-mass and extra output', () => {
    const invalid = [
      { ...raw, q0: { billing: 1, technical: 0 } },
      { ...raw, q0: { billing: 0, technical: 0, account: 0 } },
      { ...raw, q1: -0.1 },
      { ...raw, q1: 1.1 },
      { ...raw, q1: null },
      { ...raw, q3: 1 },
      { ...raw, q1: { noul: 1, confidence: 1 } },
    ]
    for (const value of invalid)
      expect(() => decodeResponse(request, JSON.stringify(value))).toThrow()
    expect(() => decodeResponse(request, '```json\n{}\n```')).toThrow()
    expect(() => decodeResponse(request, JSON.stringify(raw).replace('0.95', '1e999'))).toThrow()
  })
  test('round-trips arbitrary and prototype-like routing keys safely', () => {
    const special = validateRequest(
      JSON.parse(
        '{"model":"jev-latest","state":"x","questions":{"__proto__":{"type":"choice","instructions":"Pick","criteria":{"constructor":null,"__proto__":null}}}}',
      ),
    )
    const response = decodeResponse(special, '{"q0":{"constructor":0.2,"__proto__":0.8}}')
    expect(Object.hasOwn(response.answers, '__proto__')).toBe(true)
    expect(JSON.parse(JSON.stringify(response)).answers.__proto__.choice).toBe('__proto__')
    expect(({} as Record<string, unknown>).polluted).toBeUndefined()
  })
  test('preserves structured Score legends', () => {
    const structured: JevRequest = {
      model: 'jev-latest',
      state: 'x',
      questions: {
        rating: { type: 'score', instructions: ['Rate'], criteria: [{ label: 'low' }, ['high']] },
      },
    }
    expect(decodeResponse(structured, '{"q0":{"0":0.25,"1":0.75}}').answers.rating).toMatchObject({
      score: 0.75,
      legend: { '0': { label: 'low' }, '1': ['high'] },
    })
  })
})
