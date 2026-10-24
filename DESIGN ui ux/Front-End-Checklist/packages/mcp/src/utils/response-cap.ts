/**
 * Cap tool response size to limit token usage for LLM consumers.
 * Uses character count as a proxy for tokens (~4 chars per token for English/JSON).
 */

const DEFAULT_MAX_CHARS = 32_000 // ~8k tokens
const TRUNCATION_SUFFIX = '\n\n[... response truncated to stay within token budget ...]'

/**
 * If text exceeds maxChars, truncate and append a short note.
 * Tries to cut at a newline to avoid breaking mid-object.
 */
export function capResponseText(text: string, maxChars: number = DEFAULT_MAX_CHARS): string {
  if (text.length <= maxChars) {
    return text
  }
  const keep = maxChars - TRUNCATION_SUFFIX.length
  const truncated = text.slice(0, keep)
  const lastNewline = truncated.lastIndexOf('\n')
  const cut = lastNewline > keep * 0.8 ? lastNewline + 1 : keep
  return text.slice(0, cut) + TRUNCATION_SUFFIX
}

export const DEFAULT_MAX_RESPONSE_CHARS = DEFAULT_MAX_CHARS
