import { BookOpen, ChevronRight } from '@repo/design-system/icons'
import { Button } from '@repo/design-system/ui/button'
import Image from 'next/image'
import { TrackedLink } from '@/components/analytics/tracked-link'
import { TELEMETRY_EVENTS } from '@/lib/telemetry-events'
import bookCover from '@/public/projects/start-and-ship/practical-guides-junior-devs-start-and-ship.png'

const BOOK_DATA = {
  title: 'Start & Ship: Setup, Clean Code & Team Skills for Junior Developers',
  description:
    'A comprehensive guide to help junior developers navigate their early career challenges and accelerate their professional growth.',
  ctaUrl: 'https://practicaljuniordevs.com/',
  ctaText: 'Notify me when available'
}

/**
 * UpcomingBook function.
 */
export function UpcomingBook() {
  return (
    <section aria-labelledby="upcoming-book-heading" className="py-16 sm:py-20 lg:py-24">
      <div className="container-content">
        {/* Section Header */}
        <div className="mb-10">
          <div className="mb-2 flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-accent" />
            <span className="font-medium text-accent text-sm uppercase tracking-wider">
              Upcoming Book
            </span>
          </div>
          <h2 id="upcoming-book-heading" className="font-semibold text-3xl text-foreground">
            For Junior Developers
          </h2>
          <p className="mt-2 text-foreground-muted">
            Subscribe to get notified when my upcoming book is available! Get early access to
            essential tips for junior developers.
          </p>
        </div>

        {/* Book Card */}
        <div className="relative overflow-hidden rounded-2xl border border-border bg-card">
          <div className="flex flex-col gap-8 p-6 sm:p-8 md:flex-row lg:p-10">
            {/* Book Cover */}
            <div className="mx-auto shrink-0 md:mx-0">
              <div className="relative aspect-3/4 w-48 overflow-hidden rounded-lg shadow-2xl shadow-black/20 sm:w-56">
                <Image
                  src={bookCover}
                  alt="Start & Ship book cover"
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 192px, 224px"
                />
              </div>
            </div>

            {/* Book Info */}
            <div className="flex flex-col justify-center text-center md:text-left">
              <h3 className="mb-3 font-semibold text-2xl text-foreground">{BOOK_DATA.title}</h3>
              <p className="mb-6 max-w-lg text-foreground-muted leading-relaxed">
                {BOOK_DATA.description}
              </p>
              <div>
                <Button asChild size="lg" className="gap-2">
                  <TrackedLink
                    href={BOOK_DATA.ctaUrl}
                    telemetryEvent={TELEMETRY_EVENTS.externalCtaClicked}
                    telemetryProperties={{
                      label: 'notify_book_available',
                      location: 'about_upcoming_book'
                    }}
                  >
                    {BOOK_DATA.ctaText}
                    <ChevronRight className="h-4 w-4" />
                  </TrackedLink>
                </Button>
              </div>
            </div>
          </div>

          {/* Decorative gradient */}
          <div className="pointer-events-none absolute -top-24 -right-24 h-48 w-48 rounded-full bg-accent/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -left-24 h-48 w-48 rounded-full bg-accent/5 blur-3xl" />
        </div>
      </div>
    </section>
  )
}
