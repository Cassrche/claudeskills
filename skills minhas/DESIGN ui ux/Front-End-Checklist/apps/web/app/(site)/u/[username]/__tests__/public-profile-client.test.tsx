import { PublicProfileClient } from '@/app/(site)/u/[username]/public-profile-client'
import { render, screen } from '@/test-utils'

describe('PublicProfileClient', () => {
  it('renders read-only GitHub basics when present', () => {
    render(
      <PublicProfileClient
        user={{
          name: 'David Dias',
          githubCompany: 'Front-End Checklist',
          githubBlog: 'frontendchecklist.io',
          githubLocation: 'Montreal',
          githubFollowers: 1000,
          githubPublicRepos: 42
        }}
        showProgress={false}
        showChecklists={false}
        overallStats={{ total: 0, completed: 0, percentage: 0 }}
        categoryStats={[]}
        sharedChecklists={[]}
        homeHref="/"
      />
    )

    expect(screen.getByText('Front-End Checklist')).toBeInTheDocument()
    expect(screen.getByText('Montreal')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'frontendchecklist.io' })).toHaveAttribute(
      'href',
      'https://frontendchecklist.io'
    )
    expect(screen.getByText('1,000')).toBeInTheDocument()
    expect(screen.getByText('42')).toBeInTheDocument()
  })
})
