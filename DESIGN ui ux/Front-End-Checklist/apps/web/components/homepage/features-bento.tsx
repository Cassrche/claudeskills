'use client'

import { Boxes } from '@repo/design-system/icons'
import { CommunityOrbit } from '@repo/design-system/motion/community-orbit'
import { CuratedGridPreview } from '@repo/design-system/motion/curated-grid-preview'
import { FreeformBlocksPreview } from '@repo/design-system/motion/freeform-blocks-preview'
import { PriorityPills } from '@repo/design-system/motion/priority-pills'
import { ProgressBarsPreview } from '@repo/design-system/motion/progress-bars-preview'
import { PromptChipsPreview } from '@repo/design-system/motion/prompt-chips-preview'
import { Card, CardContent } from '@repo/design-system/ui/card'
import { domAnimation, LazyMotion, m } from 'framer-motion'
import { useRef, useState, useSyncExternalStore } from 'react'
import { useIntersectionInView } from '@/hooks/use-intersection-in-view'
import { useReducedMotionPreference } from '@/hooks/use-reduced-motion-preference'

interface FeatureCardProps {
  title: string
  description: string
  className?: string
  index?: number
  children?: (isHovered: boolean) => React.ReactNode
}

const mobileViewportQuery = '(max-width: 768px)'

/**
 * Subscribe to mobile viewport media query changes.
 * @param onStoreChange - Callback invoked when the query result changes.
 * @returns Unsubscribe callback.
 */
function subscribeToMobileViewport(onStoreChange: () => void) {
  const mediaQuery = window.matchMedia(mobileViewportQuery)
  mediaQuery.addEventListener('change', onStoreChange)
  return () => mediaQuery.removeEventListener('change', onStoreChange)
}

/**
 * Read the current mobile viewport snapshot.
 * @returns Whether the viewport matches the mobile breakpoint.
 */
function getMobileViewportSnapshot() {
  return window.matchMedia(mobileViewportQuery).matches
}

/**
 * Return the server fallback for viewport matching.
 * @returns False during server rendering.
 */
function getServerViewportSnapshot() {
  return false
}

/**
 * FeatureCard function.
 */
function FeatureCard({
  title,
  description,
  className = '',
  index = 0,
  children
}: FeatureCardProps) {
  const [isHovered, setIsHovered] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useIntersectionInView(ref, 0.5)
  const isMobileViewport = useSyncExternalStore(
    subscribeToMobileViewport,
    getMobileViewportSnapshot,
    getServerViewportSnapshot
  )
  const prefersReducedMotion = useReducedMotionPreference()

  // On mobile (touch devices or < 768px), we use isInView as the hover state
  const activeHover = isHovered || (isMobileViewport && isInView)

  const cardContent = (
    <CardContent className="flex h-full flex-col p-6 sm:p-8">
      {/* Animation area */}
      {children && <div className="relative mb-6 h-24 sm:h-32">{children(activeHover)}</div>}
      <h3 className="mb-2 font-medium text-foreground text-lg">{title}</h3>
      <p className="text-foreground-muted text-sm leading-relaxed">{description}</p>
    </CardContent>
  )

  if (prefersReducedMotion) {
    return (
      <Card
        className={`relative h-full overflow-hidden ${className}`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {cardContent}
      </Card>
    )
  }

  return (
    <m.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.5,
        delay: index * 0.1,
        ease: [0.25, 0.46, 0.45, 0.94]
      }}
    >
      <Card
        className="relative h-full overflow-hidden transition-all duration-200 hover:scale-[1.02]"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {cardContent}
      </Card>
    </m.div>
  )
}

/**
 * FeaturesBento function.
 */
export function FeaturesBento() {
  return (
    <LazyMotion features={domAnimation}>
      <section aria-labelledby="features-heading" className="py-12 sm:py-16 lg:py-20">
        <div className="container-content">
          <div className="mb-10">
            <div className="mb-2 flex items-center gap-2">
              <Boxes className="size-5 text-accent" />
              <span className="font-medium text-accent text-sm uppercase tracking-wider">
                Features
              </span>
            </div>
            <h2 id="features-heading" className="font-semibold text-3xl text-foreground">
              Why developers love this checklist
            </h2>
          </div>

          {/* Bento Grid */}
          <div className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-4">
            {/* Large card - Progress Tracking */}
            <FeatureCard
              title="Progress Tracking"
              description="Track your completion across sessions. Your progress is saved locally in your browser, so you can pick up right where you left off."
              className="md:col-span-2 lg:row-span-2"
              index={0}
            >
              {isHovered => <ProgressBarsPreview isHovered={isHovered} />}
            </FeatureCard>

            {/* Large card - AI Prompts */}
            <FeatureCard
              title="AI-Powered Prompts"
              description="Every rule includes ready-to-use AI prompts. Check for issues, get fixes, and understand the 'why' behind each best practice."
              className="md:col-span-2 lg:row-span-2"
              index={1}
            >
              {isHovered => <PromptChipsPreview isHovered={isHovered} />}
            </FeatureCard>

            {/* Regular cards */}
            <FeatureCard
              title="Priority System"
              description="Rules are prioritized from Critical to Low, so you know what to fix first."
              index={2}
            >
              {isHovered => <PriorityPills isHovered={isHovered} />}
            </FeatureCard>

            <FeatureCard
              title="Curated Checklists"
              description="Pre-built collections for launches, SEO audits, performance, and more."
              index={3}
            >
              {isHovered => <CuratedGridPreview isHovered={isHovered} />}
            </FeatureCard>

            <FeatureCard
              title="Custom Checklists"
              description="Build your own checklists tailored to your project's specific needs."
              index={4}
            >
              {isHovered => <FreeformBlocksPreview isHovered={isHovered} />}
            </FeatureCard>

            <FeatureCard
              title="Community-Driven"
              description="All rules are open source. Suggest improvements, add new rules, and help keep the checklist up to date."
              index={5}
            >
              {isHovered => <CommunityOrbit isHovered={isHovered} />}
            </FeatureCard>
          </div>
        </div>
      </section>
    </LazyMotion>
  )
}
