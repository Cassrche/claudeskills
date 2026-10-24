'use client'

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@repo/design-system/ui/tooltip'
import { cn } from '@repo/utils'
import { motion } from 'framer-motion'
import { useMemo } from 'react'

export interface SegmentData {
  slug: string
  label: string
  color: string
  total: number
  completed: number
}

export interface SegmentedProgressBarProps {
  segments: SegmentData[]
  totalCompleted: number
  totalRules: number
  focusedCategory?: string | null
  className?: string
}

const GAP_PX = 3

const segmentTransition = {
  type: 'spring' as const,
  stiffness: 300,
  damping: 30,
  mass: 0.8
}

const fillTransition = {
  type: 'spring' as const,
  stiffness: 120,
  damping: 20,
  mass: 0.8
}

/** Render a segmented progress bar with per-segment tooltips and focus mode. */
export function SegmentedProgressBar({
  segments,
  totalCompleted,
  totalRules,
  focusedCategory = null,
  className
}: SegmentedProgressBarProps) {
  const isFocused = focusedCategory !== null

  const focusedData = useMemo(() => {
    if (!focusedCategory) return null
    const segment = segments.find(item => item.slug === focusedCategory)
    return segment ?? null
  }, [focusedCategory, segments])

  if (segments.length === 0 || totalRules === 0) {
    return (
      <div
        className={cn('h-2.5 flex-1 overflow-hidden rounded-md bg-foreground/8', className)}
        role="progressbar"
        aria-valuenow={0}
        aria-valuemin={0}
        aria-valuemax={totalRules}
        aria-label="Progress"
      />
    )
  }

  const ariaCompleted = focusedData ? focusedData.completed : totalCompleted
  const ariaTotal = focusedData ? focusedData.total : totalRules

  return (
    <TooltipProvider delayDuration={200}>
      <div
        className={cn('flex h-2.5 flex-1 items-center rounded-md', className)}
        role="progressbar"
        aria-valuenow={ariaCompleted}
        aria-valuemin={0}
        aria-valuemax={ariaTotal}
        aria-label={`${ariaCompleted} of ${ariaTotal} rules completed`}
      >
        {segments.map((segment, index) => {
          const isTarget = segment.slug === focusedCategory
          const isVisible = !isFocused || isTarget

          const widthPercent = totalRules > 0 ? (segment.total / totalRules) * 100 : 0
          const fillPercent = segment.total > 0 ? (segment.completed / segment.total) * 100 : 0

          const gapAdjust = (segments.length - 1) * GAP_PX
          const normalWidth = `calc(${widthPercent}% - ${(gapAdjust * widthPercent) / 100}px)`

          return (
            <Tooltip key={segment.slug}>
              <TooltipTrigger asChild>
                <motion.div
                  layout
                  animate={{
                    width: isFocused ? (isTarget ? '100%' : '0%') : normalWidth,
                    opacity: isVisible ? 1 : 0,
                    marginRight: isFocused ? 0 : index < segments.length - 1 ? GAP_PX : 0
                  }}
                  transition={segmentTransition}
                  className="group/seg relative h-full cursor-default overflow-hidden rounded-sm"
                  style={{
                    backgroundColor: `color-mix(in oklch, ${segment.color} 15%, transparent)`
                  }}
                >
                  <motion.div
                    className="absolute inset-y-0 left-0 rounded-sm"
                    animate={{ width: `${fillPercent}%` }}
                    transition={fillTransition}
                    style={{ backgroundColor: segment.color }}
                  />
                  <div
                    className="absolute inset-0 rounded-sm opacity-0 transition-opacity duration-150 group-hover/seg:opacity-100"
                    style={{
                      boxShadow: `inset 0 0 0 1.5px ${segment.color}, 0 0 8px ${segment.color}40`
                    }}
                  />
                </motion.div>
              </TooltipTrigger>
              <TooltipContent side="top" className="flex flex-col gap-0.5 px-3 py-2">
                <span className="font-medium">{segment.label}</span>
                <span className="text-[11px] opacity-80">
                  {segment.completed} / {segment.total} completed
                </span>
                {segment.total > 0 ? (
                  <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-white/20">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${fillPercent}%`,
                        backgroundColor: segment.color
                      }}
                    />
                  </div>
                ) : null}
              </TooltipContent>
            </Tooltip>
          )
        })}
      </div>
    </TooltipProvider>
  )
}
