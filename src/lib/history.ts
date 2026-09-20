import { decodeResponse, isRecord, validateRequest } from './contract'
import type { Evaluation } from './prompt-api'

function count(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : undefined
}

export function restoreHistory(value: unknown): Evaluation[] {
  if (!Array.isArray(value)) return []
  return value.slice(0, 10).flatMap((item) => {
    try {
      if (!isRecord(item)) return []
      const request = validateRequest(item.request)
      if (
        typeof item.raw !== 'string' ||
        typeof item.elapsedMs !== 'number' ||
        !Number.isFinite(item.elapsedMs) ||
        item.elapsedMs < 0 ||
        typeof item.createdAt !== 'string' ||
        !Number.isFinite(Date.parse(item.createdAt))
      )
        return []
      const savedResponse = isRecord(item.response) ? item.response : {}
      const savedUsage = isRecord(savedResponse.usage) ? savedResponse.usage : {}
      const inputTokens = count(savedUsage.input_tokens)
      const format = item.responseFormat ?? 'nested'
      if (format !== 'compact' && format !== 'nested') return []
      // Recompute answers from validated raw output, while retaining recorded input usage.
      const response = decodeResponse(
        request,
        item.raw,
        inputTokens === undefined ? {} : { input_tokens: inputTokens },
        format,
      )
      return [
        {
          request,
          response,
          raw: item.raw,
          ...(item.responseFormat === undefined ? {} : { responseFormat: format }),
          elapsedMs: item.elapsedMs,
          createdAt: item.createdAt,
          contextUsage: count(item.contextUsage),
          contextWindow: count(item.contextWindow),
        },
      ]
    } catch {
      return []
    }
  })
}
