import { render, screen } from '@testing-library/react'
import { GuideCard } from '@/components/guides/guide-card'

const guide = {
  slug: 'sample-guide',
  title: 'Sample Guide',
  description: 'A guide description.',
  type: 'how-to' as const,
  category: 'performance',
  tags: ['web', 'perf', 'audit'],
  updatedAt: '2026-03-13T00:00:00.000Z',
  coverImage: 'https://images.example.com/guide.png',
  author: {
    name: 'David Dias'
  }
}

describe('GuideCard', () => {
  it('stretches the title link across the whole card so the cover image is clickable', () => {
    const { container } = render(<GuideCard guide={guide} priority="featured" />)

    const card = container.firstElementChild
    const cardContent = container.querySelector('[data-slot="card-content"]')
    const link = screen.getByRole('link', { name: guide.title })

    expect(card).toHaveClass('relative')
    expect(cardContent).not.toHaveClass('relative')
    expect(link).toHaveClass('after:absolute', 'after:inset-0')
  })
})
