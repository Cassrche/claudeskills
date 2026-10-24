import { fireEvent, render, screen } from '@testing-library/react'
import { Counter } from '@/components/testing/fixtures/counter'

describe('Counter', () => {
  it('increments and resets the counter value', () => {
    render(<Counter />)

    const display = screen.getByTestId('counter-display')
    expect(display).toHaveTextContent('0')

    fireEvent.click(screen.getByRole('button', { name: 'Increment' }))
    fireEvent.click(screen.getByRole('button', { name: 'Increment' }))
    expect(display).toHaveTextContent('2')

    fireEvent.click(screen.getByRole('button', { name: 'Decrement' }))
    expect(display).toHaveTextContent('1')

    fireEvent.click(screen.getByRole('button', { name: 'Reset' }))
    expect(display).toHaveTextContent('0')
  })
})
