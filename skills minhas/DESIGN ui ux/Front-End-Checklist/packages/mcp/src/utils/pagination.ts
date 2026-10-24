/**
 * Cursor-based pagination utilities
 */

interface CursorData {
  offset: number
  version?: string
}

/**
 * Check whether parsed JSON has the pagination cursor shape.
 * @param value - Parsed JSON value.
 * @returns Whether the value is cursor data.
 */
function isCursorData(value: unknown): value is CursorData {
  return typeof value === 'object' && value !== null && 'offset' in value
}

/**
 * Encode pagination cursor
 */
export function encodeCursor(data: CursorData): string {
  return Buffer.from(JSON.stringify(data)).toString('base64')
}

/**
 * Decode pagination cursor
 */
export function decodeCursor(cursor: string): CursorData | null {
  try {
    const decoded = Buffer.from(cursor, 'base64').toString('utf-8')
    const data = JSON.parse(decoded)
    if (!isCursorData(data) || typeof data.offset !== 'number') {
      return null
    }
    return data
  } catch {
    return null
  }
}

/**
 * Paginate an array of items
 */
export function paginate<T>(
  items: T[],
  options: {
    limit?: number
    cursor?: string
    maxLimit?: number
  } = {}
): {
  items: T[]
  nextCursor?: string
  totalCount: number
} {
  const { limit = 20, cursor, maxLimit = 100 } = options

  // Validate and cap limit
  const safeLimit = Math.min(Math.max(1, limit), maxLimit)

  // Decode cursor to get offset
  let offset = 0
  if (cursor) {
    const cursorData = decodeCursor(cursor)
    if (cursorData) {
      offset = cursorData.offset
    }
  }

  // Slice items
  const paginatedItems = items.slice(offset, offset + safeLimit)

  // Determine if there are more items
  const hasMore = offset + safeLimit < items.length
  const nextCursor = hasMore ? encodeCursor({ offset: offset + safeLimit }) : undefined

  return {
    items: paginatedItems,
    nextCursor,
    totalCount: items.length
  }
}
