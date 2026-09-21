export const errorMessages = {
  jsonValue: 'Only serializable JSON values and finite numbers are allowed.',
  circularJson: 'JSON cannot contain circular references.',
  plainObject: 'Expected a plain JSON object.',
  object: 'Expected a JSON object.',
  model: 'Enter a non-empty model name.',
  description: 'Expected text, an object, or an array.',
  questions: 'Add at least one question.',
  questionId: 'Question IDs cannot be empty.',
  questionObject: 'Expected a question object.',
  instructions: 'Enter instructions as text, an object, or an array.',
  noulCriteria: 'Noul criteria must be a true/false object.',
  noulDescription: 'Only true/false descriptions as text, objects, or arrays are allowed.',
  choiceCriteria: 'Choice criteria must be an option map.',
  choiceCount: 'Choice requires 1–255 options.',
  choiceDescription: 'Option descriptions must be text, objects, arrays, or null.',
  scoreCriteria: 'Score requires 2–10 ordered levels as text, objects, or arrays.',
  questionType: 'Expected noul, choice, or score.',
  questionField: 'Unknown question field.',
  requestField: 'Unknown request field.',
  outputFields: 'The model output has missing or unexpected fields.',
  probability: 'Probabilities must be finite numbers between 0 and 1.',
  booleanAnswer: 'The Noul answer must be a boolean (true or false).',
  binaryConfidence: 'Confidence in the chosen Noul answer must be between 0.5 and 1.',
  outputJson: 'The model did not return valid JSON.',
  outputObject: 'The model output must be an object.',
  answerObject: 'The model answer must be an object.',
  distribution: 'The probability distribution is missing.',
  zeroDistribution: 'The distribution sums to zero and cannot be normalized. Run again.',
  modelNotReady: 'The model is not ready. Run again.',
  contextLimit:
    'Input and schema need {input} tokens, exceeding the {limit}-token context. Shorten State or reduce questions and options.',
  contextOverflow:
    'The model context overflowed; the result was discarded. Shorten State or reduce questions.',
  aborted: 'Cancelled. You can edit the input and run again.',
  notAllowed: 'Chrome has not allowed model initialization. Click Run and keep this page visible.',
  notSupported:
    'Chrome does not support this input or JSON Schema constraint. Update Chrome and check model availability.',
  quota:
    'The request exceeds the local context limit. Shorten State or reduce questions and options.',
  stateJson: 'State is not valid JSON.',
  questionsJson: 'Questions is not valid JSON.',
  addQuestion: 'Fix Questions JSON before adding a question.',
  stateMode: 'Fix State JSON before switching formats.',
  formatQuestions: 'Questions is not valid JSON and cannot be formatted.',
}
export type ErrorCode = keyof typeof errorMessages
export class AppError extends Error {
  constructor(
    public code: ErrorCode,
    public params: Record<string, string | number> = {},
    public path?: string,
  ) {
    const message = errorMessages[code].replace(/\{(\w+)\}/g, (_, key: string) =>
      String(params[key] ?? key),
    )
    super(path ? `${path}: ${message}` : message)
    this.name = 'AppError'
  }
}
