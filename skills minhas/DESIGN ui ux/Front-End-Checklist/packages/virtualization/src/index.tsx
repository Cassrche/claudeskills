import type { Rule } from '@repo/types'
import { useVirtualizer, type VirtualItem } from '@tanstack/react-virtual'
import React, { type CSSProperties, useCallback, useMemo, useRef } from 'react'
import { VirtualGridCell, VirtualListItem } from './virtualization-items'

// Props for virtualized list
export interface VirtualListProps<T = any> {
  items: T[]
  height?: number | string
  width?: number | string
  itemHeight?: number | ((index: number) => number)
  overscan?: number
  horizontal?: boolean
  className?: string
  renderItem: (item: T, index: number, virtualItem: VirtualItem) => React.ReactNode
  onScroll?: (scrollTop: number) => void
  scrollToIndex?: number
  gap?: number
  paddingStart?: number
  paddingEnd?: number
}

// Generic virtualized list component
export function VirtualList<T = any>({
  items,
  height = 600,
  width = '100%',
  itemHeight = 50,
  overscan = 5,
  horizontal = false,
  className = '',
  renderItem,
  onScroll,
  scrollToIndex,
  gap = 0,
  paddingStart = 0,
  paddingEnd = 0
}: VirtualListProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: useCallback(
      (index: number) => {
        const size = typeof itemHeight === 'function' ? itemHeight(index) : itemHeight
        return size + gap
      },
      [itemHeight, gap]
    ),
    overscan,
    horizontal,
    paddingStart,
    paddingEnd
  })

  const virtualItems = virtualizer.getVirtualItems()
  const totalSize = virtualizer.getTotalSize()

  // Scroll to index if provided
  React.useEffect(() => {
    if (scrollToIndex !== undefined && scrollToIndex >= 0 && scrollToIndex < items.length) {
      virtualizer.scrollToIndex(scrollToIndex, { align: 'start', behavior: 'smooth' })
    }
  }, [scrollToIndex, virtualizer, items.length])

  // Handle scroll events
  const handleScroll = useCallback(() => {
    if (onScroll && parentRef.current) {
      const scrollTop = horizontal ? parentRef.current.scrollLeft : parentRef.current.scrollTop
      onScroll(scrollTop)
    }
  }, [onScroll, horizontal])

  const containerStyle: CSSProperties = {
    height: typeof height === 'number' ? `${height}px` : height,
    width: typeof width === 'number' ? `${width}px` : width,
    overflow: 'auto',
    position: 'relative'
  }

  const innerStyle: CSSProperties = {
    height: horizontal ? '100%' : `${totalSize}px`,
    width: horizontal ? `${totalSize}px` : '100%',
    position: 'relative'
  }

  return (
    <div ref={parentRef} className={className} style={containerStyle} onScroll={handleScroll}>
      <div style={innerStyle}>
        {virtualItems.map(virtualItem => {
          const item = items[virtualItem.index]
          return (
            <VirtualListItem
              key={virtualItem.key}
              item={item}
              virtualItem={virtualItem}
              horizontal={horizontal}
              renderItem={renderItem}
            />
          )
        })}
      </div>
    </div>
  )
}

// Specialized component for rule lists
export interface VirtualRuleListProps {
  rules: Rule[]
  height?: number | string
  width?: number | string
  itemHeight?: number
  overscan?: number
  className?: string
  renderRule: (rule: Rule, index: number) => React.ReactNode
  onScroll?: (scrollTop: number) => void
  scrollToIndex?: number
  gap?: number
  view?: 'list' | 'grid' | 'compact'
  columns?: number
}

export function VirtualRuleList({
  rules,
  height = 600,
  width = '100%',
  itemHeight = 120,
  overscan = 5,
  className = '',
  renderRule,
  onScroll,
  scrollToIndex,
  gap = 16,
  view = 'list'
}: VirtualRuleListProps) {
  // Calculate item height based on view
  const calculatedItemHeight = useMemo(() => {
    switch (view) {
      case 'compact':
        return 60
      case 'grid':
        return 200
      default:
        return itemHeight
    }
  }, [view, itemHeight])

  return (
    <VirtualList
      items={rules}
      height={height}
      width={width}
      itemHeight={calculatedItemHeight}
      overscan={overscan}
      className={className}
      renderItem={(rule, index) => renderRule(rule, index)}
      onScroll={onScroll}
      scrollToIndex={scrollToIndex}
      gap={gap}
    />
  )
}

