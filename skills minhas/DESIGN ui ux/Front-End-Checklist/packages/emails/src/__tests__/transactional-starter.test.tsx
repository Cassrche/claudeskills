import { render } from 'react-email'
import { TransactionalStarterEmail } from '../../emails/transactional-starter'

describe('TransactionalStarterEmail', () => {
  it('renders the preview text and call to action', async () => {
    const html = await render(
      <TransactionalStarterEmail
        actionLabel="Open dashboard"
        actionUrl="https://frontendchecklist.io/dashboard"
        headline="Action required"
        message="Finish setting up your account to start using Front-End Checklist."
        previewText="Complete your setup."
        supportEmail="hello@mail.frontendchecklist.io"
      />
    )

    expect(html).toContain('Complete your setup.')
    expect(html).toContain('Action required')
    expect(html).toContain('Open dashboard')
    expect(html).toContain('hello@mail.frontendchecklist.io')
  })
})
