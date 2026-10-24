import { routeHome, routeRules } from '@repo/config'
import { ArrowLeft, Home } from '@repo/design-system/icons'
import { Button } from '@repo/design-system/ui/button'
import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex min-h-[calc(100vh-60px)] items-center justify-center px-4 py-24 sm:py-32">
      <div className="mx-auto max-w-md text-center">
        <p className="font-bold font-heading text-8xl text-accent">404</p>
        <h1 className="mt-4 font-heading font-semibold text-3xl text-foreground tracking-tight">
          Page not found
        </h1>
        <p className="mt-3 text-base text-foreground-muted">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Button asChild size="lg">
            <Link href={routeHome()}>
              <Home className="size-4" />
              Go home
            </Link>
          </Button>
          <Button variant="outline" size="lg" asChild>
            <Link href={routeRules()}>
              <ArrowLeft className="size-4" />
              Browse rules
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