// Grid virtualization component
export interface VirtualGridProps<T = any> {
  items: T[]
  height?: number | string
  width?: number | string
  columnCount: number
  rowHeight?: number | ((index: number) => number)
  columnWidth?: number | ((index: number) => number)
  overscan?: number
  gap?: number
  className?: string
  renderItem: (item: T, rowIndex: number, columnIndex: number) => React.ReactNode
  onScroll?: (scrollTop: number) => void
}

export function VirtualGrid<T = any>({
  items,
  height = 600,
  width = '100%',
  columnCount,
  rowHeight = 200,
  columnWidth,
  overscan = 2,
  gap = 16,
  className = '',
  renderItem,
  onScroll
}: VirtualGridProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null)
  const rowCount = Math.ceil(items.length / columnCount)

  const rowVirtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: useCallback(
      (index: number) => {
        const height = typeof rowHeight === 'function' ? rowHeight(index) : rowHeight
        return height + gap
      },
      [rowHeight, gap]
    ),
    overscan
  })

  const columnVirtualizer = useVirtualizer({
    horizontal: true,
    count: columnCount,
    getScrollElement: () => parentRef.current,
    estimateSize: useCallback(
      (index: number) => {
        if (columnWidth) {
          const width = typeof columnWidth === 'function' ? columnWidth(index) : columnWidth
          return width + gap
        }
        // Auto-calculate column width
        const containerWidth = parentRef.current?.clientWidth || 0
        return (containerWidth - gap * (columnCount - 1)) / columnCount
      },
      [columnWidth, columnCount, gap]
    ),
    overscan
  })

  const handleScroll = useCallback(() => {
    if (onScroll && parentRef.current) {
      onScroll(parentRef.current.scrollTop)
    }
  }, [onScroll])

  return (
    <div
      ref={parentRef}
      className={className}
      style={{
        height: typeof height === 'number' ? `${height}px` : height,
        width: typeof width === 'number' ? `${width}px` : width,
        overflow: 'auto',
        position: 'relative'
      }}
      onScroll={handleScroll}
    >
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: `${columnVirtualizer.getTotalSize()}px`,
          position: 'relative'
        }}
      >
        {rowVirtualizer.getVirtualItems().map(virtualRow => (
          <React.Fragment key={virtualRow.key}>
            {columnVirtualizer.getVirtualItems().map(virtualColumn => {
              const itemIndex = virtualRow.index * columnCount + virtualColumn.index
              if (itemIndex >= items.length) return null

              const item = items[itemIndex]
              return (
                <VirtualGridCell
                  key={`${virtualRow.key}-${virtualColumn.key}`}
                  item={item}
                  rowIndex={virtualRow.index}
                  columnIndex={virtualColumn.index}
                  virtualRow={virtualRow}
                  virtualColumn={virtualColumn}
                  renderItem={renderItem}
                />
              )
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  )
}

// Hook for scroll restoration
export function useScrollRestoration(key: string) {
  const scrollPositions = useRef<Map<string, number>>(new Map())

  const saveScrollPosition = useCallback(
    (scrollTop: number) => {
      scrollPositions.current.set(key, scrollTop)
    },
    [key]
  )

  const getScrollPosition = useCallback((): number => {
    return scrollPositions.current.get(key) || 0
  }, [key])

  const clearScrollPosition = useCallback(() => {
    scrollPositions.current.delete(key)
  }, [key])

  return {
    saveScrollPosition,
    getScrollPosition,
    clearScrollPosition
  }
}

// Hook for dynamic item heights
export function useDynamicHeight(defaultHeight = 100) {
  const heights = useRef<Map<number, number>>(new Map())

  const setHeight = useCallback((index: number, height: number) => {
    heights.current.set(index, height)
  }, [])

  const getHeight = useCallback(
    (index: number): number => {
      return heights.current.get(index) || defaultHeight
    },
    [defaultHeight]
  )

  const clearHeights = useCallback(() => {
    heights.current.clear()
  }, [])

  return {
    setHeight,
    getHeight,
    clearHeights
  }
}

// Utility to calculate optimal column count
export function calculateOptimalColumns(
  containerWidth: number,
  minItemWidth: number,
  maxColumns = 5,
  gap = 16
): number {
  const availableWidth = containerWidth - gap
  const columns = Math.floor(availableWidth / (minItemWidth + gap))
  return Math.min(Math.max(1, columns), maxColumns)
}

// Export everything
export { useVirtualizer, type VirtualItem, type VirtualizerOptions } from '@tanstack/react-virtual'
