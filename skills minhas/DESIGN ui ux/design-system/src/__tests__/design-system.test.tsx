import { CodeSurface, InlineCode } from '@repo/design-system/custom/content/code-surface'
import { ConfirmDialog } from '@repo/design-system/custom/feedback/confirm-dialog'
import { CopyButton } from '@repo/design-system/custom/feedback/copy-button'
import { PageBreadcrumbs } from '@repo/design-system/custom/navigation/page-breadcrumbs'
import { Badge } from '@repo/design-system/ui/badge'
import { Button } from '@repo/design-system/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@repo/design-system/ui/card'
import { Input } from '@repo/design-system/ui/input'
import { Progress } from '@repo/design-system/ui/progress'
import {
  Skeleton,
  SkeletonBento,
  SkeletonCard,
  SkeletonStats
} from '@repo/design-system/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@repo/design-system/ui/tabs'
import { fireEvent, render, screen } from '@testing-library/react'
import React, { act } from 'react'

describe('@repo/design-system', () => {
  it('resolves package subpath exports', () => {
    const buttonExports = require('@repo/design-system/ui/button')
    const cardExports = require('@repo/design-system/ui/card')
    const motionExports = require('@repo/design-system/motion/community-orbit')
    const iconExports = require('@repo/design-system/icons')
    const typographyExports = require('@repo/design-system/typography')
    const breadcrumbExports = require('@repo/design-system/custom/navigation/page-breadcrumbs')

    expect(buttonExports.Button).toBe(Button)
    expect(cardExports.Card).toBe(Card)
    expect(motionExports.CommunityOrbit).toBeTruthy()
    expect(iconExports.ChevronRight).toBeTruthy()
    expect(typographyExports.launchFontClassNames).toBeTruthy()
    expect(breadcrumbExports.PageBreadcrumbs).toBe(PageBreadcrumbs)
  })

  it('renders badge variants', () => {
    const { container } = render(
      <>
        <Badge>Default</Badge>
        <Badge variant="critical" size="lg">
          Critical
        </Badge>
      </>
    )

    expect(screen.getByText('Default')).toBeTruthy()
    expect(screen.getByText('Critical')).toBeTruthy()
    expect(container.textContent).toContain('Default')
  })

  it('renders buttons with variants and slot children', () => {
    render(
      <>
        <Button variant="secondary">Press</Button>
        <Button asChild>
          <a href="/docs">Docs</a>
        </Button>
      </>
    )

    expect(screen.getByRole('button', { name: 'Press' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Docs' }).getAttribute('href')).toBe('/docs')
  })

  it('renders card primitives and accessible title structure', () => {
    render(
      <Card interactive emphasis="accent">
        <CardHeader>
          <CardTitle>Title</CardTitle>
          <CardDescription>Description</CardDescription>
        </CardHeader>
        <CardContent>Content</CardContent>
        <CardFooter>Footer</CardFooter>
      </Card>
    )

    expect(screen.getByRole('heading', { level: 3, name: 'Title' })).toBeTruthy()
    expect(screen.getByText('Description')).toBeTruthy()
    expect(screen.getByText('Footer')).toBeTruthy()
  })

  it('renders custom breadcrumbs with optional JSON-LD', () => {
    const { container } = render(
      <PageBreadcrumbs
        items={[
          { label: 'Home', href: '/en' },
          { label: 'Rules', href: '/en/rules' },
          { label: 'Accessibility' }
        ]}
        baseUrl="https://frontendchecklist.io"
        includeJsonLd
      />
    )

    expect(screen.getByRole('link', { name: 'Home' }).getAttribute('href')).toBe('/en')
    expect(screen.getByText('Accessibility').getAttribute('aria-current')).toBe('page')
    expect(container.querySelector('script[type="application/ld+json"]')?.textContent).toContain(
      '"@type":"BreadcrumbList"'
    )
  })

  it('copies content with the shared copy button and code surface', async () => {
    jest.useFakeTimers()
    const writeText = jest.fn().mockResolvedValue(undefined)
    Object.assign(navigator, { clipboard: { writeText } })

    render(
      <>
        <CopyButton text="copied text" />
        <CodeSurface code="pnpm lint" wrapperClassName="my-0" />
      </>
    )

    await act(async () => {
      fireEvent.click(screen.getAllByRole('button', { name: 'Copy to clipboard' })[0])
      await Promise.resolve()
    })

    expect(writeText).toHaveBeenCalledWith('copied text')
    expect(screen.getByRole('button', { name: 'Copied!' })).toBeTruthy()
    expect(screen.getByText('pnpm lint')).toBeTruthy()

    act(() => {
      jest.advanceTimersByTime(2000)
    })

    jest.useRealTimers()
  })

  it('renders dialog actions', () => {
    const onCancel = jest.fn()
    const onConfirm = jest.fn()

    render(
      <ConfirmDialog
        isOpen
        onCancel={onCancel}
        onConfirm={onConfirm}
        title="Delete item?"
        description="This cannot be undone."
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }))

    expect(onCancel).toHaveBeenCalled()
    expect(onConfirm).toHaveBeenCalled()
  })

  it('renders tab controls and inline code', () => {
    render(
      <>
        <Tabs defaultValue="one">
          <TabsList>
            <TabsTrigger value="one">One</TabsTrigger>
            <TabsTrigger value="two">Two</TabsTrigger>
          </TabsList>
          <TabsContent value="one">First tab</TabsContent>
          <TabsContent value="two">Second tab</TabsContent>
        </Tabs>
        <InlineCode>pnpm test</InlineCode>
      </>
    )

    expect(screen.getByRole('tab', { name: 'One' }).getAttribute('data-state')).toBe('active')
    expect(screen.getByRole('tab', { name: 'Two' }).getAttribute('data-state')).toBe('inactive')
    expect(screen.getByText('First tab')).toBeTruthy()
    expect(screen.getByText('pnpm test').tagName.toLowerCase()).toBe('code')
  })

  it('renders form primitives and progress', () => {
    const { container } = render(
      <>
        <Input type="email" defaultValue="user@example.com" />
        <Progress value={42} />
      </>
    )

    expect(screen.getByDisplayValue('user@example.com').getAttribute('type')).toBe('email')
    expect(container.innerHTML).toContain('translateX(-58%)')
  })

  it('renders skeleton variants', () => {
    const { container } = render(
      <>
        <Skeleton className="custom" />
        <SkeletonCard hasIcon={false} lines={3} />
        <SkeletonBento />
        <SkeletonStats count={3} />
      </>
    )

    expect(container.innerHTML).toContain('custom')
    expect(container.querySelectorAll('.rounded-xl').length).toBeGreaterThan(0)
    expect(container.querySelectorAll('.grid').length).toBeGreaterThan(0)
  })
})
