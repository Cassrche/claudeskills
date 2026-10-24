import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text
} from 'react-email'

export interface TransactionalStarterEmailProps {
  actionLabel: string
  actionUrl: string
  headline: string
  message: string
  previewText: string
  supportEmail: string
}

const bodyStyle = {
  backgroundColor: '#f4f4f5',
  fontFamily: 'Arial, sans-serif',
  margin: '0',
  padding: '32px 16px'
}

const containerStyle = {
  backgroundColor: '#ffffff',
  border: '1px solid #e4e4e7',
  borderRadius: '20px',
  margin: '0 auto',
  maxWidth: '560px',
  overflow: 'hidden',
  padding: '40px'
}

const buttonStyle = {
  backgroundColor: '#18181b',
  borderRadius: '999px',
  color: '#ffffff',
  display: 'inline-block',
  fontSize: '15px',
  fontWeight: '700',
  padding: '14px 22px',
  textDecoration: 'none'
}

const headingStyle = {
  color: '#18181b',
  fontSize: '28px',
  fontWeight: '700',
  lineHeight: '36px',
  margin: '0 0 16px'
}

const textStyle = {
  color: '#3f3f46',
  fontSize: '16px',
  lineHeight: '26px',
  margin: '0 0 16px'
}

const footerTextStyle = {
  ...textStyle,
  color: '#71717a',
  fontSize: '14px',
  lineHeight: '22px',
  marginBottom: '0'
}

/**
 * Generic transactional baseline for Front-End Checklist emails.
 */
export function TransactionalStarterEmail({
  actionLabel,
  actionUrl,
  headline,
  message,
  previewText,
  supportEmail
}: TransactionalStarterEmailProps) {
  return (
    <Html lang="en">
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          <Section>
            <Text
              style={{
                color: '#71717a',
                fontSize: '12px',
                fontWeight: '700',
                letterSpacing: '0.12em',
                margin: '0 0 16px',
                textTransform: 'uppercase'
              }}
            >
              Front-End Checklist
            </Text>
            <Heading as="h1" style={headingStyle}>
              {headline}
            </Heading>
            <Text style={textStyle}>{message}</Text>
          </Section>

          <Section style={{ margin: '32px 0' }}>
            <Button href={actionUrl} style={buttonStyle}>
              {actionLabel}
            </Button>
          </Section>

          <Hr style={{ borderColor: '#e4e4e7', margin: '32px 0' }} />

          <Section>
            <Text style={footerTextStyle}>
              Need help? Reply to this email or contact{' '}
              <Link href={`mailto:${supportEmail}`}>{supportEmail}</Link>.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

TransactionalStarterEmail.PreviewProps = {
  actionLabel: 'Review your checklist',
  actionUrl: 'https://frontendchecklist.io/checklists',
  headline: 'Your checklist is ready to review',
  message:
    'Use this starter template as the baseline for account, notification, and product emails sent by Front-End Checklist.',
  previewText: 'Use this starter email to preview and ship new transactional templates faster.',
  supportEmail: 'hello@mail.frontendchecklist.io'
} satisfies TransactionalStarterEmailProps

export default TransactionalStarterEmail
