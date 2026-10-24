'use client'

import { GitHubBrandIcon } from '@repo/design-system/brand-icons'
import { BookOpen, CheckCircle, FolderOpen, ListChecks } from '@repo/design-system/icons'
import { useEffect, useRef, useState } from 'react'
import { PUBLIC_RULE_COUNT_BASE } from '@/components/homepage/rule-count-display'
import { useHydrated } from '@/hooks/use-hydrated'
import { useIntersectionInView } from '@/hooks/use-intersection-in-view'
import { useProgress } from '@/hooks/use-progress'
import { formatGitHubStars } from '@/lib/github'

interface StatsBarProps {
  ruleCount: number
  categoryCount: number
  checklistCount: number
  githubStars: number | null
}

interface StatItemProps {
  value: number
  label: string
  icon: React.ComponentType<{ className?: string }>
  suffix?: string
}

// Animated counter hook
/**
 * useAnimatedCounter function.
 */
function useAnimatedCounter(
  target: number,
  duration: number = 1500,
  startAnimation: boolean = false
) {
  const [count, setCount] = useState(0)
  const startTime = useRef<number | null>(null)
  const animationFrame = useRef<number | null>(null)

  useEffect(() => {
    if (!startAnimation || target === 0) {
      return
    }

    startTime.current = null

    /**
     * animate function.
     * @param timestamp - timestamp.
     */
    const animate = (timestamp: number) => {
      if (!startTime.current) startTime.current = timestamp
      const progress = Math.min((timestamp - startTime.current) / duration, 1)

      // Easing function (ease-out-cubic)
      const eased = 1 - (1 - progress) ** 3
      setCount(Math.floor(eased * target))

      if (progress < 1) {
        animationFrame.current = requestAnimationFrame(animate)
      } else {
        setCount(target)
      }
    }

    animationFrame.current = requestAnimationFrame(animate)

    return () => {
      if (animationFrame.current) {
        cancelAnimationFrame(animationFrame.current)
      }
    }
  }, [target, duration, startAnimation])

  return startAnimation && target > 0 ? count : target
}

/**
 * StatItem function.
 * @param { value - { value.
 * @param label - label.
 * @param icon - icon.
 * @param suffix - suffix.
 */
function StatItem({ value, label, icon: Icon, suffix = '' }: StatItemProps) {
  const ref = useRef<HTMLDivElement>(null)
  const isVisible = useIntersectionInView(ref, 0.5)
  const animatedValue = useAnimatedCounter(value, 1500, isVisible)

  return (
    <div ref={ref} className="flex flex-col items-center gap-2 py-4">
      <div className="flex items-center gap-3">
        <Icon className="size-5 text-foreground-muted" aria-hidden="true" />
        <span className="font-medium text-4xl text-foreground tabular-nums tracking-tight">
          {animatedValue}
          {suffix}
        </span>
      </div>
      <span className="text-foreground-muted text-sm">{label}</span>
    </div>
  )
}

/**
 * ProgressStatItem function.
 * @param { completed - { completed.
 * @param total } - total }.
 */
function ProgressStatItem({ completed, total }: { completed: number; total: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const isVisible = useIntersectionInView(ref, 0.5)
  const animatedValue = useAnimatedCounter(completed, 1500, isVisible)

  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0

  return (
    <div ref={ref} className="flex flex-col items-center gap-2 py-4">
      <div className="flex items-center gap-3">
        <CheckCircle className="size-5 text-accent" aria-hidden="true" />
        <span className="font-medium text-4xl text-foreground tabular-nums tracking-tight">
          {animatedValue}
          <span className="font-normal text-2xl text-foreground-subtle">/{total}</span>
        </span>
      </div>
      <div className="flex w-full max-w-[120px] flex-col items-center gap-1.5">
        <span className="font-medium text-accent text-sm">Your Progress</span>
        <div className="h-1 w-full overflow-hidden rounded-full bg-border">
          <div
            className="h-full bg-accent transition-all duration-1000 ease-out"
            style={{ width: `${isVisible ? percentage : 0}%` }}
          />
        </div>
      </div>
    </div>
  )
}

/**
 * GitHubStarsItem function.
 * @param { stars } - { stars }.
 */
function GitHubStarsItem({ stars }: { stars: number | null }) {
  const ref = useRef<HTMLDivElement>(null)
  const isVisible = useIntersectionInView(ref, 0.5)
  const animatedStars = useAnimatedCounter(stars ?? 0, 1500, isVisible && stars !== null)

  return (
    <div ref={ref} className="flex flex-col items-center gap-2 py-4">
      <div className="flex items-center gap-3">
        <GitHubBrandIcon className="size-5 text-foreground-muted" aria-hidden="true" />
        <span className="font-medium text-4xl text-foreground tabular-nums tracking-tight">
          {stars === null ? '—' : formatGitHubStars(animatedStars, '—')}
        </span>
      </div>
      <span className="text-foreground-muted text-sm">GitHub Stars</span>
    </div>
  )
}

/**
 * StatsBar function.
 * @param { ruleCount - { ruleCount.
 * @param categoryCount - categoryCount.
 * @param checklistCount - checklistCount.
 * @param githubStars } - githubStars }.
 */
export function StatsBar({ ruleCount, categoryCount, checklistCount, githubStars }: StatsBarProps) {
  const { isLoading, progress } = useProgress()
  const hasMounted = useHydrated()
  const completedRulesCount = isLoading ? 0 : progress.filter(item => item.completed).length

  // Use progress slot only after mount so server and first client render match (avoids hydration mismatch)
  const showProgress = hasMounted && !isLoading && completedRulesCount > 0

  return (
    <section
      aria-label="Project statistics"
      className="border-border border-y bg-background-subtle"
    >
      <div className="container-content">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4 sm:gap-12">
          <StatItem value={PUBLIC_RULE_COUNT_BASE} label="Rules" icon={ListChecks} suffix="+" />
          <StatItem value={categoryCount} label="Categories" icon={FolderOpen} />
          {showProgress ? (
            <ProgressStatItem completed={completedRulesCount} total={ruleCount} />
          ) : (
            <StatItem value={checklistCount} label="Checklists" icon={BookOpen} />
          )}
          <GitHubStarsItem stars={githubStars} />
        </div>
      </div>
    </section>
  )
}
