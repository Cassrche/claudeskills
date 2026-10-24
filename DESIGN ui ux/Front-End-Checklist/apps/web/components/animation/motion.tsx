'use client'

import { AnimatePresence, domAnimation, type HTMLMotionProps, LazyMotion, m } from 'framer-motion'
import type { ReactNode } from 'react'
import { useReducedMotionPreference } from '@/hooks/use-reduced-motion-preference'

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 }
}

const smooth = {
  duration: 0.2,
  ease: [0.4, 0, 0.2, 1] as const
}

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1
    }
  }
}

interface AnimatedCardProps extends HTMLMotionProps<'div'> {
  children: ReactNode
  delay?: number
}

/** Wraps children in a fade-in-up animation with an optional delay. */
export function AnimatedCard({ children, delay = 0, className, ...props }: AnimatedCardProps) {
  const prefersReducedMotion = useReducedMotionPreference()
  const variants = prefersReducedMotion
    ? { initial: {}, animate: { opacity: 1 }, exit: {} }
    : fadeInUp

  return (
    <LazyMotion features={domAnimation}>
      <m.div
        variants={variants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={{
          ...smooth,
          duration: prefersReducedMotion ? 0 : smooth.duration,
          delay: prefersReducedMotion ? 0 : delay
        }}
        className={className}
        {...props}
      >
        {children}
      </m.div>
    </LazyMotion>
  )
}

interface AnimatedListProps {
  children: ReactNode
  className?: string
}

/** Renders a container that staggers its children's entrance animations. */
export function AnimatedList({ children, className }: AnimatedListProps) {
  return (
    <LazyMotion features={domAnimation}>
      <m.div variants={staggerContainer} initial="initial" animate="animate" className={className}>
        {children}
      </m.div>
    </LazyMotion>
  )
}

interface AnimatedPageProps {
  children: ReactNode
  className?: string
}

/** Wraps page content with a fade-and-slide enter/exit transition. */
export function AnimatedPage({ children, className }: AnimatedPageProps) {
  const prefersReducedMotion = useReducedMotionPreference()

  return (
    <LazyMotion features={domAnimation}>
      <m.div
        initial={prefersReducedMotion ? {} : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={prefersReducedMotion ? {} : { opacity: 0, y: -10 }}
        transition={smooth}
        className={className}
      >
        {children}
      </m.div>
    </LazyMotion>
  )
}

interface AnimatedPresenceWrapperProps {
  children: ReactNode
  condition: boolean
}

/** Conditionally renders children with AnimatePresence enter/exit transitions. */
export function AnimatedPresenceWrapper({ children, condition }: AnimatedPresenceWrapperProps) {
  return <AnimatePresence mode="wait">{condition && children}</AnimatePresence>
}
