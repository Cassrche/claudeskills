import type { VirtualItem } from '@tanstack/react-virtual'
import type { CSSProperties, ReactNode } from 'react'

interface VirtualListItemProps<T> {
  item: T
  virtualItem: VirtualItem
  horizontal: boolean
  renderItem: (item: T, index: number, virtualItem: VirtualItem) => ReactNode
}

/**
 * Render a single item inside the virtual list viewport.
 *
 * @param props - Virtual item layout and rendering props.
 */
export function VirtualListItem<T>({
  item,
  virtualItem,
  horizontal,
  renderItem
}: VirtualListItemProps<T>) {
  const style: CSSProperties = {
    position: 'absolute',
    [horizontal ? 'left' : 'top']: 0,
    [horizontal ? 'top' : 'left']: 0,
    [horizontal ? 'width' : 'height']: `${virtualItem.size}px`,
    [horizontal ? 'height' : 'width']: '100%',
    transform: horizontal
      ? `translateX(${virtualItem.start}px)`
      : `translateY(${virtualItem.start}px)`
  }

  return <div style={style}>{renderItem(item, virtualItem.index, virtualItem)}</div>
}

interface VirtualGridCellProps<T> {
  item: T
  rowIndex: number
  columnIndex: number
  virtualRow: VirtualItem
  virtualColumn: VirtualItem
  renderItem: (item: T, rowIndex: number, columnIndex: number) => ReactNode
}

/**
 * Render a single cell inside the virtualized grid.
 *
 * @param props - Grid cell layout and rendering props.
 */
export function VirtualGridCell<T>({
  item,
  rowIndex,
  columnIndex,
  virtualRow,
  virtualColumn,
  renderItem
}: VirtualGridCellProps<T>) {
  const style: CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: `${virtualColumn.size}px`,
    height: `${virtualRow.size}px`,
    transform: `translateX(${virtualColumn.start}px) translateY(${virtualRow.start}px)`
  }

  return <div style={style}>{renderItem(item, rowIndex, columnIndex)}</div>
}
