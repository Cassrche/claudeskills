import type { Mention } from '@repo/types'

/** Build a stable numeric hash for deterministic mention ordering. */
function stableHash(value: string): number {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0
  }
  return hash
}

/** Return a deterministic shuffled copy without changing between server and client. */
export function shuffleArray(mentions: Mention[]): Mention[] {
  return [...mentions].sort((a, b) => {
    const hashDiff = stableHash(a.id) - stableHash(b.id)
    return hashDiff === 0 ? a.id.localeCompare(b.id) : hashDiff
  })
}

/** Split mentions into round-robin marquee columns. */
export function splitIntoColumns(mentions: Mention[], columnCount: number): Mention[][] {
  const columns: Mention[][] = Array.from({ length: columnCount }, () => [])
  mentions.forEach((mention, index) => columns[index % columnCount].push(mention))
  return columns
}
