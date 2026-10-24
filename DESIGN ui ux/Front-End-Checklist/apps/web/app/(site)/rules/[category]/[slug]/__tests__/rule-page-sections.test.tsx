import { render, screen } from '@testing-library/react'

jest.mock('@/components/rules/detail/resource-card', () => ({
  ResourceGrid: ({ resources }: { resources: Array<{ name: string }> }) => (
    <div data-testid="resource-grid">{resources.map(resource => resource.name).join(', ')}</div>
  ),
  ToolGrid: ({ tools }: { tools: Array<{ name: string }> }) => (
    <div data-testid="tool-grid">{tools.map(tool => tool.name).join(', ')}</div>
  )
}))

const { RuleResourcesSection } =
  require('../rule-page-sections') as typeof import('../rule-page-sections')

describe('RuleResourcesSection', () => {
  it('renders sources separately from further reading', () => {
    render(
      <RuleResourcesSection
        sources={[
          {
            id: 'wcag-overview',
            title: 'W3C WAI: WCAG Overview',
            url: 'https://www.w3.org/WAI/standards-guidelines/wcag/',
            type: 'wcag',
            role: 'standard',
            authority: 'primary'
          }
        ]}
      />
    )

    expect(screen.getByRole('heading', { name: 'Sources' })).toBeInTheDocument()
    expect(screen.getByText('W3C WAI: WCAG Overview')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Further Reading' })).not.toBeInTheDocument()
    expect(screen.queryByTestId('resource-grid')).not.toBeInTheDocument()
    expect(screen.queryByTestId('tool-grid')).not.toBeInTheDocument()
  })

  it('renders resources and tools without evidence', () => {
    render(
      <RuleResourcesSection
        resources={[
          {
            name: 'axe DevTools',
            url: 'https://www.deque.com/axe/devtools/',
            type: 'tool'
          }
        ]}
        tools={[{ name: 'Lighthouse', url: 'https://developer.chrome.com/docs/lighthouse/' }]}
      />
    )

    expect(screen.queryByRole('heading', { name: 'Sources' })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Further Reading' })).toBeInTheDocument()
    expect(screen.getByTestId('resource-grid')).toHaveTextContent('axe DevTools')
    expect(screen.getByTestId('tool-grid')).toHaveTextContent('Lighthouse')
  })

  it('keeps sources separate from further reading cards', () => {
    render(
      <RuleResourcesSection
        sources={[
          {
            id: 'mdn-a11y',
            title: 'MDN: Accessibility',
            url: 'https://developer.mozilla.org/en-US/docs/Web/Accessibility',
            type: 'mdn',
            role: 'reference',
            authority: 'primary'
          }
        ]}
        resources={[
          {
            name: 'axe DevTools',
            url: 'https://www.deque.com/axe/devtools/',
            type: 'tool'
          }
        ]}
        tools={[{ name: 'Lighthouse', url: 'https://developer.chrome.com/docs/lighthouse/' }]}
      />
    )

    expect(screen.getByRole('heading', { name: 'Sources' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Further Reading' })).toBeInTheDocument()
    expect(screen.getByText('MDN: Accessibility')).toBeInTheDocument()
    expect(screen.getByTestId('resource-grid')).toHaveTextContent('axe DevTools')
    expect(screen.getByTestId('tool-grid')).toHaveTextContent('Lighthouse')
  })

  it('renders nothing when all groups are empty', () => {
    const { container } = render(<RuleResourcesSection />)

    expect(container).toBeEmptyDOMElement()
  })
})
