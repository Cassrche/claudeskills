import { CodeTabs, Tab } from '@/components/content/code/code-tabs'
import { fireEvent, render, screen } from '@/test-utils'

describe('CodeTabs', () => {
  beforeEach(() => {
    window.localStorage.clear()
    window.history.replaceState({}, '', 'http://localhost/rules/html/charset')
  })

  it('prefers checklist framework context over the stored framework', () => {
    window.localStorage.setItem('preferred-framework', 'nextjs')
    window.history.replaceState(
      {},
      '',
      'http://localhost/rules/html/charset?framework=vite&fromChecklist=Marketing%20Site'
    )

    render(
      <CodeTabs defaultTab="react">
        <Tab value="react" label="React">
          <div>React example</div>
        </Tab>
        <Tab value="vite" label="Vite">
          <div>Vite example</div>
        </Tab>
        <Tab value="nextjs" label="Next.js">
          <div>Next.js example</div>
        </Tab>
      </CodeTabs>
    )

    expect(screen.getByText('Vite example')).toBeInTheDocument()
    expect(screen.getByText('Showing Vite examples from Marketing Site.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Make default' })).toBeInTheDocument()
  })

  it('requires an explicit action to promote checklist context into the global default', () => {
    window.localStorage.setItem('preferred-framework', 'react')
    window.history.replaceState(
      {},
      '',
      'http://localhost/rules/html/charset?framework=vite&fromChecklist=Marketing%20Site'
    )

    render(
      <CodeTabs defaultTab="react">
        <Tab value="react" label="React">
          <div>React example</div>
        </Tab>
        <Tab value="vite" label="Vite">
          <div>Vite example</div>
        </Tab>
        <Tab value="nextjs" label="Next.js">
          <div>Next.js example</div>
        </Tab>
      </CodeTabs>
    )

    expect(window.localStorage.getItem('preferred-framework')).toBe('react')

    fireEvent.click(screen.getByRole('button', { name: 'Make default' }))

    expect(window.localStorage.getItem('preferred-framework')).toBe('vite')
  })

  it('falls back to the stored framework when checklist context is unavailable for the rule', () => {
    window.localStorage.setItem('preferred-framework', 'nextjs')
    window.history.replaceState(
      {},
      '',
      'http://localhost/rules/html/charset?framework=vite&fromChecklist=Marketing%20Site'
    )

    render(
      <CodeTabs defaultTab="react">
        <Tab value="react" label="React">
          <div>React example</div>
        </Tab>
        <Tab value="nextjs" label="Next.js">
          <div>Next.js example</div>
        </Tab>
      </CodeTabs>
    )

    expect(screen.getByText('Next.js example')).toBeInTheDocument()
    expect(screen.queryByText(/Showing .* examples from Marketing Site/)).not.toBeInTheDocument()
  })

  it('allows newly supported framework tabs to become the global default', () => {
    window.history.replaceState(
      {},
      '',
      'http://localhost/rules/html/charset?framework=astro&fromChecklist=Docs'
    )

    render(
      <CodeTabs defaultTab="react">
        <Tab value="react" label="React">
          <div>React example</div>
        </Tab>
        <Tab value="astro" label="Astro">
          <div>Astro example</div>
        </Tab>
      </CodeTabs>
    )

    expect(screen.getByText('Astro example')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Make default' }))

    expect(window.localStorage.getItem('preferred-framework')).toBe('astro')
  })
})
