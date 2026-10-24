import { render, renderHook, screen } from '@testing-library/react'
import React from 'react'
import {
  calculateOptimalColumns,
  useDynamicHeight,
  useScrollRestoration,
  VirtualGrid,
  VirtualList,
  VirtualRuleList
} from '../index'
import { VirtualGridCell, VirtualListItem } from '../virtualization-items'

jest.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: jest.fn(({ count, horizontal }) => {
    const size = horizontal ? 120 : 80
    const items = Array.from({ length: count }, (_, index) => ({
      key: `${horizontal ? 'col' : 'row'}-${index}`,
      index,
      size,
      start: index * size
    }))

    return {
      getVirtualItems: () => items,
      getTotalSize: () => items.length * size,
      scrollToIndex: jest.fn()
    }
  })
}))

describe('@repo/virtualization', () => {
  it('renders virtual list and rule list items', () => {
    render(
      <VirtualList
        items={['one', 'two']}
        height={200}
        renderItem={(item, index) => <div>{`${index}:${item}`}</div>}
      />
    )
    expect(screen.getByText('0:one')).toBeTruthy()

    render(
      <VirtualRuleList
        rules={[
          {
            id: 'rule-1',
            title: 'Rule',
            slug: 'rule',
            categories: ['html'],
            priority: 'high',
            content: 'content',
            primaryCategory: 'html',
            url: '/rule'
          } as any
        ]}
        renderRule={rule => <div>{rule.title}</div>}
      />
    )
    expect(screen.getByText('Rule')).toBeTruthy()
  })

  it('renders a virtual grid', () => {
    render(
      <VirtualGrid
        items={['a', 'b', 'c', 'd']}
        columnCount={2}
        renderItem={(item, row, col) => <div>{`${item}-${row}-${col}`}</div>}
      />
    )
    expect(screen.getByText('a-0-0')).toBeTruthy()
  })

  it('supports scroll restoration and dynamic height hooks', () => {
    const { result: scrollResult } = renderHook(() => useScrollRestoration('key'))
    scrollResult.current.saveScrollPosition(120)
    expect(scrollResult.current.getScrollPosition()).toBe(120)
    scrollResult.current.clearScrollPosition()
    expect(scrollResult.current.getScrollPosition()).toBe(0)

    const { result: heightResult } = renderHook(() => useDynamicHeight(80))
    heightResult.current.setHeight(1, 140)
    expect(heightResult.current.getHeight(1)).toBe(140)
    heightResult.current.clearHeights()
    expect(heightResult.current.getHeight(1)).toBe(80)
  })

  it('calculates column counts', () => {
    expect(calculateOptimalColumns(1200, 240, 5, 16)).toBeGreaterThanOrEqual(1)
  })

  it('renders low-level virtualization items for both orientations', () => {
    render(
      <VirtualListItem
        item="horizontal"
        virtualItem={{ key: 'v-1', index: 0, size: 120, start: 20 } as any}
        horizontal={true}
        renderItem={(item, index) => <div>{`${index}:${item}`}</div>}
      />
    )
    expect(screen.getByText('0:horizontal')).toBeTruthy()

    render(
      <VirtualGridCell
        item="cell"
        rowIndex={0}
        columnIndex={1}
        virtualRow={{ key: 'row-0', index: 0, size: 80, start: 0 } as any}
        virtualColumn={{ key: 'col-1', index: 1, size: 120, start: 120 } as any}
        renderItem={(item, row, col) => <div>{`${item}-${row}-${col}`}</div>}
      />
    )
    expect(screen.getByText('cell-0-1')).toBeTruthy()
  })
})
