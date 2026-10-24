import { auth } from '@repo/auth/auth'
import { routeHome } from '@repo/config'
import { PageBreadcrumbs } from '@repo/design-system/custom/navigation/page-breadcrumbs'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { type ReactNode, Suspense } from 'react'
import { AccountSidebar } from '@/components/account/account-sidebar'

interface AccountLayoutProps {
  children: ReactNode
}

/**
 * Shared layout for account pages (profile, settings).
 * Renders breadcrumbs + sidebar + content grid.
 */
export default function AccountLayout({ children }: AccountLayoutProps) {
  return (
    <Suspense fallback={<AccountLayoutFallback />}>
      <AuthenticatedAccountLayout>{children}</AuthenticatedAccountLayout>
    </Suspense>
  )
}

/**
 * Redirect unauthenticated users and render the account shell for signed-in users.
 * @param props - Account page children.
 */
async function AuthenticatedAccountLayout({ children }: AccountLayoutProps) {
  const session = await auth.api.getSession({ headers: await headers() })

  if (!session?.user?.id) {
    redirect(routeHome())
  }

  return (
    <div className="container-content py-8 sm:py-12">
      <PageBreadcrumbs items={[{ label: 'Home', href: routeHome() }, { label: 'Account' }]} />
      <div className="grid gap-8 md:grid-cols-[220px_1fr]">
        <AccountSidebar />
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  )
}

/** Render a lightweight loading shell while account auth resolves. */
function AccountLayoutFallback() {
  return (
    <div className="container-content py-8 sm:py-12">
      <div className="mb-6 h-5 w-36 rounded bg-muted" />
      <div className="grid gap-8 md:grid-cols-[220px_1fr]">
        <div className="hidden space-y-3 md:block">
          <div className="h-9 rounded bg-muted" />
          <div className="h-9 rounded bg-muted" />
        </div>
        <div className="min-w-0 space-y-4">
          <div className="h-8 w-48 rounded bg-muted" />
          <div className="h-40 rounded bg-muted" />
        </div>
      </div>
    </div>
  )
}
