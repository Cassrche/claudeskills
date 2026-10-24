'use client'

import * as CheckboxPrimitive from '@radix-ui/react-checkbox'
import { cn } from '@repo/utils'
import { Check } from 'lucide-react'
import type { ComponentPropsWithoutRef } from 'react'

/** Renders a styled checkbox built on Radix UI primitives. */
function Checkbox({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        'peer h-4 w-4 shrink-0 rounded border transition-all duration-150',
        'border-border bg-transparent',
        'outline outline-2 outline-transparent outline-offset-[3px]',
        'hover:outline-primary',
        'data-[state=checked]:border-accent data-[state=checked]:bg-accent',
        'focus-visible:outline-primary',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator className="flex items-center justify-center text-white">
        <Check className="h-3 w-3" strokeWidth={3} />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }
